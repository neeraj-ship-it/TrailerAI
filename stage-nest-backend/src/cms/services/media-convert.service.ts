import {
  CreateJobCommand,
  GetJobCommand,
  MediaConvertClient,
  AacAudioDescriptionBroadcasterMix,
  AacCodecProfile,
  AacCodingMode,
  AacRateControlMode,
  AacRawFormat,
  AacSpecification,
  AudioCodec,
  AudioLanguageCodeControl,
  AudioDefaultSelection,
  AudioSelectorType,
  AudioTypeControl,
  ColorSpace,
  OutputGroupType,
  InputDeblockFilter,
  InputDenoiseFilter,
  InputFilterEnable,
  InputPsiControl,
  InputTimecodeSource,
  ContainerType,
  Mp4CslgAtom,
  Mp4FreeSpaceBox,
  Mp4MoovPlacement,
  AfdSignaling,
  AntiAlias,
  VideoCodec,
  H264AdaptiveQuantization,
  H264CodecLevel,
  H264CodecProfile,
  H264EntropyEncoding,
  H264FieldEncoding,
  H264FlickerAdaptiveQuantization,
  H264FramerateControl,
  H264FramerateConversionAlgorithm,
  H264GopBReference,
  H264GopSizeUnits,
  H264InterlaceMode,
  H264ParControl,
  H264QualityTuningLevel,
  H264RateControlMode,
  H264RepeatPps,
  H264SceneChangeDetect,
  H264SlowPal,
  H264SpatialAdaptiveQuantization,
  H264TemporalAdaptiveQuantization,
  H264Syntax,
  H264Telecine,
  H264UnregisteredSeiTimecode,
  ColorMetadata,
  DropFrameTimecode,
  ScalingBehavior,
  TimecodeSource,
  VideoTimecodeInsertion,
} from '@aws-sdk/client-mediaconvert';

import { Injectable, Logger } from '@nestjs/common';

import { ErrorHandlerService } from '@app/error-handler';

import { VideoAspectRatioEnum } from '../dtos';
import { MEDIACONVERT_JOB_STATUS } from '../dtos/aws-webhook.dto';
import type { AudioDescriptionConfig } from '@app/cms/interfaces/common.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';

@Injectable()
export class AWSMediaConvertService {
  private readonly logger = new Logger(AWSMediaConvertService.name);
  private readonly mediaConvertClient: MediaConvertClient;
  constructor(private readonly errorHandler: ErrorHandlerService) {
    this.mediaConvertClient = new MediaConvertClient({
      credentials: {
        accessKeyId: APP_CONFIGS.AWS.ACCESS_KEY_ID,
        secretAccessKey: APP_CONFIGS.AWS.SECRET_ACCESS_KEY,
      },
      endpoint: APP_CONFIGS.AWS.MEDIA_CONVERT.ENDPOINT,
      region: APP_CONFIGS.AWS.MEDIA_CONVERT.REGION,
    });
  }

