import { Injectable } from '@nestjs/common';

import {
  ButtonDto,
  CreateImageUrlDto,
  CreatePaywallDto,
  CreatePlanDto,
  GetAllPlansDto,
  getPlansForPostSubscriptionResponseDto,
  MediaImageDto,
  MediaVideoDto,
  PaywallDetailsResponseDto,
  PaywallListResponseDto,
  PlanDetailsResponseDto,
  PublishPaywallDto,
  TextDto,
  UpdatePaywallDto,
} from '../dtos/payment.dto';
import {
  safePublishPlan,
  safeValidateCreatePlan,
  safeValidatePublishPaywall,
} from '../utils/payment.validation.schema';

import { FileManagerService } from './file-manager.service';
import { Errors } from '@app/error-handler/constants/errorCodes';
import { PlanCountryEnum, PlanStatusEnum } from '@app/payment/enums/plan.enum';
import { CMS_CONFIG } from 'common/configs/cms.config';
import {
  Paywall,
  PaywallItemTypeEnum,
  PaywallStatusEnum,
} from 'common/entities/paywall.entity';
import { DayCountEnum, Plan } from 'common/entities/plan.entity';
import { Lang, OS } from 'common/enums/app.enum';
import { PaywallImageResolution } from 'common/enums/media.enum';
import { PaginatedQueryResponse } from 'common/repositories/base.repository';
import { PaywallRepository } from 'common/repositories/paywall.repository';
import { PlanRepository } from 'common/repositories/plan.repository';
import { CommonUtils } from 'common/utils/common.utils';
import {
  MediaFilePathUtils,
  parseUrlToRelativePath,
} from 'common/utils/media-file.utils';

