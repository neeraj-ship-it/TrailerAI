"""Professional Trailer Narrative Builder.

Builds trailer narratives from full movie dialogue analysis to create:

NARRATIVE PHASES (in order):
1. OPENING HOOK - Attention grabber with striking visual/dialogue
2. CHARACTER INTRODUCTION - Protagonist introduction with key dialogue
3. WORLD & STORY SETUP - Establish setting and story premise
4. STORY HOOK - Build interest with compelling hook dialogue
5. SUSPENSE BUILDING - Rising tension, conflict, stakes
6. VILLAIN REVEAL - Antagonist introduction with threatening dialogue
7. CLIMAX TEASE - Peak intensity montage
8. CLIFFHANGER QUESTION - Must end with a QUESTION that makes viewer want to watch
9. TITLE CARD - Movie title

Scene Selection Logic:
- Each phase finds dialogue from story analysis
- Scene is selected based on the dialogue timestamp (scene containing that dialogue)
- This ensures dialogue and scene are always matched correctly

Generates multiple variants based on content analysis:
- Dramatic: Emotional journey focus
- Action: High-energy conflict focus
- Mystery: Questions and intrigue focus
- Character: Character arc focus
- Emotional: Relationship and drama focus
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from loguru import logger

from analysis.llm_story_analyzer import StoryAnalysis, PlotBeat, CharacterRole


class NarrativePhase(Enum):
    """Professional trailer narrative phases - in sequence."""
    OPENING_HOOK = "opening_hook"           # 0-5s: Attention grabber
    CHARACTER_INTRO = "character_intro"     # 5-20s: Protagonist introduction
    WORLD_SETUP = "world_setup"             # 20-30s: Setting and context
    STORY_HOOK = "story_hook"               # 30-45s: Main story hook
    SUSPENSE_BUILD = "suspense_build"       # 45-60s: Rising tension
    VILLAIN_REVEAL = "villain_reveal"       # 60-70s: Antagonist showcase
    CLIMAX_TEASE = "climax_tease"           # 70-80s: Peak intensity
    CLIFFHANGER = "cliffhanger"             # 80-88s: Question ending
    TITLE_CARD = "title_card"               # 88-90s: Movie title


# Phase timing configurations for different trailer styles
PHASE_TIMINGS = {
    "dramatic": {
        NarrativePhase.OPENING_HOOK: {"duration": 4, "needs_dialogue": False},
        NarrativePhase.CHARACTER_INTRO: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.WORLD_SETUP: {"duration": 8, "needs_dialogue": False},
        NarrativePhase.STORY_HOOK: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.SUSPENSE_BUILD: {"duration": 18, "needs_dialogue": True},
        NarrativePhase.VILLAIN_REVEAL: {"duration": 10, "needs_dialogue": True},
        NarrativePhase.CLIMAX_TEASE: {"duration": 10, "needs_dialogue": False},
        NarrativePhase.CLIFFHANGER: {"duration": 8, "needs_dialogue": True},
        NarrativePhase.TITLE_CARD: {"duration": 4, "needs_dialogue": False}
    },
    "action": {
        NarrativePhase.OPENING_HOOK: {"duration": 5, "needs_dialogue": False},
        NarrativePhase.CHARACTER_INTRO: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.WORLD_SETUP: {"duration": 5, "needs_dialogue": False},
        NarrativePhase.STORY_HOOK: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.SUSPENSE_BUILD: {"duration": 20, "needs_dialogue": False},
        NarrativePhase.VILLAIN_REVEAL: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.CLIMAX_TEASE: {"duration": 14, "needs_dialogue": False},
        NarrativePhase.CLIFFHANGER: {"duration": 6, "needs_dialogue": True},
        NarrativePhase.TITLE_CARD: {"duration": 4, "needs_dialogue": False}
    },
    "mystery": {
        NarrativePhase.OPENING_HOOK: {"duration": 5, "needs_dialogue": True},
        NarrativePhase.CHARACTER_INTRO: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.WORLD_SETUP: {"duration": 10, "needs_dialogue": False},
        NarrativePhase.STORY_HOOK: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.SUSPENSE_BUILD: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.VILLAIN_REVEAL: {"duration": 8, "needs_dialogue": True},
        NarrativePhase.CLIMAX_TEASE: {"duration": 8, "needs_dialogue": False},
        NarrativePhase.CLIFFHANGER: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.TITLE_CARD: {"duration": 5, "needs_dialogue": False}
    },
    "emotional": {
        NarrativePhase.OPENING_HOOK: {"duration": 4, "needs_dialogue": True},
        NarrativePhase.CHARACTER_INTRO: {"duration": 18, "needs_dialogue": True},
        NarrativePhase.WORLD_SETUP: {"duration": 8, "needs_dialogue": False},
        NarrativePhase.STORY_HOOK: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.SUSPENSE_BUILD: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.VILLAIN_REVEAL: {"duration": 8, "needs_dialogue": True},
        NarrativePhase.CLIMAX_TEASE: {"duration": 8, "needs_dialogue": False},
        NarrativePhase.CLIFFHANGER: {"duration": 10, "needs_dialogue": True},
        NarrativePhase.TITLE_CARD: {"duration": 4, "needs_dialogue": False}
    },
    "character": {
        NarrativePhase.OPENING_HOOK: {"duration": 5, "needs_dialogue": True},
        NarrativePhase.CHARACTER_INTRO: {"duration": 20, "needs_dialogue": True},
        NarrativePhase.WORLD_SETUP: {"duration": 6, "needs_dialogue": False},
        NarrativePhase.STORY_HOOK: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.SUSPENSE_BUILD: {"duration": 15, "needs_dialogue": True},
        NarrativePhase.VILLAIN_REVEAL: {"duration": 12, "needs_dialogue": True},
        NarrativePhase.CLIMAX_TEASE: {"duration": 8, "needs_dialogue": False},
        NarrativePhase.CLIFFHANGER: {"duration": 8, "needs_dialogue": True},
        NarrativePhase.TITLE_CARD: {"duration": 4, "needs_dialogue": False}
    }
}


@dataclass
class TrailerBeat:
    """A single beat in the trailer narrative."""
    phase: NarrativePhase
    scene_id: str
    start_time: float          # Scene start time in original video
    end_time: float            # Scene end time in original video
    duration: float            # Duration for this beat in trailer
    dialogue: Optional[str]    # Selected dialogue line
    dialogue_timestamp: Optional[float]  # When dialogue appears in original
    purpose: str               # Why this beat exists
    visual_type: str           # establishing, dialogue, action, emotional
    audio_type: str            # music, dialogue, sfx, silence
    transition_in: str
    transition_out: str
    text_overlay: Optional[str]
    importance: int            # 1-10, for cut decisions

    def to_dict(self) -> Dict[str, Any]:
        return {
            "phase": self.phase.value,
            "scene_ref": self.scene_id,
            "timecode_start": self._tc(self.start_time),
            "timecode_end": self._tc(self.end_time),
            "recommended_duration": self.duration,
            "dialogue_line": self.dialogue,
            "dialogue_source_time": self.dialogue_timestamp,
            "purpose": self.purpose,
            "visual_type": self.visual_type,
            "audio_recommendation": self.audio_type,
            "transition_in": self.transition_in,
            "transition_out": self.transition_out,
            "text_overlay": self.text_overlay,
            "importance": self.importance
        }

    @staticmethod
    def _tc(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}"


# Keep TrailerPhase as alias for backward compatibility
TrailerPhase = NarrativePhase


@dataclass
class TrailerVariant:
    """A complete trailer variant."""
    id: str
    name: str
    style: str
    description: str
    target_duration: int
    actual_duration: float
    beats: List[TrailerBeat]
    structure_quality: int
    dialogue_coverage: float
    hook_strength: int
    cliffhanger_question: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "variant_name": self.name,
            "style": self.style,
            "description": self.description,
            "target_duration": self.target_duration,
            "actual_duration": self.actual_duration,
            "shot_sequence": [b.to_dict() for b in self.beats],
            "structure_quality": self.structure_quality,
            "dialogue_coverage": self.dialogue_coverage,
            "hook_strength": self.hook_strength,
            "cliffhanger": self.cliffhanger_question,
            "beat_count": len(self.beats),
            "phases": {
                "opening_hook": "Attention grabber",
                "character_intro": "Protagonist introduction",
                "world_setup": "Setting establishment",
                "story_hook": "Main story premise",
                "suspense_build": "Rising tension",
                "villain_reveal": "Antagonist showcase",
                "climax_tease": "Peak intensity",
                "cliffhanger": "Question ending - makes viewer want to watch",
                "title_card": "Movie title"
            }
        }


class ProfessionalNarrativeBuilder:
    """Builds professional trailer narratives from story analysis.

    Key Features:
    1. Analyzes full movie dialogues to understand story
    2. Selects scenes based on dialogue timestamps
    3. Builds 9-phase narrative structure
    4. Always ends with a question (cliffhanger)
    5. Multiple variants based on content type
    """

    # Words that indicate questions (Hindi/Indian + English)
    QUESTION_WORDS = [
        "kya", "kaun", "kyun", "kaise", "kab", "kahan", "kidhar",
        "kai", "kem", "shu", "kon", "kem",  # Gujarati
        "ka", "kaahe", "kaisan",  # Bhojpuri
        "what", "who", "why", "how", "when", "where"
    ]

    def __init__(self, target_duration: int = 90):
        """Initialize builder.

        Args:
            target_duration: Target trailer duration in seconds (60, 90, 120)
        """
        self.target_duration = target_duration
        logger.info(f"ProfessionalNarrativeBuilder initialized: {target_duration}s target")

    def build_all_variants(
        self,
        story_analysis: StoryAnalysis,
        scenes: List[Dict[str, Any]],
        segments: List[Dict[str, Any]],
        video_duration: float
    ) -> List[TrailerVariant]:
        """Build all recommended trailer variants.

        Args:
            story_analysis: Complete story analysis from LLM
            scenes: Scene data with visual analysis
            segments: Dialogue segments with timestamps
            video_duration: Total video duration

        Returns:
            List of TrailerVariant objects (always at least one)
        """
        variants = []

        # Ensure we have valid inputs
        if not scenes:
            logger.warning("No scenes provided, creating minimal scene list")
            scenes = [{
                "scene_id": "scene_001",
                "id": "scene_001",
                "start_time": 0,
                "end_time": min(video_duration, 120),
                "duration": min(video_duration, 120)
            }]

        if video_duration <= 0:
            video_duration = max(s.get("end_time", 60) for s in scenes) if scenes else 60

        # Log input stats
        logger.info(f"Building variants: {len(scenes)} scenes, {len(segments)} dialogue segments, {video_duration:.0f}s duration")

        # Get styles to build
        styles_to_build = story_analysis.recommended_variants if story_analysis.recommended_variants else ["dramatic"]

        # Build variants for each recommended style
        for style in styles_to_build:
            try:
                logger.info(f"Building {style.upper()} variant...")
                variant = self._build_variant(
                    style,
                    story_analysis,
                    scenes,
                    segments,
                    video_duration
                )
                if variant:
                    variants.append(variant)
                    self._log_variant_summary(variant)
            except Exception as e:
                logger.error(f"Failed to build {style} variant: {e}")
                continue

        # Ensure at least dramatic variant exists
        if not variants:
            logger.warning("No variants built, creating fallback dramatic variant")
            try:
                variant = self._build_variant(
                    "dramatic",
                    story_analysis,
                    scenes,
                    segments,
                    video_duration
                )
                if variant:
                    variants.append(variant)
            except Exception as e:
                logger.error(f"Fallback variant also failed: {e}")

        # LAST RESORT: Create a minimal variant if everything failed
        if not variants:
            logger.error("All variant builds failed, creating minimal placeholder variant")
            variants.append(self._create_minimal_variant(scenes, video_duration, story_analysis))

        logger.info(f"Built {len(variants)} trailer variants")
        return variants

    def _create_minimal_variant(
        self,
        scenes: List[Dict],
        video_duration: float,
        story: StoryAnalysis
    ) -> TrailerVariant:
        """Create a minimal variant when everything else fails."""
        beats = []

        # Create basic beats from available scenes
        for i, phase in enumerate(NarrativePhase):
            if i < len(scenes):
                scene = scenes[i % len(scenes)]
            else:
                scene = scenes[0] if scenes else {"scene_id": "placeholder", "start_time": 0, "end_time": 10}

            beats.append(TrailerBeat(
                phase=phase,
                scene_id=scene.get("scene_id", scene.get("id", f"scene_{i}")),
                start_time=scene.get("start_time", 0),
                end_time=scene.get("end_time", 10),
                duration=10,
                dialogue=None,
                dialogue_timestamp=None,
                purpose=self._get_phase_purpose(phase),
                visual_type="mixed",
                audio_type="music",
                transition_in="dissolve",
                transition_out="cut",
                text_overlay=story.title if phase == NarrativePhase.TITLE_CARD else None,
                importance=5
            ))

        return TrailerVariant(
            id="dramatic_fallback",
            name="Dramatic Trailer (Fallback)",
            style="dramatic",
            description="Automatically generated fallback trailer",
            target_duration=self.target_duration,
            actual_duration=sum(b.duration for b in beats),
            beats=beats,
            structure_quality=50,
            dialogue_coverage=0,
            hook_strength=50,
            cliffhanger_question=None
        )

    def _build_variant(
        self,
        style: str,
        story: StoryAnalysis,
        scenes: List[Dict],
        segments: List[Dict],
        video_duration: float
    ) -> Optional[TrailerVariant]:
        """Build a single trailer variant with proper dialogue-scene alignment."""

        # Get timing configuration for this style
        timings = PHASE_TIMINGS.get(style, PHASE_TIMINGS["dramatic"])

        # Build dialogue index for quick lookup by timestamp
        dialogue_by_time = self._index_dialogues_by_time(segments)

        # Track used dialogues and scenes to avoid repetition
        used_dialogues = set()
        used_scenes = set()

        beats = []

        # Build each phase in sequence
        for phase in NarrativePhase:
            phase_config = timings.get(phase, {"duration": 5, "needs_dialogue": False})

            beat = self._build_phase_beat(
                phase=phase,
                config=phase_config,
                style=style,
                story=story,
                scenes=scenes,
                segments=segments,
                dialogue_by_time=dialogue_by_time,
                used_dialogues=used_dialogues,
                used_scenes=used_scenes,
                video_duration=video_duration
            )

            if beat:
                beats.append(beat)
                used_scenes.add(beat.scene_id)
                if beat.dialogue:
                    used_dialogues.add(beat.dialogue[:50])

        if not beats:
            return None

        # Calculate metrics
        actual_duration = sum(b.duration for b in beats)
        dialogue_beats = [b for b in beats if b.dialogue]
        dialogue_coverage = len(dialogue_beats) / len(beats) if beats else 0

        # Get cliffhanger question
        cliffhanger = None
        for beat in reversed(beats):
            if beat.phase == NarrativePhase.CLIFFHANGER and beat.dialogue:
                cliffhanger = beat.dialogue
                break

        # Calculate quality scores
        hook_strength = self._calculate_hook_strength(beats, story)
        structure_quality = self._calculate_structure_quality(beats, timings)

        return TrailerVariant(
            id=f"{style}_v1",
            name=f"{style.title()} Trailer",
            style=style,
            description=self._get_variant_description(style),
            target_duration=self.target_duration,
            actual_duration=actual_duration,
            beats=beats,
            structure_quality=structure_quality,
            dialogue_coverage=dialogue_coverage,
            hook_strength=hook_strength,
            cliffhanger_question=cliffhanger
        )

    def _index_dialogues_by_time(self, segments: List[Dict]) -> Dict[float, Dict]:
        """Create index of dialogues by their timestamp for quick lookup."""
        index = {}
        for seg in segments:
            time = seg.get("start_time", 0)
            index[time] = seg
        return index

    def _build_phase_beat(
        self,
        phase: NarrativePhase,
        config: Dict,
        style: str,
        story: StoryAnalysis,
        scenes: List[Dict],
        segments: List[Dict],
        dialogue_by_time: Dict,
        used_dialogues: set,
        used_scenes: set,
        video_duration: float
    ) -> Optional[TrailerBeat]:
        """Build a single beat for a narrative phase.

        Key logic:
        1. Find the best dialogue for this phase from story analysis
        2. Find the scene that contains that dialogue's timestamp
        3. This ensures dialogue and scene are always aligned
        """

        duration = config["duration"]
        needs_dialogue = config["needs_dialogue"]

        dialogue = None
        dialogue_time = None
        scene = None

        # === PHASE-SPECIFIC DIALOGUE AND SCENE SELECTION ===

        if phase == NarrativePhase.OPENING_HOOK:
            # Opening: Use a striking hook or establishing shot
            if style in ["mystery", "emotional"] and story.best_hooks:
                dialogue, dialogue_time = self._get_unused_dialogue(
                    story.best_hooks, used_dialogues, prefer_early=True,
                    video_duration=video_duration
                )

            if dialogue_time:
                scene = self._find_scene_at_time(scenes, dialogue_time, used_scenes)

            if not scene:
                # Fallback: early establishing scene
                scene = self._find_scene_by_position(
                    scenes, 0, 0.15, used_scenes, prefer_type="establishing"
                )

        elif phase == NarrativePhase.CHARACTER_INTRO:
            # Character Introduction: Protagonist dialogue
            if story.protagonist and story.protagonist.key_dialogues:
                for d in story.protagonist.key_dialogues:
                    if d[:50] not in used_dialogues:
                        dialogue = d
                        # Find this dialogue in segments to get timestamp
                        dialogue_time = self._find_dialogue_timestamp(d, segments)
                        break

            if not dialogue:
                # Fallback: early dialogue from hooks
                dialogue, dialogue_time = self._get_unused_dialogue(
                    story.best_hooks, used_dialogues, prefer_early=True,
                    video_duration=video_duration
                )

            if dialogue_time:
                scene = self._find_scene_at_time(scenes, dialogue_time, used_scenes)

            if not scene:
                scene = self._find_scene_by_position(
                    scenes, 0.05, 0.25, used_scenes, prefer_type="dialogue"
                )

        elif phase == NarrativePhase.WORLD_SETUP:
            # World Setup: Establishing shots, minimal dialogue
            scene = self._find_scene_by_position(
                scenes, 0, 0.2, used_scenes, prefer_type="establishing"
            )

        elif phase == NarrativePhase.STORY_HOOK:
            # Story Hook: Strong hook dialogue that establishes premise
            dialogue, dialogue_time = self._get_unused_dialogue(
                story.best_hooks, used_dialogues, prefer_early=True,
                video_duration=video_duration
            )

            if dialogue_time:
                scene = self._find_scene_at_time(scenes, dialogue_time, used_scenes)

            if not scene:
                scene = self._find_scene_by_position(
                    scenes, 0.15, 0.4, used_scenes, prefer_type="dialogue"
                )

        elif phase == NarrativePhase.SUSPENSE_BUILD:
            # Suspense Building: Tension dialogue or action
            # Look for emotional peaks or conflict dialogue
            if story.emotional_peaks:
                dialogue, dialogue_time = self._get_unused_dialogue(
                    story.emotional_peaks, used_dialogues,
                    video_duration=video_duration
                )

            if not dialogue and story.action_peaks:
                dialogue, dialogue_time = self._get_unused_dialogue(
                    story.action_peaks, used_dialogues,
                    video_duration=video_duration
                )

            if dialogue_time:
                scene = self._find_scene_at_time(scenes, dialogue_time, used_scenes)

            if not scene:
                scene = self._find_scene_by_position(
                    scenes, 0.3, 0.6, used_scenes,
                    prefer_type="action" if style == "action" else "emotional"
                )

        elif phase == NarrativePhase.VILLAIN_REVEAL:
            # Villain Reveal: Antagonist dialogue
            if story.antagonist and story.antagonist.key_dialogues:
                for d in story.antagonist.key_dialogues:
                    if d[:50] not in used_dialogues:
                        dialogue = d
                        dialogue_time = self._find_dialogue_timestamp(d, segments)
                        break

            if not dialogue:
                # Look for threatening/conflict dialogue
                dialogue, dialogue_time = self._get_unused_dialogue(
                    story.action_peaks, used_dialogues,
                    video_duration=video_duration
                )

            if dialogue_time:
                scene = self._find_scene_at_time(scenes, dialogue_time, used_scenes)

            if not scene:
                scene = self._find_scene_by_position(
                    scenes, 0.4, 0.7, used_scenes, prefer_type="action"
                )

        elif phase == NarrativePhase.CLIMAX_TEASE:
            # Climax Tease: High intensity, quick cuts
            scene = self._find_scene_by_position(
                scenes, 0.5, 0.8, used_scenes,
                prefer_type="action" if style in ["action", "thriller"] else "emotional"
            )

        elif phase == NarrativePhase.CLIFFHANGER:
            # CLIFFHANGER: MUST be a question!
            # This is the most important part - makes viewer want to watch
            dialogue, dialogue_time = self._get_unused_dialogue(
                story.best_questions, used_dialogues, prefer_question=True,
                video_duration=video_duration
            )

            # If no question found, try to find any dialogue with ?
            if not dialogue or "?" not in str(dialogue):
                for seg in segments:
                    text = seg.get("text", "")
                    if "?" in text and text[:50] not in used_dialogues:
                        # Check if it's before 85% of video (avoid spoilers)
                        pos = seg.get("start_time", 0) / video_duration if video_duration > 0 else 0.5
                        if pos < 0.85:
                            dialogue = text
                            dialogue_time = seg.get("start_time")
                            break

            # If still no question, find dialogue with question words
            if not dialogue or "?" not in str(dialogue):
                for seg in segments:
                    text = seg.get("text", "").lower()
                    if any(qw in text for qw in self.QUESTION_WORDS):
                        if seg.get("text", "")[:50] not in used_dialogues:
                            pos = seg.get("start_time", 0) / video_duration if video_duration > 0 else 0.5
                            if pos < 0.85:
                                dialogue = seg.get("text", "")
                                dialogue_time = seg.get("start_time")
                                break

            # FALLBACK: If still no question, use any unused dialogue and add "?" framing
            if not dialogue and segments:
                for seg in segments:
                    text = seg.get("text", "")
                    if text and len(text) > 10 and text[:50] not in used_dialogues:
                        pos = seg.get("start_time", 0) / video_duration if video_duration > 0 else 0.5
                        if pos < 0.85:
                            dialogue = text
                            dialogue_time = seg.get("start_time")
                            break

            # LAST RESORT: Generate a generic cliffhanger question
            if not dialogue:
                dialogue = "What happens next?"
                logger.warning("No cliffhanger dialogue found, using generic question")

            if dialogue_time:
                scene = self._find_scene_at_time(scenes, dialogue_time, used_scenes)

            if not scene:
                scene = self._find_scene_by_position(
                    scenes, 0.5, 0.8, used_scenes, prefer_type="dialogue"
                )

        elif phase == NarrativePhase.TITLE_CARD:
            # Title Card: Use any establishing scene
            scene = self._find_scene_by_position(
                scenes, 0, 0.3, used_scenes, prefer_type="establishing"
            )

        # === BUILD THE BEAT ===

        if not scene:
            # Last resort: find any unused scene
            for s in scenes:
                scene_id = s.get("scene_id", s.get("id", ""))
                if scene_id not in used_scenes:
                    scene = s
                    break

        if not scene:
            return None

        scene_id = scene.get("scene_id", scene.get("id", "unknown"))

        # Determine visual and audio types
        visual_type = self._get_visual_type(phase, style, dialogue is not None)
        audio_type = "dialogue" if dialogue else self._get_audio_type(phase, style)

        return TrailerBeat(
            phase=phase,
            scene_id=scene_id,
            start_time=scene.get("start_time", 0),
            end_time=scene.get("start_time", 0) + min(duration, scene.get("duration", 10)),
            duration=duration,
            dialogue=dialogue,
            dialogue_timestamp=dialogue_time,
            purpose=self._get_phase_purpose(phase),
            visual_type=visual_type,
            audio_type=audio_type,
            transition_in=self._get_transition_in(phase),
            transition_out=self._get_transition_out(phase),
            text_overlay=story.title if phase == NarrativePhase.TITLE_CARD else None,
            importance=self._get_phase_importance(phase)
        )

    def _get_unused_dialogue(
        self,
        candidates: List[Dict],
        used: set,
        prefer_early: bool = False,
        prefer_question: bool = False,
        video_duration: float = 1
    ) -> Tuple[Optional[str], Optional[float]]:
        """Get an unused dialogue from candidates.

        Returns:
            Tuple of (dialogue_text, timestamp)
        """
        if not candidates:
            return None, None

        for item in candidates:
            text = item.get("dialogue", item.get("text", ""))
            time = item.get("timestamp", item.get("time"))

            if not text or text[:50] in used:
                continue

            # Skip late dialogues (potential spoilers)
            if time and video_duration > 0:
                pos = time / video_duration
                if pos > 0.85:
                    continue

            # Check preferences
            if prefer_question and "?" not in text:
                continue

            if prefer_early and time and video_duration > 0:
                if time / video_duration > 0.4:
                    continue

            return text, time

        # If preferences not met, return any available
        for item in candidates:
            text = item.get("dialogue", item.get("text", ""))
            time = item.get("timestamp", item.get("time"))

            if text and text[:50] not in used:
                if time and video_duration > 0 and time / video_duration < 0.85:
                    return text, time

        return None, None

    def _find_dialogue_timestamp(self, dialogue: str, segments: List[Dict]) -> Optional[float]:
        """Find the timestamp of a dialogue in segments."""
        dialogue_lower = dialogue.lower()[:50]

        for seg in segments:
            text = seg.get("text", "").lower()
            if dialogue_lower in text or text in dialogue_lower:
                return seg.get("start_time")

        return None

    def _find_scene_at_time(
        self,
        scenes: List[Dict],
        target_time: float,
        used: set
    ) -> Optional[Dict]:
        """Find the scene that contains the target timestamp."""
        if target_time is None:
            return None

        # First try to find exact match (dialogue is within scene)
        for scene in scenes:
            scene_id = scene.get("scene_id", scene.get("id", ""))
            if scene_id in used:
                continue

            start = scene.get("start_time", 0)
            end = scene.get("end_time", start + 5)

            if start <= target_time <= end:
                return scene

        # If no exact match, find closest unused scene
        best_scene = None
        best_diff = float('inf')

        for scene in scenes:
            scene_id = scene.get("scene_id", scene.get("id", ""))
            if scene_id in used:
                continue

            start = scene.get("start_time", 0)
            diff = abs(start - target_time)

            if diff < best_diff:
                best_diff = diff
                best_scene = scene

        return best_scene

    def _find_scene_by_position(
        self,
        scenes: List[Dict],
        min_pos: float,
        max_pos: float,
        used: set,
        prefer_type: str = None,
        allow_reuse: bool = False
    ) -> Optional[Dict]:
        """Find scene by position in video.

        Args:
            scenes: List of scene dictionaries
            min_pos: Minimum position (0-1)
            max_pos: Maximum position (0-1)
            used: Set of already used scene IDs
            prefer_type: Preferred scene type
            allow_reuse: If True, allow reusing scenes when none available

        Returns:
            Scene dictionary or None
        """
        if not scenes:
            # No scenes at all - create a dummy scene
            logger.warning("No scenes available, creating placeholder")
            return {
                "scene_id": "placeholder_scene",
                "id": "placeholder_scene",
                "start_time": 0,
                "end_time": 10,
                "duration": 10
            }

        video_duration = max(s.get("end_time", 0) for s in scenes)
        if video_duration == 0:
            video_duration = 1

        candidates = []

        # First pass: find unused scenes in position range
        for scene in scenes:
            scene_id = scene.get("scene_id", scene.get("id", ""))
            if scene_id in used:
                continue

            start = scene.get("start_time", 0)
            pos = start / video_duration

            if min_pos <= pos <= max_pos:
                candidates.append(scene)

        # Second pass: expand to any unused scene
        if not candidates:
            for scene in scenes:
                scene_id = scene.get("scene_id", scene.get("id", ""))
                if scene_id not in used:
                    candidates.append(scene)

        # Third pass: if very few scenes, allow reuse (for short videos)
        if not candidates and (allow_reuse or len(scenes) < 15):
            logger.warning("Few scenes available, allowing scene reuse")
            for scene in scenes:
                start = scene.get("start_time", 0)
                pos = start / video_duration
                if min_pos <= pos <= max_pos:
                    candidates.append(scene)

            # If still none, use all scenes
            if not candidates:
                candidates = scenes.copy()

        if not candidates:
            return None

        # Try to find preferred type
        if prefer_type:
            for scene in candidates:
                scene_type = scene.get("scene_type", "")
                if prefer_type in str(scene_type):
                    return scene

                # Check scores
                if prefer_type == "action" and scene.get("action_score", 0) > 50:
                    return scene
                if prefer_type == "emotional" and scene.get("emotional_score", 0) > 50:
                    return scene
                if prefer_type == "dialogue" and scene.get("key_quote"):
                    return scene

        # Return first available
        return candidates[0] if candidates else None

    def _get_visual_type(self, phase: NarrativePhase, style: str, has_dialogue: bool) -> str:
        """Get visual type for phase."""
        if has_dialogue:
            return "dialogue"

        if phase in [NarrativePhase.OPENING_HOOK, NarrativePhase.WORLD_SETUP]:
            return "establishing"
        if phase == NarrativePhase.CLIMAX_TEASE:
            return "action" if style in ["action", "thriller"] else "montage"
        if phase == NarrativePhase.TITLE_CARD:
            return "title"

        return "mixed"

    def _get_audio_type(self, phase: NarrativePhase, style: str) -> str:
        """Get audio type for phase."""
        if phase in [NarrativePhase.OPENING_HOOK]:
            return "sfx" if style == "action" else "music"
        if phase == NarrativePhase.CLIMAX_TEASE:
            return "music"
        if phase == NarrativePhase.TITLE_CARD:
            return "music"
        return "music"

    def _get_transition_in(self, phase: NarrativePhase) -> str:
        """Get transition in type."""
        if phase == NarrativePhase.OPENING_HOOK:
            return "fade_in"
        if phase in [NarrativePhase.CLIMAX_TEASE]:
            return "cut"
        return "dissolve"

    def _get_transition_out(self, phase: NarrativePhase) -> str:
        """Get transition out type."""
        if phase in [NarrativePhase.CLIMAX_TEASE, NarrativePhase.SUSPENSE_BUILD]:
            return "cut"
        if phase == NarrativePhase.TITLE_CARD:
            return "fade_out"
        return "cut"

    def _get_phase_purpose(self, phase: NarrativePhase) -> str:
        """Get purpose description for phase."""
        purposes = {
            NarrativePhase.OPENING_HOOK: "Grab attention instantly",
            NarrativePhase.CHARACTER_INTRO: "Introduce the protagonist with dialogue",
            NarrativePhase.WORLD_SETUP: "Establish the world and setting",
            NarrativePhase.STORY_HOOK: "Present the story premise/hook",
            NarrativePhase.SUSPENSE_BUILD: "Build tension and stakes",
            NarrativePhase.VILLAIN_REVEAL: "Introduce antagonist/villain",
            NarrativePhase.CLIMAX_TEASE: "Peak intensity and action",
            NarrativePhase.CLIFFHANGER: "End with question - make viewer want to watch",
            NarrativePhase.TITLE_CARD: "Movie title reveal"
        }
        return purposes.get(phase, "")

    def _get_phase_importance(self, phase: NarrativePhase) -> int:
        """Get importance score for phase (1-10)."""
        importance = {
            NarrativePhase.OPENING_HOOK: 8,
            NarrativePhase.CHARACTER_INTRO: 9,
            NarrativePhase.WORLD_SETUP: 5,
            NarrativePhase.STORY_HOOK: 10,
            NarrativePhase.SUSPENSE_BUILD: 7,
            NarrativePhase.VILLAIN_REVEAL: 8,
            NarrativePhase.CLIMAX_TEASE: 6,
            NarrativePhase.CLIFFHANGER: 10,  # Most important!
            NarrativePhase.TITLE_CARD: 9
        }
        return importance.get(phase, 5)

    def _calculate_hook_strength(self, beats: List[TrailerBeat], story: StoryAnalysis) -> int:
        """Calculate overall hook strength of trailer."""
        score = 50

        # Character intro has dialogue
        for beat in beats:
            if beat.phase == NarrativePhase.CHARACTER_INTRO and beat.dialogue:
                score += 15
                break

        # Story hook has dialogue
        for beat in beats:
            if beat.phase == NarrativePhase.STORY_HOOK and beat.dialogue:
                score += 15
                break

        # Cliffhanger is a question (most important!)
        for beat in beats:
            if beat.phase == NarrativePhase.CLIFFHANGER and beat.dialogue:
                if "?" in beat.dialogue:
                    score += 25  # Big bonus for question ending
                else:
                    score += 5
                break

        # Villain has dialogue
        for beat in beats:
            if beat.phase == NarrativePhase.VILLAIN_REVEAL and beat.dialogue:
                score += 10
                break

        return min(100, score)

    def _calculate_structure_quality(self, beats: List[TrailerBeat], config: Dict) -> int:
        """Calculate how well trailer follows structure."""
        score = 50

        # Check all phases present
        phases_present = {b.phase for b in beats}
        for phase in NarrativePhase:
            if phase in phases_present:
                score += 5

        # Check dialogue coverage in key phases
        key_phases = [
            NarrativePhase.CHARACTER_INTRO,
            NarrativePhase.STORY_HOOK,
            NarrativePhase.VILLAIN_REVEAL,
            NarrativePhase.CLIFFHANGER
        ]

        for beat in beats:
            if beat.phase in key_phases and beat.dialogue:
                score += 5

        return min(100, score)

    def _get_variant_description(self, style: str) -> str:
        """Get description for variant style."""
        descriptions = {
            "dramatic": "Emotionally-driven narrative focusing on character journey",
            "action": "High-energy cut emphasizing conflict and intense sequences",
            "mystery": "Intrigue-focused edit with questions and suspenseful reveals",
            "emotional": "Heart-centered narrative highlighting relationships",
            "character": "Character-driven story focusing on protagonist arc",
            "thriller": "Tension-building edit with suspense emphasis",
            "comedy": "Lighter tone showcasing humor and entertaining moments",
            "romantic": "Love-focused narrative emphasizing romantic relationships"
        }
        return descriptions.get(style, "Standard trailer narrative")

    def _log_variant_summary(self, variant: TrailerVariant) -> None:
        """Log a summary of the built variant."""
        dialogue_beats = [b for b in variant.beats if b.dialogue]

        logger.info(f"  Built {variant.style.upper()} variant:")
        logger.info(f"    Beats: {len(variant.beats)}")
        logger.info(f"    With dialogue: {len(dialogue_beats)}")
        logger.info(f"    Duration: {variant.actual_duration}s")
        logger.info(f"    Hook strength: {variant.hook_strength}")

        if variant.cliffhanger_question:
            logger.info(f"    Cliffhanger: \"{variant.cliffhanger_question[:50]}...\"")
        else:
            logger.warning(f"    WARNING: No cliffhanger question!")

        # Log phase dialogues
        for beat in variant.beats:
            if beat.dialogue:
                logger.info(f"    {beat.phase.value}: \"{beat.dialogue[:40]}...\"")


def build_professional_narratives(
    story_analysis: StoryAnalysis,
    scenes: List[Dict],
    segments: List[Dict],
    video_duration: float,
    target_duration: int = 90
) -> List[TrailerVariant]:
    """Build professional trailer narratives.

    Args:
        story_analysis: Complete story analysis from LLM
        scenes: Scene data with visual analysis
        segments: Dialogue segments with timestamps
        video_duration: Total video duration
        target_duration: Target trailer duration

    Returns:
        List of TrailerVariant objects
    """
    builder = ProfessionalNarrativeBuilder(target_duration)
    return builder.build_all_variants(story_analysis, scenes, segments, video_duration)
