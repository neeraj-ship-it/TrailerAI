"""Subtitle file parsing (SRT, VTT, ASS)."""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from loguru import logger

try:
    import pysrt
    HAS_PYSRT = True
except ImportError:
    HAS_PYSRT = False

try:
    import webvtt
    HAS_WEBVTT = True
except ImportError:
    HAS_WEBVTT = False

try:
    import chardet
    HAS_CHARDET = True
except ImportError:
    HAS_CHARDET = False


@dataclass
class SubtitleSegment:
    """Single subtitle segment."""
    index: int
    start_time: float  # seconds
    end_time: float  # seconds
    text: str
    speaker: Optional[str] = None

    @property
    def duration(self) -> float:
        """Get segment duration in seconds."""
        return self.end_time - self.start_time

    @property
    def start_timecode(self) -> str:
        """Get start time as timecode string."""
        return self._seconds_to_timecode(self.start_time)

    @property
    def end_timecode(self) -> str:
        """Get end time as timecode string."""
        return self._seconds_to_timecode(self.end_time)

    @staticmethod
    def _seconds_to_timecode(seconds: float) -> str:
        """Convert seconds to HH:MM:SS.mmm format."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "start_timecode": self.start_timecode,
            "end_timecode": self.end_timecode,
            "duration": self.duration,
            "text": self.text,
            "speaker": self.speaker
        }


@dataclass
class ParsedSubtitles:
    """Complete parsed subtitle file."""
    segments: List[SubtitleSegment]
    format: str
    language: Optional[str]
    total_duration: float

    @property
    def word_count(self) -> int:
        """Get total word count."""
        return sum(len(s.text.split()) for s in self.segments)

    @property
    def full_text(self) -> str:
        """Get all text concatenated."""
        return ' '.join(s.text for s in self.segments)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "format": self.format,
            "language": self.language,
            "segment_count": len(self.segments),
            "total_duration": self.total_duration,
            "word_count": self.word_count,
            "segments": [s.to_dict() for s in self.segments]
        }

    def get_text_at_time(self, timestamp: float, tolerance: float = 0.5) -> Optional[str]:
        """Get subtitle text at a specific timestamp.

        Args:
            timestamp: Time in seconds
            tolerance: Time tolerance in seconds

        Returns:
            Subtitle text or None
        """
        for segment in self.segments:
            if segment.start_time - tolerance <= timestamp <= segment.end_time + tolerance:
                return segment.text
        return None

    def get_segments_in_range(
        self,
        start: float,
        end: float
    ) -> List[SubtitleSegment]:
        """Get all segments within a time range.

        Args:
            start: Start time in seconds
            end: End time in seconds

        Returns:
            List of segments in range
        """
        return [
            s for s in self.segments
            if s.start_time < end and s.end_time > start
        ]


class SubtitleParser:
    """Parse subtitle files in various formats."""

    SUPPORTED_FORMATS = {'.srt', '.vtt', '.ass', '.ssa'}

    # SRT timestamp pattern: 00:00:00,000 --> 00:00:00,000
    SRT_TIMESTAMP_PATTERN = re.compile(
        r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})'
    )

    # Speaker pattern: [Speaker]: or (Speaker):
    SPEAKER_PATTERN = re.compile(r'^[\[\(]?([A-Za-z0-9\s]+)[\]\)]?:\s*')

    def __init__(self, file_path: Optional[Union[str, Path]] = None):
        """Initialize subtitle parser.

        Args:
            file_path: Path to subtitle file (optional)
        """
        self.file_path = Path(file_path) if file_path else None

    def parse(
        self,
        file_path: Optional[Union[str, Path]] = None,
        format_hint: Optional[str] = None
    ) -> ParsedSubtitles:
        """Parse a subtitle file.

        Args:
            file_path: Path to subtitle file
            format_hint: Format hint ('srt', 'vtt', 'ass')

        Returns:
            ParsedSubtitles object
        """
        file_path = Path(file_path or self.file_path)
        if not file_path:
            raise ValueError("No file path provided")

        if not file_path.exists():
            raise FileNotFoundError(f"Subtitle file not found: {file_path}")

        suffix = file_path.suffix.lower()
        if suffix not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported subtitle format: {suffix}. "
                f"Supported: {self.SUPPORTED_FORMATS}"
            )

        format_type = format_hint or suffix.lstrip('.')
        logger.info(f"Parsing subtitles: {file_path} (format: {format_type})")

        if format_type in ('srt',) or suffix == '.srt':
            return self._parse_srt(file_path)
        elif format_type in ('vtt', 'webvtt') or suffix == '.vtt':
            return self._parse_vtt(file_path)
        elif format_type in ('ass', 'ssa') or suffix in ('.ass', '.ssa'):
            return self._parse_ass(file_path)
        else:
            # Try SRT as default
            return self._parse_srt(file_path)

    def _detect_encoding(self, file_path: Path) -> str:
        """Detect file encoding."""
        if HAS_CHARDET:
            with open(file_path, 'rb') as f:
                result = chardet.detect(f.read())
                return result.get('encoding', 'utf-8') or 'utf-8'
        return 'utf-8'

    def _parse_srt(self, file_path: Path) -> ParsedSubtitles:
        """Parse SRT subtitle file.

        Args:
            file_path: Path to SRT file

        Returns:
            ParsedSubtitles object
        """
        if HAS_PYSRT:
            return self._parse_srt_pysrt(file_path)
        else:
            return self._parse_srt_manual(file_path)

    def _parse_srt_pysrt(self, file_path: Path) -> ParsedSubtitles:
        """Parse SRT using pysrt library."""
        encoding = self._detect_encoding(file_path)

        try:
            subs = pysrt.open(str(file_path), encoding=encoding)
        except Exception:
            # Fallback to utf-8
            subs = pysrt.open(str(file_path), encoding='utf-8')

        segments = []
        for i, sub in enumerate(subs):
            text = sub.text.replace('\n', ' ').strip()
            speaker = self._extract_speaker(text)
            if speaker:
                text = self.SPEAKER_PATTERN.sub('', text)

            segments.append(SubtitleSegment(
                index=i + 1,
                start_time=self._pysrt_time_to_seconds(sub.start),
                end_time=self._pysrt_time_to_seconds(sub.end),
                text=text,
                speaker=speaker
            ))

        total_duration = segments[-1].end_time if segments else 0

        return ParsedSubtitles(
            segments=segments,
            format='srt',
            language=self._detect_language(segments),
            total_duration=total_duration
        )

    def _pysrt_time_to_seconds(self, time_obj) -> float:
        """Convert pysrt SubRipTime to seconds."""
        return (
            time_obj.hours * 3600 +
            time_obj.minutes * 60 +
            time_obj.seconds +
            time_obj.milliseconds / 1000
        )

    def _parse_srt_manual(self, file_path: Path) -> ParsedSubtitles:
        """Parse SRT manually without pysrt."""
        encoding = self._detect_encoding(file_path)

        with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
            content = f.read()

        segments = []
        blocks = re.split(r'\n\s*\n', content.strip())

        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) < 2:
                continue

            # Find timestamp line
            timestamp_match = None
            timestamp_line_idx = 0

            for i, line in enumerate(lines):
                match = self.SRT_TIMESTAMP_PATTERN.search(line)
                if match:
                    timestamp_match = match
                    timestamp_line_idx = i
                    break

            if not timestamp_match:
                continue

            # Parse timestamps
            start_time = self._parse_srt_timestamp(timestamp_match.groups()[:4])
            end_time = self._parse_srt_timestamp(timestamp_match.groups()[4:])

            # Get text (lines after timestamp)
            text_lines = lines[timestamp_line_idx + 1:]
            text = ' '.join(line.strip() for line in text_lines if line.strip())

            speaker = self._extract_speaker(text)
            if speaker:
                text = self.SPEAKER_PATTERN.sub('', text)

            segments.append(SubtitleSegment(
                index=len(segments) + 1,
                start_time=start_time,
                end_time=end_time,
                text=text,
                speaker=speaker
            ))

        total_duration = segments[-1].end_time if segments else 0

        return ParsedSubtitles(
            segments=segments,
            format='srt',
            language=self._detect_language(segments),
            total_duration=total_duration
        )

    def _parse_srt_timestamp(self, parts: tuple) -> float:
        """Parse SRT timestamp parts to seconds."""
        hours, minutes, seconds, millis = map(int, parts)
        return hours * 3600 + minutes * 60 + seconds + millis / 1000

    def _parse_vtt(self, file_path: Path) -> ParsedSubtitles:
        """Parse VTT subtitle file.

        Args:
            file_path: Path to VTT file

        Returns:
            ParsedSubtitles object
        """
        if not HAS_WEBVTT:
            raise ImportError(
                "webvtt-py is required for VTT parsing. "
                "Install with: pip install webvtt-py"
            )

        vtt = webvtt.read(str(file_path))
        segments = []

        for i, caption in enumerate(vtt):
            text = caption.text.replace('\n', ' ').strip()
            speaker = self._extract_speaker(text)
            if speaker:
                text = self.SPEAKER_PATTERN.sub('', text)

            segments.append(SubtitleSegment(
                index=i + 1,
                start_time=self._vtt_time_to_seconds(caption.start),
                end_time=self._vtt_time_to_seconds(caption.end),
                text=text,
                speaker=speaker
            ))

        total_duration = segments[-1].end_time if segments else 0

        return ParsedSubtitles(
            segments=segments,
            format='vtt',
            language=self._detect_language(segments),
            total_duration=total_duration
        )

    def _vtt_time_to_seconds(self, time_str: str) -> float:
        """Convert VTT timestamp to seconds."""
        parts = time_str.split(':')
        if len(parts) == 3:
            hours, minutes, seconds = parts
        else:
            hours = 0
            minutes, seconds = parts

        seconds_parts = seconds.split('.')
        secs = int(seconds_parts[0])
        millis = int(seconds_parts[1]) if len(seconds_parts) > 1 else 0

        return int(hours) * 3600 + int(minutes) * 60 + secs + millis / 1000

    def _parse_ass(self, file_path: Path) -> ParsedSubtitles:
        """Parse ASS/SSA subtitle file.

        Args:
            file_path: Path to ASS file

        Returns:
            ParsedSubtitles object
        """
        encoding = self._detect_encoding(file_path)

        with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
            content = f.read()

        segments = []
        in_events = False

        for line in content.split('\n'):
            line = line.strip()

            if line.lower() == '[events]':
                in_events = True
                continue

            if not in_events or not line.startswith('Dialogue:'):
                continue

            # Parse dialogue line
            # Format: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
            parts = line[9:].split(',', 9)
            if len(parts) < 10:
                continue

            start_time = self._ass_time_to_seconds(parts[1])
            end_time = self._ass_time_to_seconds(parts[2])
            speaker = parts[4] if parts[4] else None
            text = parts[9]

            # Remove ASS formatting tags
            text = re.sub(r'\{[^}]*\}', '', text)
            text = text.replace('\\N', ' ').replace('\\n', ' ').strip()

            segments.append(SubtitleSegment(
                index=len(segments) + 1,
                start_time=start_time,
                end_time=end_time,
                text=text,
                speaker=speaker
            ))

        # Sort by start time
        segments.sort(key=lambda s: s.start_time)

        total_duration = segments[-1].end_time if segments else 0

        return ParsedSubtitles(
            segments=segments,
            format='ass',
            language=self._detect_language(segments),
            total_duration=total_duration
        )

    def _ass_time_to_seconds(self, time_str: str) -> float:
        """Convert ASS timestamp (H:MM:SS.CC) to seconds."""
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds_parts = parts[2].split('.')
        seconds = int(seconds_parts[0])
        centis = int(seconds_parts[1]) if len(seconds_parts) > 1 else 0

        return hours * 3600 + minutes * 60 + seconds + centis / 100

    def _extract_speaker(self, text: str) -> Optional[str]:
        """Extract speaker name from text if present."""
        match = self.SPEAKER_PATTERN.match(text)
        if match:
            return match.group(1).strip()
        return None

    def _detect_language(self, segments: List[SubtitleSegment]) -> Optional[str]:
        """Simple language detection based on character analysis."""
        if not segments:
            return None

        # Sample text
        sample_text = ' '.join(s.text for s in segments[:50])

        # Check for Devanagari (Hindi)
        if re.search(r'[\u0900-\u097F]', sample_text):
            return 'hi'

        # Check for common Hindi transliteration patterns
        hindi_words = ['hai', 'kya', 'nahi', 'aur', 'tum', 'main', 'yeh', 'woh']
        if any(word in sample_text.lower() for word in hindi_words):
            return 'hi'

        # Default to English
        return 'en'
