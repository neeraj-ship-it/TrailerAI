"""Storytelling Agent for Narrative Drafting.

This module creates coherent narrative structures for trailers by analyzing
the full video content and drafting a story-first approach.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from loguru import logger
import json
import ollama


@dataclass
class StoryBeat:
    """Represents a single beat in the narrative."""
    order: int
    act: str  # "setup", "confrontation", "resolution"
    beat_type: str  # "introduction", "conflict", "revelation", "climax", "hook"
    description: str
    emotional_tone: str  # "tense", "dramatic", "emotional", "action", "mysterious"
    character_focus: Optional[str] = None
    key_dialogue: Optional[str] = None
    timecode_start: Optional[str] = None
    timecode_end: Optional[str] = None
    duration: float = 0.0
    visual_notes: Optional[str] = None


@dataclass
class CharacterArc:
    """Character development arc in the narrative."""
    name: str
    role: str  # "protagonist", "antagonist", "supporting"
    introduction_beat: int
    key_moments: List[int]  # Beat indices where character is important
    arc_description: str
    relationships: Dict[str, str] = field(default_factory=dict)


@dataclass
class NarrativeDraft:
    """Complete narrative draft for trailer."""
    project_id: str
    title: str
    logline: str  # One-sentence story summary
    story_premise: str  # 2-3 sentence premise
    genre: str
    target_duration: int

    # Story structure
    acts: Dict[str, List[StoryBeat]]  # "setup", "confrontation", "resolution"
    story_beats: List[StoryBeat]

    # Character development
    characters: List[CharacterArc]

    # Emotional journey
    emotional_arc: str  # Description of the emotional journey
    hook_strategy: str  # How to hook the audience
    cliffhanger: str  # Ending question/tension

    # Metadata
    total_beats: int
    estimated_duration: float
    dialogue_coverage: float
    music_shifts: List[int]  # Beat indices where music should shift

    # LLM reasoning
    narrative_reasoning: str
    alternative_approaches: List[str] = field(default_factory=list)


class StorytellingAgent:
    """Agent that drafts coherent narratives for trailers.

    This agent:
    1. Analyzes full video content (scenes, dialogues, characters)
    2. Identifies story structure and character arcs
    3. Drafts a cohesive narrative with emotional beats
    4. Maps narrative beats to actual video content
    """

    def __init__(
        self,
        model: str = "mistral",
        ollama_host: str = "http://localhost:11434"
    ):
        """Initialize storytelling agent.

        Args:
            model: Ollama model to use (mistral, llama3.2)
            ollama_host: Ollama server URL
        """
        self.model = model
        self.ollama_host = ollama_host
        logger.info(f"StorytellingAgent initialized with model={model}")

    def draft_narrative(
        self,
        scenes: List[Dict],
        dialogues: List[Dict],
        content_metadata: Dict,
        target_duration: int = 120
    ) -> NarrativeDraft:
        """Draft a cohesive narrative for the trailer.

        Args:
            scenes: List of analyzed scenes from video
            dialogues: List of extracted dialogue segments
            content_metadata: Title, genre, language, etc.
            target_duration: Target trailer duration in seconds

        Returns:
            NarrativeDraft with complete story structure
        """
        logger.info(f"Drafting narrative for {content_metadata.get('title', 'Unknown')}")
        logger.info(f"Analyzing {len(scenes)} scenes and {len(dialogues)} dialogues")

        # Step 1: Understand the full story
        story_understanding = self._analyze_full_story(scenes, dialogues, content_metadata)

        # Step 2: Identify characters and their arcs
        characters = self._identify_characters(dialogues, story_understanding)

        # Step 3: Create 3-act structure
        acts_structure = self._create_three_act_structure(
            story_understanding,
            characters,
            target_duration
        )

        # Step 4: Map story beats to actual video content
        story_beats = self._map_beats_to_content(
            acts_structure,
            scenes,
            dialogues
        )

        # Step 5: Define emotional journey
        emotional_arc = self._define_emotional_arc(story_beats)

        # Step 6: Create hook and cliffhanger
        hook_strategy = self._create_hook_strategy(story_beats, characters)
        cliffhanger = self._create_cliffhanger(story_beats, characters)

        # Step 7: Calculate music shifts (2-3 points)
        music_shifts = self._calculate_music_shifts(len(story_beats))

        # Calculate metadata
        total_beats = len(story_beats)
        estimated_duration = sum(beat.duration for beat in story_beats)
        dialogue_coverage = len([b for b in story_beats if b.key_dialogue]) / max(total_beats, 1)

        # Organize beats by act
        acts_dict = {
            "setup": [b for b in story_beats if b.act == "setup"],
            "confrontation": [b for b in story_beats if b.act == "confrontation"],
            "resolution": [b for b in story_beats if b.act == "resolution"]
        }

        # Create draft
        draft = NarrativeDraft(
            project_id=content_metadata.get('projectId', 'unknown'),
            title=content_metadata.get('title', 'Unknown'),
            logline=story_understanding.get('logline', ''),
            story_premise=story_understanding.get('premise', ''),
            genre=content_metadata.get('genre', 'drama'),
            target_duration=target_duration,
            acts=acts_dict,
            story_beats=story_beats,
            characters=characters,
            emotional_arc=emotional_arc,
            hook_strategy=hook_strategy,
            cliffhanger=cliffhanger,
            total_beats=total_beats,
            estimated_duration=estimated_duration,
            dialogue_coverage=dialogue_coverage,
            music_shifts=music_shifts,
            narrative_reasoning=story_understanding.get('reasoning', ''),
            alternative_approaches=story_understanding.get('alternatives', [])
        )

        logger.info(f"Narrative draft complete: {total_beats} beats, {estimated_duration:.1f}s estimated duration")
        return draft

    def _analyze_full_story(
        self,
        scenes: List[Dict],
        dialogues: List[Dict],
        content_metadata: Dict
    ) -> Dict:
        """Use LLM to understand the full story."""
        logger.info("Analyzing full story with LLM...")

        # Prepare context for LLM
        dialogue_text = "\n".join([
            f"[{d.get('start_time', 0):.1f}s] {d.get('text', '')}"
            for d in dialogues[:50]  # First 50 dialogues for context
        ])

        scene_summary = f"Total scenes: {len(scenes)}, Video duration: {scenes[-1].get('endTime', 0) if scenes else 0}"

        prompt = f"""Analyze this film/video content and provide a story analysis for creating a trailer.

