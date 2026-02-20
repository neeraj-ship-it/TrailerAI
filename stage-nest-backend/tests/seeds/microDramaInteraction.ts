import { userData } from './user';

export const microDramaInteractionData = [
  {
    likedContent: ['episode-1', 'episode-2', 'episode-3'],
    showSlug: 'prem-nagar',
    userId: userData[0]._id.toString(),
  },
  {
    likedContent: ['episode-1'],
    showSlug: 'punarjanam',
    userId: userData[1]._id.toString(),
  },
  {
    likedContent: [],
    showSlug: 'mewat',
    userId: userData[2]._id.toString(),
  },
];
