import { Injectable } from '@nestjs/common';

import { Logger } from '@nestjs/common';

import {
  AppSettingHelperService,
  possibleAppCombinations,
} from './appSettingHelper.service';
import { PGConfigResponseDTO } from './dtos/pGConfig.response.dto';
import {
  ConfigUpdateValues,
  UpdatePGConfig,
  UpdatePGConfigRequestDTO,
} from './dtos/updatePGConfig.request.dto';
import { UpdatePGConfigResponseDTO } from './dtos/updatePGConfig.response.dto';
import { PaymentOptionsEnum } from './enums/paymentOption.enum';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { StringConstants } from '@app/common/constants/string.constant';
import { PaymentOption, Setting } from '@app/common/entities/setting.entity';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class AppSettingService {
  private logger = new Logger(AppSettingService.name);

  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly appSettingHelperService: AppSettingHelperService,
  ) {}

  private async fetchSettings() {
    const fetchSetting = this.settingRepository.findById(
      APP_CONFIGS.SETTING.ENTITY_ID,
    );
    return this.errorHandlerService.raiseErrorIfNullAsync(
      fetchSetting,
      Errors.SETTING.NOT_FOUND(),
    );
  }

  private newUpdatedPaymentOptionList(
    setting: Setting,
    change: UpdatePGConfig,
  ) {
    const { newOrder, paymentOption, valueChanges } = change;

    let paymentOptions: PaymentOption[] =
      this.appSettingHelperService.getPaymentOption(paymentOption, setting);

    // resent other recommended text if new alloted
    const recommendedPresent = valueChanges.some(
      (valueChange) => valueChange?.isRecommended === true,
    );
    if (recommendedPresent) {
      const recommendedIndex = paymentOptions.findIndex(
        (paymentOption) =>
          paymentOption.displayText ===
          StringConstants.recommendedPaymentOptionText,
      );
      paymentOptions[recommendedIndex].displayText = '';
    }

    for (const valueChange of valueChanges) {
      paymentOptions = this.updateConfigValues(paymentOptions, valueChange);
    }

    return this.appSettingHelperService.reorder<PaymentOption>(
      paymentOptions,
      newOrder,
    );
  }

  private async saveUpdatedPaymentOptions(
    updateRecord: Record<PaymentOptionsEnum, PaymentOption[]>,
  ) {
    const updateObject: Record<string, PaymentOption[]> = {};

    for (const key in updateRecord) {
      if (updateRecord[key as PaymentOptionsEnum].length == 0) {
        continue;
      }
      const objectKey = this.appSettingHelperService.getPaymentOptionKeyByEnum(
        key as PaymentOptionsEnum,
      );
      updateObject[`commonForDialects.commonForLangs.${objectKey}`] =
        updateRecord[key as PaymentOptionsEnum];
    }

    const updateConfigRequest = this.settingRepository.findByIdAndUpdate(
      APP_CONFIGS.SETTING.ENTITY_ID,
      {
        $set: updateObject,
      },
      { new: true, runValidators: true },
    );

    await this.errorHandlerService.raiseErrorIfNullAsync(
      updateConfigRequest,
      Errors.SETTING.UPDATE_FAILED(),
    );
  }

  private updateConfigValues(
    paymentOptions: PaymentOption[],
    configUpdateValue: ConfigUpdateValues,
  ) {
    const updatedPaymentOptions = paymentOptions.map((paymentOption) => {
      if (paymentOption.appName === configUpdateValue.appName) {
        if (configUpdateValue?.paymentGateway !== undefined) {
          paymentOption.paymentGateway = configUpdateValue.paymentGateway;
        }
        if (configUpdateValue?.isEnabled !== undefined) {
          paymentOption.isEnabled = configUpdateValue.isEnabled;
        }
        if (configUpdateValue?.isRecommended !== undefined) {
          paymentOption.displayText = configUpdateValue.isRecommended
            ? StringConstants.recommendedPaymentOptionText
            : '';
        }
      }
      return paymentOption;
    });

    return updatedPaymentOptions;
  }

  public async getPGConfig(): Promise<PGConfigResponseDTO> {
    const setting = await this.fetchSettings();
    const {
      customPaymentOptions,
      paymentOptions,
      paywallPaymentOptions,
      webPaymentOptions,
    } = setting.commonForDialects.commonForLangs;

    return {
      customPaymentOptions,
      paymentOptions,
      paywallPaymentOptions,
      possibleAppCombinations: possibleAppCombinations,
      webPaymentOptions,
    };
  }

  public async updatePGConfig(
    updatePGConfigRequestDTO: UpdatePGConfigRequestDTO,
  ): Promise<UpdatePGConfigResponseDTO> {
    const setting = await this.fetchSettings();
    const { changes } = updatePGConfigRequestDTO;

    const updateRecord: Record<PaymentOptionsEnum, PaymentOption[]> = {
      [PaymentOptionsEnum.CUSTOM]: [],
      [PaymentOptionsEnum.DEFAULT]: [],
      [PaymentOptionsEnum.PAYWALL]: [],
      [PaymentOptionsEnum.WEB]: [],
    };

    for (const change of changes) {
      const { paymentOption } = change;

      const newOrderList = this.newUpdatedPaymentOptionList(setting, change);
      updateRecord[paymentOption] = newOrderList;
    }

    await this.saveUpdatedPaymentOptions(updateRecord);
    this.logger.log('Successfully updated pg config');

    return { message: 'Successfully updated pg config', success: true };
  }
}
