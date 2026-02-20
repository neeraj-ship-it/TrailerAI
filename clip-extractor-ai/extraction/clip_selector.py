"""Clip selection based on video emotion analysis.

Analyzes video using FFmpeg scene detection and audio energy analysis
to find the most emotional/high-energy moments for clip extraction.
No narrative required - pure video-based emotion detection.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Callable
from loguru import logger

from config.constants import (
    DEFAULT_MIN_CLIP_DURATION,
    DEFAULT_MAX_CLIP_DURATION,
    DEFAULT_SEGMENT_MIN_DURATION,
    DEFAULT_SEGMENT_MAX_DURATION,
)
from core.video_analyzer import (
    VideoSegment,
    find_emotional_segments,
    get_video_duration,
)


@dataclass
class ClipSegment:
    """A segment within a clip (for compiled clips)."""
    timecode_start: str
    timecode_end: str
    start_seconds: float
    end_seconds: float
    duration: float
    source_beat_order: int


@dataclass
class ClipPlan:
    """Extraction plan for a single clip."""
    clip_id: str
    clip_name: str
    beat_order: int
    beat_type: str  # segment_type from video analysis
    emotional_tone: str  # emotional_label from video analysis
    description: str
    score: float
    is_compiled: bool
    segments: List[ClipSegment] = field(default_factory=list)
    total_duration: float = 0.0

    @property
    def timecode_start(self) -> str:
        if self.segments:
            return self.segments[0].timecode_start
        return "00:00:00.000"

    @property
    def timecode_end(self) -> str:
        if self.segments:
            return self.segments[-1].timecode_end
        return "00:00:00.000"


def seconds_to_timecode(seconds: float) -> str:
    """Convert seconds to HH:MM:SS.mmm format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def _select_non_overlapping(
    segments: List[VideoSegment],
    num_clips: int,
    min_gap: float = 30.0,
) -> List[VideoSegment]:
    """Select top N non-overlapping segments.

    Greedily picks highest-scored segments that don't overlap
    (with a minimum gap between them for variety).
    """
    selected = []

    for seg in segments:  # Already sorted by score desc
        if len(selected) >= num_clips:
            break

        # Check overlap with already selected
        overlaps = False
        for existing in selected:
            # Two segments overlap if their ranges intersect (with gap buffer)
            if not (seg.end + min_gap <= existing.start or
                    seg.start >= existing.end + min_gap):
                overlaps = True
                break

        if not overlaps:
            selected.append(seg)

    return selected


def _expand_segment_to_clip(
    segment: VideoSegment,
    video_duration: float,
    min_clip_duration: int,
    max_clip_duration: int,
) -> List[ClipSegment]:
    """Expand an analysis window segment into a full clip duration.

    Centers the clip around the high-scoring segment and extends
    to reach the desired clip duration.
    """
    seg_center = (segment.start + segment.end) / 2
    target_duration = min(max_clip_duration, max(min_clip_duration, segment.duration))

    # Center the clip around the emotional peak
    clip_start = max(0, seg_center - target_duration / 2)
    clip_end = min(video_duration, clip_start + target_duration)

    # Adjust if we hit video boundaries
    if clip_end - clip_start < min_clip_duration:
        if clip_start == 0:
            clip_end = min(video_duration, min_clip_duration)
        else:
            clip_start = max(0, clip_end - min_clip_duration)

    actual_duration = clip_end - clip_start

    return [ClipSegment(
        timecode_start=seconds_to_timecode(clip_start),
        timecode_end=seconds_to_timecode(clip_end),
        start_seconds=clip_start,
        end_seconds=clip_end,
        duration=actual_duration,
        source_beat_order=0,
    )]


def select_clips(
    video_path: str,
    num_clips: int = 5,
    min_clip_duration: int = DEFAULT_MIN_CLIP_DURATION,
    max_clip_duration: int = DEFAULT_MAX_CLIP_DURATION,
    segment_min_duration: int = DEFAULT_SEGMENT_MIN_DURATION,
    segment_max_duration: int = DEFAULT_SEGMENT_MAX_DURATION,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> List[ClipPlan]:
    """Select best clips from video based on emotional analysis.

    Algorithm:
    1. Analyze video using scene detection + audio energy
    2. Score analysis windows by emotional intensity
    3. Select top N non-overlapping segments
    4. Expand each segment to clip duration (1-2 min)

    Args:
        video_path: Path to source video file
        num_clips: Number of clips to extract
        min_clip_duration: Minimum clip duration in seconds
        max_clip_duration: Maximum clip duration in seconds
        segment_min_duration: Min segment duration (unused in emotion mode)
        segment_max_duration: Max segment duration (unused in emotion mode)
        progress_callback: Progress callback (progress, message)

    Returns:
        List of ClipPlan objects with extraction details
    """
    video_duration = get_video_duration(video_path)
    if video_duration <= 0:
        logger.error("Could not determine video duration")
        return []

    logger.info(f"Analyzing video for emotional moments ({video_duration:.0f}s)...")

    # Analysis window size: larger for longer videos
    if video_duration > 3600:  # > 1 hour
        analysis_window = 30.0
    elif video_duration > 1800:  # > 30 min
        analysis_window = 20.0
    else:
        analysis_window = 15.0

    # Find emotional segments
    emotional_segments = find_emotional_segments(
        video_path,
        analysis_window_size=analysis_window,
        scene_threshold=0.3,
        progress_callback=progress_callback,
    )

    if not emotional_segments:
        logger.error("No emotional segments found in video")
        return []

    # Select top N non-overlapping segments
    # Min gap between clips: at least the clip duration to avoid overlap
    min_gap = max(min_clip_duration, 60.0)
    selected_segments = _select_non_overlapping(
        emotional_segments, num_clips, min_gap=min_gap,
    )

    if not selected_segments:
        logger.error("Could not select non-overlapping segments")
        return []

    # Sort by timestamp for logical order
    selected_segments.sort(key=lambda s: s.start)

    logger.info(f"Selected {len(selected_segments)} emotional peaks:")
    for i, seg in enumerate(selected_segments):
        logger.info(
            f"  #{i+1}: {seg.start:.0f}s-{seg.end:.0f}s "
            f"(score={seg.score:.3f}, type={seg.segment_type}, "
            f"emotion={seg.emotional_label})"
        )

    # Create clip plans by expanding segments to full clip duration
    clip_plans = []
    for idx, segment in enumerate(selected_segments):
        clip_num = idx + 1
        clip_id = f"clip_{clip_num:03d}"
        clip_name = f"{clip_id}_{segment.segment_type}"

        # Expand analysis window to full clip duration
        clip_segments = _expand_segment_to_clip(
            segment, video_duration,
            min_clip_duration, max_clip_duration,
        )

        # Update source_beat_order to clip number
        for cs in clip_segments:
            cs.source_beat_order = clip_num

        total_duration = sum(s.duration for s in clip_segments)

        description = (
            f"Emotional {segment.emotional_label} moment at "
            f"{seconds_to_timecode(segment.start)} "
            f"(audio dynamics: {segment.audio_dynamics:.4f}, "
            f"scene density: {segment.scene_density:.2f}/s)"
        )

        clip_plans.append(ClipPlan(
            clip_id=clip_id,
            clip_name=clip_name,
            beat_order=clip_num,
            beat_type=segment.segment_type,
            emotional_tone=segment.emotional_label,
            description=description,
            score=segment.score,
            is_compiled=False,  # Each clip is a single continuous segment
            segments=clip_segments,
            total_duration=total_duration,
        ))

    logger.info(f"Created {len(clip_plans)} clip extraction plans")
    return clip_plans
