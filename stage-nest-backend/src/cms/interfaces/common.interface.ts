import type {
  AudioLanguageCodeControl,
  AudioCodec,
  AacSpecification,
  AacRawFormat,
  AacAudioDescriptionBroadcasterMix,
  AacCodingMode,
  AacRateControlMode,
  AudioTypeControl,
  AacCodecProfile,
} from '@aws-sdk/client-mediaconvert';

export enum VIDEO_TRANSCODING_TEMPLATES {
  H264 = 'H264',
  H265 = 'H265',
  MP4_WATERMARK = 'MP4_WATERMARK',
}

export interface AudioDescriptionConfig {
  AudioSourceName: string;
  AudioTypeControl: AudioTypeControl;
  CodecSettings: {
    AacSettings: {
      AudioDescriptionBroadcasterMix: AacAudioDescriptionBroadcasterMix;
      Bitrate: number;
      CodecProfile: AacCodecProfile;
      CodingMode: AacCodingMode;
      RateControlMode: AacRateControlMode;
      RawFormat: AacRawFormat;
      SampleRate: number;
      Specification: AacSpecification;
    };
    Codec: AudioCodec;
  };
  LanguageCodeControl: AudioLanguageCodeControl;
}
