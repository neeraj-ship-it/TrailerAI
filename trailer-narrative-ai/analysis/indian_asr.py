"""Production-grade Indian Dialect ASR using HuggingFace Open-Source Models.

Features:
- Fast transcription with batched processing
- Indian dialect detection (Haryanvi, Bhojpuri, Rajasthani, Gujarati, Hindi)
- No paid APIs - all models are free and open-source
- Automatic model selection based on content
- GPU acceleration with automatic fallback

Models Used (Priority Order - FAST mode default):
1. openai/whisper-small - Fast, good quality (~460MB)
2. openai/whisper-medium - Better quality (~1.5GB)
3. vasista22/whisper-hindi-large-v2 - Best Hindi quality (~3GB)

Set WHISPER_MODEL env var to override: small, medium, large
"""

import re
import torch
import numpy as np
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple, Union
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
from loguru import logger

from config.constants import (
    WHISPER_MODEL, ASR_CHUNKED, ASR_CHUNK_DURATION,
    ASR_WORKERS, ASR_PARALLEL
)

# Lazy imports for optional dependencies
_transformers_available = False
_torchaudio_available = False
_librosa_available = False

try:
    from transformers import (
        AutoModelForCTC, AutoProcessor, AutoModelForSpeechSeq2Seq,
        AutoTokenizer, pipeline
    )
    _transformers_available = True
except ImportError:
    pass

try:
    import torchaudio
    _torchaudio_available = True
except ImportError:
    pass

try:
    import librosa
    _librosa_available = True
except ImportError:
    pass


# =============================================================================
# COMPREHENSIVE INDIAN DIALECT PATTERNS
# =============================================================================

DIALECT_PATTERNS = {
    "haryanvi": {
        "pronouns": ["thare", "mahre", "tanne", "manne", "apne", "unne", "inne"],
        "family": ["tau", "taai", "chhora", "chhori", "lugai", "byah", "bahu", "sasur"],
        "expressions": ["ghani", "ghano", "kai", "kyu", "kyun", "kithe", "kadd", "haan", "na"],
        "verbs": ["kar", "kare", "ja", "jaa", "aa", "aaja", "de", "le", "bol", "sun", "dekh"],
        "emotions": ["pyaar", "mohabaat", "laad", "dukh", "izzat", "kasam"],
        "unique": ["tau ke", "ghani khushi", "achha theek", "baat sun"],
        "weight": 1.5  # Priority dialect
    },
    "bhojpuri": {
        "pronouns": ["ham", "hum", "hamra", "hamar", "tohar", "tohra", "raua"],
        "family": ["maai", "babuji", "bhaiya", "didiya", "saiya", "piya", "mehararu"],
        "expressions": ["ba", "bate", "hoi", "hoyi", "ka", "kahe", "kaahe", "naikhe"],
        "verbs": ["kara", "karela", "jaai", "gail", "aai", "aail", "dela", "lela"],
        "emotions": ["jaan", "pran", "piritiya", "dard", "dukhwa", "lorwa"],
        "unique": ["ka hoi", "tohar ke", "hamra ke", "rowe la"],
        "weight": 1.5
    },
    "rajasthani": {
        "pronouns": ["mhare", "thare", "mhara", "thara", "mhari", "thari"],
        "family": ["bapu", "bai", "bapuji", "maaji", "banna", "banni"],
        "expressions": ["ghani", "ghano", "kai", "koni", "padharo", "khamma"],
        "verbs": ["kar", "karo", "ja", "jao", "aa", "aao", "de", "do", "le", "lo"],
        "emotions": ["laad", "laadli", "pyaaro", "preet", "prem"],
        "unique": ["padharo mhare", "khamma ghani", "thare sang"],
        "weight": 1.4
    },
    "gujarati": {
        "pronouns": ["hu", "hun", "tame", "tamne", "ame", "amne", "mari", "tari"],
        "family": ["bhai", "ben", "dikro", "dikri", "ba", "bapuji", "dada", "dadi"],
        "expressions": ["che", "chhe", "nathi", "haan", "na", "ghanu", "majama"],
        "verbs": ["karo", "karu", "jao", "javu", "aavo", "aavvu", "do", "aapo"],
        "emotions": ["prem", "laagni", "jiv", "moh", "dukh", "sukh"],
        "unique": ["kem cho", "shu thyu", "majama", "saru"],
        "weight": 1.3
    },
    "hindi": {
        "pronouns": ["main", "mujhe", "tum", "tumhe", "aap", "aapko", "hum", "hamein"],
        "family": ["maa", "papa", "bhai", "behen", "beta", "beti", "chacha", "chachi"],
        "expressions": ["kya", "kaun", "kaise", "kab", "kahan", "kyun", "haan", "nahi"],
        "verbs": ["karo", "karna", "jao", "jana", "aao", "aana", "do", "dena", "lo", "lena"],
        "emotions": ["pyaar", "dil", "mohabbat", "dard", "khushi", "gham"],
        "unique": ["kya hua", "kaise ho", "theek hai"],
        "weight": 1.0  # Base weight
    }
}

# Question patterns for hook detection
QUESTION_PATTERNS = {
    "haryanvi": ["kai", "kyu", "kyun", "kithe", "kadd", "kitna", "kiske"],
    "bhojpuri": ["ka", "kahe", "kaahe", "kaisan", "kahiya", "ketna", "kawan"],
    "rajasthani": ["kai", "kyu", "kaisyo", "koni", "kitna", "kisko"],
    "gujarati": ["su", "shu", "kem", "kyare", "kyaan", "kone", "ketlu"],
    "hindi": ["kya", "kaun", "kaise", "kab", "kahan", "kyun", "kitna"]
}