CONTENT METADATA:
Title: {content_metadata.get('title', 'Unknown')}
Genre: {content_metadata.get('genre', 'Unknown')}
Language: {content_metadata.get('language', 'Unknown')}

SCENE CONTEXT:
{scene_summary}

DIALOGUE SAMPLES (first 50):
{dialogue_text}

TASK:
1. Write a ONE-SENTENCE logline (like a movie poster tagline)
2. Write a 2-3 sentence story premise (what is this story about?)
3. Identify the core conflict
4. Identify key themes
5. Suggest 2-3 alternative narrative approaches for the trailer
6. Provide your reasoning

Return as JSON:
{{
    "logline": "one sentence",
    "premise": "2-3 sentences about the story",
    "core_conflict": "main conflict description",
    "themes": ["theme1", "theme2"],
    "alternatives": ["approach1", "approach2"],
    "reasoning": "your analysis process"
}}
"""

        try:
            response = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.7}
            )

            content = response['message']['content'].strip()

            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            result = json.loads(content)
            logger.info(f"Story analysis complete. Logline: {result.get('logline', '')[:50]}...")
            return result

        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            # Fallback to basic analysis
            return {
                "logline": f"A {content_metadata.get('genre', 'dramatic')} story",
                "premise": f"The story of {content_metadata.get('title', 'characters')}",
                "core_conflict": "Character faces challenges",
                "themes": ["drama", "conflict"],
                "alternatives": ["Chronological", "Character-focused"],
                "reasoning": "Fallback analysis due to LLM error"
            }

    def _identify_characters(
        self,
        dialogues: List[Dict],
        story_understanding: Dict
    ) -> List[CharacterArc]:
        """Identify main characters from dialogues."""
        logger.info("Identifying characters...")

        # For now, create placeholder character structure
        # In full implementation, use LLM to identify characters from dialogue patterns
        characters = [
            CharacterArc(
                name="Protagonist",
                role="protagonist",
                introduction_beat=0,
                key_moments=[0, 5, 10],
                arc_description="Main character's journey",
                relationships={}
            )
        ]

        return characters

    def _create_three_act_structure(
        self,
        story_understanding: Dict,
        characters: List[CharacterArc],
        target_duration: int
    ) -> Dict[str, List[Dict]]:
        """Create 3-act structure for trailer."""
        logger.info("Creating 3-act structure...")

        # For STAGE style: 30-40 shots at 2-4s each = 15-20 beats
        num_beats = max(15, int(target_duration / 6))

        # Distribute: 25% setup, 50% confrontation, 25% resolution
        setup_beats = max(3, int(num_beats * 0.25))
        confrontation_beats = max(8, int(num_beats * 0.50))
        resolution_beats = max(4, int(num_beats * 0.25))

        acts = {
            "setup": [{"beat_type": "introduction", "duration": 3.0} for _ in range(setup_beats)],
            "confrontation": [{"beat_type": "conflict", "duration": 3.5} for _ in range(confrontation_beats)],
            "resolution": [{"beat_type": "climax", "duration": 3.0} for _ in range(resolution_beats)]
        }

        logger.info(f"Structure: {setup_beats} setup + {confrontation_beats} confrontation + {resolution_beats} resolution")
        return acts

    def _map_beats_to_content(
        self,
        acts_structure: Dict[str, List[Dict]],
        scenes: List[Dict],
        dialogues: List[Dict]
    ) -> List[StoryBeat]:
        """Map story beats to actual video content."""
        logger.info("Mapping beats to video content...")

        story_beats = []
        beat_order = 0

        # Distribute dialogues across acts
        dialogue_index = 0
        total_dialogues = len(dialogues)

        for act_name, beats_data in acts_structure.items():
            for beat_data in beats_data:
                if dialogue_index < total_dialogues:
                    dialogue = dialogues[dialogue_index]

                    beat = StoryBeat(
                        order=beat_order,
                        act=act_name,
                        beat_type=beat_data["beat_type"],
                        description=f"{act_name.title()} moment",
                        emotional_tone=self._infer_emotional_tone(dialogue.get('text', '')),
                        key_dialogue=dialogue.get('text', ''),
                        timecode_start=dialogue.get('start_timecode', '00:00:00'),
                        timecode_end=dialogue.get('end_timecode', '00:00:00'),
                        duration=beat_data["duration"]
                    )

                    story_beats.append(beat)
                    beat_order += 1
                    dialogue_index += 1

        return story_beats

    def _infer_emotional_tone(self, text: str) -> str:
        """Infer emotional tone from dialogue text."""
        text_lower = text.lower()

        if any(word in text_lower for word in ['maar', 'ladai', 'fight', 'attack']):
            return "action"
        elif any(word in text_lower for word in ['pyaar', 'dil', 'love', 'jaan']):
            return "emotional"
        elif any(word in text_lower for word in ['dar', 'khatara', 'danger', 'dushman']):
            return "tense"
        elif '?' in text:
            return "mysterious"
        else:
            return "dramatic"

    def _define_emotional_arc(self, story_beats: List[StoryBeat]) -> str:
        """Define the emotional journey."""
        return "Builds from introduction to intense confrontation, ending with emotional climax"

    def _create_hook_strategy(self, story_beats: List[StoryBeat], characters: List[CharacterArc]) -> str:
        """Create opening hook strategy."""
        if story_beats:
            first_beat = story_beats[0]
            return f"Open with {first_beat.emotional_tone} moment to immediately engage audience"
        return "Start with impactful visual and dialogue"

    def _create_cliffhanger(self, story_beats: List[StoryBeat], characters: List[CharacterArc]) -> str:
        """Create ending cliffhanger."""
        if story_beats:
            last_beat = story_beats[-1]
            if last_beat.key_dialogue and '?' in last_beat.key_dialogue:
                return last_beat.key_dialogue
        return "What will happen next?"

    def _calculate_music_shifts(self, total_beats: int) -> List[int]:
        """Calculate where music should shift (2-3 points)."""
        if total_beats <= 10:
            return [0, total_beats // 2]
        else:
            return [0, total_beats // 3, 2 * total_beats // 3]
