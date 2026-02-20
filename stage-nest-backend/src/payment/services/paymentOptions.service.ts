import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import {
  PaymentAppName,
  PaymentAppPackageName,
  PaymentAppShortName,
  PaymentGatewayShortName,
  PaymentOption,
} from '@app/common/entities/setting.entity';
import { OS, Platform } from '@app/common/enums/app.enum';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import {
  ExperimentName,
  PaymentOptionsGroupName,
} from 'src/users/dtos/experiment.dto';
import { ExperimentService } from 'src/users/services/experiment.service';

import {
  PaymentOptionsRequestDTO,
  PaymentOptionsResponseDTO,
  PaymentOptionsResponseV2DTO,
} from '../dtos/responses/paymentOptions.response.dto';

@Injectable()
export class PaymentOptionsService {
  private readonly logger = new Logger(PaymentOptionsService.name);

  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly experimentService: ExperimentService,
  ) {}

  private async getControlPaymentOptions(
    allPaymentOptions: PaymentOption[],
    installedApps: Set<string>,
  ): Promise<PaymentOptionsResponseDTO> {
    let processedOptions = await this.processPaymentOptions(
      allPaymentOptions,
      installedApps,
    );

    if (
      installedApps.has(PaymentAppPackageName.PAYTM) &&
      installedApps.has(PaymentAppPackageName.PHONEPE)
    ) {
      //remove UPII Collect
      processedOptions = processedOptions.filter(
        (option) => option.appShortName !== PaymentAppShortName.UPI_COLLECT,
      );
    }

    return this.mapToResponseDTO(processedOptions);
  }

  private getGroupName(
    groupName: string | null | undefined,
  ): PaymentOptionsGroupName {
    if (!groupName) {
      return PaymentOptionsGroupName.Control;
    }

    // Check if groupName is in enum
    const groupNameUpper = groupName.toLowerCase();
    if (
      groupNameUpper === PaymentOptionsGroupName.PaytmPriority.toLowerCase()
    ) {
      return PaymentOptionsGroupName.PaytmPriority;
    }
    if (groupNameUpper === PaymentOptionsGroupName.UpiIdDisplay.toLowerCase()) {
      return PaymentOptionsGroupName.UpiIdDisplay;
    }

    // Default to Control if not in enum
    return PaymentOptionsGroupName.Control;
  }

  private async getPaymentOptionsFromSettings(): Promise<PaymentOption[]> {
    const settings = await this.errorHandler.raiseErrorIfNullAsync(
      this.settingRepository.findById(APP_CONFIGS.SETTING.ENTITY_ID),
      Errors.SETTING.NOT_FOUND(),
    );

    return settings.commonForDialects.commonForLangs.customPaymentOptions;
  }

  private async getPaytmPriorityPaymentOptions(
    allPaymentOptions: PaymentOption[],
    installedApps: Set<string>,
  ): Promise<PaymentOptionsResponseDTO> {
    // Process options using control logic first
    const processedOptions = await this.processPaymentOptions(
      allPaymentOptions,
      installedApps,
    );

    // Find Paytm option and boost its rank to 0
    const paytmOption = processedOptions.find(
      (option) => option.appShortName === PaymentAppShortName.PAYTM,
    );

    if (paytmOption) {
      // Find PhonePe option and clear its displayText
      const phonePeOption = processedOptions.find(
        (option) => option.appShortName === PaymentAppShortName.PHONEPE,
      );
      if (phonePeOption) {
        phonePeOption.displayText = undefined;
      }
    }

    // Map to response DTO
    return this.mapToResponseDTO(processedOptions);
  }

  private async getUpiIdDisplayPaymentOptions(
    allPaymentOptions: PaymentOption[],
    installedApps: Set<string>,
  ): Promise<PaymentOptionsResponseDTO> {
    // Process options using control logic first
    const processedOptions = await this.processPaymentOptions(
      allPaymentOptions,
      installedApps,
    );

    // If the first option is GPAY, filter out UPIID
    if (
      processedOptions.length > 0 &&
      processedOptions[0].appShortName === PaymentAppShortName.GPAY
    ) {
      const filteredOptions = processedOptions.filter(
        (option) => option.appShortName !== PaymentAppShortName.UPI_COLLECT,
      );
      return this.mapToResponseDTO(filteredOptions);
    }

    return this.mapToResponseDTO(processedOptions);
  }

  private hasRequiredFields(
    option:
      | PaymentOption
      | {
          appName?: PaymentAppName;
          appShortName?: PaymentAppShortName;
          imagePath?: string;
          packageName?: PaymentAppPackageName;
          paymentGateway?: PaymentGatewayEnum;
          pgShortName?: PaymentGatewayShortName;
          paymentFailurePopupDelay?: number;
        },
  ): option is {
    appName: PaymentAppName;
    appShortName: PaymentAppShortName;
    imagePath: string;
    packageName: PaymentAppPackageName;
    paymentGateway: PaymentGatewayEnum;
    pgShortName: PaymentGatewayShortName;
    paymentFailurePopupDelay: number;
  } {
    return (
      !!option.appName &&
      !!option.appShortName &&
      !!option.imagePath &&
      !!option.packageName &&
      !!option.paymentGateway &&
      !!option.pgShortName &&
      option.paymentFailurePopupDelay !== undefined
    );
  }

  private mapToResponseDTO(
    processedOptions: {
      appName: PaymentAppName;
      appShortName: PaymentAppShortName;
      displayText?: string;
      imagePath: string;
      packageName: PaymentAppPackageName;
      paymentGateway: PaymentGatewayEnum;
      pgShortName: PaymentGatewayShortName;
      paymentFailurePopupDelay: number;
    }[],
  ): PaymentOptionsResponseDTO {
    return processedOptions.map((option) => ({
      appName: option.appName,
      appShortName: option.appShortName,
      displayText: option.displayText,
      imagePath: option.imagePath,
      packageName: option.packageName,
      paymentFailurePopupDelay: option.paymentFailurePopupDelay,
      paymentGateway: option.paymentGateway,
      pgShortName: option.pgShortName,
    }));
  }

  private async paymentOptionPriorityResolver(
    allPaymentOptions: PaymentOption[],
    installedApps: Set<string>,
    groupName: PaymentOptionsGroupName,
  ): Promise<PaymentOptionsResponseDTO> {
    let paymentOptionsResponse: PaymentOptionsResponseDTO;
    switch (groupName) {
      case PaymentOptionsGroupName.PaytmPriority:
        paymentOptionsResponse = await this.getPaytmPriorityPaymentOptions(
          allPaymentOptions,
          installedApps,
        );
        break;
      case PaymentOptionsGroupName.UpiIdDisplay:
        paymentOptionsResponse = await this.getUpiIdDisplayPaymentOptions(
          allPaymentOptions,
          installedApps,
        );
        break;
      default:
        paymentOptionsResponse = await this.getControlPaymentOptions(
          allPaymentOptions,
          installedApps,
        );
    }
    return paymentOptionsResponse;
  }

  private async processPaymentOptions(
    allPaymentOptions: PaymentOption[],
    installedApps: Set<string>,
  ): Promise<
    {
      applyAppInstallCheck: boolean;
      appName: PaymentAppName;
      appShortName: PaymentAppShortName;
      displayText?: string;
      imagePath: string;
      isEnabled: boolean;
      packageName: PaymentAppPackageName;
      paymentGateway: PaymentGatewayEnum;
      pgShortName: PaymentGatewayShortName;
      paymentFailurePopupDelay: number;
      rank?: number;
      showIfOptionsCountBelow?: number;
      visibleByDefault: boolean;
    }[]
  > {
    // Map all options with their metadata
    const allOptions = allPaymentOptions.map((option) => ({
      applyAppInstallCheck: option.applyAppInstallCheck,
      appName: option.appName,
      appShortName: option.appShortName,
      displayText: option.displayText,
      imagePath: option.imagePath,
      isEnabled: option.isEnabled,
      packageName: option.packageName,
      paymentFailurePopupDelay: option.paymentFailurePopupDelay,
      paymentGateway: option.paymentGateway,
      pgShortName: option.pgShortName,
      rank: (option as { rank?: number }).rank,
      showIfOptionsCountBelow: option.showIfOptionsCountBelow,
      visibleByDefault: option.visibleByDefault,
    }));

    // Step 1: Remove all not enabled
    let filteredOptions = allOptions.filter((option) => option.isEnabled);

    // Step 2: Filter Visible by default
    filteredOptions = filteredOptions.filter(
      (option) => option.visibleByDefault,
    );

    // Step 3: Apply Install check - Filter out options that fail install check
    filteredOptions = filteredOptions.filter((option) => {
      if (
        option.applyAppInstallCheck &&
        (option.appShortName === PaymentAppShortName.GPAY ||
          option.appShortName === PaymentAppShortName.PHONEPE ||
          option.appShortName === PaymentAppShortName.PAYTM)
      ) {
        return installedApps.has(option.packageName);
      }
      return true;
    });

    // Step 4: Add showIfOptionsCountBelow options
    // Get fallback options (not visible by default, but still enabled) and sort by rank
    const fallbackOptions = allOptions
      .filter((option) => !option.visibleByDefault && option.isEnabled)
      .filter((option) => option.showIfOptionsCountBelow !== undefined)
      .sort((a, b) => {
        const rankA = a.rank ?? Infinity;
        const rankB = b.rank ?? Infinity;
        return rankA - rankB;
      });

    // Add fallback options one by one, checking threshold after each addition
    for (const fallbackOption of fallbackOptions) {
      // Apply install check for fallback options (only for GPY, PHP, PTM)
      let shouldAdd = false;
      if (
        fallbackOption.applyAppInstallCheck &&
        (fallbackOption.appShortName === PaymentAppShortName.GPAY ||
          fallbackOption.appShortName === PaymentAppShortName.PHONEPE ||
          fallbackOption.appShortName === PaymentAppShortName.PAYTM)
      ) {
        if (installedApps.has(fallbackOption.packageName)) {
          shouldAdd = true;
        }
      } else {
        // No install check needed
        shouldAdd = true;
      }

      if (
        fallbackOption.showIfOptionsCountBelow !== undefined &&
        filteredOptions.length >= fallbackOption.showIfOptionsCountBelow
      ) {
        break;
      }

      // Add if install check passed
      if (shouldAdd) {
        filteredOptions.push(fallbackOption);
      }
    }

    // Step 5: Sort by rank (missing rank = Infinity)
    filteredOptions.sort((a, b) => {
      const rankA = a.rank ?? Infinity;
      const rankB = b.rank ?? Infinity;
      return rankA - rankB;
    });

    // Step 6: Filter out options missing required fields (all fields except displayText)
    const validOptions = filteredOptions.filter((option) =>
      this.hasRequiredFields(option),
    ) as {
      applyAppInstallCheck: boolean;
      appName: PaymentAppName;
      appShortName: PaymentAppShortName;
      displayText?: string;
      imagePath: string;
      isEnabled: boolean;
      packageName: PaymentAppPackageName;
      paymentGateway: PaymentGatewayEnum;
      pgShortName: PaymentGatewayShortName;
      paymentFailurePopupDelay: number;
      rank?: number;
      showIfOptionsCountBelow?: number;
      visibleByDefault: boolean;
    }[];

    return validOptions;
  }

  async getPaymentOptions(
    request: PaymentOptionsRequestDTO,
    os: OS,
    platform: Platform,
    userId: string,
  ): Promise<PaymentOptionsResponseDTO> {
    const result = await this.getPaymentOptionsWithGroup(
      request,
      os,
      platform,
      userId,
    );
    return result.paymentOptions;
  }

  async getPaymentOptionsWithGroup(
    request: PaymentOptionsRequestDTO,
    os: OS,
    platform: Platform,
    userId: string,
  ): Promise<PaymentOptionsResponseV2DTO> {
    // Validate platform and OS
    if (platform !== Platform.APP || os !== OS.ANDROID) {
      throw new BadRequestException(
        'This endpoint is only available for Android app',
      );
    }

    // Get installed apps from request
    const installedApps = new Set(request.packageNames ?? []);
    let allPaymentOptions: PaymentOption[];
    let groupName = PaymentOptionsGroupName.Control;

    const experiment =
      await this.experimentService.getExperimentValueWithGroupName<
        { paymentOptions: PaymentOption[] },
        PaymentOptionsGroupName
      >(userId, ExperimentName.PaymentOptionsExperiment);

    const paymentOptions = experiment.value.paymentOptions;

    if (
      paymentOptions &&
      Array.isArray(paymentOptions) &&
      paymentOptions.length > 0
    ) {
      allPaymentOptions = paymentOptions;
    } else {
      // Fall back to settings if experiment options not available
      allPaymentOptions = await this.getPaymentOptionsFromSettings();
    }

    groupName = this.getGroupName(experiment.groupName);

    const paymentOptionsResponse = await this.paymentOptionPriorityResolver(
      allPaymentOptions,
      installedApps,
      groupName,
    );

    return { groupName, paymentOptions: paymentOptionsResponse };
  }
}
