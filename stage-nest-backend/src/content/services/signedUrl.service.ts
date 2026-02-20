import { Injectable } from '@nestjs/common';

import { VisionularHlsBase } from '../dto/peripheral.dto';
import {
  GetBatchSignedUrlRequestDto,
  GetSignedUrlRequestDto,
  GetSpecialAccessSignedUrlRequestDto,
} from '../dto/signedUrl.request.dto';
import {
  BatchSignedUrlResponseDto,
  EpisodeSignedUrlData,
  IndividualEpisodeResult,
  ShowEpisodesResult,
  SignedUrlResponseDto,
} from '../dto/signedUrl.response.dto';
import { Episode } from '../entities/episodes.entity';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ShowRepository } from '../repositories/show.repository';
import {
  ContentType,
  SubscriptionStatusEnum,
} from '@app/common/enums/common.enums';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { FolderSignedUrlResult, S3Service, type SignedUrl } from '@app/storage';
import { APP_CONFIGS } from 'common/configs/app.config';
import { buildEpisodeUrl } from 'common/utils/media-file.utils';
import { UserSubscriptionService } from 'src/users/services/userSubscription.service';

interface GenerateSignedUrlParams {
  duration?: number;
  episodeId: string;
  isH265: boolean;
  showId: number;
  showSlug: string;
  slug: string;
  visionularHls: VisionularHlsBase;
}

@Injectable()
export class SignedUrlService {
  constructor(
    private readonly episodeRepository: EpisodesRepository,
    private readonly showRepository: ShowRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly s3Service: S3Service,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  private async fetchIndividualEpisode(
    contentId: number,
  ): Promise<IndividualEpisodeResult> {
    const episode = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findById(
        contentId,
        ['_id', 'freeEpisode', 'visionularHls', 'visionularHlsH265', 'slug'],
        { lean: true },
      ),
      Errors.EPISODE.NOT_FOUND(),
    );

    const slug = episode.slug;
    const urlRoot = APP_CONFIGS.AWS.CLOUDFRONT.API_URL;
    const folderPathHLS = `${urlRoot}/videos/individual/${slug}/HLS`;
    const folderPathH265 = `${urlRoot}/videos/individual/${slug}/HLS-H265`;

    return {
      episodes: [episode],
      folderPathH265,
      folderPathHLS,
      slug,
    };
  }

  private async fetchShowEpisodes(
    contentId: number,
    episodeIds: number[],
  ): Promise<ShowEpisodesResult> {
    const show = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.findActiveShowById({ showId: contentId }, ['slug']),
      Errors.SHOW.NOT_FOUND(),
    );

    const showSlug = show.slug;
    const urlRoot = APP_CONFIGS.AWS.CLOUDFRONT.API_URL;
    const folderPathHLS = `${urlRoot}/videos/show/${showSlug}/episodes/HLS`;
    const folderPathH265 = `${urlRoot}/videos/show/${showSlug}/episodes/HLS-H265`;

