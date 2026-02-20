"""Production-grade configuration for Trailer Narrative AI.

Optimized for:
- Fast processing with parallel execution
- Indian dialect detection using open-source HuggingFace models
- Production-ready trailer output
- No paid APIs required
"""

from dataclasses import dataclass, field
from typing import List, Optional
from pathlib import Path

from config.constants import (
    AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
    WHISPER_MODEL, INDIAN_ASR_MODEL, ASR_FALLBACK_MODEL, ASR_DEVICE, ASR_BATCH_SIZE,
    LLM_PROVIDER, LLM_MODEL, LLM_HINDI_MODEL, OLLAMA_HOST, OLLAMA_MODEL, LLM_DEVICE,
    VISUAL_MODEL, CAPTION_MODEL, VISUAL_DEVICE,
    MUSIC_ENABLED, MUSICGEN_MODEL, MUSICGEN_DEVICE,
    TEMP_DIR, MAX_CPU_WORKERS, MAX_IO_WORKERS,
    OUTPUT_DIR, MODELS_CACHE, PRODUCTION_MODE,
    get_output_dir, get_models_cache_dir,
)


@dataclass
class S3Config:
    """AWS S3 configuration."""
    bucket: str = AWS_S3_BUCKET
    region: str = AWS_REGION
    access_key: Optional[str] = AWS_ACCESS_KEY_ID
    secret_key: Optional[str] = AWS_SECRET_ACCESS_KEY


@dataclass
class IndianASRConfig:
    """Indian dialect ASR configuration using HuggingFace models.

    FAST mode (default): Uses whisper-small (~460MB, quick download)
    QUALITY mode: Set WHISPER_MODEL=hindi or WHISPER_MODEL=large

    Models by size:
    - whisper-base: ~140MB (fastest)
    - whisper-small: ~460MB (default, good quality)
    - whisper-medium: ~1.5GB (better quality)
    - whisper-hindi: ~3GB (best for Hindi dialects)
    - whisper-large: ~6GB (best overall quality)

    For regional dialects (Haryanvi, Bhojpuri, Rajasthani, Gujarati):
    - Dialect detection is done via post-processing patterns
    - Works with any Whisper model size
    """
    # Default to medium for quality (edit constants.py to change)
    whisper_model: str = WHISPER_MODEL
    # Primary model size (small, medium, hindi, large)
    primary_model: str = INDIAN_ASR_MODEL
    # Fallback model
    fallback_model: str = ASR_FALLBACK_MODEL
    # Device configuration
    device: str = ASR_DEVICE  # auto, cuda, cpu, mps
    # Batch size for parallel processing
    batch_size: int = ASR_BATCH_SIZE
    # Enable dialect post-processing
    enable_dialect_enhancement: bool = True
    # Supported dialects
    supported_dialects: List[str] = field(default_factory=lambda: [
        "hindi", "haryanvi", "bhojpuri", "rajasthani", "gujarati",
        "marathi", "punjabi", "bengali", "tamil", "telugu"
    ])


@dataclass
class LLMConfig:
    """LLM configuration using open-source HuggingFace models.

    Models (all free, no API keys needed):
    - google/flan-t5-large: Fast, good quality (recommended)
    - microsoft/Phi-3-mini-4k-instruct: Better quality, slower
    - meta-llama/Llama-2-7b-chat-hf: Best quality, needs more VRAM
    - sarvamai/OpenHathi-7B-Hi-v0.1-Base: Hindi-specialized
    """
    # Provider: local (HuggingFace), ollama, or heuristic (no LLM)
    provider: str = LLM_PROVIDER
    # Primary model for narrative generation
    primary_model: str = LLM_MODEL
    # Hindi-specialized model for dialect content
    hindi_model: str = LLM_HINDI_MODEL
    # Ollama configuration (if using local Ollama)
    ollama_host: str = OLLAMA_HOST
    ollama_model: str = OLLAMA_MODEL
    # Generation parameters
    max_tokens: int = 512
    temperature: float = 0.7
    # Device
    device: str = LLM_DEVICE
    # Enable batch processing
    enable_batching: bool = True
    batch_size: int = 8


@dataclass
class VisualConfig:
    """Visual analysis configuration.

    Models:
    - openai/clip-vit-large-patch14: Standard CLIP (fast)
    - microsoft/Florence-2-large: Better scene understanding
    - Salesforce/blip2-opt-2.7b: Image captioning
    """
    # Primary model for visual understanding
    model: str = VISUAL_MODEL
    # Scene captioning model
    caption_model: str = CAPTION_MODEL
    # Device
    device: str = VISUAL_DEVICE
    # Frames to analyze per scene
    frames_per_scene: int = 3
    # Enable parallel frame processing
    parallel_frames: bool = True
    # Face detection for character tracking
    enable_face_detection: bool = True
    face_model: str = "retinaface"


