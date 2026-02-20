"""Dialogue-Centric Narrative Engine for Trailer Generation.

This engine takes ALL dialogues with timestamps and uses a local LLM (Ollama)
to intelligently:
1. Extract characters from dialogue content
2. Understand story structure without spoiling
3. Select best dialogues for trailer (hooks, questions, intros)
4. Reorder dialogues for narrative continuity
5. Build a compelling trailer narrative

Key Principles:
- Dialogue-first: Scenes are selected based on chosen dialogues
- No spoilers: Avoid climax and ending revelations
- Hook-driven: Start and end with engaging hooks
- Character intros: Properly introduce main characters
- Continuity: Build a coherent mini-story from selected dialogues
"""

import json
import re
import time
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from loguru import logger

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    logger.warning("Ollama not installed. Run: pip install ollama")


class NarrativePhase(Enum):
    """Phases for trailer narrative structure."""
    OPENING_HOOK = "opening_hook"          # Attention grabber
    CHARACTER_INTRO = "character_intro"    # Introduce protagonist
    WORLD_SETUP = "world_setup"            # Establish setting/context
    CONFLICT_SETUP = "conflict_setup"      # Present the problem
    TENSION_BUILD = "tension_build"        # Raise stakes
    EMOTIONAL_PEAK = "emotional_peak"      # Emotional moment
    CLIFFHANGER = "cliffhanger"            # End with question/hook


@dataclass
class DialogueSegment:
    """A single dialogue with metadata."""
    id: str
    text: str
    start_time: float
    end_time: float
    duration: float
    speaker: Optional[str] = None
    emotion: Optional[str] = None
    is_question: bool = False
    is_hook: bool = False
    is_spoiler: bool = False
    character_intro: bool = False
    narrative_importance: int = 0  # 0-100 score


@dataclass
class Character:
    """Extracted character from dialogues."""
    name: str
    role: str  # protagonist, antagonist, supporting
    description: str
    key_dialogues: List[str]
    first_appearance_time: float
    dialogue_count: int
    emotional_arc: str


@dataclass
class TrailerDialogueSequence:
    """Selected and ordered dialogues for trailer."""
    id: str
    phase: NarrativePhase
    dialogue: DialogueSegment
    scene_timestamp: Tuple[float, float]  # (start, end) to extract scene
    transition: str = "cut"
    duration_in_trailer: float = 0.0
    text_overlay: Optional[str] = None


@dataclass
class DialogueNarrative:
    """Complete dialogue-based trailer narrative."""
    id: str
    style: str
    title: str
    target_duration: int
    sequences: List[TrailerDialogueSequence]
    characters: List[Character]
    opening_hook: str
    closing_hook: str
    story_premise: str
    avoided_spoilers: List[str]
    confidence: int
    llm_reasoning: str


