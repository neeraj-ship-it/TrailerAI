import { userData } from '../seeds/user';
import { userProfileData } from '../seeds/userProfile';
import { getTestEntity } from '../testSetup';
import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { UserProfile } from 'common/entities/userProfile.entity';
import {
  ProfileStatus,
  Dialect,
  Lang,
  GenderEnum,
} from 'common/enums/app.enum';
import { ObjectId } from 'mongodb';

const profilesApi = '/users/profiles';

describe('MODULE: User Profile Tests', () => {
  let jwtToken: string;
  let userId: string;

  beforeAll(async () => {
    // Use seeded user data
    userId = userData[0]._id.toString();
    jwtToken = await generateAuthToken({ userId });
  });

  describe('GET /profiles', () => {
    it('should return existing profiles', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(profilesApi)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contentCulture: userProfileData[0].contentCulture,
            displayName: userProfileData[0].displayName,
            isPrimaryProfile: true,
            language: userProfileData[0].language,
            status: ProfileStatus.ACTIVE,
            user: userId,
          }),
        ]),
      );
      // Verify whatsappSupportNumber exists but don't check exact value (it's derived from RM_NUMBERS)
      expect(response.body[0]).toHaveProperty('whatsappSupportNumber');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await makeAuthenticatedRequest('invalid_token')
        .get(profilesApi)
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchSnapshot();
    });
  });

  describe('POST /profiles', () => {
    it('should create a new profile', async () => {
      const payload = {
        avatar: 'har_default.png',
        contentCulture: Dialect.HAR,
        displayName: 'New Profile',
        fullName: 'Test User',
        gender: GenderEnum.MALE,
        language: Lang.EN,
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(profilesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        contentCulture: payload.contentCulture,
        displayName: payload.displayName,
        language: payload.language,
        status: ProfileStatus.ACTIVE,
      });
    });

    it('should not create profile if max profiles limit reached', async () => {
      // Create two more profiles to reach limit (3 seeded + 2 new = 5)
      const profileEntity = getTestEntity<UserProfile>(UserProfile.name);
      const profiles = Array(2)
        .fill(null)
        .map(() => ({
          _id: new ObjectId(),
          avatar: 'har_default.png',
          contentCulture: Dialect.HAR,
          displayName: 'Test Profile',
          isPrimaryProfile: false,
          language: Lang.EN,
          status: ProfileStatus.ACTIVE,
          user: new ObjectId(userId),
        }));
      await profileEntity.insertMany(profiles);

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(profilesApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send({
          avatar: 'har_default.png',
          contentCulture: Dialect.HAR,
          displayName: 'Extra Profile',
          isPrimaryProfile: false,
          language: Lang.EN,
          status: ProfileStatus.ACTIVE,
          user: new ObjectId(userId),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('MAX_PROFILES_REACHED');
      expect(response.body).toMatchSnapshot();
    });
  });

  describe('PATCH /profiles/:id', () => {
    it('should update profile', async () => {
      const updatePayload = {
        contentCulture: Dialect.RAJ,
        displayName: 'Updated Profile',
        language: Lang.HIN,
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(`${profilesApi}/${userProfileData[1]._id}`) // Update Kids profile
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updatePayload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        contentCulture: updatePayload.contentCulture,
        displayName: updatePayload.displayName,
        language: updatePayload.language,
        status: ProfileStatus.ACTIVE,
      });
      expect(response.body).toHaveProperty('whatsappSupportNumber');
    });

    it('should not update non-existent profile', async () => {
      const nonExistentId = new ObjectId().toString();
      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(`${profilesApi}/${nonExistentId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          displayName: 'Updated Profile',
        });

      expect(response.status).toBe(410);
      expect(response.body.message).toBe('USER_PROFILE_NOT_FOUND');
      expect(response.body).toMatchSnapshot();
    });
  });

  describe('DELETE /profiles/:id', () => {
    it('should soft delete profile', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(`${profilesApi}/${userProfileData[1]._id}`) // Delete Kids profile
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();

      // Verify profile is soft deleted
      const profileEntity = getTestEntity<UserProfile>(UserProfile.name);
      const deletedProfile = await profileEntity.findById(
        userProfileData[1]._id,
      );
      expect(deletedProfile?.status).toBe(ProfileStatus.DELETED);
    });

    it('should not delete primary profile', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(`${profilesApi}/${userProfileData[0]._id}`) // Try to delete primary profile
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Primary profile cannot be deleted');
      expect(response.body).toMatchSnapshot();
    });
  });

  describe('POST /profiles/switch/:id', () => {
    it('should switch to another profile', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${profilesApi}/switch/${userProfileData[2]._id}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(201);
      expect(response.body.userProfile).toMatchObject({
        contentCulture: userProfileData[2].contentCulture,
        displayName: userProfileData[2].displayName,
        isPrimaryProfile: false,
        language: userProfileData[2].language,
        profileId: userProfileData[2]._id?.toString(),
        status: ProfileStatus.ACTIVE,
      });
      expect(response.body.userProfile).toHaveProperty('whatsappSupportNumber');
    });

    it('should not switch to non-existent profile', async () => {
      const nonExistentId = new ObjectId().toString();
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${profilesApi}/switch/${nonExistentId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(410);
      expect(response.body.message).toBe('USER_PROFILE_NOT_FOUND');
      expect(response.body).toMatchSnapshot();
    });

    it('should not switch to deleted profile', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${profilesApi}/switch/${userProfileData[3]._id}`) // Try to switch to deleted profile
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(410);
      expect(response.body.message).toBe('USER_PROFILE_NOT_FOUND');
      expect(response.body).toMatchSnapshot();
    });
  });
});
