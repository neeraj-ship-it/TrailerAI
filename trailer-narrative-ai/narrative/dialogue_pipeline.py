"""Dialogue-First Trailer Pipeline.

This module integrates the DialogueNarrativeEngine with the existing pipeline,
making dialogue the primary driver of trailer creation.

Pipeline Flow:
1. Extract ALL dialogues with timestamps (from video or subtitle)
2. Pass ALL dialogues to LLM for analysis
3. LLM extracts characters, selects dialogues, orders them
4. Selected dialogues map to scene timestamps
5. Scenes are extracted and assembled into trailer

Key Difference from Old Pipeline:
- OLD: Scenes detected → Dialogues mapped → Scenes selected → Trailer built
- NEW: Dialogues extracted → LLM selects dialogues → Scenes from dialogue timestamps
"""

import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from loguru import logger

from .dialogue_narrative_engine import (
    DialogueNarrativeEngine,
    DialogueNarrative,
    DialogueSegment,
    TrailerDialogueSequence,
    NarrativePhase
)


@dataclass
class TrailerBeat:
    """A beat in the final trailer assembly."""
    order: int
    phase: str
    dialogue_text: str
    start_time: float  # In source video
    end_time: float    # In source video
    duration: float    # Recommended duration in trailer
    transition_in: str
    transition_out: str
    audio_type: str    # "dialogue" or "music"
    text_overlay: Optional[str] = None
    is_hook: bool = False
    # STAGE Style: Music and sound design metadata
    music_style: Optional[str] = None  # "soft_regional", "intense_action", "emotional_suspense"
    sound_effects: List[str] = field(default_factory=list)  # ["punch_impact", "heartbeat", etc.]


@dataclass
class DialogueTrailerVariant:
    """A complete trailer variant built from dialogues."""
    id: str
    style: str
    name: str
    description: str
    target_duration: int
    beats: List[TrailerBeat]
    characters: List[Dict]
    opening_hook: str
    cliffhanger_question: Optional[str]
    story_premise: str
    dialogue_coverage: float  # % of trailer with dialogue
    hook_strength: int  # 0-100
    structure_quality: int  # 0-100
    llm_reasoning: str


