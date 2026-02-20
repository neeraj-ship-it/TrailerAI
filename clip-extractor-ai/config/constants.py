"""Constants for Clip Extractor AI.

All configuration values are defined here as constants.
Edit this file to change settings.
"""

from pathlib import Path

# =============================================================================
# AWS S3 CONFIGURATION
# =============================================================================

AWS_S3_BUCKET = "stage-media-bucket"
AWS_REGION = "ap-south-1"
AWS_ACCESS_KEY_ID = None  # Set your key here if needed
AWS_SECRET_ACCESS_KEY = None  # Set your secret here if needed
AWS_CLOUDFRONT_URL = ""  # CloudFront distribution URL for clip playback

# =============================================================================
# FFMPEG CONFIGURATION
# =============================================================================

FFMPEG_PRESET = "medium"  # ultrafast, fast, medium, slow
FFMPEG_CRF = 18  # Quality: 0=lossless, 18=good, 23=default, 28=lower
FFMPEG_AUDIO_BITRATE = "320k"
FFMPEG_VIDEO_CODEC = "libx264"
FFMPEG_AUDIO_CODEC = "aac"

# =============================================================================
# CLIP EXTRACTION DEFAULTS
# =============================================================================

DEFAULT_NUM_CLIPS = 5
DEFAULT_MIN_CLIP_DURATION = 60  # seconds (1 min)
DEFAULT_MAX_CLIP_DURATION = 120  # seconds (2 min)
DEFAULT_SEGMENT_MIN_DURATION = 30  # seconds
DEFAULT_SEGMENT_MAX_DURATION = 40  # seconds
DEFAULT_COMPILED_MAX_DURATION = 120  # seconds (2 min)
DEFAULT_GENERATE_COMPILED = True

# =============================================================================
# PROCESSING CONFIGURATION
# =============================================================================

TEMP_DIR = "/tmp/clip-extractor-ai"
OUTPUT_DIR = "./output"

# Video download settings
VIDEO_DOWNLOAD_CONNECT_TIMEOUT = 30  # seconds to establish connection
VIDEO_DOWNLOAD_READ_TIMEOUT = 300  # seconds to wait for next chunk of data
VIDEO_DOWNLOAD_CHUNK_SIZE = 1024 * 1024  # 1 MB per chunk (for large files)
VIDEO_DOWNLOAD_MAX_RETRIES = 10  # number of retry attempts (large files need more)
VIDEO_DOWNLOAD_RETRY_WAIT = 3  # seconds to wait between retries

# =============================================================================
# PROGRESS REPORTING CONFIGURATION
# =============================================================================

PROGRESS_ENDPOINT = "cms/clip-extractor/progress"

PROGRESS_STATUS_INITIATED = "processing-initiated"
PROGRESS_STATUS_PROGRESS = "processing-progress"
PROGRESS_STATUS_COMPLETE = "processing-complete"
PROGRESS_STATUS_FAILED = "processing-failed"

PROGRESS_UPDATE_MIN_INTERVAL = 1.0  # Minimum seconds between updates
PROGRESS_UPDATE_PERCENT_THRESHOLD = 1  # Only send if changed by this %
PROGRESS_UPDATE_MILESTONES = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]
PROGRESS_UPDATE_TIMEOUT = 10.0  # HTTP request timeout in seconds

# Progress stage names
PROGRESS_DOWNLOADING = "downloading-video"
PROGRESS_ANALYZING = "analyzing-emotions"
PROGRESS_EXTRACTING = "extracting-clips"
PROGRESS_COMPILING = "compiling-video"
PROGRESS_UPLOADING = "uploading-to-s3"

# =============================================================================
# VIDEO ANALYSIS CONFIGURATION
# =============================================================================

# Scene detection threshold (0-1, lower = more sensitive)
SCENE_DETECTION_THRESHOLD = 0.3

# Audio analysis window size (seconds)
AUDIO_ANALYSIS_WINDOW = 1.0

# Emotion scoring weights
SCORE_WEIGHT_AUDIO_DYNAMICS = 0.35  # High variance = emotional/dramatic
SCORE_WEIGHT_AUDIO_PEAK = 0.25     # Loud peaks = intense moments
SCORE_WEIGHT_AUDIO_ENERGY = 0.20   # Overall energy level
SCORE_WEIGHT_SCENE_DENSITY = 0.20  # Scene changes = visual activity

# Minimum gap between selected clips (seconds)
MIN_CLIP_GAP = 60.0


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_output_dir() -> Path:
    """Get output directory as Path."""
    return Path(OUTPUT_DIR)


def get_temp_dir() -> Path:
    """Get temp directory as Path."""
    return Path(TEMP_DIR)
