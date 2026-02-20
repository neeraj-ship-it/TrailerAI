"""Fast, effective scene content analysis.

Focus: Score scenes for trailer potential quickly.
No unnecessary complexity.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import re
from loguru import logger

from config import get_config


@dataclass
class SceneUnderstanding:
    """Scene analysis result."""
    scene_id: str
    start_time: float
    end_time: float
    summary: str
    emotional_score: int  # 0-100
    action_score: int  # 0-100
    trailer_potential: int  # 0-100
    scene_type: str
    key_quote: Optional[str]
    visual_hook: Optional[str]
    spoiler_level: int  # 1-10
    characters: List[str]
    mood: str
    dialogue_highlight: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.end_time - self.start_time,
            "summary": self.summary,
            "emotional_score": self.emotional_score,
            "action_score": self.action_score,
            "trailer_potential": self.trailer_potential,
            "scene_type": self.scene_type,
            "key_quote": self.key_quote,
            "visual_hook": self.visual_hook,
            "spoiler_level": self.spoiler_level,
            "characters": self.characters,
            "mood": self.mood,
            "dialogue_highlight": self.dialogue_highlight
        }


class ContentAnalyzer:
    """Fast scene analysis for trailer generation.

    Supports regional dialects: Haryanvi, Bhojpuri, Rajasthani, Gujarati

    Scores scenes based on:
    1. Dialogue quality (questions, emotional words)
    2. Visual interest (motion, faces)
    3. Position in movie (avoid spoilers)
    """

    # Power words for trailers - COMPREHENSIVE DIALECT SUPPORT
    # Priority: Haryanvi, Bhojpuri, Rajasthani, Gujarati
    EMOTIONAL_WORDS = [
        # === HARYANVI (Top Priority) ===
        # Pronouns & Family
        'thare', 'mahre', 'tanne', 'manne', 'apne', 'unne', 'inne',
        'tau', 'taai', 'chacha', 'chachi', 'chhora', 'chhori', 'lugai',
        'byah', 'saas', 'sasur', 'bahu', 'jeth', 'devrani', 'jethani',
        # Emotions
        'ghani', 'ghano', 'ghanan', 'mohabaat', 'laad', 'dukh', 'sukh',
        'izzat', 'sharam', 'maan', 'akal',
        # Common expressions
        'kade', 'jade', 'tade', 'haan', 'na', 'achha', 'theek',
        'fayde', 'nuksan', 'galti', 'saza', 'maafi',

        # === BHOJPURI (Top Priority) ===
        # Pronouns & Family
        'ham', 'hum', 'hamra', 'hamaar', 'hamar', 'tohar', 'tohra',
        'maai', 'babuji', 'bhaiya', 'didiya', 'marad', 'mehararu',
        'saiya', 'piya', 'dulha', 'dulhin', 'nanad', 'devar',
        # Emotions
        'jaan', 'pran', 'dil', 'mann', 'laag', 'lagaav', 'mohabbat',
        'piritiya', 'neh', 'maya', 'dard', 'dukhwa', 'sukhwa',
        'aankhi', 'lorwa', 'hans', 'muskai',
        # Common expressions
        'rahi', 'jaai', 'aai', 'jata', 'khaali', 'bharal',
        'maral', 'piyal', 'khailal', 'gailal', 'ailal',

        # === RAJASTHANI (Top Priority) ===
        # Pronouns & Family
        'mhare', 'thare', 'mhara', 'thara', 'mhari', 'thari',
        'bapu', 'bai', 'bapuji', 'maaji', 'banna', 'banni',
        'banno', 'banasa', 'banadi', 'sasurya', 'byaai',
        # Emotions
        'laad', 'laadli', 'pyaaro', 'preet', 'prem', 'chaah',
        'izzat', 'maan', 'dard', 'dukh', 'sukh', 'anand',
        # Common expressions
        'padharo', 'khamma', 'ghani', 'ghano', 'badhiya',
        'futro', 'futri', 'chakkar', 'kaam', 'baat',

        # === GUJARATI (Top Priority) ===
        # Pronouns & Family
        'hu', 'hun', 'tame', 'tamne', 'ame', 'amne', 'mari', 'tari',
        'bhai', 'ben', 'dikro', 'dikri', 'chhokro', 'chhokri',
        'mummy', 'papa', 'ba', 'bapuji', 'dada', 'dadi', 'kaka', 'kaki',
        'mama', 'mami', 'foi', 'fua', 'masa', 'masi', 'sasra', 'sasu',
        # Emotions
        'prem', 'pyar', 'laagni', 'lagni', 'jiv', 'moh', 'maya',
        'dukh', 'sukh', 'khushi', 'gam', 'aabhaar',
        # Common expressions
        'majama', 'saru', 'saras', 'bahu', 'barabar', 'aavjo',

        # === HINDI/COMMON (Fallback) ===
        'love', 'pyaar', 'dil', 'heart', 'maa', 'baap', 'family',
        'cry', 'rona', 'sorry', 'maaf', 'please', 'promise', 'kasam',
        'life', 'zindagi', 'death', 'maut', 'dream', 'sapna',
        'beta', 'beti', 'bhai', 'behen', 'dost'
    ]

    ACTION_WORDS = [
        # === HARYANVI ===
        'maar', 'peet', 'daud', 'bhaj', 'pakad', 'chhod', 'tod',
        'khich', 'dhak', 'thok', 'pel', 'dangal', 'kushti', 'larai',

        # === BHOJPURI ===
        'maral', 'pital', 'daudat', 'bhaagal', 'pakdal', 'chhodal',
        'todal', 'khichal', 'dhakka', 'thokna', 'larai', 'jhagda',
        'maramari', 'pitai', 'dhamki',

        # === RAJASTHANI ===
        'maaro', 'peeto', 'daudo', 'pakdo', 'chodo', 'todo',
        'kheecho', 'dhakko', 'yudh', 'larai', 'dangal',

        # === GUJARATI ===
        'maaro', 'peeto', 'daudo', 'pakdo', 'chodo', 'todo',
        'kheencho', 'dhakko', 'ladai', 'jhagdo', 'maramari',

        # === HINDI/COMMON ===
        'fight', 'ladai', 'run', 'bhago', 'kill', 'attack',
        'chase', 'battle', 'war', 'jung', 'danger', 'khatre',
        'takkar', 'ghusna', 'hamla', 'vaar'
    ]

    SPOILER_WORDS = [
        # === HARYANVI ===
        'mar gya', 'ho gya', 'pata lag gya', 'sach pata', 'khatam',
        'jeet gye', 'haar gye', 'ant', 'aakhir', 'last mein',

        # === BHOJPURI ===
        'mar gail', 'ho gail', 'pata chal gail', 'sach nikaal',
        'khatam bhail', 'jeet gailein', 'haar gailein', 'ant bhail',

        # === RAJASTHANI ===
        'mar gyo', 'ho gyo', 'pata lag gyo', 'sach khul gyo',
        'khatam ho gyo', 'jeet gya', 'haar gyo', 'ant ho gyo',

        # === GUJARATI ===
        'mari gayo', 'thai gayo', 'khabar padi', 'sach khulyu',
        'khatam thayu', 'jitya', 'harya', 'ant aavyo',

        # === HINDI/COMMON ===
        'killed', 'died', 'dead', 'maar diya', 'mar gaya',
        'truth is', 'because', 'finally', 'the end', 'khatam',
        'solved', 'revealed', 'answer', 'sach yeh hai',
        'isliye', 'kyunki', 'jeet gaye', 'haar gaye'
    ]

    # Question words in all dialects (create curiosity) - COMPREHENSIVE
    QUESTION_WORDS = [
        # === HARYANVI ===
        'kai', 'kyu', 'kyun', 'kithe', 'kadd', 'kaun', 'kidhar',
        'kisey', 'kab', 'kitna', 'kitni', 'kiske',

        # === BHOJPURI ===
        'ka', 'kahe', 'kaahe', 'kaisan', 'kahiya', 'kawan',
        'kahanwa', 'ketna', 'kakara', 'kaila',

        # === RAJASTHANI ===
        'kai', 'kyu', 'kahan', 'kab', 'kaun', 'kitna',
        'kiske', 'kidhar', 'kaisyo', 'koni',

        # === GUJARATI ===
        'su', 'shu', 'kem', 'kyare', 'kya', 'kyaan', 'kone',
        'kon', 'ketlu', 'kevi', 'keva',

        # === HINDI/COMMON ===
        'kya', 'kaun', 'kyun', 'kaise', 'kab', 'kahan',
        'kitna', 'kiske', 'kiski', 'kidhar'
    ]

    # Dialect-specific hook phrases (create maximum impact)
    HOOK_PHRASES = {
        'haryanvi': [
            'tanne pata', 'mahre se', 'ghani', 'tau ke',
            'kai hora', 'kyun kara', 'kithe ja'
        ],
        'bhojpuri': [
            'tohar ke', 'hamra ke', 'ka hoi', 'kahe bhail',
            'ketna', 'kahiya', 'kaisan'
        ],
        'rajasthani': [
            'thare sang', 'mhare sang', 'kai ho', 'kyu',
            'padharo', 'khamma ghani'
        ],
        'gujarati': [
            'tame', 'ame', 'su thyu', 'kem', 'kyare',
            'kone khabar', 'shu chhe'
        ]
    }

    def __init__(self, **kwargs):
        """Initialize analyzer."""
        self.config = get_config()
        self._video_duration = 0
        logger.info("ContentAnalyzer initialized - Fast mode")

    def analyze_scenes(
        self,
        scenes: List[Dict],
        transcript_segments: Optional[List[Dict]] = None,
        visual_analysis: Optional[List[Dict]] = None,
        video_duration: float = 0,
        transcripts: Optional[Dict[str, str]] = None,
        visual_analyses: Optional[Dict[str, Dict]] = None,
        **kwargs
    ) -> List[SceneUnderstanding]:
        """Analyze all scenes quickly.

        Args:
            scenes: List of scene dicts with start_time, end_time, scene_id
            transcript_segments: List of transcript segments (alternative input)
            visual_analysis: List of visual analysis results (alternative input)
            video_duration: Total video duration
            transcripts: Dict of scene_id -> transcript text (preferred input)
            visual_analyses: Dict of scene_id -> visual data (preferred input)
        """
        self._video_duration = video_duration
        results = []

        logger.info(f"Analyzing {len(scenes)} scenes...")

        for i, scene in enumerate(scenes):
            scene_id = scene.get("scene_id", scene.get("id", f"scene_{i+1}"))
            start = scene.get("start_time", 0)
            end = scene.get("end_time", 0)

            # Get transcript - prefer dict format, fall back to segments
            if transcripts and scene_id in transcripts:
                transcript = transcripts[scene_id]
            elif transcript_segments:
                transcript = self._get_scene_transcript(start, end, transcript_segments)
            else:
                transcript = ""

            # Get visual data - prefer dict format, fall back to list
            if visual_analyses and scene_id in visual_analyses:
                visual = visual_analyses[scene_id]
            elif visual_analysis and i < len(visual_analysis):
                visual = visual_analysis[i]
            else:
                visual = None

            # Analyze scene
            result = self._analyze_scene(scene_id, start, end, transcript, visual)
            results.append(result)

        logger.info(f"Scene analysis complete: {len(results)} scenes")
        return results

    def _get_scene_transcript(
        self,
        start: float,
        end: float,
        segments: List[Dict]
    ) -> str:
        """Get transcript text for a scene."""
        texts = []
        for seg in segments:
            seg_start = seg.get("start_time", seg.get("start", 0))
            seg_end = seg.get("end_time", seg.get("end", 0))

            # Check overlap
            if seg_start < end and seg_end > start:
                text = seg.get("text", "")
                if text:
                    texts.append(text.strip())

        return " ".join(texts)

    def _analyze_scene(
        self,
        scene_id: str,
        start: float,
        end: float,
        transcript: str,
        visual: Optional[Dict]
    ) -> SceneUnderstanding:
        """Analyze single scene - fast and effective."""
        duration = end - start
        text_lower = transcript.lower() if transcript else ""

        # Visual metrics
        motion = 0.0
        brightness = 0.5
        face_presence = 0.0
        visual_category = "unknown"

        if visual:
            motion = visual.get("motion_intensity", 0)
            brightness = visual.get("average_brightness", 0.5)
            face_presence = visual.get("face_presence", 0)
            visual_category = visual.get("dominant_category", "unknown")

        # 1. EMOTIONAL SCORE
        emotional = int(face_presence * 40)
        for word in self.EMOTIONAL_WORDS:
            if word in text_lower:
                emotional += 10

        # Question detection (all dialects)
        if "?" in transcript:
            emotional += 20
        for qword in self.QUESTION_WORDS:
            if qword in text_lower:
                emotional += 8
                break  # One question word is enough

        emotional = min(100, emotional)

        # 2. ACTION SCORE
        action = int(motion * 60)
        for word in self.ACTION_WORDS:
            if word in text_lower:
                action += 10
        action = min(100, action)

        # 3. SCENE TYPE
        scene_type = self._get_scene_type(visual_category, motion, text_lower)

        # 4. MOOD
        mood = self._get_mood(visual_category, brightness, motion, text_lower)

        # 5. SPOILER LEVEL
        spoiler = self._get_spoiler_level(start, text_lower)

        # 6. TRAILER POTENTIAL
        potential = self._get_trailer_potential(
            emotional, action, transcript, spoiler, start
        )

        # 7. KEY QUOTE
        key_quote = self._get_best_quote(transcript)

        # 8. VISUAL HOOK
        visual_hook = None
        if motion > 0.6:
            visual_hook = "High motion"
        elif visual_category == "establishing":
            visual_hook = "Scenic shot"
        elif face_presence > 0.7:
            visual_hook = "Character focus"

        return SceneUnderstanding(
            scene_id=scene_id,
            start_time=start,
            end_time=end,
            summary=f"{scene_type} scene, {mood} mood",
            emotional_score=emotional,
            action_score=action,
            trailer_potential=potential,
            scene_type=scene_type,
            key_quote=key_quote,
            visual_hook=visual_hook,
            spoiler_level=spoiler,
            characters=[],
            mood=mood,
            dialogue_highlight=key_quote
        )

    def _get_scene_type(self, visual: str, motion: float, text: str) -> str:
        """Determine scene type quickly."""
        if visual == "establishing":
            return "establishing"
        if motion > 0.7:
            return "action"
        if any(w in text for w in ['love', 'pyaar', 'dil']):
            return "romantic"
        if len(text) > 50:
            return "dialogue"
        if visual in ["nature", "landscape"]:
            return "establishing"
        return "general"

    def _get_mood(self, visual: str, brightness: float, motion: float, text: str) -> str:
        """Determine mood quickly."""
        if any(w in text for w in ['fight', 'kill', 'attack', 'maar']):
            return "intense"
        if any(w in text for w in ['love', 'pyaar', 'dil', 'heart']):
            return "romantic"
        if brightness < 0.3:
            return "dark"
        if motion > 0.6:
            return "energetic"
        if any(w in text for w in ['sad', 'cry', 'sorry', 'maaf']):
            return "emotional"
        return "neutral"

    def _get_spoiler_level(self, start: float, text: str) -> int:
        """Calculate spoiler risk (1-10)."""
        level = 2

        # Position-based (most important)
        if self._video_duration > 0:
            pos = start / self._video_duration
            if pos > 0.85:
                level += 5
            elif pos > 0.7:
                level += 3
            elif pos > 0.6:
                level += 1

        # Keyword-based
        for word in self.SPOILER_WORDS:
            if word in text:
                level += 2

        return min(10, level)

    def _get_trailer_potential(
        self,
        emotional: int,
        action: int,
        transcript: str,
        spoiler: int,
        start: float
    ) -> int:
        """Calculate trailer potential (0-100)."""
        text_lower = transcript.lower() if transcript else ""

        # Base from scores
        base = (emotional * 0.6 + action * 0.3)

        # Dialogue bonus
        if transcript and len(transcript) > 10:
            base += 20

            # Question detection (all dialects) - creates curiosity
            if "?" in transcript:
                base += 25
            else:
                for qword in self.QUESTION_WORDS:
                    if qword in text_lower:
                        base += 15
                        break

        # Power word bonus (emotional/dialect words)
        word_bonus = 0
        for word in self.EMOTIONAL_WORDS:
            if word in text_lower:
                word_bonus += 4
        base += min(word_bonus, 25)  # Cap at 25

        # Spoiler penalty
        base -= spoiler * 5

        # Position bonus (early/mid scenes)
        if self._video_duration > 0:
            pos = start / self._video_duration
            if pos < 0.15:
                base += 10
            elif 0.3 < pos < 0.6:
                base += 15

        return min(100, max(0, int(base)))

    def _get_best_quote(self, transcript: str) -> Optional[str]:
        """Extract best quote for trailer - dialect-aware."""
        if not transcript or len(transcript) < 5:
            return None

        # Split into sentences
        sentences = re.split(r'[.!?]+', transcript)
        sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 3]

        if not sentences:
            return transcript[:100] if len(transcript) > 3 else None

        # Score sentences
        best = None
        best_score = 0

        for sent in sentences:
            score = 0
            words = sent.split()
            sent_lower = sent.lower()

            # Good length (5-15 words ideal for trailer)
            if 5 <= len(words) <= 15:
                score += 20
            elif 3 <= len(words) <= 20:
                score += 10

            # Has question (GOLD for trailers)
            if "?" in sent:
                score += 35

            # Question words in dialect
            for qword in self.QUESTION_WORDS:
                if qword in sent_lower:
                    score += 15
                    break

            # Emotional words (check more for dialect coverage)
            emotion_hits = 0
            for word in self.EMOTIONAL_WORDS:
                if word in sent_lower:
                    emotion_hits += 1
            score += min(emotion_hits * 8, 30)  # Cap at 30

            # Dialect hook phrases (highest priority)
            for dialect, phrases in self.HOOK_PHRASES.items():
                for phrase in phrases:
                    if phrase in sent_lower:
                        score += 20
                        break

            # No spoilers (heavy penalty)
            for word in self.SPOILER_WORDS:
                if word in sent_lower:
                    score -= 40

            if score > best_score:
                best_score = score
                best = sent

        return best[:120] if best and len(best) > 120 else best

    def rank_for_trailer(
        self,
        scenes: List[SceneUnderstanding],
        top_n: int = 20
    ) -> List[SceneUnderstanding]:
        """Rank scenes for trailer using LLM (if available).

        Fast heuristic first, then LLM polish for best results.
        """
        if not scenes:
            return []

        # Import LLM helper
        try:
            from analysis.llm_helper import rank_scenes_for_trailer, pick_best_quote
            use_llm = True
        except ImportError:
            use_llm = False

        # Convert to dict format for LLM
        scene_dicts = []
        for scene in scenes:
            scene_dicts.append({
                "scene_id": scene.scene_id,
                "dialogue": scene.key_quote,
                "score": scene.trailer_potential,
                "emotional": scene.emotional_score,
                "action": scene.action_score,
                "spoiler": scene.spoiler_level,
                "scene_obj": scene
            })

        if use_llm:
            # LLM ranking
            ranked_dicts = rank_scenes_for_trailer(scene_dicts, top_n)

            # Enhance quotes with LLM
            for d in ranked_dicts[:10]:  # Top 10 only
                if d.get("dialogue"):
                    better_quote = pick_best_quote(d["dialogue"])
                    if better_quote:
                        d["scene_obj"].key_quote = better_quote
                        d["scene_obj"].dialogue_highlight = better_quote

            return [d["scene_obj"] for d in ranked_dicts]
        else:
            # Heuristic only
            sorted_scenes = sorted(scenes, key=lambda s: s.trailer_potential, reverse=True)
            return sorted_scenes[:top_n]

    # Compatibility method
    def analyze_scene(self, scene_id, start, end, transcript, visual=None, script=None):
        """Single scene analysis (for compatibility)."""
        return self._analyze_scene(scene_id, start, end, transcript, visual)
