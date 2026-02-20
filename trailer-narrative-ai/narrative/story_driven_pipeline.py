"""Story-Driven Trailer Pipeline.

This pipeline builds trailers with DEEP STORY UNDERSTANDING:
1. Analyze ALL dialogues to understand complete story
2. Extract characters by NAME with relationships
3. Build coherent narrative with proper introductions
4. Create story continuity throughout trailer
5. End with compelling cliffhanger

The trailer should feel like a mini-story that:
- Introduces the protagonist by name
- Shows their world and relationships
- Presents the conflict clearly
- Builds emotional tension
- Ends with a question that demands answers
"""

import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from loguru import logger

from .deep_story_analyzer import (
    DeepStoryAnalyzer,
    DeepNarrative,
    TrailerScene,
    ExtractedCharacter,
    StoryArc
)


@dataclass
class StoryDrivenBeat:
    """A beat in the story-driven trailer."""
    order: int
    phase: str

    # Dialogue info
    dialogue_text: str
    speaker_name: str
    speaking_to: str

    # Timing
    start_time: float
    end_time: float
    duration_in_trailer: float

    # Context
    purpose: str
    context: str
    emotion: str

    # Continuity
    follows_from: str
    leads_to: str

    # Technical
    transition: str
    audio_type: str = "dialogue"
    text_overlay: Optional[str] = None


@dataclass
class StoryDrivenTrailer:
    """Complete story-driven trailer output."""
    id: str
    title: str

    # Story understanding
    story_logline: str
    central_conflict: str
    hook_question: str

    # Characters
    protagonist_name: str
    protagonist_description: str
    antagonist_name: Optional[str]
    all_characters: List[Dict]

    # Trailer beats
    beats: List[StoryDrivenBeat]
    total_duration: float

    # Narrative
    narrative_flow: str
    continuity_notes: str

    # Quality
    confidence: int
    analysis_reasoning: str


