import { Entity, Property, Embeddable, Embedded } from '@mikro-orm/mongodb';

import { GenreRepository } from '../repositories/genre.repository';
import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';

@Embeddable()
export class HarDetails {
  @Property()
  bannerEn!: string;

  @Property()
  bannerHin!: string;

  @Property()
  en!: string;

  @Property()
  hin!: string;
}

@Entity({ collection: 'genres_v2', repository: () => GenreRepository })
export class GenreEntity extends MongoBaseEntityWithNumberId {
  @Property()
  bannerEn!: string;

  @Property()
  bannerHin!: string;

  @Property()
  cardColor!: string;

  @Property()
  description!: string;

  @Property()
  dialect!: string[];

  @Property()
  enHorizontalImage!: string;

  @Property()
  enImage!: string;

  @Property()
  enVerticalImage!: string;

  @Property()
  gradientColors!: string[];

  @Embedded(() => HarDetails, { object: true })
  har!: HarDetails;

  @Property()
  hindiName!: string;

  @Property()
  hinhorizontalImage!: string;

  @Property()
  hinImage!: string;

  @Property()
  hinVerticalImage!: string;

  @Property()
  image!: string;

  @Property()
  isUsed!: boolean;

  @Property()
  metaDescription!: string;

  @Property()
  metaKeyword!: string;

  @Property()
  metaTitle!: string;

  @Property()
  name!: string;

  @Property()
  slug!: string;

  @Property()
  sortOrder!: number;

  @Property()
  status!: string;
}
