"""AI Music Generation for trailers using Meta's MusicGen."""

from pathlib import Path
from typing import Optional, Dict, Any
from loguru import logger

# Try to import audiocraft
HAS_MUSICGEN = False
try:
    from audiocraft.models import MusicGen
    from audiocraft.data.audio import audio_write
    import torch
    HAS_MUSICGEN = True
except ImportError:
    pass


class TrailerMusicGenerator:
    """Generate AI music for trailers using MusicGen."""

    # Music prompts for different trailer styles
    STYLE_PROMPTS = {
        "dramatic": "epic cinematic orchestral music, emotional, building tension, dramatic strings, powerful brass, movie trailer soundtrack",
        "action": "intense action movie trailer music, fast percussion, driving beats, epic brass hits, adrenaline pumping, blockbuster soundtrack",
        "emotional": "emotional piano and strings, heartfelt cinematic music, touching melody, soft orchestral, tearjerker movie soundtrack",
        "mystery": "dark mysterious cinematic music, suspenseful atmosphere, eerie strings, tension building, thriller movie soundtrack",
        "comedy": "upbeat fun orchestral music, playful melody, light-hearted, quirky instruments, comedy movie soundtrack",
        "epic": "epic cinematic orchestra, massive choir, heroic brass fanfare, legendary battle music, grand movie soundtrack",
        "character": "intimate emotional piano, character theme music, personal journey soundtrack, soft strings, reflective melody"
    }

    def __init__(self, model_size: str = "small", device: Optional[str] = None):
        """Initialize music generator.

        Args:
            model_size: MusicGen model size ('small', 'medium', 'large')
            device: Device for inference
        """
        self.model_size = model_size
        self._model = None

        # Auto-detect device
        if device is None:
            if HAS_MUSICGEN and torch.cuda.is_available():
                self.device = "cuda"
            else:
                self.device = "cpu"
        else:
            self.device = device

    def _load_model(self):
        """Lazy-load MusicGen model."""
        if self._model is not None:
            return

        if not HAS_MUSICGEN:
            raise ImportError(
                "audiocraft is required for AI music generation. "
                "Install with: pip install audiocraft"
            )

        logger.info(f"Loading MusicGen model: {self.model_size}")
        self._model = MusicGen.get_pretrained(f'facebook/musicgen-{self.model_size}')
        self._model.set_generation_params(duration=30)  # Default 30 seconds
        logger.info("MusicGen model loaded")

    def generate_music(
        self,
        style: str,
        duration: int = 30,
        output_path: Optional[Path] = None,
        custom_prompt: Optional[str] = None
    ) -> Path:
        """Generate music for a trailer style.

        Args:
            style: Trailer style (dramatic, action, etc.)
            duration: Duration in seconds (max 30 for small model)
            output_path: Output file path
            custom_prompt: Custom music prompt (overrides style)

        Returns:
            Path to generated audio file
        """
        self._load_model()

        # Get prompt
        if custom_prompt:
            prompt = custom_prompt
        else:
            prompt = self.STYLE_PROMPTS.get(style, self.STYLE_PROMPTS["dramatic"])

        logger.info(f"Generating {duration}s {style} music")

        # Set duration
        self._model.set_generation_params(duration=min(duration, 30))

        # Generate
        wav = self._model.generate([prompt])

        # Save
        if output_path is None:
            output_path = Path(f"/tmp/trailer_music_{style}.wav")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Save audio
        audio_write(
            str(output_path.with_suffix('')),
            wav[0].cpu(),
            self._model.sample_rate,
            strategy="loudness"
        )

        actual_path = output_path.with_suffix('.wav')
        logger.info(f"Music saved to: {actual_path}")

        return actual_path

    def generate_trailer_soundtrack(
        self,
        style: str,
        total_duration: int,
        output_dir: Path,
        segments: int = 3
    ) -> Dict[str, Any]:
        """Generate complete trailer soundtrack with multiple segments.

        Args:
            style: Trailer style
            total_duration: Total trailer duration
            output_dir: Output directory
            segments: Number of music segments

        Returns:
            Dict with paths and metadata
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate segments with varying intensity
        segment_duration = min(30, total_duration // segments + 5)

        prompts = self._get_segment_prompts(style, segments)
        paths = []

        for i, prompt in enumerate(prompts):
            try:
                path = self.generate_music(
                    style=style,
                    duration=segment_duration,
                    output_path=output_dir / f"music_segment_{i+1}.wav",
                    custom_prompt=prompt
                )
                paths.append(str(path))
            except Exception as e:
                logger.error(f"Failed to generate segment {i+1}: {e}")

        return {
            "style": style,
            "total_duration": total_duration,
            "segments": paths,
            "sample_rate": 32000
        }

    def _get_segment_prompts(self, style: str, segments: int) -> list:
        """Get prompts for each segment with varying intensity."""
        base_prompt = self.STYLE_PROMPTS.get(style, self.STYLE_PROMPTS["dramatic"])

        if segments == 1:
            return [base_prompt]

        # Build intensity progression
        prompts = []
        intensities = ["soft intro building", "medium intensity rising", "powerful climax epic"]

        for i in range(segments):
            idx = min(i, len(intensities) - 1)
            prompts.append(f"{base_prompt}, {intensities[idx]}")

        return prompts


def is_musicgen_available() -> bool:
    """Check if MusicGen is available."""
    return HAS_MUSICGEN
