"""Scene detection using PySceneDetect."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from loguru import logger

try:
    from scenedetect import detect, ContentDetector, ThresholdDetector, AdaptiveDetector
    from scenedetect import open_video, SceneManager
    HAS_SCENEDETECT = True
except ImportError:
    HAS_SCENEDETECT = False


@dataclass
class DetectedScene:
    """A detected scene from video."""
    id: str
    start_time: float  # seconds
    end_time: float  # seconds
    start_frame: int
    end_frame: int
    transition_type: str = "cut"  # cut, fade, dissolve

    @property
    def duration(self) -> float:
        """Get scene duration in seconds."""
        return self.end_time - self.start_time

    @property
    def start_timecode(self) -> str:
        """Get start time as timecode."""
        return self._seconds_to_timecode(self.start_time)

    @property
    def end_timecode(self) -> str:
        """Get end time as timecode."""
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
            "id": self.id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "start_timecode": self.start_timecode,
            "end_timecode": self.end_timecode,
            "duration": self.duration,
            "start_frame": self.start_frame,
            "end_frame": self.end_frame,
            "transition_type": self.transition_type
        }


@dataclass
class SceneDetectionResult:
    """Result of scene detection."""
    scenes: List[DetectedScene]
    video_duration: float
    video_fps: float
    total_frames: int

    @property
    def scene_count(self) -> int:
        return len(self.scenes)

    @property
    def average_scene_duration(self) -> float:
        if not self.scenes:
            return 0
        return sum(s.duration for s in self.scenes) / len(self.scenes)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_count": self.scene_count,
            "video_duration": self.video_duration,
            "video_fps": self.video_fps,
            "total_frames": self.total_frames,
            "average_scene_duration": self.average_scene_duration,
            "scenes": [s.to_dict() for s in self.scenes]
        }


class SceneDetector:
    """Detect scenes in video using PySceneDetect."""

    def __init__(
        self,
        content_threshold: float = 27.0,
        threshold_threshold: float = 12.0,
        min_scene_length: float = 0.5,  # seconds
        adaptive_threshold: float = 3.0
    ):
        """Initialize scene detector.

        Args:
            content_threshold: Threshold for content-aware detection
            threshold_threshold: Threshold for fade detection
            min_scene_length: Minimum scene length in seconds
            adaptive_threshold: Threshold for adaptive detection
        """
        if not HAS_SCENEDETECT:
            raise ImportError(
                "PySceneDetect is required for scene detection. "
                "Install with: pip install scenedetect[opencv]"
            )

        self.content_threshold = content_threshold
        self.threshold_threshold = threshold_threshold
        self.min_scene_length = min_scene_length
        self.adaptive_threshold = adaptive_threshold

    def detect(
        self,
        video_path: Union[str, Path],
        method: str = "content",
        show_progress: bool = True
    ) -> SceneDetectionResult:
        """Detect scenes in video.

        Args:
            video_path: Path to video file
            method: Detection method ('content', 'threshold', 'adaptive', 'all')
            show_progress: Show progress bar

        Returns:
            SceneDetectionResult object
        """
        video_path = Path(video_path)
        logger.info(f"Detecting scenes in: {video_path} (method: {method})")

        # Open video
        video = open_video(str(video_path))
        fps = video.frame_rate
        total_frames = video.duration.get_frames()
        duration = video.duration.get_seconds()

        # Create detector(s)
        if method == "content":
            detectors = [ContentDetector(
                threshold=self.content_threshold,
                min_scene_len=int(self.min_scene_length * fps)
            )]
        elif method == "threshold":
            detectors = [ThresholdDetector(
                threshold=self.threshold_threshold,
                min_scene_len=int(self.min_scene_length * fps)
            )]
        elif method == "adaptive":
            detectors = [AdaptiveDetector(
                adaptive_threshold=self.adaptive_threshold,
                min_scene_len=int(self.min_scene_length * fps)
            )]
        elif method == "all":
            # Use multiple detectors
            detectors = [
                ContentDetector(
                    threshold=self.content_threshold,
                    min_scene_len=int(self.min_scene_length * fps)
                )
            ]
        else:
            raise ValueError(f"Unknown detection method: {method}")

        # Create scene manager
        scene_manager = SceneManager()
        for detector in detectors:
            scene_manager.add_detector(detector)

        # Detect scenes
        scene_manager.detect_scenes(video, show_progress=show_progress)
        scene_list = scene_manager.get_scene_list()

        # Close video (API varies by version)
        try:
            if hasattr(video, 'release'):
                video.release()
            elif hasattr(video, 'close'):
                video.close()
        except Exception:
            pass  # Video cleanup is optional

        # Convert to DetectedScene objects
        scenes = []
        for i, (start, end) in enumerate(scene_list):
            scene = DetectedScene(
                id=f"scene_{i+1:04d}",
                start_time=start.get_seconds(),
                end_time=end.get_seconds(),
                start_frame=start.get_frames(),
                end_frame=end.get_frames(),
                transition_type="cut"  # Default to cut
            )
            scenes.append(scene)

        logger.info(f"Detected {len(scenes)} scenes (avg duration: {sum(s.duration for s in scenes)/len(scenes) if scenes else 0:.2f}s)")

        return SceneDetectionResult(
            scenes=scenes,
            video_duration=duration,
            video_fps=fps,
            total_frames=total_frames
        )

    def detect_with_fades(
        self,
        video_path: Union[str, Path],
        show_progress: bool = True
    ) -> SceneDetectionResult:
        """Detect scenes including fade transitions.

        Args:
            video_path: Path to video file
            show_progress: Show progress bar

        Returns:
            SceneDetectionResult with transition types identified
        """
        video_path = Path(video_path)
        logger.info(f"Detecting scenes with fade detection: {video_path}")

        # First pass: content detection
        content_result = self.detect(video_path, method="content", show_progress=show_progress)

        # Second pass: threshold detection for fades
        video = open_video(str(video_path))
        fps = video.frame_rate

        fade_detector = ThresholdDetector(
            threshold=self.threshold_threshold,
            min_scene_len=int(self.min_scene_length * fps),
            fade_bias=0.5  # Balance between fade-in and fade-out
        )

        scene_manager = SceneManager()
        scene_manager.add_detector(fade_detector)
        scene_manager.detect_scenes(video, show_progress=False)
        fade_scenes = scene_manager.get_scene_list()

        # Close video (API varies by version)
        try:
            if hasattr(video, 'release'):
                video.release()
            elif hasattr(video, 'close'):
                video.close()
        except Exception:
            pass

        # Mark fade transitions
        fade_times = set()
        for start, end in fade_scenes:
            fade_times.add(round(start.get_seconds(), 1))

        for scene in content_result.scenes:
            if round(scene.start_time, 1) in fade_times:
                scene.transition_type = "fade"

        return content_result

    def get_scene_at_time(
        self,
        scenes: List[DetectedScene],
        timestamp: float
    ) -> Optional[DetectedScene]:
        """Get scene containing a specific timestamp.

        Args:
            scenes: List of detected scenes
            timestamp: Time in seconds

        Returns:
            DetectedScene or None
        """
        for scene in scenes:
            if scene.start_time <= timestamp <= scene.end_time:
                return scene
        return None

    def merge_short_scenes(
        self,
        scenes: List[DetectedScene],
        min_duration: float = 1.0
    ) -> List[DetectedScene]:
        """Merge scenes shorter than minimum duration.

        Args:
            scenes: List of detected scenes
            min_duration: Minimum scene duration in seconds

        Returns:
            List of merged scenes
        """
        if not scenes:
            return scenes

        merged = []
        current = scenes[0]

        for next_scene in scenes[1:]:
            if current.duration < min_duration:
                # Merge with next scene
                current = DetectedScene(
                    id=current.id,
                    start_time=current.start_time,
                    end_time=next_scene.end_time,
                    start_frame=current.start_frame,
                    end_frame=next_scene.end_frame,
                    transition_type=current.transition_type
                )
            else:
                merged.append(current)
                current = next_scene

        merged.append(current)

        logger.info(f"Merged {len(scenes)} scenes to {len(merged)} scenes")
        return merged