# Spoiler words to avoid in trailer
SPOILER_PATTERNS = [
    # Endings/Revelations
    "mar gaya", "mar gya", "mar gail", "mar gyo", "mari gayo",
    "khatam", "ant", "the end", "finally", "revealed",
    "sach yeh hai", "isliye", "kyunki", "because",
    # Victory/Defeat
    "jeet gaye", "jeet gye", "jeet gailein", "jitya",
    "haar gaye", "haar gye", "haar gailein", "harya",
    # Death references
    "died", "dead", "killed", "murder",
    # Story conclusions
    "solved", "answer", "truth is", "ending"
]


@dataclass
class TranscriptSegment:
    """A transcribed audio segment with dialect information."""
    id: int
    start_time: float
    end_time: float
    text: str
    confidence: float = 0.0
    language: str = "hi"
    dialect: Optional[str] = None
    dialect_confidence: float = 0.0
    is_question: bool = False
    emotional_score: int = 0
    has_spoiler: bool = False
    speaker_id: Optional[str] = None

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "text": self.text,
            "duration": self.duration,
            "confidence": self.confidence,
            "language": self.language,
            "dialect": self.dialect,
            "dialect_confidence": self.dialect_confidence,
            "is_question": self.is_question,
            "emotional_score": self.emotional_score,
            "has_spoiler": self.has_spoiler,
            "speaker_id": self.speaker_id
        }


@dataclass
class ASRResult:
    """Complete ASR result with dialect analysis."""
    segments: List[TranscriptSegment]
    full_text: str
    total_duration: float
    primary_language: str
    primary_dialect: Optional[str]
    dialect_confidence: float
    dialect_distribution: Dict[str, float]
    processing_time: float
    model_used: str
    word_count: int

    @property
    def language(self) -> str:
        """Alias for primary_language - required by json_formatter."""
        return self.primary_language

    def to_dict(self) -> Dict[str, Any]:
        return {
            "segments": [s.to_dict() for s in self.segments],
            "full_text": self.full_text,
            "total_duration": self.total_duration,
            "primary_language": self.primary_language,
            "primary_dialect": self.primary_dialect,
            "dialect_confidence": self.dialect_confidence,
            "dialect_distribution": self.dialect_distribution,
            "processing_time": self.processing_time,
            "model_used": self.model_used,
            "word_count": self.word_count
        }

    def get_segments_in_range(self, start: float, end: float) -> List[TranscriptSegment]:
        """Get segments within a time range."""
        return [s for s in self.segments if s.start_time < end and s.end_time > start]