  private generateMp4JobCommandInput(
    sourcePath: string,
    destinationPath: string,
    aspectRatio: VideoAspectRatioEnum,
    nameModifier?: string,
  ) {
    const param = {
      AdAvailOffset: 0,
      Inputs: [
        {
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: AudioDefaultSelection.NOT_DEFAULT,
              Offset: 0,
              ProgramSelection: 1,
              SelectorType: AudioSelectorType.TRACK,
              Tracks: [1],
            },
          },
          DeblockFilter: InputDeblockFilter.DISABLED,
          DenoiseFilter: InputDenoiseFilter.DISABLED,
          FileInput: sourcePath,
          FilterEnable: InputFilterEnable.AUTO,
          FilterStrength: 0,
          PsiControl: InputPsiControl.USE_PSI,
          TimecodeSource: InputTimecodeSource.EMBEDDED,
          VideoSelector: {
            ColorSpace: ColorSpace.FOLLOW,
          },
        },
      ],
      OutputGroups: [
        {
          Name: '360bitrate',
          OutputGroupSettings: {
            FileGroupSettings: {
              Destination: destinationPath + '360/',
            },
            Type: OutputGroupType.FILE_GROUP_SETTINGS,
          },
          Outputs: [
            {
              AudioDescriptions: this.getBaseAudioDescription(),
              ContainerSettings: {
                Container: ContainerType.MP4,
                Mp4Settings: {
                  CslgAtom: Mp4CslgAtom.INCLUDE,
                  FreeSpaceBox: Mp4FreeSpaceBox.EXCLUDE,
                  MoovPlacement: Mp4MoovPlacement.PROGRESSIVE_DOWNLOAD,
                },
              },
              NameModifier: nameModifier ? `_${nameModifier}` : undefined,
              VideoDescription: this.getBaseVideoConfig({
                adaptiveQuantization: H264AdaptiveQuantization.HIGH,
                bitrate: 250000,
                height:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 360 : 640,
                rateControlMode: H264RateControlMode.CBR,
                sharpness: 50,
                width:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 640 : 360,
              }),
            },
          ],
        },
        {
          Name: '480p',
          OutputGroupSettings: {
            FileGroupSettings: {
              Destination: destinationPath + '480/',
            },
            Type: OutputGroupType.FILE_GROUP_SETTINGS,
          },
          Outputs: [
            {
              AudioDescriptions: this.getBaseAudioDescription(),
              ContainerSettings: {
                Container: ContainerType.MP4,
                Mp4Settings: {
                  CslgAtom: Mp4CslgAtom.INCLUDE,
                  FreeSpaceBox: Mp4FreeSpaceBox.EXCLUDE,
                  MoovPlacement: Mp4MoovPlacement.PROGRESSIVE_DOWNLOAD,
                },
              },
              NameModifier: nameModifier ? `_${nameModifier}` : undefined,
              VideoDescription: this.getBaseVideoConfig({
                adaptiveQuantization: H264AdaptiveQuantization.HIGHER,
                bitrate: 400000,
                height:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 480 : 854,
                rateControlMode: H264RateControlMode.VBR,
                sharpness: 90,
                width:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 854 : 480,
              }),
            },
          ],
        },
        {
          Name: '720p',
          OutputGroupSettings: {
            FileGroupSettings: {
              Destination: destinationPath + '720/',
            },
            Type: OutputGroupType.FILE_GROUP_SETTINGS,
          },
          Outputs: [
            {
              AudioDescriptions: this.getBaseAudioDescription(),
              ContainerSettings: {
                Container: ContainerType.MP4,
                Mp4Settings: {
                  CslgAtom: Mp4CslgAtom.INCLUDE,
                  FreeSpaceBox: Mp4FreeSpaceBox.EXCLUDE,
                  MoovPlacement: Mp4MoovPlacement.PROGRESSIVE_DOWNLOAD,
                },
              },
              NameModifier: nameModifier ? `_${nameModifier}` : undefined,
              VideoDescription: this.getBaseVideoConfig({
                adaptiveQuantization: H264AdaptiveQuantization.HIGHER,
                bitrate: 600000,
                height:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 720 : 1280,
                rateControlMode: H264RateControlMode.VBR,
                sharpness: 90,
                width:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 1280 : 720,
              }),
            },
          ],
        },
        {
          Name: '1080p',
          OutputGroupSettings: {
            FileGroupSettings: {
              Destination: destinationPath + '1080/',
            },
            Type: OutputGroupType.FILE_GROUP_SETTINGS,
          },
          Outputs: [
            {
              AudioDescriptions: this.getBaseAudioDescription(),
              ContainerSettings: {
                Container: ContainerType.MP4,
                Mp4Settings: {
                  CslgAtom: Mp4CslgAtom.INCLUDE,
                  FreeSpaceBox: Mp4FreeSpaceBox.EXCLUDE,
                  MoovPlacement: Mp4MoovPlacement.PROGRESSIVE_DOWNLOAD,
                },
              },
              NameModifier: nameModifier ? `_${nameModifier}` : undefined,
              VideoDescription: this.getBaseVideoConfig({
                adaptiveQuantization: H264AdaptiveQuantization.HIGHER,
                bitrate: 800000,
                height:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 1080 : 1920,
                rateControlMode: H264RateControlMode.VBR,
                sharpness: 90,
                width:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 1920 : 1080,
              }),
            },
          ],
        },
        {
          Name: '240p',
          OutputGroupSettings: {
            FileGroupSettings: {
              Destination: destinationPath + '240/',
            },
            Type: OutputGroupType.FILE_GROUP_SETTINGS,
          },
          Outputs: [
            {
              AudioDescriptions: this.getBaseAudioDescription(),
              ContainerSettings: {
                Container: ContainerType.MP4,
                Mp4Settings: {
                  CslgAtom: Mp4CslgAtom.INCLUDE,
                  FreeSpaceBox: Mp4FreeSpaceBox.EXCLUDE,
                  MoovPlacement: Mp4MoovPlacement.PROGRESSIVE_DOWNLOAD,
                },
              },
              NameModifier: nameModifier ? `_${nameModifier}` : undefined,
              VideoDescription: this.getBaseVideoConfig({
                adaptiveQuantization: H264AdaptiveQuantization.HIGHER,
                bitrate: 150000,
                height:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 240 : 426,
                rateControlMode: H264RateControlMode.VBR,
                sharpness: 90,
                width:
                  aspectRatio === VideoAspectRatioEnum.Horizontal ? 426 : 240,
              }),
            },
          ],
        },
      ],
      TimecodeConfig: {
        Source: TimecodeSource.EMBEDDED,
      },
    };
    return param;
  }

  private getBaseAudioDescription(): AudioDescriptionConfig[] {
    return [
      {
        AudioSourceName: 'Audio Selector 1',
        AudioTypeControl: AudioTypeControl.FOLLOW_INPUT,
        CodecSettings: {
          AacSettings: {
            AudioDescriptionBroadcasterMix:
              AacAudioDescriptionBroadcasterMix.NORMAL,
            Bitrate: 64000,
            CodecProfile: AacCodecProfile.LC,
            CodingMode: AacCodingMode.CODING_MODE_2_0,
            RateControlMode: AacRateControlMode.CBR,
            RawFormat: AacRawFormat.NONE,
            SampleRate: 48000,
            Specification: AacSpecification.MPEG4,
          },
          Codec: AudioCodec.AAC,
        },
        LanguageCodeControl: AudioLanguageCodeControl.FOLLOW_INPUT,
      },
    ];
  }

  private getBaseVideoConfig({
    adaptiveQuantization,
    bitrate,
    height,
    rateControlMode,
    sharpness,
    width,
  }: {
    bitrate: number;
    height: number;
    width: number;
    sharpness: number;
    adaptiveQuantization: H264AdaptiveQuantization;
    rateControlMode: H264RateControlMode;
  }) {
    return {
      AfdSignaling: AfdSignaling.NONE,
      AntiAlias: AntiAlias.ENABLED,
      CodecSettings: {
        Codec: VideoCodec.H_264,
        H264Settings: {
          AdaptiveQuantization: adaptiveQuantization,
          Bitrate: bitrate,
          CodecLevel: H264CodecLevel.AUTO,
          CodecProfile: H264CodecProfile.MAIN,
          EntropyEncoding: H264EntropyEncoding.CABAC,
          FieldEncoding: H264FieldEncoding.PAFF,
          FlickerAdaptiveQuantization: H264FlickerAdaptiveQuantization.DISABLED,
          FramerateControl: H264FramerateControl.INITIALIZE_FROM_SOURCE,
          FramerateConversionAlgorithm:
            H264FramerateConversionAlgorithm.DUPLICATE_DROP,
          GopBReference: H264GopBReference.DISABLED,
          GopClosedCadence: 1,
          GopSize: 90,
          GopSizeUnits: H264GopSizeUnits.FRAMES,
          InterlaceMode: H264InterlaceMode.PROGRESSIVE,
          MinIInterval: 0,
          NumberBFramesBetweenReferenceFrames: 2,
          NumberReferenceFrames: 3,
          ParControl: H264ParControl.INITIALIZE_FROM_SOURCE,
          QualityTuningLevel: H264QualityTuningLevel.SINGLE_PASS,
          RateControlMode: rateControlMode,
          RepeatPps: H264RepeatPps.DISABLED,
          SceneChangeDetect: H264SceneChangeDetect.ENABLED,
          Slices: 1,
          SlowPal: H264SlowPal.DISABLED,
          Softness: 0,
          SpatialAdaptiveQuantization: H264SpatialAdaptiveQuantization.ENABLED,
          Syntax: H264Syntax.DEFAULT,
          Telecine: H264Telecine.NONE,
          TemporalAdaptiveQuantization:
            H264TemporalAdaptiveQuantization.ENABLED,
          UnregisteredSeiTimecode: H264UnregisteredSeiTimecode.DISABLED,
        },
      },
      ColorMetadata: ColorMetadata.INSERT,
      DropFrameTimecode: DropFrameTimecode.ENABLED,
      Height: height,
      RespondToAfd: AfdSignaling.NONE,
      ScalingBehavior: ScalingBehavior.DEFAULT,
      Sharpness: sharpness,
      TimecodeInsertion: VideoTimecodeInsertion.DISABLED,
      Width: width,
    };
  }

  async getMediaConvertJobDuration(jobId: string): Promise<{
    durationInMs: number;
    status: string;
  } | null> {
    const [result] = await this.errorHandler.try(
      async () => {
        // Query MediaConvert to get the job details
        const command = new GetJobCommand({ Id: jobId });
        const response = await this.mediaConvertClient.send(command);

        // If job is complete, extract duration from the output details
        if (response.Job?.Status === MEDIACONVERT_JOB_STATUS.COMPLETE) {
          const durationInMs =
            response.Job.OutputGroupDetails?.[0]?.OutputDetails?.[0]
              ?.DurationInMs || 0;
          return {
            durationInMs,
            status: MEDIACONVERT_JOB_STATUS.COMPLETE,
          } as const;
        }

        // Job is not complete yet, return current status
        return {
          durationInMs: 0,
          status: response.Job?.Status || MEDIACONVERT_JOB_STATUS.PROGRESSING,
        } as const;
      },
      (error) => {
        this.logger.error(
          { error },
          `Failed to get MediaConvert job duration for ${jobId}`,
        );
      },
    );
    return result ?? null;
  }

  async triggerConversionJob(
    sourcePath: string,
    destinationPath: string,
    aspectRatio: VideoAspectRatioEnum = VideoAspectRatioEnum.Horizontal,
    nameModifier?: string,
  ) {
    const response = await this.mediaConvertClient.send(
      new CreateJobCommand({
        Queue: APP_CONFIGS.AWS.MEDIA_CONVERT.QUEUE_ARN,
        Role: APP_CONFIGS.AWS.MEDIA_CONVERT.ROLE_ARN,
        Settings: this.generateMp4JobCommandInput(
          sourcePath,
          destinationPath,
          aspectRatio,
          nameModifier,
        ),
      }),
    );

    this.logger.log(
      `Conversion job triggered for MP4 ${sourcePath} to ${destinationPath} with name modifier: ${nameModifier}`,
    );

    return response;
  }
}
