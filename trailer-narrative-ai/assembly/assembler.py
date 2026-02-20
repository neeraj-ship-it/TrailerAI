"""Trailer video assembly engine with AI music integration."""

import os
import shutil
import tempfile
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from loguru import logger

from config import get_config
from narrative.generator import NarrativeVariant, ShotInstruction

# Try to import music generator
HAS_MUSICGEN = False
try:
    from audio.music_generator import TrailerMusicGenerator, is_musicgen_available
    HAS_MUSICGEN = is_musicgen_available()
except ImportError:
    pass


@dataclass
class TrailerOutput:
    """Output of trailer assembly."""
    variant_id: str
    style: str
    local_path: str
    s3_key: Optional[str] = None
    s3_url: Optional[str] = None
    format: str = "mp4"
    resolution: str = "1080p"
    duration: float = 0
    file_size: int = 0
    has_ai_music: bool = False
    music_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "variant_id": self.variant_id,
            "style": self.style,
            "local_path": self.local_path,
            "s3_key": self.s3_key,
            "s3_url": self.s3_url,
            "format": self.format,
            "resolution": self.resolution,
            "duration": self.duration,
            "file_size": self.file_size,
            "has_ai_music": self.has_ai_music,
            "music_path": self.music_path
        }


class TrailerAssembler:
    """Assemble trailer videos from narrative shot sequences."""

    RESOLUTION_MAP = {
        "4k": (3840, 2160),
        "1080p": (1920, 1080),
        "720p": (1280, 720),
        "480p": (854, 480)
    }

    def __init__(
        self,
        output_format: str = "mp4",
        resolution: str = "1080p",
        include_watermark: bool = True,
        watermark_text: str = "AI-Generated Reference",
        temp_dir: Optional[str] = None,
        enable_ai_music: Optional[bool] = None,
        music_volume: float = 0.3,
        keep_original_audio: bool = True
    ):
        """Initialize trailer assembler.

        Args:
            output_format: Output video format (mp4, mov)
            resolution: Output resolution
            include_watermark: Whether to add watermark
            watermark_text: Watermark text
            temp_dir: Temporary directory for processing
            enable_ai_music: Enable AI music generation (default: from config)
            music_volume: Volume level for AI music (0.0-1.0)
            keep_original_audio: Keep original audio mixed with music
        """
        config = get_config()

        self.output_format = output_format
        self.resolution = resolution
        self.include_watermark = include_watermark
        self.watermark_text = watermark_text
        self.temp_dir = temp_dir or config.assembly.temp_dir
        self.music_volume = music_volume
        self.keep_original_audio = keep_original_audio

        # Initialize AI music generator
        self.enable_ai_music = enable_ai_music if enable_ai_music is not None else config.music.enabled
        self._music_generator = None

        if self.enable_ai_music and HAS_MUSICGEN:
            try:
                self._music_generator = TrailerMusicGenerator(
                    model_size=config.music.model_size,
                    device=None  # Auto-detect
                )
                logger.info("AI Music Generator initialized (MusicGen)")
            except Exception as e:
                logger.warning(f"Failed to initialize MusicGen: {e}")
                self.enable_ai_music = False
        elif self.enable_ai_music:
            logger.info("MusicGen not available, AI music disabled")
            self.enable_ai_music = False

        # Ensure temp directory exists
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)

    def assemble_variant(
        self,
        source_video: Union[str, Path],
        narrative: NarrativeVariant,
        output_dir: Union[str, Path]
    ) -> TrailerOutput:
        """Assemble a single trailer variant.

        Args:
            source_video: Path to source video
            narrative: Narrative variant to assemble
            output_dir: Output directory

        Returns:
            TrailerOutput object
        """
        source_video = Path(source_video)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Assembling {narrative.style} trailer variant")

        # Create variant-specific temp directory
        variant_temp = Path(self.temp_dir) / narrative.id
        variant_temp.mkdir(parents=True, exist_ok=True)

        music_path = None
        has_ai_music = False

        try:
            # Step 1: Extract all shots
            shot_paths = self._extract_shots(
                source_video,
                narrative.shot_sequence,
                variant_temp
            )

            if not shot_paths:
                raise ValueError("No shots extracted")

            # Step 2: Create concat file
            concat_file = variant_temp / "concat.txt"
            self._create_concat_file(shot_paths, concat_file)

            # Step 3: Concatenate shots
            raw_trailer = variant_temp / f"raw_{narrative.id}.{self.output_format}"
            self._concatenate_shots(concat_file, raw_trailer)

            # Step 4: Generate and mix AI music if enabled
            processed_trailer = raw_trailer
            if self.enable_ai_music and self._music_generator:
                try:
                    logger.info(f"Generating AI music for {narrative.style} trailer...")
                    trailer_duration = self._get_video_duration(raw_trailer)

                    # Generate music
                    music_file = self._music_generator.generate_music(
                        style=narrative.style,
                        duration=min(int(trailer_duration) + 5, 30),
                        output_path=variant_temp / f"music_{narrative.style}.wav"
                    )

                    # Mix music with video
                    mixed_trailer = variant_temp / f"mixed_{narrative.id}.{self.output_format}"
                    self._mix_audio_with_music(raw_trailer, music_file, mixed_trailer)
                    processed_trailer = mixed_trailer
                    music_path = str(music_file)
                    has_ai_music = True
                    logger.info(f"AI music generated and mixed: {music_file}")
                except Exception as e:
                    logger.warning(f"AI music generation failed: {e}, using original audio")
                    processed_trailer = raw_trailer

            # Step 5: Add watermark if enabled
            output_filename = f"trailer_{narrative.style}_{narrative.id}.{self.output_format}"
            final_path = output_dir / output_filename

            if self.include_watermark:
                self._add_watermark(processed_trailer, final_path)
            else:
                shutil.copy2(processed_trailer, final_path)

            # Get video info
            duration = self._get_video_duration(final_path)
            file_size = final_path.stat().st_size

            logger.info(
                f"Assembled {narrative.style} trailer: {final_path} "
                f"({duration:.1f}s, {file_size/1024/1024:.1f}MB)"
                f"{' [with AI music]' if has_ai_music else ''}"
            )

            return TrailerOutput(
                variant_id=narrative.id,
                style=narrative.style,
                local_path=str(final_path),
                format=self.output_format,
                resolution=self.resolution,
                duration=duration,
                file_size=file_size,
                has_ai_music=has_ai_music,
                music_path=music_path
            )

        finally:
            # Cleanup temp directory
            self._cleanup(variant_temp)

    def assemble_all_variants(
        self,
        source_video: Union[str, Path],
        narratives: List[NarrativeVariant],
        output_dir: Union[str, Path]
    ) -> List[TrailerOutput]:
        """Assemble trailers for all narrative variants.

        Args:
            source_video: Path to source video
            narratives: List of narrative variants
            output_dir: Output directory

        Returns:
            List of TrailerOutput objects
        """
        source_video = Path(source_video)
        output_dir = Path(output_dir)

        logger.info(f"Assembling {len(narratives)} trailer variants")

        outputs = []
        for narrative in narratives:
            try:
                output = self.assemble_variant(source_video, narrative, output_dir)
                outputs.append(output)
            except Exception as e:
                logger.error(f"Failed to assemble {narrative.style} variant: {e}")

        logger.info(f"Successfully assembled {len(outputs)}/{len(narratives)} trailers")
        return outputs

    def _extract_shots(
        self,
        source_video: Path,
        shots: List[ShotInstruction],
        temp_dir: Path
    ) -> List[Path]:
        """Extract all shots from source video.

        Args:
            source_video: Source video path
            shots: List of shot instructions
            temp_dir: Temporary directory

        Returns:
            List of extracted shot paths
        """
        shot_paths = []

        for i, shot in enumerate(shots):
            output_path = temp_dir / f"shot_{i:03d}.{self.output_format}"

            try:
                self._extract_shot(
                    source_video,
                    shot.timecode_start,
                    shot.timecode_end,
                    output_path,
                    shot.recommended_duration
                )
                shot_paths.append(output_path)
            except Exception as e:
                logger.warning(f"Failed to extract shot {i}: {e}")

        logger.info(f"Extracted {len(shot_paths)}/{len(shots)} shots")
        return shot_paths

    def _extract_shot(
        self,
        source: Path,
        start_time: str,
        end_time: str,
        output: Path,
        duration: Optional[float] = None
    ) -> None:
        """Extract a single shot from source video.

        Args:
            source: Source video path
            start_time: Start timecode (HH:MM:SS.mmm)
            end_time: End timecode
            output: Output path
            duration: Optional duration override
        """
        # Build ffmpeg command
        cmd = ['ffmpeg', '-y']

        # Input with seeking
        cmd.extend(['-ss', start_time])
        cmd.extend(['-i', str(source)])

        # Duration
        if duration:
            cmd.extend(['-t', str(duration)])
        else:
            cmd.extend(['-to', end_time])

        # Video settings
        width, height = self.RESOLUTION_MAP.get(self.resolution, (1920, 1080))
        cmd.extend([
            '-vf', f'scale={width}:{height}:force_original_aspect_ratio=decrease,'
                   f'pad={width}:{height}:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '18',
        ])

        # Audio settings
        cmd.extend([
            '-c:a', 'aac',
            '-b:a', '320k',
        ])

        cmd.append(str(output))

        # Run ffmpeg
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {result.stderr}")

    def _create_concat_file(
        self,
        shot_paths: List[Path],
        output_file: Path
    ) -> None:
        """Create FFmpeg concat demuxer file.

        Args:
            shot_paths: List of shot paths
            output_file: Output concat file path
        """
        with open(output_file, 'w') as f:
            for path in shot_paths:
                # Escape single quotes in path
                escaped_path = str(path).replace("'", "'\\''")
                f.write(f"file '{escaped_path}'\n")

    def _concatenate_shots(
        self,
        concat_file: Path,
        output: Path
    ) -> None:
        """Concatenate shots using FFmpeg concat demuxer.

        Args:
            concat_file: Concat file path
            output: Output video path
        """
        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-c', 'copy',
            str(output)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            # Try with re-encoding if concat fails
            logger.warning("Concat failed, trying with re-encoding")
            self._concatenate_with_reencode(concat_file, output)

    def _concatenate_with_reencode(
        self,
        concat_file: Path,
        output: Path
    ) -> None:
        """Concatenate with re-encoding for compatibility.

        Args:
            concat_file: Concat file path
            output: Output video path
        """
        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '320k',
            str(output)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg concat failed: {result.stderr}")

    def _mix_audio_with_music(
        self,
        video_path: Path,
        music_path: Path,
        output_path: Path
    ) -> None:
        """Mix original audio with AI-generated music.

        Args:
            video_path: Input video path
            music_path: Music file path
            output_path: Output video path
        """
        # Calculate audio volumes
        original_vol = 0.7 if self.keep_original_audio else 0.0
        music_vol = self.music_volume

        if self.keep_original_audio:
            # Mix both audio tracks
            filter_complex = (
                f"[0:a]volume={original_vol}[a0];"
                f"[1:a]volume={music_vol}[a1];"
                f"[a0][a1]amix=inputs=2:duration=first[aout]"
            )
        else:
            # Replace original audio with music
            filter_complex = f"[1:a]volume={music_vol}[aout]"

        cmd = [
            'ffmpeg', '-y',
            '-i', str(video_path),
            '-i', str(music_path),
            '-filter_complex', filter_complex,
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '320k',
            '-shortest',
            str(output_path)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            # Try simpler approach without filter_complex
            logger.warning("Audio mixing failed, trying simple overlay")
            cmd_simple = [
                'ffmpeg', '-y',
                '-i', str(video_path),
                '-i', str(music_path),
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v',
                '-map', '1:a',
                '-shortest',
                str(output_path)
            ]
            result = subprocess.run(cmd_simple, capture_output=True, text=True)

            if result.returncode != 0:
                raise RuntimeError(f"Audio mixing failed: {result.stderr}")

    def _add_watermark(
        self,
        input_video: Path,
        output_video: Path
    ) -> None:
        """Add watermark text to video.

        Args:
            input_video: Input video path
            output_video: Output video path
        """
        # Escape special characters in watermark text
        escaped_text = self.watermark_text.replace("'", "'\\''")

        cmd = [
            'ffmpeg', '-y',
            '-i', str(input_video),
            '-vf', f"drawtext=text='{escaped_text}':"
                   f"fontsize=24:fontcolor=white@0.5:"
                   f"x=w-tw-20:y=h-th-20",
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '18',
            '-c:a', 'copy',
            str(output_video)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            # Fall back to copying without watermark
            logger.warning("Watermark failed, copying without watermark")
            shutil.copy2(input_video, output_video)

    def _get_video_duration(self, video_path: Path) -> float:
        """Get video duration using ffprobe.

        Args:
            video_path: Path to video

        Returns:
            Duration in seconds
        """
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(video_path)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())

        return 0.0

    def _cleanup(self, temp_dir: Path) -> None:
        """Clean up temporary directory.

        Args:
            temp_dir: Directory to clean up
        """
        try:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup {temp_dir}: {e}")


class AdvancedTrailerAssembler(TrailerAssembler):
    """Advanced assembler with transitions using moviepy."""

    def __init__(self, *args, **kwargs):
        """Initialize advanced assembler."""
        super().__init__(*args, **kwargs)
        self._check_moviepy()

    def _check_moviepy(self):
        """Check if moviepy is available."""
        try:
            from moviepy.editor import VideoFileClip
            self._has_moviepy = True
        except ImportError:
            self._has_moviepy = False
            logger.warning("moviepy not available, using basic assembly")

    def _apply_transitions(
        self,
        shot_paths: List[Path],
        transitions: List[str],
        output: Path
    ) -> None:
        """Apply transitions between shots using moviepy.

        Args:
            shot_paths: List of shot paths
            transitions: List of transition types
            output: Output path
        """
        if not self._has_moviepy:
            # Fall back to basic concatenation
            concat_file = output.parent / "concat.txt"
            self._create_concat_file(shot_paths, concat_file)
            self._concatenate_shots(concat_file, output)
            return

        from moviepy.editor import (
            VideoFileClip, concatenate_videoclips,
            CompositeVideoClip
        )

        clips = []
        for path in shot_paths:
            clip = VideoFileClip(str(path))
            clips.append(clip)

        # Simple concatenation with crossfade
        result_clips = [clips[0]]

        for i, (clip, transition) in enumerate(zip(clips[1:], transitions)):
            if transition in ("fade", "dissolve", "crossfade"):
                # Add crossfade
                clip = clip.crossfadein(0.5)
                result_clips[-1] = result_clips[-1].crossfadeout(0.5)

            result_clips.append(clip)

        # Concatenate
        final = concatenate_videoclips(result_clips, method="compose")

        # Write output
        final.write_videofile(
            str(output),
            codec='libx264',
            audio_codec='aac',
            bitrate='20M',
            preset='medium',
            ffmpeg_params=['-crf', '18']
        )

        # Cleanup
        for clip in clips:
            clip.close()
        final.close()