class DialogueNarrativeEngine:
    """Engine that builds trailer narratives from dialogues using local LLM.

    Uses Ollama for local LLM inference - no API keys required.
    Supports models: mistral, llama3.2, phi3, etc.
    """

    # Spoiler patterns to avoid
    SPOILER_PATTERNS = [
        r'\b(mar gaya|mar gayi|maut|death|die|died)\b',
        r'\b(sach yeh hai|truth is|revealed|secret is)\b',
        r'\b(the end|khatam|finally|ant mein)\b',
        r'\b(isliye|that\'s why|because of this)\b',
        r'\b(winner|jeeta|won|victory)\b',
        r'\b(killed|maara|murder)\b',
    ]

    # Question patterns for hooks
    QUESTION_PATTERNS = [
        r'\?',
        r'\b(kya|kaun|kyun|kaise|kab|kahan)\b',
        r'\b(what|who|why|how|when|where)\b',
        r'\b(kai|ka|kem|su|shu)\b',  # Dialect questions
    ]

    # Emotional keywords for scoring
    EMOTIONAL_KEYWORDS = {
        'high': ['pyaar', 'mohabbat', 'maa', 'baap', 'jaan', 'kasam', 'dil', 'aashiq'],
        'tension': ['dar', 'khatre', 'jung', 'ladai', 'dushman', 'maar', 'bachao'],
        'conflict': ['jhooth', 'dhoka', 'vishwas', 'bharosa', 'galat', 'sahi'],
    }

    def __init__(
        self,
        model: str = "mistral",
        ollama_host: str = "http://localhost:11434",
        fallback_to_rules: bool = True
    ):
        """Initialize the dialogue narrative engine.

        Args:
            model: Ollama model to use (mistral, llama3.2, phi3, etc.)
            ollama_host: Ollama server URL
            fallback_to_rules: Use rule-based logic if LLM fails
        """
        self.model = model
        self.ollama_host = ollama_host
        self.fallback_to_rules = fallback_to_rules
        self.llm_available = self._check_llm_availability()

        logger.info(f"DialogueNarrativeEngine initialized with model={model}")
        logger.info(f"LLM available: {self.llm_available}")

    def _check_llm_availability(self) -> bool:
        """Check if Ollama is available and model is pulled."""
        if not OLLAMA_AVAILABLE:
            return False

        try:
            # Set host if custom
            if self.ollama_host != "http://localhost:11434":
                ollama.Client(host=self.ollama_host)

            # Check if model exists
            models = ollama.list()
            model_names = [m['name'].split(':')[0] for m in models.get('models', [])]

            if self.model not in model_names and f"{self.model}:latest" not in [m['name'] for m in models.get('models', [])]:
                logger.warning(f"Model {self.model} not found. Available: {model_names}")
                logger.info(f"Run: ollama pull {self.model}")
                return False

            return True
        except Exception as e:
            logger.warning(f"Ollama not available: {e}")
            return False

    def build_narrative(
        self,
        dialogues: List[Dict[str, Any]],
        video_duration: float,
        style: str = "dramatic",
        target_duration: int = 90,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DialogueNarrative:
        """Build a complete trailer narrative from dialogues.

        This is the main entry point. It:
        1. Processes all dialogues to extract metadata
        2. Uses LLM to understand story and extract characters
        3. Selects best dialogues for trailer
        4. Orders them for narrative flow
        5. Returns complete narrative with scene timestamps

        Args:
            dialogues: List of dialogue dicts with text, start_time, end_time
            video_duration: Total video duration in seconds
            style: Narrative style (dramatic, action, emotional, mystery)
            target_duration: Target trailer duration in seconds
            metadata: Optional content metadata (title, genre, etc.)

        Returns:
            Complete DialogueNarrative ready for scene extraction
        """
        start_time = time.time()
        metadata = metadata or {}
        title = metadata.get("title", "Untitled")

        logger.info(f"Building {style} narrative from {len(dialogues)} dialogues")
        logger.info(f"Video duration: {video_duration:.1f}s, Target: {target_duration}s")

        # Step 1: Process dialogues and score them
        processed_dialogues = self._process_dialogues(dialogues, video_duration)
        logger.info(f"Processed {len(processed_dialogues)} dialogues")

        # Step 2: Extract characters from dialogues using LLM
        characters = self._extract_characters(processed_dialogues, metadata)
        logger.info(f"Extracted {len(characters)} characters")

        # Step 3: Use LLM to analyze story and select dialogues
        if self.llm_available:
            selected_dialogues, story_analysis = self._llm_select_dialogues(
                processed_dialogues, characters, style, target_duration, metadata
            )
        else:
            selected_dialogues, story_analysis = self._rule_based_select_dialogues(
                processed_dialogues, characters, style, target_duration
            )

        logger.info(f"Selected {len(selected_dialogues)} dialogues for trailer")

        # Step 4: Build narrative sequence with proper phases
        sequences = self._build_sequence(
            selected_dialogues, characters, style, target_duration
        )

        # Step 5: Calculate confidence and prepare output
        confidence = self._calculate_confidence(sequences, characters)

        processing_time = time.time() - start_time
        logger.info(f"Narrative built in {processing_time:.2f}s, confidence={confidence}")

        # Log selected dialogues
        logger.info("Selected dialogue sequence:")
        for seq in sequences:
            logger.info(f"  [{seq.phase.value}] {seq.dialogue.text[:60]}...")

        return DialogueNarrative(
            id=f"dialogue_{style}_v1",
            style=style,
            title=title,
            target_duration=target_duration,
            sequences=sequences,
            characters=characters,
            opening_hook=sequences[0].dialogue.text if sequences else "",
            closing_hook=sequences[-1].dialogue.text if sequences else "",
            story_premise=story_analysis.get("premise", ""),
            avoided_spoilers=story_analysis.get("avoided_spoilers", []),
            confidence=confidence,
            llm_reasoning=story_analysis.get("reasoning", "Rule-based selection")
        )

    def _process_dialogues(
        self,
        dialogues: List[Dict],
        video_duration: float
    ) -> List[DialogueSegment]:
        """Process raw dialogues and extract metadata."""
        processed = []

        for i, d in enumerate(dialogues):
            text = d.get("text", "").strip()
            if not text or len(text) < 5:
                continue

            start_time = d.get("start_time", 0)
            end_time = d.get("end_time", start_time + 3)
            duration = end_time - start_time

            # Skip very short or very long dialogues
            if duration < 1.0 or duration > 15.0:
                continue

            # Calculate position in movie (0-1)
            position = start_time / video_duration if video_duration > 0 else 0.5

            # Check for spoiler content
            is_spoiler = self._is_spoiler(text, position)

            # Check for question (hook potential)
            is_question = self._is_question(text)

            # Score narrative importance
            importance = self._score_importance(text, position, is_question, is_spoiler)

            segment = DialogueSegment(
                id=f"dial_{i:04d}",
                text=text,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                speaker=d.get("speaker"),
                emotion=self._detect_emotion(text),
                is_question=is_question,
                is_hook=is_question or importance > 70,
                is_spoiler=is_spoiler,
                narrative_importance=importance
            )
            processed.append(segment)

        # Sort by narrative importance for selection
        processed.sort(key=lambda x: x.narrative_importance, reverse=True)

        return processed

    def _is_spoiler(self, text: str, position: float) -> bool:
        """Check if dialogue is a spoiler."""
        text_lower = text.lower()

        # Last 15% of movie is spoiler zone
        if position > 0.85:
            return True

        # Check spoiler patterns
        for pattern in self.SPOILER_PATTERNS:
            if re.search(pattern, text_lower):
                return True

        return False

    def _is_question(self, text: str) -> bool:
        """Check if dialogue is a question."""
        text_lower = text.lower()
        for pattern in self.QUESTION_PATTERNS:
            if re.search(pattern, text_lower):
                return True
        return False

    def _detect_emotion(self, text: str) -> str:
        """Detect emotional tone of dialogue."""
        text_lower = text.lower()

        for emotion, keywords in self.EMOTIONAL_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    return emotion

        return "neutral"

    def _score_importance(
        self,
        text: str,
        position: float,
        is_question: bool,
        is_spoiler: bool
    ) -> int:
        """Score dialogue importance for trailer inclusion."""
        score = 50  # Base score

        # Spoilers are immediately disqualified
        if is_spoiler:
            return 0

        # Questions are highly valuable (hooks)
        if is_question:
            score += 30

        # Good length (5-20 words) is ideal
        word_count = len(text.split())
        if 5 <= word_count <= 20:
            score += 15
        elif word_count > 30:
            score -= 10

        # Early dialogues good for character intro (10-30%)
        if 0.1 <= position <= 0.3:
            score += 10

        # Mid-movie dialogues good for conflict (30-60%)
        if 0.3 <= position <= 0.6:
            score += 5

        # Late but not too late dialogues for tension (60-80%)
        if 0.6 <= position <= 0.8:
            score += 8

        # Emotional keywords boost
        text_lower = text.lower()
        for emotion, keywords in self.EMOTIONAL_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    score += 5
                    break

        return min(100, max(0, score))

    def _extract_characters(
        self,
        dialogues: List[DialogueSegment],
        metadata: Dict
    ) -> List[Character]:
        """Extract characters from dialogues using LLM."""
        if not dialogues:
            return []

        if self.llm_available:
            return self._llm_extract_characters(dialogues, metadata)
        else:
            return self._rule_based_extract_characters(dialogues)

    def _llm_extract_characters(
        self,
        dialogues: List[DialogueSegment],
        metadata: Dict
    ) -> List[Character]:
        """Use LLM to extract characters from dialogues."""
        # Prepare dialogue text for LLM
        dialogue_text = "\n".join([
            f"[{d.start_time:.0f}s] {d.text}"
            for d in dialogues[:50]  # Limit for context
        ])

        prompt = f"""Analyze these movie dialogues and identify the main characters.

DIALOGUES:
{dialogue_text}

MOVIE INFO:
Title: {metadata.get('title', 'Unknown')}
Genre: {metadata.get('genre', 'Drama')}

OUTPUT FORMAT (JSON):
{{
    "characters": [
        {{
            "name": "Character name or description like 'Main Hero' if name unknown",
            "role": "protagonist" or "antagonist" or "supporting",
            "description": "Brief description based on their dialogues",
            "key_dialogue": "One memorable dialogue from this character",
            "emotional_arc": "What emotion/journey this character represents"
        }}
    ]
}}

Identify 2-4 main characters. Focus on:
1. Who speaks most emotionally
2. Who asks important questions
3. Who drives conflict
4. Character relationships visible in dialogues

OUTPUT JSON ONLY:"""

        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={"temperature": 0.3, "num_predict": 1024}
            )

            # Parse JSON from response
            response_text = response.get('response', '{}')

            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                data = json.loads(json_match.group())
                characters = []

                for i, c in enumerate(data.get('characters', [])):
                    # Find first dialogue time for this character
                    first_time = 0
                    dial_count = 0
                    key_dialogues = []

                    for d in dialogues:
                        if c.get('key_dialogue', '') in d.text:
                            first_time = d.start_time
                            key_dialogues.append(d.text)
                            dial_count += 1

                    characters.append(Character(
                        name=c.get('name', f'Character_{i+1}'),
                        role=c.get('role', 'supporting'),
                        description=c.get('description', ''),
                        key_dialogues=key_dialogues[:3],
                        first_appearance_time=first_time,
                        dialogue_count=dial_count,
                        emotional_arc=c.get('emotional_arc', 'unknown')
                    ))

                if characters:
                    return characters
        except Exception as e:
            logger.warning(f"LLM character extraction failed: {e}")

        # Fallback to rule-based
        return self._rule_based_extract_characters(dialogues)

    def _rule_based_extract_characters(
        self,
        dialogues: List[DialogueSegment]
    ) -> List[Character]:
        """Rule-based character extraction from dialogues."""
        characters = []

        # Analyze dialogue distribution
        early_dialogues = [d for d in dialogues if d.start_time < dialogues[-1].end_time * 0.3]
        mid_dialogues = [d for d in dialogues if dialogues[-1].end_time * 0.3 <= d.start_time < dialogues[-1].end_time * 0.6]

        # Protagonist: Most important early dialogues
        if early_dialogues:
            best_early = max(early_dialogues, key=lambda x: x.narrative_importance)
            characters.append(Character(
                name="Protagonist",
                role="protagonist",
                description="Main character introduced early with significant dialogues",
                key_dialogues=[best_early.text],
                first_appearance_time=best_early.start_time,
                dialogue_count=len(early_dialogues),
                emotional_arc="journey"
            ))

        # Antagonist/Conflict: Mid-movie tension dialogues
        tension_dialogues = [d for d in mid_dialogues if d.emotion == 'tension']
        if tension_dialogues:
            best_tension = max(tension_dialogues, key=lambda x: x.narrative_importance)
            characters.append(Character(
                name="Antagonist/Conflict",
                role="antagonist",
                description="Source of conflict and tension",
                key_dialogues=[best_tension.text],
                first_appearance_time=best_tension.start_time,
                dialogue_count=len(tension_dialogues),
                emotional_arc="conflict"
            ))

        # Supporting: Emotional dialogues
        emotional_dialogues = [d for d in dialogues if d.emotion == 'high']
        if emotional_dialogues:
            best_emotional = max(emotional_dialogues, key=lambda x: x.narrative_importance)
            characters.append(Character(
                name="Supporting",
                role="supporting",
                description="Emotional anchor character",
                key_dialogues=[best_emotional.text],
                first_appearance_time=best_emotional.start_time,
                dialogue_count=len(emotional_dialogues),
                emotional_arc="emotional"
            ))

        return characters

    def _llm_select_dialogues(
        self,
        dialogues: List[DialogueSegment],
        characters: List[Character],
        style: str,
        target_duration: int,
        metadata: Dict
    ) -> Tuple[List[DialogueSegment], Dict]:
        """Use LLM to intelligently select dialogues for trailer."""
        # Prepare top dialogues for LLM (non-spoiler, high importance)
        candidate_dialogues = [d for d in dialogues if not d.is_spoiler][:40]

        dialogue_text = "\n".join([
            f"[{i+1}] [{d.start_time:.0f}s] {d.text} (importance: {d.narrative_importance}, question: {d.is_question})"
            for i, d in enumerate(candidate_dialogues)
        ])

        character_info = "\n".join([
            f"- {c.name} ({c.role}): {c.description}"
            for c in characters
        ])

        prompt = f"""You are a brilliant trailer editor. Select and ORDER dialogues for a {style} trailer.

MOVIE: {metadata.get('title', 'Unknown')} ({metadata.get('genre', 'Drama')})
TARGET: {target_duration} second trailer (need 15-25 dialogue moments for STAGE style)
STYLE: {style}

CHARACTERS:
{character_info}

AVAILABLE DIALOGUES (sorted by importance):
{dialogue_text}

TRAILER STRUCTURE REQUIREMENTS:
1. OPENING_HOOK: Start with attention-grabbing dialogue (question or emotional)
2. CHARACTER_INTRO: Introduce protagonist with their defining dialogue
3. WORLD_SETUP: Establish context/setting
4. CONFLICT_SETUP: Present the central problem
5. TENSION_BUILD: Escalate stakes
6. EMOTIONAL_PEAK: One powerful emotional moment
7. CLIFFHANGER: End with a QUESTION that makes audience want more

RULES:
- DO NOT reveal the ending or climax
- Questions are GOLD for hooks and endings
- Dialogue can be REORDERED for narrative flow
- Aim for 15-25 dialogues total (STAGE style: more dialogues, faster pacing)
- Each dialogue needs 2-4 seconds screen time (quick cuts for impact)
- Build a mini-story that intrigues without spoiling

OUTPUT FORMAT (JSON):
{{
    "selected_dialogues": [
        {{
            "dialogue_number": 1,
            "phase": "opening_hook",
            "reason": "Why this dialogue works here",
            "duration": 4
        }}
    ],
    "story_premise": "One sentence describing the trailer's story",
    "avoided_spoilers": ["What was avoided and why"],
    "reasoning": "Overall narrative strategy"
}}

OUTPUT JSON ONLY:"""

        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={"temperature": 0.4, "num_predict": 2048}
            )

            response_text = response.get('response', '{}')

            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                data = json.loads(json_match.group())

                selected = []
                for sel in data.get('selected_dialogues', []):
                    dial_num = sel.get('dialogue_number', 1) - 1
                    if 0 <= dial_num < len(candidate_dialogues):
                        dial = candidate_dialogues[dial_num]
                        # Store phase and duration from LLM
                        dial.narrative_phase = sel.get('phase', 'tension_build')
                        dial.trailer_duration = sel.get('duration', 4)
                        selected.append(dial)

                story_analysis = {
                    "premise": data.get('story_premise', ''),
                    "avoided_spoilers": data.get('avoided_spoilers', []),
                    "reasoning": data.get('reasoning', '')
                }

                if len(selected) >= 5:
                    return selected, story_analysis

        except Exception as e:
            logger.warning(f"LLM dialogue selection failed: {e}")

        # Fallback to rule-based
        return self._rule_based_select_dialogues(dialogues, characters, style, target_duration)

    def _rule_based_select_dialogues(
        self,
        dialogues: List[DialogueSegment],
        characters: List[Character],
        style: str,
        target_duration: int
    ) -> Tuple[List[DialogueSegment], Dict]:
        """Rule-based dialogue selection for trailer."""
        selected = []
        used_times = set()

        # Filter out spoilers
        candidates = [d for d in dialogues if not d.is_spoiler]

        # STAGE Style: More dialogues (15-25) for better storytelling
        # Target: One dialogue every 5-7 seconds
        target_count = max(15, int(target_duration / 6))  # 90s=15, 120s=20, 150s=25
        avg_duration = target_duration / target_count

        # Phase 1: Opening Hook (question preferred)
        questions = [d for d in candidates if d.is_question]
        if questions:
            # Prefer questions from first half of movie
            early_questions = [q for q in questions if q.start_time < candidates[-1].end_time * 0.5]
            hook = early_questions[0] if early_questions else questions[0]
            hook.narrative_phase = "opening_hook"
            selected.append(hook)
            used_times.add(hook.start_time)

        # Phase 2: Character Intro (early high-importance)
        early_dialogues = [
            d for d in candidates
            if d.start_time not in used_times
            and d.start_time < candidates[-1].end_time * 0.3
            and d.narrative_importance > 50
        ]
        if early_dialogues:
            intro = early_dialogues[0]
            intro.narrative_phase = "character_intro"
            selected.append(intro)
            used_times.add(intro.start_time)

        # Phase 3: World Setup (establishing dialogue)
        world_dialogues = [
            d for d in candidates
            if d.start_time not in used_times
            and 0.1 <= d.start_time / candidates[-1].end_time <= 0.35
            and d.emotion == "neutral"
        ]
        if world_dialogues:
            world = world_dialogues[0]
            world.narrative_phase = "world_setup"
            selected.append(world)
            used_times.add(world.start_time)

        # Phase 4: Conflict Setup (tension/conflict dialogues)
        conflict_dialogues = [
            d for d in candidates
            if d.start_time not in used_times
            and d.emotion in ['tension', 'conflict']
        ]
        for dial in conflict_dialogues[:2]:
            dial.narrative_phase = "conflict_setup"
            selected.append(dial)
            used_times.add(dial.start_time)

        # Phase 5: Tension Build (mid-high importance)
        tension_dialogues = [
            d for d in candidates
            if d.start_time not in used_times
            and d.narrative_importance > 40
        ]
        for dial in tension_dialogues[:3]:
            dial.narrative_phase = "tension_build"
            selected.append(dial)
            used_times.add(dial.start_time)

        # Phase 6: Emotional Peak
        emotional_dialogues = [
            d for d in candidates
            if d.start_time not in used_times
            and d.emotion == 'high'
        ]
        if emotional_dialogues:
            emotional = emotional_dialogues[0]
            emotional.narrative_phase = "emotional_peak"
            selected.append(emotional)
            used_times.add(emotional.start_time)

        # Phase 7: Cliffhanger (MUST be a question)
        remaining_questions = [
            d for d in candidates
            if d.start_time not in used_times
            and d.is_question
            and d.start_time < candidates[-1].end_time * 0.8  # Not from ending
        ]
        if remaining_questions:
            cliffhanger = max(remaining_questions, key=lambda x: x.narrative_importance)
            cliffhanger.narrative_phase = "cliffhanger"
            selected.append(cliffhanger)

        story_analysis = {
            "premise": "A journey of conflict and emotion",
            "avoided_spoilers": ["Last 15% of movie excluded", "Death/ending patterns filtered"],
            "reasoning": "Rule-based selection prioritizing questions, emotions, and narrative flow"
        }

        return selected, story_analysis

    def _build_sequence(
        self,
        selected_dialogues: List[DialogueSegment],
        characters: List[Character],
        style: str,
        target_duration: int
    ) -> List[TrailerDialogueSequence]:
        """Build final ordered sequence for trailer."""
        sequences = []

        # Phase ordering
        phase_order = [
            NarrativePhase.OPENING_HOOK,
            NarrativePhase.CHARACTER_INTRO,
            NarrativePhase.WORLD_SETUP,
            NarrativePhase.CONFLICT_SETUP,
            NarrativePhase.TENSION_BUILD,
            NarrativePhase.EMOTIONAL_PEAK,
            NarrativePhase.CLIFFHANGER,
        ]

        # Group dialogues by phase
        phase_dialogues = {phase: [] for phase in phase_order}
        for dial in selected_dialogues:
            phase_str = getattr(dial, 'narrative_phase', 'tension_build')
            try:
                phase = NarrativePhase(phase_str)
            except ValueError:
                phase = NarrativePhase.TENSION_BUILD
            phase_dialogues[phase].append(dial)

        # Build sequence in order
        for phase in phase_order:
            for dial in phase_dialogues[phase]:
                # Calculate scene extraction times (add buffer around dialogue)
                buffer = 1.0  # 1 second buffer
                scene_start = max(0, dial.start_time - buffer)
                scene_end = dial.end_time + buffer

                # STAGE Style: Faster cuts (2-4 seconds for dynamic pacing)
                duration = getattr(dial, 'trailer_duration', min(4.0, max(2.0, dial.duration + 1.0)))

                # Transition based on phase
                if phase == NarrativePhase.OPENING_HOOK:
                    transition = "fade"
                elif phase in [NarrativePhase.TENSION_BUILD, NarrativePhase.CONFLICT_SETUP]:
                    transition = "cut"
                elif phase == NarrativePhase.CLIFFHANGER:
                    transition = "fade"
                else:
                    transition = "dissolve"

                seq = TrailerDialogueSequence(
                    id=f"seq_{len(sequences):02d}",
                    phase=phase,
                    dialogue=dial,
                    scene_timestamp=(scene_start, scene_end),
                    transition=transition,
                    duration_in_trailer=duration,
                    text_overlay=self._get_overlay(phase, style)
                )
                sequences.append(seq)

        return sequences

    def _get_overlay(self, phase: NarrativePhase, style: str) -> Optional[str]:
        """Get text overlay for phase if needed."""
        # Only add overlays at key moments
        if phase == NarrativePhase.CHARACTER_INTRO:
            return None  # Title could go here
        elif phase == NarrativePhase.CLIFFHANGER:
            return "Coming Soon"
        return None

    def _calculate_confidence(
        self,
        sequences: List[TrailerDialogueSequence],
        characters: List[Character]
    ) -> int:
        """Calculate confidence score for the narrative."""
        score = 50  # Base

        # Has opening hook
        if sequences and sequences[0].phase == NarrativePhase.OPENING_HOOK:
            score += 10

        # Has cliffhanger ending
        if sequences and sequences[-1].phase == NarrativePhase.CLIFFHANGER:
            score += 15

        # Cliffhanger is a question
        if sequences and sequences[-1].dialogue.is_question:
            score += 10

        # Has character intro
        if any(s.phase == NarrativePhase.CHARACTER_INTRO for s in sequences):
            score += 10

        # Good number of sequences (8-12)
        if 8 <= len(sequences) <= 12:
            score += 10

        # Has characters identified
        if characters:
            score += min(10, len(characters) * 3)

        # Has protagonist
        if any(c.role == "protagonist" for c in characters):
            score += 5

        return min(100, score)


def build_dialogue_narrative(
    dialogues: List[Dict],
    video_duration: float,
    style: str = "dramatic",
    target_duration: int = 90,
    metadata: Optional[Dict] = None,
    model: str = "mistral"
) -> DialogueNarrative:
    """Convenience function to build dialogue-based narrative.

    Args:
        dialogues: List of dialogue dicts with text, start_time, end_time
        video_duration: Total video duration
        style: Narrative style
        target_duration: Target trailer duration
        metadata: Content metadata
        model: Ollama model to use

    Returns:
        Complete DialogueNarrative
    """
    engine = DialogueNarrativeEngine(model=model)
    return engine.build_narrative(
        dialogues=dialogues,
        video_duration=video_duration,
        style=style,
        target_duration=target_duration,
        metadata=metadata
    )
