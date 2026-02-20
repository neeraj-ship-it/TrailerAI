import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  UpdateLikedContentRequestDto,
  UserProfileResponseDto,
} from '../dto/content-profile.dto';
import {
  ContentProfile,
  LikeStatus,
  LikeStatusEnum,
} from '../entities/contentProfile.entity';
import { Errors } from '@app/error-handler';

import { WatchListedContentsResponseDto } from '../dto/watchList.response.dto';
import { ContentProfileRepository } from '../repositories/contentProfile.repository';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ShowRepository } from '../repositories/show.repository';
import { Context } from '@app/auth';
import { ContentType, NcantoPanel } from '@app/common/enums/common.enums';
import { NcantoAssetType } from '@app/common/interfaces/ncantoAsset.interface';
import { CommonUtils } from '@app/common/utils/common.utils';
import { EventService } from '@app/events';
import { Events } from '@app/events/interfaces/events.interface';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { Dialect, Lang } from 'common/enums/app.enum';
import { UserRepository } from 'common/repositories/user.repository';
import { NcantoUtils } from 'common/utils/ncanto.utils';
import { AUTO_TIME_OF_DAY_BIN } from 'src/users/constants/constants';
import {
  NcantoEntityLevel,
  XRoadMediaUserInteractionData,
} from 'src/users/interfaces/ncanto.interfaces';
import { NcantoInteraction } from 'src/users/interfaces/ncanto.interfaces';
import { UserProfileService } from 'src/users/services/userProfile.service';

@Injectable()
export class ContentProfileService {
  private readonly logger = new Logger(ContentProfileService.name);

  constructor(
    private contentProfileRepository: ContentProfileRepository,
    private readonly showRepository: ShowRepository,
    private readonly episodesRepository: EpisodesRepository,
    private readonly eventService: EventService,
    private readonly userRepository: UserRepository,
    private readonly ncantoUtils: NcantoUtils,
    private readonly userProfileService: UserProfileService,
  ) {}

  private async findOrCreateContentProfile(
    profileId: string,
    userId: string,
  ): Promise<ContentProfile> {
    const profileIdObjectId = new Types.ObjectId(profileId);
    const existingContentProfile = await this.contentProfileRepository.findOne({
      _id: profileIdObjectId,
    });

    if (existingContentProfile) {
      return existingContentProfile;
    }

    const newContentProfile = this.contentProfileRepository.create({
      _id: profileIdObjectId,
      likedContent: [],
      userId: userId,
      watchListContent: [],
    });

    await this.contentProfileRepository.save(newContentProfile);
    return newContentProfile;
  }

  private async logNcantoInteraction(
    context: Context,
    contentSlug: string,
    contentType: ContentType,
    interactionType: NcantoInteraction,
    sourceWidget?: string,
  ) {
    const assetType =
      contentType === ContentType.SHOW
        ? NcantoAssetType.SHOW
        : NcantoAssetType.MOVIE;
    const userId = context.user.id;
    // const profileId = context?.user?.profileId || context.user.id; //our default proifleId is the userId itself
    // const profile = userId === profileId ? `${userId}_default` : profileId;
    const isSubscriber = await this.ncantoUtils.checkSubscription(userId);
    if (!isSubscriber) return;

    const blacklistEligibleContents = [
      ContentType.MOVIE,
      ContentType.SHOW,
      ContentType.SEASON,
      ContentType.EPISODE,
    ];

    const createLikeDislikeEventObject: XRoadMediaUserInteractionData = {
      assetId: `${contentSlug}_${assetType}`,
      contextId: sourceWidget,
      interaction: interactionType,
      panelId: NcantoPanel.StageHome,
      profile: `${userId}_default`,
      ratingEquivalent: 0.5,
      setting: {
        autoTimeOfDayBin: AUTO_TIME_OF_DAY_BIN,
        device: context.meta.os,
      },
      subscriber: userId,
      timestamp: CommonUtils.formatTimestampToIndianTimeZone(
        new Date().toISOString(),
      ),
      ...(blacklistEligibleContents.includes(contentType)
        ? this.ncantoUtils.checkBlacklistContent(
            interactionType,
            contentType === ContentType.MOVIE
              ? NcantoEntityLevel.MOVIE
              : NcantoEntityLevel.SERIES,
          )
        : {}),
    };

    this.ncantoUtils.logInteraction(
      [createLikeDislikeEventObject],
      1,
      interactionType,
      new Map<string, number>(), // no content filtering here
    );
  }

