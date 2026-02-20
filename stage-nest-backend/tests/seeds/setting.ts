import { Document } from 'mongoose';

import { StringConstants } from '@app/common/constants/string.constant';
import {
  PaymentAppName,
  PaymentAppPackageName,
  PaymentAppShortName,
  PaymentGatewayShortName,
  Setting,
} from '@app/common/entities/setting.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

export const seedSettingObject: Omit<Setting, keyof Document> = {
  commonForDialects: {
    commonForLangs: {
      appLogo: 'https://example.com/logo.png',
      appVersion: 1,
      basePath: '/api',
      baseURL: 'https://api.example.com',
      cashOption: true,
      customPaymentOptions: [
        {
          applyAppInstallCheck: true,
          appName: PaymentAppName.PHONEPE,
          appShortName: PaymentAppShortName.PHONEPE,
          displayText: '(Recommended)',
          imagePath: '/paymentPage/phonepe.png',
          isEnabled: true,
          packageName: PaymentAppPackageName.PHONEPE,
          paymentFailurePopupDelay: 4,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
          pgShortName: PaymentGatewayShortName.PHONEPE,
          rank: 1,
          visibleByDefault: true,
        },
        {
          applyAppInstallCheck: true,
          appName: PaymentAppName.PAYTM,
          appShortName: PaymentAppShortName.PAYTM,
          displayText: '',
          imagePath: '/paymentPage/paytm.png',
          isEnabled: true,
          packageName: PaymentAppPackageName.PAYTM,
          paymentFailurePopupDelay: 4,
          paymentGateway: PaymentGatewayEnum.PAYTM,
          pgShortName: PaymentGatewayShortName.PAYTM,
          rank: 2,
          showIfOptionsCountBelow: 2,
          visibleByDefault: true,
        },
        {
          applyAppInstallCheck: true,
          appName: PaymentAppName.GPAY,
          appShortName: PaymentAppShortName.GPAY,
          displayText: '',
          imagePath: '/paymentPage/gpay.png',
          isEnabled: true,
          packageName: PaymentAppPackageName.GPAY,
          paymentFailurePopupDelay: 4,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
          pgShortName: PaymentGatewayShortName.PHONEPE,
          rank: 3,
          showIfOptionsCountBelow: 3,
          visibleByDefault: false,
        },
        {
          applyAppInstallCheck: false,
          appName: PaymentAppName.UPI_APPS,
          appShortName: PaymentAppShortName.UPI,
          displayText: '',
          imagePath: '/subscription/tnpl_2/upi_payment_option_mI5Fl2af.png',
          isEnabled: true,
          packageName: PaymentAppPackageName.UPI,
          paymentFailurePopupDelay: 4,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
          pgShortName: PaymentGatewayShortName.PHONEPE,
          rank: 4,
          showIfOptionsCountBelow: 1,
          visibleByDefault: true,
        },
        {
          applyAppInstallCheck: true,
          appName: PaymentAppName.UPI_COLLECT,
          appShortName: PaymentAppShortName.UPI_COLLECT,
          displayText: '',
          imagePath: '/subscription/tnpl_2/upi_payment_option_mI5Fl2af.png',
          isEnabled: true,
          packageName: PaymentAppPackageName.UPI_COLLECT,
          paymentFailurePopupDelay: 480,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
          pgShortName: PaymentGatewayShortName.PHONEPE,
          rank: 5,
          showIfOptionsCountBelow: 4,
          visibleByDefault: false,
        },
        {
          applyAppInstallCheck: false,
          appName: PaymentAppName.OTHER,
          appShortName: PaymentAppShortName.OTHER,
          displayText: '',
          imagePath: '/paymentPage/rupee_symbol-2.png',
          isEnabled: false,
          packageName: PaymentAppPackageName.JUSPAY,
          paymentFailurePopupDelay: 4,
          paymentGateway: PaymentGatewayEnum.JUSPAY_CHECKOUT,
          pgShortName: PaymentGatewayShortName.JUSPAY_SDK,
          rank: 6,
          showIfOptionsCountBelow: 2,
          visibleByDefault: false,
        },
      ],
      isAFTOn: true,
      isCouponSectionVisible: true,
      paymentOptions: [
        {
          appName: PaymentAppName.PHONEPE,
          appShortName: PaymentAppShortName.PHONEPE,
          displayText: StringConstants.recommendedPaymentOptionText,
          isEnabled: true,
          packageName: PaymentAppPackageName.PHONEPE,
          paymentGateway: PaymentGatewayEnum.PAYTM,
          pgShortName: PaymentGatewayShortName.PAYTM,
        },
        {
          appName: PaymentAppName.PAYTM,
          appShortName: PaymentAppShortName.PAYTM,
          displayText: '',
          isEnabled: true,
          packageName: PaymentAppPackageName.PAYTM,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
          pgShortName: PaymentGatewayShortName.PHONEPE,
        },
        {
          appName: PaymentAppName.GPAY,
          appShortName: PaymentAppShortName.GPAY,
          displayText: '',
          isEnabled: true,
          packageName: PaymentAppPackageName.GPAY,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
          pgShortName: PaymentGatewayShortName.PHONEPE,
        },
        {
          appName: PaymentAppName.OTHER,
          appShortName: PaymentAppShortName.OTHER,
          displayText: '',
          isEnabled: false,
          packageName: PaymentAppPackageName.JUSPAY,
          paymentGateway: PaymentGatewayEnum.JUSPAY,
          pgShortName: PaymentGatewayShortName.JUSPAY,
        },
      ],
      paywallPaymentOptions: [
        {
          appName: PaymentAppName.GPAY,
          appShortName: PaymentAppShortName.GPAY,
          displayText: StringConstants.recommendedPaymentOptionText,
          isEnabled: true,
          packageName: PaymentAppPackageName.GPAY,
          paymentGateway: PaymentGatewayEnum.JUSPAY,
          pgShortName: PaymentGatewayShortName.JUSPAY,
        },
        {
          appName: PaymentAppName.PAYTM,
          appShortName: PaymentAppShortName.PAYTM,
          displayText: '',
          isEnabled: true,
          packageName: PaymentAppPackageName.PAYTM,
          paymentGateway: PaymentGatewayEnum.PAYTM,
          pgShortName: PaymentGatewayShortName.PAYTM,
        },
      ],
      priceSymbol: '₹',
      supportNumber: '+1234567890',
      webPaymentOptions: [
        {
          appName: PaymentAppName.GPAY,
          appShortName: PaymentAppShortName.GPAY,
          displayText: StringConstants.recommendedPaymentOptionText,
          isEnabled: true,
          packageName: PaymentAppPackageName.GPAY,
          paymentGateway: PaymentGatewayEnum.JUSPAY,
          pgShortName: PaymentGatewayShortName.JUSPAY,
        },
        {
          appName: PaymentAppName.PAYTM,
          appShortName: PaymentAppShortName.PAYTM,
          displayText: '',
          isEnabled: true,
          packageName: PaymentAppPackageName.PAYTM,
          paymentGateway: PaymentGatewayEnum.PAYTM,
          pgShortName: PaymentGatewayShortName.PAYTM,
        },
      ],
      whatsappNumber: '+0987654321',
    },
    en: {
      contentDetailStripImage: 'https://example.com/strip.png',
      global: {
        subscriptionImage: 'https://example.com/subscription-en.png',
      },
      mobikwikDetails: {
        subTitle: 'Get cashback on Mobikwik payments',
        title: 'Mobikwik Offer',
      },
    },
    hin: {
      contentDetailStripImage: 'https://example.com/strip-hin.png',
      global: {
        subscriptionImage: 'https://example.com/subscription-hin.png',
      },
      mobikwikDetails: {
        subTitle: 'मोबिक्विक भुगतान पर कैशबैक पाएं',
        title: 'मोबिक्विक ऑफर',
      },
    },
  },
  createdAt: new Date('2024-06-01'),
  har: {
    commonForLangs: {
      freeSubscriptionEndDate: new Date('2024-01-31'),
      freeSubscriptionStartDate: new Date('2024-06-01'),
      supportNumber: '+1122334455',
      whatsappNumber: '+5544332211',
    },
    en: {
      android: {
        global: {
          subscriptionImage: 'https://example.com/subscription-android-en.png',
        },
        isCouponSectionVisible: true,
      },
      commonForPlatforms: {
        carouselImage: [
          'https://example.com/carousel1.png',
          'https://example.com/carousel2.png',
        ],
        contentDetailFreeEpisode: 'Watch free episode',
        global: {
          contentDetailFreeEpisode: 'Free Episode Available',
        },
      },
      ios: {
        global: {
          subscriptionImage: 'https://example.com/subscription-ios-en.png',
        },
      },
      tv: {},
      web: {},
    },
    hin: {
      android: {
        global: {
          subscriptionImage: 'https://example.com/subscription-android-hin.png',
        },
        isCouponSectionVisible: true,
      },
      commonForPlatforms: {
        carouselImage: [
          'https://example.com/carousel1-hin.png',
          'https://example.com/carousel2-hin.png',
        ],
        contentDetailFreeEpisode: 'मुफ्त एपिसोड देखें',
        global: {
          contentDetailFreeEpisode: 'मुफ्त एपिसोड उपलब्ध है',
        },
      },
      ios: {
        global: {
          subscriptionImage: 'https://example.com/subscription-ios-hin.png',
        },
      },
      tv: {},
      web: {},
    },
  },
  raj: {
    // Similar structure to 'har', but with different values for Rajasthani dialect
    commonForLangs: {
      freeSubscriptionEndDate: new Date('2024-01-31'),
      freeSubscriptionStartDate: new Date('2024-06-01'),
      supportNumber: '+9988776655',
      whatsappNumber: '+5566778899',
    },
    en: {
      android: {
        global: {
          subscriptionImage: 'https://example.com/subscription-android-en.png',
        },
        isCouponSectionVisible: true,
      },
      commonForPlatforms: {
        carouselImage: [
          'https://example.com/carousel1.png',
          'https://example.com/carousel2.png',
        ],
        contentDetailFreeEpisode: 'Watch free episode',
        global: {
          contentDetailFreeEpisode: 'Free Episode Available',
        },
      },
      ios: {
        global: {
          subscriptionImage: 'https://example.com/subscription-ios-en.png',
        },
      },
      tv: {},
      web: {},
    },
    hin: {
      android: {
        global: {
          subscriptionImage: 'https://example.com/subscription-android-hin.png',
        },
        isCouponSectionVisible: true,
      },
      commonForPlatforms: {
        carouselImage: [
          'https://example.com/carousel1-hin.png',
          'https://example.com/carousel2-hin.png',
        ],
        contentDetailFreeEpisode: 'मुफ्त एपिसोड देखें',
        global: {
          contentDetailFreeEpisode: 'मुफ्त एपिसोड उपलब्ध है',
        },
      },
      ios: {
        global: {
          subscriptionImage: 'https://example.com/subscription-ios-hin.png',
        },
      },
      tv: {},
      web: {},
    },
  },
  updatedAt: new Date('2024-06-01'),
};
