"""Video file loading and metadata extraction."""

import subprocess
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Union, Dict, Any
from loguru import logger


@dataclass
class VideoMetadata:
    """Video file metadata."""
    duration: float  # seconds
    width: int
    height: int
    fps: float
    codec: str
    bitrate: Optional[int]
    audio_codec: Optional[str]
    audio_channels: Optional[int]
    audio_sample_rate: Optional[int]
    file_size: int
    format_name: str

    @property
    def resolution(self) -> str:
        """Get resolution string."""
        if self.height >= 2160:
            return "4k"
        elif self.height >= 1080:
            return "1080p"
        elif self.height >= 720:
            return "720p"
        elif self.height >= 480:
            return "480p"
        return f"{self.height}p"

    @property
    def aspect_ratio(self) -> float:
        """Get aspect ratio."""
        return self.width / self.height if self.height > 0 else 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "duration": self.duration,
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "codec": self.codec,
            "bitrate": self.bitrate,
            "audio_codec": self.audio_codec,
            "audio_channels": self.audio_channels,
            "audio_sample_rate": self.audio_sample_rate,
            "file_size": self.file_size,
            "format_name": self.format_name,
            "resolution": self.resolution,
            "aspect_ratio": round(self.aspect_ratio, 2)
        }


class VideoLoader:
    """Load and validate video files."""

    SUPPORTED_FORMATS = {'.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v'}

    def __init__(self, video_path: Union[str, Path]):
        """Initialize video loader.

        Args:
            video_path: Path to video file
        """
        self.path = Path(video_path)
        self._metadata: Optional[VideoMetadata] = None
        self._validate()

    def _validate(self) -> None:
        """Validate video file exists and has supported format."""
        if not self.path.exists():
            raise FileNotFoundError(f"Video file not found: {self.path}")

        if self.path.suffix.lower() not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported video format: {self.path.suffix}. "
                f"Supported: {self.SUPPORTED_FORMATS}"
            )

    def _run_ffprobe(self) -> Dict[str, Any]:
        """Run ffprobe to get video information.

        Returns:
            Dictionary with ffprobe output
        """
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            str(self.path)
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            return json.loads(result.stdout)
        except subprocess.CalledProcessError as e:
            logger.error(f"ffprobe failed: {e.stderr}")
            raise RuntimeError(f"Failed to probe video: {e.stderr}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ffprobe output: {e}")
            raise RuntimeError(f"Invalid ffprobe output: {e}")

    @property
    def metadata(self) -> VideoMetadata:
        """Get video metadata (lazy-loaded).

        Returns:
            VideoMetadata object
        """
        if self._metadata is None:
            self._metadata = self._extract_metadata()
        return self._metadata

    def _extract_metadata(self) -> VideoMetadata:
        """Extract metadata from video file.

        Returns:
            VideoMetadata object
        """
        logger.info(f"Extracting metadata from: {self.path}")

        probe_data = self._run_ffprobe()

        # Find video stream
        video_stream = None
        audio_stream = None

        for stream in probe_data.get('streams', []):
            if stream.get('codec_type') == 'video' and video_stream is None:
                video_stream = stream
            elif stream.get('codec_type') == 'audio' and audio_stream is None:
                audio_stream = stream

        if video_stream is None:
            raise ValueError("No video stream found in file")

        format_info = probe_data.get('format', {})

        # Extract FPS
        fps_str = video_stream.get('r_frame_rate', '24/1')
        if '/' in fps_str:
            num, den = map(int, fps_str.split('/'))
            fps = num / den if den > 0 else 24.0
        else:
            fps = float(fps_str)

        # Extract bitrate
        bitrate = None
        if 'bit_rate' in format_info:
            bitrate = int(format_info['bit_rate'])
        elif 'bit_rate' in video_stream:
            bitrate = int(video_stream['bit_rate'])

        # Build metadata
        metadata = VideoMetadata(
            duration=float(format_info.get('duration', 0)),
            width=int(video_stream.get('width', 0)),
            height=int(video_stream.get('height', 0)),
            fps=fps,
            codec=video_stream.get('codec_name', 'unknown'),
            bitrate=bitrate,
            audio_codec=audio_stream.get('codec_name') if audio_stream else None,
            audio_channels=int(audio_stream.get('channels', 0)) if audio_stream else None,
            audio_sample_rate=int(audio_stream.get('sample_rate', 0)) if audio_stream else None,
            file_size=self.path.stat().st_size,
            format_name=format_info.get('format_name', 'unknown')
        )

        logger.info(
            f"Video metadata: {metadata.duration:.1f}s, "
            f"{metadata.resolution}, {metadata.fps:.2f}fps, {metadata.codec}"
        )

        return metadata

    def extract_audio(self, output_path: Union[str, Path]) -> Path:
        """Extract audio track from video.

        Args:
            output_path: Path for extracted audio file

        Returns:
            Path to extracted audio file
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Extracting audio to: {output_path}")

        cmd = [
            'ffmpeg',
            '-i', str(self.path),
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # WAV format for Whisper
            '-ar', '16000',  # 16kHz sample rate
            '-ac', '1',  # Mono
            '-y',  # Overwrite
            str(output_path)
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            logger.info(f"Audio extracted: {output_path}")
            return output_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Audio extraction failed: {e.stderr.decode()}")
            raise RuntimeError(f"Failed to extract audio: {e}")

    def extract_frame(
        self,
        timestamp: float,
        output_path: Union[str, Path]
    ) -> Path:
        """Extract a single frame from video.

        Args:
            timestamp: Time in seconds
            output_path: Path for extracted frame

        Returns:
            Path to extracted frame
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            'ffmpeg',
            '-ss', str(timestamp),
            '-i', str(self.path),
            '-vframes', '1',
            '-y',
            str(output_path)
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            return output_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Frame extraction failed: {e.stderr.decode()}")
            raise RuntimeError(f"Failed to extract frame at {timestamp}s: {e}")

    def extract_frames(
        self,
        timestamps: list,
        output_dir: Union[str, Path],
        prefix: str = "frame"
    ) -> list:
        """Extract multiple frames from video.

        Args:
            timestamps: List of timestamps in seconds
            output_dir: Directory for extracted frames
            prefix: Filename prefix

        Returns:
            List of paths to extracted frames
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        paths = []
        for i, ts in enumerate(timestamps):
            output_path = output_dir / f"{prefix}_{i:04d}_{ts:.3f}.jpg"
            try:
                self.extract_frame(ts, output_path)
                paths.append(output_path)
            except RuntimeError:
                logger.warning(f"Failed to extract frame at {ts}s, skipping")

        return paths
