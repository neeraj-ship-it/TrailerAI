"""Fast LLM helper for production-grade trailer analysis.

Auto-downloads model on first run. No manual installation needed.
Fully dialect-aware: Haryanvi, Bhojpuri, Rajasthani, Gujarati

Uses: HuggingFace Transformers (auto-install) → Ollama (if available) → Heuristics
"""

import re
from typing import List, Dict, Optional, Tuple
from loguru import logger

from config.constants import LLM_MODEL, OLLAMA_MODEL

# Globals for lazy loading
_model = None
_tokenizer = None
_model_type = None  # 'transformers', 'ollama', or 'heuristic'

# =============================================================================
# DIALECT PATTERNS - For scoring and detection
# =============================================================================

DIALECT_EMOTIONAL_WORDS = {
    'haryanvi': [
        'thare', 'mahre', 'tanne', 'manne', 'ghani', 'ghano',
        'tau', 'taai', 'chhora', 'chhori', 'lugai', 'byah',
        'izzat', 'laad', 'mohabaat', 'kasam', 'baat'
    ],
    'bhojpuri': [
        'hamar', 'tohar', 'hamra', 'tohra', 'maai', 'babuji',
        'bhaiya', 'didiya', 'saiya', 'piya', 'jaan', 'pran',
        'piritiya', 'dard', 'dukhwa', 'lorwa', 'rowe'
    ],
    'rajasthani': [
        'mhare', 'thare', 'bapu', 'bai', 'banna', 'banni',
        'laadli', 'pyaaro', 'preet', 'padharo', 'khamma',
        'ghani', 'futro', 'futri'
    ],
    'gujarati': [
        'tame', 'ame', 'mari', 'tari', 'bhai', 'ben',
        'dikro', 'dikri', 'prem', 'laagni', 'jiv', 'moh',
        'dada', 'dadi', 'majama', 'saru'
    ]
}

DIALECT_QUESTION_WORDS = {
    'haryanvi': ['kai', 'kyu', 'kyun', 'kithe', 'kadd', 'kitna'],
    'bhojpuri': ['ka', 'kahe', 'kaahe', 'kaisan', 'kahiya', 'ketna'],
    'rajasthani': ['kai', 'kyu', 'kahan', 'kaisyo', 'koni'],
    'gujarati': ['su', 'shu', 'kem', 'kyare', 'kyaan', 'kone', 'ketlu']
}

DIALECT_HOOK_PHRASES = {
    'haryanvi': ['tanne pata', 'mahre se', 'ghani khushi', 'tau ke', 'kai hora'],
    'bhojpuri': ['tohar ke', 'hamra ke', 'ka hoi', 'kahe bhail', 'rowe la'],
    'rajasthani': ['thare sang', 'mhare sang', 'kai ho', 'padharo mhare'],
    'gujarati': ['tame kya', 'ame shu', 'kem chho', 'shu thyu', 'kone khabar']
}

SPOILER_PATTERNS = [
    # Hindi
    'mar gaya', 'maar diya', 'khatam', 'the end', 'ant', 'sach yeh hai',
    # Haryanvi
    'mar gya', 'ho gya', 'jeet gye', 'haar gye',
    # Bhojpuri
    'mar gail', 'ho gail', 'jeet gailein', 'haar gailein',
    # Rajasthani
    'mar gyo', 'ho gyo', 'jeet gya', 'haar gyo',
    # Gujarati
    'mari gayo', 'thai gayo', 'jitya', 'harya'
]


def _detect_dialect(text: str) -> Tuple[Optional[str], float]:
    """Detect dialect from text."""
    if not text:
        return None, 0.0

    text_lower = text.lower()
    scores = {}

    for dialect, words in DIALECT_EMOTIONAL_WORDS.items():
        score = sum(1 for w in words if w in text_lower)
        q_words = DIALECT_QUESTION_WORDS.get(dialect, [])
        score += sum(2 for w in q_words if w in text_lower)  # Questions worth more
        if score > 0:
            scores[dialect] = score

    if not scores:
        return None, 0.0

    best = max(scores, key=scores.get)
    confidence = min(1.0, scores[best] / 10)
    return best, confidence


