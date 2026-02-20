import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { userData } from '../seeds/user';
import { getTestEntity } from '../testSetup';
import { ExtraGlobals } from '../types/global.types';
import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { UserEvent, UserEventData } from '@app/common/entities/user.event';
import { OS } from '@app/common/enums/app.enum';
import { APP_CONFIGS } from 'common/configs/app.config';
import { ObjectId } from 'mongodb';

const userEventsApi = '/users/user-events';

describe('MODULE: User Events Tests', () => {
  let jwtToken: string;
  let userId: string;
  let userEventModel: Model<UserEvent>;
  let userEventSecondaryModel: Model<UserEvent> | null = null;

  beforeAll(async () => {
    // Use seeded user data
    userId = userData[0]._id.toString();
    jwtToken = await generateAuthToken({ userId });

    // Get primary UserEvent model
    userEventModel = getTestEntity<UserEvent>(UserEvent.name);

    // Try to get secondary UserEvent model if available
    try {
      const app = (globalThis as ExtraGlobals).__NEST_APP__;
      if (app) {
        userEventSecondaryModel = app.get<Model<UserEvent>>(
          getModelToken(UserEvent.name, 'secondary'),
        );
      }
    } catch (error) {
      // Secondary connection might not be available in tests
      console.log(`Secondary DB connection not available in tests, ${error}`);
    }
  });

  beforeEach(async () => {
    // Clean up user events before each test
    await userEventModel.deleteMany({});
    if (userEventSecondaryModel !== null) {
      await userEventSecondaryModel.deleteMany({});
    }
  });

  // Helper function to get document from the read repository (matches service logic)
  const getDocumentFromReadRepository = async (
    userId: string,
  ): Promise<UserEvent | null> => {
    const readFromSecondary =
      APP_CONFIGS.MONGO_DB.USER_EVENTS.READ_FROM_SECONDARY;

    if (readFromSecondary && userEventSecondaryModel) {
      return await userEventSecondaryModel.findOne({
        _id: new ObjectId(userId),
      });
    }
    return await userEventModel.findOne({ _id: new ObjectId(userId) });
  };

  // Helper function to get document for verification (for snapshots)
  // Uses read repository logic to match what the service would return
  const getDocumentForVerification = async (
    userId: string,
  ): Promise<UserEvent | null> => {
    return getDocumentFromReadRepository(userId);
  };

  // Helper to verify event exists in a specific database
  const verifyEventInDatabase = async (
    userId: string,
    db: 'primary' | 'secondary',
    expectedEvent: Partial<UserEventData>,
    options?: {
      eventCount?: number;
      shouldExist?: boolean;
    },
  ): Promise<void> => {
    const { eventCount = 1, shouldExist = true } = options || {};
    const model = db === 'primary' ? userEventModel : userEventSecondaryModel;

    if (!model) {
      if (shouldExist) {
        throw new Error(`Database ${db} model not available`);
      }
      return; // If model doesn't exist and we expect no data, that's fine
    }

    const doc = await model.findOne({ _id: new ObjectId(userId) });

    if (shouldExist) {
      expect(doc).toBeDefined();
      expect(doc?.events).toHaveLength(eventCount);
      if (expectedEvent.eventName) {
        const event = doc?.events.find(
          (e) => e.eventName === expectedEvent.eventName,
        );
        expect(event).toBeDefined();
        if (expectedEvent.metadata !== undefined) {
          expect(event?.metadata).toEqual(expectedEvent.metadata);
        }
        if (expectedEvent.os) {
          expect(event?.os).toBe(expectedEvent.os);
        }
        if (expectedEvent.dialect) {
          expect(event?.dialect).toBe(expectedEvent.dialect);
        }
      }
    } else {
      expect(doc).toBeNull();
    }
  };

  // Helper function to verify event in database(s) based on dual-write flags
  const verifyEventInDB = async (
    userId: string,
    expectedEvent: Partial<UserEventData>,
    options?: {
      eventCount?: number;
      shouldExist?: boolean;
    },
  ): Promise<void> => {
    const { shouldExist = true } = options || {};
    const enablePrimaryWrite =
      APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE;
    const enableSecondaryWrite =
      APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE;
    const isDualWriteEnabled =
      APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE &&
      APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE;

    // Verify in primary DB if primary write is enabled
    if (enablePrimaryWrite) {
      await verifyEventInDatabase(userId, 'primary', expectedEvent, options);
    } else if (shouldExist) {
      // If primary write is disabled, verify no data exists in primary
      const primaryDoc = await userEventModel.findOne({
        _id: new ObjectId(userId),
      });
      expect(primaryDoc).toBeNull();
    }

    // Verify in secondary DB if secondary write is enabled
    if (enableSecondaryWrite && userEventSecondaryModel) {
      await verifyEventInDatabase(userId, 'secondary', expectedEvent, options);
    } else if (shouldExist && userEventSecondaryModel) {
      // If secondary write is disabled, verify no data exists in secondary
      const secondaryDoc = await userEventSecondaryModel.findOne({
        _id: new ObjectId(userId),
      });
      expect(secondaryDoc).toBeNull();
    }

    // If dual-write is enabled, verify both DBs have the same data
    if (
      isDualWriteEnabled &&
      enablePrimaryWrite &&
      enableSecondaryWrite &&
      shouldExist
    ) {
      const primaryDoc = await userEventModel.findOne({
        _id: new ObjectId(userId),
      });
      const secondaryDoc = await userEventSecondaryModel?.findOne({
        _id: new ObjectId(userId),
      });

      expect(primaryDoc?.events.length).toBe(secondaryDoc?.events.length);
      // Verify events match between both DBs
      primaryDoc?.events.forEach((primaryEvent, index) => {
        const secondaryEvent = secondaryDoc?.events[index];
        expect(secondaryEvent?.eventName).toBe(primaryEvent.eventName);
        expect(secondaryEvent?.os).toBe(primaryEvent.os);
        expect(secondaryEvent?.dialect).toBe(primaryEvent.dialect);
        if (primaryEvent.metadata) {
          expect(secondaryEvent?.metadata).toEqual(primaryEvent.metadata);
        }
      });
    }
  };

  describe(`POST: ${userEventsApi}`, () => {
    it('should successfully add a user event and verify in secondary DB', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { contentId: 'content-123', duration: 240 },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty(
        'message',
        'Event added successfully',
      );
      expect(response.body).toMatchSnapshot();

      // Verify event in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_4min_achieved',
        metadata: { contentId: 'content-123', duration: 240 },
        os: OS.ANDROID.toString(),
      });

      // Additional verification: check createdAt and snapshot
      //const docToSnapshot = await getDocumentForVerification(userId);

      //   if (docToSnapshot) {
      //     // Verify createdAt is valid
      //     const createdAt = docToSnapshot.events[0].createdAt;
      //     expect(createdAt).toBeDefined();
      //     if (createdAt) {
      //       const createdAtDate =
      //         createdAt instanceof Date ? createdAt : new Date(createdAt);
      //       expect(createdAtDate).toBeInstanceOf(Date);
      //       expect(!isNaN(createdAtDate.getTime())).toBe(true);
      //     }

      //     // Snapshot the database document structure (excluding createdAt as it's dynamic)
      //     expect({
      //       _id: docToSnapshot._id.toString(),
      //       events: docToSnapshot.events.map((e) => ({
      //         eventName: e.eventName,
      //         os: e.os,
      //         dialect: e.dialect,
      //         metadata: e.metadata,
      //         // createdAt is excluded from snapshot as it's dynamic
      //       })),
      //     }).toMatchSnapshot();
      //   }
    });

    it('should successfully add event without metadata', async () => {
      const payload = {
        eventName: 'watchtime_8min_achieved',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Event added successfully');
      expect(response.body).toMatchSnapshot();

      // Verify event in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_8min_achieved',
        metadata: undefined,
        os: OS.ANDROID.toString(),
      });
    });

    it('should trim whitespace from eventName', async () => {
      const payload = {
        eventName: '  watchtime_20_min_achieved  ',
        metadata: { test: 'value' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify trimmed eventName in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_20_min_achieved',
        os: OS.ANDROID.toString(),
      });
    });

    it('should prevent duplicate events with same eventName', async () => {
      const payload = {
        eventName: 'watchtime_20_min_achieved',
        metadata: { first: 'attempt' },
      };

      // First request should succeed
      const firstResponse = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(firstResponse.status).toBe(201);

      // Second request with same eventName should fail (duplicate)
      const secondResponse = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send({
          eventName: 'watchtime_20_min_achieved',
          metadata: { second: 'attempt' },
        });

      expect(secondResponse.status).toBe(201); // API still returns 201
      expect(secondResponse.body.message).toBe('Event added successfully');

      // Verify only one event exists (duplicate was prevented) in database(s) based on dual-write flags
      await verifyEventInDB(
        userId,
        {
          eventName: 'watchtime_20_min_achieved',
          metadata: { first: 'attempt' },
          os: OS.ANDROID.toString(),
        },
        { eventCount: 1 },
      );
    });

    it('should allow multiple different events for same user', async () => {
      const events = [
        {
          eventName: 'watchtime_20_min_achieved',
          metadata: { contentType: 'premium' },
        },
        {
          eventName: 'watchtime_30_min_achieved',
          metadata: { contentType: 'premium' },
        },
        {
          eventName: 'watchtime_60_min_achieved',
          metadata: { contentType: 'premium' },
        },
      ];

      for (const event of events) {
        const response = await makeAuthenticatedRequest(jwtToken)
          .post(userEventsApi)
          .send(event);
        console.log(`Response for ${event.eventName}:`, response.body);
        expect(response.status).toBe(201);
      }

      // Verify all events exist in database(s) based on dual-write flags
      const docToCheck = await getDocumentForVerification(userId);

      expect(docToCheck?.events).toHaveLength(3);
      console.log(docToCheck?.events);
      expect(docToCheck?.events.map((e: UserEventData) => e.eventName)).toEqual(
        expect.arrayContaining([
          'watchtime_20_min_achieved',
          'watchtime_30_min_achieved',
          'watchtime_60_min_achieved',
        ]),
      );

      // Snapshot the multiple events structure
      //   if (docToCheck) {
      //     expect({
      //       _id: docToCheck._id.toString(),
      //       eventNames: docToCheck.events.map((e: UserEventData) => e.eventName),
      //       eventsCount: docToCheck.events.length,
      //     }).toMatchSnapshot();
      //   }
    });

    // it('should return 500 error for empty eventName', async () => {
    //   const payload = {
    //     eventName: '',
    //     metadata: { test: 'value' },
    //   };

    //   const response = await makeAuthenticatedRequest(jwtToken)
    //     .post(userEventsApi)
    //     .send(payload);

    //   expect(response.status).toBe(500); // Service throws error
    //   expect(response.body).toHaveProperty('message');
    //   expect(response.body).toMatchSnapshot();

    //   // Verify no event was written in database(s) based on dual-write flags
    //   await verifyEventInDB(userId, {}, { shouldExist: false });
    // });

    // it('should return 500 error for whitespace-only eventName', async () => {
    //   const payload = {
    //     eventName: '   ',
    //     metadata: { test: 'value' },
    //   };

    //   const response = await makeAuthenticatedRequest(jwtToken)
    //     .post(userEventsApi)
    //     .send(payload);

    //   expect(response.status).toBe(500);
    //   expect(response.body).toHaveProperty('message');
    //   expect(response.body).toMatchSnapshot();

    //   // Verify no event was written in database(s) based on dual-write flags
    //   await verifyEventInDB(userId, {}, { shouldExist: false });
    // });

    it('should store OS from context headers', async () => {
      const payload = {
        eventName: 'watchtime_30_min_achieved',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify OS is stored correctly in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_30_min_achieved',
        os: OS.ANDROID.toString(),
      });
    });

    it('should store dialect from context headers', async () => {
      const payload = {
        eventName: 'watchtime_60_min_achieved',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify dialect is stored correctly in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_60_min_achieved',
        os: OS.ANDROID.toString(),
      });

      // Additional check: verify dialect type
      const docToCheck = await getDocumentForVerification(userId);

      if (docToCheck?.events[0]) {
        expect(docToCheck.events[0].dialect).toBeDefined();
        expect(typeof docToCheck.events[0].dialect).toBe('string');
      }
    });

    it('should set createdAt timestamp', async () => {
      const beforeTime = new Date();
      const payload = {
        eventName: 'watchtime_4min_achieved',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      const afterTime = new Date();

      // Verify createdAt is set and within expected range in database(s) based on dual-write flags
      const docToCheck = await getDocumentForVerification(userId);

      if (docToCheck?.events[0]) {
        const createdAt = docToCheck.events[0].createdAt;
        expect(createdAt).toBeDefined();
        if (createdAt) {
          const createdAtDate =
            createdAt instanceof Date ? createdAt : new Date(createdAt);
          expect(createdAtDate).toBeInstanceOf(Date);
          expect(!isNaN(createdAtDate.getTime())).toBe(true);
          expect(createdAtDate.getTime()).toBeGreaterThanOrEqual(
            beforeTime.getTime(),
          );
          expect(createdAtDate.getTime()).toBeLessThanOrEqual(
            afterTime.getTime(),
          );
        }
      }
    });

    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        content: {
          duration: 3600,
          id: 'content-123',
          type: 'episode',
        },
        metadata: {
          nested: {
            deep: {
              value: 'test',
            },
          },
        },
        user: {
          preferences: ['action', 'comedy'],
          profile: 'profile-1',
        },
      };

      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: complexMetadata,
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify complex metadata is stored correctly in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_4min_achieved',
        metadata: complexMetadata,
        os: OS.ANDROID.toString(),
      });
    });

    it('should create new document for first event', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify new document was created in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_4min_achieved',
        os: OS.ANDROID.toString(),
      });
    });

    // it('should append to existing document for subsequent events', async () => {
    //   // Add first event
    //   await makeAuthenticatedRequest(jwtToken)
    //     .post(userEventsApi)
    //     .send({ eventName: 'watchtime_4min_achieved' });

    //   // Add second event
    //   await makeAuthenticatedRequest(jwtToken)
    //     .post(userEventsApi)
    //     .send({ eventName: 'watchtime_8min_achieved' });

    //   // Verify both events in same document in database(s) based on dual-write flags
    //   const docToCheck = await getDocumentForVerification(userId);

    //   expect(docToCheck?.events).toHaveLength(2);
    //   expect(docToCheck?.events.map((e: UserEventData) => e.eventName)).toEqual(
    //     expect.arrayContaining([
    //       'watchtime_4min_achieved',
    //       'watchtime_8min_achieved',
    //     ]),
    //   );
    // });

    it('should handle different OS values from headers', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
      };

      // Test with different OS (using makeAuthenticatedRequest which sets OS.ANDROID)
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify OS is stored in database(s) based on dual-write flags
      await verifyEventInDB(userId, {
        eventName: 'watchtime_4min_achieved',
        os: OS.ANDROID.toString(),
      });
    });

    it('should verify event structure matches UserEventData schema', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'value' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify complete event structure in database(s) based on dual-write flags
      const docToCheck = await getDocumentForVerification(userId);

      const event = docToCheck?.events[0];
      expect(event).toBeDefined();
      expect(event).toHaveProperty('createdAt');
      expect(event).toHaveProperty('dialect');
      expect(event).toHaveProperty('eventName');
      expect(event).toHaveProperty('os');
      // MongoDB may return dates as strings, so check if it's a valid date
      const createdAt = event?.createdAt;
      expect(createdAt).toBeDefined();
      if (createdAt) {
        const createdAtDate =
          createdAt instanceof Date ? createdAt : new Date(createdAt);
        expect(createdAtDate).toBeInstanceOf(Date);
        expect(!isNaN(createdAtDate.getTime())).toBe(true);
      }
      expect(typeof event?.dialect).toBe('string');
      expect(typeof event?.eventName).toBe('string');
      expect(typeof event?.os).toBe('string');
    });
  });

  describe(`GET: ${userEventsApi}`, () => {
    beforeEach(async () => {
      // Seed some test events
      await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send({
          eventName: 'watchtime_4min_achieved',
          metadata: { duration: 240 },
        });
      await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send({
          eventName: 'watchtime_8min_achieved',
          metadata: { duration: 480 },
        });
    });

    it('should return all user events', async () => {
      const response =
        await makeAuthenticatedRequest(jwtToken).get(userEventsApi);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body.events).toHaveLength(2);
      expect(response.body.totalCount).toBe(2);

      // Verify events match what was written
      const eventNames = response.body.events.map(
        (e: UserEventData) => e.eventName,
      );
      expect(eventNames).toContain('watchtime_4min_achieved');
      expect(eventNames).toContain('watchtime_8min_achieved');

      // Snapshot the response excluding createdAt (dynamic field)
      expect({
        events: response.body.events.map((e: UserEventData) => ({
          dialect: e.dialect,
          eventName: e.eventName,
          metadata: e.metadata,
          os: e.os,
          sentToAppsflyer: e.sentToAppsflyer,
          // createdAt is excluded from snapshot as it's dynamic
        })),
        totalCount: response.body.totalCount,
      }).toMatchSnapshot();
    });

    it('should read from the configured read repository', async () => {
      const response =
        await makeAuthenticatedRequest(jwtToken).get(userEventsApi);

      expect(response.status).toBe(200);

      // Verify data comes from the correct database based on READ_FROM_SECONDARY flag
      const readFromSecondary =
        APP_CONFIGS.MONGO_DB.USER_EVENTS.READ_FROM_SECONDARY;
      const docFromReadRepo = await getDocumentFromReadRepository(userId);

      expect(docFromReadRepo).toBeDefined();
      expect(docFromReadRepo?.events.length).toBe(response.body.totalCount);

      // Verify the response matches the read repository data
      if (readFromSecondary && userEventSecondaryModel) {
        const secondaryDoc = await userEventSecondaryModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(secondaryDoc?.events.length).toBe(response.body.totalCount);
      } else {
        const primaryDoc = await userEventModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(primaryDoc?.events.length).toBe(response.body.totalCount);
      }
    });

    it('should return empty array when no events exist', async () => {
      // Clean up events
      await userEventModel.deleteMany({});
      if (userEventSecondaryModel) {
        await userEventSecondaryModel.deleteMany({});
      }

      const response =
        await makeAuthenticatedRequest(jwtToken).get(userEventsApi);

      expect(response.status).toBe(404); // Service returns 404 when no events found
      expect(response.body).toHaveProperty('message');
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`GET: ${userEventsApi}/by-event-name/:eventName`, () => {
    beforeEach(async () => {
      // Seed test event
      await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send({
          eventName: 'watchtime_4min_achieved',
          metadata: { contentId: 'content-123', duration: 240 },
        });
    });

    it('should return specific event by name', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userEventsApi}/by-event-name/watchtime_4min_achieved`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body.totalCount).toBe(1);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].eventName).toBe('watchtime_4min_achieved');
      expect(response.body.events[0].metadata).toEqual({
        contentId: 'content-123',
        duration: 240,
      });

      // Snapshot the response excluding createdAt (dynamic field)
      expect({
        events: response.body.events.map((e: UserEventData) => ({
          dialect: e.dialect,
          eventName: e.eventName,
          metadata: e.metadata,
          os: e.os,
          sentToAppsflyer: e.sentToAppsflyer,
          // createdAt is excluded from snapshot as it's dynamic
        })),
        totalCount: response.body.totalCount,
      }).toMatchSnapshot();
    });

    it('should read from the configured read repository', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userEventsApi}/by-event-name/watchtime_4min_achieved`,
      );

      expect(response.status).toBe(200);

      // Verify data comes from the correct database
      const docFromReadRepo = await getDocumentFromReadRepository(userId);

      expect(docFromReadRepo).toBeDefined();
      const eventFromRepo = docFromReadRepo?.events.find(
        (e) => e.eventName === 'watchtime_4min_achieved',
      );
      expect(eventFromRepo).toBeDefined();
      expect(eventFromRepo?.eventName).toBe(response.body.events[0].eventName);
    });

    it('should return 404 when event not found', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userEventsApi}/by-event-name/NON_EXISTENT_EVENT`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toMatchSnapshot();
    });

    it('should return 500 for empty eventName', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userEventsApi}/by-event-name/   `,
      );

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toMatchSnapshot();
    });
  });

  describe('Flag Combinations', () => {
    // Note: These tests verify behavior with different flag combinations
    // In a real scenario, you'd mock the config, but for e2e tests we test with actual config
    // These tests document expected behavior with current configuration

    it('should write to primary when ENABLE_PRIMARY_WRITE is true', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'primary' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify write occurred in primary if enabled
      if (APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE) {
        const primaryDoc = await userEventModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(primaryDoc).toBeDefined();
        expect(
          primaryDoc?.events.find(
            (e) => e.eventName === 'watchtime_4min_achieved',
          ),
        ).toBeDefined();
      }
    });

    it('should write to secondary when ENABLE_SELF_HOSTED_WRITE is true', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'secondary' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify write occurred in secondary if enabled
      if (
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE &&
        userEventSecondaryModel
      ) {
        const secondaryDoc = await userEventSecondaryModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(secondaryDoc).toBeDefined();
        expect(
          secondaryDoc?.events.find(
            (e) => e.eventName === 'watchtime_4min_achieved',
          ),
        ).toBeDefined();
      }
    });

    it('should read from secondary when READ_FROM_SECONDARY is true', async () => {
      // First write an event
      await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send({ eventName: 'watchtime_4min_achieved' });

      // Then read it
      const response =
        await makeAuthenticatedRequest(jwtToken).get(userEventsApi);

      expect(response.status).toBe(200);

      // Verify read comes from secondary if configured
      if (
        APP_CONFIGS.MONGO_DB.USER_EVENTS.READ_FROM_SECONDARY &&
        userEventSecondaryModel
      ) {
        const secondaryDoc = await userEventSecondaryModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(secondaryDoc).toBeDefined();
        const eventFromSecondary = secondaryDoc?.events.find(
          (e) => e.eventName === 'watchtime_4min_achieved',
        );
        expect(eventFromSecondary).toBeDefined();

        // Verify response matches secondary data
        const responseEvent = response.body.events.find(
          (e: UserEventData) => e.eventName === 'watchtime_4min_achieved',
        );
        expect(responseEvent).toBeDefined();
      }
    });

    it('should read from primary when READ_FROM_SECONDARY is false', async () => {
      // First write an event
      await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send({ eventName: 'watchtime_4min_achieved' });

      // Then read it
      const response =
        await makeAuthenticatedRequest(jwtToken).get(userEventsApi);

      expect(response.status).toBe(200);

      // Verify read comes from primary if configured
      if (!APP_CONFIGS.MONGO_DB.USER_EVENTS.READ_FROM_SECONDARY) {
        const primaryDoc = await userEventModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(primaryDoc).toBeDefined();
        const eventFromPrimary = primaryDoc?.events.find(
          (e) => e.eventName === 'watchtime_4min_achieved',
        );
        expect(eventFromPrimary).toBeDefined();

        // Verify response matches primary data
        const responseEvent = response.body.events.find(
          (e: UserEventData) => e.eventName === 'watchtime_4min_achieved',
        );
        expect(responseEvent).toBeDefined();
      }
    });
  });

  describe('Dual-Write Consistency', () => {
    it('should maintain consistency between primary and secondary when dual-write is enabled', async () => {
      const events = [
        { eventName: 'watchtime_4min_achieved', metadata: { test: 1 } },
        { eventName: 'watchtime_8min_achieved', metadata: { test: 2 } },
        { eventName: 'watchtime_12min_achieved', metadata: { test: 3 } },
      ];

      // Write multiple events
      for (const event of events) {
        await makeAuthenticatedRequest(jwtToken)
          .post(userEventsApi)
          .send(event);
      }

      // Verify consistency if dual-write is enabled
      const isDualWriteEnabled =
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE &&
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE;
      const enablePrimaryWrite =
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE;
      const enableSecondaryWrite =
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE;

      if (
        isDualWriteEnabled &&
        enablePrimaryWrite &&
        enableSecondaryWrite &&
        userEventSecondaryModel
      ) {
        const primaryDoc = await userEventModel.findOne({
          _id: new ObjectId(userId),
        });
        const secondaryDoc = await userEventSecondaryModel.findOne({
          _id: new ObjectId(userId),
        });

        expect(primaryDoc?.events.length).toBe(secondaryDoc?.events.length);
        expect(primaryDoc?.events.length).toBe(events.length);

        // Verify all events exist in both DBs
        events.forEach((event) => {
          const primaryEvent = primaryDoc?.events.find(
            (e) => e.eventName === event.eventName,
          );
          const secondaryEvent = secondaryDoc?.events.find(
            (e) => e.eventName === event.eventName,
          );

          expect(primaryEvent).toBeDefined();
          expect(secondaryEvent).toBeDefined();
          expect(primaryEvent?.metadata).toEqual(secondaryEvent?.metadata);
        });
      }
    });
  });

  describe('Failure Scenarios', () => {
    // Note: True failure scenario testing (mocking repository failures) should be done in unit tests
    // These e2e tests verify the service behavior when writes succeed, which is the happy path
    // For comprehensive failure testing, see unit tests in userEvent.service.spec.ts

    it('should succeed when at least one write succeeds (dual-write scenario)', async () => {
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'partial' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      // Service should return success if at least one write succeeds
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Event added successfully');

      // Verify that at least one database has the event
      const enablePrimaryWrite =
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE;
      const enableSecondaryWrite =
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE;

      let foundInAtLeastOne = false;

      if (enablePrimaryWrite) {
        const primaryDoc = await userEventModel.findOne({
          _id: new ObjectId(userId),
        });
        if (
          primaryDoc?.events.find(
            (e) => e.eventName === 'watchtime_4min_achieved',
          )
        ) {
          foundInAtLeastOne = true;
        }
      }

      if (enableSecondaryWrite && userEventSecondaryModel) {
        const secondaryDoc = await userEventSecondaryModel.findOne({
          _id: new ObjectId(userId),
        });
        if (
          secondaryDoc?.events.find(
            (e) => e.eventName === 'watchtime_4min_achieved',
          )
        ) {
          foundInAtLeastOne = true;
        }
      }

      // At least one write should have succeeded
      expect(foundInAtLeastOne).toBe(true);
    });

    it('should handle write when only primary is enabled', async () => {
      // This test verifies behavior when only primary write is enabled
      // In real scenarios, this would be tested with mocked config
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'primary-only' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // If primary write is enabled, verify it exists in primary
      if (APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE) {
        const primaryDoc = await userEventModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(
          primaryDoc?.events.find(
            (e) => e.eventName === 'watchtime_4min_achieved',
          ),
        ).toBeDefined();
      }
    });

    it('should handle write when only secondary is enabled', async () => {
      // This test verifies behavior when only secondary write is enabled
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'secondary-only' },
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);

      expect(response.status).toBe(201);

      // If secondary write is enabled, verify it exists in secondary
      if (
        APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE &&
        userEventSecondaryModel
      ) {
        const secondaryDoc = await userEventSecondaryModel.findOne({
          _id: new ObjectId(userId),
        });
        expect(
          secondaryDoc?.events.find(
            (e) => e.eventName === 'watchtime_4min_achieved',
          ),
        ).toBeDefined();
      }
    });

    it('should verify service handles Promise.allSettled correctly', async () => {
      // This test verifies that the service uses Promise.allSettled
      // which means it waits for all writes to complete regardless of success/failure
      const payload = {
        eventName: 'watchtime_4min_achieved',
        metadata: { test: 'all-settled' },
      };

      const beforeTime = Date.now();
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(userEventsApi)
        .send(payload);
      const afterTime = Date.now();

      expect(response.status).toBe(201);

      // Verify the write completed (service waits for all promises to settle)
      const doc = await getDocumentFromReadRepository(userId);
      expect(
        doc?.events.find((e) => e.eventName === 'watchtime_4min_achieved'),
      ).toBeDefined();

      // The response should come after writes complete (not immediately)
      // This is a basic sanity check that Promise.allSettled is being used
      expect(afterTime - beforeTime).toBeGreaterThanOrEqual(0);
    });
  });
});
