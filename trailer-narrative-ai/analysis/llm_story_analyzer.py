"""LLM-Based Story Analyzer for Trailer Generation.

Analyzes full movie dialogues to understand:
- Complete story arc and plot structure
- Character identification (protagonist, antagonist, supporting)
- Key emotional beats and conflict points
- Best dialogue hooks and questions
- Scene categorization for trailer building

Uses HuggingFace transformers models - NO paid APIs or external services required.
Models are auto-downloaded on first run.

Supported Models:
    - google/flan-t5-large (default) - Fast, good quality, ~3GB
    - google/flan-t5-xl - Better quality, ~12GB
    - ai4bharat/IndicBARTSS - Specialized for Indian languages

Environment Variables:
    LLM_MODEL       - Model to use (default: google/flan-t5-large)
    USE_LLM         - "true"/"false" to enable/disable LLM analysis
    LLM_DEVICE      - Device to use: "auto", "cuda", "mps", "cpu"
"""

import json
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from loguru import logger

from config.constants import USE_LLM, LLM_MODEL, LLM_DEVICE


class CharacterRole(Enum):
    """Character roles in the story."""
    PROTAGONIST = "protagonist"
    ANTAGONIST = "antagonist"
    SUPPORTING = "supporting"
    LOVE_INTEREST = "love_interest"
    MENTOR = "mentor"
    COMIC_RELIEF = "comic_relief"


class PlotBeat(Enum):
    """Story plot beats for trailer structure."""
    OPENING = "opening"              # World/setting establishment
    CHARACTER_INTRO = "character_intro"  # Main character introduction
    INCITING_INCIDENT = "inciting_incident"  # What starts the story
    RISING_ACTION = "rising_action"  # Conflict building
    MIDPOINT = "midpoint"            # Major revelation or turn
    CRISIS = "crisis"                # Darkest moment
    CLIMAX_TEASE = "climax_tease"    # Hint at final conflict
    HOOK_QUESTION = "hook_question"  # Unanswered question for curiosity


@dataclass
class Character:
    """Identified character from dialogue analysis."""
    name: Optional[str]
    role: CharacterRole
    first_appearance_time: float
    dialogue_count: int
    key_dialogues: List[str]
    emotional_moments: List[str]
    description: str
    arc_summary: str


@dataclass
class PlotPoint:
    """A significant plot point identified from dialogues."""
    beat: PlotBeat
    timestamp: float
    dialogue: str
    scene_id: str
    emotional_intensity: int  # 0-100
    is_spoiler: bool
    description: str


@dataclass
class StoryAnalysis:
    """Complete story analysis from movie dialogues."""
    title: str
    genre: str
    primary_emotion: str  # dramatic, action, romantic, thriller, comedy

    # Characters
    characters: List[Character]
    protagonist: Optional[Character]
    antagonist: Optional[Character]

    # Plot structure
    plot_points: List[PlotPoint]
    story_summary: str
    conflict_description: str

    # Trailer elements
    best_hooks: List[Dict[str, Any]]  # Best dialogue hooks
    best_questions: List[Dict[str, Any]]  # Questions that create curiosity
    emotional_peaks: List[Dict[str, Any]]  # High emotional moments
    action_peaks: List[Dict[str, Any]]  # High action moments

    # Variant recommendations
    recommended_variants: List[str]  # e.g., ["emotional", "action", "mystery"]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "genre": self.genre,
            "primary_emotion": self.primary_emotion,
            "characters": [
                {
                    "name": c.name,
                    "role": c.role.value,
                    "first_appearance": c.first_appearance_time,
                    "dialogue_count": c.dialogue_count,
                    "key_dialogues": c.key_dialogues[:3],
                    "description": c.description
                }
                for c in self.characters
            ],
            "protagonist": self.protagonist.name if self.protagonist else None,
            "antagonist": self.antagonist.name if self.antagonist else None,
            "story_summary": self.story_summary,
            "conflict": self.conflict_description,
            "plot_points": [
                {
                    "beat": p.beat.value,
                    "timestamp": p.timestamp,
                    "dialogue": p.dialogue[:100],
                    "intensity": p.emotional_intensity
                }
                for p in self.plot_points if not p.is_spoiler
            ],
            "best_hooks": self.best_hooks[:5],
            "best_questions": self.best_questions[:5],
            "recommended_variants": self.recommended_variants
        }