def _score_dialogue_for_trailer(dialogue: str) -> int:
    """Score dialogue for trailer potential (0-100)."""
    if not dialogue:
        return 0

    text_lower = dialogue.lower()
    score = 0

    # Question = GOLD (50 points)
    if '?' in dialogue:
        score += 50
    else:
        # Check dialect question words
        for dialect, q_words in DIALECT_QUESTION_WORDS.items():
            if any(w in text_lower for w in q_words):
                score += 35
                break

    # Emotional words (up to 30 points)
    emotion_hits = 0
    for dialect, words in DIALECT_EMOTIONAL_WORDS.items():
        emotion_hits += sum(1 for w in words if w in text_lower)
    score += min(emotion_hits * 5, 30)

    # Hook phrases (20 points)
    for dialect, phrases in DIALECT_HOOK_PHRASES.items():
        if any(p in text_lower for p in phrases):
            score += 20
            break

    # Good length (10 points)
    words = dialogue.split()
    if 5 <= len(words) <= 15:
        score += 10

    # Spoiler penalty (-40 points)
    if any(s in text_lower for s in SPOILER_PATTERNS):
        score -= 40

    return max(0, min(100, score))


def _init_model():
    """Initialize model - auto-downloads if needed."""
    global _model, _tokenizer, _model_type

    if _model_type is not None:
        return _model_type != 'heuristic'

    # Try 1: HuggingFace Transformers (auto-downloads)
    try:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        import torch

        model_name = LLM_MODEL
        logger.info(f"Loading LLM: {model_name} (auto-downloading if needed)...")

        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        _model = AutoModelForSeq2SeqLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )

        if not torch.cuda.is_available():
            if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                _model = _model.to("mps")
            else:
                _model = _model.to("cpu")

        _model_type = 'transformers'
        logger.info(f"LLM ready: {model_name}")
        return True

    except Exception as e:
        logger.warning(f"Transformers not available: {e}")

    # Try 2: Ollama (if installed)
    try:
        import requests
        r = requests.get("http://localhost:11434/api/tags", timeout=2)
        if r.status_code == 200:
            _model_type = 'ollama'
            logger.info("Using Ollama for LLM")
            return True
    except Exception:
        pass

    # Fallback: Heuristics
    _model_type = 'heuristic'
    logger.info("Using heuristic mode (dialect-aware)")
    return False


def _generate(prompt: str, max_tokens: int = 150) -> str:
    """Generate text using available model."""
    global _model, _tokenizer, _model_type

    _init_model()

    if _model_type == 'transformers':
        try:
            inputs = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
            inputs = {k: v.to(_model.device) for k, v in inputs.items()}

            outputs = _model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.3,
                do_sample=True,
                pad_token_id=_tokenizer.eos_token_id
            )

            return _tokenizer.decode(outputs[0], skip_special_tokens=True)
        except Exception as e:
            logger.warning(f"Generation error: {e}")
            return ""

    elif _model_type == 'ollama':
        try:
            import requests
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": max_tokens}
                },
                timeout=30
            )
            if response.status_code == 200:
                return response.json().get("response", "").strip()
        except Exception:
            pass

    return ""


