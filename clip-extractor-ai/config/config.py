"""Configuration for Clip Extractor AI."""

from dataclasses import dataclass, field
from typing import Optional

from config.constants import (
    AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
    AWS_CLOUDFRONT_URL,
    FFMPEG_PRESET, FFMPEG_CRF, FFMPEG_AUDIO_BITRATE,
    FFMPEG_VIDEO_CODEC, FFMPEG_AUDIO_CODEC,
    DEFAULT_NUM_CLIPS, DEFAULT_MIN_CLIP_DURATION, DEFAULT_MAX_CLIP_DURATION,
    DEFAULT_SEGMENT_MIN_DURATION, DEFAULT_SEGMENT_MAX_DURATION,
    DEFAULT_COMPILED_MAX_DURATION, DEFAULT_GENERATE_COMPILED,
    TEMP_DIR, OUTPUT_DIR,
)


@dataclass
class S3Config:
    """AWS S3 configuration."""
    bucket: str = AWS_S3_BUCKET
    region: str = AWS_REGION
    access_key: Optional[str] = AWS_ACCESS_KEY_ID
    secret_key: Optional[str] = AWS_SECRET_ACCESS_KEY
    cloudfront_url: str = AWS_CLOUDFRONT_URL


@dataclass
class FFmpegConfig:
    """FFmpeg encoding configuration."""
    preset: str = FFMPEG_PRESET
    crf: int = FFMPEG_CRF
    audio_bitrate: str = FFMPEG_AUDIO_BITRATE
    video_codec: str = FFMPEG_VIDEO_CODEC
    audio_codec: str = FFMPEG_AUDIO_CODEC


@dataclass
class ClipConfig:
    """Clip extraction configuration."""
    num_clips: int = DEFAULT_NUM_CLIPS
    min_clip_duration: int = DEFAULT_MIN_CLIP_DURATION
    max_clip_duration: int = DEFAULT_MAX_CLIP_DURATION
    segment_min_duration: int = DEFAULT_SEGMENT_MIN_DURATION
    segment_max_duration: int = DEFAULT_SEGMENT_MAX_DURATION
    compiled_max_duration: int = DEFAULT_COMPILED_MAX_DURATION
    generate_compiled: bool = DEFAULT_GENERATE_COMPILED


@dataclass
class AppConfig:
    """Main application configuration."""
    s3: S3Config = field(default_factory=S3Config)
    ffmpeg: FFmpegConfig = field(default_factory=FFmpegConfig)
    clip: ClipConfig = field(default_factory=ClipConfig)
    temp_dir: str = TEMP_DIR
    output_dir: str = OUTPUT_DIR


# Singleton config instance
_config: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """Get or create global config instance."""
    global _config
    if _config is None:
        _config = AppConfig()
    return _config


def reset_config() -> None:
    """Reset config (useful for testing)."""
    global _config
    _config = None