@dataclass
class MusicConfig:
    """AI Music generation configuration using Meta's MusicGen."""
    enabled: bool = MUSIC_ENABLED
    # Model: small (fast), medium (balanced), large (best quality)
    model_size: str = MUSICGEN_MODEL
    device: str = MUSICGEN_DEVICE
    # Duration per segment
    default_duration: int = 30
    # Segments to generate per trailer
    segments_per_trailer: int = 2
    # Mix ratio with original audio
    music_volume: float = 0.25
    dialogue_volume: float = 0.85


@dataclass
class NarrativeConfig:
    """Professional narrative generation configuration.

    Trailer Structure (Production-Grade):
    - ACT 1: HOOK (5-10%) - Attention grabber, visual spectacle
    - ACT 2: WORLD (10-15%) - Setting, atmosphere
    - ACT 3: CHARACTER (20-25%) - Hero introduction, title
    - ACT 4: CONFLICT (30-35%) - Story beats, rising tension
    - ACT 5: CLIMAX TEASE (15-20%) - Suspense, question hook
    """
    # Available narrative styles (reduced to 2 for faster generation)
    default_styles: List[str] = field(default_factory=lambda: [
        "dramatic", "action"
    ])
    # Target duration (seconds)
    default_duration: int = 90
    # Shot constraints for production quality
    min_shots: int = 10
    max_shots: int = 18
    min_shot_duration: float = 2.5
    max_shot_duration: float = 8.0
    # Story beat requirements
    require_character_intro: bool = True
    require_hook_ending: bool = True
    require_title_card: bool = True
    # Suspense curve target (0-100 scale)
    suspense_peak_position: float = 0.85  # 85% into trailer
    # Overlap prevention between variants
    max_shot_overlap: float = 0.35
    # Enable parallel variant generation
    parallel_generation: bool = True


@dataclass
class AssemblyConfig:
    """Production-grade trailer assembly configuration."""
    # Output format
    default_format: str = "mp4"
    default_resolution: str = "1080p"
    default_bitrate: str = "12M"  # Higher for production quality
    # Codec settings for broadcast quality
    video_codec: str = "libx264"
    video_preset: str = "slow"  # Better compression
    video_crf: int = 18  # Higher quality
    audio_codec: str = "aac"
    audio_bitrate: str = "320k"  # Broadcast quality
    # Watermark (disable for production)
    include_watermark: bool = False
    watermark_text: str = "AI-Generated Preview"
    # Temp directory
    temp_dir: str = TEMP_DIR
    # Enable parallel shot extraction
    parallel_extraction: bool = True
    max_parallel_shots: int = 4
    # Transition settings
    default_transition_duration: float = 0.5
    enable_audio_ducking: bool = True
    dialogue_duck_level: float = 0.3  # Duck music during dialogue


@dataclass
class ParallelConfig:
    """Parallel processing configuration for speed."""
    # Enable parallel processing
    enabled: bool = True
    # Max workers for CPU-bound tasks
    max_cpu_workers: int = MAX_CPU_WORKERS
    # Max workers for I/O-bound tasks
    max_io_workers: int = MAX_IO_WORKERS
    # GPU batch sizes
    asr_batch_size: int = 4
    visual_batch_size: int = 8
    llm_batch_size: int = 4
    # Enable async I/O
    async_io: bool = True
    # Pipeline stages to run in parallel
    parallel_stages: List[str] = field(default_factory=lambda: [
        "scene_detection",
        "audio_analysis",
        "visual_analysis"
    ])


@dataclass
class Config:
    """Main configuration class - Production Grade."""
    s3: S3Config = field(default_factory=S3Config)
    indian_asr: IndianASRConfig = field(default_factory=IndianASRConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    visual: VisualConfig = field(default_factory=VisualConfig)
    music: MusicConfig = field(default_factory=MusicConfig)
    narrative: NarrativeConfig = field(default_factory=NarrativeConfig)
    assembly: AssemblyConfig = field(default_factory=AssemblyConfig)
    parallel: ParallelConfig = field(default_factory=ParallelConfig)

    # Paths
    prompts_dir: Path = Path(__file__).parent.parent / "prompts"
    output_dir: Path = field(default_factory=get_output_dir)
    models_cache_dir: Path = field(default_factory=get_models_cache_dir)

    # Processing limits
    max_video_duration: int = 14400  # 4 hours
    max_file_size: int = 50 * 1024 * 1024 * 1024  # 50GB

    # Progress reporting
    progress_enabled: bool = True
    progress_interval: int = 3  # seconds

    # Production mode (disables watermark, uses higher quality settings)
    production_mode: bool = PRODUCTION_MODE

    def __post_init__(self):
        """Apply production mode settings."""
        if self.production_mode:
            self.assembly.include_watermark = False
            self.assembly.video_preset = "slow"
            self.assembly.video_crf = 18
            self.assembly.audio_bitrate = "320k"


# Singleton config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get or create the configuration singleton."""
    global _config
    if _config is None:
        _config = Config()
    return _config


def reset_config() -> None:
    """Reset config singleton (for testing)."""
    global _config
    _config = None
