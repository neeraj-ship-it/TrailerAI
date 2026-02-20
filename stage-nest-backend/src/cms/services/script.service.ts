import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

import { QueryOrder } from '@mikro-orm/core';

import { ObjectId } from 'mongodb';

import { VideoAspectRatioEnum } from '../dtos';
import { ContentRepository } from '../repositories/content.repository';
import { EpisodeRepository } from '../repositories/episode.repository';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { ShowRepository } from '../repositories/show.repository';
import { AWSMediaConvertService } from './media-convert.service';
import { ContentFormat, MediaItem } from 'common/entities/contents.entity';
import {
  TaskStatusEnum,
  TranscodingEngineEnum,
  TranscodingTaskTypeEnum,
} from 'common/entities/raw-media.entity';
import { Lang } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';
import { PeripheralMediaType } from 'common/enums/media.enum';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

interface EpisodeRawMediaMap {
  episodeId: number;
  rawMediaId: string;
  slug: string;
  status: TaskStatusEnum;
}

export interface TaskStatusSummary {
  completed: number;
  completedEpisodes: {
    episodeId: number;
    slug: string;
    rawMediaId: string;
    status: TaskStatusEnum;
  }[];
  failed: number;
  incompleteEpisodes: {
    episodeId: number;
    slug: string;
    rawMediaId: string;
    status: TaskStatusEnum;
  }[];
  inProgress: number;
  total: number;
}

