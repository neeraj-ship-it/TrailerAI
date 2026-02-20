import {
  ContentOnboardingCategory,
  CategoryStatus,
} from '../entities/contentOnboardingCategory.entity';
import { Lang } from 'common/enums/app.enum';

export const contentOnboardingCategorySeedData: Partial<ContentOnboardingCategory>[] =
  [
    {
      _id: 1,
      categoryDescription: {
        [Lang.EN]: 'Stories of betrayal and deception in love',
        [Lang.HIN]: 'प्रेम में धोखे और विश्वासघात की कहानियां',
      },
      categoryIcon: '💔',
      categoryName: {
        [Lang.EN]: 'Aashiqui Mein Dhokha',
        [Lang.HIN]: 'आशिकी में धोखा',
      },
      categoryThumbnail: {
        [Lang.EN]: 'love-betrayal-en.jpg',
        [Lang.HIN]: 'love-betrayal-hi.jpg',
      },
      color: '#FF4444',
      displayOrder: 1,
      status: CategoryStatus.ACTIVE,
      tags: ['love', 'betrayal', 'drama'],
    },
    {
      _id: 2,
      categoryDescription: {
        [Lang.EN]: 'Supernatural revenge stories',
        [Lang.HIN]: 'अलौकिक बदले की कहानियां',
      },
      categoryIcon: '👻',
      categoryName: {
        [Lang.EN]: 'Aatma Ka Badla',
        [Lang.HIN]: 'आत्मा का बदला',
      },
      categoryThumbnail: {
        [Lang.EN]: 'supernatural-revenge-en.jpg',
        [Lang.HIN]: 'supernatural-revenge-hi.jpg',
      },
      color: '#8B00FF',
      displayOrder: 2,
      status: CategoryStatus.ACTIVE,
      tags: ['supernatural', 'revenge', 'horror'],
    },
    {
      _id: 3,
      categoryDescription: {
        [Lang.EN]: 'Powerful motivational content',
        [Lang.HIN]: 'शक्तिशाली प्रेरणादायक सामग्री',
      },
      categoryIcon: '💪',
      categoryName: {
        [Lang.EN]: 'Zabardast Motivation',
        [Lang.HIN]: 'ज़बरदस्त मॉटीवेशन',
      },
      categoryThumbnail: {
        [Lang.EN]: 'motivation-en.jpg',
        [Lang.HIN]: 'motivation-hi.jpg',
      },
      color: '#FF8C00',
      displayOrder: 3,
      status: CategoryStatus.ACTIVE,
      tags: ['motivation', 'inspiration', 'success'],
    },
    {
      _id: 4,
      categoryDescription: {
        [Lang.EN]: 'Terrifying revenge stories',
        [Lang.HIN]: 'डरावनी बदले की कहानियां',
      },
      categoryIcon: '🔥',
      categoryName: {
        [Lang.EN]: 'Khaufnaak Badla',
        [Lang.HIN]: 'खौफनाक बदला',
      },
      categoryThumbnail: {
        [Lang.EN]: 'horror-revenge-en.jpg',
        [Lang.HIN]: 'horror-revenge-hi.jpg',
      },
      color: '#DC143C',
      displayOrder: 4,
      status: CategoryStatus.ACTIVE,
      tags: ['horror', 'revenge', 'thriller'],
    },
    {
      _id: 5,
      categoryDescription: {
        [Lang.EN]: 'Family issues and household problems',
        [Lang.HIN]: 'पारिवारिक समस्याएं और घरेलू मुद्दे',
      },
      categoryIcon: '🏠',
      categoryName: {
        [Lang.EN]: 'Ghar-Ghar Ke Masle',
        [Lang.HIN]: 'घर-घर के मसले',
      },
      categoryThumbnail: {
        [Lang.EN]: 'family-issues-en.jpg',
        [Lang.HIN]: 'family-issues-hi.jpg',
      },
      color: '#228B22',
      displayOrder: 5,
      status: CategoryStatus.ACTIVE,
      tags: ['family', 'drama', 'social'],
    },
    {
      _id: 6,
      categoryDescription: {
        [Lang.EN]: 'Battle of power and strength',
        [Lang.HIN]: 'शक्ति और ताकत की लड़ाई',
      },
      categoryIcon: '⚔️',
      categoryName: {
        [Lang.EN]: 'Taqat Ki Jung',
        [Lang.HIN]: 'ताकत की जंग',
      },
      categoryThumbnail: {
        [Lang.EN]: 'power-battle-en.jpg',
        [Lang.HIN]: 'power-battle-hi.jpg',
      },
      color: '#B8860B',
      displayOrder: 6,
      status: CategoryStatus.ACTIVE,
      tags: ['action', 'power', 'battle'],
    },
    {
      _id: 7,
      categoryDescription: {
        [Lang.EN]: 'Reality of society and social issues',
        [Lang.HIN]: 'समाज की वास्तविकता और सामाजिक मुद्दे',
      },
      categoryIcon: '🌍',
      categoryName: {
        [Lang.EN]: 'Samaj Ki Haqiqat',
        [Lang.HIN]: 'समाज की हकीकत',
      },
      categoryThumbnail: {
        [Lang.EN]: 'social-reality-en.jpg',
        [Lang.HIN]: 'social-reality-hi.jpg',
      },
      color: '#4682B4',
      displayOrder: 7,
      status: CategoryStatus.ACTIVE,
      tags: ['social', 'reality', 'drama'],
    },
    {
      _id: 8,
      categoryDescription: {
        [Lang.EN]: 'Young love and teenage romance',
        [Lang.HIN]: 'युवा प्रेम और किशोर रोमांस',
      },
      categoryIcon: '💕',
      categoryName: {
        [Lang.EN]: 'Kacchi Umar Ki Mohabbat',
        [Lang.HIN]: 'कच्ची उम्र की मोहब्बत',
      },
      categoryThumbnail: {
        [Lang.EN]: 'young-love-en.jpg',
        [Lang.HIN]: 'young-love-hi.jpg',
      },
      color: '#FF69B4',
      displayOrder: 8,
      status: CategoryStatus.ACTIVE,
      tags: ['romance', 'youth', 'love'],
    },
    {
      _id: 9,
      categoryDescription: {
        [Lang.EN]: 'Comedy and entertainment content',
        [Lang.HIN]: 'कॉमेडी और मनोरंजन सामग्री',
      },
      categoryIcon: '😂',
      categoryName: {
        [Lang.EN]: 'Dimaag Nahin, Thahake Lagao',
        [Lang.HIN]: 'दिमाग नहीं, ठहाके लगाओ',
      },
      categoryThumbnail: {
        [Lang.EN]: 'comedy-en.jpg',
        [Lang.HIN]: 'comedy-hi.jpg',
      },
      color: '#FFD700',
      displayOrder: 9,
      status: CategoryStatus.ACTIVE,
      tags: ['comedy', 'entertainment', 'fun'],
    },
    {
      _id: 10,
      categoryDescription: {
        [Lang.EN]: 'Mystery and adventure stories',
        [Lang.HIN]: 'रहस्य और रोमांच की कहानियां',
      },
      categoryIcon: '🔍',
      categoryName: {
        [Lang.EN]: 'Rahasya, Aur Romanch Bhi',
        [Lang.HIN]: 'रहस्य, और रोमांच भी',
      },
      categoryThumbnail: {
        [Lang.EN]: 'mystery-adventure-en.jpg',
        [Lang.HIN]: 'mystery-adventure-hi.jpg',
      },
      color: '#800080',
      displayOrder: 10,
      status: CategoryStatus.ACTIVE,
      tags: ['mystery', 'adventure', 'thriller'],
    },
    {
      _id: 11,
      categoryDescription: {
        [Lang.EN]: 'Unconditional love stories',
        [Lang.HIN]: 'निस्वार्थ प्रेम की कहानियां',
      },
      categoryIcon: '❤️',
      categoryName: {
        [Lang.EN]: 'Pyaar Jhukta Nahin',
        [Lang.HIN]: 'प्यार झुकता नहीं',
      },
      categoryThumbnail: {
        [Lang.EN]: 'unconditional-love-en.jpg',
        [Lang.HIN]: 'unconditional-love-hi.jpg',
      },
      color: '#FF1493',
      displayOrder: 11,
      status: CategoryStatus.ACTIVE,
      tags: ['love', 'romance', 'emotion'],
    },
    {
      _id: 12,
      categoryDescription: {
        [Lang.EN]: 'Mother-in-law and daughter-in-law drama',
        [Lang.HIN]: 'सास-बहू के नाटक',
      },
      categoryIcon: '👑',
      categoryName: {
        [Lang.EN]: 'Saas Sunami Bahu Toofani',
        [Lang.HIN]: 'सास सुनामी बहू तूफ़ानी',
      },
      categoryThumbnail: {
        [Lang.EN]: 'saas-bahu-en.jpg',
        [Lang.HIN]: 'saas-bahu-hi.jpg',
      },
      color: '#9932CC',
      displayOrder: 12,
      status: CategoryStatus.ACTIVE,
      tags: ['family', 'drama', 'relationships'],
    },
    {
      _id: 13,
      categoryDescription: {
        [Lang.EN]: 'Marriage complications and relationship issues',
        [Lang.HIN]: 'विवाह की जटिलताएं और रिश्ते की समस्याएं',
      },
      categoryIcon: '💒',
      categoryName: {
        [Lang.EN]: 'Shaadi Ya Barbaadi',
        [Lang.HIN]: 'शादी या बर्बादी',
      },
      categoryThumbnail: {
        [Lang.EN]: 'marriage-issues-en.jpg',
        [Lang.HIN]: 'marriage-issues-hi.jpg',
      },
      color: '#FF6347',
      displayOrder: 13,
      status: CategoryStatus.ACTIVE,
      tags: ['marriage', 'relationships', 'drama'],
    },
    {
      _id: 14,
      categoryDescription: {
        [Lang.EN]: 'Patriotic and national pride content',
        [Lang.HIN]: 'देशभक्ति और राष्ट्रीय गौरव की सामग्री',
      },
      categoryIcon: '🇮🇳',
      categoryName: {
        [Lang.EN]: 'Hindustan Zindabad',
        [Lang.HIN]: 'हिंदुस्तान ज़िंदाबाद',
      },
      categoryThumbnail: {
        [Lang.EN]: 'patriotic-en.jpg',
        [Lang.HIN]: 'patriotic-hi.jpg',
      },
      color: '#FF8C00',
      displayOrder: 14,
      status: CategoryStatus.ACTIVE,
      tags: ['patriotic', 'national', 'pride'],
    },
  ];
