import {
  Embeddable,
  Embedded,
  Entity,
  EntityRepositoryType,
  Enum,
  Property,
} from '@mikro-orm/mongodb';

import { CurrencyEnum, OS, Platform } from '../enums/app.enum';
import { PlanV2Repository } from '../repositories/planV2.repository';
import { LanguageVariantProperty } from '../schema/localizedString.schema';
import { MongoBaseEntity } from './mongoBase.entity';
import {
  PlanCountryEnum,
  PlanFrequencyEnum,
  PlanStatusEnum,
  PlanTypesEnum,
} from '@app/payment/enums/plan.enum';

@Embeddable()
export class PlanLocalizedDisplayConfig {
  @Property()
  features!: LanguageVariantProperty[];

  @Property()
  offerText!: LanguageVariantProperty;

  @Property()
  type!: LanguageVariantProperty;
}

@Embeddable()
export class Pricing {
  @Property()
  displayAmount!: number; // Only to display user, not to calculate

  @Property()
  netAmount!: number;

  @Property()
  trialAmount!: number;
}

@Embeddable()
export class Eligibility {
  @Property({ default: [] })
  os!: OS[];

  @Property({ default: [] })
  platform!: Platform[];
}

@Embeddable()
export class PlanValidity {
  @Enum(() => PlanFrequencyEnum)
  frequency!: PlanFrequencyEnum;

  @Enum(() => PlanTypesEnum)
  planType!: PlanTypesEnum;

  @Property()
  trialDays!: number;
}

@Embeddable()
export class InAppPurchase {
  @Property()
  introductoryOfferProductId!: string;

  @Property()
  productId!: string;

  @Property()
  promotionalOfferId!: string; // part of introductory offer product
}

@Entity({ repository: () => PlanV2Repository })
export class PlanV2 extends MongoBaseEntity {
  @Embedded(() => InAppPurchase, { nullable: true })
  appleInAppPurchase!: InAppPurchase | null;

  @Enum(() => PlanCountryEnum)
  country!: PlanCountryEnum;

  @Enum(() => CurrencyEnum)
  currency!: CurrencyEnum;

  @Property()
  derivedFrom!: string;

  @Embedded(() => Eligibility)
  eligibility!: Eligibility;

  [EntityRepositoryType]?: PlanV2Repository;

  @Embedded({ entity: () => PlanLocalizedDisplayConfig, object: true })
  localizedDisplayConfig!: PlanLocalizedDisplayConfig;

  @Property()
  name!: string;

  @Embedded(() => Pricing)
  pricing!: Pricing;

  @Enum(() => PlanStatusEnum)
  status!: PlanStatusEnum;

  @Property()
  trialPlanId!: string;

  @Embedded(() => PlanValidity)
  validity!: PlanValidity;
}