@Injectable()
export class ScriptService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly episodeRepository: EpisodeRepository,
    private readonly showRepository: ShowRepository,
    private readonly awsMediaConvertService: AWSMediaConvertService,
    private readonly rawMediaRepository: RawMediaRepository,
  ) {}

  async checkRawMediaTaskStatus(): Promise<TaskStatusSummary> {
    const filePath = join(process.cwd(), 'episode-rawMedia-map.json');

    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const episodeRawMediaMap: EpisodeRawMediaMap[] = JSON.parse(fileContent);

      const summary: TaskStatusSummary = {
        completed: 0,
        completedEpisodes: [],
        failed: 0,
        incompleteEpisodes: [],
        inProgress: 0,
        total: episodeRawMediaMap.length,
      };

      let fileUpdated = false;

      for (const episodeMap of episodeRawMediaMap) {
        // Skip episodes that are already marked as completed
        if (episodeMap.status === TaskStatusEnum.COMPLETED) {
          summary.completed++;
          summary.completedEpisodes.push({
            episodeId: episodeMap.episodeId,
            rawMediaId: episodeMap.rawMediaId,
            slug: episodeMap.slug,
            status: episodeMap.status,
          });
          continue;
        }

        const rawMedia = await this.rawMediaRepository.findOne({
          _id: new ObjectId(episodeMap.rawMediaId),
        });

        if (!rawMedia) {
          summary.incompleteEpisodes.push({
            episodeId: episodeMap.episodeId,
            rawMediaId: episodeMap.rawMediaId,
            slug: episodeMap.slug,
            status: TaskStatusEnum.FAILED,
          });
          summary.failed++;
          continue;
        }

        // Find the latest AWS Media Convert task
        const latestTask = rawMedia.transcodingTask
          .filter(
            (task) =>
              task.transcodingEngine ===
              TranscodingEngineEnum.AWS_MEDIA_CONVERT,
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime(),
          )[0];

        const status = latestTask?.taskStatus || TaskStatusEnum.FAILED;

        const episodeInfo = {
          episodeId: episodeMap.episodeId,
          rawMediaId: episodeMap.rawMediaId,
          slug: episodeMap.slug,
          status,
        };

        switch (status) {
          case TaskStatusEnum.COMPLETED:
            summary.completed++;
            summary.completedEpisodes.push(episodeInfo);
            episodeMap.status = status;
            fileUpdated = true;
            break;
          case TaskStatusEnum.IN_PROGRESS:
            summary.inProgress++;
            summary.incompleteEpisodes.push(episodeInfo);
            break;
          case TaskStatusEnum.FAILED:
          default:
            summary.failed++;
            summary.incompleteEpisodes.push(episodeInfo);
            break;
        }
      }

      // Write updated map back to file if any changes were made
      if (fileUpdated) {
        await fs.writeFile(
          filePath,
          JSON.stringify(episodeRawMediaMap, null, 2),
          'utf8',
        );
      }

      return summary;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new Error(
          'episode-rawMedia-map.json file not found. Please run triggerMediaConvertForEpisode first.',
        );
      }
      throw new Error(
        `Error reading episode-rawMedia-map.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async triggerMediaConvertForEpisode(params: {
    limit?: number;
    slug?: string;
  }) {
    console.log('🚀 Starting media conversion for episodes...');
    const { limit = 200, slug } = params;
    console.log(slug, 'slug');

    // get all microdrama episodes for one displayLanguage
    const episodes = await this.episodeRepository.find(
      {
        displayLanguage: Lang.EN,
        format: ContentFormat.MICRO_DRAMA,
        ...(slug ? { slug } : {}),
        sourceLink: { $not: /.*_migrated\.mp4/ },
        // createdAt: { $lte: new Date('2025-08-19T00:00:00.000Z') },
      },
      { limit, orderBy: { createdAt: QueryOrder.DESC } },
    );

    const totalEpisodes = await this.episodeRepository.count({
      displayLanguage: Lang.EN,
      format: ContentFormat.MICRO_DRAMA,
      ...(slug ? { slug } : {}),
      sourceLink: { $not: /.*_migrated\.mp4/ },
    });

    console.log(`📺 Found ${episodes.length} episodes to process`);

    if (episodes.length > 1 && !!slug) {
      throw new Error('Too many episodes');
    }

    const microdramaEpisodes: {
      episodeId: number;
      slug: string;
      rawMediaId: string;
      status: TaskStatusEnum;
    }[] = [];

    for (const episode of episodes) {
      console.log(
        `🔄 Processing episode: ${episode.slug} (ID: ${episode._id})`,
      );

      const rawMedia = await this.rawMediaRepository.findOne({
        _id: new ObjectId(episode.visionularHls.rawMediaId),
      });

      if (!rawMedia) {
        console.log(
          `⚠️  Raw media not found for episode: ${episode.slug}, skipping... , ${episode.visionularHls.rawMediaId}`,
        );
        continue;
      }

      console.log(
        `📹 Found raw media: ${rawMedia._id} for episode: ${episode.slug}`,
      );

      const { nameWithExtension: sourceFileName, nameWithoutExtension } =
        MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        );

      console.log(`📝 Generated filename: ${sourceFileName}`);

      // Generate custom output filename based on episode slug
      const nameModifier = `migrated`;
      const newSourceFileName = `${nameWithoutExtension}_${nameModifier}.mp4`;

      console.log(`🎯 Custom output filename: ${newSourceFileName}`);

      //get source and output dir
      const { outputDirectory, sourceFilePath } =
        MediaFilePathUtils.generateMp4OutputFilePath({
          contentType: ContentType.EPISODE,
          fileName: sourceFileName,
        });

      console.log(`📁 Source: ${sourceFilePath}`);
      console.log(`📁 Output: ${outputDirectory}`);

      console.log(
        `🎬 Triggering AWS Media Convert job for episode: ${episode.slug}`,
      );
      const awsMediaConvertTask =
        await this.awsMediaConvertService.triggerConversionJob(
          sourceFilePath,
          outputDirectory,
          VideoAspectRatioEnum.Vertical,
          nameModifier,
        );

      const taskId = awsMediaConvertTask.Job?.Id ?? 'NA';
      console.log(
        `✅ AWS Media Convert job triggered successfully. Task ID: ${taskId}`,
      );

      // add task to raw media

      if (typeof rawMedia.transcodingTask === 'undefined') {
        rawMedia.transcodingTask = [];
      }
      if (typeof rawMedia.transcodingTask === 'object') {
        rawMedia.transcodingTask = [
          {
            externalTaskId: taskId,
            taskStatus: TaskStatusEnum.IN_PROGRESS,
            taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
            transcodingEngine: TranscodingEngineEnum.AWS_MEDIA_CONVERT,
          },
        ];
      }

      // check if task is already in the list

      rawMedia.transcodingTask.push({
        externalTaskId: taskId,
        taskStatus: TaskStatusEnum.IN_PROGRESS,
        taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
        transcodingEngine: TranscodingEngineEnum.AWS_MEDIA_CONVERT,
      });

      console.log(`💾 Saving raw media updates for episode: ${episode.slug}`);
      await this.rawMediaRepository.save(rawMedia);

      console.log(`🔍 Finding Hindi episode for: ${episode.slug}`);
      const hinEpisode = await this.episodeRepository.findOneOrFail({
        displayLanguage: Lang.HIN,
        slug: episode.slug,
      });

      // Update sourceLink for both episodes
      episode.sourceLink = newSourceFileName;
      hinEpisode.sourceLink = newSourceFileName;

      console.log(`💾 Saving episode updates for: ${episode.slug}`);
      await Promise.all([
        this.episodeRepository.save(episode),
        this.episodeRepository.save(hinEpisode),
      ]);

      microdramaEpisodes.push({
        episodeId: episode._id,
        rawMediaId: episode.visionularHls.rawMediaId,
        slug: episode.slug,
        status: TaskStatusEnum.IN_PROGRESS,
      });

      console.log(`✅ Successfully processed episode: ${episode.slug}`);
    }

    console.log(`📊 Total episodes processed: ${microdramaEpisodes.length}`);

    const filePath = join(process.cwd(), 'episode-rawMedia-map.json');
    console.log(`💾 Writing episode mapping to: ${filePath}`);
    await fs.writeFile(
      filePath,
      JSON.stringify(microdramaEpisodes, null, 2),
      'utf8',
    );

    console.log(`🎉 Media conversion process completed successfully!`);
    console.log(`📄 Episode mapping saved to: ${filePath}`);

    return {
      message: 'Media conversion process completed successfully!',
      totalEpisodes,
      totalEpisodesProcessed: microdramaEpisodes.length,
    };
  }

  async updateContentMediaTypes() {
    const episodes = await this.episodeRepository.findAll();
    const shows = await this.showRepository.findAll();
    const contents = await this.contentRepository.findAll();

    for (const content of contents) {
      if (!content.mediaList) {
        content.mediaList = content.selectedPeripheral
          ? [Object.assign(new MediaItem(), content.selectedPeripheral)]
          : [new MediaItem()];
      }
      if (content.mediaList.length === 0) {
        content.mediaList = content.selectedPeripheral
          ? [Object.assign(new MediaItem(), content.selectedPeripheral)]
          : [new MediaItem()];
      }
      content.mediaList.forEach((media, index) => {
        if (index === 0) {
          media.mediaType = PeripheralMediaType.TRAILER;
        } else {
          media.mediaType = PeripheralMediaType.CLIP;
        }
      });
      this.contentRepository.save(content);
    }

    for (const show of shows) {
      if (!show.mediaList) {
        show.mediaList = show.selectedPeripheral
          ? [Object.assign(new MediaItem(), show.selectedPeripheral)]
          : [new MediaItem()];
      }
      if (show.mediaList.length === 0) {
        show.mediaList = show.selectedPeripheral
          ? [Object.assign(new MediaItem(), show.selectedPeripheral)]
          : [new MediaItem()];
      }
      show.mediaList.forEach((media, index) => {
        if (index === 0) {
          media.mediaType = PeripheralMediaType.TRAILER;
        } else {
          media.mediaType = PeripheralMediaType.CLIP;
        }
      });
      this.showRepository.save(show);
    }
    for (const episode of episodes) {
      if (!episode.mediaList) {
        episode.mediaList = episode.selectedPeripheral
          ? [Object.assign(new MediaItem(), episode.selectedPeripheral)]
          : [new MediaItem()];
      }
      if (episode.mediaList.length === 0) {
        episode.mediaList = episode.selectedPeripheral
          ? [Object.assign(new MediaItem(), episode.selectedPeripheral)]
          : [new MediaItem()];
      }
      episode.mediaList.forEach((media, index) => {
        if (index === 0) {
          media.mediaType = PeripheralMediaType.TRAILER;
        } else {
          media.mediaType = PeripheralMediaType.CLIP;
        }
      });
      this.episodeRepository.save(episode);
    }
    return {
      message: 'Media types updated successfully',
    };
  }
}
