"""Character-Centric Trailer Builder.

This module builds trailers with PROPER character introductions and story structure.
The approach is dialogue-first with character mapping.

Key Principles:
1. Every trailer must introduce protagonist BY NAME
2. Show allies who support protagonist
3. Introduce antagonist/conflict clearly
4. Build emotional arc through dialogue selection
5. End with compelling unanswered question

Trailer Variants:
1. HERO_JOURNEY: Character → Desire → Obstacle → Struggle → Hope
2. MYSTERY: Question → Hints → Revelation → Bigger Question
3. CONFLICT: Two Forces → Clash → Stakes → Unresolved
"""

import json
import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from loguru import logger

# Import LLM backend
try:
    from transformers import pipeline
    import torch
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False

try:
    import ollama
    try:
        ollama.list()
        OLLAMA_AVAILABLE = True
    except:
        OLLAMA_AVAILABLE = False
except ImportError:
    OLLAMA_AVAILABLE = False


class DialogueCategory(Enum):
    """Categories for dialogue narrative function."""
    HOOK_QUESTION = "hook_question"           # Questions that grab attention
    HOOK_DRAMATIC = "hook_dramatic"           # Dramatic statements for hook
    INTRO_SELF = "intro_self"                 # Character introduces themselves
    INTRO_DESIRE = "intro_desire"             # Character states what they want
    WORLD_SETTING = "world_setting"           # Establishes where/when
    ALLY_SUPPORT = "ally_support"             # Someone supporting protagonist
    ALLY_INTRO = "ally_intro"                 # Ally introduces themselves
    ANTAGONIST_THREAT = "antagonist_threat"   # Threat/opposition dialogue
    ANTAGONIST_INTRO = "antagonist_intro"     # Antagonist introduces themselves
    ESCALATION = "escalation"                 # Stakes rising
    EMOTIONAL_VULNERABLE = "emotional_vulnerable"  # Raw vulnerability
    EMOTIONAL_STRENGTH = "emotional_strength"      # Inner strength shown
    CONFLICT_MOMENT = "conflict_moment"       # Direct conflict
    CLIFFHANGER = "cliffhanger"              # Ending question/hook
    GENERIC = "generic"                       # General dialogue


@dataclass
class MappedCharacter:
    """A character mapped from dialogue analysis."""
    name: str
    role: str  # protagonist, antagonist, ally, family, authority
    introduction_dialogue: str
    introduction_timestamp: float
    key_dialogues: List[Dict]  # [{text, timestamp, category}]
    relationship_to_protagonist: str
    character_trait: str  # One word trait: brave, cunning, loving, etc.


@dataclass
class CategorizedDialogue:
    """A dialogue with its narrative category."""
    index: int
    text: str
    start_time: float
    end_time: float
    speaker: str  # Character name if identified
    category: DialogueCategory
    emotional_weight: int  # 1-10 scale
    is_question: bool
    contains_name: bool  # Does it contain a character name


@dataclass
class TrailerVariant:
    """A complete trailer variant."""
    variant_type: str  # hero_journey, mystery, conflict
    variant_name: str
    description: str

    # Character info
    protagonist_name: str
    protagonist_intro_dialogue: str
    antagonist_name: Optional[str]
    allies: List[str]

    # Dialogue sequence
    sequence: List[Dict]  # [{phase, dialogue, speaker, timestamp, duration}]

    # Story elements
    hook: str
    world_setup: str
    conflict: str
    emotional_peak: str
    cliffhanger: str

    # Quality metrics
    coherence_score: int  # 0-100
    emotional_impact: int  # 0-100
    hook_strength: int  # 0-100
    total_duration: float


