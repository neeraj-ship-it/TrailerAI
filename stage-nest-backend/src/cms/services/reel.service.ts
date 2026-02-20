import { EntityManager, Reference } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';

import { ObjectId } from '@mikro-orm/mongodb';

import {
  CreateOrUpdateReelRequestDto,
  ReelResponseDto,
} from '../dtos/reels.dto';
import { ContentRepository } from '../repositories/content.repository';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { ReelRepository } from '../repositories/reel.repository';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

import { ContentStatus } from '@app/common/entities/contents.entity';
import { ReelStatusEnum } from '@app/common/entities/reel.entity';
import { Lang } from '@app/common/enums/app.enum';
import { ContentType, ContentTypeV2 } from 'common/enums/common.enums';
import { ReelsService } from 'src/content/services/reels.service';

@Injectable()
export class ReelService {
  constructor(
    private readonly reelRepository: ReelRepository,
    private readonly contentRepository: ContentRepository,
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly em: EntityManager,
    private readonly reelsService: ReelsService,
  ) {}

  private getReelToggledStatus(status: ReelStatusEnum) {
    return status === ReelStatusEnum.PUBLISHED
      ? ReelStatusEnum.DRAFT
      : ReelStatusEnum.PUBLISHED;
  }

  private async validateReelForPublishing(reelId: string) {
    const reel = await this.reelRepository.findOneOrFail({
      _id: new ObjectId(reelId),
    });
    if (!reel.contentSlug) {
      throw new BadRequestException('Reel has no content');
    }
    const content = await this.contentRepository.findOneOrFail({
      slug: reel.contentSlug,
    });
    console.log(content);

    if (content.status !== ContentStatus.ACTIVE) {
      throw new BadRequestException('Content is not live');
    }

    return true;
  }

  async createOrUpdateReel({
    contentSlug,
    description,
    id,
    plotKeywords,
    rawMediaId,
    reelType,
    title,
  }: CreateOrUpdateReelRequestDto): Promise<ReelResponseDto> {
    const content = await this.contentRepository.findOneOrFail({
      slug: contentSlug,
    });
    const rawMedia = rawMediaId
      ? await this.rawMediaRepository.findOneOrFail({
          _id: new ObjectId(rawMediaId),
        })
      : null;
    if (id) {
      const existingReel = await this.reelRepository.findOneOrFail({
        _id: new ObjectId(id),
      });
      existingReel.title = title;
      existingReel.description = description;
      existingReel.reelType = reelType;
      existingReel.rawMedia = rawMedia ? Reference.create(rawMedia) : null;
      existingReel.plotKeywords = plotKeywords;
      await this.reelRepository.save(existingReel);
      return {
        contentSlug: existingReel.contentSlug,
        description: existingReel.description,
        id: existingReel.id,
        plotKeywords: existingReel.plotKeywords,
        previewUrl: existingReel.visionularHls?.sourceLink
          ? MediaFilePathUtils.generateReelMp4PreviewURL({
              fileName: existingReel.visionularHls?.sourceLink,
              reelId: existingReel.id,
            })
          : null,
        rawMedia: {
          id: rawMedia ? rawMedia.id : null,
          status: rawMedia ? rawMedia.status : null,
        },
        reelType: existingReel.reelType,
        status: existingReel.status,
        title: existingReel.title,
      };
    }

    const newReel = this.reelRepository.create({
      contentSlug: content.slug,
      contentType:
        content.contentType === ContentTypeV2.SHOW
          ? ContentType.SHOW
          : ContentType.MOVIE,
      description,
      dialect: content.dialect,
      duration: 0,
      likes: 0,
      plotKeywords,
      rawMedia: rawMedia ? Reference.create(rawMedia) : null,
      reelType,
      shareCount: 0,
      shareLink: '',
      status: ReelStatusEnum.DRAFT,
      statusHistory: [{ status: ReelStatusEnum.DRAFT, timestamp: new Date() }],
      title,
      views: 0,
    });

    const reel = await this.reelRepository.save(newReel);

    const previewUrl = reel.visionularHls?.sourceLink
      ? MediaFilePathUtils.generateReelMp4PreviewURL({
          fileName: reel.visionularHls.sourceLink,
          reelId: reel.id,
        })
      : null;
    return {
      contentSlug: reel.contentSlug,
      description: reel.description,
      id: reel.id,
      plotKeywords: reel.plotKeywords,
      previewUrl,
      rawMedia: {
        id: rawMedia ? rawMedia.id : null,
        status: rawMedia ? rawMedia.status : null,
      },
      reelType: reel.reelType,
      status: reel.status,
      title: reel.title,
    };
  }

  async deleteReel(reelId: string) {
    const reel = await this.reelRepository.findOneOrFail({
      _id: new ObjectId(reelId),
    });
    reel.status = ReelStatusEnum.DELETED;
    return this.reelRepository.save(reel);
  }

  async listAllReelsForContent({
    contentSlug,
  }: {
    contentSlug: string;
  }): Promise<ReelResponseDto[]> {
    const reels = await this.reelRepository.find({
      contentSlug,
      status: {
        $ne: ReelStatusEnum.DELETED,
      },
    });

    return Promise.all(
      reels.map(async (reel) => {
        const rawMedia = await reel.rawMedia?.loadOrFail();
        const previewUrl = reel.visionularHls
          ? MediaFilePathUtils.generateReelMp4PreviewURL({
              fileName: reel.visionularHls.sourceLink,
              reelId: reel.id,
            })
          : null;
        return {
          contentSlug: reel.contentSlug,
          description: reel.description,
          id: reel.id,
          plotKeywords: reel.plotKeywords || {
            [Lang.EN]: [],
            [Lang.HIN]: [],
          },
          previewUrl,
          rawMedia: {
            id: rawMedia ? rawMedia.id : null,
            status: rawMedia ? rawMedia.status : null,
          },
          reelType: reel.reelType,
          status: reel.status,
          title: reel.title,
        };
      }),
    );
  }

  async toggleReelPublishStatus(reelId: string) {
    const reel = await this.reelRepository.findOneOrFail({
      _id: new ObjectId(reelId),
    });

    const futureStatus = this.getReelToggledStatus(reel.status);

    if (futureStatus === ReelStatusEnum.PUBLISHED) {
      await this.validateReelForPublishing(reelId);
    }
    reel.status = futureStatus;
    this.reelsService.addReelToRedis(reelId, reel.dialect, Lang.EN);
    this.reelsService.addReelToRedis(reelId, reel.dialect, Lang.HIN);
    return await this.reelRepository.save(reel);
  }
  async unpublishReelsByContentSlug(contentSlug: string) {
    const reels = await this.reelRepository.find({
      contentSlug,
    });
    if (reels.length === 0) {
      return;
    }
    reels.forEach((reel) => {
      reel.status = ReelStatusEnum.UNPUBLISHED;
    });
    await this.reelRepository.upsertMany(reels);
  }
}
