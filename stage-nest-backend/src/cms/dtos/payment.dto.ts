import { PlanStatusEnum, PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { PaywallItemTypeEnum } from 'common/entities/paywall.entity';
import { DayCountEnum } from 'common/entities/plan.entity';
import { Dialect, Lang } from 'common/enums/app.enum';
import { PaginatedQueryResponse } from 'common/repositories/base.repository';

export interface CreatePlanDto {
  actualPrice: number;
  dayCount: DayCountEnum;
  partOfABTestGroup: boolean;
  payingPrice: number;
  planId: string;
  planType: PlanTypesEnum;
  postSubscriptionPlan?: string;
}

export interface UpdatePlanDto {
  actualPrice: number;
  dayCount: DayCountEnum;
  mandateSetupPayingPrice: number;
  mediaAssets: {
    subscriptionImage: string;
    paywallAssets: (MediaImageDto | MediaVideoDto)[];
    buttonItem: {
      text: string;
      textColor: string;
      bgColor: string;
    };
    footerText: string;
  };
  partOfABTestGroup: boolean;
  payingPrice: number;
  planType: PlanTypesEnum;
  postSubscriptionPlan?: string;
}

export interface ButtonDto {
  backgroundColor: string;
  color: string;
  fontSize: number;
  fontWeight: number;
  isEnabled: boolean;
  label: string;
  order: number;
  outlineColor: string;
  textColor: string;
  type: PaywallItemTypeEnum.BUTTON;
}

export interface MediaVideoDto {
  aspectRatio: string;
  autoplay: boolean;
  isEnabled: boolean;
  loop: boolean;
  muted: boolean;
  order: number;
  showControls: boolean;
  sourceLink: string;
  type: PaywallItemTypeEnum.MEDIA_VIDEO;
}

export interface MediaImageDto {
  aspectRatio: string;
  backgroundColor: string;
  isEnabled: boolean;
  order: number;
  sourceLink: string;
  type: PaywallItemTypeEnum.MEDIA_IMAGE;
}

export interface TextDto {
  isEnabled: boolean;
  order: number;
  text: string;
  type: PaywallItemTypeEnum.TEXT;
}

export type Section = ButtonDto | MediaImageDto | MediaVideoDto | TextDto;

interface PaywallLanguageData {
  name: string;
  peripheralImageUrl?: string;
  renewalImage?: string;
  sections: Section[];
}

export interface CreatePaywallDto extends Record<Lang, PaywallLanguageData> {
  planId: string;
  targetDialects: Dialect[];
}

interface UpdatePaywallLanguageData {
  name?: string;
  peripheralImageUrl?: string;
  renewalImage?: string;
  sections?: Section[];
}

export interface UpdatePaywallDto
  extends Record<Lang, UpdatePaywallLanguageData> {
  targetDialects?: Dialect[];
}

export interface TransformImageDto {
  sourceLink: string;
  width?: number;
}

export interface PaywallListResponseDto {
  _id: string;
  createdAt: Date;
  createdBy: string;
  name: string;
  status: string;
  visibility: boolean;
}

export interface PlanDetailsResponseDto {
  actualPrice: number;
  name: string;
  payingPrice: number;
  planId: string;
  planPartOfABTestGroup: string[];
  planType: string;
  postSubscriptionPlan?: string;
  status: string;
  visibility: boolean;
}

interface PaywallDetailsLanguageData {
  name: string;
  peripheralImageUrl: string;
  renewalImage: string;
  sections: Section[];
  targetDialects: Dialect[];
}

export interface PaywallDetailsResponseDto
  extends Record<Lang, PaywallDetailsLanguageData> {
  _id: string;
  planId: string;
}

export interface PublishPaywallDto {
  paywallId: string;
}

export interface CreateImageUrlDto {
  fileExtension: string;
  mimeType: string;
  paywallId: string;
}

export interface getPlansForPostSubscriptionResponseDto {
  payingPrice: number;
  planId: string;
  totalDays: number;
}

export type GetAllPlansDto = PaginatedQueryResponse<plan>;

interface plan {
  dayCount: DayCountEnum;
  planId: string;
  planPartOfABTestGroup: string[];
  status: PlanStatusEnum;
}
