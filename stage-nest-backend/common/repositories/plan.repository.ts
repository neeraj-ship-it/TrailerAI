import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { CommonUtils } from '../utils/common.utils';

import { DayCountEnum, Plan } from '../entities/plan.entity';
import { BaseRepository } from './base.repository';
import {
  CreatePlanDto,
  GetAllPlansDto,
  PlanDetailsResponseDto,
  Section,
} from '@app/cms/dtos/payment.dto';
import { Errors } from '@app/error-handler';
import {
  PlanCountryEnum,
  PlanFrequencyEnum,
  PlanStatusEnum,
  PlanTypesEnum,
} from '@app/payment/enums/plan.enum';
import {
  BaseButtonPaywallItem,
  MediaImagePaywallItem,
  MediaVideoPaywallItem,
  PaywallItemTypeEnum,
} from 'common/entities/paywall.entity';
import {
  CurrencyEnum,
  CurrencySymbolEnum,
  Lang,
  OS,
} from 'common/enums/app.enum';

@Injectable()
export class PlanRepository extends BaseRepository<Plan> {
  constructor(@InjectModel(Plan.name) private planModel: Model<Plan>) {
    super(planModel);
  }

  private createPlanPayload(plan: CreatePlanDto): Partial<Plan> {
    const {
      daysInWordsEn,
      daysInWordsHin,
      planTypeHin,
      planTypeMode,
      totalDays,
    } = this.getPlanDaysFromPlanType(plan.planType);

    const planId = CommonUtils.sanitizeString(plan.planId);
    const COMMON_PAYLOAD = {
      actualPrice: plan.actualPrice,
      cardOptionen: [
        'Unlimited Downloads',
        'Make your favourite list',
        'New web - series + films + Comedy shows',
      ],
      cardOptionhin: [
        'अनलिमिटेड डाउनलोड्स',
        'अपनी पसंदीदा लिस्ट बनाये',
        'नए वेब सीरीज + फिल्म + कॉमेडी शो',
      ],
      country: PlanCountryEnum.IN,
      currency: CurrencyEnum.INR,
      currencySymbol: CurrencySymbolEnum.INR,
      dayCount: plan.dayCount,
      discount: 0,
      isRecommended: false,
      isRecurring: true,
      isTrailPlan: plan.planType === PlanTypesEnum.TRIAL,
      itemId: planId,
      mediaAssets: {
        [Lang.EN]: {
          buttonItem: this.getMediaAsset(
            PaywallItemTypeEnum.BUTTON,
            2,
          ) as BaseButtonPaywallItem,
          footerText: '',
          paywallAssets: this.getPaywallAssets(),
          renewalImage: '',
          subscriptionImage: '',
        },
        [Lang.HIN]: {
          buttonItem: this.getMediaAsset(
            PaywallItemTypeEnum.BUTTON,
            2,
          ) as BaseButtonPaywallItem,
          footerText: '',
          paywallAssets: this.getPaywallAssets(),
          renewalImage: '',
          subscriptionImage: '',
        },
      },
      offerTextEn: '50% off on 12 Months pack',
      offerTextHin: '12 महीने क पैक पर 50% की छूट!',
      os: OS.ANDROID,
      payingPrice: plan.payingPrice,
      planDays: daysInWordsEn,
      planId: planId,
      planPartOfABTestGroup: plan.partOfABTestGroup ? ['A', 'B'] : [],
      planTagsEn: plan.planType === PlanTypesEnum.ANNUAL ? 'Popular' : '',
      planTagsHin: plan.planType === PlanTypesEnum.ANNUAL ? 'लोकप्रिय' : '',
      planType: plan.planType,
      planTypeHin: planTypeHin,
      planTypeMode: planTypeMode,
      planTypeText: daysInWordsEn,
      planTypeTextHin: daysInWordsHin,
      priority: 3,
      saved: 0,
      status: PlanStatusEnum.INACTIVE,
      subscriptionDate: new Date('2021-05-14T06:57:23.891+00:00'),
      subscriptionValid: new Date('2021-08-12T06:57:23.891+00:00'),
      totalCount: 24, // from the plan quarterly_79_399_aug2025
      totalDays: totalDays,
    };

    if (plan.dayCount === DayCountEnum.TRIAL) {
      return {
        ...COMMON_PAYLOAD,
        isTrailPlan: true,
      };
    }
    if (plan.dayCount === DayCountEnum.DEFAULT) {
      return {
        ...COMMON_PAYLOAD,
        isTrailPlan: false,
        ...(plan.postSubscriptionPlan
          ? { postSubscriptionPlan: plan.postSubscriptionPlan }
          : {}),
      };
    }

    return COMMON_PAYLOAD;
  }

