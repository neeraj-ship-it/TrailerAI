import { userData } from '../seeds/user';
import { userAccountInviteData } from '../seeds/userAccountInvite';
import { userProfileData } from '../seeds/userProfile';
import { getTestEntity } from '../testSetup';
import {
  generateAuthToken,
  makeAuthenticatedRequest,
  makePlatformPublicRequest,
} from '../utils/makeRequest';
import { UserAccountInvite } from '@app/common/entities/userAccountInvite.entity';
import { UserProfile } from 'common/entities/userProfile.entity';
import { Dialect, Lang, ProfileStatus } from 'common/enums/app.enum';
import { ObjectId } from 'mongodb';

const accountInvitesApi = '/users/account-invites';

describe('MODULE: Account Sharing (UserAccountInvite) Tests', () => {
  let jwtToken: string;
  let userId: string;

  beforeAll(async () => {
    userId = userData[4]._id.toString();
    jwtToken = await generateAuthToken({ userId });
  });

  describe('POST /account-invites', () => {
    it('should create a new account invite successfully', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          userDeviceId: 'new-device-id-test',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        countryCode: '+91',
        mobileNumber: userData[4].primaryMobileNumber,
        status: 'invited',
        userDeviceId: 'new-device-id-test',
        userId: userId,
      });
      expect(response.body).toHaveProperty('linkId');
    });

    it('should create account invite with inviteCountryCode and invitePhoneNumber', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inviteCountryCode: '+1',
          invitePhoneNumber: '1234567890',
          userDeviceId: 'invite-with-phone-device',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        countryCode: '+91',
        inviteCountryCode: '+1',
        invitePhoneNumber: '1234567890',
        mobileNumber: userData[4].primaryMobileNumber,
        status: 'invited',
        userDeviceId: 'invite-with-phone-device',
        userId: userId,
      });
      expect(response.body).toHaveProperty('linkId');
    });

    it('should create multiple invites for the same user', async () => {
      const invite1 = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          userDeviceId: 'multi-invite-device-1',
        });

      const invite2 = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          userDeviceId: 'multi-invite-device-2',
        });

      expect(invite1.status).toBe(201);
      expect(invite2.status).toBe(201);
      expect(invite1.body.linkId).not.toBe(invite2.body.linkId);
      expect(invite1.body.userDeviceId).toBe('multi-invite-device-1');
      expect(invite2.body.userDeviceId).toBe('multi-invite-device-2');
    });

    it('should return 400 for unauthenticated request', async () => {
      const response = await makePlatformPublicRequest()
        .post(accountInvitesApi)
        .send({
          userDeviceId: 'test-device',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /account-invites', () => {
    it('should return list of account invites with metadata for authenticated user', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('outstandingCount');
      expect(response.body).toHaveProperty('totalActiveCount');
      expect(Array.isArray(response.body.data)).toBe(true);
      // userData[4] has 2 invites in seed data
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.totalActiveCount).toBeGreaterThanOrEqual(0);
      expect(response.body.outstandingCount).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 for unauthenticated request', async () => {
      const response = await makePlatformPublicRequest().get(accountInvitesApi);

      expect(response.status).toBe(400);
    });

    it('should return empty data array with zero counts for user with no invites', async () => {
      // Use userData[0] - this user has NO invites in seed data (invites moved to userData[4])
      const newUserId = userData[0]._id.toString();
      const newUserToken = await generateAuthToken({ userId: newUserId });

      const response = await makeAuthenticatedRequest(newUserToken)
        .get(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        data: [],
        outstandingCount: 10, // MAX_INVITES_PER_USER
        totalActiveCount: 0,
      });
    });

    it('should return invites sorted by creation time (newest first)', async () => {
      // Create multiple invites for userData[0] who has no existing invites
      const newUserId = userData[0]._id.toString();
      const newUserToken = await generateAuthToken({ userId: newUserId });

      // Create 3 invites with slight delays
      const invite1 = await makeAuthenticatedRequest(newUserToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({ userDeviceId: 'ordered-device-1' });

      const invite2 = await makeAuthenticatedRequest(newUserToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({ userDeviceId: 'ordered-device-2' });

      const invite3 = await makeAuthenticatedRequest(newUserToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({ userDeviceId: 'ordered-device-3' });

      const response = await makeAuthenticatedRequest(newUserToken)
        .get(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      // The newest invite should be first (invite3)
      const linkIds = response.body.data.map(
        (inv: { linkId: string }) => inv.linkId,
      );
      const invite3Index = linkIds.indexOf(invite3.body.linkId);
      const invite2Index = linkIds.indexOf(invite2.body.linkId);
      const invite1Index = linkIds.indexOf(invite1.body.linkId);

      expect(invite3Index).toBeLessThan(invite2Index);
      expect(invite2Index).toBeLessThan(invite1Index);
    });

    it('should correctly calculate outstandingCount', async () => {
      // userData[4] already has 2 ACTIVE invites in seed data
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      const activeCount = response.body.totalActiveCount;
      const outstandingCount = response.body.outstandingCount;

      // outstandingCount should be MAX_INVITES_PER_USER - totalActiveCount
      expect(outstandingCount).toBe(10 - activeCount);
    });
  });

  describe('PATCH /account-invites', () => {
    it('should return 404 for invalid linkId format', async () => {
      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=invalid-id`)
        .send({
          profileDeviceId: 'new-profile-device',
          userId: userId,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('USER_ACCOUNT_INVITE_NOT_FOUND');
    });

    it('should return 404 for non-existent linkId', async () => {
      const nonExistentId = new ObjectId().toString();
      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${nonExistentId}`)
        .send({
          profileDeviceId: 'new-profile-device',
          userId: userId,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('USER_ACCOUNT_INVITE_NOT_FOUND');
    });

    it('should return 409 when trying to link different device to already linked invite', async () => {
      const linkedInviteId = userAccountInviteData[1]._id?.toString();

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${linkedInviteId}`)
        .send({
          profileDeviceId: 'different-device-id',
          userId: userId,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('USER_ACCOUNT_INVITE_ALREADY_LINKED');
    });

    it('should return PROFILE_CREATION screen for new device user', async () => {
      const inviteEntity = getTestEntity<UserAccountInvite>(
        UserAccountInvite.name,
      );
      const freshInvite = await inviteEntity.create({
        _id: new ObjectId(),
        dialect: Dialect.HAR,
        language: Lang.EN,
        status: ProfileStatus.ACTIVE,
        userDeviceId: 'fresh-device-for-new-user',
        userId: new ObjectId(userId),
      });

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${freshInvite._id.toString()}`)
        .send({
          profileDeviceId: 'brand-new-profile-device',
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        countryCode: '+91',
        mobileNumber: userData[4].primaryMobileNumber,
        redirectionScreen: 'profile_creation',
        userType: 'new_device_user',
      });
    });

    it('should return PROFILE_SELECTION screen for existing device user', async () => {
      // userAccountInviteData[1] belongs to userData[4] and has profileDeviceId='profile-device-456'
      const linkedInviteId = userAccountInviteData[1]._id?.toString();
      const existingProfileDeviceId = userAccountInviteData[1].profileDeviceId;

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${linkedInviteId}`)
        .send({
          profileDeviceId: existingProfileDeviceId, // Same device as already linked
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        linkId: linkedInviteId,
        redirectionScreen: 'profile_selection',
        userType: 'existing_device_user',
      });
    });

    it('should return PROFILE_SELECTION when max profiles reached', async () => {
      // userData[4] has 3 ACTIVE profiles in seed data
      // Create 2 more to reach limit of 5 (MAX_PROFILES_PER_USER)
      const profileEntity = getTestEntity<UserProfile>(UserProfile.name);
      const additionalProfiles = Array(2)
        .fill(null)
        .map(() => ({
          _id: new ObjectId(),
          avatar: 'har_default.png',
          contentCulture: Dialect.HAR,
          displayName: 'Test Profile',
          isPrimaryProfile: false,
          language: Lang.EN,
          status: ProfileStatus.ACTIVE,
          user: new ObjectId(userId), // userId is userData[4]
        }));
      await profileEntity.insertMany(additionalProfiles);

      const inviteEntity = getTestEntity<UserAccountInvite>(
        UserAccountInvite.name,
      );
      const freshInvite = await inviteEntity.create({
        _id: new ObjectId(),
        dialect: Dialect.HAR,
        language: Lang.EN,
        status: ProfileStatus.ACTIVE,
        userDeviceId: 'device-for-max-profile-test',
        userId: new ObjectId(userId),
      });

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${freshInvite._id.toString()}`)
        .send({
          profileDeviceId: 'new-device-for-additional-user',
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        redirectionScreen: 'profile_selection',
        userType: 'additional_profile_user',
      });
    });

    it('should update invite with profileDeviceId', async () => {
      // userAccountInviteData[0] belongs to userData[4] and has no profileDeviceId set
      const inviteId = userAccountInviteData[0]._id?.toString();

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${inviteId}`)
        .send({
          profileDeviceId: 'updated-profile-device',
          userId: userId, // userId is userData[4] which owns this invite
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        countryCode: '+91',
        linkId: inviteId,
        mobileNumber: userData[4].primaryMobileNumber,
      });
    });

    it('should update invite with both profileDeviceId and profileId', async () => {
      const inviteEntity = getTestEntity<UserAccountInvite>(
        UserAccountInvite.name,
      );
      const freshInvite = await inviteEntity.create({
        _id: new ObjectId(),
        dialect: Dialect.HAR,
        language: Lang.EN,
        status: ProfileStatus.ACTIVE,
        userDeviceId: 'device-for-full-update-test',
        userId: new ObjectId(userId),
      });

      const profileId = userProfileData[5]._id?.toString();

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${freshInvite._id.toString()}`)
        .send({
          profileDeviceId: 'profile-device-for-full-update',
          profileId: profileId,
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        linkId: freshInvite._id.toString(),
        profileId: profileId,
      });
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      const inviteEntity = getTestEntity<UserAccountInvite>(
        UserAccountInvite.name,
      );
      const freshInvite = await inviteEntity.create({
        _id: new ObjectId(),
        dialect: Dialect.HAR,
        language: Lang.EN,
        status: ProfileStatus.ACTIVE,
        userDeviceId: 'device-for-public-test',
        userId: new ObjectId(userId),
      });

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${freshInvite._id.toString()}`)
        .send({
          profileDeviceId: 'public-profile-device',
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        linkId: freshInvite._id.toString(),
        userId: userId,
      });
    });

    it('should transition status from INVITED to ACTIVE on first update', async () => {
      // Create a new invite that will have status INVITED
      const createResponse = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          userDeviceId: 'status-transition-test-device',
        });

      expect(createResponse.body.status).toBe('invited');
      const inviteLinkId = createResponse.body.linkId;

      // Now update the invite, which should change status to ACTIVE
      const updateResponse = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${inviteLinkId}`)
        .send({
          profileDeviceId: 'status-transition-profile-device',
          userId: userId,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toMatchObject({
        linkId: inviteLinkId,
        profileDeviceId: 'status-transition-profile-device',
        status: 'active',
      });
    });

    it('should return 404 when userId does not match invite owner', async () => {
      const inviteEntity = getTestEntity<UserAccountInvite>(
        UserAccountInvite.name,
      );
      const freshInvite = await inviteEntity.create({
        _id: new ObjectId(),
        dialect: Dialect.HAR,
        language: Lang.EN,
        status: ProfileStatus.ACTIVE,
        userDeviceId: 'different-user-test-device',
        userId: new ObjectId(userId), // Belongs to userData[4]
      });

      // Try to update with a different userId
      const differentUserId = userData[0]._id.toString();
      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${freshInvite._id.toString()}`)
        .send({
          profileDeviceId: 'wrong-user-profile-device',
          userId: differentUserId, // Different user
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('USER_ACCOUNT_INVITE_NOT_FOUND');
    });

    it('should handle updates with only profileId (no profileDeviceId)', async () => {
      const inviteEntity = getTestEntity<UserAccountInvite>(
        UserAccountInvite.name,
      );
      const freshInvite = await inviteEntity.create({
        _id: new ObjectId(),
        dialect: Dialect.HAR,
        language: Lang.EN,
        status: ProfileStatus.ACTIVE,
        userDeviceId: 'profile-id-only-device',
        userId: new ObjectId(userId),
      });

      const profileId = userProfileData[5]._id?.toString();

      const response = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${freshInvite._id.toString()}`)
        .send({
          profileId: profileId,
          userId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        linkId: freshInvite._id.toString(),
        profileId: profileId,
      });
    });

    it('should maintain inviteCountryCode and invitePhoneNumber after update', async () => {
      // Create invite with phone details
      const createResponse = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inviteCountryCode: '+44',
          invitePhoneNumber: '9876543210',
          userDeviceId: 'phone-persist-device',
        });

      expect(createResponse.status).toBe(201);
      const inviteLinkId = createResponse.body.linkId;

      // Update the invite
      const updateResponse = await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${inviteLinkId}`)
        .send({
          profileDeviceId: 'phone-persist-profile-device',
          userId: userId,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toMatchObject({
        inviteCountryCode: '+44',
        invitePhoneNumber: '9876543210',
        linkId: inviteLinkId,
        profileDeviceId: 'phone-persist-profile-device',
      });
    });
  });

  describe('Account Sharing Edge Cases', () => {
    it('should handle rapid successive invite creation', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          makeAuthenticatedRequest(jwtToken)
            .post(accountInvitesApi)
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
              userDeviceId: `rapid-test-device-${index}`,
            }),
        );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.status).toBe(201);
        expect(result.body).toHaveProperty('linkId');
      });

      // All linkIds should be unique
      const linkIds = results.map((r) => r.body.linkId);
      const uniqueLinkIds = new Set(linkIds);
      expect(uniqueLinkIds.size).toBe(5);
    });

    it('should handle invite with extremely long userDeviceId', async () => {
      const longDeviceId = 'device-' + 'x'.repeat(200);
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(accountInvitesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          userDeviceId: longDeviceId,
        });

      expect(response.status).toBe(201);
      expect(response.body.userDeviceId).toBe(longDeviceId);
    });

    it('should correctly count ACTIVE vs INVITED invites', async () => {
      const newUserId = userData[2]._id.toString();
      const newUserToken = await generateAuthToken({ userId: newUserId });

      // Create 3 INVITED invites
      await Promise.all(
        Array(3)
          .fill(null)
          .map((_, i) =>
            makeAuthenticatedRequest(newUserToken)
              .post(accountInvitesApi)
              .set('Authorization', `Bearer ${newUserToken}`)
              .send({ userDeviceId: `count-test-device-${i}` }),
          ),
      );

      const beforeResponse = await makeAuthenticatedRequest(newUserToken)
        .get(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(beforeResponse.body.totalActiveCount).toBe(0);
      expect(beforeResponse.body.data.length).toBe(3);

      // Activate one invite
      const inviteToActivate = beforeResponse.body.data[0];
      await makePlatformPublicRequest()
        .patch(`${accountInvitesApi}?linkId=${inviteToActivate.linkId}`)
        .send({
          profileDeviceId: 'activated-profile-device',
          userId: newUserId,
        });

      const afterResponse = await makeAuthenticatedRequest(newUserToken)
        .get(accountInvitesApi)
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(afterResponse.body.totalActiveCount).toBe(1);
      expect(afterResponse.body.outstandingCount).toBe(9); // 10 - 1
    });
  });
});
