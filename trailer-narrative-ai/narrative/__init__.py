"""Narrative generation module for Trailer Narrative AI."""

from .generator import NarrativeGenerator, NarrativeVariant
from .shot_selector import ShotSelector

# Deep Story Analysis (Dialogue-First with Story Understanding)
from .deep_story_analyzer import (
    DeepStoryAnalyzer,
    DeepNarrative,
    TrailerScene,
    ExtractedCharacter,
    StoryArc,
    analyze_story_deeply
)
from .story_driven_pipeline import (
    StoryDrivenPipeline,
    StoryDrivenTrailer,
    StoryDrivenBeat,
    build_story_driven_trailer
)

# Character-Centric Trailer Builder (Multiple Variants)
from .character_trailer_builder import (
    CharacterTrailerBuilder,
    TrailerVariant,
    MappedCharacter,
    CategorizedDialogue,
    DialogueCategory,
    build_character_trailers
)

__all__ = [
    # Core
    "NarrativeGenerator",
    "NarrativeVariant",
    "ShotSelector",
    # Deep Story Analysis
    "DeepStoryAnalyzer",
    "DeepNarrative",
    "TrailerScene",
    "ExtractedCharacter",
    "StoryArc",
    "analyze_story_deeply",
    # Story-Driven Pipeline
    "StoryDrivenPipeline",
    "StoryDrivenTrailer",
    "StoryDrivenBeat",
    "build_story_driven_trailer",
    # Character-Centric Builder (NEW)
    "CharacterTrailerBuilder",
    "TrailerVariant",
    "MappedCharacter",
    "CategorizedDialogue",
    "DialogueCategory",
    "build_character_trailers",
]