def rank_scenes_for_trailer(scenes: List[Dict], top_n: int = 20) -> List[Dict]:
    """Rank scenes for trailer - dialect-aware.

    Prioritizes:
    1. Questions (creates curiosity)
    2. Emotional dialect words
    3. Hook phrases
    4. No spoilers
    """
    if not scenes:
        return scenes

    # Step 1: Score all scenes with dialect-aware heuristics
    for scene in scenes:
        dialogue = scene.get("dialogue", "") or ""
        base_score = scene.get("score", 0)

        # Add dialect-aware scoring
        dialect_score = _score_dialogue_for_trailer(dialogue)
        scene["trailer_score"] = base_score + dialect_score

        # Detect dialect
        dialect, conf = _detect_dialect(dialogue)
        if dialect:
            scene["detected_dialect"] = dialect
            scene["dialect_confidence"] = conf

    # Sort by trailer score
    scored = sorted(scenes, key=lambda x: x.get("trailer_score", 0), reverse=True)

    # Step 2: LLM enhancement for top candidates (if available)
    if _init_model() and _model_type != 'heuristic':
        top_candidates = scored[:30]

        # Build prompt with dialect context
        scene_texts = []
        for i, scene in enumerate(top_candidates[:12]):
            dialogue = scene.get("dialogue", "") or ""
            if dialogue and len(dialogue) > 5:
                dialect = scene.get("detected_dialect", "")
                dialect_tag = f"[{dialect}] " if dialect else ""
                scene_texts.append(f"{i+1}. {dialect_tag}\"{dialogue[:80]}\"")

        if scene_texts:
            prompt = f"""Rate these regional Indian movie dialogues for trailer potential.

BEST for trailers:
- Questions (kya, kyun, kai, ka, kem, su) - create curiosity
- Emotional words (pyaar, maa, jaan, dil, kasam)
- Regional phrases (ghani, tohar, mhare, tame)

AVOID for trailers:
- Spoilers (mar gaya, khatam, the end)
- Reveals (sach yeh hai, isliye)

Dialogues:
{chr(10).join(scene_texts)}

List top 6 numbers (best for trailer), comma-separated:"""

            result = _generate(prompt, max_tokens=40)

            if result:
                try:
                    nums = []
                    for part in result.replace(",", " ").split():
                        try:
                            n = int(part.strip().rstrip("."))
                            if 1 <= n <= len(top_candidates):
                                nums.append(n - 1)
                        except ValueError:
                            continue

                    if nums:
                        ranked = []
                        seen = set()
                        for idx in nums:
                            if idx not in seen and idx < len(top_candidates):
                                top_candidates[idx]["llm_rank"] = len(ranked) + 1
                                ranked.append(top_candidates[idx])
                                seen.add(idx)

                        for scene in scored:
                            if scene not in ranked and len(ranked) < top_n:
                                ranked.append(scene)

                        logger.info(f"LLM ranked {len(nums)} priority scenes")
                        return ranked[:top_n]

                except Exception as e:
                    logger.warning(f"LLM parse error: {e}")

    return scored[:top_n]


def pick_best_quote(dialogue: str, scene_context: str = "") -> Optional[str]:
    """Pick the best trailer quote - dialect-aware."""
    if not dialogue or len(dialogue) < 10:
        return dialogue

    if len(dialogue) < 60:
        return dialogue

    # Split into sentences (handle Hindi/regional punctuation)
    sentences = []
    temp = dialogue
    for delim in ["?", "!", "।", ".", "|"]:
        temp = temp.replace(delim, delim + "||SPLIT||")
    sentences = [s.strip() for s in temp.split("||SPLIT||") if s.strip() and len(s.strip()) > 3]

    if not sentences:
        return dialogue[:100]

    # Score each sentence
    best = None
    best_score = 0

    for sent in sentences:
        score = _score_dialogue_for_trailer(sent)

        # Bonus for standalone power
        words = sent.split()
        if 5 <= len(words) <= 12:
            score += 15

        if score > best_score:
            best_score = score
            best = sent

    # LLM enhancement for complex dialogues
    if _init_model() and _model_type != 'heuristic' and len(sentences) > 4:
        dialect, _ = _detect_dialect(dialogue)
        dialect_hint = f" (Dialect: {dialect})" if dialect else ""

        prompt = f"""Pick the SINGLE best line for a movie trailer{dialect_hint}:

"{dialogue[:200]}"

Best line should:
- Create curiosity (questions are best)
- Have emotional impact
- NOT reveal story/ending
- Keep original dialect words

Best line:"""

        result = _generate(prompt, max_tokens=50)
        if result and 5 < len(result) < 100:
            result = result.strip().strip('"').strip("'")
            # Validate it's not a meta-response
            if result and not any(x in result.lower() for x in ['the best', 'i would', 'this line', 'the line']):
                return result

    return best[:100] if best else sentences[0][:100]


