"""Constants for Trailer Narrative AI.

All configuration values are defined here as constants.
No environment variable dependencies - edit this file to change settings.

Usage:
    from config.constants import (
        WHISPER_MODEL, LLM_MODEL, OLLAMA_MODEL, ...
    )
"""

from pathlib import Path

# =============================================================================
# AWS S3 CONFIGURATION
# =============================================================================

AWS_S3_BUCKET = "stage-media-bucket"
AWS_REGION = "ap-south-1"
AWS_ACCESS_KEY_ID = None  # Set your key here if needed
AWS_SECRET_ACCESS_KEY = None  # Set your secret here if needed


# =============================================================================
# ASR (AUTOMATIC SPEECH RECOGNITION) CONFIGURATION
# =============================================================================

# Whisper model size: small (~460MB), medium (~1.5GB), large (~6GB)
# Recommended: "small" for speed, "medium" for quality, "large" for best
WHISPER_MODEL = "medium"

# Primary model for ASR
INDIAN_ASR_MODEL = "openai/whisper-small"

# Fallback model if primary fails
ASR_FALLBACK_MODEL = "openai/whisper-small"

# Device: "auto", "cuda", "cpu", "mps"
ASR_DEVICE = "auto"

# Batch size for parallel processing
ASR_BATCH_SIZE = 4

# Use chunked processing for long videos (>30 min)
# Set to True if you have memory constraints
ASR_CHUNKED = False

# Chunk duration in seconds for parallel ASR
ASR_CHUNK_DURATION = 300  # 5 minutes

# Number of ASR workers for parallel processing
# Keep at 1 to avoid OOM, increase if you have enough RAM
ASR_WORKERS = 1

# Enable parallel ASR mode (faster but uses more memory)
ASR_PARALLEL = False


# =============================================================================
# LLM (LARGE LANGUAGE MODEL) CONFIGURATION
# =============================================================================

# Provider: "local" (HuggingFace), "ollama", or "heuristic" (no LLM)
LLM_PROVIDER = "local"

# Enable LLM-based analysis
USE_LLM = True

# Primary model for narrative generation (HuggingFace)
LLM_MODEL = "google/flan-t5-large"

# Hindi-specialized model for dialect content
LLM_HINDI_MODEL = "ai4bharat/IndicBARTSS"

# Ollama configuration
OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL = "mistral"  # or "llama3.2"

# Device for LLM inference: "auto", "cuda", "mps", "cpu"
LLM_DEVICE = "auto"


# =============================================================================
# VISUAL ANALYSIS CONFIGURATION
# =============================================================================

# Primary model for visual understanding (CLIP)
VISUAL_MODEL = "openai/clip-vit-large-patch14"

# Scene captioning model
CAPTION_MODEL = "Salesforce/blip2-opt-2.7b"

# Device for visual inference
VISUAL_DEVICE = "auto"


# =============================================================================
# MUSIC GENERATION CONFIGURATION
# =============================================================================

# Enable AI music generation
MUSIC_ENABLED = True

# MusicGen model: small (fast), medium (balanced), large (best)
MUSICGEN_MODEL = "facebook/musicgen-small"

# Device for music generation
MUSICGEN_DEVICE = "auto"


# =============================================================================
# PROCESSING CONFIGURATION
# =============================================================================

# Temp directory for intermediate files
TEMP_DIR = "/tmp/trailer-narrative-ai"

# Max CPU workers for parallel processing
MAX_CPU_WORKERS = 4

# Max I/O workers for async operations
MAX_IO_WORKERS = 8

# Output directory
OUTPUT_DIR = "./output"

# Models cache directory
MODELS_CACHE = "~/.cache/trailer-ai"

# Production mode (disables watermark, uses higher quality)
PRODUCTION_MODE = True


# =============================================================================
# PROGRESS REPORTING CONFIGURATION
# =============================================================================

# API endpoint path (appended to progressBaseUrl from payload)
PROGRESS_ENDPOINT = "cms/trailer-narrative/progress"

# Progress status values
PROGRESS_STATUS_INITIATED = "processing-initiated"
PROGRESS_STATUS_PROGRESS = "processing-progress"
PROGRESS_STATUS_COMPLETE = "processing-complete"
PROGRESS_STATUS_FAILED = "processing-failed"

# Progress type labels for each step
PROGRESS_DOWNLOAD = "download"
PROGRESS_LOAD_INPUTS = "load-inputs"
PROGRESS_SCENE_DETECTION = "scene-detection"
PROGRESS_AUDIO_ANALYSIS = "audio-analysis"
PROGRESS_VISUAL_ANALYSIS = "visual-analysis"
PROGRESS_CONTENT_UNDERSTANDING = "content-understanding"
PROGRESS_NARRATIVE_GENERATION = "narrative-generation"
PROGRESS_TRAILER_ASSEMBLY = "trailer-assembly"
PROGRESS_UPLOAD = "upload"
PROGRESS_OUTPUT_GENERATION = "output-generation"

# Throttling settings to reduce API calls
PROGRESS_UPDATE_MIN_INTERVAL = 1.0  # Minimum seconds between updates
PROGRESS_UPDATE_PERCENT_THRESHOLD = 5  # Only send if changed by this %
PROGRESS_UPDATE_MILESTONES = [0, 25, 50, 75, 100]  # Always send at these %
PROGRESS_UPDATE_TIMEOUT = 10.0  # HTTP request timeout in seconds


# =============================================================================
# STAGE TRAILER STYLE CONFIGURATION
# =============================================================================

# STAGE default trailer duration (longer than standard 90s trailers)
DEFAULT_TARGET_DURATION = 120  # seconds (STAGE standard: 120-150s)

# STAGE shot parameters
STAGE_MIN_SHOTS = 30
STAGE_MAX_SHOTS = 40
STAGE_AVG_SHOT_DURATION = 3.5  # seconds (vs 6-8s standard)
STAGE_MIN_SHOT_DURATION = 2.0  # seconds
STAGE_MAX_SHOT_DURATION = 4.0  # seconds

# STAGE dialogue parameters
STAGE_MIN_DIALOGUES = 15
STAGE_MAX_DIALOGUES = 25
STAGE_DIALOGUE_RATIO = 0.7  # 70% of trailer should have dialogue

# STAGE music parameters
STAGE_MUSIC_SHIFTS = 3  # Number of music style changes
STAGE_MUSIC_STYLES = [
    "soft_regional",      # Opening (dhol, tabla, ambient)
    "intense_action",     # Middle (epic + regional drums)
    "emotional_suspense"  # Ending (strings, tension)
]

# STAGE narrative styles (priority order)
DEFAULT_NARRATIVE_STYLES = [
    "dramatic",     # Main style
    "action",       # Action-heavy
    "emotional",    # Character-focused
    "thriller",     # Suspense build
    "epic",         # Grand scale
    "character"     # Character intro
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_output_dir() -> Path:
    """Get output directory as Path."""
    return Path(OUTPUT_DIR)


def get_models_cache_dir() -> Path:
    """Get models cache directory as Path (expanded)."""
    return Path(MODELS_CACHE).expanduser()


def get_temp_dir() -> Path:
    """Get temp directory as Path."""
    return Path(TEMP_DIR)