class DialogueFirstPipeline:
    """Pipeline that builds trailers with dialogue as the primary driver.

    This pipeline:
    1. Takes raw dialogue segments (from ASR or subtitles)
    2. Uses local LLM to understand story and select best dialogues
    3. Outputs trailer beats with exact timestamps for scene extraction
    """

    def __init__(
        self,
        model: str = "mistral",
        ollama_host: str = "http://localhost:11434"
    ):
        """Initialize the dialogue-first pipeline.

        Args:
            model: Ollama model to use (mistral, llama3.2, phi3)
            ollama_host: Ollama server URL
        """
        self.engine = DialogueNarrativeEngine(
            model=model,
            ollama_host=ollama_host
        )
        logger.info(f"DialogueFirstPipeline initialized with model={model}")

    def process(
        self,
        dialogue_segments: List[Dict],
        video_duration: float,
        styles: List[str] = None,
        target_duration: int = 90,
        metadata: Optional[Dict] = None
    ) -> List[DialogueTrailerVariant]:
        """Process dialogues and generate trailer variants.

        Args:
            dialogue_segments: List of dialogue dicts with:
                - text: dialogue text
                - start_time: start timestamp in seconds
                - end_time: end timestamp in seconds
            video_duration: Total video duration in seconds
            styles: List of narrative styles to generate
            target_duration: Target trailer duration
            metadata: Content metadata (title, genre, etc.)

        Returns:
            List of DialogueTrailerVariant ready for assembly
        """
        # Default to all available styles
        styles = styles or [
            "dramatic", "action", "emotional", "mystery",
            "comedy", "epic", "character", "thriller"
        ]
        variants = []

        logger.info(f"Processing {len(dialogue_segments)} dialogues for {len(styles)} styles")

        for style in styles:
            try:
                narrative = self.engine.build_narrative(
                    dialogues=dialogue_segments,
                    video_duration=video_duration,
                    style=style,
                    target_duration=target_duration,
                    metadata=metadata
                )

                variant = self._convert_to_variant(narrative, style)
                variants.append(variant)

                logger.info(
                    f"Generated {style} variant: {len(variant.beats)} beats, "
                    f"confidence={variant.structure_quality}"
                )

            except Exception as e:
                logger.error(f"Failed to generate {style} variant: {e}")
                continue

        return variants

    def _convert_to_variant(
        self,
        narrative: DialogueNarrative,
        style: str
    ) -> DialogueTrailerVariant:
        """Convert DialogueNarrative to DialogueTrailerVariant."""
        beats = []

        # STAGE Style: Calculate music shift points (2-3 shifts)
        music_shifts = self._calculate_music_shifts(len(narrative.sequences))

        for i, seq in enumerate(narrative.sequences):
            # Determine music style for this beat
            music_style = self._get_music_style(seq.phase.value, i, music_shifts)

            # Extract sound effects from dialogue
            sound_effects = self._extract_sound_effects(seq.dialogue.text)

            beat = TrailerBeat(
                order=i + 1,
                phase=seq.phase.value,
                dialogue_text=seq.dialogue.text,
                start_time=seq.scene_timestamp[0],
                end_time=seq.scene_timestamp[1],
                duration=seq.duration_in_trailer,
                transition_in=seq.transition,
                transition_out="cut" if i < len(narrative.sequences) - 1 else "fade",
                audio_type="dialogue",
                text_overlay=seq.text_overlay,
                is_hook=seq.phase in [NarrativePhase.OPENING_HOOK, NarrativePhase.CLIFFHANGER],
                music_style=music_style,  # NEW: Music recommendation
                sound_effects=sound_effects  # NEW: Sound design hints
            )
            beats.append(beat)

        # Calculate metrics
        dialogue_coverage = len([b for b in beats if b.audio_type == "dialogue"]) / len(beats) if beats else 0
        hook_strength = 70 if any(b.is_hook and "?" in b.dialogue_text for b in beats) else 50

        # Find cliffhanger question
        cliffhanger = None
        if beats and beats[-1].phase == "cliffhanger" and "?" in beats[-1].dialogue_text:
            cliffhanger = beats[-1].dialogue_text

        return DialogueTrailerVariant(
            id=narrative.id,
            style=style,
            name=f"{style.title()} Trailer",
            description=narrative.story_premise,
            target_duration=narrative.target_duration,
            beats=beats,
            characters=[
                {
                    "name": c.name,
                    "role": c.role,
                    "description": c.description
                }
                for c in narrative.characters
            ],
            opening_hook=narrative.opening_hook,
            cliffhanger_question=cliffhanger,
            story_premise=narrative.story_premise,
            dialogue_coverage=dialogue_coverage,
            hook_strength=hook_strength,
            structure_quality=narrative.confidence,
            llm_reasoning=narrative.llm_reasoning
        )

    def _calculate_music_shifts(self, total_beats: int) -> List[int]:
        """Calculate where music should shift (STAGE style: 2-3 shifts).

        Returns indices where music should change.
        """
        if total_beats <= 10:
            return [0, total_beats // 2]  # 2 shifts for short trailers
        else:
            return [0, total_beats // 3, 2 * total_beats // 3]  # 3 shifts for longer trailers

    def _get_music_style(self, phase: str, index: int, music_shifts: List[int]) -> str:
        """Get music style for this beat based on phase and position.

        STAGE Music Pattern:
        - Opening (0-30%): Soft/mysterious (dhol, tabla, ambient)
        - Middle (30-70%): Intense/action (epic orchestral, regional drums)
        - Ending (70-100%): Emotional/suspense (strings, building tension)
        """
        if index < music_shifts[1]:
            return "soft_regional"  # Dhol, tabla, ambient pads
        elif len(music_shifts) > 2 and index < music_shifts[-1]:
            return "intense_action"  # Epic orchestral + regional drums
        else:
            return "emotional_suspense"  # Strings, building to climax

    def _extract_sound_effects(self, dialogue_text: str) -> List[str]:
        """Extract sound effects hints from dialogue content.

        STAGE trailers use heavy sound design:
        - Fight words → punch, impact, whoosh
        - Emotional words → heartbeat, breathing
        - Tense words → suspense_drone, wind
        """
        effects = []
        text_lower = dialogue_text.lower()

        # Action/Fight effects
        if any(word in text_lower for word in ['maar', 'maara', 'fight', 'ladai', 'jung', 'maarunga']):
            effects.extend(['punch_impact', 'whoosh'])

        # Emotional effects
        if any(word in text_lower for word in ['pyaar', 'mohabbat', 'dil', 'jaan']):
            effects.extend(['heartbeat', 'soft_breath'])

        # Tension/Danger effects
        if any(word in text_lower for word in ['dar', 'khatre', 'danger', 'dushman', 'bachao']):
            effects.extend(['suspense_drone', 'tension_hit'])

        # Questions (hook ending)
        if '?' in dialogue_text or any(word in text_lower for word in ['kya', 'kaun', 'kyun', 'kaise']):
            effects.append('question_chord')

        return effects


def build_dialogue_trailers(
    dialogue_segments: List[Dict],
    video_duration: float,
    styles: List[str] = None,
    target_duration: int = 90,
    metadata: Optional[Dict] = None,
    model: str = "mistral"
) -> List[DialogueTrailerVariant]:
    """Convenience function to build dialogue-first trailers.

    Example:
        dialogues = [
            {"text": "Kya tum mujhse pyaar karte ho?", "start_time": 120.5, "end_time": 123.2},
            {"text": "Main tumhare bina nahi reh sakta", "start_time": 456.1, "end_time": 459.8},
            ...
        ]

        variants = build_dialogue_trailers(
            dialogue_segments=dialogues,
            video_duration=7200,  # 2 hour movie
            styles=["dramatic", "emotional"],
            target_duration=90,
            metadata={"title": "My Movie", "genre": "Romance"}
        )

        for variant in variants:
            print(f"{variant.style}: {len(variant.beats)} beats")
            for beat in variant.beats:
                print(f"  [{beat.phase}] {beat.start_time:.1f}s - {beat.dialogue_text[:50]}...")

    Args:
        dialogue_segments: List of dialogue dicts
        video_duration: Total video duration
        styles: Narrative styles to generate
        target_duration: Target trailer duration
        metadata: Content metadata
        model: Ollama model to use

    Returns:
        List of DialogueTrailerVariant
    """
    pipeline = DialogueFirstPipeline(model=model)
    return pipeline.process(
        dialogue_segments=dialogue_segments,
        video_duration=video_duration,
        styles=styles,
        target_duration=target_duration,
        metadata=metadata
    )


# Integration with existing scene-based pipeline
def map_dialogues_to_scenes(
    variants: List[DialogueTrailerVariant],
    scenes: List[Dict]
) -> List[DialogueTrailerVariant]:
    """Map dialogue timestamps to detected scenes.

    This allows combining the dialogue-first approach with
    scene detection for better visual transitions.

    Args:
        variants: Dialogue-based trailer variants
        scenes: Detected scenes with start_time, end_time, scene_id

    Returns:
        Variants with updated scene references
    """
    for variant in variants:
        for beat in variant.beats:
            # Find scene that contains this dialogue
            matching_scene = None
            for scene in scenes:
                if (scene.get("start_time", 0) <= beat.start_time and
                    scene.get("end_time", 0) >= beat.end_time):
                    matching_scene = scene
                    break

            if not matching_scene:
                # Find closest scene
                min_dist = float('inf')
                for scene in scenes:
                    dist = abs(scene.get("start_time", 0) - beat.start_time)
                    if dist < min_dist:
                        min_dist = dist
                        matching_scene = scene

            if matching_scene:
                beat.scene_id = matching_scene.get("scene_id", "unknown")
                # Optionally extend to scene boundaries
                # beat.start_time = matching_scene.get("start_time", beat.start_time)
                # beat.end_time = matching_scene.get("end_time", beat.end_time)

    return variants