def score_narrative_flow(shots: List[Dict]) -> int:
    """Score trailer narrative flow (0-100).

    Good trailer structure:
    1. INTRO (10%) - Set the world
    2. CHARACTER (25%) - Hero intro + title
    3. BUILD (40%) - Story, conflict
    4. HOOK (25%) - Question, suspense
    """
    if not shots or len(shots) < 4:
        return 50

    score = 50  # Base score

    # Phase presence
    phases = [s.get("purpose", s.get("phase", "")) for s in shots]

    # Has intro in first 2 shots?
    if any(p == "intro" for p in phases[:2]):
        score += 12

    # Has character intro in first 40%?
    first_half = phases[:len(phases)//2]
    if any(p == "character" for p in first_half):
        score += 10

    # Has build in middle?
    if any(p == "build" for p in phases):
        score += 8

    # Ends with hook?
    if any(p == "hook" for p in phases[-3:]):
        score += 15

    # Ends with question? (BEST for trailers)
    for s in shots[-3:]:
        dial = s.get("dialogue_line", s.get("dialogue", "")) or ""
        if "?" in dial:
            score += 10
            break
        # Check dialect question words
        dial_lower = dial.lower()
        for q_words in DIALECT_QUESTION_WORDS.values():
            if any(w in dial_lower for w in q_words):
                score += 8
                break

    # Good shot count (12-18 ideal)
    if 10 <= len(shots) <= 20:
        score += 5

    # Dialect variety bonus
    dialects_found = set()
    for s in shots:
        dial = s.get("dialogue_line", s.get("dialogue", "")) or ""
        d, _ = _detect_dialect(dial)
        if d:
            dialects_found.add(d)
    if dialects_found:
        score += 5  # Has regional content

    return min(100, max(0, score))


def get_best_hook_ending(scenes: List[Dict]) -> Optional[Dict]:
    """Find the best scene to end the trailer with (hook/question)."""
    if not scenes:
        return None

    candidates = []

    for scene in scenes:
        dialogue = scene.get("dialogue", scene.get("key_quote", "")) or ""
        if not dialogue:
            continue

        score = 0
        dial_lower = dialogue.lower()

        # Question = best hook
        if "?" in dialogue:
            score += 100

        # Dialect question words
        for q_words in DIALECT_QUESTION_WORDS.values():
            if any(w in dial_lower for w in q_words):
                score += 60
                break

        # Hook phrases
        for phrases in DIALECT_HOOK_PHRASES.values():
            if any(p in dial_lower for p in phrases):
                score += 40
                break

        # NOT a spoiler
        if any(s in dial_lower for s in SPOILER_PATTERNS):
            score -= 100

        # Good length
        if 5 <= len(dialogue.split()) <= 15:
            score += 20

        if score > 0:
            candidates.append((scene, score))

    if candidates:
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    return None


def enhance_scene_summary(
    scene_type: str,
    mood: str,
    dialogue: Optional[str],
    visual_hook: Optional[str]
) -> str:
    """Generate scene summary for editor."""
    parts = []

    if scene_type and scene_type not in ["general", "unknown"]:
        parts.append(scene_type.capitalize())

    if mood and mood not in ["neutral", "unknown"]:
        parts.append(f"{mood} mood")

    if visual_hook:
        parts.append(visual_hook.lower())

    if dialogue:
        dialect, conf = _detect_dialect(dialogue)
        if dialect and conf > 0.3:
            parts.append(f"{dialect} dialogue")

        if "?" in dialogue:
            parts.append("question hook")
        elif len(dialogue) > 20:
            parts.append("with dialogue")

    return ", ".join(parts) if parts else "General scene"
