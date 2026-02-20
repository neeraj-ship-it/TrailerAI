import { ObjectId } from 'mongodb';

// ReelAction seed data for testing user engagement with reels
// These link to the reels in reels.ts and users in user.ts
export const reelActionData = [
  {
    _id: new ObjectId('507f1f77bcf86cd799440001'),
    liked: true,
    reelId: '507f1f77bcf86cd799439011', // prem-nagar reel
    shareCount: 5,
    userId: '6613f03fedbbcc6309d2f77f', // test user
    viewCount: 10,
  },
  {
    _id: new ObjectId('507f1f77bcf86cd799440002'),
    liked: false,
    reelId: '507f1f77bcf86cd799439012', // choriyaan-bojh-na-hoti reel
    shareCount: 2,
    userId: '6613f03fedbbcc6309d2f77f', // test user
    viewCount: 5,
  },
  {
    _id: new ObjectId('507f1f77bcf86cd799440003'),
    liked: true,
    reelId: '507f1f77bcf86cd799439013', // new-khani movie reel
    shareCount: 3,
    userId: '6613f03fedbbcc6309d2f77f', // test user
    viewCount: 8,
  },
];