  async getContentLikeStatus(
    profileId: string,
    userId: string,
    slug: string,
  ): Promise<{ status: LikeStatusEnum | null }> {
    const contentProfile = await this.findOrCreateContentProfile(
      profileId,
      userId,
    );
    const likedContent = contentProfile.likedContent.find(
      (content) => content.slug === slug,
    );

    return {
      status: likedContent?.status || null,
    };
  }

  async getUserContentProfile(
    userId: string,
    profileId: string,
  ): Promise<UserProfileResponseDto> {
    const contentProfile = await this.findOrCreateContentProfile(
      profileId,
      userId,
    );
    return { likedContent: contentProfile.likedContent };
  }

  async getWatchListedContents(
    lang: Lang,
    dialect: Dialect,
    userId: string,
  ): Promise<WatchListedContentsResponseDto> {
    const userData = await this.userRepository.findOne({
      _id: new Types.ObjectId(userId),
    });
    const watchListContent = userData?.watchListItems || [];
    const contents =
      watchListContent?.map(async (item) => {
        if (item.contentType === ContentType.SHOW) {
          const show = await this.showRepository.findOne(
            {
              displayLanguage: lang,
              language: dialect,
              slug: item.contentSlug,
              status: { $in: [ShowStatus.ACTIVE, ShowStatus.PREVIEW_PUBLISH] },
            },
            ['slug', '_id', 'title', 'thumbnail', 'releaseDate'],
            {
              cache: { enabled: true },
              lean: true,
            },
          );
          if (!show) return null;
          return {
            _id: show._id,
            contentType: ContentType.SHOW,
            releaseDate: show.releaseDate?.toString() || '',
            slug: show.slug,
            thumbnail: show.thumbnail,
            title: show.title,
          };
        } else {
          const episode = await this.episodesRepository.findOne(
            {
              displayLanguage: lang,
              language: dialect,
              slug: item.contentSlug,
              status: { $in: [ShowStatus.ACTIVE, ShowStatus.PREVIEW_PUBLISH] },
              type: ContentType.MOVIE,
            },
            ['slug', '_id', 'title', 'thumbnail', 'releaseDate'],
            {
              cache: { enabled: true },
              lean: true,
            },
          );
          if (!episode) return null;
          return {
            _id: episode._id,
            contentType: ContentType.MOVIE,
            releaseDate: episode.releaseDate?.toString() || '',
            slug: episode.slug,
            thumbnail: episode.thumbnail,
            title: episode.title,
          };
        }
      }) || [];
    const filteredContents = (await Promise.all(contents)).filter(
      (content): content is NonNullable<typeof content> => content !== null,
    );
    return { data: filteredContents.reverse(), responseMessage: 'Success' };
  }

  async removeLikedContent(
    context: Context,
    body: UpdateLikedContentRequestDto,
  ): Promise<UserProfileResponseDto> {
    const { user } = context;
    const profileId = user?.profileId || user.id;

    const profileIdObjectId = new Types.ObjectId(profileId);

    await this.userProfileService.getProfileById(profileId, user.id);
    const existingContentProfile = await this.contentProfileRepository.findOne({
      _id: profileIdObjectId,
    });

    if (!existingContentProfile) {
      throw new BadRequestException(
        `Content not found with slug: ${body.slug}`,
      );
    }

    const initialLength = existingContentProfile.likedContent.length;

    existingContentProfile.likedContent =
      existingContentProfile.likedContent.filter(
        (content) => content.slug !== body.slug,
      );

    if (existingContentProfile.likedContent.length !== initialLength) {
      await this.contentProfileRepository.save(existingContentProfile);
    }

    const contentProfile = await this.contentProfileRepository.findOne({
      _id: profileIdObjectId,
    });

    return { likedContent: contentProfile?.likedContent || [] };
  }

