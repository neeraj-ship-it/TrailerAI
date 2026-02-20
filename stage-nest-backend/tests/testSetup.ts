// test/globalSetup.ts
// Import environment setup FIRST to set environment variables
import './env.setup';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { VersioningType } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { testEntityMap } from './test.entities';
import { ExtraGlobals } from './types/global.types';

// Import TestAppModule (uses dynamic MongoDB configuration)
import { TestAppModule } from './test-app.module';

// Import all seed data
import adminUsers from './seeds/adminUser';
import { episodeData } from './seeds/episodes';
import { plans } from './seeds/plan';
import { recurringTransaction } from './seeds/recurringTransaction';
import { reelsData } from './seeds/reels';
import { roleData } from './seeds/role';
import { seasonData } from './seeds/season';
import { seedSettingObject } from './seeds/setting';
import { showData } from './seeds/shows';
import { upcomingSectionData } from './seeds/upcomingSection';
import { userData } from './seeds/user';
import { userAccountInviteData } from './seeds/userAccountInvite';
import { userCultureData } from './seeds/userCultures';
import { userProfileData } from './seeds/userProfile';
import { userSubscriptionData } from './seeds/userSubscription';
import { userSubscriptionsHistory } from './seeds/userSubscriptionHistory';
import { watchVideoEventData } from './seeds/watchVideoEvent';

// Import AuthGuard for global setup
import { EntityManager } from '@mikro-orm/mongodb';

import { contentProfileData } from './seeds/contentProfile';
import { microDramaInteractionData } from './seeds/microDramaInteraction';
import { reelActionData } from './seeds/reelAction';
import { userDeviceRecordData } from './seeds/userDeviceRecord';
import { AuthGuard } from '@app/auth';
import { APP_CONFIGS } from 'common/configs/app.config';

export default async (): Promise<void> => {
  // Prevent multiple setups
  if ((globalThis as ExtraGlobals).__SETUP_COMPLETE__) {
    console.log('⚠️  Setup already completed, skipping...');
    return;
  }

  console.log('\n🚀 Starting global test setup...');

  // 1. Setup MongoDB and override the environment variable
  const mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri() + 'test_db'; // Add database name for MikroORM
  (globalThis as ExtraGlobals).__MONGOD__ = mongod; // Store for teardown
  process.env.MONGO_DB_URI = mongoUri; // Override with test MongoDB URI
  process.env.MONGO_DB_URI_EKS = mongod.getUri() + 'test_db_eks'; // Set EKS_URL to same test DB for secondary connection
  console.log(`📦 In-memory MongoDB started at ${mongoUri}`);
  console.log(`🔗 MONGO_DB_URI set to: ${process.env.MONGO_DB_URI}`);
  console.log(`🔗 MONGO_DB_URI_EKS set to: ${process.env.MONGO_DB_URI_EKS}`);

  // 2. Initialize NestJS Application with Fastify using TestAppModule
  const moduleFixture = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();

  // Store the test module for accessing services
  (globalThis as ExtraGlobals).__TEST_MODULE__ = moduleFixture;

  // Create a fresh Fastify adapter instance
  const fastifyAdapter = new FastifyAdapter({
    logger: false, // Disable Fastify logging in tests
  });

  const app =
    moduleFixture.createNestApplication<NestFastifyApplication>(fastifyAdapter);

  const extractor = (request: unknown): string | string[] =>
    [(request as FastifyRequest).headers['api-version'] ?? '1']
      .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
      .filter((v) => !!v);

  app.enableVersioning({
    extractor,
    type: VersioningType.CUSTOM,
  });

  // Add global guards like in main.ts
  app.useGlobalGuards(app.get(AuthGuard));

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  // Use a random port to avoid conflicts
  const port = parseInt(process.env.TEST_APP_PORT || '0'); // 0 means random available port
  await app.listen(port, '0.0.0.0');

  // Get the actual port that was assigned
  const address = app.getHttpServer().address();
  const actualPort =
    typeof address === 'object' && address ? address.port : port;

  (globalThis as ExtraGlobals).__NEST_APP__ = app; // Store app instance for teardown
  process.env.E2E_APP_URL = `http://localhost:${actualPort}`;
  console.log(`🌐 NestJS app started on port ${actualPort}`);

  // Seed all test data once during global setup
  await seedTestData();

  // Mark setup as complete
  (globalThis as ExtraGlobals).__SETUP_COMPLETE__ = true;
  console.log('✅ Global test setup completed successfully\n');
};

