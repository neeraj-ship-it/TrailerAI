"""Video analysis using FFmpeg - scene detection + audio energy analysis.

Analyzes video to find emotional/high-energy moments without requiring
a narrative. Uses FFmpeg scene detection and audio RMS levels.
"""

import json
import re
import subprocess
from dataclasses import dataclass, field
from typing import List, Optional, Callable
from loguru import logger


@dataclass
class SceneChange:
    """A detected scene change."""
    timestamp: float
    score: float


@dataclass
class AudioWindow:
    """Audio energy measurement for a time window."""
    start: float
    end: float
    rms_mean: float
    rms_peak: float
    rms_variance: float


@dataclass
class VideoSegment:
    """A scored video segment (candidate for clip extraction)."""
    start: float
    end: float
    duration: float
    audio_energy: float  # Mean RMS level
    audio_dynamics: float  # RMS variance (emotional = high variance)
    audio_peak: float  # Peak RMS level
    scene_density: float  # Scene changes per second
    score: float = 0.0
    segment_type: str = "emotional_moment"
    emotional_label: str = "intense"


def get_video_duration(video_path: str) -> float:
    """Get video duration using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", video_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return float(data.get("format", {}).get("duration", 0))
    except Exception as e:
        logger.warning(f"Could not get video duration: {e}")
    return 0.0


def detect_scenes(
    video_path: str,
    threshold: float = 0.3,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> List[SceneChange]:
    """Detect scene changes using FFmpeg scene filter.

    Args:
        video_path: Path to video file
        threshold: Scene change threshold (0-1, lower = more sensitive)
        progress_callback: Progress callback

    Returns:
        List of SceneChange objects with timestamps
    """
    logger.info(f"Detecting scenes (threshold={threshold})...")

    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", f"select='gt(scene,{threshold})',metadata=print:file=-",
        "-an", "-f", "null", "-",
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600,
        )

        scenes = []
        # Parse output for pts_time values
        for line in result.stderr.split("\n"):
            # Look for: "pts_time:123.456" in showinfo output
            match = re.search(r'pts_time[:\s]+(\d+\.?\d*)', line)
            if match:
                ts = float(match.group(1))
                scenes.append(SceneChange(timestamp=ts, score=threshold))

        # Also parse stdout for metadata print output
        for line in result.stdout.split("\n"):
            match = re.search(r'pts_time[:\s]+(\d+\.?\d*)', line)
            if match:
                ts = float(match.group(1))
                if not any(abs(s.timestamp - ts) < 0.1 for s in scenes):
                    scenes.append(SceneChange(timestamp=ts, score=threshold))

        scenes.sort(key=lambda s: s.timestamp)
        logger.info(f"Detected {len(scenes)} scene changes")

        if progress_callback:
            progress_callback(1.0)

        return scenes

    except subprocess.TimeoutExpired:
        logger.error("Scene detection timed out")
        return []
    except Exception as e:
        logger.error(f"Scene detection failed: {e}")
        return []


def analyze_audio_energy(
    video_path: str,
    window_size: float = 1.0,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> List[AudioWindow]:
    """Analyze audio energy levels per second using ffmpeg.

    Uses volumedetect for overall stats and astats for per-frame analysis.

    Args:
        video_path: Path to video file
        window_size: Analysis window in seconds
        progress_callback: Progress callback

    Returns:
        List of AudioWindow objects with per-second energy data
    """
    logger.info("Analyzing audio energy levels...")

    duration = get_video_duration(video_path)
    if duration <= 0:
        logger.error("Could not determine video duration for audio analysis")
        return []

    # Use ffmpeg with astats to get per-frame RMS levels
    cmd = [
        "ffmpeg", "-i", video_path,
        "-af", "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
        "-vn", "-f", "null", "-",
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600,
        )

        # Parse RMS levels from output
        rms_values = []
        timestamps = []

        for line in result.stdout.split("\n"):
            # Parse "lavfi.astats.Overall.RMS_level=-XX.XX" lines
            rms_match = re.search(r'RMS_level=(-?\d+\.?\d*)', line)
            if rms_match:
                rms_db = float(rms_match.group(1))
                # Convert dB to linear scale (0-1), clamp -inf to -80dB
                if rms_db < -80:
                    rms_db = -80
                rms_linear = 10 ** (rms_db / 20)
                rms_values.append(rms_linear)

            # Parse frame timestamps
            pts_match = re.search(r'pts_time[:\s]+(\d+\.?\d*)', line)
            if pts_match:
                timestamps.append(float(pts_match.group(1)))

        if not rms_values:
            # Fallback: generate synthetic audio data based on volumedetect
            logger.warning("Could not parse per-frame audio data, using fallback")
            return _fallback_audio_analysis(video_path, duration, window_size)

        # Aggregate per-second windows
        windows = []
        num_windows = int(duration / window_size)

        samples_per_window = max(1, len(rms_values) // max(1, num_windows))

        for i in range(num_windows):
            start = i * window_size
            end = min(start + window_size, duration)

            # Get RMS samples for this window
            sample_start = int(i * samples_per_window)
            sample_end = min(sample_start + samples_per_window, len(rms_values))
            window_samples = rms_values[sample_start:sample_end]

            if not window_samples:
                window_samples = [0.0]

            mean_rms = sum(window_samples) / len(window_samples)
            peak_rms = max(window_samples)
            variance = sum((x - mean_rms) ** 2 for x in window_samples) / len(window_samples)

            windows.append(AudioWindow(
                start=start,
                end=end,
                rms_mean=mean_rms,
                rms_peak=peak_rms,
                rms_variance=variance,
            ))

        logger.info(f"Analyzed {len(windows)} audio windows ({len(rms_values)} samples)")

        if progress_callback:
            progress_callback(1.0)

        return windows

    except subprocess.TimeoutExpired:
        logger.error("Audio analysis timed out")
        return _fallback_audio_analysis(video_path, duration, window_size)
    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        return _fallback_audio_analysis(video_path, duration, window_size)


def _fallback_audio_analysis(
    video_path: str,
    duration: float,
    window_size: float,
) -> List[AudioWindow]:
    """Fallback audio analysis using volumedetect on chunks.

    Divides video into chunks and measures mean volume per chunk.
    """
    logger.info("Using fallback chunk-based audio analysis...")

    windows = []
    chunk_dur = max(window_size, 5.0)  # Analyze in 5-second chunks minimum
    num_chunks = int(duration / chunk_dur)

    for i in range(num_chunks):
        start = i * chunk_dur
        end = min(start + chunk_dur, duration)

        cmd = [
            "ffmpeg", "-ss", str(start), "-i", video_path,
            "-t", str(chunk_dur),
            "-af", "volumedetect",
            "-vn", "-f", "null", "-",
        ]

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30,
            )

            mean_vol = -30.0  # default
            max_vol = -20.0

            for line in result.stderr.split("\n"):
                mean_match = re.search(r'mean_volume:\s*(-?\d+\.?\d*)', line)
                max_match = re.search(r'max_volume:\s*(-?\d+\.?\d*)', line)
                if mean_match:
                    mean_vol = float(mean_match.group(1))
                if max_match:
                    max_vol = float(max_match.group(1))

            # Convert dB to linear
            mean_linear = 10 ** (max(mean_vol, -80) / 20)
            peak_linear = 10 ** (max(max_vol, -80) / 20)
            variance = abs(peak_linear - mean_linear) ** 2

            windows.append(AudioWindow(
                start=start,
                end=end,
                rms_mean=mean_linear,
                rms_peak=peak_linear,
                rms_variance=variance,
            ))

        except Exception:
            windows.append(AudioWindow(
                start=start, end=end,
                rms_mean=0.01, rms_peak=0.01, rms_variance=0.0,
            ))

    logger.info(f"Fallback analysis: {len(windows)} chunks analyzed")
    return windows


def find_emotional_segments(
    video_path: str,
    analysis_window_size: float = 10.0,
    scene_threshold: float = 0.3,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> List[VideoSegment]:
    """Find emotional/high-energy segments in a video.

    Combines scene detection + audio energy analysis to identify
    the most emotional/intense moments.

    Args:
        video_path: Path to video file
        analysis_window_size: Size of analysis windows in seconds
        scene_threshold: Scene change detection threshold
        progress_callback: Progress callback (progress, message)

    Returns:
        List of VideoSegment objects, sorted by score (highest first)
    """
    duration = get_video_duration(video_path)
    if duration <= 0:
        raise ValueError("Could not determine video duration")

    logger.info(f"Video duration: {duration:.1f}s ({duration/60:.1f} min)")

    # Step 1: Detect scenes
    if progress_callback:
        progress_callback(0.0, "Detecting scene changes")

    scenes = detect_scenes(video_path, threshold=scene_threshold)

    if progress_callback:
        progress_callback(0.4, "Analyzing audio energy")

    # Step 2: Analyze audio
    audio_windows = analyze_audio_energy(video_path, window_size=1.0)

    if progress_callback:
        progress_callback(0.8, "Scoring segments")

    # Step 3: Create analysis windows and score them
    segments = []
    window_step = analysis_window_size / 2  # 50% overlap for better coverage

    cursor = 0.0
    while cursor + analysis_window_size <= duration:
        seg_start = cursor
        seg_end = min(cursor + analysis_window_size, duration)
        seg_duration = seg_end - seg_start

        # Get audio metrics for this window
        window_audio = [
            aw for aw in audio_windows
            if aw.start >= seg_start and aw.end <= seg_end + 1
        ]

        if window_audio:
            audio_energy = sum(aw.rms_mean for aw in window_audio) / len(window_audio)
            audio_dynamics = sum(aw.rms_variance for aw in window_audio) / len(window_audio)
            audio_peak = max(aw.rms_peak for aw in window_audio)
        else:
            audio_energy = 0.0
            audio_dynamics = 0.0
            audio_peak = 0.0

        # Count scene changes in this window
        scene_count = sum(
            1 for s in scenes
            if seg_start <= s.timestamp <= seg_end
        )
        scene_density = scene_count / seg_duration if seg_duration > 0 else 0

        segments.append(VideoSegment(
            start=seg_start,
            end=seg_end,
            duration=seg_duration,
            audio_energy=audio_energy,
            audio_dynamics=audio_dynamics,
            audio_peak=audio_peak,
            scene_density=scene_density,
        ))

        cursor += window_step

    if not segments:
        logger.warning("No segments generated, creating uniform segments")
        # Fallback: create uniform segments
        num_seg = max(1, int(duration / analysis_window_size))
        for i in range(num_seg):
            s = i * analysis_window_size
            e = min(s + analysis_window_size, duration)
            segments.append(VideoSegment(
                start=s, end=e, duration=e - s,
                audio_energy=0.5, audio_dynamics=0.0,
                audio_peak=0.5, scene_density=0.0,
            ))

    # Step 4: Normalize and score
    _normalize_and_score(segments)

    # Sort by score
    segments.sort(key=lambda s: s.score, reverse=True)

    if progress_callback:
        progress_callback(1.0, "Analysis complete")

    logger.info(f"Found {len(segments)} candidate segments")
    if segments:
        logger.info(f"Top score: {segments[0].score:.3f}, Bottom: {segments[-1].score:.3f}")

    return segments


def _normalize_and_score(segments: List[VideoSegment]) -> None:
    """Normalize metrics and compute final scores for segments.

    Score formula:
    score = audio_dynamics_norm * 0.35  (emotional = dynamic audio)
          + audio_peak_norm * 0.25      (intense = loud peaks)
          + audio_energy_norm * 0.20    (energy level)
          + scene_density_norm * 0.20   (visual activity)
    """
    if not segments:
        return

    # Find min/max for normalization
    max_energy = max(s.audio_energy for s in segments) or 1.0
    max_dynamics = max(s.audio_dynamics for s in segments) or 1.0
    max_peak = max(s.audio_peak for s in segments) or 1.0
    max_scene_density = max(s.scene_density for s in segments) or 1.0

    for seg in segments:
        energy_norm = seg.audio_energy / max_energy
        dynamics_norm = seg.audio_dynamics / max_dynamics
        peak_norm = seg.audio_peak / max_peak
        scene_norm = seg.scene_density / max_scene_density

        seg.score = (
            dynamics_norm * 0.35
            + peak_norm * 0.25
            + energy_norm * 0.20
            + scene_norm * 0.20
        )

        # Classify segment type based on dominant metric
        if dynamics_norm > 0.7:
            seg.segment_type = "dramatic_moment"
            seg.emotional_label = "dramatic"
        elif peak_norm > 0.7:
            seg.segment_type = "intense_peak"
            seg.emotional_label = "intense"
        elif scene_norm > 0.7:
            seg.segment_type = "action_sequence"
            seg.emotional_label = "action"
        elif energy_norm > 0.6:
            seg.segment_type = "high_energy"
            seg.emotional_label = "energetic"
        else:
            seg.segment_type = "emotional_moment"
            seg.emotional_label = "emotional"
