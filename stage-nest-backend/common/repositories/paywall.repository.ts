import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import {
  BaseButtonPaywallItem,
  BaseTextPaywallItem,
  MediaImagePaywallItem,
  MediaVideoPaywallItem,
  Paywall,
  PaywallItemTypeEnum,
  PaywallStatusEnum,
} from '../entities/paywall.entity';
import { Plan } from '../entities/plan.entity';
import { BaseRepository, PaginatedQueryResponse } from './base.repository';
import {
  CreatePaywallDto,
  PaywallListResponseDto,
  Section,
  UpdatePaywallDto,
} from '@app/cms/dtos/payment.dto';
import { Lang } from 'common/enums/app.enum';
import { CommonUtils } from 'common/utils/common.utils';

@Injectable()
export class PaywallRepository extends BaseRepository<Paywall> {
  constructor(
    @InjectModel(Paywall.name) private paywallModel: Model<Paywall>,
    @InjectModel(Plan.name) private planModel: Model<Plan>,
  ) {
    super(paywallModel);
  }

  private mapSectionsToPaywallItems(sections: Section[]): {
    buttonPaywallItems: BaseButtonPaywallItem[];
    mediaImagePaywallItems: MediaImagePaywallItem[];
    mediaVideoPaywallItems: MediaVideoPaywallItem[];
    textPaywallItems: BaseTextPaywallItem[];
  } {
    const buttonPaywallItems: BaseButtonPaywallItem[] = [];
    const mediaImagePaywallItems: MediaImagePaywallItem[] = [];
    const mediaVideoPaywallItems: MediaVideoPaywallItem[] = [];
    const textPaywallItems: BaseTextPaywallItem[] = [];

    sections.forEach((item) => {
      switch (item.type) {
        case PaywallItemTypeEnum.BUTTON:
          buttonPaywallItems.push(item);
          break;
        case PaywallItemTypeEnum.MEDIA_IMAGE:
          mediaImagePaywallItems.push(item);
          break;
        case PaywallItemTypeEnum.MEDIA_VIDEO:
          mediaVideoPaywallItems.push(item);
          break;
        case PaywallItemTypeEnum.TEXT:
          textPaywallItems.push(item);
          break;
      }
    });

    return {
      buttonPaywallItems,
      mediaImagePaywallItems,
      mediaVideoPaywallItems,
      textPaywallItems,
    };
  }

  async createPaywall({
    paywall,
  }: {
    paywall: CreatePaywallDto;
  }): Promise<Paywall[]> {
    const paywallId = CommonUtils.sanitizeString(paywall[Lang.EN].name);
    const paywallPayloads: {
      buttonPaywallItems: BaseButtonPaywallItem[];
      lang: Lang;
      mediaImagePaywallItems: MediaImagePaywallItem[];
      mediaVideoPaywallItems: MediaVideoPaywallItem[];
      name: string;
      paywallId: string;
      peripheralImageUrl: string;
      planId: string;
      renewalImage: string;
      targetDialects: string[];
      textPaywallItems: BaseTextPaywallItem[];
    }[] = [];

    Object.values(Lang).forEach((lang) => {
      const {
        buttonPaywallItems,
        mediaImagePaywallItems,
        mediaVideoPaywallItems,
        textPaywallItems,
      } = this.mapSectionsToPaywallItems(paywall[lang].sections);

      const paywallPayload = {
        buttonPaywallItems,
        lang,
        mediaImagePaywallItems,
        mediaVideoPaywallItems,
        name: paywall[lang].name,
        paywallId,
        peripheralImageUrl: paywall[lang].peripheralImageUrl ?? '',
        planId: paywall.planId,
        renewalImage: paywall[lang].renewalImage ?? '',
        targetDialects: paywall.targetDialects,
        textPaywallItems,
      };

      paywallPayloads.push(paywallPayload);
    });

    const upsertPromises = paywallPayloads.map((payload) =>
      this.paywallModel.create(payload),
    );

    return Promise.all(upsertPromises);
  }

  async deletePaywall(paywallId: string): Promise<Paywall | null> {
    return this.paywallModel.findByIdAndDelete(paywallId);
  }

  async getAllPaywalls({
    page = 1,
    perPage = 20,
  }: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedQueryResponse<PaywallListResponseDto>> {
    const result = await this.findPaginated({
      filter: {
        lang: Lang.EN,
      },
      options: {
        pagination: { page, perPage },
        sort: { createdAt: -1 },
      },
      projections: ['name', 'createdAt', 'planId', 'paywallId', 'status'],
    });

    const planIds = result.data.map((paywall) => paywall.planId.toString());

    const plans = await this.planModel.find(
      { planId: { $in: planIds } },
      { planId: 1, planPartOfABTestGroup: 1 },
    );

    const planMap = new Map(
      plans.map((plan) => [plan.planId, plan.planPartOfABTestGroup]),
    );

    const transformedData: PaywallListResponseDto[] = result.data.map(
      (paywall) => {
        const planPartOfABTestGroup =
          planMap.get(paywall.planId.toString()) || [];
        const visibility = planPartOfABTestGroup.length !== 0;

        return {
          _id: paywall.paywallId,
          createdAt: paywall.createdAt,
          createdBy: 'user',
          name: paywall.name,
          status: paywall.status,
          visibility,
        };
      },
    );

    return {
      data: transformedData,
      pagination: result.pagination,
    };
  }

  async getPaywallDetails(paywallId: string, lang: Lang): Promise<Paywall> {
    const paywall = await this.paywallModel.findOne({ lang, paywallId });
    if (!paywall) {
      throw new BadRequestException('Paywall not found');
    }
    return paywall;
  }

  async updatePaywall({
    paywall,
    paywallId,
  }: {
    paywallId: string;
    paywall: UpdatePaywallDto;
  }): Promise<Paywall[]> {
    const updatePromises: Promise<Paywall | null>[] = [];

    Object.values(Lang).forEach((lang) => {
      const {
        buttonPaywallItems,
        mediaImagePaywallItems,
        mediaVideoPaywallItems,
      } = this.mapSectionsToPaywallItems(paywall[lang].sections || []);

      const updatePayload = {
        buttonPaywallItems,
        mediaImagePaywallItems,
        mediaVideoPaywallItems,
        name: paywall[lang].name,
        peripheralImageUrl: paywall[lang].peripheralImageUrl,
        renewalImage: paywall[lang].renewalImage,
        targetDialects: paywall.targetDialects,
      };

      updatePromises.push(
        this.paywallModel.findOneAndUpdate({ lang, paywallId }, updatePayload, {
          new: true,
        }),
      );
    });

    const updatedPaywalls = await Promise.all(updatePromises);

    if (updatedPaywalls.some((paywall) => !paywall)) {
      throw new BadRequestException('Paywall not found');
    }

    return updatedPaywalls as Paywall[];
  }

  async updatePaywallStatusToActive(
    paywallId: string,
  ): Promise<Paywall | null> {
    // Update both English and Hindi paywalls
    const [enPaywall] = await Promise.all([
      this.paywallModel.findOneAndUpdate(
        { lang: Lang.EN, paywallId },
        { status: PaywallStatusEnum.ACTIVE },
        { new: true },
      ),
      this.paywallModel.findOneAndUpdate(
        { lang: Lang.HIN, paywallId },
        { status: PaywallStatusEnum.ACTIVE },
        { new: true },
      ),
    ]);

    return enPaywall;
  }
}
