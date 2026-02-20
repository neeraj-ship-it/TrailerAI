"""Production-Grade Trailer Narrative Generator.

Generates production-ready trailer variants with:
- Professional 5-act story structure
- Character introduction and arc
- Suspense curve optimization
- Hook-based endings (questions, tension)
- Indian dialect awareness
- Minimal editor intervention required

Uses StoryEngine for narrative construction.
"""

import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Set
from loguru import logger

from config import get_config
from narrative.story_engine import (
    StoryEngine, StoryNarrative, StoryBeat, TrailerShot
)


@dataclass
class ShotInstruction:
    """Single shot instruction for trailer assembly.

    Compatible with existing assembler interface.
    """
    order: int
    scene_ref: str
    timecode_start: str
    timecode_end: str
    duration: float
    phase: str  # Maps to StoryBeat
    audio: str  # dialogue, music
    dialogue: Optional[str]
    transition: str
    text_overlay: Optional[str] = None
    is_hook: bool = False

    @property
    def recommended_duration(self) -> float:
        """Alias for duration - required by assembler."""
        return self.duration

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order": self.order,
            "scene_ref": self.scene_ref,
            "timecode_start": self.timecode_start,
            "timecode_end": self.timecode_end,
            "recommended_duration": self.duration,
            "purpose": self.phase,
            "audio_recommendation": self.audio,
            "dialogue_line": self.dialogue,
            "transition_in": self.transition,
            "transition_duration": 0.5 if self.transition == "dissolve" else 0.25,
            "text_overlay": self.text_overlay,
            "is_hook_ending": self.is_hook,
            "notes": ""
        }


@dataclass
class NarrativeVariant:
    """Complete trailer narrative variant.

    Compatible with existing assembler interface.
    """
    id: str
    style: str
    title: str
    target_duration: int
    structure: Dict[str, Any]
    shot_sequence: List[ShotInstruction]
    music_recommendation: Dict[str, Any]
    text_overlays: List[Dict[str, Any]]
    opening_hook: str
    closing_tag: str
    confidence: int
    # New fields for production quality
    suspense_peak: float = 0.85
    character_intro_present: bool = True
    hook_ending_present: bool = True

    @property
    def actual_duration(self) -> float:
        return sum(shot.duration for shot in self.shot_sequence)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "style": self.style,
            "title": self.title,
            "target_duration": self.target_duration,
            "actual_duration": self.actual_duration,
            "structure": self.structure,
            "shot_sequence": [s.to_dict() for s in self.shot_sequence],
            "music_recommendation": self.music_recommendation,
            "text_overlays": self.text_overlays,
            "opening_hook": self.opening_hook,
            "closing_tag": self.closing_tag,
            "confidence": self.confidence,
            "suspense_peak": self.suspense_peak,
            "character_intro_present": self.character_intro_present,
            "hook_ending_present": self.hook_ending_present,
            "production_ready": self.confidence >= 75
        }