@Injectable()
export class PaymentService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly paywallRepository: PaywallRepository,
    private readonly fileManagerService: FileManagerService,
  ) {}

  private async linkPlanWithPaywall(
    paywall: CreatePaywallDto,
    paywallId: string,
  ): Promise<void> {
    await this.planRepository.updatePlanWithPaywallId({
      mediaAssets: {
        [Lang.EN]: this.mapSectionsToPaywallAssets(
          paywall[Lang.EN].sections,
          paywall[Lang.EN].peripheralImageUrl ?? '',
          paywall[Lang.EN].renewalImage ?? '',
        ),
        [Lang.HIN]: this.mapSectionsToPaywallAssets(
          paywall[Lang.HIN].sections,
          paywall[Lang.HIN].peripheralImageUrl ?? '',
          paywall[Lang.HIN].renewalImage ?? '',
        ),
      },
      paywallId,
      planId: paywall.planId,
    });
  }

  private mapSectionsToPaywallAssets(
    sections: (ButtonDto | MediaImageDto | MediaVideoDto | TextDto)[],
    subscriptionImage: string,
    renewalImage: string,
  ): {
    paywallAssets:
      | [MediaImageDto, MediaVideoDto]
      | [MediaVideoDto, MediaImageDto];
    buttonItem: ButtonDto;
    footerText: string;
    subscriptionImage: string;
    renewalImage: string;
  } {
    const finalAssets: (MediaImageDto | MediaVideoDto)[] = [];

    let buttonItem: ButtonDto | null = null;
    let footerText = '';

    sections.forEach((section) => {
      if (
        section.type === PaywallItemTypeEnum.MEDIA_IMAGE ||
        section.type === PaywallItemTypeEnum.MEDIA_VIDEO
      ) {
        if (
          finalAssets.findIndex((asset) => asset.type === section.type) === -1
        ) {
          finalAssets.push(section);
        }
      }
      if (section.type === PaywallItemTypeEnum.BUTTON) {
        buttonItem = section;
      }
      if (section.type === PaywallItemTypeEnum.TEXT) {
        footerText = section.text;
      }
    });

    // Ensure we have exactly 1 image and 1 video
    if (finalAssets.length !== 2) {
      throw new Error(
        'Paywall must have exactly 2 media assets (one image and one video)',
      );
    }

    if (!buttonItem) {
      throw new Error('Paywall must have a button item');
    }

    // Return as tuple - the order doesn't matter as long as it's consistent
    return {
      buttonItem,
      footerText,
      paywallAssets: finalAssets as
        | [MediaImageDto, MediaVideoDto]
        | [MediaVideoDto, MediaImageDto],
      renewalImage,
      subscriptionImage,
    };
  }

  private parsePaywallUrls(paywall: CreatePaywallDto): void {
    [Lang.EN, Lang.HIN].forEach((lang) => {
      if (paywall[lang].peripheralImageUrl) {
        paywall[lang].peripheralImageUrl = parseUrlToRelativePath(
          paywall[lang].peripheralImageUrl,
        );
      }
      if (paywall[lang].renewalImage) {
        paywall[lang].renewalImage = parseUrlToRelativePath(
          paywall[lang].renewalImage,
        );
      }

      if (paywall[lang].sections && Array.isArray(paywall[lang].sections)) {
        paywall[lang].sections.forEach((section) => {
          if ('sourceLink' in section) {
            section.sourceLink = parseUrlToRelativePath(section.sourceLink);
          }
        });
      }
    });
  }

  private async updatePaywallAndPlanStatus(
    paywallId: string,
    planId: string,
  ): Promise<{ updatedPaywall: Paywall; updatedPlan: Plan }> {
    const updatedPaywall =
      await this.paywallRepository.updatePaywallStatusToActive(paywallId);
    if (!updatedPaywall) {
      throw Errors.PAYWALL.STATUS_UPDATE_FAILED(
        'Failed to update paywall status',
      );
    }

    const updatedPlan =
      await this.planRepository.updatePlanStatusToActive(planId);
    if (!updatedPlan) {
      throw Errors.PLAN.STATUS_UPDATE_FAILED('Failed to update plan status');
    }

    return { updatedPaywall, updatedPlan };
  }

  private async validateAndGetPaywall(paywallId: string): Promise<Paywall> {
    const paywall = await this.paywallRepository.getPaywallDetails(
      paywallId,
      Lang.EN,
    );
    const hinPaywall = await this.paywallRepository.getPaywallDetails(
      paywallId,
      Lang.HIN,
    );
    if (!paywall || !hinPaywall) {
      throw Errors.PAYWALL.NOT_FOUND('Paywall not found');
    }

    if (paywall.status !== PaywallStatusEnum.DRAFT) {
      throw Errors.PAYWALL.INVALID_STATUS(
        `Paywall is already ${paywall.status}. Only draft paywalls can be published.`,
      );
    }

    if (hinPaywall.status !== PaywallStatusEnum.DRAFT) {
      throw Errors.PAYWALL.INVALID_STATUS(
        `Hindi paywall is already ${hinPaywall.status}. Only draft paywalls can be published.`,
      );
    }

    return paywall;
  }

  private async validateAndGetPlan(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      planId: planId,
    });
    if (!plan) {
      throw Errors.PLAN.NOT_FOUND('Associated plan not found');
    }

    if (plan.status === PlanStatusEnum.ACTIVE) {
      throw Errors.PLAN.ALREADY_ACTIVE(
        'Plan is already active. Cannot publish paywall for an active plan.',
      );
    }

    return plan;
  }

  private validatePaywallId(paywallId: string): void {
    if (!paywallId) {
      throw Errors.PAYWALL.ID_REQUIRED('Paywall ID is required');
    }
  }

  private async validatePlanRules(plan: CreatePlanDto): Promise<void> {
    if (plan.postSubscriptionPlan) {
      const postSubscriptionPlan = await this.planRepository.findOne({
        planId: plan.postSubscriptionPlan,
      });
      if (!postSubscriptionPlan) {
        throw Errors.PLAN.NOT_FOUND('Post subscription plan not found');
      }
      if (postSubscriptionPlan.payingPrice < plan.actualPrice) {
        throw Errors.PLAN.INVALID_PAYING_PRICE(
          'Post subscription plan paying price cannot be less than actual price',
        );
      }
    }
    if (plan.payingPrice > plan.actualPrice) {
      throw Errors.PLAN.INVALID_PAYING_PRICE(
        'Paying price cannot be greater than actual price',
      );
    }
  }

  private async validatePublishData(
    paywallId: string,
    plan: Plan,
  ): Promise<void> {
    // Validate English paywall
    const enPaywall = await this.paywallRepository.getPaywallDetails(
      paywallId,
      Lang.EN,
    );
    const enPublishPaywallValidationResult =
      safeValidatePublishPaywall(enPaywall);

    if (!enPublishPaywallValidationResult.success) {
      throw Errors.CMS.INVALID_PLAN_DATA(
        `English paywall validation failed: ${enPublishPaywallValidationResult.error?.message}`,
      );
    }

    // Validate Hindi paywall
    const hinPaywall = await this.paywallRepository.getPaywallDetails(
      paywallId,
      Lang.HIN,
    );
    const hinPublishPaywallValidationResult =
      safeValidatePublishPaywall(hinPaywall);

    if (!hinPublishPaywallValidationResult.success) {
      throw Errors.CMS.INVALID_PLAN_DATA(
        `Hindi paywall validation failed: ${hinPublishPaywallValidationResult.error?.message}`,
      );
    }

    const publishPlanValidationResult = safePublishPlan(plan);
    if (!publishPlanValidationResult.success) {
      throw Errors.CMS.INVALID_PLAN_DATA(
        publishPlanValidationResult.error?.message,
      );
    }

    if (publishPlanValidationResult.data?.planType !== plan.planType) {
      throw Errors.CMS.INVALID_PLAN_DATA('Plan type does not match');
    }
  }

  async checkPlanAvailabilityForPaywall({
    country,
    os,
    planId,
  }: {
    planId: string;
    os: OS;
    country: PlanCountryEnum;
  }) {
    const plan = await this.planRepository.findOne({ country, os, planId });
    if (!plan) {
      return {
        available: true,
        plan: null,
      };
    }
    if (plan.paywallId) {
      //is legacy plan with no paywall
      return {
        available: false,
        plan: null,
      };
    }

    return {
      available: true,
      plan: {
        actualPrice: plan.actualPrice,
        mandateSetupPayingPrice: plan.mandateSetupPayingPrice,
        name: plan.planId,
        payingPrice: plan.payingPrice,
        planId: plan.planId,
        planPartOfABTestGroup: plan.planPartOfABTestGroup,
        planType: plan.planType,
        status: plan.status,
        visibility: plan.planPartOfABTestGroup.length > 0,
      },
    };
  }

  async checkPlanNameExists(
    planName: string,
    os: OS,
    country: PlanCountryEnum,
  ) {
    const existingPlan = await this.planRepository.findOne({
      country,
      os,
      planId: CommonUtils.sanitizeString(planName),
    });
    return {
      exists: !!existingPlan,
    };
  }

  async createImageUrl({
    fileExtension,
    mimeType,
    paywallId,
  }: CreateImageUrlDto) {
    const { filename, uploadUrl } =
      await this.fileManagerService.generatePaywallImageUploadUrl({
        fileExtension,
        mimeType,
        paywallId,
      });
    return {
      filename,
      uploadUrl,
    };
  }

  async createOrUpdatePaywall(paywall: CreatePaywallDto): Promise<Paywall> {
    this.parsePaywallUrls(paywall);
    if (!paywall.planId) {
      throw Errors.PAYWALL.PLAN_ID_REQUIRED('Plan ID is required');
    }

    const existingPlan = await this.planRepository.findOne({
      planId: paywall.planId,
    });

    if (!existingPlan) {
      throw Errors.PLAN.NOT_FOUND('Plan not found');
    }

    const existingPaywalls = await Promise.all(
      Object.values(Lang).map((lang) =>
        this.paywallRepository.findOne({
          lang,
          name: paywall[lang].name,
        }),
      ),
    );

    const existingPaywallsCount = existingPaywalls.filter(Boolean).length;
    const totalLanguages = Object.values(Lang).length;

    // Check if any existing paywall belongs to a different plan
    const conflictingPaywall = existingPaywalls.find(
      (paywall) => paywall && paywall.planId.toString() !== paywall.planId,
    );
    if (conflictingPaywall) {
      throw Errors.PAYWALL.ALREADY_EXISTS(
        'Paywall already exists for another plan ',
      );
    }

    if (existingPaywallsCount === totalLanguages) {
      const createUpdatePayload = (
        paywall: CreatePaywallDto,
      ): UpdatePaywallDto => {
        const updatePayload: UpdatePaywallDto = Object.values(Lang).reduce(
          (payload, lang) => {
            if (!paywall[lang]) {
              throw new Error(`Missing data for language: ${lang}`);
            }

            payload[lang] = {
              name: paywall[lang].name,
              peripheralImageUrl: paywall[lang].peripheralImageUrl,
              renewalImage: paywall[lang].renewalImage,
              sections: paywall[lang].sections,
            };
            return payload;
          },
          {} as UpdatePaywallDto,
        );
        return updatePayload;
      };

      const updatePayload = createUpdatePayload(paywall);

      const firstExistingPaywall = existingPaywalls.find(Boolean);
      if (!firstExistingPaywall) {
        throw Errors.PAYWALL.UPDATE_FAILED('No existing paywall found');
      }

      const updatedPaywall = await this.paywallRepository.updatePaywall({
        paywall: updatePayload,
        paywallId: firstExistingPaywall.paywallId,
      });

      if (updatedPaywall[0] === null) {
        throw Errors.PAYWALL.UPDATE_FAILED('Failed to update paywall');
      }

      await this.linkPlanWithPaywall(paywall, updatedPaywall[0].planId);
      return updatedPaywall[0];
    }

    if (existingPaywallsCount > 0 && existingPaywallsCount < totalLanguages) {
      throw Errors.PAYWALL.UPDATE_FAILED(
        'Paywall already exists for another plan',
      );
    }

    const createdPaywall = await this.paywallRepository.createPaywall({
      paywall,
    });

    if (!createdPaywall) {
      throw Errors.PAYWALL.CREATION_FAILED('Failed to create paywall');
    }

    // Link the plan with the paywall
    await this.linkPlanWithPaywall(paywall, createdPaywall[0].paywallId);

    return createdPaywall[0];
  }

  async createOrUpdatePlan(plan: CreatePlanDto): Promise<Plan> {
    const validationResult = safeValidateCreatePlan(plan);

    if (!validationResult.success) {
      throw Errors.CMS.INVALID_PLAN_DATA('Invalid plan data');
    }

    this.validatePlanRules(plan);

    const existingPlan = await this.planRepository.findOne({
      planId: plan.planId,
    });
    if (existingPlan) {
      if (existingPlan.status === PlanStatusEnum.ACTIVE) {
        throw Errors.PLAN.ALREADY_ACTIVE(
          'Plan is already active. Cannot update plan',
        );
      }

      const updatedPlan = await this.planRepository.updatePlan({
        plan: plan,
        planId: plan.planId,
      });

      if (!updatedPlan) {
        throw Errors.PLAN.UPDATE_FAILED('Failed to update plan');
      }

      return updatedPlan;
    }

    return this.planRepository.createPlan({ plan: plan });
  }

  async generatePaywallVideoUploadUrl({
    fileExtension,
    mimeType,
    planId,
  }: {
    mimeType: string;
    fileExtension: string;
    planId: string;
  }) {
    return this.fileManagerService.generatePaywallVideoUploadUrl({
      fileExtension,
      fileName: planId,
      mimeType,
    });
  }

  async getAllPaywalls({
    page = 1,
    perPage = 20,
  }: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedQueryResponse<PaywallListResponseDto>> {
    return this.paywallRepository.getAllPaywalls({ page, perPage });
  }

  async getAllPlans({
    page = 1,
    perPage = 20,
  }: {
    page?: number;
    perPage?: number;
  }): Promise<GetAllPlansDto> {
    return this.planRepository.getAllPlans({ page, perPage });
  }

  async getPaywallDetails(
    paywallId: string,
  ): Promise<PaywallDetailsResponseDto> {
    if (!paywallId) {
      throw Errors.PAYWALL.ID_REQUIRED('Paywall ID is required');
    }

    // Fetch paywall details for all languages
    const paywallDetails = await Promise.all(
      Object.values(Lang).map(async (lang) => {
        const paywall = await this.paywallRepository.getPaywallDetails(
          paywallId,
          lang,
        );
        if (!paywall) {
          throw Errors.PAYWALL.NOT_FOUND(
            `Paywall not found for language: ${lang}`,
          );
        }
        return { lang, paywall };
      }),
    );

    // Build the response with dynamic language mapping
    const response = {
      _id: paywallDetails[0].paywall.paywallId,
      planId: paywallDetails[0].paywall.planId,
    } as PaywallDetailsResponseDto;

    // Map each language dynamically
    paywallDetails.forEach(({ lang, paywall }) => {
      const sections = [
        ...paywall.buttonPaywallItems,
        ...paywall.mediaImagePaywallItems,
        ...paywall.mediaVideoPaywallItems,
      ].sort((a, b) => a.order - b.order);

      response[lang] = {
        name: paywall.name,
        peripheralImageUrl: paywall.peripheralImageUrl || '',
        renewalImage: paywall.renewalImage || '',
        sections,
        targetDialects: paywall.targetDialects,
      };
    });

    return response;
  }

  async getPlanByPlanId(planId: string): Promise<PlanDetailsResponseDto> {
    if (!planId) {
      throw Errors.PLAN.NOT_FOUND('Plan ID is required');
    }

    return this.planRepository.getPlanByPlanId(planId);
  }

  async getPlansEligibleForPostSubscription(): Promise<
    getPlansForPostSubscriptionResponseDto[]
  > {
    const plans = await this.planRepository.find(
      {
        country: PlanCountryEnum.IN,
        dayCount: DayCountEnum.DEFAULT,
        mandateSetupPayingPrice: { $exists: false },
        os: OS.ANDROID,
        postSubscriptionPlan: { $exists: false },
        status: PlanStatusEnum.ACTIVE,
      },
      ['planId', 'payingPrice', 'totalDays', 'payingPrice'],
    );
    if (!plans || plans.length === 0) {
      throw Errors.PLAN.NOT_FOUND('Plans not found');
    }
    return plans;
  }

  async publishPaywall(publishData: PublishPaywallDto): Promise<{
    paywall: Paywall;
    plan: Plan;
  }> {
    const { paywallId } = publishData;

    this.validatePaywallId(paywallId);
    const paywall = await this.validateAndGetPaywall(paywallId);

    const plan = await this.validateAndGetPlan(paywall.planId);

    await this.validatePublishData(paywallId, plan);

    const { updatedPaywall, updatedPlan } =
      await this.updatePaywallAndPlanStatus(paywallId, plan.planId);

    return {
      paywall: updatedPaywall,
      plan: updatedPlan,
    };
  }

  async publishPlan(planId: string): Promise<{ status: PlanStatusEnum }> {
    const plan = await this.planRepository.findOne({ planId });
    if (!plan) {
      throw Errors.PLAN.NOT_FOUND('Plan not found');
    }
    const updatedPlan =
      await this.planRepository.updatePlanStatusToActive(planId);

    if (!updatedPlan) {
      throw Errors.PLAN.UPDATE_FAILED('Failed to update plan');
    }
    return {
      status: updatedPlan.status,
    };
  }

  async transformImage({
    sourceLink,
    width,
  }: {
    sourceLink: string;
    width?: number;
  }) {
    const { sourceLink: url } =
      await MediaFilePathUtils.generatePaywallImageFilePath(sourceLink);

    return await this.fileManagerService.transformPaywallImage({
      sourceLink: url,
      width: width
        ? width
        : CMS_CONFIG.PAYWALL_IMAGE_CONFIG[PaywallImageResolution.RATIO_21_9]
            .width,
    });
  }

  async updatePlanVisibility(planId: string, visibility: boolean) {
    const updatedPlan = await this.planRepository.updatePlanVisibility(
      planId,
      visibility,
    );

    if (!updatedPlan)
      throw Errors.PLAN.VISIBILITY_UPDATE_FAILED(
        'Failed to update plan visibility',
      );

    return { visibility: updatedPlan.planPartOfABTestGroup.length > 0 };
  }
}
