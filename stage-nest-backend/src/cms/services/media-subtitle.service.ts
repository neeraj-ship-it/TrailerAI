/**
 * Media Subtitle Service
 *
 * This service handles video subtitle generation with the following workflow:
 * 1. AWS Transcribe generates Hindi SRT files from audio/video
 * 2. OpenAI translates Hindi SRT content to English
 * 3. S3 stores and manages both Hindi and English subtitle files
 *
 * Key features:
 * - Batch translation for efficiency and cost optimization
 * - Fallback handling for translation failures
 * - Comprehensive logging and error handling
 * - Support for multiple Hindi dialects (Haryanvi, Rajasthani, Bhojpuri)
 */

import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  LanguageCode,
  MediaFormat,
  SubtitleFormat,
  TranscriptionJobStatus,
} from '@aws-sdk/client-transcribe';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { OpenAI } from 'openai';

import { AwsTranscribeJobStateChangePayloadDto } from '../dtos/aws-webhook.dto';
import { SubtitleResponseDTO } from '../dtos/content.dto';
import { EpisodeRepository } from '../repositories/episode.repository';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { ErrorHandlerService } from '@app/error-handler';
import { S3Service } from '@app/storage';
import { Episode } from 'common/entities/episode.entity';
import {
  GenerationMethod,
  SubtitleStatus,
} from 'common/entities/show-v2.entity';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

import { PROMPT_CONSTANTS } from 'common/constants/prompt.constants';

interface VideoTranscriptionConfig {
  enableSpeakerLabels?: boolean;
  jobName: string;
  maxSpeakerLabels?: number;
  outputBucketName: string;
  outputKey: string; // Custom path and filename
  videoFileUri: string;
}

interface SubtitleGenerationResult {
  englishJobName?: string;
  englishSubtitleUri?: string;
  englishTranscriptUri?: string;
  hindiJobName: string;
  hindiSubtitleUri?: string;
  hindiTranscriptUri?: string;
}

@Injectable()
export class MediaSubtitleService {
  private readonly logger = new Logger(MediaSubtitleService.name);
  private readonly openaiClient: OpenAI;
  private readonly transcribeClient: TranscribeClient;

