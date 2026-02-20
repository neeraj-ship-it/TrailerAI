import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  EventArgs,
  EventSubscriber,
  JsonType,
  OneToOne,
  Property,
  Ref,
} from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import {
  LanguageVariantProperty,
  LanguageVariantProperties,
} from '../schema/localizedString.schema';
import { VisionularHls } from './contents.entity';

import { Dialect, Lang } from '../enums/app.enum';
import { MongoBaseEntity } from './mongoBase.entity';
import { RawMedia } from './raw-media.entity';
import { ContentType } from 'common/enums/common.enums';
export enum ReelType {
  BEHIND_THE_SCENES = 'behind_the_scenes',
  BLOOPERS = 'bloopers',
  BREAKPOINT = 'breakpoint',
  CAST_INTERVIEWS = 'cast_interviews',
  CHARACTER_PROMOS = 'character_promos',
  EVENT_CLIPS = 'event_clips',
  INFLUENCER_CONTENT = 'influencer_content',
  INFLUENCER_IP_CORRELATIONS = 'influencer_ip_correlations',
  INFLUENCER_REVIEWS = 'influencer_reviews',
  MUSIC = 'music',
  NOT_DEFINED = 'not_defined',
  SHORT_TEASERS = 'short_teasers',
}

export enum ReelStatusEnum {
  DELETED = 'deleted',
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

export class ReelStatusHistory {
  @Enum(() => ReelStatusEnum)
  status!: ReelStatusEnum;

  @Property()
  timestamp!: Date;
}

@Embeddable()
export class ReelThumbnail {
  @Property({ type: JsonType })
  ratio_9_16!: LanguageVariantProperty;
}

@Entity({ collection: 'reels' })
export class ReelEntity extends MongoBaseEntity {
  @Property()
  contentSlug!: string;

  @Property()
  contentType!: ContentType.SHOW | ContentType.MOVIE;

  @Property({ type: JsonType })
  description!: LanguageVariantProperty;

  @Enum(() => Dialect)
  dialect!: Dialect;

  @Property()
  duration!: number;

  @Property({ default: 0 })
  likes!: number;

  @Property({ type: JsonType })
  plotKeywords: LanguageVariantProperties = {
    [Lang.EN]: [],
    [Lang.HIN]: [],
  };

  @OneToOne(() => RawMedia, { nullable: true })
  rawMedia: Ref<RawMedia> | null = null;

  @Enum(() => ReelType)
  reelType!: ReelType;

  @Property({ default: 0 })
  shareCount!: number;

  @Property()
  shareLink!: string;

  @Enum(() => ReelStatusEnum)
  status!: ReelStatusEnum;

  @Property({ type: JsonType })
  statusHistory!: ReelStatusHistory[];

  @Embedded(() => ReelThumbnail, { nullable: true, object: true })
  thumbnail: ReelThumbnail | null = null;

  @Property({ type: JsonType })
  title!: LanguageVariantProperty;

  @Property({ default: 0 })
  views!: number;

  @Embedded(() => VisionularHls, { nullable: true, object: true })
  visionularHls: VisionularHls | null = null;

  @Embedded(() => VisionularHls, { nullable: true, object: true })
  visionularHlsH265: VisionularHls | null = null;
}

@Injectable()
export class ReelEntityChangeSubscriber implements EventSubscriber<ReelEntity> {
  async beforeUpdate(args: EventArgs<ReelEntity>): Promise<void> {
    const { changeSet, entity } = args;

    if (!changeSet || !changeSet.payload.status) {
      return;
    }

    console.log(
      '✅ ReelEntityChangeSubscriber beforeUpdate triggered!',
      changeSet.payload,
    );

    const newStatus = changeSet?.payload?.status ?? changeSet.entity.status;

    // For Collections, add via the collection method
    entity.statusHistory.unshift({
      status: newStatus,
      timestamp: new Date(),
    });
  }

  getSubscribedEntities(): string[] {
    return [ReelEntity.name];
  }
}