class NarrativeGenerator:
    """Production-grade narrative generator for trailers.

    Features:
    - Professional 5-act structure via StoryEngine
    - Multiple style variants (dramatic, action, emotional, etc.)
    - Parallel variant generation for speed
    - Indian dialect awareness
    - Production-ready output
    """

    # Dialect-aware power words for scene scoring
    POWER_WORDS = [
        # Questions (BEST for trailers)
        '?',
        # Hindi/Common
        'kya', 'kaun', 'kyun', 'kaise', 'kab', 'kahan',
        # Haryanvi
        'kai', 'kyu', 'kithe', 'kadd', 'kitna',
        # Bhojpuri
        'ka', 'kahe', 'kaahe', 'kaisan', 'kahiya', 'ketna',
        # Rajasthani
        'kaisyo', 'koni',
        # Gujarati
        'su', 'shu', 'kem', 'kyare', 'kyaan', 'kone', 'ketlu',
        # Emotional
        'pyaar', 'dil', 'maa', 'jaan', 'kasam', 'mohabbat', 'laad',
        'thare', 'mahre', 'tohar', 'hamar', 'mhare', 'tame',
        # Power words
        'fight', 'ladai', 'jung', 'takkar', 'khatre'
    ]

    # Spoiler patterns to avoid
    SPOILER_WORDS = [
        # Hindi/Common
        'killed', 'died', 'dead', 'maar diya', 'mar gaya',
        'truth is', 'sach yeh hai', 'because', 'isliye',
        'finally', 'the end', 'khatam', 'solved', 'ant',
        # Haryanvi
        'mar gya', 'ho gya', 'jeet gye', 'haar gye',
        # Bhojpuri
        'mar gail', 'ho gail', 'jeet gailein', 'haar gailein',
        # Rajasthani
        'mar gyo', 'ho gyo', 'jeet gya', 'haar gyo',
        # Gujarati
        'mari gayo', 'thai gayo', 'jitya', 'harya'
    ]

    # Music recommendations by style
    MUSIC_STYLES = {
        "dramatic": {
            "tempo": "slow_build_to_intense",
            "instruments": ["strings", "piano", "choir"],
            "mood": "emotional crescendo",
            "notes": "Start soft, build to powerful climax"
        },
        "action": {
            "tempo": "high_energy",
            "instruments": ["drums", "brass", "electronic"],
            "mood": "adrenaline",
            "notes": "Fast cuts, punchy music"
        },
        "emotional": {
            "tempo": "slow_melodic",
            "instruments": ["piano", "strings", "acoustic guitar"],
            "mood": "heartfelt",
            "notes": "Let dialogue breathe, subtle underscoring"
        },
        "mystery": {
            "tempo": "suspenseful",
            "instruments": ["low strings", "synth pads", "percussion"],
            "mood": "tension",
            "notes": "Deliberate pacing, unsettling tones"
        },
        "thriller": {
            "tempo": "pulsing",
            "instruments": ["synth", "bass", "industrial"],
            "mood": "urgency",
            "notes": "Heartbeat rhythm, building dread"
        },
        "comedy": {
            "tempo": "upbeat",
            "instruments": ["percussion", "winds", "pizzicato"],
            "mood": "playful",
            "notes": "Light, bouncy, supports comic timing"
        },
        "epic": {
            "tempo": "orchestral_build",
            "instruments": ["full orchestra", "choir", "percussion"],
            "mood": "grandeur",
            "notes": "Start small, build to massive finale"
        },
        "character": {
            "tempo": "intimate",
            "instruments": ["solo piano", "acoustic guitar", "minimal strings"],
            "mood": "personal",
            "notes": "Understated, focus on character moments"
        }
    }

    def __init__(self, **kwargs):
        """Initialize the narrative generator."""
        self.config = get_config()
        self.story_engine = StoryEngine()
        self._used_scenes: Set[str] = set()
        logger.info("NarrativeGenerator initialized - Production Grade")

    def generate_variant(
        self,
        style: str,
        scenes: List[Any],
        video_duration: float,
        target_duration: int = 90,
        metadata: Optional[Dict[str, Any]] = None,
        avoid_scenes: Optional[Set[str]] = None
    ) -> NarrativeVariant:
        """Generate a single trailer variant.

        Args:
            style: Narrative style (dramatic, action, emotional, etc.)
            scenes: Analyzed scene data
            video_duration: Total video duration
            target_duration: Target trailer duration in seconds
            metadata: Content metadata (title, genre, etc.)
            avoid_scenes: Scene IDs to avoid (for variant diversity)

        Returns:
            Complete NarrativeVariant
        """
        logger.info(f"Generating {style} trailer variant")

        metadata = metadata or {}
        title = metadata.get("title", "Untitled")

        # Convert scenes to dict format if needed
        scene_dicts = self._convert_scenes(scenes)

        # Filter out avoided scenes
        if avoid_scenes:
            scene_dicts = [s for s in scene_dicts if s.get("scene_id") not in avoid_scenes]

        # Score scenes for trailer potential
        scored_scenes = self._score_scenes(scene_dicts, video_duration)

        # Use StoryEngine to build narrative
        story = self.story_engine.build_narrative(
            scenes=scored_scenes,
            video_duration=video_duration,
            style=style,
            target_duration=target_duration,
            metadata=metadata
        )

        # Convert to NarrativeVariant format
        variant = self._convert_to_variant(story, style, target_duration, metadata)

        logger.info(
            f"Generated {style} variant: {len(variant.shot_sequence)} shots, "
            f"{variant.actual_duration:.1f}s, confidence: {variant.confidence}"
        )

        return variant

    def generate_all_variants(
        self,
        scenes: List[Any],
        video_duration: float,
        styles: Optional[List[str]] = None,
        target_duration: int = 90,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[NarrativeVariant]:
        """Generate multiple trailer variants with scene diversity.

        Args:
            scenes: Analyzed scene data
            video_duration: Total video duration
            styles: List of styles to generate
            target_duration: Target trailer duration
            metadata: Content metadata

        Returns:
            List of NarrativeVariant objects
        """
        styles = styles or self.config.narrative.default_styles
        logger.info(f"Generating {len(styles)} trailer variants")

        variants = []
        used_scenes: Set[str] = set()

        # Check if parallel generation is enabled
        if self.config.narrative.parallel_generation and len(styles) > 2:
            variants = self._generate_parallel(
                scenes, video_duration, styles, target_duration, metadata
            )
        else:
            # Sequential generation with scene diversity
            for style in styles:
                try:
                    # Generate with scene avoidance for diversity
                    avoid = used_scenes.copy() if len(used_scenes) < len(scenes) * 0.5 else set()

                    variant = self.generate_variant(
                        style=style,
                        scenes=scenes,
                        video_duration=video_duration,
                        target_duration=target_duration,
                        metadata=metadata,
                        avoid_scenes=avoid
                    )
                    variants.append(variant)

                    # Track used scenes for diversity
                    for shot in variant.shot_sequence:
                        used_scenes.add(shot.scene_ref)

                except Exception as e:
                    logger.error(f"Failed to generate {style} variant: {e}")

        logger.info(f"Generated {len(variants)}/{len(styles)} variants successfully")
        return variants

    def _generate_parallel(
        self,
        scenes: List[Any],
        video_duration: float,
        styles: List[str],
        target_duration: int,
        metadata: Optional[Dict[str, Any]]
    ) -> List[NarrativeVariant]:
        """Generate variants in parallel for speed."""
        variants = []
        max_workers = min(len(styles), self.config.parallel.max_cpu_workers)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}
            for style in styles:
                future = executor.submit(
                    self.generate_variant,
                    style=style,
                    scenes=scenes,
                    video_duration=video_duration,
                    target_duration=target_duration,
                    metadata=metadata,
                    avoid_scenes=None  # No avoidance in parallel mode
                )
                futures[future] = style

            for future in as_completed(futures):
                style = futures[future]
                try:
                    variant = future.result()
                    variants.append(variant)
                except Exception as e:
                    logger.error(f"Parallel generation failed for {style}: {e}")

        return variants

    def _convert_scenes(self, scenes: List[Any]) -> List[Dict[str, Any]]:
        """Convert scene objects to dict format."""
        result = []
        for scene in scenes:
            if hasattr(scene, 'to_dict'):
                result.append(scene.to_dict())
            elif isinstance(scene, dict):
                result.append(scene)
            else:
                # Try to extract attributes
                try:
                    result.append({
                        "scene_id": getattr(scene, 'scene_id', f"scene_{len(result)}"),
                        "start_time": getattr(scene, 'start_time', 0),
                        "end_time": getattr(scene, 'end_time', 0),
                        "emotional_score": getattr(scene, 'emotional_score', 0),
                        "action_score": getattr(scene, 'action_score', 0),
                        "trailer_potential": getattr(scene, 'trailer_potential', 50),
                        "key_quote": getattr(scene, 'key_quote', None),
                        "visual_hook": getattr(scene, 'visual_hook', None),
                        "spoiler_level": getattr(scene, 'spoiler_level', 0),
                        "scene_type": getattr(scene, 'scene_type', "general"),
                        "mood": getattr(scene, 'mood', "neutral")
                    })
                except Exception:
                    pass
        return result

    def _score_scenes(
        self,
        scenes: List[Dict],
        video_duration: float
    ) -> List[Dict]:
        """Score scenes for trailer potential with dialect awareness."""
        scored = []

        for scene in scenes:
            duration = scene.get("end_time", 0) - scene.get("start_time", 0)

            # Skip invalid scenes
            if duration < 2 or duration > 20:
                continue

            # Skip spoiler zone (last 15%)
            if video_duration > 0:
                pos = scene.get("start_time", 0) / video_duration
                if pos > 0.85:
                    continue

            dialogue = (scene.get("key_quote") or scene.get("dialogue") or "").lower()
            score = scene.get("trailer_potential", 0)

            # Power word boost
            for word in self.POWER_WORDS:
                if word in dialogue:
                    score += 10

            # Question = gold
            if "?" in dialogue:
                score += 30

            # Emotional boost
            score += scene.get("emotional_score", 0) * 0.3

            # Action boost
            score += scene.get("action_score", 0) * 0.2

            # Spoiler penalty
            for word in self.SPOILER_WORDS:
                if word in dialogue:
                    score -= 40

            # Position bonus
            if video_duration > 0:
                pos = scene.get("start_time", 0) / video_duration
                if pos < 0.15:  # Opening
                    score += 10
                elif 0.3 < pos < 0.7:  # Conflict zone
                    score += 15

            # Spoiler level penalty
            spoiler = scene.get("spoiler_level", 0)
            if spoiler >= 6:
                score -= 30
            elif spoiler >= 4:
                score -= 15

            scene["trailer_score"] = max(0, score)
            scored.append(scene)

        # Sort by score
        scored.sort(key=lambda x: x.get("trailer_score", 0), reverse=True)
        return scored

    def _convert_to_variant(
        self,
        story: StoryNarrative,
        style: str,
        target_duration: int,
        metadata: Dict[str, Any]
    ) -> NarrativeVariant:
        """Convert StoryNarrative to NarrativeVariant format."""
        title = metadata.get("title", "Untitled")

        # Convert shots to ShotInstruction
        shot_sequence = []
        text_overlays = []

        for shot in story.shots:
            instruction = ShotInstruction(
                order=shot.order,
                scene_ref=shot.scene_id,
                timecode_start=shot.to_dict()["timecode_start"],
                timecode_end=shot.to_dict()["timecode_end"],
                duration=shot.duration,
                phase=shot.beat.value,
                audio=shot.music_cue,
                dialogue=shot.dialogue_text,
                transition=shot.transition_in,
                text_overlay=shot.text_overlay,
                is_hook=shot.is_hook_ending
            )
            shot_sequence.append(instruction)

            # Collect text overlays
            if shot.text_overlay:
                current_time = sum(s.duration for s in shot_sequence[:-1])
                text_overlays.append({
                    "timecode": instruction.timecode_start,
                    "text": shot.text_overlay,
                    "type": "title" if shot.text_overlay == title else "tagline"
                })

        # Get music recommendation
        music_rec = self.MUSIC_STYLES.get(style, self.MUSIC_STYLES["dramatic"])
        music_rec["has_dialogue_gaps"] = any(s.dialogue for s in shot_sequence)
        music_rec["dialect_note"] = "Regional dialect content - preserve dialogue clarity"

        # Determine structure quality flags
        character_intro = any(
            shot.phase == "character" for shot in shot_sequence
        )
        hook_ending = shot_sequence[-1].is_hook if shot_sequence else False

        return NarrativeVariant(
            id=story.id,
            style=style,
            title=title,
            target_duration=target_duration,
            structure={
                "phases": [b.value for b in StoryBeat],
                "beat_breakdown": story.beat_breakdown
            },
            shot_sequence=shot_sequence,
            music_recommendation=music_rec,
            text_overlays=text_overlays,
            opening_hook=story.opening_hook,
            closing_tag=story.closing_hook,
            confidence=story.confidence,
            suspense_peak=story.suspense_curve.peak_position,
            character_intro_present=character_intro,
            hook_ending_present=hook_ending
        )


# Compatibility imports
from narrative.story_engine import StoryBeat, TrailerShot
