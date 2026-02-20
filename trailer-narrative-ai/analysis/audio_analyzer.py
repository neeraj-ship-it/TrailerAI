"""Audio analysis with regional dialect support.

Supports: Haryanvi, Bhojpuri, Rajasthani, Gujarati, Hindi, and other Indian dialects.
Uses Whisper with auto-detection for best transcription quality.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from loguru import logger

# Use openai-whisper (more reliable with progress bar)
HAS_WHISPER = False
HAS_FASTER_WHISPER = False

try:
    import whisper
    HAS_WHISPER = True
except ImportError:
    pass

# Fallback to faster-whisper if openai-whisper not available
if not HAS_WHISPER:
    try:
        from faster_whisper import WhisperModel
        HAS_FASTER_WHISPER = True
    except ImportError:
        pass

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

from input.subtitle_parser import SubtitleParser, ParsedSubtitles, SubtitleSegment


# =============================================================================
# COMPREHENSIVE REGIONAL DIALECT PATTERNS
# Priority dialects: Haryanvi, Bhojpuri, Rajasthani, Gujarati
# =============================================================================

DIALECT_PATTERNS = {
    "haryanvi": [
        # Pronouns & Common
        "thare", "mahre", "tanne", "manne", "apne", "unne", "inne",
        "thara", "mhara", "thari", "mhari", "apna", "apni",
        # Family terms
        "tau", "taai", "chacha", "chachi", "mama", "mami",
        "chhora", "chhori", "lugai", "bahu", "sasur", "saas",
        "bhai", "behen", "beta", "beti", "bapu", "maa",
        # Common words
        "ghani", "ghano", "ghanan", "bahut", "bahot",
        "kai", "kyu", "kyun", "kahan", "kidhar", "kithe",
        "na", "ni", "nahi", "mat", "ruk", "chal",
        "achha", "theek", "haan", "hanji",
        "baat", "kaam", "ghar", "gaon", "khet",
        "paisa", "rukka", "time", "din", "raat",
        # Verbs
        "kar", "kare", "karya", "karna", "karni",
        "ja", "jaa", "jaana", "jani", "gaya", "gayi",
        "aa", "aaja", "aana", "aani", "aaya", "aayi",
        "de", "dena", "deni", "diya", "diyi",
        "le", "lena", "leni", "liya", "liyi",
        "bol", "bolna", "bolni", "bola", "boli",
        "sun", "sunna", "sunni", "sunya", "sunyi",
        "dekh", "dekhna", "dekhni", "dekha", "dekhi",
        # Expressions
        "are", "arre", "ore", "re", "ri",
        "haan", "hanji", "achha", "theek",
        "bhala", "bhalai", "badmash", "bhola",
        # Emotions
        "pyaar", "mohabbat", "dil", "jaan", "yaar",
        "dard", "dukh", "sukh", "khushi", "gham",
        "gussa", "josh", "himmat", "hausla",
        # Questions
        "ke", "ki", "ka", "kya", "kaun", "kab", "kaise",
    ],

    "bhojpuri": [
        # Pronouns & Common
        "ham", "hum", "hamra", "hamaar", "hamar",
        "tohar", "tohra", "tohaar", "raua", "raura",
        "ukar", "okar", "inkar", "unkar",
        # Family terms
        "maai", "babuji", "bhaiya", "bhaiyya", "didiya", "didi",
        "chacha", "chachi", "mama", "mami", "nana", "nani",
        "marad", "mehararu", "laika", "laiki", "bachcha",
        "sasur", "saas", "devar", "nanad", "jeth", "jethani",
        # Common words
        "ba", "baa", "bate", "bani", "baani",
        "hoi", "hoyi", "hota", "hoti",
        "ka", "ke", "ki", "kahe", "kaahe", "kahaan",
        "na", "nai", "naikhe", "mat",
        "bahut", "bahute", "dher", "thora",
        "aaj", "kal", "abhi", "tab", "jab",
        "ghar", "gaon", "desh", "muluk",
        # Verbs
        "kara", "karela", "kaile", "karbe", "kariha",
        "jaai", "jaata", "gail", "jaibe", "jaiha",
        "aai", "aata", "aail", "aaibe", "aaiha",
        "dela", "dihale", "debe", "diha",
        "lela", "lihale", "lebe", "liha",
        "bola", "bolela", "bole", "boliha",
        "suna", "sunela", "sune", "suniha",
        "dekha", "dekhela", "dekhe", "dekhiha",
        # Expressions
        "are", "arre", "ho", "e", "a",
        "achha", "theek", "badhiya",
        # Emotions
        "pyaar", "prem", "mohabbat", "dil", "jaan", "jiya",
        "dard", "dukh", "sukh", "khushi", "gham",
        "rowe", "rovela", "hasela", "muskuraai",
        # Questions
        "ka", "kaisan", "kab", "kahaan", "kaahe", "ketna",
    ],

    "rajasthani": [
        # Pronouns & Common
        "mhare", "thare", "mhara", "thara", "mhari", "thari",
        "apna", "apni", "unka", "unki", "inka", "inki",
        # Family terms
        "bapu", "bai", "bapuji", "maaji", "sa", "ji",
        "banna", "banni", "bhai", "behen", "beta", "beti",
        "kaka", "kaki", "mama", "mami", "dada", "dadi",
        "pati", "patni", "ghar wala", "ghar wali",
        # Common words
        "ghani", "ghano", "bahut", "bahot",
        "kai", "koni", "mat", "na", "nahi",
        "haan", "hanji", "ji", "sa",
        "baat", "kaam", "ghar", "gaon", "haveli",
        "padharo", "khamma", "ghani", "ram ram",
        "theek", "achha", "badhiya", "fatafat",
        # Verbs
        "kar", "karo", "karyo", "karna", "karni",
        "ja", "jao", "jaayo", "jaana", "jaani",
        "aa", "aao", "aayo", "aana", "aani",
        "de", "do", "diyo", "dena", "deni",
        "le", "lo", "liyo", "lena", "leni",
        "bol", "bolo", "bolyo", "bolna", "bolni",
        "sun", "suno", "sunyo", "sunna", "sunni",
        "dekh", "dekho", "dekhyo", "dekhna", "dekhni",
        # Expressions
        "are", "arre", "re", "ri", "sa", "ji",
        "khamma", "ghani", "ram ram", "jai",
        # Emotions
        "pyaar", "prem", "mohabbat", "dil", "jaan",
        "dard", "dukh", "sukh", "khushi", "gham",
        "rona", "hasna", "muskurana",
        # Questions
        "kai", "kya", "kaun", "kab", "kaise", "kidhar", "kyun",
    ],

    "gujarati": [
        # Pronouns & Common
        "hu", "hun", "tame", "tamne", "ame", "amne",
        "mari", "tari", "amari", "tamari",
        "maro", "taro", "amaro", "tamaro",
        "aa", "ae", "te", "tene", "ene",
        # Family terms
        "bhai", "ben", "bhaiya", "behan",
        "bapa", "ba", "mummy", "papa", "dada", "dadi",
        "kaka", "kaki", "mama", "mami", "foi", "fua",
        "dikro", "dikri", "chhokro", "chhokri",
        "pati", "patni", "var", "vadhu",
        # Common words
        "che", "chhe", "hatu", "hati", "hase", "hasi",
        "nathi", "nai", "na", "mat",
        "haan", "ha", "na", "nai",
        "ghanu", "ghani", "bahut", "thodu",
        "ghar", "gaon", "sheher", "desh",
        "paisa", "rupiya", "samay", "time",
        # Verbs
        "karo", "karu", "karvu", "karyu", "kare", "kari",
        "jao", "javu", "gayo", "gayi", "jaje",
        "aavo", "aavvu", "aavyo", "aavi", "aavje",
        "do", "aapo", "aapvu", "aapyo", "aapi",
        "lo", "levo", "lidhu", "lidhi",
        "bolo", "bolvu", "bolyo", "boli",
        "sambhalo", "sambhalvu", "sambhalyu",
        "juo", "jovu", "joyu", "joi",
        # Expressions
        "are", "arre", "bhai", "ben", "yaar",
        "kem", "su", "shu", "kem cho",
        # Emotions
        "prem", "pyaar", "mohabbat", "dil", "jaan",
        "dard", "dukh", "sukh", "khushi", "gham",
        "rovu", "hasvu", "muskuravu",
        # Questions
        "su", "shu", "kem", "kyare", "kya", "kon", "kyathi",
    ]
}


def detect_dialect(text: str) -> tuple:
    """Detect regional dialect from transcribed text.

    Priority: Haryanvi, Bhojpuri, Rajasthani, Gujarati

    Returns: (dialect_name, confidence_score)
    """
    if not text:
        return None, 0.0

    text_lower = text.lower()
    words = text_lower.split()
    total_words = max(len(words), 1)

    dialect_scores = {}

    for dialect, patterns in DIALECT_PATTERNS.items():
        score = 0
        matched_patterns = set()

        for pattern in patterns:
            # Check for word boundary matches (more accurate)
            if f" {pattern} " in f" {text_lower} ":
                score += 2
                matched_patterns.add(pattern)
            elif pattern in text_lower:
                score += 1
                matched_patterns.add(pattern)

        if score > 0:
            # Bonus for variety of matches
            variety_bonus = len(matched_patterns) * 0.5
            dialect_scores[dialect] = score + variety_bonus

    if not dialect_scores:
        return None, 0.0

    # Get best match
    best_dialect = max(dialect_scores, key=dialect_scores.get)
    best_score = dialect_scores[best_dialect]

    # Calculate confidence (normalized)
    confidence = min(1.0, best_score / (total_words * 0.3))

    # Only return if confidence is meaningful
    if confidence < 0.1:
        return None, 0.0

    return best_dialect, round(confidence, 2)


@dataclass
class TranscriptSegment:
    """A segment of transcribed audio."""
    id: int
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None
    speaker: Optional[str] = None
    language: Optional[str] = None
    words: List[Dict[str, Any]] = field(default_factory=list)

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
            "speaker": self.speaker,
            "language": self.language,
            "word_count": len(self.text.split())
        }


@dataclass
class AudioAnalysis:
    """Complete audio analysis result with dialect detection."""
    source: str  # 'whisper' or 'subtitle_file'
    segments: List[TranscriptSegment]
    language: Optional[str]
    total_duration: float
    dialect: Optional[str] = None  # Detected dialect (haryanvi, bhojpuri, etc.)
    dialect_confidence: float = 0.0
    music_segments: List[Dict[str, float]] = field(default_factory=list)
    silence_segments: List[Dict[str, float]] = field(default_factory=list)

    @property
    def full_transcript(self) -> str:
        """Get full transcript text."""
        return ' '.join(s.text for s in self.segments)

    @property
    def word_count(self) -> int:
        """Get total word count."""
        return len(self.full_transcript.split())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "language": self.language,
            "dialect": self.dialect,
            "dialect_confidence": self.dialect_confidence,
            "total_duration": self.total_duration,
            "segment_count": len(self.segments),
            "word_count": self.word_count,
            "segments": [s.to_dict() for s in self.segments],
            "music_segments": self.music_segments,
            "silence_segments": self.silence_segments
        }

    def get_text_at_time(self, timestamp: float, tolerance: float = 0.5) -> Optional[str]:
        """Get transcript text at a specific timestamp."""
        for segment in self.segments:
            if segment.start_time - tolerance <= timestamp <= segment.end_time + tolerance:
                return segment.text
        return None

    def get_segments_in_range(self, start: float, end: float) -> List[TranscriptSegment]:
        """Get all segments within a time range."""
        return [
            s for s in self.segments
            if s.start_time < end and s.end_time > start
        ]


def detect_dialect(text: str) -> tuple:
    """Detect regional dialect from transcribed text.

    Returns: (dialect_name, confidence_score)
    """
    if not text:
        return None, 0.0

    text_lower = text.lower()
    words = text_lower.split()

    dialect_scores = {}

    for dialect, patterns in DIALECT_PATTERNS.items():
        score = 0
        for pattern in patterns:
            # Count occurrences
            count = text_lower.count(pattern)
            if count > 0:
                score += count

        if score > 0:
            dialect_scores[dialect] = score

    if not dialect_scores:
        return None, 0.0

    # Get best match
    best_dialect = max(dialect_scores, key=dialect_scores.get)
    best_score = dialect_scores[best_dialect]

    # Calculate confidence (based on matches per 100 words)
    confidence = min(1.0, best_score / max(len(words), 1) * 10)

    return best_dialect, confidence


class AudioAnalyzer:
    """Analyze audio with regional dialect support.

    Supports: Haryanvi, Bhojpuri, Rajasthani, Gujarati, Hindi, English
    Uses Whisper auto-detection for best transcription of regional dialects.
    """

    def __init__(
        self,
        whisper_model: str = "medium",
        device: Optional[str] = None,
        language: Optional[str] = None
    ):
        """Initialize audio analyzer.

        Args:
            whisper_model: Whisper model size (tiny, base, small, medium, large)
            device: Device for inference (cuda, cpu, or auto)
            language: Language hint (None = auto-detect, recommended for dialects)
        """
        self.whisper_model_name = whisper_model
        # For regional dialects, AUTO-DETECT is best (don't force language)
        # Whisper will transcribe Haryanvi/Bhojpuri/Rajasthani as Hindi-like text
        self.language = language  # None = auto-detect
        self._whisper_model = None

        # Auto-detect device
        if device is None or device == "auto":
            self.device = self._detect_device()
        elif device == "cuda" and HAS_TORCH and not torch.cuda.is_available():
            logger.warning("CUDA requested but not available, auto-detecting device")
            self.device = self._detect_device()
        else:
            self.device = device

        logger.info(f"AudioAnalyzer: model={whisper_model}, device={self.device}, language={'auto' if not language else language}")

    def _detect_device(self) -> str:
        """Auto-detect the best available device."""
        if not HAS_TORCH:
            return "cpu"

        if torch.cuda.is_available():
            return "cuda"

        # Mac Apple Silicon - use CPU for better Whisper compatibility
        # MPS has issues with Whisper, so we use CPU
        return "cpu"

    @property
    def whisper_model(self):
        """Lazy-load Whisper model (openai-whisper preferred for reliability)."""
        if self._whisper_model is None:
            if HAS_WHISPER:
                # Use openai-whisper (reliable with progress bar)
                logger.info(f"Loading Whisper model: {self.whisper_model_name} on {self.device}")
                self._whisper_model = whisper.load_model(
                    self.whisper_model_name,
                    device=self.device
                )
                self._use_faster_whisper = False
                logger.info("Whisper model loaded")
            elif HAS_FASTER_WHISPER:
                # Fallback to faster-whisper
                logger.info(f"Loading Faster-Whisper model: {self.whisper_model_name} on {self.device}")
                compute_type = "int8" if self.device == "cpu" else "float16"
                self._whisper_model = WhisperModel(
                    self.whisper_model_name,
                    device=self.device,
                    compute_type=compute_type
                )
                self._use_faster_whisper = True
                logger.info("Faster-Whisper model loaded")
            else:
                raise ImportError(
                    "Whisper is required for audio transcription. "
                    "Install with: pip install openai-whisper"
                )

        return self._whisper_model

    def analyze(
        self,
        audio_source: Union[str, Path],
        subtitle_path: Optional[Union[str, Path]] = None,
        use_word_timestamps: bool = True
    ) -> AudioAnalysis:
        """Analyze audio, using subtitles if provided.

        Args:
            audio_source: Path to audio/video file
            subtitle_path: Path to subtitle file (optional, skips Whisper if provided)
            use_word_timestamps: Extract word-level timestamps

        Returns:
            AudioAnalysis object
        """
        # If subtitle provided, use it instead of Whisper
        if subtitle_path:
            return self._analyze_from_subtitles(subtitle_path)

        # Otherwise use Whisper
        return self._transcribe_with_whisper(audio_source, use_word_timestamps)

    def _analyze_from_subtitles(
        self,
        subtitle_path: Union[str, Path]
    ) -> AudioAnalysis:
        """Create AudioAnalysis from subtitle file.

        Args:
            subtitle_path: Path to subtitle file

        Returns:
            AudioAnalysis object
        """
        logger.info(f"Using subtitle file for audio analysis: {subtitle_path}")

        parser = SubtitleParser()
        parsed = parser.parse(subtitle_path)

        # Convert subtitle segments to transcript segments
        segments = [
            TranscriptSegment(
                id=seg.index,
                start_time=seg.start_time,
                end_time=seg.end_time,
                text=seg.text,
                speaker=seg.speaker,
                language=parsed.language
            )
            for seg in parsed.segments
        ]

        return AudioAnalysis(
            source="subtitle_file",
            segments=segments,
            language=parsed.language,
            total_duration=parsed.total_duration
        )

    def _transcribe_with_whisper(
        self,
        audio_path: Union[str, Path],
        use_word_timestamps: bool = True
    ) -> AudioAnalysis:
        """Transcribe audio using Whisper (faster-whisper or openai-whisper).

        Args:
            audio_path: Path to audio/video file
            use_word_timestamps: Extract word-level timestamps

        Returns:
            AudioAnalysis object
        """
        audio_path = Path(audio_path)

        # Load model first
        model = self.whisper_model

        if getattr(self, '_use_faster_whisper', False):
            return self._transcribe_faster_whisper(audio_path, use_word_timestamps)
        else:
            return self._transcribe_openai_whisper(audio_path, use_word_timestamps)

    def _transcribe_faster_whisper(
        self,
        audio_path: Path,
        use_word_timestamps: bool = True
    ) -> AudioAnalysis:
        """Transcribe using faster-whisper with dialect detection."""
        logger.info(f"Transcribing with Faster-Whisper: {audio_path}")
        logger.info("Language: AUTO-DETECT (best for regional dialects)")

        # Transcribe - let Whisper auto-detect language for best dialect support
        segments_gen, info = self._whisper_model.transcribe(
            str(audio_path),
            word_timestamps=use_word_timestamps,
            language=self.language,  # None = auto-detect
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # Convert generator to list and build segments
        segments = []
        full_text = []

        for i, seg in enumerate(segments_gen):
            words = []
            if use_word_timestamps and seg.words:
                words = [{"word": w.word, "start": w.start, "end": w.end} for w in seg.words]

            segments.append(TranscriptSegment(
                id=i + 1,
                start_time=seg.start,
                end_time=seg.end,
                text=seg.text.strip(),
                confidence=seg.avg_logprob if hasattr(seg, 'avg_logprob') else None,
                language=info.language,
                words=words
            ))
            full_text.append(seg.text.strip())

        total_duration = segments[-1].end_time if segments else 0

        # Detect regional dialect from transcribed text
        dialect, dialect_conf = detect_dialect(" ".join(full_text))

        logger.info(
            f"Transcription complete: {len(segments)} segments, "
            f"language: {info.language}, duration: {info.duration:.1f}s"
        )
        if dialect:
            logger.info(f"Detected dialect: {dialect} (confidence: {dialect_conf:.2f})")

        return AudioAnalysis(
            source="faster-whisper",
            segments=segments,
            language=info.language,
            total_duration=total_duration,
            dialect=dialect,
            dialect_confidence=dialect_conf
        )

    def _transcribe_openai_whisper(
        self,
        audio_path: Path,
        use_word_timestamps: bool = True
    ) -> AudioAnalysis:
        """Transcribe using openai-whisper with dialect detection."""
        logger.info(f"Transcribing with OpenAI-Whisper: {audio_path}")
        logger.info("Language: AUTO-DETECT (best for regional dialects)")

        # Transcribe - auto-detect language for best dialect support
        result = self._whisper_model.transcribe(
            str(audio_path),
            word_timestamps=use_word_timestamps,
            language=self.language,  # None = auto-detect
            verbose=False
        )

        # Convert to segments
        segments = []
        full_text = []

        for i, seg in enumerate(result.get("segments", [])):
            words = []
            if use_word_timestamps and "words" in seg:
                words = seg["words"]

            text = seg["text"].strip()
            segments.append(TranscriptSegment(
                id=i + 1,
                start_time=seg["start"],
                end_time=seg["end"],
                text=text,
                confidence=seg.get("avg_logprob"),
                language=result.get("language"),
                words=words
            ))
            full_text.append(text)

        total_duration = segments[-1].end_time if segments else 0

        # Detect regional dialect from transcribed text
        dialect, dialect_conf = detect_dialect(" ".join(full_text))

        detected_lang = result.get("language", "unknown")
        logger.info(
            f"Transcription complete: {len(segments)} segments, "
            f"language: {detected_lang}"
        )
        if dialect:
            logger.info(f"Detected dialect: {dialect.upper()} (confidence: {dialect_conf:.2f})")

        return AudioAnalysis(
            source="whisper",
            segments=segments,
            language=detected_lang,
            total_duration=total_duration,
            dialect=dialect,
            dialect_confidence=dialect_conf
        )

    def detect_silence(
        self,
        audio_path: Union[str, Path],
        threshold_db: float = -40,
        min_duration: float = 0.5
    ) -> List[Dict[str, float]]:
        """Detect silence segments in audio.

        Args:
            audio_path: Path to audio file
            threshold_db: Silence threshold in dB
            min_duration: Minimum silence duration in seconds

        Returns:
            List of silence segments with start/end times
        """
        try:
            from pydub import AudioSegment
            from pydub.silence import detect_silence as pydub_detect_silence
        except ImportError:
            logger.warning("pydub not available for silence detection")
            return []

        logger.info(f"Detecting silence in: {audio_path}")

        audio = AudioSegment.from_file(str(audio_path))

        # Detect silence (returns list of [start_ms, end_ms])
        silence_ranges = pydub_detect_silence(
            audio,
            min_silence_len=int(min_duration * 1000),
            silence_thresh=threshold_db
        )

        # Convert to seconds
        silence_segments = [
            {"start": start / 1000, "end": end / 1000, "duration": (end - start) / 1000}
            for start, end in silence_ranges
        ]

        logger.info(f"Found {len(silence_segments)} silence segments")
        return silence_segments

    def get_intensity_profile(
        self,
        analysis: AudioAnalysis,
        window_size: float = 5.0
    ) -> List[Dict[str, Any]]:
        """Calculate audio intensity profile based on word density.

        Args:
            analysis: AudioAnalysis object
            window_size: Analysis window size in seconds

        Returns:
            List of intensity measurements
        """
        profile = []
        current_time = 0

        while current_time < analysis.total_duration:
            window_end = current_time + window_size

            # Count words in window
            words_in_window = 0
            for seg in analysis.segments:
                if seg.start_time < window_end and seg.end_time > current_time:
                    # Calculate overlap
                    overlap_start = max(seg.start_time, current_time)
                    overlap_end = min(seg.end_time, window_end)
                    overlap_ratio = (overlap_end - overlap_start) / seg.duration if seg.duration > 0 else 0

                    words_in_window += len(seg.text.split()) * overlap_ratio

            # Normalize to words per second
            words_per_second = words_in_window / window_size

            profile.append({
                "time": current_time + window_size / 2,
                "words_per_second": words_per_second,
                "intensity": min(1.0, words_per_second / 3)  # Normalize to 0-1
            })

            current_time += window_size / 2  # 50% overlap

        return profile
