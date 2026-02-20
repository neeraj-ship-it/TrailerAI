"""Workflow Manager for Two-Phase Trailer Generation.

Manages the narrative-first workflow:
Phase 1: Draft Narrative → Human Approval
Phase 2: Generate Trailer from Approved Narrative
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional, List
from pathlib import Path
import json
from loguru import logger

from .storytelling_agent import StorytellingAgent, NarrativeDraft


@dataclass
class WorkflowConfig:
    """Configuration for workflow execution."""
    mode: str  # "draft-narrative" or "generate-trailer"
    project_id: str
    output_dir: Path
    approved_narrative_path: Optional[Path] = None


class WorkflowManager:
    """Manages the two-phase trailer generation workflow."""

    def __init__(self, config: WorkflowConfig):
        """Initialize workflow manager.

        Args:
            config: Workflow configuration
        """
        self.config = config
        self.agent = StorytellingAgent()
        logger.info(f"WorkflowManager initialized in {config.mode} mode")

    def execute_draft_narrative(
        self,
        scenes: List[Dict],
        dialogues: List[Dict],
        content_metadata: Dict
    ) -> Dict[str, Any]:
        """Execute Phase 1: Draft Narrative.

        Args:
            scenes: Analyzed scenes from video
            dialogues: Extracted dialogue segments
            content_metadata: Video metadata

        Returns:
            Narrative draft as JSON
        """
        logger.info("Executing PHASE 1: Draft Narrative")

        # Generate narrative draft
        draft = self.agent.draft_narrative(
            scenes=scenes,
            dialogues=dialogues,
            content_metadata=content_metadata,
            target_duration=content_metadata.get('targetDuration', 120)
        )

        # Save draft to file
        draft_path = self.config.output_dir / "narratives" / "narrative_draft.json"
        draft_path.parent.mkdir(parents=True, exist_ok=True)

        draft_dict = self._serialize_narrative_draft(draft)

        with open(draft_path, 'w', encoding='utf-8') as f:
            json.dump(draft_dict, f, indent=2, ensure_ascii=False)

        logger.info(f"Narrative draft saved to {draft_path}")

        # Also save human-readable version
        readable_path = self.config.output_dir / "narratives" / "narrative_draft.md"
        self._save_readable_narrative(draft, readable_path)

        return {
            "status": "draft_ready",
            "message": "Narrative draft created. Please review and approve.",
            "draft": draft_dict,
            "files": {
                "draft_json": str(draft_path),
                "draft_readable": str(readable_path)
            }
        }

    def execute_generate_trailer(
        self,
        scenes: List[Dict],
        dialogues: List[Dict],
        approved_narrative: Dict
    ) -> Dict[str, Any]:
        """Execute Phase 2: Generate Trailer from Approved Narrative.

        Args:
            scenes: Analyzed scenes from video
            dialogues: Extracted dialogue segments
            approved_narrative: User-approved narrative structure

        Returns:
            Trailer generation result
        """
        logger.info("Executing PHASE 2: Generate Trailer from Approved Narrative")

        # Load approved narrative
        narrative_draft = self._deserialize_narrative_draft(approved_narrative)

        logger.info(f"Loaded approved narrative: {narrative_draft.title}")
        logger.info(f"  - Total beats: {narrative_draft.total_beats}")
        logger.info(f"  - Story beats: {len(narrative_draft.story_beats)}")

        # Return narrative structure for trailer assembly
        return {
            "status": "narrative_approved",
            "message": "Using approved narrative for trailer generation",
            "narrative": approved_narrative,
            "trailer_config": {
                "beats": [asdict(beat) for beat in narrative_draft.story_beats],
                "music_shifts": narrative_draft.music_shifts,
                "target_duration": narrative_draft.target_duration
            }
        }

    def _serialize_narrative_draft(self, draft: NarrativeDraft) -> Dict[str, Any]:
        """Convert NarrativeDraft to JSON-serializable dict."""
        return {
            "project_id": draft.project_id,
            "title": draft.title,
            "logline": draft.logline,
            "story_premise": draft.story_premise,
            "genre": draft.genre,
            "target_duration": draft.target_duration,
            "acts": {
                act_name: [asdict(beat) for beat in beats]
                for act_name, beats in draft.acts.items()
            },
            "story_beats": [asdict(beat) for beat in draft.story_beats],
            "characters": [asdict(char) for char in draft.characters],
            "emotional_arc": draft.emotional_arc,
            "hook_strategy": draft.hook_strategy,
            "cliffhanger": draft.cliffhanger,
            "total_beats": draft.total_beats,
            "estimated_duration": draft.estimated_duration,
            "dialogue_coverage": draft.dialogue_coverage,
            "music_shifts": draft.music_shifts,
            "narrative_reasoning": draft.narrative_reasoning,
            "alternative_approaches": draft.alternative_approaches
        }

    def _deserialize_narrative_draft(self, data: Dict[str, Any]) -> NarrativeDraft:
        """Convert JSON dict back to NarrativeDraft."""
        from .storytelling_agent import StoryBeat, CharacterArc

        # Reconstruct story beats
        story_beats = [
            StoryBeat(**beat_data)
            for beat_data in data.get('story_beats', [])
        ]

        # Reconstruct acts
        acts = {}
        for act_name, beats_data in data.get('acts', {}).items():
            acts[act_name] = [StoryBeat(**beat_data) for beat_data in beats_data]

        # Reconstruct characters
        characters = [
            CharacterArc(**char_data)
            for char_data in data.get('characters', [])
        ]

        return NarrativeDraft(
            project_id=data.get('project_id', ''),
            title=data.get('title', ''),
            logline=data.get('logline', ''),
            story_premise=data.get('story_premise', ''),
            genre=data.get('genre', ''),
            target_duration=data.get('target_duration', 120),
            acts=acts,
            story_beats=story_beats,
            characters=characters,
            emotional_arc=data.get('emotional_arc', ''),
            hook_strategy=data.get('hook_strategy', ''),
            cliffhanger=data.get('cliffhanger', ''),
            total_beats=data.get('total_beats', 0),
            estimated_duration=data.get('estimated_duration', 0.0),
            dialogue_coverage=data.get('dialogue_coverage', 0.0),
            music_shifts=data.get('music_shifts', []),
            narrative_reasoning=data.get('narrative_reasoning', ''),
            alternative_approaches=data.get('alternative_approaches', [])
        )

    def _save_readable_narrative(self, draft: NarrativeDraft, path: Path):
        """Save human-readable Markdown version of narrative."""
        content = f"""# Trailer Narrative Draft