  constructor(
    private readonly episodeRepository: EpisodeRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly s3Service: S3Service,
  ) {
    const awsConfig = {
      credentials: {
        accessKeyId: APP_CONFIGS.AWS.ACCESS_KEY_ID,
        secretAccessKey: APP_CONFIGS.AWS.SECRET_ACCESS_KEY,
      },
      region: APP_CONFIGS.AWS.MEDIA_CONVERT.REGION,
    };

    this.transcribeClient = new TranscribeClient(awsConfig);

    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: APP_CONFIGS.OPENAI.API_KEY,
    });

    // // Test function for local development
    // this.testLocalTranscriptionWithVideo(
    //   'https://stagemediavideo.s3.ap-south-1.amazonaws.com/episode/main-video/240/1F9YqC-ll10tsjd4JBhzHJu64wGBQMPPK.mp4',
    // );
  }

  private _updateEpisodeSubtitleMetadata(
    episode: Episode,
    updates: {
      hinStatus?: SubtitleStatus;
      enStatus?: SubtitleStatus;
      hinFileName?: string;
      enFileName?: string;
    },
  ) {
    const modifiedBy = 'aws-transcribe';
    const lastModified = new Date();

    // Ensure subtitle object exists
    if (!episode.subtitle) {
      this.logger.warn(
        `Episode ${episode.slug} is missing the subtitle object during an update. Initializing.`,
      );
      episode.subtitle = {
        en: '',
        enMetadata: {
          lastModified: new Date(),
          method: GenerationMethod.ASR,
          status: SubtitleStatus.QUEUED,
        },
        hin: '',
        hinMetadata: {
          lastModified: new Date(),
          method: GenerationMethod.ASR,
          status: SubtitleStatus.QUEUED,
        },
      };
    }

    if (updates.hinStatus && episode.subtitle.hinMetadata) {
      episode.subtitle.hinMetadata = {
        ...episode.subtitle.hinMetadata,
        lastModified,
        method: episode.subtitle.hinMetadata.method,
        modifiedBy,
        status: updates.hinStatus,
      };
    }

    if (updates.enStatus && episode.subtitle.enMetadata) {
      episode.subtitle.enMetadata = {
        ...episode.subtitle.enMetadata,
        lastModified,
        method: episode.subtitle.enMetadata.method,
        modifiedBy,
        status: updates.enStatus,
      };
    }

    if (updates.hinFileName) {
      episode.subtitle.hin = updates.hinFileName;
    }

    if (updates.enFileName) {
      episode.subtitle.en = updates.enFileName;
    }
  }

  /**
   * Download any file content from S3
   */
  private async downloadFileFromS3(s3Uri: string): Promise<string> {
    try {
      const { bucket, key } = this.s3Service.parseS3Url(s3Uri);
      this.logger.debug(`🔍 Parsed S3 URL - Bucket: ${bucket}, Key: ${key}`);
      return this.s3Service.downloadFileContentAsString({ bucket, key });
    } catch (error) {
      this.logger.error(`Failed to download file from S3: ${s3Uri}`, error);
      throw error;
    }
  }

  private async generateEnglishSRTContent(
    hindiSrtFileUri: string,
  ): Promise<string> {
    try {
      this.logger.log(`📥 Downloading Hindi SRT file: ${hindiSrtFileUri}`);

      // Download the Hindi SRT file from S3
      const hindiSRTContent = await this.downloadFileFromS3(hindiSrtFileUri);

      this.logger.log('🌐 Translating Hindi SRT to English using OpenAI...');

      // Translate the entire SRT file to English
      const englishSRTContent =
        await this.translateHindiSRTToEnglish(hindiSRTContent);

      this.logger.log('✅ English SRT translation completed');

      return englishSRTContent;
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate English SRT from Hindi SRT: ${hindiSrtFileUri}`,
        error,
      );
      throw error;
    }
  }

  private async generateEnglishSubtitlesAsync(
    jobName: string,
    slug: string,
  ): Promise<void> {
    // Fire-and-forget
    (async () => {
      try {
        this.logger.log(
          `Starting English subtitle generation for job: ${jobName}`,
        );

        const englishSubtitleUri = await this.generateEnglishSubtitlesFromHindi(
          {
            hindiJobName: jobName,
            slug: slug,
          },
        );

        this.logger.log(
          `English subtitle generation completed for job: ${jobName}`,
        );

        console.log('Updating values in DB', { englishSubtitleUri });

        await this.updateEnglishSubtitleDetails({
          fileName: englishSubtitleUri.fileName,
          jobId: jobName,
          status: SubtitleStatus.PUBLISHED,
        });
      } catch (error) {
        this.logger.error(
          `English subtitle generation failed for job: ${jobName}`,
          error,
        );
        await this.updateEnglishSubtitleDetails({
          fileName: '',
          jobId: jobName,
          status: SubtitleStatus.FAILED,
        });
      }
    })();
  }

  /**
   * Parse Hindi SRT content and translate to English using OpenAI in batches
   */
  private async translateHindiSRTToEnglish(
    hindiSRTContent: string,
  ): Promise<string> {
    try {
      const lines = hindiSRTContent.split('\n');
      const translatedLines: string[] = [];
      const subtitleTexts: { index: number; text: string }[] = [];

      // First pass: identify subtitle text lines and collect them
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();

        // Skip empty lines, numbers, and time codes
        if (
          !trimmedLine ||
          /^\d+$/.test(trimmedLine) ||
          /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(
            trimmedLine,
          )
        ) {
          translatedLines.push(lines[i]);
        } else {
          // This is subtitle text - collect for batch translation if it contains Hindi
          if (/[\u0900-\u097F]/.test(trimmedLine)) {
            subtitleTexts.push({ index: i, text: trimmedLine });
            translatedLines.push(''); // Placeholder for now
          } else {
            // Keep non-Hindi text as is
            translatedLines.push(lines[i]);
          }
        }
      }

      // Batch translate all subtitle texts if any found
      if (subtitleTexts.length > 0) {
        this.logger.log(
          `🔄 Translating ${subtitleTexts.length} subtitle segments in batches...`,
        );

        // Translate in batches of 10 for efficiency
        const batchSize = 10;
        for (let i = 0; i < subtitleTexts.length; i += batchSize) {
          const batch = subtitleTexts.slice(i, i + batchSize);
          const batchTexts = batch.map((item) => item.text);

          try {
            const translatedBatch =
              await this.translateSubtitleBatch(batchTexts);

            // Apply translations back to the lines
            batch.forEach((item, batchIndex) => {
              if (translatedBatch[batchIndex]) {
                translatedLines[item.index] = translatedBatch[batchIndex];
              } else {
                translatedLines[item.index] = item.text; // Fallback to original
              }
            });

            // Small delay between batches to avoid rate limits
            if (i + batchSize < subtitleTexts.length) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.log(error);
            this.logger.warn(
              `⚠️ Batch translation failed, falling back to individual translation for batch ${i / batchSize + 1}`,
            );

            // Fallback to individual translation for this batch
            for (const item of batch) {
              try {
                const translatedText = await this.translateTextSegment(
                  item.text,
                );
                translatedLines[item.index] = translatedText;
              } catch {
                this.logger.warn(
                  `⚠️ Individual translation failed for: "${item.text}"`,
                );
                translatedLines[item.index] = item.text; // Keep original
              }
            }
          }
        }
      }

      return translatedLines.join('\n');
    } catch (error) {
      this.logger.error('❌ Failed to translate Hindi SRT to English', error);
      // Return a placeholder English SRT if translation fails
      return hindiSRTContent.replace(
        /[\u0900-\u097F]+/g,
        '[English Translation]',
      );
    }
  }

  /**
   * Translate a batch of subtitle texts using OpenAI
   */
  private async translateSubtitleBatch(
    subtitleTexts: string[],
  ): Promise<string[]> {
    try {
      const prompt = `Translate the following Hindi subtitle lines to natural, fluent English. Return only the translations, one per line, in the same order:

${subtitleTexts.map((text, index) => `${index + 1}. ${text}`).join('\n')}`;

      const response = await this.openaiClient.chat.completions.create({
        max_tokens: 500,
        messages: [
          {
            content:
              'You are a professional subtitle translator. Translate Hindi subtitles to natural, fluent English. Maintain the tone and context. Return only the translated lines, numbered in the same order.',
            role: 'system',
          },
          {
            content: prompt,
            role: 'user',
          },
        ],
        model: 'gpt-4o',
        temperature: 0.3,
      });

      const translatedText = response.choices[0]?.message?.content?.trim();

      if (!translatedText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the numbered response
      const translations = translatedText
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line: string) => line.length > 0);

      // Ensure we have the same number of translations as inputs
      if (translations.length !== subtitleTexts.length) {
        this.logger.warn(
          `⚠️ Translation count mismatch: expected ${subtitleTexts.length}, got ${translations.length}`,
        );

        // Pad with original texts if we're short
        while (translations.length < subtitleTexts.length) {
          translations.push(subtitleTexts[translations.length]);
        }
      }

      return translations;
    } catch (error) {
      this.logger.error('❌ Failed to translate subtitle batch', error);
      throw error;
    }
  }

  private async translateTextSegment(text: string): Promise<string> {
    try {
      // Skip translation for empty or very short text
      if (!text?.trim() || text.trim().length < 2) {
        return text;
      }

      this.logger.debug(
        `🌐 Translating text segment: "${text.substring(0, 50)}..."`,
      );

      const response = await this.openaiClient.chat.completions.create({
        max_tokens: 200,
        messages: [
          {
            content: PROMPT_CONSTANTS.TRANSLATE_HINDI_TO_ENGLISH,
            role: 'system',
          },
          {
            content: `Translate this Hindi text to English: "${text}"`,
            role: 'user',
          },
        ],
        model: 'gpt-4o',
        temperature: 0.3,
      });

      const translatedText = response.choices[0]?.message?.content?.trim();

      if (translatedText) {
        this.logger.debug(
          `✅ Translation completed: "${translatedText.substring(0, 50)}..."`,
        );
        return translatedText;
      } else {
        this.logger.warn(`⚠️ Empty translation response for: "${text}"`);
        return text;
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to translate text segment: "${text}"`,
        error,
      );

      // Return original text if translation fails to maintain subtitle integrity
      return text;
    }
  }

  private async updateEnglishSubtitleDetails({
    fileName,
    jobId,
    status,
  }: {
    jobId: string;
    status: SubtitleStatus;
    fileName: string;
  }): Promise<void> {
    try {
      const forkedEpisodeRepository = this.episodeRepository
        .getEntityManager()
        .fork();

      const episodes = await forkedEpisodeRepository.find(Episode, {
        subtitle: {
          hinMetadata: {
            jobId,
          },
        },
      });

      episodes.forEach((episode) => {
        this._updateEpisodeSubtitleMetadata(episode, {
          enFileName: fileName,
          enStatus: status,
        });
      });

      await forkedEpisodeRepository.upsertMany(episodes);

      this.logger.log(
        `Updated English subtitle status to ${status} for ${episodes.length} episodes with job: ${jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update English subtitle status for job: ${jobId}`,
        error,
      );
    }
  }

  private async uploadSRTToS3(
    srtContent: string,
    bucketName: string,
    key: string,
  ): Promise<void> {
    await this.s3Service.uploadFileBuffer({
      bucket: bucketName,
      buffer: Buffer.from(srtContent),
      filePath: key,
      mimeType: 'application/x-subrip',
    });
  }

  async generateDualSubtitles(
    config: VideoTranscriptionConfig,
  ): Promise<SubtitleGenerationResult> {
    const {
      enableSpeakerLabels = true,
      jobName,
      maxSpeakerLabels = 10,
      outputBucketName,
      outputKey,
      videoFileUri,
    } = config;

    const hindiJobName = `${jobName}-hindi`;
    const englishJobName = `${jobName}-english`;

    try {
      // Generate a consistent file path for the Hindi subtitle
      const { filePath: hindiOutputKey } =
        MediaFilePathUtils.generateSubtitleFilePath({
          language: Lang.HIN,
          slug: outputKey, // Use the base outputKey as the slug
        });

      // Start Hindi transcription (for Haryanvi, Rajasthani, Bhojpuri dialects)
      await this.startHindiTranscription({
        enableSpeakerLabels,
        jobName: hindiJobName,
        maxSpeakerLabels,
        outputBucketName,
        outputKey: hindiOutputKey,
        videoFileUri,
      });

      this.logger.log(
        `Started Hindi transcription for OTT content: ${hindiJobName}`,
      );

      return {
        englishJobName,
        hindiJobName,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start dual subtitle generation: ${jobName}`,
        error,
      );
      throw error;
    }
  }

  async generateEnglishSubtitlesFromHindi({
    hindiJobName,
    slug,
  }: {
    hindiJobName: string;
    slug: string;
  }): Promise<{ fileName: string }> {
    try {
      // Get the Hindi transcription job status (assuming it's already completed)
      const hindiResult = await this.getTranscriptionJobStatus(hindiJobName);

      // Check if Hindi SRT file is available
      if (
        !hindiResult.subtitleFileUris ||
        hindiResult.subtitleFileUris.length === 0
      ) {
        throw new Error('Hindi SRT file not available from transcription job');
      }

      const hindiSrtFileUri = hindiResult.subtitleFileUris[0]; // Use first SRT file

      this.logger.log(`📥 Using Hindi SRT file: ${hindiSrtFileUri}`);

      this.logger.log('🌐 Translating Hindi SRT to English using OpenAI...');

      // Generate English SRT content by translating the Hindi SRT file
      const englishSRTContent =
        await this.generateEnglishSRTContent(hindiSrtFileUri);

      // Upload English SRT to S3 using the consistent file path
      const {
        bucket: englishSubtitleBucket,
        fileName: englishSubtitleFileName,
        filePath: englishSubtitleFilePath,
      } = MediaFilePathUtils.generateSubtitleFilePath({
        language: Lang.EN,
        slug: slug,
      });

      const englishSubtitleUri = await this.uploadSRTToS3(
        englishSRTContent,
        englishSubtitleBucket,
        `${englishSubtitleFilePath}/${englishSubtitleFileName}`,
      );

      this.logger.log(
        `✅ English subtitles generated successfully: ${englishSubtitleUri}`,
      );

      return {
        fileName: englishSubtitleFileName,
      };
    } catch (error) {
      console.log(error);
      this.logger.error(
        `❌ Failed to generate English subtitles from Hindi: ${hindiJobName}`,
        error,
      );
      throw error;
    }
  }

  async generateSubtitlesForContent({ slug }: { slug: string }) {
    const episodes = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.find({
        slug: slug,
      }),
      new NotFoundException('Episode not found'),
    );

    if (episodes.length === 0) {
      throw new Error('Episode not found');
    }

    if (episodes[0].visionularHls.status !== 'succeeded') {
      throw new Error(
        'Till video is transcoded, subtitles cannot be generated',
      );
    }

    const mp4VideoFilePath = MediaFilePathUtils.generateMp4OutputFilePath({
      contentType: ContentType.EPISODE,
      fileName: episodes[0].sourceLink,
    });

    const {
      bucket: subtitleBucket,
      fileName,
      filePath: subtitleFilePath,
    } = MediaFilePathUtils.generateSubtitleFilePath({
      language: Lang.HIN,
      slug,
    });

    const { resolutionFilePathsWithFileName } = mp4VideoFilePath;

    const awsMediaTranscribeTask = await this.startHindiTranscription({
      jobName: fileName.replace('.srt', ''), // Transcription job name is the file name without the extension , as transcribe create the srt file with the same name
      outputBucketName: subtitleBucket,
      outputKey: subtitleFilePath,
      videoFileUri: resolutionFilePathsWithFileName[240],
    });

    episodes.forEach((episode) => {
      // Ensure the subtitle object and its metadata fields exist
      if (!episode.subtitle) {
        episode.subtitle = {
          en: '',
          enMetadata: {
            lastModified: new Date(),
            method: GenerationMethod.ASR,
            status: SubtitleStatus.QUEUED,
          },
          hin: '',
          hinMetadata: {
            lastModified: new Date(),
            method: GenerationMethod.ASR,
            status: SubtitleStatus.QUEUED,
          },
        };
      }

      // Update Hindi metadata for the new transcription job
      episode.subtitle.hinMetadata = {
        jobId: awsMediaTranscribeTask.TranscriptionJob?.TranscriptionJobName,
        lastModified: new Date(),
        method: episode.subtitle.hinMetadata?.method ?? GenerationMethod.ASR,
        status: SubtitleStatus.PROCESSING,
      };

      // Ensure English metadata is ready for the queue
      episode.subtitle.enMetadata = {
        jobId: '',
        lastModified: new Date(),
        method: episode.subtitle.enMetadata?.method ?? GenerationMethod.ASR,
        status: SubtitleStatus.QUEUED,
      };
    });
    await this.episodeRepository.upsertMany(episodes);
  }

  async getSubtitleStatus(slug: string): Promise<SubtitleResponseDTO> {
    const episode = await this.episodeRepository.findOneOrFail({
      slug: slug,
    });

    if (!episode || !episode.subtitle) {
      throw new NotFoundException(
        'Subtitle information not found for the given slug.',
      );
    }

    const { subtitle } = episode;

    return {
      en: subtitle.en,
      enMetadata: subtitle.enMetadata ?? null,
      hin: subtitle.hin,
      hinMetadata: subtitle.hinMetadata ?? null,
    };
  }

  async getTranscriptionJobStatus(jobName: string) {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });

    try {
      const response = await this.transcribeClient.send(command);
      const job = response.TranscriptionJob;

      return {
        completionTime: job?.CompletionTime,
        creationTime: job?.CreationTime,
        failureReason: job?.FailureReason,
        jobName,
        languageCode: job?.LanguageCode,
        status: job?.TranscriptionJobStatus,
        subtitleFileUris: job?.Subtitles?.SubtitleFileUris,
        transcriptFileUri: job?.Transcript?.TranscriptFileUri,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get transcription job status: ${jobName}`,
        error,
      );
      throw error;
    }
  }

  async processTranscriptionWebhook(
    event: AwsTranscribeJobStateChangePayloadDto,
  ): Promise<void> {
    const jobStatus = event.detail.TranscriptionJobStatus;
    const jobName = event.detail.TranscriptionJobName;

    const forkedEpisodeRepository = this.episodeRepository
      .getEntityManager()
      .fork();

    const episodes = await forkedEpisodeRepository.find(Episode, {
      subtitle: {
        hinMetadata: {
          jobId: jobName,
        },
      },
    });

    if (episodes.length === 0) {
      this.logger.warn(`No episodes found for transcription job: ${jobName}`);
      return;
    }

    switch (jobStatus) {
      case TranscriptionJobStatus.IN_PROGRESS:
        episodes.forEach((episode) => {
          this._updateEpisodeSubtitleMetadata(episode, {
            hinStatus: SubtitleStatus.PROCESSING,
          });
        });
        break;

      case TranscriptionJobStatus.COMPLETED: {
        const jobDetails = await this.getTranscriptionJobStatus(jobName);
        const subtitleUris = jobDetails?.subtitleFileUris;

        if (!subtitleUris || subtitleUris.length === 0) {
          this.logger.warn(
            `No subtitle files found in completed job, marking as FAILED: ${jobName}`,
          );
          // Manually update status and fall through to the FAILED case
          event.detail.TranscriptionJobStatus = TranscriptionJobStatus.FAILED;
        } else {
          const actualHindiSrtUri = subtitleUris[0];
          const { nameWithExtension: actualHindiFileName } =
            MediaFilePathUtils.extractFileNameWithExtension(actualHindiSrtUri);
          const slug = episodes[0]?.slug;
          if (!slug) {
            this.logger.error(
              `Could not determine slug for job ${jobName}, cannot start English subtitle generation.`,
            );
            // We can still update the Hindi subtitles, so we don't return here
          }

          episodes.forEach((episode) => {
            this._updateEpisodeSubtitleMetadata(episode, {
              enStatus: SubtitleStatus.PROCESSING,
              hinFileName: actualHindiFileName,
              hinStatus: SubtitleStatus.PUBLISHED,
            });
          });

          if (slug) {
            this.generateEnglishSubtitlesAsync(jobName, slug);
          }
          break; // Exit after successful completion
        }
      }
      // eslint-disable-next-line no-fallthrough
      case TranscriptionJobStatus.FAILED:
        episodes.forEach((episode) => {
          this._updateEpisodeSubtitleMetadata(episode, {
            enStatus: SubtitleStatus.FAILED,
            hinStatus: SubtitleStatus.FAILED,
          });
        });
        break;
      default:
        this.logger.log(
          `Unhandled job status: ${jobStatus} for job ${jobName}`,
        );
    }

    await forkedEpisodeRepository.upsertMany(episodes);
  }

  async startHindiTranscription(config: VideoTranscriptionConfig) {
    const {
      enableSpeakerLabels,
      jobName,
      maxSpeakerLabels,
      outputBucketName,
      outputKey,
      videoFileUri,
    } = config;

    console.log('config', config);

    const command = new StartTranscriptionJobCommand({
      LanguageCode: LanguageCode.HI_IN, // Hindi for regional dialects
      Media: {
        MediaFileUri: videoFileUri,
      },
      MediaFormat: MediaFormat.MP4, // Always video for OTT
      OutputBucketName: outputBucketName,
      OutputKey: outputKey,
      Settings: {
        ChannelIdentification: false,
        MaxAlternatives: 2,
        MaxSpeakerLabels: enableSpeakerLabels ? maxSpeakerLabels : undefined,
        ShowAlternatives: true, // Must be true when MaxAlternatives is set
        ShowSpeakerLabels: enableSpeakerLabels,
        VocabularyFilterMethod: 'remove', // Clean up profanity
      },
      Subtitles: {
        Formats: [SubtitleFormat.SRT], // Only SRT format
        OutputStartIndex: 1,
      },
      TranscriptionJobName: jobName,
    });

    return this.transcribeClient.send(command);
  }
}