  private getMediaAsset(type: PaywallItemTypeEnum, order: number): Section {
    switch (type) {
      case PaywallItemTypeEnum.MEDIA_IMAGE:
        return {
          aspectRatio: '',
          backgroundColor: '',
          isEnabled: true,
          order,
          sourceLink: '',
          type: PaywallItemTypeEnum.MEDIA_IMAGE,
        };
      case PaywallItemTypeEnum.MEDIA_VIDEO:
        return {
          aspectRatio: '',
          autoplay: true,
          isEnabled: true,
          loop: true,
          muted: true,
          order,
          showControls: true,
          sourceLink: '',
          type: PaywallItemTypeEnum.MEDIA_VIDEO,
        };
      case PaywallItemTypeEnum.BUTTON:
        return {
          backgroundColor: '#FFFFFF',
          color: '#000000',
          fontSize: 16,
          fontWeight: 400,
          isEnabled: true,
          label: 'Subscribe Now',
          order,
          outlineColor: '#000000',
          textColor: '#000000',
          type: PaywallItemTypeEnum.BUTTON as PaywallItemTypeEnum.BUTTON,
        };
      case PaywallItemTypeEnum.TEXT:
        return {
          isEnabled: true,
          order: 0,
          text: 'Subscribe Now',
          type: PaywallItemTypeEnum.TEXT,
        };
      default:
        throw new Error(`Unsupported media asset type: ${type}`);
    }
  }

  private getPaywallAssets(): [MediaImagePaywallItem, MediaVideoPaywallItem] {
    return [
      this.getMediaAsset(
        PaywallItemTypeEnum.MEDIA_IMAGE,
        0,
      ) as MediaImagePaywallItem,
      this.getMediaAsset(
        PaywallItemTypeEnum.MEDIA_VIDEO,
        1,
      ) as MediaVideoPaywallItem,
    ];
  }

  private updatePlanPayload(plan: CreatePlanDto): Partial<Plan> {
    const {
      daysInWordsEn,
      daysInWordsHin,
      planTypeHin,
      planTypeMode,
      totalDays,
    } = this.getPlanDaysFromPlanType(plan.planType);

    const COMMON_PAYLOAD = {
      actualPrice: plan.actualPrice,
      dayCount: plan.dayCount,
      payingPrice: plan.payingPrice,
      planDays: daysInWordsEn,
      planPartOfABTestGroup: plan.partOfABTestGroup ? ['A', 'B'] : [],
      planType: plan.planType,
      planTypeHin: planTypeHin,
      planTypeMode: planTypeMode,
      planTypeText: daysInWordsEn,
      planTypeTextHin: daysInWordsHin,
      totalDays: totalDays,
    };

    if (plan.dayCount === DayCountEnum.TRIAL) {
      return {
        ...COMMON_PAYLOAD,
        isTrailPlan: true,
      };
    }
    if (plan.dayCount === DayCountEnum.DEFAULT) {
      return {
        ...COMMON_PAYLOAD,
        isTrailPlan: false,
        ...(plan.postSubscriptionPlan
          ? { postSubscriptionPlan: plan.postSubscriptionPlan }
          : {}),
      };
    }

    return COMMON_PAYLOAD;
  }
  async createPlan({ plan }: { plan: CreatePlanDto }): Promise<Plan> {
    const planPayload = this.createPlanPayload(plan);
    return this.planModel.create(planPayload);
  }

  async deletePlanByPlanId(planId: string): Promise<Plan | null> {
    return this.planModel.findOneAndDelete({ planId: planId });
  }

  async getAllPlans({
    page = 1,
    perPage = 20,
  }: {
    page?: number;
    perPage?: number;
  }): Promise<GetAllPlansDto> {
    const skip = (page - 1) * perPage;

    const [plans, total] = await Promise.all([
      this.planModel
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .select(['planId', 'status', 'planPartOfABTestGroup', 'dayCount']),
      this.planModel.countDocuments({}),
    ]);

    return {
      data: plans,
      pagination: {
        nextPageAvailable: page * perPage < total,
        page,
        perPage,
      },
    };
  }

  async getPlanByPlanId(planId: string): Promise<PlanDetailsResponseDto> {
    const plan = await this.planModel.findOne({ planId });

    if (!plan) {
      throw Errors.PLAN.NOT_FOUND('Plan not found');
    }

    const visibility = plan.planPartOfABTestGroup.length !== 0;

    return {
      actualPrice: plan.actualPrice,
      name: plan.planId,
      payingPrice: plan.payingPrice,
      planId: plan.planId,
      planPartOfABTestGroup: plan.planPartOfABTestGroup,
      planType: plan.planType,
      postSubscriptionPlan: plan.postSubscriptionPlan,
      status: plan.status,
      visibility,
    };
  }