async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...');

  try {
    // Get all entity models
    const entities = {
      AdminUser: getTestEntity('AdminUser'),
      ContentProfile: getTestEntity('ContentProfile'),
      Episode: getTestEntity('Episode'),
      Plan: getTestEntity('Plan'),
      RecurringTransaction: getTestEntity('RecurringTransaction'),
      Role: getTestEntity('Role'),
      Season: getTestEntity('Season'),
      Setting: getTestEntity('Setting'),
      Show: getTestEntity('Show'),
      UpcomingSection: getTestEntity('UpcomingSection'),
      User: getTestEntity('User'),
      UserAccountInvite: getTestEntity('UserAccountInvite'),
      UserCultures: getTestEntity('UserCultures'),
      UserDeviceRecord: getTestEntity('UserDeviceRecord'),
      UserProfile: getTestEntity('UserProfile'),
      UserSubscriptionHistory: getTestEntity('UserSubscriptionHistory'),
      UserSubscriptionV1: getTestEntity('UserSubscriptionV1'),
      WatchVideoEvent: getTestEntity('WatchVideoEvent'),
    };

    // Seed data in dependency order
    await Promise.all([
      entities.Role.insertMany(roleData),
      entities.Plan.insertMany(plans),
      entities.Setting.insertMany([
        {
          ...seedSettingObject,
          _id: APP_CONFIGS.SETTING.ENTITY_ID,
        },
      ]),
      entities.UserCultures.insertMany(userCultureData),
    ]);

    await Promise.all([
      entities.User.insertMany(userData),
      entities.AdminUser.insertMany(adminUsers),
      entities.Show.insertMany(showData),
    ]);

    // Seed UserDeviceRecord after User (requires userId reference)
    await entities.UserDeviceRecord.insertMany(userDeviceRecordData);

    await Promise.all([
      entities.UserSubscriptionV1.insertMany(userSubscriptionData),
      entities.UserSubscriptionHistory.insertMany(userSubscriptionsHistory),
      entities.RecurringTransaction.insertMany(recurringTransaction),
      entities.WatchVideoEvent.insertMany(watchVideoEventData),
      entities.Season.insertMany(seasonData),
      entities.UpcomingSection.insertMany(upcomingSectionData),
    ]);

    await entities.Episode.insertMany(episodeData);
    await entities.UserProfile.insertMany(userProfileData);
    await entities.UserAccountInvite.insertMany(userAccountInviteData);

    await entities.ContentProfile.insertMany(contentProfileData);

    // Seed MikroORM entities using seeder
    await seedMikroORMEntities();

    console.log('✅ Test data seeded successfully');

    // Add a small delay to ensure MongoDB operations are fully committed
    // This helps prevent race conditions in CI environments like GitHub Actions
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('⏱️  Data consistency delay completed');

    // Verify critical data is properly seeded (helps catch CI issues early)
    await verifyTestData(entities);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

async function verifyTestData(
  entities: Record<string, Model<unknown>>,
): Promise<void> {
  try {
    const counts = {
      contentProfiles: await entities.ContentProfile.countDocuments(),
      episodes: await entities.Episode.countDocuments(),
      plans: await entities.Plan.countDocuments(),
      shows: await entities.Show.countDocuments(),
      userDeviceRecords: await entities.UserDeviceRecord.countDocuments(),
      userProfiles: await entities.UserProfile.countDocuments(),
      users: await entities.User.countDocuments(),
    };

    console.log('📊 Data verification:', counts);

    // Ensure we have the minimum expected data
    if (
      counts.users === 0 ||
      counts.shows === 0 ||
      counts.episodes === 0 ||
      counts.contentProfiles === 0 ||
      counts.userProfiles === 0 ||
      counts.userDeviceRecords === 0
    ) {
      throw new Error(
        `Insufficient test data seeded: ${JSON.stringify(counts)}`,
      );
    }
  } catch (error) {
    console.error('❌ Data verification failed:', error);
    throw error;
  }
}

async function seedMikroORMEntities(): Promise<void> {
  console.log('🌱 Seeding MikroORM, entities...');

  const app = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!app) {
    throw new Error('NestJS app not initialized');
  }

  const em = app.get(EntityManager);
  const forkedEm = em.fork();

  console.log('  📝 Creating MicroDramaInteraction entities...');
  await forkedEm.insertMany('MicroDramaInteraction', microDramaInteractionData);
  await forkedEm.insertMany('ReelEntity', reelsData);
  await forkedEm.insertMany('ReelAction', reelActionData);
  console.log(
    `  ✅ Created ${microDramaInteractionData.length} MicroDramaInteraction, ${reelsData.length} ReelEntity, ${reelActionData.length} ReelAction entities`,
  );

  console.log('✅ MikroORM entities seeded successfully');
}

export function getTestEntity<T>(key: string): Model<T> {
  console.log(`Asked for entity key ${key}`);
  if (!testEntityMap[key]) {
    throw new Error(`Entity not registered ${key}`);
  }
  const app = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!app) {
    throw new Error(
      'NestJS app not initialized. Make sure global setup has run.',
    );
  }
  return app.get<Model<T>>(getModelToken(testEntityMap[key].name));
}

// Export testSetupService for compatibility with other test files
export const testSetupService = {
  getTestEntity: getTestEntity,
};
