"""Deep Story Analyzer for Trailer Narratives.

This module performs DEEP analysis of ALL dialogues to understand:
1. The complete story structure and plot
2. Character names extracted from dialogue content
3. Character relationships (allies, antagonists, family)
4. Character arcs and emotional journeys
5. Key plot points and conflicts
6. Best dialogues for each narrative beat

The goal is to build a COHERENT trailer with proper:
- Character introductions (with names)
- Story setup that makes sense
- Conflict that viewers understand
- Emotional beats that resonate
- Cliffhanger that creates curiosity

Example: For "Jholachaap" (fake doctor story)
- Extract: Main character is a "jholachaap" doctor (maybe named)
- Find: His introduction dialogues
- Find: People who support him (villagers, patients)
- Find: People against him (real doctors, authorities)
- Build: Story of conflict between fake and real medicine
- End: With a question about his fate

LLM Options (in order of preference):
1. Ollama (if installed and running) - Best performance
2. HuggingFace Transformers - Auto-downloads, no external server needed
"""

import json
import re
import time
import os
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from loguru import logger

# Try Ollama first
OLLAMA_AVAILABLE = False
try:
    import ollama
    # Check if Ollama server is actually running
    try:
        ollama.list()
        OLLAMA_AVAILABLE = True
        logger.info("Ollama server detected and running")
    except Exception:
        logger.info("Ollama package installed but server not running")
except ImportError:
    logger.info("Ollama not installed, will use HuggingFace")

# HuggingFace Transformers (fallback - always available via pip)
HF_AVAILABLE = False
HF_PIPELINE = None
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    import torch
    HF_AVAILABLE = True
    logger.info("HuggingFace Transformers available")
except ImportError:
    logger.warning("HuggingFace Transformers not installed. Run: pip install transformers torch")


@dataclass
class ExtractedCharacter:
    """A character extracted from deep dialogue analysis."""
    name: str                          # Actual name or identifier from dialogues
    aliases: List[str]                 # Other names/titles used
    role_type: str                     # protagonist, antagonist, ally, family, authority
    description: str                   # Who is this character
    relationship_to_protagonist: str   # How they relate to main character
    introduction_dialogue: str         # Best dialogue to introduce them
    introduction_timestamp: float      # When to show them
    key_dialogues: List[Dict]          # Their important dialogues with timestamps
    emotional_arc: str                 # Their journey in the story
    screen_time_estimate: float        # Estimated importance


@dataclass
class StoryArc:
    """The complete story structure extracted from dialogues."""
    logline: str                       # One sentence story summary
    genre: str                         # Drama, Comedy, Action, etc.
    setting: str                       # Where/when the story takes place
    central_conflict: str              # What is the main problem
    stakes: str                        # What happens if protagonist fails
    theme: str                         # Deeper meaning/message

    # Story beats
    setup: str                         # Initial situation
    inciting_incident: str             # What starts the conflict
    rising_action: List[str]           # How conflict escalates
    climax_hint: str                   # Hint at climax without spoiling

    # For trailer
    hook_question: str                 # Question to end trailer with
    emotional_core: str                # What emotion to evoke


@dataclass
class TrailerScene:
    """A scene selected for the trailer with full context."""
    order: int
    phase: str                         # intro, character, conflict, tension, climax_tease, cliffhanger
    purpose: str                       # Why this scene is in trailer

    dialogue_text: str
    speaker_name: str                  # Who is speaking
    speaking_to: str                   # Who they're speaking to

    start_time: float
    end_time: float
    duration_in_trailer: float

    context: str                       # What's happening in this scene
    emotion: str                       # What emotion this evokes
    transition: str                    # How to transition to next

    # Continuity
    follows_from: str                  # What this continues from
    leads_to: str                      # What this sets up


@dataclass
class DeepNarrative:
    """Complete deep narrative analysis result."""
    story_arc: StoryArc
    characters: List[ExtractedCharacter]
    protagonist: ExtractedCharacter
    antagonist: Optional[ExtractedCharacter]

    trailer_scenes: List[TrailerScene]

    narrative_flow: str                # Description of how trailer tells the story
    continuity_notes: str              # How scenes connect

    confidence: int
    analysis_reasoning: str


