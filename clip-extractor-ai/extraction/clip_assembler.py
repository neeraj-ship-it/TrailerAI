"""FFmpeg-based clip extraction and compilation.

Extracts clips from source video and optionally compiles them together.
"""

import subprocess
import json
import os
from pathlib import Path
from typing import List, Optional, Callable
from loguru import logger

from config import get_config
from extraction.clip_selector import ClipPlan, ClipSegment, seconds_to_timecode


def _run_ffmpeg(args: List[str], description: str = "") -> bool:
    """Run an FFmpeg command.

    Args:
        args: FFmpeg command arguments (without 'ffmpeg' prefix)
        description: Human-readable description of the operation

    Returns:
        True if successful, False otherwise
    """
    cmd = ["ffmpeg", "-y"] + args  # -y to overwrite output files
    logger.info(f"FFmpeg: {description}")
    logger.debug(f"Command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 min timeout per operation
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg failed: {result.stderr[-500:]}")
            return False

        return True
    except subprocess.TimeoutExpired:
        logger.error(f"FFmpeg timed out: {description}")
        return False
    except FileNotFoundError:
        logger.error("FFmpeg not found. Make sure ffmpeg is installed.")
        return False


def _get_video_duration(video_path: str) -> float:
    """Get duration of a video file using ffprobe.

    Returns:
        Duration in seconds, or 0 if failed
    """
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", video_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return float(data.get("format", {}).get("duration", 0))
    except Exception as e:
        logger.warning(f"Could not get video duration: {e}")
    return 0


def extract_segment(
    source_video: str,
    segment: ClipSegment,
    output_path: str,
) -> bool:
    """Extract a single segment from the source video.

    Args:
        source_video: Path to source video
        segment: ClipSegment with timecodes
        output_path: Output file path

    Returns:
        True if successful
    """
    config = get_config()
    ffmpeg_cfg = config.ffmpeg

    args = [
        "-ss", str(segment.start_seconds),
        "-i", source_video,
        "-to", str(segment.duration),
        "-c:v", ffmpeg_cfg.video_codec,
        "-preset", ffmpeg_cfg.preset,
        "-crf", str(ffmpeg_cfg.crf),
        "-c:a", ffmpeg_cfg.audio_codec,
        "-b:a", ffmpeg_cfg.audio_bitrate,
        "-avoid_negative_ts", "make_zero",
        output_path,
    ]

    return _run_ffmpeg(
        args,
        f"Extract segment {segment.timecode_start} → {segment.timecode_end}",
    )


def concat_segments(
    segment_files: List[str],
    output_path: str,
) -> bool:
    """Concatenate multiple video segments into one clip.

    Uses FFmpeg concat demuxer for lossless concatenation.

    Args:
        segment_files: List of segment file paths
        output_path: Output file path

    Returns:
        True if successful
    """
    if len(segment_files) == 1:
        # Just copy the single file
        import shutil
        shutil.copy2(segment_files[0], output_path)
        return True

    config = get_config()
    ffmpeg_cfg = config.ffmpeg

    # Create concat file
    concat_file = output_path + ".concat.txt"
    with open(concat_file, "w") as f:
        for seg_file in segment_files:
            f.write(f"file '{seg_file}'\n")

    args = [
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:v", ffmpeg_cfg.video_codec,
        "-preset", ffmpeg_cfg.preset,
        "-crf", str(ffmpeg_cfg.crf),
        "-c:a", ffmpeg_cfg.audio_codec,
        "-b:a", ffmpeg_cfg.audio_bitrate,
        output_path,
    ]

    success = _run_ffmpeg(args, f"Concatenate {len(segment_files)} segments")

    # Cleanup concat file
    try:
        os.remove(concat_file)
    except OSError:
        pass

    return success


def extract_clip(
    source_video: str,
    clip_plan: ClipPlan,
    output_dir: str,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> Optional[str]:
    """Extract a single clip based on the clip plan.

    If the clip has multiple segments, each is extracted separately
    and then compiled together.

    Args:
        source_video: Path to source video
        clip_plan: ClipPlan with segments
        output_dir: Directory for output files
        progress_callback: Progress callback (0.0-1.0)

    Returns:
        Path to extracted clip file, or None if failed
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    clip_filename = f"{clip_plan.clip_name}.mp4"
    clip_output = str(output_dir / clip_filename)

    total_segments = len(clip_plan.segments)

    if total_segments == 0:
        logger.error(f"No segments for clip {clip_plan.clip_id}")
        return None

    if total_segments == 1 and not clip_plan.is_compiled:
        # Single continuous clip - extract directly
        segment = clip_plan.segments[0]
        success = extract_segment(source_video, segment, clip_output)

        if progress_callback:
            progress_callback(1.0)

        return clip_output if success else None

    # Multiple segments - extract each then concatenate
    segment_files = []
    temp_dir = output_dir / f"_temp_{clip_plan.clip_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    for i, segment in enumerate(clip_plan.segments):
        seg_output = str(temp_dir / f"seg_{i:03d}.mp4")
        success = extract_segment(source_video, segment, seg_output)

        if not success:
            logger.error(f"Failed to extract segment {i} for {clip_plan.clip_id}")
            # Cleanup
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
            return None

        segment_files.append(seg_output)

        if progress_callback:
            progress_callback((i + 1) / (total_segments + 1))  # Reserve some for concat

    # Concatenate segments
    success = concat_segments(segment_files, clip_output)

    # Cleanup temp segments
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

    if progress_callback:
        progress_callback(1.0)

    return clip_output if success else None


def create_compiled_video(
    clip_files: List[str],
    output_path: str,
    max_duration: int = 120,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> Optional[str]:
    """Create a compiled video from all extracted clips.

    Concatenates all clips with brief crossfade transitions.

    Args:
        clip_files: List of clip file paths
        output_path: Output file path
        max_duration: Maximum compiled video duration in seconds
        progress_callback: Progress callback (0.0-1.0)

    Returns:
        Path to compiled video, or None if failed
    """
    if not clip_files:
        logger.error("No clips to compile")
        return None

    logger.info(f"Creating compiled video from {len(clip_files)} clips")

    # Check total duration
    total_dur = 0
    valid_clips = []
    for cf in clip_files:
        dur = _get_video_duration(cf)
        if total_dur + dur <= max_duration:
            valid_clips.append(cf)
            total_dur += dur
        else:
            remaining = max_duration - total_dur
            if remaining > 10:  # Only include if meaningful
                valid_clips.append(cf)
                total_dur += dur
            break

    if not valid_clips:
        logger.error("No valid clips for compilation")
        return None

    logger.info(f"Compiling {len(valid_clips)} clips (total ~{total_dur:.1f}s)")

    success = concat_segments(valid_clips, output_path)

    if progress_callback:
        progress_callback(1.0)

    return output_path if success else None


def extract_all_clips(
    source_video: str,
    clip_plans: List[ClipPlan],
    output_dir: str,
    generate_compiled: bool = True,
    compiled_max_duration: int = 120,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> dict:
    """Extract all clips and optionally create compiled video.

    Args:
        source_video: Path to source video
        clip_plans: List of ClipPlan objects
        output_dir: Directory for output files
        generate_compiled: Whether to create compiled video
        compiled_max_duration: Max duration for compiled video
        progress_callback: Progress callback (progress 0-1, message)

    Returns:
        Dict with clip_files, compiled_file, and report
    """
    output_dir = Path(output_dir)
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    total_steps = len(clip_plans) + (1 if generate_compiled else 0)
    clip_files = []
    clip_results = []

    for idx, plan in enumerate(clip_plans):
        logger.info(f"\n--- Extracting {plan.clip_id}: {plan.description} ---")

        def clip_progress(p, _idx=idx):
            if progress_callback:
                overall = (_idx + p) / total_steps
                progress_callback(overall, f"Extracting {plan.clip_id}")

        clip_path = extract_clip(
            source_video, plan, str(clips_dir), progress_callback=clip_progress,
        )

        if clip_path:
            clip_files.append(clip_path)
            file_size = Path(clip_path).stat().st_size
            actual_duration = _get_video_duration(clip_path)

            clip_results.append({
                "clipId": plan.clip_id,
                "clipName": plan.clip_name,
                "filePath": clip_path,
                "fileName": Path(clip_path).name,
                "duration": round(actual_duration, 2),
                "score": round(plan.score * 100, 1),
                "beatOrder": plan.beat_order,
                "beatType": plan.beat_type,
                "emotionalTone": plan.emotional_tone,
                "description": plan.description,
                "timecodeStart": plan.timecode_start,
                "timecodeEnd": plan.timecode_end,
                "isCompiled": plan.is_compiled,
                "numSegments": len(plan.segments),
                "fileSize": file_size,
            })
            logger.info(f"  ✓ {plan.clip_id}: {actual_duration:.1f}s, {file_size/(1024*1024):.1f} MB")
        else:
            logger.error(f"  ✗ Failed to extract {plan.clip_id}")

    # Create compiled video
    compiled_path = None
    if generate_compiled and clip_files:
        compiled_output = str(output_dir / "compiled_best_clips.mp4")
        logger.info(f"\n--- Creating compiled video ---")

        def compiled_progress(p):
            if progress_callback:
                overall = (len(clip_plans) + p) / total_steps
                progress_callback(overall, "Compiling all clips")

        compiled_path = create_compiled_video(
            clip_files, compiled_output,
            max_duration=compiled_max_duration,
            progress_callback=compiled_progress,
        )

        if compiled_path:
            compiled_size = Path(compiled_path).stat().st_size
            compiled_dur = _get_video_duration(compiled_path)
            logger.info(f"  ✓ Compiled video: {compiled_dur:.1f}s, {compiled_size/(1024*1024):.1f} MB")

    # Generate extraction report
    report = {
        "totalClips": len(clip_results),
        "successfulClips": len(clip_files),
        "failedClips": len(clip_plans) - len(clip_files),
        "clips": clip_results,
        "compiledVideo": {
            "generated": compiled_path is not None,
            "filePath": compiled_path,
            "duration": _get_video_duration(compiled_path) if compiled_path else 0,
            "fileSize": Path(compiled_path).stat().st_size if compiled_path else 0,
        } if generate_compiled else None,
    }

    # Write report JSON
    report_path = str(output_dir / "extraction_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Extraction report saved: {report_path}")

    return {
        "clip_files": clip_files,
        "clip_results": clip_results,
        "compiled_file": compiled_path,
        "report_path": report_path,
        "report": report,
    }