    const episodes = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findEpisodesByIdsAndShowId(episodeIds, contentId, [
        '_id',
        'visionularHls',
        'visionularHlsH265',
        'showSlug',
        'showId',
        'slug',
        'freeEpisode',
      ]),
      Errors.EPISODE.NOT_FOUND(),
    );

    // Validate episodes belong to the show
    const invalidEpisodes = episodes.filter(
      (episode) => episode.showId !== contentId,
    );
    if (invalidEpisodes.length > 0) {
      throw Errors.EPISODE.INVALID_EPISODE_COUNT(
        `Some episodes do not belong to show: ${contentId}. Invalid episode IDs: ${invalidEpisodes.map((e) => e._id).join(', ')}`,
      );
    }

    return { episodes, folderPathH265, folderPathHLS, slug: showSlug };
  }

  private generateSignedUrl({
    duration = 1200,
    episodeId,
    isH265,
    showId,
    showSlug,
    slug,
    visionularHls,
  }: GenerateSignedUrlParams): SignedUrl {
    if (!(visionularHls && visionularHls.hlsSourcelink)) {
      throw new Error('Visionular HLS source link is missing or invalid');
    }

    const urlRoot = APP_CONFIGS.AWS.CLOUDFRONT.API_URL;

    const urlPrefix = showId
      ? `${urlRoot}/videos/show/${showSlug}/episodes/${
          isH265 ? 'HLS-H265' : 'HLS'
        }/${visionularHls.hlsSourcelink.split('/')[0]}`
      : `${urlRoot}/videos/individual/${slug}/${isH265 ? 'HLS-H265' : 'HLS'}/${
          visionularHls.hlsSourcelink.split('/')[0]
        }`;

    // Use S3Service for CloudFront signing
    const signedObject = this.s3Service.cloudFrontSignedUrl({
      episodeId,
      expirationTimeInSeconds: duration,
      urlPrefix,
    });

    return signedObject;
  }

  private processEpisodeSignedUrls(
    episode: Pick<Episode, '_id' | 'visionularHls' | 'visionularHlsH265'>,
    folderPathHLS: string,
    folderPathH265: string,
    folderSignedHLS: FolderSignedUrlResult,
    folderSignedH265: FolderSignedUrlResult,
  ): EpisodeSignedUrlData | null {
    if (
      !episode.visionularHls?.hlsSourcelink ||
      !episode.visionularHlsH265?.hlsSourcelink
    ) {
      return null;
    }

    const episodeId = episode._id.toString();
    const episodeFolderHLS = episode.visionularHls.hlsSourcelink.split('/')[0];
    const episodeFolderH265 =
      episode.visionularHlsH265.hlsSourcelink.split('/')[0];

    const urlHLS = buildEpisodeUrl(folderPathHLS, episodeFolderHLS, episodeId);
    const urlH265 = buildEpisodeUrl(
      folderPathH265,
      episodeFolderH265,
      episodeId,
    );

    const signedUrlHLS = this.s3Service.signCloudFrontUrlWithPolicy({
      keyPairId: folderSignedHLS.keyPairId,
      policy: folderSignedHLS.policy,
      url: urlHLS,
    });

    const signedUrlH265 = this.s3Service.signCloudFrontUrlWithPolicy({
      keyPairId: folderSignedH265.keyPairId,
      policy: folderSignedH265.policy,
      url: urlH265,
    });

    return {
      signedCookies: folderSignedHLS.signedCookies,
      signedObject: {
        signedCookies: folderSignedHLS.signedCookies,
        signedUrl: signedUrlHLS,
        url: urlHLS,
      },
      signedObjectH265: {
        signedCookies: folderSignedH265.signedCookies,
        signedUrl: signedUrlH265,
        url: urlH265,
      },
    };
  }

  private validateBatchRequest(
    contentType: ContentType.SHOW | ContentType.MOVIE,
    episodeIds?: number[],
  ): void {
    if (
      contentType === ContentType.SHOW &&
      (!episodeIds || episodeIds.length === 0)
    ) {
      throw Errors.SHOW.EPISODE_IDS_REQUIRED(
        'episodeIds array is required when contentType is SHOW',
      );
    }
  }

  async getBatchSignedUrls({
    contentId,
    contentType,
    episodeIds,
    expirationTimeInSeconds = APP_CONFIGS.AWS.CLOUDFRONT
      .BATCH_SIGNED_URL_EXPIRATION_TIME,
    userId,
  }: GetBatchSignedUrlRequestDto): Promise<BatchSignedUrlResponseDto> {
    this.validateBatchRequest(contentType, episodeIds);

    const { episodes, folderPathH265, folderPathHLS, slug } =
      contentType === ContentType.SHOW
        ? await this.fetchShowEpisodes(contentId, episodeIds)
        : await this.fetchIndividualEpisode(contentId);

    // Check if all episodes are free - if any episode is not free, check subscription
    const allEpisodesFree = episodes.every((ep) => ep.freeEpisode === true);

    if (!allEpisodesFree && userId) {
      const { subscription_status } =
        await this.userSubscriptionService.getLatestSubscriptionAndMandateStatus(
          userId,
        );

      const isActiveSubscription =
        subscription_status === SubscriptionStatusEnum.SUBSCRIPTION_ACTIVE ||
        subscription_status === SubscriptionStatusEnum.TRIAL_ACTIVE;

      if (!isActiveSubscription) {
        throw Errors.SUBSCRIPTION.NOT_FOUND(
          'User does not have an active subscription',
        );
      }
    }

    // Generate folder-level signed cookies once and reuse for all episodes
    const [folderSignedHLS, folderSignedH265] = [
      this.s3Service.cloudFrontSignedUrlForFolder({
        expirationTimeInSeconds,
        folderPath: folderPathHLS,
      }),
      this.s3Service.cloudFrontSignedUrlForFolder({
        expirationTimeInSeconds,
        folderPath: folderPathH265,
      }),
    ];

    // Process episodes in parallel with bounded concurrency to avoid event loop starvation
    const CHUNK_SIZE = 50;
    const episodeMap: Record<number, EpisodeSignedUrlData> = {};

    for (let i = 0; i < episodes.length; i += CHUNK_SIZE) {
      const chunk = episodes.slice(i, i + CHUNK_SIZE);

      // Process chunk in parallel
      const results = await Promise.all(
        chunk.map(async (episode) => {
          // Yield to event loop between processing
          await new Promise((resolve) => setImmediate(resolve));

          return {
            episodeId: episode._id,
            signedData: this.processEpisodeSignedUrls(
              episode,
              folderPathHLS,
              folderPathH265,
              folderSignedHLS,
              folderSignedH265,
            ),
          };
        }),
      );

      // Collect results
      for (const { episodeId, signedData } of results) {
        if (signedData) {
          episodeMap[episodeId] = signedData;
        }
      }
    }

    return {
      cdnType: APP_CONFIGS.AWS.CLOUDFRONT.CDN_TYPE,
      episodes: episodeMap,
      expirationTime: folderSignedHLS.epochDuration,
      expiresInSeconds: expirationTimeInSeconds,
      slug,
    };
  }

  async getSignedUrl(
    params: GetSignedUrlRequestDto,
  ): Promise<SignedUrlResponseDto> {
    const { episodeId } = params;
    const cdnType = APP_CONFIGS.AWS.CLOUDFRONT.CDN_TYPE;
    const episode = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findById(
        episodeId,
        [
          'status',
          'visionularHls',
          'visionularHlsH265',
          'slug',
          'showSlug',
          'showId',
          'isPremium',
          'freeEpisode',
          'sourceLink',
        ],
        { lean: true },
      ),
      Errors.EPISODE.NOT_FOUND(),
    );

    const { showId, showSlug, slug, visionularHls, visionularHlsH265 } =
      episode;

    const signedUrl = this.generateSignedUrl({
      episodeId,
      isH265: false,
      showId,
      showSlug,
      slug,
      visionularHls,
    });

    const signedUrlH265 = this.generateSignedUrl({
      episodeId,
      isH265: true,
      showId,
      showSlug,
      slug,
      visionularHls: visionularHlsH265,
    });

    const data: SignedUrlResponseDto = {
      cdnType,
      signedObject: signedUrl,
      signedObjectH265: signedUrlH265,
      signedUrl: signedUrl.url,
      signedUrlH265: signedUrlH265.url,
    };

    return data;
  }

  async getSignedUrlV2(
    query: GetSpecialAccessSignedUrlRequestDto,
  ): Promise<SignedUrlResponseDto> {
    const { episodeId } = query;
    const cdnType = 'aws-cloudfront';
    const episode = await this.episodeRepository.findById(
      episodeId,
      [
        'status',
        'visionularHls',
        'visionularHlsH265',
        'slug',
        'showSlug',
        'showId',
        'isPremium',
        'freeEpisode',
        'sourceLink',
        'duration',
        'episodeOrder',
      ],
      { lean: true },
    );

    if (!episode || episode.episodeOrder !== 1) {
      return {
        cdnType: 'google-media-cdn',
        signedUrl: `${process.env.BUCKET_PATH}/episode/HLS_M/1679983464273_/playlist.m3u8`,
        signedUrlH265: `${process.env.BUCKET_PATH}/episode/HLS-H265_M/1679983464273_/playlist.m3u8`,
      };
    }

    const {
      duration,
      showId,
      showSlug,
      slug,
      visionularHls,
      visionularHlsH265,
    } = episode;
    const signedUrl = this.generateSignedUrl({
      duration,
      episodeId,
      isH265: false,
      showId,
      showSlug,
      slug,
      visionularHls,
    });
    const signedUrlH265 = this.generateSignedUrl({
      duration,
      episodeId,
      isH265: true,
      showId,
      showSlug,
      slug,
      visionularHls: visionularHlsH265,
    });
    const data: SignedUrlResponseDto = {
      cdnType,
      signedObject: signedUrl,
      signedObjectH265: signedUrlH265,
      signedUrl: signedUrl.url,
      signedUrlH265: signedUrlH265.url,
    };
    return data;
  }
}