class DeepStoryAnalyzer:
    """Performs deep story analysis from dialogues using LLM.

    This analyzer reads ALL dialogues and builds a complete understanding
    of the story before selecting scenes for the trailer.

    LLM Backend (auto-selected):
    1. Ollama (if installed and running) - Best performance
    2. HuggingFace Transformers - Auto-downloads, no external server

    HuggingFace Models (auto-download):
    - Qwen/Qwen2.5-1.5B-Instruct (default, ~3GB, fast)
    - microsoft/Phi-3-mini-4k-instruct (~7GB, better quality)
    - TinyLlama/TinyLlama-1.1B-Chat-v1.0 (~2GB, fastest)
    """

    # HuggingFace models that auto-download
    HF_MODELS = {
        "qwen2.5-1.5b": "Qwen/Qwen2.5-1.5B-Instruct",  # Default - good balance
        "qwen2.5-3b": "Qwen/Qwen2.5-3B-Instruct",      # Better quality
        "phi3-mini": "microsoft/Phi-3-mini-4k-instruct",  # Good quality
        "tinyllama": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",  # Fastest, lower quality
    }

    # Ollama model configs (if Ollama is available)
    OLLAMA_CONFIGS = {
        "qwen2.5:7b": {"temperature": 0.3, "num_predict": 3000},
        "qwen2.5:14b": {"temperature": 0.3, "num_predict": 4000},
        "llama3.2": {"temperature": 0.4, "num_predict": 4000},
        "mistral": {"temperature": 0.4, "num_predict": 3000},
    }

    def __init__(
        self,
        model: str = "auto",
        hf_model: str = "qwen2.5-1.5b"
    ):
        """Initialize the analyzer.

        Args:
            model: Ollama model name (or "auto" to auto-select backend)
            hf_model: HuggingFace model key (qwen2.5-1.5b, phi3-mini, tinyllama)
        """
        self.hf_model_key = hf_model
        self.hf_model_name = self.HF_MODELS.get(hf_model, self.HF_MODELS["qwen2.5-1.5b"])
        self.hf_pipeline = None

        # Determine backend
        self.use_ollama = OLLAMA_AVAILABLE
        self.use_hf = HF_AVAILABLE and not self.use_ollama

        if self.use_ollama:
            self.model = model if model != "auto" else "qwen2.5:7b"
            self.model_config = self.OLLAMA_CONFIGS.get(self.model, {"temperature": 0.4, "num_predict": 3000})
            self.llm_available = self._check_ollama()
            if not self.llm_available and HF_AVAILABLE:
                logger.info("Ollama model not available, falling back to HuggingFace")
                self.use_ollama = False
                self.use_hf = True
        else:
            self.model = "huggingface"
            self.llm_available = HF_AVAILABLE

        if self.use_hf:
            self.llm_available = self._init_hf_model()

        # Log status
        backend = "Ollama" if self.use_ollama else ("HuggingFace" if self.use_hf else "Fallback")
        logger.info(f"DeepStoryAnalyzer initialized: backend={backend}, model={self.model if self.use_ollama else self.hf_model_name}")
        logger.info(f"LLM available: {self.llm_available}")

    def _check_ollama(self) -> bool:
        """Check if Ollama model is available."""
        if not OLLAMA_AVAILABLE:
            return False
        try:
            models = ollama.list()
            model_names = [m['name'] for m in models.get('models', [])]
            model_names_base = [m['name'].split(':')[0] for m in models.get('models', [])]

            return (
                self.model in model_names or
                self.model in model_names_base or
                self.model.split(':')[0] in model_names_base
            )
        except Exception as e:
            logger.warning(f"Ollama check failed: {e}")
            return False

    def _init_hf_model(self) -> bool:
        """Initialize HuggingFace model (auto-downloads)."""
        if not HF_AVAILABLE:
            return False

        try:
            logger.info(f"Loading HuggingFace model: {self.hf_model_name}")
            logger.info("This will auto-download on first run (~2-7GB depending on model)...")

            # Determine device
            if torch.cuda.is_available():
                device = "cuda"
                logger.info("Using CUDA GPU")
            elif torch.backends.mps.is_available():
                device = "mps"
                logger.info("Using Apple Silicon GPU")
            else:
                device = "cpu"
                logger.info("Using CPU (slower)")

            # Load model with appropriate settings
            self.hf_pipeline = pipeline(
                "text-generation",
                model=self.hf_model_name,
                device_map="auto" if device != "cpu" else None,
                torch_dtype=torch.float16 if device != "cpu" else torch.float32,
                trust_remote_code=True,
            )

            logger.info(f"HuggingFace model loaded successfully!")
            return True

        except Exception as e:
            logger.error(f"Failed to load HuggingFace model: {e}")

            # Try smaller fallback model
            if self.hf_model_key != "tinyllama":
                logger.info("Trying smaller fallback model: TinyLlama...")
                try:
                    self.hf_model_name = self.HF_MODELS["tinyllama"]
                    self.hf_pipeline = pipeline(
                        "text-generation",
                        model=self.hf_model_name,
                        torch_dtype=torch.float32,
                        trust_remote_code=True,
                    )
                    logger.info("TinyLlama loaded as fallback")
                    return True
                except Exception as e2:
                    logger.error(f"Fallback model also failed: {e2}")

            return False

    def _generate(self, prompt: str, max_tokens: int = 2000) -> str:
        """Generate text using available LLM backend."""
        if self.use_ollama and OLLAMA_AVAILABLE:
            return self._generate_ollama(prompt, max_tokens)
        elif self.use_hf and self.hf_pipeline:
            return self._generate_hf(prompt, max_tokens)
        else:
            return ""

    def _generate_ollama(self, prompt: str, max_tokens: int) -> str:
        """Generate using Ollama."""
        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={**self.model_config, "num_predict": max_tokens}
            )
            return response.get('response', '')
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            return ""

    def _generate_hf(self, prompt: str, max_tokens: int) -> str:
        """Generate using HuggingFace pipeline."""
        try:
            # Format prompt for chat model
            messages = [{"role": "user", "content": prompt}]

            result = self.hf_pipeline(
                messages,
                max_new_tokens=min(max_tokens, 2048),
                do_sample=True,
                temperature=0.3,
                top_p=0.9,
                pad_token_id=self.hf_pipeline.tokenizer.eos_token_id,
            )

            # Extract generated text
            generated = result[0]["generated_text"]
            if isinstance(generated, list):
                # Chat format - get last message
                return generated[-1]["content"] if generated else ""
            return generated

        except Exception as e:
            logger.error(f"HuggingFace generation failed: {e}")
            return ""

    def analyze(
        self,
        dialogues: List[Dict],
        video_duration: float,
        metadata: Optional[Dict] = None,
        target_trailer_duration: int = 90
    ) -> DeepNarrative:
        """Perform deep story analysis on all dialogues.

        Args:
            dialogues: List of dicts with text, start_time, end_time
            video_duration: Total video duration
            metadata: Optional title, genre info
            target_trailer_duration: Target length for trailer

        Returns:
            DeepNarrative with complete analysis
        """
        metadata = metadata or {}
        title = metadata.get("title", "Unknown Movie")

        logger.info(f"Starting deep story analysis for: {title}")
        logger.info(f"Analyzing {len(dialogues)} dialogues...")

        # Step 1: Prepare full dialogue transcript with timestamps
        transcript = self._prepare_transcript(dialogues)

        # Step 2: Deep story understanding
        logger.info("Step 1/4: Understanding the complete story...")
        story_arc = self._analyze_story_arc(transcript, metadata)

        # Step 3: Extract characters with names
        logger.info("Step 2/4: Extracting characters and relationships...")
        characters = self._extract_characters(transcript, story_arc, metadata)

        # Step 4: Identify protagonist and antagonist
        protagonist = next((c for c in characters if c.role_type == "protagonist"), characters[0] if characters else None)
        antagonist = next((c for c in characters if c.role_type == "antagonist"), None)

        # Step 5: Build trailer narrative with continuity
        logger.info("Step 3/4: Building trailer narrative with story continuity...")
        trailer_scenes = self._build_trailer_narrative(
            dialogues, transcript, story_arc, characters,
            protagonist, antagonist, target_trailer_duration
        )

        # Step 6: Validate continuity
        logger.info("Step 4/4: Validating narrative continuity...")
        narrative_flow, continuity_notes = self._validate_continuity(trailer_scenes, story_arc)

        confidence = self._calculate_confidence(story_arc, characters, trailer_scenes)

        logger.info(f"Deep analysis complete. Confidence: {confidence}")
        logger.info(f"Story: {story_arc.logline[:80]}...")
        logger.info(f"Protagonist: {protagonist.name if protagonist else 'Unknown'}")
        logger.info(f"Antagonist: {antagonist.name if antagonist else 'None identified'}")
        logger.info(f"Trailer scenes: {len(trailer_scenes)}")

        return DeepNarrative(
            story_arc=story_arc,
            characters=characters,
            protagonist=protagonist,
            antagonist=antagonist,
            trailer_scenes=trailer_scenes,
            narrative_flow=narrative_flow,
            continuity_notes=continuity_notes,
            confidence=confidence,
            analysis_reasoning=f"Deep analysis of {len(dialogues)} dialogues"
        )

    def _prepare_transcript(self, dialogues: List[Dict]) -> str:
        """Prepare full transcript with timestamps for LLM analysis."""
        lines = []
        for i, d in enumerate(dialogues):
            text = d.get("text", "").strip()
            if not text or len(text) < 3:
                continue

            start = d.get("start_time", 0)
            minutes = int(start // 60)
            seconds = int(start % 60)

            lines.append(f"[{minutes:02d}:{seconds:02d}] {text}")

        return "\n".join(lines)

    def _analyze_story_arc(self, transcript: str, metadata: Dict) -> StoryArc:
        """Analyze the complete story structure from dialogues."""
        title = metadata.get("title", "Unknown")
        genre_hint = metadata.get("genre", "")

        # Limit transcript for context window but keep enough for full understanding
        max_chars = 15000
        if len(transcript) > max_chars:
            # Take beginning, middle, and end portions
            part_size = max_chars // 3
            beginning = transcript[:part_size]
            middle_start = len(transcript) // 2 - part_size // 2
            middle = transcript[middle_start:middle_start + part_size]
            ending = transcript[-part_size:]
            transcript_sample = f"{beginning}\n\n[... middle section ...]\n\n{middle}\n\n[... later ...]\n\n{ending}"
        else:
            transcript_sample = transcript

        prompt = f"""You are a brilliant film analyst. Analyze this movie's COMPLETE STORY from its dialogues.

MOVIE TITLE: {title}
GENRE HINT: {genre_hint or "Unknown - determine from dialogues"}

FULL DIALOGUE TRANSCRIPT:
{transcript_sample}

Analyze the COMPLETE STORY and provide a detailed understanding:

OUTPUT FORMAT (JSON):
{{
    "logline": "One sentence that captures the entire story premise",
    "genre": "Primary genre (Drama, Comedy, Action, Thriller, Romance, etc.)",
    "setting": "Where and when the story takes place (village, city, time period, etc.)",
    "central_conflict": "What is the MAIN problem/conflict the protagonist faces",
    "stakes": "What happens if the protagonist fails - what's at risk",
    "theme": "Deeper meaning or message of the story",

    "setup": "The initial situation before conflict begins",
    "inciting_incident": "What event or revelation starts the main conflict",
    "rising_action": ["Key escalation 1", "Key escalation 2", "Key escalation 3"],
    "climax_hint": "Hint at the climax WITHOUT spoiling the ending",

    "hook_question": "A compelling question to end the trailer that makes viewers want to watch",
    "emotional_core": "The primary emotion viewers should feel (hope, tension, curiosity, etc.)"
}}

IMPORTANT:
- Understand the COMPLETE story arc
- Identify what makes this story unique
- Find the emotional core
- Create a hook question that doesn't spoil but intrigues
- For Indian regional cinema, consider cultural context

OUTPUT ONLY VALID JSON:"""

        if self.llm_available:
            try:
                response_text = self._generate(prompt, max_tokens=2000)
                json_match = re.search(r'\{[\s\S]*\}', response_text)

                if json_match:
                    data = json.loads(json_match.group())
                    return StoryArc(
                        logline=data.get("logline", "A story of struggle and triumph"),
                        genre=data.get("genre", "Drama"),
                        setting=data.get("setting", "Unknown"),
                        central_conflict=data.get("central_conflict", "Unknown conflict"),
                        stakes=data.get("stakes", "Unknown stakes"),
                        theme=data.get("theme", "Unknown theme"),
                        setup=data.get("setup", ""),
                        inciting_incident=data.get("inciting_incident", ""),
                        rising_action=data.get("rising_action", []),
                        climax_hint=data.get("climax_hint", ""),
                        hook_question=data.get("hook_question", "What will happen next?"),
                        emotional_core=data.get("emotional_core", "curiosity")
                    )
            except Exception as e:
                logger.error(f"Story arc analysis failed: {e}")

        # Fallback
        return StoryArc(
            logline="A compelling story of conflict and resolution",
            genre="Drama",
            setting="India",
            central_conflict="Unknown - requires LLM analysis",
            stakes="Unknown",
            theme="Unknown",
            setup="",
            inciting_incident="",
            rising_action=[],
            climax_hint="",
            hook_question="Kya hoga aage?",
            emotional_core="curiosity"
        )

    def _extract_characters(
        self,
        transcript: str,
        story_arc: StoryArc,
        metadata: Dict
    ) -> List[ExtractedCharacter]:
        """Extract characters with actual names from dialogues."""
        title = metadata.get("title", "Unknown")

        # Limit transcript
        max_chars = 12000
        transcript_sample = transcript[:max_chars] if len(transcript) > max_chars else transcript

        prompt = f"""You are a character analyst. Extract ALL important characters from this movie's dialogues.

MOVIE: {title}
STORY: {story_arc.logline}
CONFLICT: {story_arc.central_conflict}

DIALOGUES:
{transcript_sample}

Extract characters with their ACTUAL NAMES as mentioned in dialogues.
Look for:
- Names mentioned directly ("Raju", "Doctor sahab", "Pandit ji")
- Titles and roles ("Sarpanch", "Doctor", "Inspector")
- Relationship terms ("Maa", "Babuji", "Beta")
- How characters address each other

OUTPUT FORMAT (JSON):
{{
    "characters": [
        {{
            "name": "Character's actual name or primary identifier from dialogues",
            "aliases": ["Other names/titles used for this character"],
            "role_type": "protagonist OR antagonist OR ally OR family OR authority OR other",
            "description": "Who is this character - their occupation, background",
            "relationship_to_protagonist": "How they relate to the main character",
            "introduction_dialogue": "The best dialogue that introduces this character",
            "introduction_timestamp": "MM:SS format when they should be introduced",
            "emotional_arc": "Their journey - supportive, opposing, transforming, etc.",
            "importance": "HIGH, MEDIUM, or LOW"
        }}
    ]
}}

IMPORTANT:
- Extract ACTUAL NAMES from dialogues, not generic labels
- The protagonist is usually the character with most dialogue/conflict
- Find antagonists - those who oppose the protagonist
- Find allies - those who support the protagonist
- Find family members
- Find authority figures
- For each character, find their BEST introduction dialogue

OUTPUT ONLY VALID JSON:"""

        if self.llm_available:
            try:
                response_text = self._generate(prompt, max_tokens=3000)
                json_match = re.search(r'\{[\s\S]*\}', response_text)

                if json_match:
                    data = json.loads(json_match.group())
                    characters = []

                    for c in data.get("characters", []):
                        # Parse timestamp
                        ts_str = c.get("introduction_timestamp", "00:00")
                        try:
                            parts = ts_str.replace("[", "").replace("]", "").split(":")
                            timestamp = int(parts[0]) * 60 + int(parts[1])
                        except:
                            timestamp = 0

                        char = ExtractedCharacter(
                            name=c.get("name", "Unknown"),
                            aliases=c.get("aliases", []),
                            role_type=c.get("role_type", "other"),
                            description=c.get("description", ""),
                            relationship_to_protagonist=c.get("relationship_to_protagonist", ""),
                            introduction_dialogue=c.get("introduction_dialogue", ""),
                            introduction_timestamp=timestamp,
                            key_dialogues=[],
                            emotional_arc=c.get("emotional_arc", ""),
                            screen_time_estimate=1.0 if c.get("importance") == "HIGH" else 0.5
                        )
                        characters.append(char)

                    if characters:
                        return characters

            except Exception as e:
                logger.error(f"Character extraction failed: {e}")

        # Fallback - minimal characters
        return [
            ExtractedCharacter(
                name="Protagonist",
                aliases=[],
                role_type="protagonist",
                description="Main character",
                relationship_to_protagonist="self",
                introduction_dialogue="",
                introduction_timestamp=0,
                key_dialogues=[],
                emotional_arc="journey",
                screen_time_estimate=1.0
            )
        ]

    def _build_trailer_narrative(
        self,
        dialogues: List[Dict],
        transcript: str,
        story_arc: StoryArc,
        characters: List[ExtractedCharacter],
        protagonist: ExtractedCharacter,
        antagonist: Optional[ExtractedCharacter],
        target_duration: int
    ) -> List[TrailerScene]:
        """Build a coherent trailer narrative using TWO-PASS selection.

        Pass 1: Select ~20 candidate dialogues (wide net)
        Pass 2: Refine to 10-12 best with continuity validation
        """
        logger.info("Two-pass dialogue selection starting...")

        # Prepare character info for prompts
        char_info = "\n".join([
            f"- {c.name} ({c.role_type}): {c.description}"
            for c in characters[:6]
        ])

        # Prepare dialogues with indices
        dialogue_list = []
        for i, d in enumerate(dialogues):
            text = d.get("text", "").strip()
            if not text or len(text) < 5:
                continue
            start = d.get("start_time", 0)
            mins = int(start // 60)
            secs = int(start % 60)
            dialogue_list.append(f"[{i}] [{mins:02d}:{secs:02d}] {text}")

        dialogue_sample = "\n".join(dialogue_list[:100])  # More dialogues for wider selection

        # ========== PASS 1: Wide Selection (20 candidates) ==========
        logger.info("Pass 1: Selecting ~20 candidate dialogues...")

        pass1_prompt = f"""You are a trailer editor. Select the 20 BEST dialogues for a movie trailer.

MOVIE STORY:
- Logline: {story_arc.logline}
- Conflict: {story_arc.central_conflict}
- Stakes: {story_arc.stakes}

CHARACTERS:
{char_info}

PROTAGONIST: {protagonist.name if protagonist else 'Unknown'}
ANTAGONIST: {antagonist.name if antagonist else 'None'}

AVAILABLE DIALOGUES (format: [index] [timestamp] dialogue):
{dialogue_sample}

Select 20 dialogues that could work for a trailer. For each, note:
- Why it's powerful/interesting
- What role it could play (hook, intro, conflict, tension, climax, cliffhanger)
- Which character speaks it

OUTPUT FORMAT (JSON):
{{
    "candidates": [
        {{
            "dialogue_index": 5,
            "dialogue_text": "The exact dialogue",
            "speaker": "Character name",
            "potential_role": "hook OR intro OR conflict OR tension OR emotional OR cliffhanger",
            "strength": "Why this dialogue is powerful",
            "score": 8
        }}
    ]
}}

SELECTION CRITERIA:
1. Dialogues that reveal character personality
2. Dialogues that hint at conflict without spoiling
3. Emotional moments that create connection
4. Questions or statements that create curiosity
5. Spread across movie timeline (not all from same section)
6. AVOID last 15% of movie (spoilers)

Select exactly 20 candidates. OUTPUT ONLY VALID JSON:"""

        candidates = []

        if self.llm_available:
            try:
                response_text = self._generate(pass1_prompt, max_tokens=3000)
                json_match = re.search(r'\{[\s\S]*\}', response_text)

                if json_match:
                    data = json.loads(json_match.group())
                    candidates = data.get("candidates", [])
                    logger.info(f"Pass 1 complete: {len(candidates)} candidates selected")

            except Exception as e:
                logger.error(f"Pass 1 failed: {e}")

        if not candidates:
            logger.warning("Pass 1 failed, using fallback")
            return self._fallback_scene_selection(dialogues, story_arc, protagonist, target_duration)

        # ========== PASS 2: Refinement (10-12 final) ==========
        logger.info("Pass 2: Refining to 10-12 best with continuity...")

        # Format candidates for pass 2
        candidate_list = "\n".join([
            f"[{c.get('dialogue_index')}] {c.get('potential_role').upper()}: \"{c.get('dialogue_text')[:60]}...\" - {c.get('speaker')} (score: {c.get('score')})"
            for c in candidates
        ])

        pass2_prompt = f"""You are a master trailer editor. From these 20 candidate dialogues, select the BEST 10-12 that create a COHERENT STORY.

STORY CONTEXT:
- Logline: {story_arc.logline}
- Hook Question: {story_arc.hook_question}
- Protagonist: {protagonist.name if protagonist else 'Unknown'}
- Antagonist: {antagonist.name if antagonist else 'None'}

CANDIDATE DIALOGUES:
{candidate_list}

Create a trailer that flows like a mini-story:

REQUIRED STRUCTURE:
1. OPENING_HOOK (1 dialogue): Grab attention immediately
2. PROTAGONIST_INTRO (1-2 dialogues): Introduce {protagonist.name if protagonist else 'protagonist'} with NAME
3. WORLD_SETUP (1 dialogue): Establish setting/situation
4. ALLY_INTRO (1 dialogue): Show someone who supports protagonist
5. CONFLICT_INTRO (1-2 dialogues): Introduce the problem/antagonist
6. TENSION_BUILD (2-3 dialogues): Stakes escalating
7. EMOTIONAL_PEAK (1 dialogue): Most powerful emotional moment
8. CLIFFHANGER (1 dialogue): End with question/suspense - preferably "{story_arc.hook_question}"

OUTPUT FORMAT (JSON):
{{
    "trailer_scenes": [
        {{
            "order": 1,
            "phase": "opening_hook",
            "dialogue_index": 5,
            "dialogue_text": "Exact dialogue text",
            "speaker_name": "Character name",
            "speaking_to": "Who they speak to",
            "duration_in_trailer": 6,
            "context": "What's happening",
            "emotion": "curiosity/tension/hope/fear/etc",
            "transition": "cut",
            "follows_from": "start",
            "leads_to": "What this sets up"
        }}
    ],
    "narrative_flow": "How this sequence tells a coherent mini-story",
    "refinement_reasoning": "Why these 10-12 were chosen over others"
}}

REFINEMENT RULES:
1. CONTINUITY: Each dialogue must flow logically from previous
2. CHARACTER BALANCE: Don't use same character 3+ times in a row
3. TIMELINE SPREAD: Dialogues should be from different parts of movie
4. EMOTIONAL ARC: Build from curiosity → tension → emotion → question
5. NO SPOILERS: Avoid revealing resolution or ending
6. MUST end with cliffhanger question

Select 10-12 dialogues. OUTPUT ONLY VALID JSON:"""

        if self.llm_available:
            try:
                response_text = self._generate(pass2_prompt, max_tokens=4000)
                json_match = re.search(r'\{[\s\S]*\}', response_text)

                if json_match:
                    data = json.loads(json_match.group())
                    scenes = []

                    refinement_reasoning = data.get("refinement_reasoning", "")
                    if refinement_reasoning:
                        logger.info(f"Pass 2 reasoning: {refinement_reasoning[:100]}...")

                    for s in data.get("trailer_scenes", []):
                        dial_idx = s.get("dialogue_index", 0)
                        if dial_idx < len(dialogues):
                            dial = dialogues[dial_idx]
                            start_time = dial.get("start_time", 0)
                            end_time = dial.get("end_time", start_time + 3)
                        else:
                            start_time = 0
                            end_time = 3

                        scene = TrailerScene(
                            order=s.get("order", len(scenes) + 1),
                            phase=s.get("phase", "tension"),
                            purpose=s.get("purpose", refinement_reasoning[:50] if refinement_reasoning else ""),
                            dialogue_text=s.get("dialogue_text", ""),
                            speaker_name=s.get("speaker_name", "Unknown"),
                            speaking_to=s.get("speaking_to", ""),
                            start_time=start_time,
                            end_time=end_time,
                            duration_in_trailer=s.get("duration_in_trailer", 5),
                            context=s.get("context", ""),
                            emotion=s.get("emotion", ""),
                            transition=s.get("transition", "cut"),
                            follows_from=s.get("follows_from", ""),
                            leads_to=s.get("leads_to", "")
                        )
                        scenes.append(scene)

                    if scenes:
                        logger.info(f"Pass 2 complete: {len(scenes)} scenes selected")
                        logger.info(f"Narrative flow: {data.get('narrative_flow', 'N/A')[:80]}...")
                        return scenes

            except Exception as e:
                logger.error(f"Pass 2 failed: {e}")

        # Fallback
        return self._fallback_scene_selection(dialogues, story_arc, protagonist, target_duration)

    def _fallback_scene_selection(
        self,
        dialogues: List[Dict],
        story_arc: StoryArc,
        protagonist: ExtractedCharacter,
        target_duration: int
    ) -> List[TrailerScene]:
        """Fallback scene selection when LLM is unavailable."""
        scenes = []

        # Filter valid dialogues
        valid = [d for d in dialogues if len(d.get("text", "")) > 10]

        if not valid:
            return scenes

        # Select key positions
        positions = [
            (0.05, "opening_hook"),
            (0.10, "protagonist_intro"),
            (0.15, "world_setup"),
            (0.25, "ally_intro"),
            (0.35, "conflict_intro"),
            (0.45, "tension_1"),
            (0.55, "tension_2"),
            (0.65, "emotional_peak"),
            (0.70, "cliffhanger"),
        ]

        video_duration = valid[-1].get("end_time", 3600) if valid else 3600

        for pos, phase in positions:
            target_time = video_duration * pos

            # Find closest dialogue
            best = min(valid, key=lambda d: abs(d.get("start_time", 0) - target_time))

            scene = TrailerScene(
                order=len(scenes) + 1,
                phase=phase,
                purpose=f"Selected for {phase}",
                dialogue_text=best.get("text", ""),
                speaker_name="Unknown",
                speaking_to="",
                start_time=best.get("start_time", 0),
                end_time=best.get("end_time", 0),
                duration_in_trailer=5,
                context="",
                emotion="",
                transition="cut",
                follows_from="",
                leads_to=""
            )
            scenes.append(scene)

        return scenes

    def _validate_continuity(
        self,
        scenes: List[TrailerScene],
        story_arc: StoryArc
    ) -> Tuple[str, str]:
        """Validate and describe the narrative continuity."""
        if not scenes:
            return "No scenes selected", "Unable to validate"

        # Build flow description
        flow_parts = []
        for i, scene in enumerate(scenes):
            if scene.follows_from:
                flow_parts.append(f"{i+1}. {scene.phase}: {scene.follows_from} → {scene.leads_to}")
            else:
                flow_parts.append(f"{i+1}. {scene.phase}: {scene.purpose[:50]}")

        narrative_flow = "Trailer Flow:\n" + "\n".join(flow_parts)

        # Continuity notes
        notes = []
        notes.append(f"Story: {story_arc.logline}")
        notes.append(f"Emotional arc: {story_arc.emotional_core}")
        notes.append(f"Hook question: {story_arc.hook_question}")

        if scenes[-1].phase == "cliffhanger":
            notes.append("✓ Ends with cliffhanger")
        else:
            notes.append("⚠ May need stronger ending")

        return narrative_flow, "\n".join(notes)

    def _calculate_confidence(
        self,
        story_arc: StoryArc,
        characters: List[ExtractedCharacter],
        scenes: List[TrailerScene]
    ) -> int:
        """Calculate confidence in the analysis."""
        score = 50

        # Story understanding
        if story_arc.logline and len(story_arc.logline) > 20:
            score += 10
        if story_arc.central_conflict:
            score += 5
        if story_arc.hook_question:
            score += 10

        # Character extraction
        protagonist = next((c for c in characters if c.role_type == "protagonist"), None)
        if protagonist and protagonist.name != "Protagonist":
            score += 10  # Found actual name
        if any(c.role_type == "antagonist" for c in characters):
            score += 5
        if len(characters) >= 3:
            score += 5

        # Scene selection
        if len(scenes) >= 8:
            score += 5
        if any(s.phase == "cliffhanger" for s in scenes):
            score += 5
        if any(s.phase == "protagonist_intro" for s in scenes):
            score += 5

        return min(100, score)


def analyze_story_deeply(
    dialogues: List[Dict],
    video_duration: float,
    metadata: Optional[Dict] = None,
    target_duration: int = 90,
    model: str = "mistral"
) -> DeepNarrative:
    """Convenience function for deep story analysis.

    Args:
        dialogues: List of dialogue dicts
        video_duration: Total video duration
        metadata: Movie metadata (title, genre)
        target_duration: Target trailer duration
        model: Ollama model to use

    Returns:
        DeepNarrative with complete analysis
    """
    analyzer = DeepStoryAnalyzer(model=model)
    return analyzer.analyze(
        dialogues=dialogues,
        video_duration=video_duration,
        metadata=metadata,
        target_trailer_duration=target_duration
    )