  async resetCohortUserPreviewContentLikes(
    userIds: string[],
    contentType: ContentType,
    dialect: Dialect,
    slug: string,
  ): Promise<boolean> {
    const userIdsObjectIds = userIds.map((id) => new Types.ObjectId(id));

    const contentProfiles = await this.contentProfileRepository
      .getEntityManager()
      .fork()
      .find(ContentProfile, { _id: { $in: userIdsObjectIds } });

    const promises: Promise<void>[] = [];

    contentProfiles.forEach((contentProfile) => {
      const likeContentLength = contentProfile.likedContent.length;
      contentProfile.likedContent = contentProfile.likedContent.filter(
        (content) =>
          !(
            content.slug === slug &&
            content.contentType === contentType &&
            content.dialect === dialect
          ),
      );
      if (likeContentLength !== contentProfile.likedContent.length) {
        promises.push(
          this.contentProfileRepository
            .getEntityManager()
            .fork()
            .persistAndFlush(contentProfile),
        );
      }
    });

    await Promise.all(promises);

    return true;
  }

  async updateLikedContent(
    context: Context,
    body: UpdateLikedContentRequestDto,
  ): Promise<{ updatedStatus: LikeStatusEnum }> {
    const { meta, user } = context;
    const profileId = user?.profileId || user.id;
    await this.userProfileService.getProfileById(profileId, user.id);
    const contentProfile = await this.findOrCreateContentProfile(
      profileId,
      user.id,
    );
    let content = null;
    if (body.contentType === ContentType.SHOW) {
      content = await this.showRepository.findOne(
        { slug: body.slug },
        ['slug'],
        {
          cache: { enabled: true },
          lean: true,
        },
      );
    } else {
      content = await this.episodesRepository.findOne(
        { slug: body.slug },
        ['slug'],
        {
          cache: { enabled: true },
          lean: true,
        },
      );
    }

    if (content == null) {
      throw Errors.CONTENT_PROFILE.NOT_FOUND('Content not found');
    }

    const likeContent: LikeStatus = {
      contentType: body.contentType,
      dialect: meta.dialect,
      slug: content.slug,
      status: body.status,
    };

    const existingLikeIndex = contentProfile.likedContent.findIndex(
      (content) => content.slug === body.slug,
    );

    if (existingLikeIndex !== -1) {
      contentProfile.likedContent[existingLikeIndex] = likeContent;
    } else {
      contentProfile.likedContent.push(likeContent);
    }
    await this.contentProfileRepository.save(contentProfile);

    // Log Ncanto interaction based on status
    let interactionType: NcantoInteraction;
    switch (body.status) {
      case LikeStatusEnum.LIKE:
        interactionType = NcantoInteraction.LIKE;
        break;
      case LikeStatusEnum.DISLIKE:
        interactionType = NcantoInteraction.DISLIKE;
        break;
      case LikeStatusEnum.SUPERLIKE:
        interactionType = NcantoInteraction.SUPERLIKE;
        break;
      default:
        throw Errors.CONTENT_PROFILE.INVALID_STATUS(
          `Invalid like status: ${body.status}`,
        );
    }

    this.logNcantoInteraction(
      context,
      content.slug,
      body.contentType,
      interactionType,
      body.sourceWidget,
    );

    // Track event based on status
    switch (body.status) {
      case LikeStatusEnum.LIKE:
        this.eventService.trackEvent({
          app_client_id: context.meta.appId,
          key: Events.CONTENT_LIKED,
          os: context.meta.os,
          payload: {
            content_slug: body.slug,
            content_type: body.contentType,
            source_widget: body.sourceWidget,
          },
          user_id: context.user.id,
        });
        break;
      case LikeStatusEnum.DISLIKE:
        this.eventService.trackEvent({
          app_client_id: context.meta.appId,
          key: Events.CONTENT_DISLIKED,
          os: context.meta.os,
          payload: {
            content_slug: body.slug,
            content_type: body.contentType,
            source_widget: body.sourceWidget,
          },
          user_id: context.user.id,
        });
        break;
      case LikeStatusEnum.SUPERLIKE:
        this.eventService.trackEvent({
          app_client_id: context.meta.appId,
          key: Events.CONTENT_SUPERLIKED,
          os: context.meta.os,
          payload: {
            content_slug: body.slug,
            content_type: body.contentType,
            source_widget: body.sourceWidget,
          },
          user_id: context.user.id,
        });
        break;
      default:
        throw Errors.CONTENT_PROFILE.INVALID_STATUS(
          `Invalid like status: ${body.status}`,
        );
    }

    return { updatedStatus: body.status };
  }
}
