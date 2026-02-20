import { Injectable } from '@nestjs/common';

import {
  AllowedAppValues,
  AllowedPGValues,
} from './dtos/pGConfig.response.dto';
import { ConfigUpdateValues } from './dtos/updatePGConfig.request.dto';
import { PaymentOptionsEnum } from './enums/paymentOption.enum';
import { StringConstants } from '@app/common/constants/string.constant';
import {
  PaymentAppName,
  PaymentAppPackageName,
  PaymentGatewayShortName,
  PaymentOption,
  Setting,
} from '@app/common/entities/setting.entity';
import { Errors } from '@app/error-handler';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

export const possibleAppCombinations: Record<PaymentAppName, AllowedAppValues> =
  {
    [PaymentAppName.GPAY]: {
      appName: PaymentAppName.GPAY,
      appPackageName: PaymentAppPackageName.GPAY,
      supportedPGs: [PaymentGatewayEnum.JUSPAY],
    },
    [PaymentAppName.OTHER]: {
      appName: PaymentAppName.OTHER,
      appPackageName: PaymentAppPackageName.JUSPAY, // TODO: validate whether correct
      supportedPGs: [PaymentGatewayEnum.JUSPAY_CHECKOUT],
    },
    [PaymentAppName.PAYTM]: {
      appName: PaymentAppName.PAYTM,
      appPackageName: PaymentAppPackageName.PAYTM,
      supportedPGs: [
        PaymentGatewayEnum.PHONEPE,
        PaymentGatewayEnum.PAYTM,
        PaymentGatewayEnum.JUSPAY,
      ],
    },
    [PaymentAppName.PHONEPE]: {
      appName: PaymentAppName.PHONEPE,
      appPackageName: PaymentAppPackageName.PHONEPE,
      supportedPGs: [PaymentGatewayEnum.PHONEPE, PaymentGatewayEnum.JUSPAY],
    },
    [PaymentAppName.QR]: {
      appName: PaymentAppName.QR,
      appPackageName: PaymentAppPackageName.QR,
      supportedPGs: [PaymentGatewayEnum.PHONEPE],
    },
    [PaymentAppName.UPI_APPS]: {
      appName: PaymentAppName.UPI_APPS,
      appPackageName: PaymentAppPackageName.UPI,
      supportedPGs: [PaymentGatewayEnum.PHONEPE],
    },
    [PaymentAppName.UPI_COLLECT]: {
      appName: PaymentAppName.UPI_COLLECT,
      appPackageName: PaymentAppPackageName.UPI_COLLECT,
      supportedPGs: [PaymentGatewayEnum.PHONEPE],
    },
  };

export const possiblePGCombinations: Record<
  PaymentGatewayEnum,
  AllowedPGValues
> = {
  [PaymentGatewayEnum.APPLE_PAY]: {
    pgShortName: PaymentGatewayShortName.APPLE_PAY,
  },
  [PaymentGatewayEnum.BACKEND]: {
    pgShortName: PaymentGatewayShortName.BACKEND,
  },
  [PaymentGatewayEnum.JUSPAY]: {
    pgShortName: PaymentGatewayShortName.JUSPAY,
  },
  [PaymentGatewayEnum.JUSPAY_CHECKOUT]: {
    pgShortName: PaymentGatewayShortName.JUSPAY_SDK,
  },
  [PaymentGatewayEnum.LEGACY_APPLE]: {
    pgShortName: PaymentGatewayShortName.APPLE_PAY, // Adjust as necessary
  },
  [PaymentGatewayEnum.PAYTM]: {
    pgShortName: PaymentGatewayShortName.PAYTM,
  },
  [PaymentGatewayEnum.PHONEPE]: {
    pgShortName: PaymentGatewayShortName.PHONEPE,
  },
  [PaymentGatewayEnum.RAZORPAY]: {
    pgShortName: PaymentGatewayShortName.RAZORPAY,
  },
  [PaymentGatewayEnum.SETU]: {
    pgShortName: PaymentGatewayShortName.SETU, // Adjust as necessary
  },
};

@Injectable()
export class AppSettingHelperService {
  public getPaymentOption(
    paymentOption: PaymentOptionsEnum,
    setting: Setting,
  ): PaymentOption[] {
    const {
      customPaymentOptions,
      paymentOptions,
      paywallPaymentOptions,
      webPaymentOptions,
    } = setting.commonForDialects.commonForLangs;

    switch (paymentOption) {
      case PaymentOptionsEnum.DEFAULT:
        return paymentOptions;
      case PaymentOptionsEnum.CUSTOM:
        return customPaymentOptions;
      case PaymentOptionsEnum.PAYWALL:
        return paywallPaymentOptions;
      case PaymentOptionsEnum.WEB:
        return webPaymentOptions;
      default:
        throw Errors.SETTING.INVALID_PAYMENT_OPTION();
    }
  }

  public getPaymentOptionKeyByEnum(paymentOption: PaymentOptionsEnum) {
    switch (paymentOption) {
      case PaymentOptionsEnum.DEFAULT:
        return StringConstants.paymentOptions;
      case PaymentOptionsEnum.CUSTOM:
        return StringConstants.customPaymentOptions;
      case PaymentOptionsEnum.PAYWALL:
        return StringConstants.paywallPaymentOptions;
      case PaymentOptionsEnum.WEB:
        return StringConstants.webPaymentOptions;
      default:
        throw Errors.SETTING.INVALID_PAYMENT_OPTION();
    }
  }

  // function to reorder the list based on newOrder
  public reorder<T>(list: T[], newOrder: number[]): T[] {
    if (newOrder.length === 0 || list.length === 0) {
      return list;
    }

    const lengthCheck = list.length === newOrder.length;
    const indexValid = newOrder.every(
      (index) => index > 0 && index <= list.length,
    );

    if (!indexValid || !lengthCheck) {
      throw Errors.SETTING.INVALID_PG_UPDATE_REQUEST();
    }

    return newOrder.map((index) => list[index - 1]);
  }

  public updateConfigValues(
    paymentOption: PaymentOptionsEnum,
    configUpdateValue: ConfigUpdateValues,
    setting: Setting,
  ) {
    const paymentOptions: PaymentOption[] = this.getPaymentOption(
      paymentOption,
      setting,
    );

    const updatedPaymentOptions = paymentOptions.map((paymentOption) => {
      if (paymentOption.appName === configUpdateValue.appName) {
        if (configUpdateValue.paymentGateway) {
          paymentOption.paymentGateway = configUpdateValue.paymentGateway;
        }
        if (configUpdateValue.isEnabled) {
          paymentOption.isEnabled = configUpdateValue.isEnabled;
        }
        if (configUpdateValue.isRecommended) {
          paymentOption.displayText = configUpdateValue.isRecommended
            ? StringConstants.recommendedPaymentOptionText
            : '';
        }
      }
      return paymentOption;
    });

    return updatedPaymentOptions;
  }
}