class LLMStoryAnalyzer:
    """Analyzes movie story using LLM for intelligent trailer generation.

    Uses HuggingFace transformers models (auto-downloaded on first run).
    Falls back to rule-based analysis if LLM loading fails.
    """

    # Default configuration
    DEFAULT_MODEL = "google/flan-t5-large"

    # Emotional/power words for analysis
    EMOTION_WORDS = {
        "love": ["pyaar", "mohabbat", "ishq", "prem", "dil", "love", "heart"],
        "anger": ["gussa", "krodh", "nafrat", "hate", "angry", "rage"],
        "fear": ["dar", "khauf", "bhay", "scared", "fear", "afraid"],
        "sadness": ["dukh", "gham", "udaas", "sad", "cry", "tears", "rona"],
        "joy": ["khushi", "anand", "happy", "celebration", "smile"],
        "tension": ["khatre", "danger", "jung", "ladai", "fight", "kill"]
    }

    # Question patterns (create curiosity)
    QUESTION_PATTERNS = [
        r'\?',  # Explicit question mark
        r'\bkya\b', r'\bkaun\b', r'\bkyun\b', r'\bkaise\b', r'\bkab\b',
        r'\bkai\b', r'\bka\b', r'\bkem\b', r'\bshu\b',  # Dialect questions
        r'\bwho\b', r'\bwhat\b', r'\bwhy\b', r'\bhow\b', r'\bwhen\b'
    ]

    # Spoiler patterns (avoid in trailer)
    SPOILER_PATTERNS = [
        r'mar gaya', r'mar gya', r'died', r'dead', r'killed',
        r'sach yeh hai', r'truth is', r'finally', r'the end',
        r'jeet gaye', r'haar gaye', r'won', r'lost',
        r'revealed', r'answer', r'solution'
    ]

    def __init__(self, use_llm: bool = True, model_name: str = None):
        """Initialize story analyzer.

        Args:
            use_llm: Try to use LLM for analysis
            model_name: HuggingFace model name

        Environment Variables:
            LLM_MODEL: Model to use
            LLM_DEVICE: Device for inference ("auto", "cuda", "mps", "cpu")
            USE_LLM: "true"/"false" to enable/disable
        """
        self.use_llm = use_llm and USE_LLM
        self.model_name = model_name or LLM_MODEL
        self.device = LLM_DEVICE

        self._model = None
        self._tokenizer = None
        self._model_loaded = False

        logger.info(f"LLMStoryAnalyzer initialized")
        logger.info(f"  Model: {self.model_name}, Device: {self.device}, Use LLM: {self.use_llm}")

    def _load_model(self) -> bool:
        """Load the LLM model from HuggingFace."""
        if self._model_loaded:
            return True

        if not self.use_llm:
            return False

        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            logger.info(f"Loading LLM model: {self.model_name}")
            logger.info("(First run will download ~3GB, subsequent runs use cache)")

            # Determine device
            if self.device == "auto":
                if torch.cuda.is_available():
                    device = "cuda"
                elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                    device = "mps"
                else:
                    device = "cpu"
            else:
                device = self.device

            logger.info(f"Using device: {device}")

            # Load tokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            # Load model with appropriate settings
            if device == "cuda":
                self._model = AutoModelForSeq2SeqLM.from_pretrained(
                    self.model_name,
                    device_map="auto",
                    torch_dtype=torch.float16
                )
            elif device == "mps":
                self._model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
                self._model = self._model.to(device)
            else:
                self._model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)

            self._model.eval()
            self._model_loaded = True
            logger.info(f"LLM model loaded successfully on {device}")
            return True

        except ImportError as e:
            logger.warning(f"Transformers not available: {e}")
            logger.info("Install with: pip install transformers accelerate")
            return False
        except Exception as e:
            logger.warning(f"Failed to load LLM model: {e}")
            logger.info("Will use rule-based analysis instead")
            return False

    def _generate_text(self, prompt: str, max_length: int = 512) -> Optional[str]:
        """Generate text using the LLM."""
        if not self._load_model():
            return None

        try:
            import torch

            inputs = self._tokenizer(
                prompt,
                return_tensors="pt",
                max_length=1024,
                truncation=True
            )

            # Move to same device as model
            if hasattr(self._model, "device"):
                inputs = {k: v.to(self._model.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self._model.generate(
                    **inputs,
                    max_length=max_length,
                    num_beams=4,
                    early_stopping=True,
                    no_repeat_ngram_size=3
                )

            response = self._tokenizer.decode(outputs[0], skip_special_tokens=True)
            return response

        except Exception as e:
            logger.warning(f"Text generation failed: {e}")
            return None

    def analyze_story(
        self,
        segments: List[Dict[str, Any]],
        scenes: List[Dict[str, Any]],
        video_duration: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> StoryAnalysis:
        """Analyze full movie story from dialogues and scenes.

        Args:
            segments: Transcribed dialogue segments with timestamps
            scenes: Detected scenes with visual analysis
            video_duration: Total video duration in seconds
            metadata: Optional content metadata (title, genre, etc.)

        Returns:
            Complete StoryAnalysis
        """
        metadata = metadata or {}
        title = metadata.get("title", "Untitled")

        logger.info(f"Analyzing story: {len(segments)} dialogue segments, {len(scenes)} scenes")

        # Step 1: Build full dialogue text with timestamps
        full_dialogue = self._build_dialogue_text(segments)

        # Step 2: Try LLM analysis first, fall back to rule-based
        if self.use_llm and self._load_model():
            analysis = self._analyze_with_llm(full_dialogue, segments, scenes, video_duration, metadata)
        else:
            analysis = self._analyze_rule_based(full_dialogue, segments, scenes, video_duration, metadata)

        # Step 3: Identify best trailer elements
        analysis = self._identify_trailer_elements(analysis, segments, scenes, video_duration)

        # Step 4: Recommend variants based on content
        analysis.recommended_variants = self._recommend_variants(analysis)

        logger.info(f"Story analysis complete: {len(analysis.characters)} characters, "
                   f"{len(analysis.plot_points)} plot points, "
                   f"variants: {analysis.recommended_variants}")

        return analysis

    def _build_dialogue_text(self, segments: List[Dict]) -> str:
        """Build formatted dialogue text for analysis."""
        lines = []
        for seg in segments:
            time = seg.get("start_time", 0)
            text = seg.get("text", "").strip()
            if text:
                minutes = int(time // 60)
                lines.append(f"[{minutes}m] {text}")
        return "\n".join(lines)

    def _analyze_with_llm(
        self,
        full_dialogue: str,
        segments: List[Dict],
        scenes: List[Dict],
        video_duration: float,
        metadata: Dict
    ) -> StoryAnalysis:
        """Analyze story using LLM."""
        logger.info("Using LLM for story analysis...")

        # Truncate dialogue if too long (keep first 30%, middle 20%, last 30%)
        lines = full_dialogue.split("\n")
        if len(lines) > 150:
            n = len(lines)
            truncated = lines[:int(n*0.3)] + ["..."] + lines[int(n*0.4):int(n*0.6)] + ["..."] + lines[int(n*0.7):]
            full_dialogue = "\n".join(truncated)

        # Limit to ~4000 chars for model input
        if len(full_dialogue) > 4000:
            full_dialogue = full_dialogue[:4000]

        # Analyze characters
        characters_result = self._analyze_characters_llm(full_dialogue, metadata)

        # Analyze plot
        plot_result = self._analyze_plot_llm(full_dialogue, metadata)

        # Analyze hooks
        hooks_result = self._analyze_hooks_llm(full_dialogue, metadata)

        # Build analysis from results
        characters = []
        protagonist = None
        antagonist = None

        for char_data in characters_result:
            role_str = char_data.get("role", "supporting").lower()
            if "protag" in role_str or "hero" in role_str or "main" in role_str:
                role = CharacterRole.PROTAGONIST
            elif "antag" in role_str or "villain" in role_str:
                role = CharacterRole.ANTAGONIST
            elif "love" in role_str:
                role = CharacterRole.LOVE_INTEREST
            else:
                role = CharacterRole.SUPPORTING

            char = Character(
                name=char_data.get("name"),
                role=role,
                first_appearance_time=0,
                dialogue_count=0,
                key_dialogues=[],
                emotional_moments=[],
                description=char_data.get("description", ""),
                arc_summary=""
            )
            characters.append(char)

            if role == CharacterRole.PROTAGONIST and protagonist is None:
                protagonist = char
            elif role == CharacterRole.ANTAGONIST and antagonist is None:
                antagonist = char

        # Build hooks and questions
        best_hooks = [{"dialogue": h, "score": 100 - i*10} for i, h in enumerate(hooks_result.get("hooks", []))]
        best_questions = [{"dialogue": q, "score": 100 - i*10} for i, q in enumerate(hooks_result.get("questions", []))]

        return StoryAnalysis(
            title=metadata.get("title", "Untitled"),
            genre=plot_result.get("genre", metadata.get("genre", "drama")),
            primary_emotion=plot_result.get("emotion", "dramatic"),
            characters=characters,
            protagonist=protagonist,
            antagonist=antagonist,
            plot_points=[],
            story_summary=plot_result.get("summary", ""),
            conflict_description=plot_result.get("conflict", ""),
            best_hooks=best_hooks,
            best_questions=best_questions,
            emotional_peaks=[],
            action_peaks=[],
            recommended_variants=[]
        )

    def _analyze_characters_llm(self, dialogue: str, metadata: Dict) -> List[Dict]:
        """Extract characters using LLM."""
        prompt = f"""Analyze the movie dialogue and identify the main characters.

Movie: {metadata.get('title', 'Unknown')}
Genre: {metadata.get('genre', 'Unknown')}

Dialogue excerpts:
{dialogue[:2000]}

List the main characters with their roles (protagonist, antagonist, supporting).
Format: name - role - brief description
"""
        response = self._generate_text(prompt, max_length=256)

        if not response:
            return []

        # Parse response into character list
        characters = []
        for line in response.strip().split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            parts = line.split("-")
            if len(parts) >= 2:
                name = parts[0].strip()
                role = parts[1].strip().lower() if len(parts) > 1 else "supporting"
                desc = parts[2].strip() if len(parts) > 2 else ""

                characters.append({
                    "name": name,
                    "role": role,
                    "description": desc
                })

        return characters[:5]  # Max 5 characters

    def _analyze_plot_llm(self, dialogue: str, metadata: Dict) -> Dict:
        """Analyze plot using LLM."""
        prompt = f"""Analyze this movie dialogue and provide:
1. Genre (action, drama, thriller, romance, comedy)
2. Primary emotion (dramatic, intense, romantic, suspenseful, funny)
3. Brief story summary (2-3 sentences, no spoilers)
4. Main conflict

Movie: {metadata.get('title', 'Unknown')}

Dialogue:
{dialogue[:2000]}

Answer briefly:
"""
        response = self._generate_text(prompt, max_length=256)

        if not response:
            return {"genre": "drama", "emotion": "dramatic", "summary": "", "conflict": ""}

        result = {
            "genre": "drama",
            "emotion": "dramatic",
            "summary": "",
            "conflict": ""
        }

        # Parse response
        response_lower = response.lower()

        # Detect genre
        for genre in ["action", "thriller", "romance", "comedy", "drama"]:
            if genre in response_lower:
                result["genre"] = genre
                break

        # Detect emotion
        for emotion in ["intense", "romantic", "suspenseful", "funny", "dramatic"]:
            if emotion in response_lower:
                result["emotion"] = emotion
                break

        # Use full response as summary if structured parsing fails
        if len(response) > 20:
            result["summary"] = response[:200]

        return result

    def _analyze_hooks_llm(self, dialogue: str, metadata: Dict) -> Dict:
        """Extract trailer hooks using LLM."""
        prompt = f"""From this movie dialogue, select the 3 best lines for a trailer:
- Lines that create curiosity
- Emotional impact lines
- Questions that make viewers want to watch

Dialogue:
{dialogue[:2500]}

Best trailer lines (one per line):
"""
        response = self._generate_text(prompt, max_length=256)

        hooks = []
        questions = []

        if response:
            for line in response.strip().split("\n"):
                line = line.strip().strip("-").strip("*").strip()
                if not line or len(line) < 10:
                    continue

                if "?" in line:
                    questions.append(line)
                else:
                    hooks.append(line)

        return {"hooks": hooks[:5], "questions": questions[:5]}

    def _analyze_rule_based(
        self,
        full_dialogue: str,
        segments: List[Dict],
        scenes: List[Dict],
        video_duration: float,
        metadata: Dict
    ) -> StoryAnalysis:
        """Analyze story using rule-based heuristics."""
        logger.info("Using rule-based story analysis...")

        # Detect primary emotion/genre
        emotion_scores = self._score_emotions(full_dialogue)
        primary_emotion = max(emotion_scores, key=emotion_scores.get) if emotion_scores else "dramatic"

        # Detect genre from metadata or emotion
        genre = metadata.get("genre", "").lower()
        if not genre:
            if emotion_scores.get("tension", 0) > 30:
                genre = "thriller"
            elif emotion_scores.get("love", 0) > 30:
                genre = "romance"
            elif emotion_scores.get("joy", 0) > 30:
                genre = "comedy"
            else:
                genre = "drama"

        # Build character profiles from dialogue patterns
        characters = self._extract_characters_rule_based(segments, video_duration)
        protagonist = next((c for c in characters if c.role == CharacterRole.PROTAGONIST), None)
        antagonist = next((c for c in characters if c.role == CharacterRole.ANTAGONIST), None)

        # Extract plot points
        plot_points = self._extract_plot_points(segments, video_duration)

        return StoryAnalysis(
            title=metadata.get("title", "Untitled"),
            genre=genre,
            primary_emotion=primary_emotion,
            characters=characters,
            protagonist=protagonist,
            antagonist=antagonist,
            plot_points=plot_points,
            story_summary=f"A {genre} story with {primary_emotion} elements.",
            conflict_description="",
            best_hooks=[],
            best_questions=[],
            emotional_peaks=[],
            action_peaks=[],
            recommended_variants=[]
        )

    def _score_emotions(self, text: str) -> Dict[str, int]:
        """Score emotional content of text."""
        text_lower = text.lower()
        scores = {}

        for emotion, words in self.EMOTION_WORDS.items():
            score = 0
            for word in words:
                score += len(re.findall(rf'\b{word}\b', text_lower)) * 5
            scores[emotion] = min(100, score)

        return scores

    def _extract_characters_rule_based(
        self,
        segments: List[Dict],
        video_duration: float
    ) -> List[Character]:
        """Extract character profiles using rule-based analysis."""
        # Group dialogues by time position (early = protagonist, later = antagonist intro)
        early_dialogues = []
        mid_dialogues = []
        late_dialogues = []

        for seg in segments:
            time = seg.get("start_time", 0)
            text = seg.get("text", "")
            pos = time / video_duration if video_duration > 0 else 0.5

            if pos < 0.25:
                early_dialogues.append({"time": time, "text": text})
            elif pos < 0.6:
                mid_dialogues.append({"time": time, "text": text})
            else:
                late_dialogues.append({"time": time, "text": text})

        characters = []

        # Protagonist (appears early)
        if early_dialogues:
            protagonist = Character(
                name=None,
                role=CharacterRole.PROTAGONIST,
                first_appearance_time=early_dialogues[0]["time"],
                dialogue_count=len(early_dialogues),
                key_dialogues=[d["text"][:100] for d in early_dialogues[:5]],
                emotional_moments=[],
                description="Main character introduced early in the story",
                arc_summary="Protagonist's journey"
            )
            characters.append(protagonist)

        # Antagonist (appears mid-story with conflict)
        conflict_dialogues = [
            d for d in mid_dialogues
            if any(w in d["text"].lower() for w in ["maar", "kill", "hate", "nafrat", "fight", "ladai"])
        ]
        if conflict_dialogues:
            antagonist = Character(
                name=None,
                role=CharacterRole.ANTAGONIST,
                first_appearance_time=conflict_dialogues[0]["time"],
                dialogue_count=len(conflict_dialogues),
                key_dialogues=[d["text"][:100] for d in conflict_dialogues[:5]],
                emotional_moments=[],
                description="Antagonist or conflict source",
                arc_summary="Source of conflict"
            )
            characters.append(antagonist)

        return characters

    def _extract_plot_points(
        self,
        segments: List[Dict],
        video_duration: float
    ) -> List[PlotPoint]:
        """Extract key plot points from dialogues."""
        plot_points = []

        for seg in segments:
            time = seg.get("start_time", 0)
            text = seg.get("text", "").strip()
            pos = time / video_duration if video_duration > 0 else 0.5

            if not text or len(text) < 10:
                continue

            # Check for spoilers
            is_spoiler = any(re.search(p, text.lower()) for p in self.SPOILER_PATTERNS)

            # Determine beat based on position and content
            beat = None
            intensity = 50

            if pos < 0.1:
                beat = PlotBeat.OPENING
                intensity = 40
            elif pos < 0.2 and len(text) > 30:
                beat = PlotBeat.CHARACTER_INTRO
                intensity = 60
            elif 0.2 <= pos < 0.35:
                beat = PlotBeat.INCITING_INCIDENT
                intensity = 70
            elif 0.35 <= pos < 0.55:
                beat = PlotBeat.RISING_ACTION
                intensity = 75
            elif 0.55 <= pos < 0.7:
                beat = PlotBeat.MIDPOINT
                intensity = 80
            elif 0.7 <= pos < 0.85:
                beat = PlotBeat.CRISIS
                intensity = 90

            # Check if it's a question (good for hooks)
            is_question = any(re.search(p, text.lower()) for p in self.QUESTION_PATTERNS)
            if is_question and not is_spoiler:
                beat = PlotBeat.HOOK_QUESTION
                intensity = 95

            if beat:
                plot_points.append(PlotPoint(
                    beat=beat,
                    timestamp=time,
                    dialogue=text,
                    scene_id=seg.get("scene_id", ""),
                    emotional_intensity=intensity,
                    is_spoiler=is_spoiler,
                    description=f"{beat.value} at {int(time//60)}m"
                ))

        return plot_points

    def _identify_trailer_elements(
        self,
        analysis: StoryAnalysis,
        segments: List[Dict],
        scenes: List[Dict],
        video_duration: float
    ) -> StoryAnalysis:
        """Identify best elements for trailer from analysis."""

        # Find best hooks (emotional, impactful dialogues)
        hooks = []
        questions = []
        emotional_peaks = []
        action_peaks = []

        for seg in segments:
            text = seg.get("text", "").strip()
            time = seg.get("start_time", 0)
            pos = time / video_duration if video_duration > 0 else 0.5

            if not text or len(text) < 10:
                continue

            # Skip spoilers
            if any(re.search(p, text.lower()) for p in self.SPOILER_PATTERNS):
                continue

            # Skip very late content (potential spoilers)
            if pos > 0.85:
                continue

            score = self._score_dialogue_for_trailer(text, pos)

            # Check if question
            is_question = "?" in text or any(re.search(p, text.lower()) for p in self.QUESTION_PATTERNS)

            entry = {
                "dialogue": text,
                "timestamp": time,
                "position": pos,
                "score": score,
                "scene_id": seg.get("scene_id", "")
            }

            if is_question:
                questions.append(entry)
            elif score > 70:
                hooks.append(entry)

            # Check emotional content
            emotion_score = sum(
                10 for words in self.EMOTION_WORDS.values()
                for w in words if w in text.lower()
            )
            if emotion_score > 20:
                emotional_peaks.append({**entry, "emotion_score": emotion_score})

            # Check action content
            action_words = ["maar", "fight", "kill", "ladai", "jung", "attack", "danger"]
            action_score = sum(10 for w in action_words if w in text.lower())
            if action_score > 10:
                action_peaks.append({**entry, "action_score": action_score})

        # Sort by score
        hooks.sort(key=lambda x: x["score"], reverse=True)
        questions.sort(key=lambda x: x["score"], reverse=True)
        emotional_peaks.sort(key=lambda x: x.get("emotion_score", 0), reverse=True)
        action_peaks.sort(key=lambda x: x.get("action_score", 0), reverse=True)

        # Merge with existing if any
        if not analysis.best_hooks:
            analysis.best_hooks = hooks[:10]
        if not analysis.best_questions:
            analysis.best_questions = questions[:10]
        analysis.emotional_peaks = emotional_peaks[:10]
        analysis.action_peaks = action_peaks[:10]

        return analysis

    def _score_dialogue_for_trailer(self, text: str, position: float) -> int:
        """Score a dialogue's suitability for trailer."""
        score = 50
        text_lower = text.lower()

        # Length bonus (not too short, not too long)
        words = text.split()
        if 5 <= len(words) <= 20:
            score += 15
        elif 3 <= len(words) <= 30:
            score += 5

        # Question bonus
        if "?" in text:
            score += 25

        # Emotional words bonus
        for words in self.EMOTION_WORDS.values():
            for w in words:
                if w in text_lower:
                    score += 5

        # Position bonus (early-mid content is better)
        if 0.1 < position < 0.6:
            score += 15
        elif position < 0.8:
            score += 5

        # Penalty for spoiler-adjacent words
        if any(w in text_lower for w in ["khatam", "end", "final", "last"]):
            score -= 20

        return min(100, max(0, score))

    def _recommend_variants(self, analysis: StoryAnalysis) -> List[str]:
        """Recommend trailer variants based on content analysis."""
        variants = []

        # Always include dramatic variant
        variants.append("dramatic")

        # Check for emotional content
        if analysis.emotional_peaks and len(analysis.emotional_peaks) >= 3:
            variants.append("emotional")

        # Check for action content
        if analysis.action_peaks and len(analysis.action_peaks) >= 3:
            variants.append("action")

        # Check for mystery/questions
        if analysis.best_questions and len(analysis.best_questions) >= 3:
            variants.append("mystery")

        # Check for character-driven content
        if analysis.protagonist and analysis.antagonist:
            variants.append("character")

        # Genre-specific
        if "thriller" in analysis.genre.lower():
            if "thriller" not in variants:
                variants.append("thriller")
        elif "comedy" in analysis.genre.lower():
            variants.append("comedy")
        elif "romance" in analysis.genre.lower():
            if "romantic" not in variants:
                variants.append("romantic")

        return variants[:5]  # Max 5 variants


def analyze_movie_story(
    segments: List[Dict],
    scenes: List[Dict],
    video_duration: float,
    metadata: Optional[Dict] = None,
    use_llm: bool = True
) -> StoryAnalysis:
    """Convenience function to analyze movie story.

    Args:
        segments: Transcribed dialogue segments
        scenes: Detected scenes
        video_duration: Total duration in seconds
        metadata: Optional content metadata
        use_llm: Whether to try LLM analysis

    Returns:
        Complete StoryAnalysis (never None, always returns valid analysis)
    """
    try:
        analyzer = LLMStoryAnalyzer(use_llm=use_llm)
        analysis = analyzer.analyze_story(segments, scenes, video_duration, metadata)

        # Ensure we always have some data
        if not analysis.recommended_variants:
            analysis.recommended_variants = ["dramatic"]

        return analysis

    except Exception as e:
        logger.error(f"Story analysis failed: {e}, returning default analysis")
        # Return a minimal valid StoryAnalysis
        return StoryAnalysis(
            title=metadata.get("title", "Untitled") if metadata else "Untitled",
            genre=metadata.get("genre", "drama") if metadata else "drama",
            primary_emotion="dramatic",
            characters=[],
            protagonist=None,
            antagonist=None,
            plot_points=[],
            story_summary="Story analysis unavailable",
            conflict_description="",
            best_hooks=[],
            best_questions=[],
            emotional_peaks=[],
            action_peaks=[],
            recommended_variants=["dramatic"]
        )