**Project:** {draft.title}
**Genre:** {draft.genre}
**Target Duration:** {draft.target_duration}s
**Estimated Duration:** {draft.estimated_duration:.1f}s
**Total Beats:** {draft.total_beats}

---

## Logline
{draft.logline}

## Story Premise
{draft.story_premise}

---

## Hook Strategy
{draft.hook_strategy}

## Cliffhanger/Ending
{draft.cliffhanger}

---

## Emotional Arc
{draft.emotional_arc}

---

## Characters

"""
        for char in draft.characters:
            content += f"### {char.name} ({char.role})\n"
            content += f"{char.arc_description}\n\n"

        content += "---\n\n## Story Beats\n\n"

        for act_name, beats in draft.acts.items():
            content += f"### {act_name.upper()} ({len(beats)} beats)\n\n"
            for beat in beats:
                content += f"**Beat #{beat.order}** - {beat.beat_type}  \n"
                content += f"- **Tone:** {beat.emotional_tone}  \n"
                if beat.key_dialogue:
                    content += f"- **Dialogue:** \"{beat.key_dialogue}\"  \n"
                if beat.timecode_start:
                    content += f"- **Timecode:** {beat.timecode_start} - {beat.timecode_end}  \n"
                content += f"- **Duration:** {beat.duration:.1f}s  \n\n"

        content += "---\n\n## Music Shifts\n\n"
        content += f"Music should shift at beats: {', '.join(map(str, draft.music_shifts))}\n\n"

        content += "---\n\n## LLM Reasoning\n\n"
        content += f"{draft.narrative_reasoning}\n\n"

        if draft.alternative_approaches:
            content += "## Alternative Approaches Considered\n\n"
            for i, approach in enumerate(draft.alternative_approaches, 1):
                content += f"{i}. {approach}\n"

        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info(f"Readable narrative saved to {path}")