  getPlanDaysFromPlanType(planType: PlanTypesEnum): {
    totalDays: number;
    daysInWordsEn: string;
    daysInWordsHin: string;
    planTypeHin: string;
    planTypeMode: string;
  } {
    switch (planType) {
      case PlanTypesEnum.ANNUAL:
        return {
          daysInWordsEn: `12 Months Plan`,
          daysInWordsHin: `12 महीनों के लिए`,
          planTypeHin: `12 महीनों के लिए`,
          planTypeMode: '12 Months Plan',
          totalDays: PlanFrequencyEnum.ANNUAL,
        };
      case PlanTypesEnum.BIWEEKLY:
        return {
          daysInWordsEn: `${PlanFrequencyEnum.BIWEEKLY} days`,
          daysInWordsHin: `${PlanFrequencyEnum.BIWEEKLY} दिनों के लिए`,
          planTypeHin: `${PlanFrequencyEnum.BIWEEKLY} दिनों के लिए`,
          planTypeMode: 'Biweekly',
          totalDays: PlanFrequencyEnum.BIWEEKLY,
        };
      case PlanTypesEnum.HALF_YEARLY:
        return {
          daysInWordsEn: `6 Months Plan`,
          daysInWordsHin: `6 महीनों के लिए`,
          planTypeHin: `6 महीनों के लिए`,
          planTypeMode: 'Half Yearly',
          totalDays: PlanFrequencyEnum.HALF_YEARLY,
        };
      case PlanTypesEnum.MONTHLY:
        return {
          daysInWordsEn: `1 Month Plan`,
          daysInWordsHin: `1 महीने के लिए`,
          planTypeHin: `1 महीने के लिए`,
          planTypeMode: 'Monthly',
          totalDays: PlanFrequencyEnum.MONTHLY,
        };
      case PlanTypesEnum.QUARTERLY:
        return {
          daysInWordsEn: `3 Months Plan`,
          daysInWordsHin: `3 महीनों के लिए`,
          planTypeHin: `3 महीनों के लिए`,
          planTypeMode: 'Quarterly',
          totalDays: PlanFrequencyEnum.QUARTERLY,
        };
      case PlanTypesEnum.TRIAL:
        return {
          daysInWordsEn: `${PlanFrequencyEnum.WEEKLY} days`,
          daysInWordsHin: `${PlanFrequencyEnum.WEEKLY} दिनों के लिए`,
          planTypeHin: `${PlanFrequencyEnum.WEEKLY} दिनों के लिए`,
          planTypeMode: 'Trial',
          totalDays: PlanFrequencyEnum.WEEKLY,
        };
      case PlanTypesEnum.WEEKLY:
        return {
          daysInWordsEn: `${PlanFrequencyEnum.WEEKLY} days`,
          daysInWordsHin: `${PlanFrequencyEnum.WEEKLY} दिनों के लिए`,
          planTypeHin: `${PlanFrequencyEnum.WEEKLY} दिनों के लिए`,
          planTypeMode: 'Weekly',
          totalDays: PlanFrequencyEnum.WEEKLY,
        };
      default:
        throw new Error(`Unsupported plan type: ${planType}`);
    }
  }

  async updatePlan({
    plan,
    planId,
  }: {
    planId: string;
    plan: CreatePlanDto;
  }): Promise<Plan | null> {
    const planPayload = this.updatePlanPayload(plan);
    return this.planModel.findOneAndUpdate({ planId: planId }, planPayload, {
      new: true,
    });
  }

  async updatePlanStatusToActive(planId: string): Promise<Plan | null> {
    return this.planModel.findOneAndUpdate(
      { planId: planId },
      { status: PlanStatusEnum.ACTIVE },
      { new: true },
    );
  }

  async updatePlanVisibility(planId: string, visibility: boolean) {
    return this.planModel.findOneAndUpdate(
      { planId: planId },
      { planPartOfABTestGroup: visibility ? ['A', 'B'] : [] },
      { new: true },
    );
  }

  async updatePlanWithPaywallId({
    mediaAssets,
    paywallId,
    planId,
  }: {
    planId: string;
    paywallId: string;
    mediaAssets?: {
      [Lang.EN]: {
        paywallAssets:
          | [MediaImagePaywallItem, MediaVideoPaywallItem]
          | [MediaVideoPaywallItem, MediaImagePaywallItem];
        buttonItem: BaseButtonPaywallItem;
        footerText: string;
        subscriptionImage: string;
        renewalImage: string;
      };
      [Lang.HIN]: {
        paywallAssets:
          | [MediaImagePaywallItem, MediaVideoPaywallItem]
          | [MediaVideoPaywallItem, MediaImagePaywallItem];
        buttonItem: BaseButtonPaywallItem;
        footerText: string;
        subscriptionImage: string;
        renewalImage: string;
      };
    };
  }): Promise<Plan | null> {
    return this.planModel.findOneAndUpdate(
      { planId: planId },
      { mediaAssets: mediaAssets || [], paywallId: paywallId },
      { new: true },
    );
  }
}