class StoryDrivenPipeline:
    """Pipeline that builds trailers with deep story understanding.

    This pipeline differs from simple dialogue selection by:
    1. Understanding the COMPLETE story first
    2. Extracting character NAMES from dialogue
    3. Building a COHERENT mini-narrative
    4. Ensuring CONTINUITY between scenes
    5. Creating proper INTRODUCTIONS
    """

    def __init__(self, model: str = "auto", hf_model: str = "qwen2.5-1.5b"):
        """Initialize the story-driven pipeline.

        Args:
            model: Ollama model (or "auto" for auto-select)
            hf_model: HuggingFace model (qwen2.5-1.5b, phi3-mini, tinyllama)
        """
        self.analyzer = DeepStoryAnalyzer(model=model, hf_model=hf_model)
        self.model = model
        self.hf_model = hf_model
        logger.info(f"StoryDrivenPipeline initialized")

    def process(
        self,
        dialogues: List[Dict],
        video_duration: float,
        metadata: Optional[Dict] = None,
        target_duration: int = 90
    ) -> StoryDrivenTrailer:
        """Process dialogues and build a story-driven trailer.

        Args:
            dialogues: List of dialogue dicts with text, start_time, end_time
            video_duration: Total video duration in seconds
            metadata: Movie metadata (title, genre)
            target_duration: Target trailer duration

        Returns:
            StoryDrivenTrailer with complete narrative
        """
        start_time = time.time()
        metadata = metadata or {}
        title = metadata.get("title", "Untitled")

        logger.info("=" * 60)
        logger.info(f"STORY-DRIVEN TRAILER GENERATION: {title}")
        logger.info("=" * 60)
        logger.info(f"Dialogues: {len(dialogues)}")
        logger.info(f"Video Duration: {video_duration/60:.1f} minutes")
        logger.info(f"Target Trailer: {target_duration} seconds")

        # Step 1: Deep story analysis
        narrative = self.analyzer.analyze(
            dialogues=dialogues,
            video_duration=video_duration,
            metadata=metadata,
            target_trailer_duration=target_duration
        )

        # Step 2: Convert to trailer beats
        beats = self._convert_to_beats(narrative.trailer_scenes)

        # Step 3: Calculate total duration
        total_duration = sum(b.duration_in_trailer for b in beats)

        # Step 4: Prepare character info
        all_characters = [
            {
                "name": c.name,
                "role": c.role_type,
                "description": c.description,
                "relationship": c.relationship_to_protagonist
            }
            for c in narrative.characters
        ]

        # Build result
        result = StoryDrivenTrailer(
            id=f"story_driven_{int(time.time())}",
            title=title,
            story_logline=narrative.story_arc.logline,
            central_conflict=narrative.story_arc.central_conflict,
            hook_question=narrative.story_arc.hook_question,
            protagonist_name=narrative.protagonist.name if narrative.protagonist else "Unknown",
            protagonist_description=narrative.protagonist.description if narrative.protagonist else "",
            antagonist_name=narrative.antagonist.name if narrative.antagonist else None,
            all_characters=all_characters,
            beats=beats,
            total_duration=total_duration,
            narrative_flow=narrative.narrative_flow,
            continuity_notes=narrative.continuity_notes,
            confidence=narrative.confidence,
            analysis_reasoning=narrative.analysis_reasoning
        )

        processing_time = time.time() - start_time
        logger.info(f"Story-driven trailer generated in {processing_time:.1f}s")
        logger.info(f"Confidence: {result.confidence}")

        return result

    def _convert_to_beats(self, scenes: List[TrailerScene]) -> List[StoryDrivenBeat]:
        """Convert trailer scenes to beats."""
        beats = []

        for scene in scenes:
            beat = StoryDrivenBeat(
                order=scene.order,
                phase=scene.phase,
                dialogue_text=scene.dialogue_text,
                speaker_name=scene.speaker_name,
                speaking_to=scene.speaking_to,
                start_time=scene.start_time,
                end_time=scene.end_time,
                duration_in_trailer=scene.duration_in_trailer,
                purpose=scene.purpose,
                context=scene.context,
                emotion=scene.emotion,
                follows_from=scene.follows_from,
                leads_to=scene.leads_to,
                transition=scene.transition,
                audio_type="dialogue",
                text_overlay=None
            )
            beats.append(beat)

        return beats

    def print_trailer_summary(self, trailer: StoryDrivenTrailer):
        """Print a detailed summary of the trailer."""
        print("\n" + "=" * 70)
        print(f"TRAILER: {trailer.title}")
        print("=" * 70)

        print(f"\n📖 STORY: {trailer.story_logline}")
        print(f"⚔️  CONFLICT: {trailer.central_conflict}")
        print(f"❓ HOOK QUESTION: {trailer.hook_question}")

        print(f"\n👤 PROTAGONIST: {trailer.protagonist_name}")
        print(f"   {trailer.protagonist_description}")

        if trailer.antagonist_name:
            print(f"\n👿 ANTAGONIST: {trailer.antagonist_name}")

        print(f"\n👥 ALL CHARACTERS:")
        for c in trailer.all_characters:
            print(f"   - {c['name']} ({c['role']}): {c['relationship']}")

        print(f"\n🎬 TRAILER BEATS ({len(trailer.beats)} scenes, {trailer.total_duration:.0f}s):")
        print("-" * 70)

        for beat in trailer.beats:
            print(f"\n{beat.order}. [{beat.phase.upper()}] ({beat.duration_in_trailer:.0f}s)")
            print(f"   Speaker: {beat.speaker_name} → {beat.speaking_to or 'self'}")
            print(f"   Dialogue: \"{beat.dialogue_text[:70]}...\"" if len(beat.dialogue_text) > 70 else f"   Dialogue: \"{beat.dialogue_text}\"")
            print(f"   Context: {beat.context}")
            print(f"   Emotion: {beat.emotion} | Transition: {beat.transition}")
            if beat.follows_from:
                print(f"   Flow: {beat.follows_from} → {beat.leads_to}")

        print("\n" + "-" * 70)
        print(f"📊 CONFIDENCE: {trailer.confidence}/100")
        print(f"\n📝 NARRATIVE FLOW:\n{trailer.narrative_flow}")
        print("=" * 70)


def build_story_driven_trailer(
    dialogues: List[Dict],
    video_duration: float,
    metadata: Optional[Dict] = None,
    target_duration: int = 90,
    model: str = "auto",
    hf_model: str = "qwen2.5-1.5b"
) -> StoryDrivenTrailer:
    """Convenience function to build a story-driven trailer.

    Example:
        dialogues = load_subtitles("movie.srt")
        trailer = build_story_driven_trailer(
            dialogues=dialogues,
            video_duration=7200,
            metadata={"title": "Jholachaap", "genre": "Drama"},
            target_duration=90
        )
        print(f"Protagonist: {trailer.protagonist_name}")
        for beat in trailer.beats:
            print(f"{beat.speaker_name}: {beat.dialogue_text}")

    Args:
        dialogues: List of dialogue dicts
        video_duration: Total video duration
        metadata: Movie metadata
        target_duration: Target trailer duration
        model: Ollama model (or "auto" for auto-select)
        hf_model: HuggingFace model (qwen2.5-1.5b, phi3-mini, tinyllama)

    Returns:
        StoryDrivenTrailer
    """
    pipeline = StoryDrivenPipeline(model=model, hf_model=hf_model)
    return pipeline.process(
        dialogues=dialogues,
        video_duration=video_duration,
        metadata=metadata,
        target_duration=target_duration
    )