class CharacterTrailerBuilder:
    """Builds character-centric trailers with multiple variants."""

    # HuggingFace models
    HF_MODELS = {
        "qwen2.5-1.5b": "Qwen/Qwen2.5-1.5B-Instruct",
        "qwen2.5-3b": "Qwen/Qwen2.5-3B-Instruct",
        "tinyllama": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    }

    def __init__(self, hf_model: str = "qwen2.5-1.5b"):
        """Initialize the builder.

        Args:
            hf_model: HuggingFace model key
        """
        self.hf_model_key = hf_model
        self.hf_model_name = self.HF_MODELS.get(hf_model, self.HF_MODELS["qwen2.5-1.5b"])
        self.hf_pipeline = None

        # Determine backend
        self.use_ollama = OLLAMA_AVAILABLE
        self.use_hf = HF_AVAILABLE and not self.use_ollama

        if self.use_hf:
            self._init_hf_model()

        self.llm_available = self.use_ollama or (self.use_hf and self.hf_pipeline is not None)

        backend = "Ollama" if self.use_ollama else ("HuggingFace" if self.use_hf else "Rule-based")
        logger.info(f"CharacterTrailerBuilder initialized: backend={backend}")
        logger.info(f"LLM available: {self.llm_available}")

    def _init_hf_model(self) -> bool:
        """Initialize HuggingFace model."""
        if not HF_AVAILABLE:
            return False
        try:
            logger.info(f"Loading HuggingFace model: {self.hf_model_name}")

            # Determine device
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

            logger.info(f"Using device: {device}")

            self.hf_pipeline = pipeline(
                "text-generation",
                model=self.hf_model_name,
                device_map="auto" if device != "cpu" else None,
                torch_dtype=torch.float16 if device != "cpu" else torch.float32,
                trust_remote_code=True,
            )
            logger.info("HuggingFace model loaded!")
            return True
        except Exception as e:
            logger.error(f"Failed to load HuggingFace model: {e}")
            # Try smaller fallback
            try:
                logger.info("Trying TinyLlama fallback...")
                self.hf_model_name = self.HF_MODELS["tinyllama"]
                self.hf_pipeline = pipeline(
                    "text-generation",
                    model=self.hf_model_name,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                )
                return True
            except:
                return False

    def _generate(self, prompt: str, max_tokens: int = 2000) -> str:
        """Generate text using available LLM."""
        if self.use_ollama:
            try:
                response = ollama.generate(
                    model="qwen2.5:7b",
                    prompt=prompt,
                    options={"temperature": 0.3, "num_predict": max_tokens}
                )
                return response.get('response', '')
            except Exception as e:
                logger.error(f"Ollama generation failed: {e}")

        if self.use_hf and self.hf_pipeline:
            try:
                messages = [{"role": "user", "content": prompt}]
                result = self.hf_pipeline(
                    messages,
                    max_new_tokens=min(max_tokens, 2048),
                    do_sample=True,
                    temperature=0.3,
                    top_p=0.9,
                    pad_token_id=self.hf_pipeline.tokenizer.eos_token_id,
                )
                generated = result[0]["generated_text"]
                if isinstance(generated, list):
                    return generated[-1]["content"] if generated else ""
                return generated
            except Exception as e:
                logger.error(f"HuggingFace generation failed: {e}")

        return ""

    def build_trailers(
        self,
        dialogues: List[Dict],
        metadata: Optional[Dict] = None,
        target_duration: int = 90,
        num_variants: int = 3
    ) -> List[TrailerVariant]:
        """Build multiple trailer variants from dialogues.

        Args:
            dialogues: List of dialogue dicts with text, start_time, end_time
            metadata: Movie metadata (title, genre)
            target_duration: Target trailer duration in seconds
            num_variants: Number of variants to generate

        Returns:
            List of TrailerVariant objects
        """
        metadata = metadata or {}
        title = metadata.get("title", "Untitled")

        logger.info("=" * 60)
        logger.info(f"BUILDING TRAILERS: {title}")
        logger.info(f"Dialogues: {len(dialogues)}, Target: {target_duration}s")
        logger.info("=" * 60)

        # Step 1: Map characters from dialogues
        logger.info("Step 1/4: Mapping characters...")
        characters = self._map_characters(dialogues, metadata)

        protagonist = next((c for c in characters if c.role == "protagonist"), None)
        antagonist = next((c for c in characters if c.role == "antagonist"), None)
        allies = [c for c in characters if c.role in ["ally", "family"]]

        if protagonist:
            logger.info(f"  Protagonist: {protagonist.name}")
        if antagonist:
            logger.info(f"  Antagonist: {antagonist.name}")
        logger.info(f"  Allies: {[a.name for a in allies]}")

        # Step 2: Categorize all dialogues
        logger.info("Step 2/4: Categorizing dialogues...")
        categorized = self._categorize_dialogues(dialogues, characters)

        category_counts = {}
        for cd in categorized:
            cat = cd.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1
        logger.info(f"  Categories: {category_counts}")

        # Step 3: Build variants
        logger.info("Step 3/4: Building trailer variants...")
        variants = []

        # Variant 1: Hero's Journey
        hero_variant = self._build_hero_journey_variant(
            categorized, characters, protagonist, antagonist, allies,
            target_duration, metadata
        )
        if hero_variant:
            variants.append(hero_variant)
            logger.info(f"  Hero's Journey: {hero_variant.coherence_score}/100")

        # Variant 2: Mystery/Question-led
        mystery_variant = self._build_mystery_variant(
            categorized, characters, protagonist, antagonist, allies,
            target_duration, metadata
        )
        if mystery_variant:
            variants.append(mystery_variant)
            logger.info(f"  Mystery: {mystery_variant.coherence_score}/100")

        # Variant 3: Conflict-centric
        conflict_variant = self._build_conflict_variant(
            categorized, characters, protagonist, antagonist, allies,
            target_duration, metadata
        )
        if conflict_variant:
            variants.append(conflict_variant)
            logger.info(f"  Conflict: {conflict_variant.coherence_score}/100")

        # Step 4: Score and rank variants
        logger.info("Step 4/4: Scoring variants...")
        variants = self._score_variants(variants)
        variants.sort(key=lambda v: v.coherence_score, reverse=True)

        logger.info(f"Generated {len(variants)} trailer variants")
        return variants[:num_variants]

    def _map_characters(
        self,
        dialogues: List[Dict],
        metadata: Dict
    ) -> List[MappedCharacter]:
        """Map characters from dialogue content."""

        # Prepare dialogue text for analysis
        dialogue_text = "\n".join([
            f"[{i}] [{int(d.get('start_time', 0)//60):02d}:{int(d.get('start_time', 0)%60):02d}] {d.get('text', '')}"
            for i, d in enumerate(dialogues[:80])
        ])

        prompt = f"""Analyze these movie dialogues and extract ALL characters.

DIALOGUES:
{dialogue_text}

For EACH character found, provide:
1. Their NAME (exact name from dialogues, like "Ramu", "Dr. Sharma", etc.)
2. Their ROLE: protagonist (main hero), antagonist (main villain/opposition), ally (supports hero), family, authority
3. Their INTRODUCTION dialogue (first line where they appear or introduce themselves)
4. Their relationship to the main character

OUTPUT FORMAT (JSON):
{{
    "characters": [
        {{
            "name": "Ramu",
            "role": "protagonist",
            "introduction_dialogue": "Main Ramu... Doctor Ramu...",
            "introduction_index": 3,
            "relationship": "Main character",
            "trait": "compassionate"
        }},
        {{
            "name": "Dr. Sharma",
            "role": "antagonist",
            "introduction_dialogue": "Main Dr. Sharma, sheher se aaya hoon",
            "introduction_index": 20,
            "relationship": "Opposes protagonist",
            "trait": "authoritative"
        }}
    ]
}}

RULES:
1. Extract ACTUAL NAMES from dialogues (not generic labels)
2. Protagonist is the main character the story follows
3. Antagonist is whoever opposes or threatens the protagonist
4. Look for self-introductions: "Main [name]...", "Mera naam [name]..."
5. Identify at least protagonist and 1-2 other characters

OUTPUT ONLY VALID JSON:"""

        characters = []

        if self.llm_available:
            try:
                response = self._generate(prompt, max_tokens=2000)
                json_match = re.search(r'\{[\s\S]*\}', response)

                if json_match:
                    data = json.loads(json_match.group())

                    for c in data.get("characters", []):
                        idx = c.get("introduction_index", 0)
                        timestamp = dialogues[idx].get("start_time", 0) if idx < len(dialogues) else 0

                        char = MappedCharacter(
                            name=c.get("name", "Unknown"),
                            role=c.get("role", "ally"),
                            introduction_dialogue=c.get("introduction_dialogue", ""),
                            introduction_timestamp=timestamp,
                            key_dialogues=[],
                            relationship_to_protagonist=c.get("relationship", ""),
                            character_trait=c.get("trait", "")
                        )
                        characters.append(char)
            except Exception as e:
                logger.error(f"Character mapping failed: {e}")

        # Fallback: basic extraction
        if not characters:
            characters = self._fallback_character_extraction(dialogues)

        return characters

    def _fallback_character_extraction(self, dialogues: List[Dict]) -> List[MappedCharacter]:
        """Fallback character extraction using patterns."""
        characters = []

        # Look for self-introduction patterns
        intro_patterns = [
            r"[Mm]ain\s+(\w+)",  # "Main Ramu..."
            r"[Mm]era\s+naam\s+(\w+)",  # "Mera naam..."
            r"[Mm]y\s+name\s+is\s+(\w+)",  # English
        ]

        found_names = set()
        for i, d in enumerate(dialogues):
            text = d.get("text", "")
            for pattern in intro_patterns:
                match = re.search(pattern, text)
                if match and match.group(1) not in found_names:
                    name = match.group(1)
                    found_names.add(name)

                    # First found is likely protagonist
                    role = "protagonist" if len(characters) == 0 else "ally"

                    characters.append(MappedCharacter(
                        name=name,
                        role=role,
                        introduction_dialogue=text,
                        introduction_timestamp=d.get("start_time", 0),
                        key_dialogues=[],
                        relationship_to_protagonist="Main character" if role == "protagonist" else "Supporting",
                        character_trait="unknown"
                    ))

        # If no characters found, create generic protagonist
        if not characters:
            characters.append(MappedCharacter(
                name="Protagonist",
                role="protagonist",
                introduction_dialogue=dialogues[0].get("text", "") if dialogues else "",
                introduction_timestamp=dialogues[0].get("start_time", 0) if dialogues else 0,
                key_dialogues=[],
                relationship_to_protagonist="Main character",
                character_trait="unknown"
            ))

        return characters

    def _categorize_dialogues(
        self,
        dialogues: List[Dict],
        characters: List[MappedCharacter]
    ) -> List[CategorizedDialogue]:
        """Categorize each dialogue by narrative function."""

        # Get character names for matching
        char_names = [c.name.lower() for c in characters]
        protagonist = next((c for c in characters if c.role == "protagonist"), None)
        antagonist = next((c for c in characters if c.role == "antagonist"), None)

        categorized = []

        for i, d in enumerate(dialogues):
            text = d.get("text", "").strip()
            if not text or len(text) < 5:
                continue

            # Detect properties
            is_question = "?" in text or text.lower().startswith(("kya", "kaun", "kaise", "kyun", "what", "who", "how", "why"))
            contains_name = any(name in text.lower() for name in char_names if name != "protagonist")

            # Categorize
            category = self._determine_category(text, is_question, characters, i, len(dialogues))

            # Emotional weight
            emotional_weight = self._calculate_emotional_weight(text, category)

            # Identify speaker
            speaker = self._identify_speaker(text, characters)

            categorized.append(CategorizedDialogue(
                index=i,
                text=text,
                start_time=d.get("start_time", 0),
                end_time=d.get("end_time", 0),
                speaker=speaker,
                category=category,
                emotional_weight=emotional_weight,
                is_question=is_question,
                contains_name=contains_name
            ))

        return categorized

    def _determine_category(
        self,
        text: str,
        is_question: bool,
        characters: List[MappedCharacter],
        index: int,
        total: int
    ) -> DialogueCategory:
        """Determine the narrative category of a dialogue."""
        text_lower = text.lower()

        # Position-based hints
        position_ratio = index / total if total > 0 else 0
        is_early = position_ratio < 0.25
        is_late = position_ratio > 0.85

        # Self-introduction patterns
        if re.search(r'\b(main|mera naam|my name)\b.*\b(hoon|hai|is)\b', text_lower):
            # Check if it's antagonist or protagonist intro
            antagonist = next((c for c in characters if c.role == "antagonist"), None)
            if antagonist and antagonist.name.lower() in text_lower:
                return DialogueCategory.ANTAGONIST_INTRO
            return DialogueCategory.INTRO_SELF

        # Hook questions
        if is_question:
            hook_patterns = ["kya", "kaun", "kyun", "kaise", "what if", "can", "will"]
            if any(p in text_lower for p in hook_patterns):
                if is_late:
                    return DialogueCategory.CLIFFHANGER
                return DialogueCategory.HOOK_QUESTION

        # Threat/opposition patterns
        threat_patterns = ["jail", "crime", "arrest", "expose", "destroy", "kill", "maar", "khatam"]
        if any(p in text_lower for p in threat_patterns):
            return DialogueCategory.ANTAGONIST_THREAT

        # Support patterns
        support_patterns = ["saath", "madad", "support", "believe", "vishwas", "help", "jaan bacha"]
        if any(p in text_lower for p in support_patterns):
            return DialogueCategory.ALLY_SUPPORT

        # World/setting patterns
        setting_patterns = ["gaon", "sheher", "village", "city", "hospital", "door hai", "yahan"]
        if any(p in text_lower for p in setting_patterns) and is_early:
            return DialogueCategory.WORLD_SETTING

        # Emotional vulnerability
        vulnerability_patterns = ["main jhootha", "galat", "nahi kar sakta", "dar", "afraid", "can't"]
        if any(p in text_lower for p in vulnerability_patterns):
            return DialogueCategory.EMOTIONAL_VULNERABLE

        # Emotional strength
        strength_patterns = ["dil hai", "kar sakta", "bachaunga", "will", "must", "hoga"]
        if any(p in text_lower for p in strength_patterns):
            return DialogueCategory.EMOTIONAL_STRENGTH

        # Escalation patterns
        escalation_patterns = ["khatre", "danger", "jaldi", "urgent", "bach", "mar", "die"]
        if any(p in text_lower for p in escalation_patterns):
            return DialogueCategory.ESCALATION

        # Desire patterns
        desire_patterns = ["chahta", "want", "karna hai", "must", "zaroori"]
        if any(p in text_lower for p in desire_patterns) and is_early:
            return DialogueCategory.INTRO_DESIRE

        return DialogueCategory.GENERIC

    def _calculate_emotional_weight(self, text: str, category: DialogueCategory) -> int:
        """Calculate emotional weight of a dialogue (1-10)."""
        weight = 5  # Base weight

        # Category bonuses
        category_weights = {
            DialogueCategory.EMOTIONAL_VULNERABLE: 9,
            DialogueCategory.EMOTIONAL_STRENGTH: 8,
            DialogueCategory.CLIFFHANGER: 9,
            DialogueCategory.HOOK_QUESTION: 8,
            DialogueCategory.ANTAGONIST_THREAT: 7,
            DialogueCategory.INTRO_SELF: 7,
            DialogueCategory.ESCALATION: 7,
        }
        weight = category_weights.get(category, weight)

        # Exclamation marks increase weight
        weight += min(text.count("!"), 2)

        # Longer dialogues might be more impactful
        if len(text) > 50:
            weight += 1

        return min(weight, 10)

    def _identify_speaker(self, text: str, characters: List[MappedCharacter]) -> str:
        """Try to identify who is speaking this dialogue."""
        text_lower = text.lower()

        for char in characters:
            # Check if character name is mentioned as speaker
            if f"main {char.name.lower()}" in text_lower:
                return char.name
            # Check if it matches their introduction
            if char.introduction_dialogue and text[:30] in char.introduction_dialogue[:30]:
                return char.name

        return "Unknown"

    def _build_hero_journey_variant(
        self,
        categorized: List[CategorizedDialogue],
        characters: List[MappedCharacter],
        protagonist: Optional[MappedCharacter],
        antagonist: Optional[MappedCharacter],
        allies: List[MappedCharacter],
        target_duration: int,
        metadata: Dict
    ) -> Optional[TrailerVariant]:
        """Build Hero's Journey variant: Character → Desire → Obstacle → Struggle → Hope."""

        sequence = []

        # 1. HOOK (5-8s) - Start with intriguing question or statement
        hooks = [d for d in categorized if d.category in [
            DialogueCategory.HOOK_QUESTION,
            DialogueCategory.CLIFFHANGER
        ]]
        hook_dialogue = max(hooks, key=lambda d: d.emotional_weight) if hooks else None

        if hook_dialogue:
            sequence.append({
                "phase": "hook",
                "dialogue": hook_dialogue.text,
                "speaker": hook_dialogue.speaker,
                "timestamp": hook_dialogue.start_time,
                "duration": 6
            })

        # 2. WORLD SETUP (8-10s)
        world = [d for d in categorized if d.category == DialogueCategory.WORLD_SETTING]
        if world:
            sequence.append({
                "phase": "world",
                "dialogue": world[0].text,
                "speaker": world[0].speaker,
                "timestamp": world[0].start_time,
                "duration": 8
            })

        # 3. PROTAGONIST INTRO (10-15s) - CRITICAL: Must have name
        intro_self = [d for d in categorized if d.category == DialogueCategory.INTRO_SELF]
        if intro_self:
            best_intro = intro_self[0]
            sequence.append({
                "phase": "protagonist_intro",
                "dialogue": best_intro.text,
                "speaker": protagonist.name if protagonist else "Protagonist",
                "timestamp": best_intro.start_time,
                "duration": 10
            })
        elif protagonist:
            # Use protagonist's introduction dialogue
            sequence.append({
                "phase": "protagonist_intro",
                "dialogue": protagonist.introduction_dialogue,
                "speaker": protagonist.name,
                "timestamp": protagonist.introduction_timestamp,
                "duration": 10
            })

        # 4. DESIRE (6-8s) - What protagonist wants
        desire = [d for d in categorized if d.category == DialogueCategory.INTRO_DESIRE]
        if desire:
            sequence.append({
                "phase": "desire",
                "dialogue": desire[0].text,
                "speaker": protagonist.name if protagonist else "Protagonist",
                "timestamp": desire[0].start_time,
                "duration": 7
            })

        # 5. ALLY SUPPORT (8-10s)
        ally_support = [d for d in categorized if d.category == DialogueCategory.ALLY_SUPPORT]
        if ally_support:
            best_ally = max(ally_support, key=lambda d: d.emotional_weight)
            sequence.append({
                "phase": "ally_support",
                "dialogue": best_ally.text,
                "speaker": best_ally.speaker if best_ally.speaker != "Unknown" else (allies[0].name if allies else "Ally"),
                "timestamp": best_ally.start_time,
                "duration": 8
            })

        # 6. ANTAGONIST/CONFLICT (10-12s)
        antagonist_dialogues = [d for d in categorized if d.category in [
            DialogueCategory.ANTAGONIST_INTRO,
            DialogueCategory.ANTAGONIST_THREAT
        ]]
        if antagonist_dialogues:
            for ant_d in antagonist_dialogues[:2]:
                sequence.append({
                    "phase": "conflict",
                    "dialogue": ant_d.text,
                    "speaker": antagonist.name if antagonist else "Antagonist",
                    "timestamp": ant_d.start_time,
                    "duration": 6
                })

        # 7. ESCALATION (10-15s)
        escalation = [d for d in categorized if d.category == DialogueCategory.ESCALATION]
        if escalation:
            for esc in escalation[:2]:
                sequence.append({
                    "phase": "escalation",
                    "dialogue": esc.text,
                    "speaker": esc.speaker,
                    "timestamp": esc.start_time,
                    "duration": 6
                })

        # 8. EMOTIONAL PEAK (8-10s)
        emotional = [d for d in categorized if d.category in [
            DialogueCategory.EMOTIONAL_VULNERABLE,
            DialogueCategory.EMOTIONAL_STRENGTH
        ]]
        if emotional:
            best_emotional = max(emotional, key=lambda d: d.emotional_weight)
            sequence.append({
                "phase": "emotional_peak",
                "dialogue": best_emotional.text,
                "speaker": protagonist.name if protagonist else "Protagonist",
                "timestamp": best_emotional.start_time,
                "duration": 10
            })

        # 9. CLIFFHANGER (6-8s)
        cliffhangers = [d for d in categorized if d.category == DialogueCategory.CLIFFHANGER]
        if cliffhangers:
            best_cliff = max(cliffhangers, key=lambda d: d.emotional_weight)
            sequence.append({
                "phase": "cliffhanger",
                "dialogue": best_cliff.text,
                "speaker": best_cliff.speaker,
                "timestamp": best_cliff.start_time,
                "duration": 7
            })
        elif hook_dialogue:
            # Reuse hook as cliffhanger
            sequence.append({
                "phase": "cliffhanger",
                "dialogue": hook_dialogue.text,
                "speaker": hook_dialogue.speaker,
                "timestamp": hook_dialogue.start_time,
                "duration": 7
            })

        # Calculate totals
        total_duration = sum(s.get("duration", 5) for s in sequence)

        # Extract key elements
        hook_text = sequence[0]["dialogue"] if sequence else ""
        world_text = next((s["dialogue"] for s in sequence if s["phase"] == "world"), "")
        conflict_text = next((s["dialogue"] for s in sequence if s["phase"] == "conflict"), "")
        emotional_text = next((s["dialogue"] for s in sequence if s["phase"] == "emotional_peak"), "")
        cliff_text = sequence[-1]["dialogue"] if sequence else ""

        return TrailerVariant(
            variant_type="hero_journey",
            variant_name="Hero's Journey",
            description="Character-centric narrative: Introduction → Desire → Obstacles → Struggle → Hope",
            protagonist_name=protagonist.name if protagonist else "Unknown",
            protagonist_intro_dialogue=protagonist.introduction_dialogue if protagonist else "",
            antagonist_name=antagonist.name if antagonist else None,
            allies=[a.name for a in allies],
            sequence=sequence,
            hook=hook_text,
            world_setup=world_text,
            conflict=conflict_text,
            emotional_peak=emotional_text,
            cliffhanger=cliff_text,
            coherence_score=0,  # Will be calculated
            emotional_impact=0,
            hook_strength=0,
            total_duration=total_duration
        )

    def _build_mystery_variant(
        self,
        categorized: List[CategorizedDialogue],
        characters: List[MappedCharacter],
        protagonist: Optional[MappedCharacter],
        antagonist: Optional[MappedCharacter],
        allies: List[MappedCharacter],
        target_duration: int,
        metadata: Dict
    ) -> Optional[TrailerVariant]:
        """Build Mystery variant: Question → Hints → Revelation → Bigger Question."""

        sequence = []

        # 1. START WITH QUESTION (hook)
        questions = [d for d in categorized if d.is_question and d.emotional_weight >= 7]
        if not questions:
            questions = [d for d in categorized if d.is_question]

        if questions:
            best_q = max(questions, key=lambda d: d.emotional_weight)
            sequence.append({
                "phase": "opening_question",
                "dialogue": best_q.text,
                "speaker": best_q.speaker,
                "timestamp": best_q.start_time,
                "duration": 6
            })

        # 2. HINT AT CHARACTER (without full intro)
        world = [d for d in categorized if d.category == DialogueCategory.WORLD_SETTING]
        if world:
            sequence.append({
                "phase": "hint_world",
                "dialogue": world[0].text,
                "speaker": world[0].speaker,
                "timestamp": world[0].start_time,
                "duration": 7
            })

        # 3. PROTAGONIST GLIMPSE
        if protagonist:
            sequence.append({
                "phase": "protagonist_glimpse",
                "dialogue": protagonist.introduction_dialogue,
                "speaker": protagonist.name,
                "timestamp": protagonist.introduction_timestamp,
                "duration": 8
            })

        # 4. MYSTERY ELEMENTS - Things that raise questions
        threats = [d for d in categorized if d.category == DialogueCategory.ANTAGONIST_THREAT]
        for t in threats[:2]:
            sequence.append({
                "phase": "mystery_hint",
                "dialogue": t.text,
                "speaker": t.speaker,
                "timestamp": t.start_time,
                "duration": 5
            })

        # 5. ESCALATION
        escalation = [d for d in categorized if d.category == DialogueCategory.ESCALATION]
        for e in escalation[:2]:
            sequence.append({
                "phase": "tension",
                "dialogue": e.text,
                "speaker": e.speaker,
                "timestamp": e.start_time,
                "duration": 5
            })

        # 6. EMOTIONAL REVELATION
        emotional = [d for d in categorized if d.category in [
            DialogueCategory.EMOTIONAL_VULNERABLE,
            DialogueCategory.EMOTIONAL_STRENGTH
        ]]
        if emotional:
            sequence.append({
                "phase": "revelation",
                "dialogue": emotional[0].text,
                "speaker": protagonist.name if protagonist else "Unknown",
                "timestamp": emotional[0].start_time,
                "duration": 8
            })

        # 7. END WITH BIGGER QUESTION
        cliffhangers = [d for d in categorized if d.category == DialogueCategory.CLIFFHANGER]
        if cliffhangers:
            sequence.append({
                "phase": "final_question",
                "dialogue": cliffhangers[0].text,
                "speaker": cliffhangers[0].speaker,
                "timestamp": cliffhangers[0].start_time,
                "duration": 7
            })

        total_duration = sum(s.get("duration", 5) for s in sequence)

        return TrailerVariant(
            variant_type="mystery",
            variant_name="Mystery/Question-Led",
            description="Curiosity-driven: Opens with question, reveals hints, ends with bigger question",
            protagonist_name=protagonist.name if protagonist else "Unknown",
            protagonist_intro_dialogue=protagonist.introduction_dialogue if protagonist else "",
            antagonist_name=antagonist.name if antagonist else None,
            allies=[a.name for a in allies],
            sequence=sequence,
            hook=sequence[0]["dialogue"] if sequence else "",
            world_setup=next((s["dialogue"] for s in sequence if s["phase"] == "hint_world"), ""),
            conflict=next((s["dialogue"] for s in sequence if s["phase"] == "mystery_hint"), ""),
            emotional_peak=next((s["dialogue"] for s in sequence if s["phase"] == "revelation"), ""),
            cliffhanger=sequence[-1]["dialogue"] if sequence else "",
            coherence_score=0,
            emotional_impact=0,
            hook_strength=0,
            total_duration=total_duration
        )

    def _build_conflict_variant(
        self,
        categorized: List[CategorizedDialogue],
        characters: List[MappedCharacter],
        protagonist: Optional[MappedCharacter],
        antagonist: Optional[MappedCharacter],
        allies: List[MappedCharacter],
        target_duration: int,
        metadata: Dict
    ) -> Optional[TrailerVariant]:
        """Build Conflict variant: Two Forces → Clash → Stakes → Unresolved."""

        sequence = []

        # 1. ANTAGONIST HOOK - Start with threat
        threats = [d for d in categorized if d.category in [
            DialogueCategory.ANTAGONIST_INTRO,
            DialogueCategory.ANTAGONIST_THREAT
        ]]
        if threats:
            sequence.append({
                "phase": "antagonist_hook",
                "dialogue": threats[0].text,
                "speaker": antagonist.name if antagonist else "Antagonist",
                "timestamp": threats[0].start_time,
                "duration": 6
            })

        # 2. PROTAGONIST RESPONSE
        if protagonist:
            sequence.append({
                "phase": "protagonist_stance",
                "dialogue": protagonist.introduction_dialogue,
                "speaker": protagonist.name,
                "timestamp": protagonist.introduction_timestamp,
                "duration": 8
            })

        # 3. ALLIES TAKING SIDES
        ally_support = [d for d in categorized if d.category == DialogueCategory.ALLY_SUPPORT]
        if ally_support:
            sequence.append({
                "phase": "ally_stance",
                "dialogue": ally_support[0].text,
                "speaker": allies[0].name if allies else "Ally",
                "timestamp": ally_support[0].start_time,
                "duration": 7
            })

        # 4. CLASH - Back and forth
        for t in threats[1:3]:
            sequence.append({
                "phase": "clash",
                "dialogue": t.text,
                "speaker": antagonist.name if antagonist else "Antagonist",
                "timestamp": t.start_time,
                "duration": 5
            })

        # 5. PROTAGONIST STRENGTH
        strength = [d for d in categorized if d.category == DialogueCategory.EMOTIONAL_STRENGTH]
        if strength:
            sequence.append({
                "phase": "protagonist_strength",
                "dialogue": strength[0].text,
                "speaker": protagonist.name if protagonist else "Protagonist",
                "timestamp": strength[0].start_time,
                "duration": 8
            })

        # 6. STAKES
        escalation = [d for d in categorized if d.category == DialogueCategory.ESCALATION]
        if escalation:
            sequence.append({
                "phase": "stakes",
                "dialogue": escalation[0].text,
                "speaker": escalation[0].speaker,
                "timestamp": escalation[0].start_time,
                "duration": 6
            })

        # 7. UNRESOLVED ENDING
        cliffhangers = [d for d in categorized if d.category == DialogueCategory.CLIFFHANGER]
        if cliffhangers:
            sequence.append({
                "phase": "unresolved",
                "dialogue": cliffhangers[0].text,
                "speaker": cliffhangers[0].speaker,
                "timestamp": cliffhangers[0].start_time,
                "duration": 7
            })

        total_duration = sum(s.get("duration", 5) for s in sequence)

        return TrailerVariant(
            variant_type="conflict",
            variant_name="Conflict-Centric",
            description="Drama-focused: Two forces clash, stakes rise, resolution unknown",
            protagonist_name=protagonist.name if protagonist else "Unknown",
            protagonist_intro_dialogue=protagonist.introduction_dialogue if protagonist else "",
            antagonist_name=antagonist.name if antagonist else None,
            allies=[a.name for a in allies],
            sequence=sequence,
            hook=sequence[0]["dialogue"] if sequence else "",
            world_setup="",
            conflict=next((s["dialogue"] for s in sequence if s["phase"] == "clash"), ""),
            emotional_peak=next((s["dialogue"] for s in sequence if s["phase"] == "protagonist_strength"), ""),
            cliffhanger=sequence[-1]["dialogue"] if sequence else "",
            coherence_score=0,
            emotional_impact=0,
            hook_strength=0,
            total_duration=total_duration
        )

    def _score_variants(self, variants: List[TrailerVariant]) -> List[TrailerVariant]:
        """Score each variant for quality metrics."""
        for v in variants:
            # Coherence: Does it have all key elements?
            coherence = 0
            if v.protagonist_name and v.protagonist_name != "Unknown":
                coherence += 25
            if v.protagonist_intro_dialogue:
                coherence += 15
            if v.antagonist_name:
                coherence += 15
            if v.hook:
                coherence += 15
            if v.cliffhanger:
                coherence += 15
            if len(v.sequence) >= 6:
                coherence += 15
            v.coherence_score = min(coherence, 100)

            # Emotional impact: Based on emotional dialogues
            emotional_phases = ["emotional_peak", "revelation", "protagonist_strength"]
            has_emotional = any(s["phase"] in emotional_phases for s in v.sequence)
            v.emotional_impact = 80 if has_emotional else 40

            # Hook strength: Is hook a question? Is it intriguing?
            if v.hook:
                v.hook_strength = 85 if "?" in v.hook else 60
            else:
                v.hook_strength = 0

        return variants

    def print_variant(self, variant: TrailerVariant):
        """Print a detailed view of a trailer variant."""
        print("\n" + "=" * 70)
        print(f"🎬 VARIANT: {variant.variant_name}")
        print(f"   Type: {variant.variant_type}")
        print(f"   {variant.description}")
        print("=" * 70)

        print(f"\n👤 PROTAGONIST: {variant.protagonist_name}")
        if variant.protagonist_intro_dialogue:
            intro = variant.protagonist_intro_dialogue[:60] + "..." if len(variant.protagonist_intro_dialogue) > 60 else variant.protagonist_intro_dialogue
            print(f"   Intro: \"{intro}\"")

        if variant.antagonist_name:
            print(f"\n👿 ANTAGONIST: {variant.antagonist_name}")

        if variant.allies:
            print(f"\n🤝 ALLIES: {', '.join(variant.allies)}")

        print(f"\n📋 SEQUENCE ({len(variant.sequence)} scenes, {variant.total_duration:.0f}s):")
        print("-" * 70)

        for i, scene in enumerate(variant.sequence, 1):
            phase = scene.get("phase", "").upper().replace("_", " ")
            speaker = scene.get("speaker", "Unknown")
            dialogue = scene.get("dialogue", "")
            duration = scene.get("duration", 5)

            # Truncate dialogue for display
            if len(dialogue) > 55:
                dialogue = dialogue[:55] + "..."

            print(f"\n{i}. [{phase}] ({duration}s)")
            print(f"   🗣️  {speaker}")
            print(f"   💬 \"{dialogue}\"")

        print("\n" + "-" * 70)
        print("\n📊 QUALITY SCORES:")
        print(f"   Coherence:    {variant.coherence_score}/100")
        print(f"   Emotional:    {variant.emotional_impact}/100")
        print(f"   Hook:         {variant.hook_strength}/100")

        print("\n🎯 KEY ELEMENTS:")
        if variant.hook:
            print(f"   Hook: \"{variant.hook[:50]}...\"" if len(variant.hook) > 50 else f"   Hook: \"{variant.hook}\"")
        if variant.cliffhanger:
            print(f"   Cliffhanger: \"{variant.cliffhanger[:50]}...\"" if len(variant.cliffhanger) > 50 else f"   Cliffhanger: \"{variant.cliffhanger}\"")

        print("=" * 70)


def build_character_trailers(
    dialogues: List[Dict],
    metadata: Optional[Dict] = None,
    target_duration: int = 90,
    num_variants: int = 3,
    hf_model: str = "qwen2.5-1.5b"
) -> List[TrailerVariant]:
    """Convenience function to build character-centric trailers.

    Args:
        dialogues: List of dialogue dicts
        metadata: Movie metadata
        target_duration: Target trailer duration
        num_variants: Number of variants to generate
        hf_model: HuggingFace model to use

    Returns:
        List of TrailerVariant objects
    """
    builder = CharacterTrailerBuilder(hf_model=hf_model)
    return builder.build_trailers(
        dialogues=dialogues,
        metadata=metadata,
        target_duration=target_duration,
        num_variants=num_variants
    )