class IndianDialectASR:
    """Production-grade ASR for Indian dialects using HuggingFace models.

    Features:
    - Automatic model selection based on detected language
    - Batched processing for speed
    - Comprehensive dialect detection
    - No paid APIs required
    """

    # Supported models (all free, open-source) - FAST models first
    MODELS = {
        # FAST models (recommended for quick processing)
        "whisper_small": "openai/whisper-small",      # ~460MB - FAST, good quality
        "whisper_base": "openai/whisper-base",        # ~140MB - FASTEST
        "whisper_medium": "openai/whisper-medium",    # ~1.5GB - balanced
        # HIGH QUALITY models (for production, slower download)
        "whisper_hindi": "vasista22/whisper-hindi-large-v2",  # ~3GB - best Hindi
        "whisper_large": "openai/whisper-large-v3",   # ~6GB - best quality
        "indicwav2vec": "ai4bharat/indicwav2vec-hindi",
        "mms_hindi": "facebook/mms-1b-all",
    }

    def __init__(
        self,
        model_name: str = "auto",
        device: Optional[str] = None,
        batch_size: int = 4,
        enable_dialect_detection: bool = True
    ):
        """Initialize Indian ASR.

        Args:
            model_name: Model to use (auto, indicwav2vec, whisper_hindi, whisper_large)
            device: Device (auto, cuda, cpu, mps)
            batch_size: Batch size for processing
            enable_dialect_detection: Enable dialect post-processing
        """
        self.model_name = model_name
        self.batch_size = batch_size
        self.enable_dialect_detection = enable_dialect_detection

        # Auto-detect device
        self.device = self._detect_device(device)

        # Lazy model loading
        self._model = None
        self._processor = None
        self._pipeline = None
        self._model_loaded = None

        logger.info(f"IndianDialectASR initialized: device={self.device}, batch_size={batch_size}")

    def _detect_device(self, device: Optional[str]) -> str:
        """Auto-detect the best available device."""
        if device and device != "auto":
            return device

        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self, model_key: str = "whisper_hindi"):
        """Load the specified model."""
        if self._model_loaded == model_key:
            return

        model_path = self.MODELS.get(model_key, model_key)
        logger.info(f"Loading ASR model: {model_path}")

        try:
            if "whisper" in model_key.lower() or "whisper" in model_path.lower():
                # Determine device for pipeline
                if self.device == "cuda":
                    pipe_device = 0
                    pipe_dtype = torch.float16
                elif self.device == "mps":
                    pipe_device = "mps"
                    pipe_dtype = torch.float32  # MPS works better with float32
                else:
                    pipe_device = -1  # CPU
                    pipe_dtype = torch.float32

                logger.info(f"Using device: {self.device} (pipeline device: {pipe_device})")

                # Use Whisper pipeline for best compatibility
                self._pipeline = pipeline(
                    "automatic-speech-recognition",
                    model=model_path,
                    device=pipe_device,
                    torch_dtype=pipe_dtype,
                    chunk_length_s=30,
                    batch_size=self.batch_size
                )
                self._model_loaded = model_key
                logger.info(f"Loaded Whisper model: {model_path} on {self.device}")

            elif "indicwav2vec" in model_path.lower() or "wav2vec" in model_path.lower():
                # Load wav2vec2 model
                self._processor = AutoProcessor.from_pretrained(model_path)
                self._model = AutoModelForCTC.from_pretrained(model_path)
                self._model.to(self.device)
                self._model.eval()
                self._model_loaded = model_key
                logger.info(f"Loaded Wav2Vec model: {model_path}")

            else:
                # Fallback to pipeline
                self._pipeline = pipeline(
                    "automatic-speech-recognition",
                    model=model_path,
                    device=0 if self.device == "cuda" else -1
                )
                self._model_loaded = model_key

        except Exception as e:
            logger.warning(f"Failed to load {model_path}: {e}")
            # Fallback to smaller/faster Whisper model
            if model_key != "whisper_small":
                logger.info("Falling back to whisper-small (fast, ~460MB)")
                self._load_model("whisper_small")

    def transcribe(
        self,
        audio_path: Union[str, Path],
        subtitle_path: Optional[Union[str, Path]] = None,
        language: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> ASRResult:
        """Transcribe audio with Indian dialect detection.

        Args:
            audio_path: Path to audio/video file
            subtitle_path: Optional subtitle file (skips transcription)
            language: Language hint (None for auto-detect)
            progress_callback: Optional callback(progress_pct, message) for progress updates

        Returns:
            ASRResult with dialect analysis
        """
        import time
        start_time = time.time()

        def report(pct: float, msg: str):
            if progress_callback:
                progress_callback(pct, msg)

        # Use subtitles if provided
        if subtitle_path:
            report(10, "Parsing subtitle file...")
            result = self._from_subtitles(subtitle_path)
            result.processing_time = time.time() - start_time
            report(100, f"Parsed {len(result.segments)} segments")
            return result

        # Load appropriate model
        report(5, "Selecting model...")
        model_key = self._select_model(language)
        report(10, f"Loading {model_key} model...")
        self._load_model(model_key)
        report(20, "Model loaded, starting transcription...")

        # Transcribe directly from file (pipeline handles audio loading via ffmpeg)
        # This avoids torchaudio/librosa issues - Whisper pipeline reads video/audio directly!
        segments = self._transcribe_direct(str(audio_path), progress_callback=progress_callback)

        # Post-process: detect dialects, questions, emotions
        if self.enable_dialect_detection:
            segments = self._enhance_segments(segments)

        # Build result
        full_text = " ".join(s.text for s in segments)
        dialect_dist = self._calculate_dialect_distribution(segments)
        primary_dialect, dialect_conf = self._get_primary_dialect(dialect_dist)

        processing_time = time.time() - start_time
        logger.info(
            f"Transcription complete: {len(segments)} segments, "
            f"{processing_time:.1f}s, dialect: {primary_dialect}"
        )

        return ASRResult(
            segments=segments,
            full_text=full_text,
            total_duration=segments[-1].end_time if segments else 0,
            primary_language="hi",
            primary_dialect=primary_dialect,
            dialect_confidence=dialect_conf,
            dialect_distribution=dialect_dist,
            processing_time=processing_time,
            model_used=self._model_loaded or "unknown",
            word_count=len(full_text.split())
        )

    def _select_model(self, language: Optional[str]) -> str:
        """Select appropriate model based on language hint.

        Uses FAST models by default. Set WHISPER_MODEL env var to override:
        - small (default, ~460MB, fast)
        - medium (~1.5GB, balanced)
        - hindi (~3GB, best for Hindi)
        - large (~6GB, best quality)
        """
        if self.model_name != "auto":
            return self.model_name

        # Get model from constants
        env_model = WHISPER_MODEL.lower()

        model_map = {
            "small": "whisper_small",
            "base": "whisper_base",
            "medium": "whisper_medium",
            "hindi": "whisper_hindi",
            "large": "whisper_large",
        }

        if env_model in model_map:
            logger.info(f"Using Whisper model: {env_model} (from WHISPER_MODEL env)")
            return model_map[env_model]

        # Default to whisper_small for FAST processing
        logger.info("Using whisper-small for fast processing (set WHISPER_MODEL=hindi for better quality)")
        return "whisper_small"

    def _load_audio(self, audio_path: Union[str, Path]) -> Tuple[np.ndarray, int]:
        """Load audio file and resample to 16kHz.

        Handles both audio files and video files (extracts audio from video).
        """
        audio_path = str(audio_path)
        target_sr = 16000

        # Check if this is a video file that needs audio extraction
        video_extensions = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.m4v']
        file_ext = Path(audio_path).suffix.lower()

        if file_ext in video_extensions:
            # Extract audio from video using ffmpeg
            audio_path = self._extract_audio_from_video(audio_path, target_sr)

        if _torchaudio_available:
            try:
                waveform, sr = torchaudio.load(audio_path)
                if sr != target_sr:
                    resampler = torchaudio.transforms.Resample(sr, target_sr)
                    waveform = resampler(waveform)
                # Convert to mono if stereo
                if waveform.shape[0] > 1:
                    waveform = waveform.mean(dim=0, keepdim=True)
                return waveform.squeeze().numpy(), target_sr
            except Exception as e:
                logger.warning(f"torchaudio failed: {e}, trying librosa")

        if _librosa_available:
            audio, sr = librosa.load(audio_path, sr=target_sr, mono=True)
            return audio, target_sr

        raise ImportError("Either torchaudio or librosa is required for audio loading")

    def _extract_audio_from_video(self, video_path: str, target_sr: int = 16000) -> str:
        """Extract audio from video file using ffmpeg.

        Args:
            video_path: Path to video file
            target_sr: Target sample rate

        Returns:
            Path to extracted audio file (WAV)
        """
        import subprocess
        import tempfile

        # Create temp file for extracted audio
        temp_dir = tempfile.gettempdir()
        audio_file = Path(temp_dir) / f"trailer_ai_audio_{Path(video_path).stem}.wav"

        # If already extracted and recent, reuse it (check file size > 0)
        if audio_file.exists() and audio_file.stat().st_size > 1000:
            logger.info(f"Using cached audio extraction: {audio_file} ({audio_file.stat().st_size / 1024 / 1024:.1f}MB)")
            return str(audio_file)

        # Remove incomplete file if exists
        if audio_file.exists():
            audio_file.unlink()

        logger.info(f"Extracting audio from video: {video_path}")

        # Use ffmpeg to extract audio
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # PCM 16-bit
            '-ar', str(target_sr),  # Sample rate
            '-ac', '1',  # Mono
            str(audio_file)
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode != 0:
                logger.warning(f"ffmpeg audio extraction failed: {result.stderr[:500]}")
                # Try alternative with moviepy
                return self._extract_audio_moviepy(video_path, str(audio_file), target_sr)

            logger.info(f"Audio extracted successfully: {audio_file}")
            return str(audio_file)

        except FileNotFoundError:
            logger.warning("ffmpeg not found, trying moviepy")
            return self._extract_audio_moviepy(video_path, str(audio_file), target_sr)
        except subprocess.TimeoutExpired:
            logger.warning("ffmpeg timed out, trying moviepy")
            return self._extract_audio_moviepy(video_path, str(audio_file), target_sr)

    def _extract_audio_moviepy(self, video_path: str, output_path: str, target_sr: int) -> str:
        """Fallback audio extraction using moviepy."""
        try:
            from moviepy.editor import VideoFileClip

            logger.info("Extracting audio using moviepy...")
            video = VideoFileClip(video_path)
            audio = video.audio

            if audio is not None:
                audio.write_audiofile(
                    output_path,
                    fps=target_sr,
                    nbytes=2,
                    codec='pcm_s16le',
                    verbose=False,
                    logger=None
                )
                video.close()
                logger.info(f"Audio extracted with moviepy: {output_path}")
                return output_path
            else:
                video.close()
                raise ValueError("Video has no audio track")

        except ImportError:
            raise ImportError("Neither ffmpeg nor moviepy available for audio extraction")
        except Exception as e:
            raise RuntimeError(f"Failed to extract audio: {e}")

    def _transcribe_direct(self, file_path: str, progress_callback: Optional[callable] = None) -> List[TranscriptSegment]:
        """Transcribe directly from file using OpenAI Whisper (with progress bar).

        For long videos (>30 min), uses parallel chunk processing for speed.

        Args:
            file_path: Path to video/audio file
            progress_callback: Optional callback(progress_pct, message) for progress updates
        """
        logger.info(f"Transcribing: {Path(file_path).name}")

        def report(pct: float, msg: str):
            if progress_callback:
                progress_callback(pct, msg)

        # Get video duration
        try:
            import subprocess
            cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                   '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
            proc_result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            duration = float(proc_result.stdout.strip())
            logger.info(f"Video duration: {duration/60:.1f} minutes")
            report(25, f"Video duration: {duration/60:.1f} min")
        except:
            duration = 0

        # For long videos, optionally use chunked processing
        # By default, use Whisper's native long-form transcription which is more stable
        use_chunked = ASR_CHUNKED
        if use_chunked and duration > 1800:  # Only if explicitly enabled and >30 min
            logger.info(f"Long video detected ({duration/60:.1f} min) - using chunked transcription")
            report(30, f"Long video - using chunked transcription")
            return self._transcribe_parallel(file_path, duration, progress_callback)

        # Estimate transcription time (roughly 0.1-0.3x realtime depending on model)
        # small=0.1x, medium=0.2x, large=0.3x
        model_speed = {"small": 0.1, "base": 0.08, "medium": 0.2, "large": 0.3, "hindi": 0.3}
        model_key = self._model_loaded.replace("whisper_", "") if self._model_loaded else "medium"
        speed_factor = model_speed.get(model_key, 0.2)
        estimated_time = duration * speed_factor

        if duration > 3600:  # > 1 hour
            logger.info(f"Long video: {duration/60:.1f} min - this may take a while...")
            logger.info("TIP: Use WHISPER_MODEL=small for 3x faster processing")
            report(30, f"Long video ({duration/60:.0f} min) - estimated {estimated_time/60:.0f} min to transcribe")
        elif duration > 0:
            report(30, f"Transcribing {duration/60:.1f} min video (est. {estimated_time/60:.1f} min)...")

        # Try OpenAI Whisper first (has progress bar!)
        try:
            import whisper
            logger.info("Using OpenAI Whisper (with progress bar)")

            # Load model
            model_size = self._model_loaded.replace("whisper_", "") if self._model_loaded else "medium"
            if model_size.startswith("openai/whisper-"):
                model_size = model_size.replace("openai/whisper-", "")

            # IMPORTANT: Use CPU for Whisper - MPS has sparse tensor issues
            # MPS error: "Could not run 'aten::_sparse_coo_tensor_with_dims_and_tensors' with SparseMPS"
            whisper_device = "cpu"  # Force CPU - MPS doesn't work with Whisper
            logger.info(f"Loading whisper {model_size} model on CPU...")
            logger.info("(Note: Using CPU because MPS has compatibility issues with Whisper)")
            report(35, f"Loading Whisper {model_size} model...")

            model = whisper.load_model(model_size, device=whisper_device)
            logger.info(f"Model loaded on {whisper_device}")
            report(40, "Model loaded, transcribing... (see Whisper progress below)")

            # Transcribe with progress
            logger.info("Transcribing... (progress bar will show)")
            import time
            start = time.time()

            result = model.transcribe(
                file_path,
                language="hi",
                task="transcribe",
                verbose=True  # Shows progress!
            )

            elapsed = time.time() - start
            logger.info(f"Transcription finished in {elapsed/60:.1f} minutes")
            report(95, f"Transcription complete ({elapsed/60:.1f} min)")

            # Convert to segments
            segments = []
            for i, seg in enumerate(result.get("segments", [])):
                text = seg.get("text", "").strip()
                if text and len(text) > 2:
                    segments.append(TranscriptSegment(
                        id=i + 1,  # Required field!
                        start_time=float(seg.get("start", 0)),
                        end_time=float(seg.get("end", 0)),
                        text=text,
                        confidence=0.85
                    ))

            logger.info(f"Found {len(segments)} dialogue segments")
            report(100, f"Found {len(segments)} dialogue segments")
            for seg in segments[:5]:
                logger.info(f"  [{seg.start_time:.1f}s] \"{seg.text[:60]}\"")

            return segments

        except ImportError:
            logger.warning("openai-whisper not installed, using HuggingFace pipeline (no progress bar)")
        except Exception as e:
            logger.error(f"OpenAI Whisper transcription failed: {e}")
            logger.warning("Falling back to HuggingFace pipeline")

        # Fallback to HuggingFace pipeline
        if self._pipeline is None:
            logger.error("No ASR pipeline available - model failed to load")
            logger.info("Returning empty segments. Please check model installation.")
            report(100, "Failed - no ASR pipeline available")
            return []

        logger.info("Using HuggingFace pipeline (no progress bar - please wait)")
        report(45, "Using HuggingFace pipeline (this may take a while)...")
        import time
        start = time.time()

        try:
            result = self._pipeline(
                file_path,
                return_timestamps=True,
                generate_kwargs={
                    "language": "hi",
                    "task": "transcribe"
                }
            )
        except Exception as e:
            logger.error(f"HuggingFace pipeline transcription failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            report(100, "Failed - HuggingFace pipeline error")
            return []

        elapsed = time.time() - start
        logger.info(f"Transcription finished in {elapsed/60:.1f} minutes")
        report(95, f"Transcription complete ({elapsed/60:.1f} min)")

        logger.info("Transcription complete, processing segments...")

        segments = []
        chunks = result.get("chunks", [])

        if not chunks and "text" in result:
            # Fallback for single chunk
            text = result["text"].strip()
            if text:
                segments.append(TranscriptSegment(
                    id=1,  # Required field!
                    start_time=0.0,
                    end_time=60.0,
                    text=text,
                    confidence=0.8
                ))
            return segments

        for i, chunk in enumerate(chunks):
            text = chunk.get("text", "").strip()
            if not text or len(text) < 2:
                continue

            # Handle timestamp safely - could be None or malformed
            timestamp = chunk.get("timestamp")
            if timestamp is None or not isinstance(timestamp, (list, tuple)) or len(timestamp) < 2:
                timestamp = (0, 5)  # Default 5 second segment

            try:
                seg_start = float(timestamp[0]) if timestamp[0] is not None else 0
                seg_end = float(timestamp[1]) if timestamp[1] is not None else seg_start + 5
            except (TypeError, ValueError):
                seg_start = 0
                seg_end = 5

            segment = TranscriptSegment(
                id=i + 1,  # Required field!
                start_time=seg_start,
                end_time=seg_end,
                text=text,
                confidence=0.85
            )
            segments.append(segment)

        logger.info(f"Found {len(segments)} dialogue segments")
        report(100, f"Found {len(segments)} dialogue segments")
        for seg in segments[:3]:
            logger.info(f"  [{seg.start_time:.1f}s] \"{seg.text[:50]}...\"")

        return segments

    def _transcribe_parallel(self, file_path: str, duration: float, progress_callback: Optional[callable] = None) -> List[TranscriptSegment]:
        """Transcribe long video using parallel chunk processing.

        Splits audio into chunks and processes them concurrently for faster transcription.
        Ideal for videos >30 minutes.

        Args:
            file_path: Path to video/audio file
            duration: Total duration in seconds
            progress_callback: Optional callback(progress_pct, message) for progress updates

        Returns:
            List of TranscriptSegment with correct timestamps
        """
        def report(pct: float, msg: str):
            if progress_callback:
                progress_callback(pct, msg)
        import subprocess
        import tempfile
        from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
        import multiprocessing

        # Configuration
        chunk_duration = ASR_CHUNK_DURATION
        overlap = 2  # 2 second overlap to avoid cutting words

        # Determine model size early (needed for memory estimation)
        model_size = self._model_loaded.replace("whisper_", "") if self._model_loaded else "medium"
        if model_size.startswith("openai/whisper-"):
            model_size = model_size.replace("openai/whisper-", "")

        # IMPORTANT: Default to 1 worker (sequential) to avoid OOM
        # The medium model is ~3GB, scene detection also uses memory
        # Increase ASR_WORKERS in constants.py if you have enough RAM
        max_workers = ASR_WORKERS

        # Check available memory and warn if too low
        try:
            import psutil
            available_gb = psutil.virtual_memory().available / (1024**3)
            model_mem_gb = {"small": 1.5, "base": 0.5, "medium": 3, "large": 6}.get(model_size, 3)

            if available_gb < model_mem_gb + 2:  # Need model + 2GB headroom
                logger.warning(
                    f"Low memory warning: {available_gb:.1f}GB available, model needs ~{model_mem_gb}GB. "
                    f"Consider using WHISPER_MODEL=small for lower memory usage."
                )

            # Force single worker if memory is really tight
            if max_workers > 1 and available_gb < (model_mem_gb * max_workers + 2):
                logger.warning(f"Forcing single worker due to memory constraints")
                max_workers = 1
        except ImportError:
            pass  # psutil not available, continue with default

        logger.info(f"Parallel ASR config: {chunk_duration}s chunks, {max_workers} workers")

        # Calculate chunks
        chunks = []
        start = 0
        chunk_idx = 0
        while start < duration:
            end = min(start + chunk_duration, duration)
            chunks.append({
                "idx": chunk_idx,
                "start": start,
                "end": end,
                "duration": end - start
            })
            start = end - overlap  # Small overlap
            chunk_idx += 1

        logger.info(f"Split into {len(chunks)} chunks for parallel processing")
        report(35, f"Split into {len(chunks)} chunks")

        # Extract audio chunks using ffmpeg
        temp_dir = tempfile.mkdtemp(prefix="asr_chunks_")
        chunk_files = []

        logger.info("Extracting audio chunks...")
        report(40, "Extracting audio chunks...")
        for chunk in chunks:
            chunk_file = Path(temp_dir) / f"chunk_{chunk['idx']:03d}.wav"
            cmd = [
                'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                '-ss', str(chunk['start']),
                '-i', file_path,
                '-t', str(chunk['duration'] + overlap),  # Add overlap
                '-vn',  # No video
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                str(chunk_file)
            ]
            try:
                subprocess.run(cmd, check=True, capture_output=True, timeout=120)
                chunk_files.append({
                    **chunk,
                    "file": str(chunk_file)
                })
            except Exception as e:
                logger.warning(f"Failed to extract chunk {chunk['idx']}: {e}")

        logger.info(f"Extracted {len(chunk_files)} audio chunks")
        logger.info(f"Using Whisper {model_size} model for chunked transcription...")
        report(45, f"Extracted {len(chunk_files)} chunks, starting transcription...")

        # Choose between parallel and sequential processing
        # Parallel: Faster but uses more memory (loads model per worker ~2-4GB each)
        # Sequential: Slower but memory-efficient (single model, default)
        # Set ASR_PARALLEL=True in constants.py to enable parallel mode if you have enough RAM
        use_parallel = ASR_PARALLEL

        # Force sequential if only 1 worker anyway
        if max_workers <= 1:
            use_parallel = False

        import time
        start_time = time.time()
        results = []
        completed = 0

        if use_parallel and max_workers > 1:
            # PARALLEL MODE: Multiple workers, each loads own model
            logger.info(f"Starting PARALLEL transcription with {max_workers} workers...")
            logger.info("(Set ASR_PARALLEL=false for memory-efficient sequential mode)")

            def transcribe_chunk(chunk_info):
                """Transcribe a single chunk."""
                try:
                    import whisper
                    # Each thread loads its own model
                    model = whisper.load_model(model_size, device="cpu")
                    result = model.transcribe(
                        chunk_info["file"],
                        language="hi",
                        task="transcribe",
                        verbose=False
                    )
                    return {
                        "idx": chunk_info["idx"],
                        "start_offset": chunk_info["start"],
                        "segments": result.get("segments", []),
                        "success": True
                    }
                except Exception as e:
                    logger.error(f"Chunk {chunk_info['idx']} failed: {e}")
                    return {
                        "idx": chunk_info["idx"],
                        "start_offset": chunk_info["start"],
                        "segments": [],
                        "success": False
                    }

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_chunk = {
                    executor.submit(transcribe_chunk, chunk): chunk
                    for chunk in chunk_files
                }

                for future in as_completed(future_to_chunk):
                    chunk = future_to_chunk[future]
                    try:
                        result = future.result()
                        results.append(result)
                        completed += 1
                        elapsed = time.time() - start_time
                        eta = (elapsed / completed) * (len(chunk_files) - completed) if completed > 0 else 0
                        chunk_pct = 100 * completed / len(chunk_files)
                        # Map chunk progress (0-100%) to overall progress (45-95%)
                        overall_pct = 45 + (chunk_pct * 0.5)
                        logger.info(
                            f"Progress: {completed}/{len(chunk_files)} chunks "
                            f"({chunk_pct:.0f}%) - ETA: {eta/60:.1f} min"
                        )
                        report(overall_pct, f"Transcribing: {completed}/{len(chunk_files)} chunks ({chunk_pct:.0f}%)")
                    except Exception as e:
                        logger.error(f"Chunk processing failed: {e}")

        else:
            # SEQUENTIAL MODE: Single model, process chunks one by one (memory-efficient, default)
            logger.info(f"Starting chunked transcription: {len(chunk_files)} chunks of {chunk_duration}s each")
            logger.info("(Memory-efficient mode. Set ASR_PARALLEL=true for faster but high-memory parallel mode)")

            try:
                import whisper
                model = whisper.load_model(model_size, device="cpu")
                logger.info(f"Model loaded: {model_size}")

                for chunk_info in chunk_files:
                    try:
                        result = model.transcribe(
                            chunk_info["file"],
                            language="hi",
                            task="transcribe",
                            verbose=False
                        )
                        results.append({
                            "idx": chunk_info["idx"],
                            "start_offset": chunk_info["start"],
                            "segments": result.get("segments", []),
                            "success": True
                        })
                    except Exception as e:
                        logger.error(f"Chunk {chunk_info['idx']} failed: {e}")
                        results.append({
                            "idx": chunk_info["idx"],
                            "start_offset": chunk_info["start"],
                            "segments": [],
                            "success": False
                        })

                    completed += 1
                    elapsed = time.time() - start_time
                    eta = (elapsed / completed) * (len(chunk_files) - completed) if completed > 0 else 0
                    chunk_pct = 100 * completed / len(chunk_files)
                    # Map chunk progress (0-100%) to overall progress (45-95%)
                    overall_pct = 45 + (chunk_pct * 0.5)
                    logger.info(
                        f"Progress: {completed}/{len(chunk_files)} chunks "
                        f"({chunk_pct:.0f}%) - ETA: {eta/60:.1f} min"
                    )
                    report(overall_pct, f"Transcribing: {completed}/{len(chunk_files)} chunks ({chunk_pct:.0f}%)")
            except ImportError:
                logger.error("openai-whisper not installed for sequential processing")
                return []

        # Sort results by chunk index
        results.sort(key=lambda x: x["idx"])
        report(95, "Merging transcribed segments...")

        # Merge segments with timestamp offsets
        all_segments = []
        segment_id = 1
        seen_texts = set()  # Deduplicate overlapping segments

        for result in results:
            if not result["success"]:
                continue

            offset = result["start_offset"]
            for seg in result["segments"]:
                text = seg.get("text", "").strip()
                if not text or len(text) < 3:
                    continue

                # Deduplicate based on similar text (from overlap)
                text_key = text[:50].lower()
                if text_key in seen_texts:
                    continue
                seen_texts.add(text_key)

                seg_start = float(seg.get("start", 0)) + offset
                seg_end = float(seg.get("end", 0)) + offset

                all_segments.append(TranscriptSegment(
                    id=segment_id,
                    start_time=seg_start,
                    end_time=seg_end,
                    text=text,
                    confidence=0.85
                ))
                segment_id += 1

        # Sort by start time
        all_segments.sort(key=lambda s: s.start_time)

        # Cleanup temp files
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except:
            pass

        elapsed = time.time() - start_time
        speedup = duration / elapsed if elapsed > 0 else 1
        logger.info(
            f"Parallel transcription complete: {len(all_segments)} segments in {elapsed/60:.1f} min "
            f"(~{speedup:.1f}x realtime)"
        )
        report(100, f"Complete: {len(all_segments)} segments in {elapsed/60:.1f} min")

        # Log sample segments
        for seg in all_segments[:5]:
            logger.info(f"  [{seg.start_time:.1f}s] \"{seg.text[:60]}\"")

        return all_segments

    def _transcribe_with_pipeline(
        self,
        audio: np.ndarray,
        sample_rate: int
    ) -> List[TranscriptSegment]:
        """Transcribe using HuggingFace pipeline (legacy - uses audio array)."""
        # Prepare input
        inputs = {"raw": audio, "sampling_rate": sample_rate}

        logger.info(f"Transcribing {len(audio)/sample_rate:.1f}s of audio...")

        # Transcribe with timestamps - use Hindi language for Indian dialects
        # Whisper will transcribe Haryanvi/Bhojpuri/Rajasthani/Gujarati as Hindi text
        result = self._pipeline(
            inputs,
            return_timestamps=True,
            generate_kwargs={
                "language": "hi",  # Hindi - covers all Indian dialects
                "task": "transcribe"
            }
        )

        logger.info(f"Transcription complete, processing segments...")

        segments = []
        chunks = result.get("chunks", [])

        if not chunks and "text" in result:
            # No chunks, create single segment
            segments.append(TranscriptSegment(
                id=1,
                start_time=0.0,
                end_time=len(audio) / sample_rate,
                text=result["text"].strip(),
                confidence=0.9
            ))
        else:
            for i, chunk in enumerate(chunks):
                timestamp = chunk.get("timestamp", (0, 0))
                start = timestamp[0] if timestamp[0] else 0
                end = timestamp[1] if timestamp[1] else start + 5

                segments.append(TranscriptSegment(
                    id=i + 1,
                    start_time=float(start),
                    end_time=float(end),
                    text=chunk.get("text", "").strip(),
                    confidence=0.85
                ))

        return segments

    def _transcribe_with_model(
        self,
        audio: np.ndarray,
        sample_rate: int
    ) -> List[TranscriptSegment]:
        """Transcribe using direct model inference (wav2vec2)."""
        # Process input
        inputs = self._processor(
            audio,
            sampling_rate=sample_rate,
            return_tensors="pt",
            padding=True
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Inference
        with torch.no_grad():
            logits = self._model(**inputs).logits

        # Decode
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = self._processor.batch_decode(predicted_ids)[0]

        # Create single segment (wav2vec doesn't provide timestamps easily)
        return [TranscriptSegment(
            id=1,
            start_time=0.0,
            end_time=len(audio) / sample_rate,
            text=transcription.strip(),
            confidence=0.8
        )]

    def _from_subtitles(self, subtitle_path: Union[str, Path]) -> ASRResult:
        """Create ASRResult from subtitle file."""
        from input.subtitle_parser import SubtitleParser

        try:
            parser = SubtitleParser()
            parsed = parser.parse(subtitle_path)
        except Exception as e:
            logger.error(f"Failed to parse subtitle file {subtitle_path}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Return empty result
            return ASRResult(
                segments=[],
                full_text="",
                total_duration=0,
                primary_language="hi",
                primary_dialect=None,
                dialect_confidence=0,
                dialect_distribution={},
                processing_time=0,
                model_used="subtitle_file_failed",
                word_count=0
            )

        segments = []
        for i, seg in enumerate(parsed.segments):
            # Handle potential None values safely
            seg_id = seg.index if seg.index is not None else (i + 1)
            seg_start = float(seg.start_time) if seg.start_time is not None else 0.0
            seg_end = float(seg.end_time) if seg.end_time is not None else seg_start + 5.0
            seg_text = seg.text if seg.text else ""
            seg_speaker = seg.speaker if hasattr(seg, 'speaker') else None

            if not seg_text.strip():
                continue  # Skip empty segments

            ts = TranscriptSegment(
                id=seg_id,
                start_time=seg_start,
                end_time=seg_end,
                text=seg_text.strip(),
                confidence=1.0,
                speaker_id=seg_speaker
            )
            segments.append(ts)

        if self.enable_dialect_detection:
            segments = self._enhance_segments(segments)

        full_text = " ".join(s.text for s in segments)
        dialect_dist = self._calculate_dialect_distribution(segments)
        primary_dialect, dialect_conf = self._get_primary_dialect(dialect_dist)

        return ASRResult(
            segments=segments,
            full_text=full_text,
            total_duration=parsed.total_duration,
            primary_language=parsed.language or "hi",
            primary_dialect=primary_dialect,
            dialect_confidence=dialect_conf,
            dialect_distribution=dialect_dist,
            processing_time=0.0,
            model_used="subtitle_file",
            word_count=len(full_text.split())
        )

    def _enhance_segments(self, segments: List[TranscriptSegment]) -> List[TranscriptSegment]:
        """Enhance segments with dialect detection and analysis."""
        for seg in segments:
            text_lower = seg.text.lower()

            # Detect dialect
            dialect, conf = self._detect_dialect(seg.text)
            seg.dialect = dialect
            seg.dialect_confidence = conf

            # Detect questions
            seg.is_question = self._is_question(text_lower)

            # Calculate emotional score
            seg.emotional_score = self._calculate_emotional_score(text_lower)

            # Check for spoilers
            seg.has_spoiler = self._has_spoiler(text_lower)

        return segments

    def _detect_dialect(self, text: str) -> Tuple[Optional[str], float]:
        """Detect dialect from text."""
        if not text:
            return None, 0.0

        text_lower = text.lower()
        words = text_lower.split()
        total_words = max(len(words), 1)

        scores = {}

        for dialect, patterns in DIALECT_PATTERNS.items():
            score = 0
            matches = set()

            # Check each pattern category
            for category in ["pronouns", "family", "expressions", "verbs", "emotions", "unique"]:
                category_patterns = patterns.get(category, [])
                for pattern in category_patterns:
                    # Word boundary matching
                    if f" {pattern} " in f" {text_lower} ":
                        score += 3 if category == "unique" else 2
                        matches.add(pattern)
                    elif pattern in text_lower:
                        score += 1.5 if category == "unique" else 1
                        matches.add(pattern)

            if score > 0:
                # Apply dialect weight
                weight = patterns.get("weight", 1.0)
                scores[dialect] = score * weight

        if not scores:
            return None, 0.0

        # Get best match
        best_dialect = max(scores, key=scores.get)
        best_score = scores[best_dialect]

        # Normalize confidence
        confidence = min(1.0, best_score / (total_words * 0.5))

        # Require minimum confidence
        if confidence < 0.15:
            return None, 0.0

        return best_dialect, round(confidence, 2)

    def _is_question(self, text: str) -> bool:
        """Check if text is a question."""
        if "?" in text:
            return True

        text_lower = text.lower()
        for dialect, patterns in QUESTION_PATTERNS.items():
            for pattern in patterns:
                if f" {pattern} " in f" {text_lower} " or text_lower.startswith(pattern):
                    return True

        return False

    def _calculate_emotional_score(self, text: str) -> int:
        """Calculate emotional intensity score (0-100)."""
        score = 0
        text_lower = text.lower()

        # Check emotional patterns across all dialects
        for dialect, patterns in DIALECT_PATTERNS.items():
            emotions = patterns.get("emotions", [])
            for word in emotions:
                if word in text_lower:
                    score += 15

        # Question boost (creates engagement)
        if self._is_question(text):
            score += 20

        # Exclamation boost
        if "!" in text:
            score += 10

        return min(100, score)

    def _has_spoiler(self, text: str) -> bool:
        """Check if text contains spoiler patterns."""
        for pattern in SPOILER_PATTERNS:
            if pattern in text:
                return True
        return False

    def _calculate_dialect_distribution(
        self,
        segments: List[TranscriptSegment]
    ) -> Dict[str, float]:
        """Calculate dialect distribution across segments."""
        dialect_counts = {}
        total_duration = 0

        for seg in segments:
            if seg.dialect:
                duration = seg.duration
                dialect_counts[seg.dialect] = dialect_counts.get(seg.dialect, 0) + duration
                total_duration += duration

        if total_duration == 0:
            return {}

        return {d: count / total_duration for d, count in dialect_counts.items()}

    def _get_primary_dialect(
        self,
        distribution: Dict[str, float]
    ) -> Tuple[Optional[str], float]:
        """Get primary dialect from distribution."""
        if not distribution:
            return None, 0.0

        primary = max(distribution, key=distribution.get)
        confidence = distribution[primary]

        return primary, confidence


def create_indian_asr(
    model: str = "auto",
    device: str = "auto"
) -> IndianDialectASR:
    """Factory function to create Indian ASR instance.

    Args:
        model: Model name (auto, whisper_hindi, indicwav2vec, whisper_large)
        device: Device (auto, cuda, cpu, mps)

    Returns:
        Configured IndianDialectASR instance
    """
    return IndianDialectASR(
        model_name=model,
        device=device if device != "auto" else None,
        enable_dialect_detection=True
    )
