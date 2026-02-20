#!/usr/bin/env python3
"""
FAST Trailer Generator with LLM - Production Ready

Uses LLM (google/flan-t5-base) for intelligent narrative generation:
- Scene ranking and selection
- Dialogue quality scoring
- Hook identification
- Story beat optimization

Usage:
    python fast_trailer.py /path/to/video.mp4 --title "Movie Name"
    python fast_trailer.py /path/to/video.mp4 --subtitle /path/to/subtitle.srt
"""

import sys
import os
import json
import time
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

# Add project root
sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO"
)


# =============================================================================
# LLM ENGINE - Uses google/flan-t5-base (already cached on your system)
# =============================================================================

class TrailerLLM:
    """LLM for intelligent trailer narrative generation."""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = None
        self._initialized = False

    def initialize(self):
        """Initialize the LLM model."""
        if self._initialized:
            return True

        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            model_name = "google/flan-t5-base"  # ~900MB, already cached
            logger.info(f"Loading LLM: {model_name}")

            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

            # Device selection
            if torch.cuda.is_available():
                self.device = "cuda"
                self.model = self.model.to("cuda")
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"
                self.model = self.model.to("mps")
            else:
                self.device = "cpu"

            self.model.eval()
            self._initialized = True
            logger.info(f"LLM ready on {self.device}")
            return True

        except Exception as e:
            logger.warning(f"LLM init failed: {e}, using heuristics")
            return False

    def generate(self, prompt: str, max_length: int = 150) -> str:
        """Generate text from prompt."""
        if not self._initialized:
            return ""

        try:
            inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with __import__('torch').no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_length,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )

            return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        except Exception as e:
            logger.warning(f"LLM generation error: {e}")
            return ""

    def rank_scenes_for_trailer(self, scenes: List[Dict], top_n: int = 20) -> List[int]:
        """Use LLM to rank best scenes for trailer."""
        if not self._initialized or not scenes:
            return list(range(min(top_n, len(scenes))))

        # Build prompt with scene dialogues
        scene_texts = []
        for i, scene in enumerate(scenes[:25]):  # Limit to first 25
            dialogue = scene.get("dialogue", "")[:80]
            if dialogue:
                scene_texts.append(f"{i+1}. \"{dialogue}\"")

        if not scene_texts:
            return list(range(min(top_n, len(scenes))))

        prompt = f"""Rate these movie dialogues for a trailer. Best trailers have:
- Questions (creates curiosity)
- Emotional words (pyaar, maa, dil, jaan)
- Regional phrases (ghani, tohar, mhare)
- NO spoilers (avoid: mar gaya, khatam, the end)

Dialogues:
{chr(10).join(scene_texts[:12])}

List the TOP 6 best numbers for trailer (comma-separated):"""

        result = self.generate(prompt, max_length=50)

        # Parse numbers from response
        ranked = []
        for part in result.replace(",", " ").split():
            try:
                n = int(part.strip().rstrip("."))
                if 1 <= n <= len(scenes) and (n-1) not in ranked:
                    ranked.append(n - 1)
            except ValueError:
                continue

        # Fill remaining
        for i in range(len(scenes)):
            if i not in ranked and len(ranked) < top_n:
                ranked.append(i)

        return ranked[:top_n]

    def select_best_quote(self, dialogue: str) -> str:
        """Use LLM to pick the best trailer quote from dialogue."""
        if not self._initialized or not dialogue or len(dialogue) < 20:
            return dialogue

        if len(dialogue) < 80:
            return dialogue

        prompt = f"""Pick the SINGLE best line for a movie trailer from this dialogue:

"{dialogue[:300]}"

Best trailer lines:
- Create curiosity (questions are gold)
- Have emotional impact
- Do NOT reveal story/ending
- Keep original language/dialect

Best line:"""

        result = self.generate(prompt, max_length=60)

        # Validate response
        if result and 5 < len(result) < 120:
            result = result.strip().strip('"').strip("'")
            # Check it's not meta-response
            meta_words = ['the best', 'i would', 'this line', 'the line', 'here is']
            if not any(x in result.lower() for x in meta_words):
                return result

        return dialogue[:100]

    def generate_trailer_tagline(self, style: str, genre: str, title: str) -> str:
        """Generate a tagline for the trailer."""
        if not self._initialized:
            taglines = {
                "dramatic": "Kuch kahaniyan badal deti hain",
                "action": "Ab hogi takkar",
                "emotional": "Dil se mehsoos karo",
                "mystery": "Raaz khulega",
                "thriller": "Dar ke aage kya?"
            }
            return taglines.get(style, "Jald aane wali hai")

        prompt = f"""Create a short Hindi/regional movie tagline (5-8 words) for:
Title: {title}
Genre: {genre}
Style: {style}

Use emotional Hindi words like: pyaar, dil, jung, kasam, zindagi
Can include regional words: ghani, tohar, mhare

Tagline:"""

        result = self.generate(prompt, max_length=30)
        if result and 3 < len(result.split()) < 12:
            return result.strip()

        return "Ek kahani jo badal degi sab kuch"


# Global LLM instance
_llm = None

def get_llm() -> TrailerLLM:
    global _llm
    if _llm is None:
        _llm = TrailerLLM()
    return _llm


# =============================================================================
# DIALECT PATTERNS (works with or without LLM)
# =============================================================================

DIALECT_PATTERNS = {
    "haryanvi": ["thare", "mahre", "tanne", "manne", "ghani", "ghano", "tau", "chhora", "chhori"],
    "bhojpuri": ["hamar", "tohar", "hamra", "tohra", "maai", "babuji", "saiya", "piya"],
    "rajasthani": ["mhare", "thare", "bapu", "bai", "padharo", "khamma"],
    "gujarati": ["tame", "ame", "mari", "tari", "bhai", "ben", "kem", "shu"]
}

POWER_WORDS = [
    '?', 'kya', 'kaun', 'kyun', 'kaise', 'kab', 'kahan',
    'kai', 'kyu', 'kithe', 'ka', 'kahe', 'kem', 'su',
    'pyaar', 'dil', 'maa', 'jaan', 'kasam', 'mohabbat', 'laad',
    'thare', 'mahre', 'tohar', 'hamar', 'mhare', 'tame',
    'ladai', 'jung', 'takkar', 'khatre'
]

SPOILER_WORDS = [
    'mar gaya', 'mar gya', 'mar gail', 'mar gyo', 'mari gayo',
    'khatam', 'ant', 'the end', 'sach yeh hai', 'isliye',
    'finally', 'revealed', 'truth is', 'solved'
]


def detect_dialect(text: str) -> Tuple[Optional[str], float]:
    """Detect dialect from text."""
    if not text:
        return None, 0.0

    text_lower = text.lower()
    scores = {}

    for dialect, patterns in DIALECT_PATTERNS.items():
        score = sum(1 for p in patterns if p in text_lower)
        if score > 0:
            scores[dialect] = score

    if not scores:
        return None, 0.0

    best = max(scores, key=scores.get)
    confidence = min(1.0, scores[best] / 5)
    return best, confidence


# =============================================================================
# SCENE DETECTION
# =============================================================================

def detect_scenes(video_path: Path) -> Any:
    """Fast scene detection."""
    from analysis.scene_detector import SceneDetector

    logger.info(f"Detecting scenes in: {video_path}")
    detector = SceneDetector()
    result = detector.detect(video_path, show_progress=True)
    logger.info(f"Detected {result.scene_count} scenes ({result.video_duration:.0f}s video)")
    return result


# =============================================================================
# SUBTITLE PARSING
# =============================================================================

def parse_subtitles(subtitle_path: Path) -> List[Dict]:
    """Parse subtitle file for dialogue."""
    if not subtitle_path or not subtitle_path.exists():
        return []

    logger.info(f"Parsing subtitles: {subtitle_path}")
    segments = []
    ext = subtitle_path.suffix.lower()

    try:
        if ext == '.srt':
            import pysrt
            subs = pysrt.open(str(subtitle_path))
            for sub in subs:
                start = sub.start.hours * 3600 + sub.start.minutes * 60 + sub.start.seconds + sub.start.milliseconds / 1000
                end = sub.end.hours * 3600 + sub.end.minutes * 60 + sub.end.seconds + sub.end.milliseconds / 1000
                segments.append({
                    "start_time": start,
                    "end_time": end,
                    "text": sub.text.replace('\n', ' ')
                })
        elif ext == '.vtt':
            import webvtt
            for caption in webvtt.read(str(subtitle_path)):
                start_parts = caption.start.split(':')
                end_parts = caption.end.split(':')
                start = float(start_parts[0]) * 3600 + float(start_parts[1]) * 60 + float(start_parts[2].replace(',', '.'))
                end = float(end_parts[0]) * 3600 + float(end_parts[1]) * 60 + float(end_parts[2].replace(',', '.'))
                segments.append({
                    "start_time": start,
                    "end_time": end,
                    "text": caption.text.replace('\n', ' ')
                })

        logger.info(f"Parsed {len(segments)} dialogue segments")
    except Exception as e:
        logger.warning(f"Subtitle parsing error: {e}")

    return segments


# =============================================================================
# SCENE ANALYSIS WITH LLM
# =============================================================================

def build_scene_data(scene_result, dialogue_segments: List[Dict], use_llm: bool = True) -> List[Dict]:
    """Build enriched scene data with LLM-powered analysis."""
    scenes = []
    video_duration = scene_result.video_duration
    llm = get_llm() if use_llm else None

    # Initialize LLM
    if llm and use_llm:
        llm.initialize()

    # Build dialogue map by time
    dialogue_map = {}
    for seg in dialogue_segments:
        for t in range(int(seg["start_time"]), int(seg["end_time"]) + 1):
            if t not in dialogue_map:
                dialogue_map[t] = []
            dialogue_map[t].append(seg["text"])

    for i, scene in enumerate(scene_result.scenes):
        start = scene.start_time
        end = scene.end_time
        duration = end - start
        position = start / video_duration if video_duration > 0 else 0.5

        # Get dialogue for this scene
        scene_dialogue = []
        for t in range(int(start), int(end) + 1):
            if t in dialogue_map:
                scene_dialogue.extend(dialogue_map[t])

        dialogue_text = ' '.join(set(scene_dialogue))
        dialogue_lower = dialogue_text.lower()

        # Detect dialect
        dialect, dialect_conf = detect_dialect(dialogue_text)

        # Calculate scores
        emotional_score = 0
        action_score = min(100, max(0, 30 + (40 if duration < 4 else 0)))
        trailer_potential = 50
        spoiler_level = 0

        # Power word scoring
        for word in POWER_WORDS:
            if word in dialogue_lower:
                emotional_score += 12
                trailer_potential += 8

        # Question = gold (best for trailers)
        if '?' in dialogue_text:
            trailer_potential += 45
            emotional_score += 25

        # Dialect bonus
        if dialect:
            trailer_potential += 10
            emotional_score += 10

        # Spoiler detection
        for word in SPOILER_WORDS:
            if word in dialogue_lower:
                spoiler_level += 4
                trailer_potential -= 25

        # Position-based scoring
        if position > 0.85:  # Last 15% = spoiler zone
            spoiler_level += 5
            trailer_potential -= 35
        elif position < 0.12:  # Opening - good for establishing
            trailer_potential += 12
        elif 0.25 < position < 0.70:  # Conflict zone - best content
            trailer_potential += 18

        # Good dialogue length bonus
        word_count = len(dialogue_text.split())
        if 5 <= word_count <= 20:
            trailer_potential += 10

        # Use LLM to pick best quote
        key_quote = dialogue_text
        if llm and llm._initialized and dialogue_text and len(dialogue_text) > 50:
            key_quote = llm.select_best_quote(dialogue_text)

        # Determine scene type
        if position < 0.08 and not dialogue_text:
            scene_type = "establishing"
        elif '?' in dialogue_text:
            scene_type = "hook"
        elif emotional_score > 40:
            scene_type = "emotional"
        elif action_score > 50:
            scene_type = "action"
        elif dialogue_text:
            scene_type = "dialogue"
        else:
            scene_type = "general"

        scenes.append({
            "scene_id": f"scene_{i+1}",
            "start_time": start,
            "end_time": end,
            "duration": duration,
            "position": position,
            "dialogue": dialogue_text,
            "key_quote": key_quote[:150] if key_quote else None,
            "emotional_score": min(100, max(0, emotional_score)),
            "action_score": action_score,
            "trailer_potential": min(100, max(0, trailer_potential)),
            "spoiler_level": min(10, spoiler_level),
            "scene_type": scene_type,
            "has_dialogue": bool(dialogue_text),
            "is_question": '?' in dialogue_text,
            "dialect": dialect,
            "dialect_confidence": dialect_conf
        })

    # Use LLM to rank scenes
    if llm and llm._initialized:
        ranked_indices = llm.rank_scenes_for_trailer(scenes, top_n=30)
        for rank, idx in enumerate(ranked_indices):
            if idx < len(scenes):
                scenes[idx]["llm_rank"] = rank + 1
                scenes[idx]["trailer_potential"] += max(0, 20 - rank * 2)

    # Sort by trailer potential
    scenes.sort(key=lambda x: x.get("trailer_potential", 0), reverse=True)

    # Log top scenes
    logger.info("Top 5 trailer-worthy scenes:")
    for s in scenes[:5]:
        dial = s.get("key_quote", "")[:50]
        logger.info(f"  {s['scene_id']}: potential={s['trailer_potential']}, type={s['scene_type']}, dial=\"{dial}...\"")

    return scenes


# =============================================================================
# NARRATIVE GENERATION
# =============================================================================

def generate_narratives(scenes: List[Dict], video_duration: float, metadata: Dict, use_llm: bool = True) -> List[Any]:
    """Generate narrative variants using story engine."""
    from narrative.generator import NarrativeGenerator

    logger.info("Generating narrative variants with 5-act structure...")

    llm = get_llm() if use_llm else None

    generator = NarrativeGenerator()
    styles = ["dramatic", "action", "emotional", "mystery", "thriller"]

    variants = generator.generate_all_variants(
        scenes=scenes,
        video_duration=video_duration,
        styles=styles,
        target_duration=metadata.get("targetDuration", 90),
        metadata=metadata
    )

    # Add LLM-generated taglines
    if llm and llm._initialized:
        for v in variants:
            tagline = llm.generate_trailer_tagline(
                style=v.style,
                genre=metadata.get("genre", "Drama"),
                title=metadata.get("title", "Untitled")
            )
            if tagline:
                v.closing_tag = tagline

    for v in variants:
        status = "Production Ready" if v.confidence >= 75 else "Needs Review"
        logger.info(f"  {v.style}: {len(v.shot_sequence)} shots, confidence={v.confidence} [{status}]")

    return variants


# =============================================================================
# TRAILER ASSEMBLY
# =============================================================================

def assemble_trailers(video_path: Path, variants: List, output_dir: Path) -> List:
    """Assemble actual trailer videos."""
    from assembly.assembler import TrailerAssembler

    logger.info("Assembling trailer videos (this may take a few minutes)...")

    trailers_dir = output_dir / "trailers"
    trailers_dir.mkdir(parents=True, exist_ok=True)

    assembler = TrailerAssembler(
        output_format="mp4",
        resolution="1080p",
        include_watermark=False
    )

    outputs = assembler.assemble_all_variants(video_path, variants, trailers_dir)

    logger.info(f"Assembled {len(outputs)} trailer videos")
    for t in outputs:
        logger.info(f"  {t.style}: {t.local_path} ({t.duration:.1f}s, {t.file_size/1024/1024:.1f}MB)")

    return outputs


# =============================================================================
# REPORT GENERATION
# =============================================================================

def generate_report(variants: List, trailer_outputs: List, output_dir: Path, metadata: Dict, processing_time: float, scenes: List[Dict]):
    """Generate comprehensive output reports."""
    narratives_dir = output_dir / "narratives"
    narratives_dir.mkdir(parents=True, exist_ok=True)

    # Detect primary dialect
    dialect_counts = {}
    for s in scenes:
        d = s.get("dialect")
        if d:
            dialect_counts[d] = dialect_counts.get(d, 0) + 1
    primary_dialect = max(dialect_counts, key=dialect_counts.get) if dialect_counts else None

    # JSON report
    json_output = {
        "project": metadata.get("title", "Untitled"),
        "genre": metadata.get("genre", "Unknown"),
        "processing_time_seconds": processing_time,
        "dialect_analysis": {
            "primary_dialect": primary_dialect,
            "dialect_distribution": dialect_counts
        },
        "scene_analysis": {
            "total_scenes": len(scenes),
            "top_scenes": [
                {
                    "scene_id": s["scene_id"],
                    "potential": s["trailer_potential"],
                    "type": s["scene_type"],
                    "quote": s.get("key_quote", "")[:100]
                }
                for s in scenes[:10]
            ]
        },
        "variants": [v.to_dict() for v in variants],
        "trailers": [t.to_dict() for t in trailer_outputs],
        "production_summary": {
            "total_variants": len(variants),
            "production_ready": sum(1 for v in variants if v.confidence >= 75),
            "trailer_videos_generated": len(trailer_outputs),
            "llm_used": get_llm()._initialized
        }
    }

    json_path = narratives_dir / "narrative_report.json"
    with open(json_path, 'w') as f:
        json.dump(json_output, f, indent=2, default=str)

    # Markdown report
    md_lines = [
        f"# Trailer Generation Report",
        f"## {metadata.get('title', 'Untitled')}",
        "",
        f"**Genre:** {metadata.get('genre', 'Unknown')}",
        f"**Processing Time:** {processing_time:.1f} seconds",
        f"**LLM Used:** {'Yes (google/flan-t5-base)' if get_llm()._initialized else 'No (heuristics only)'}",
        f"**Primary Dialect:** {primary_dialect.title() if primary_dialect else 'Standard Hindi'}",
        "",
        "---",
        "",
        "## Generated Trailers",
        ""
    ]

    for t in trailer_outputs:
        md_lines.append(f"### {t.style.title()} Trailer")
        md_lines.append(f"- **File:** `{t.local_path}`")
        md_lines.append(f"- **Duration:** {t.duration:.1f} seconds")
        md_lines.append(f"- **Size:** {t.file_size/1024/1024:.1f} MB")
        md_lines.append("")

    md_lines.extend([
        "---",
        "",
        "## Narrative Analysis",
        ""
    ])

    for v in variants:
        status = "PRODUCTION READY" if v.confidence >= 75 else "Needs Review"
        md_lines.append(f"### {v.style.title()} - {status}")
        md_lines.append(f"- **Confidence:** {v.confidence}%")
        md_lines.append(f"- **Shots:** {len(v.shot_sequence)}")
        md_lines.append(f"- **Duration:** {v.actual_duration:.1f}s")
        md_lines.append(f"- **Structure:** {', '.join(v.structure.get('phases', []))}")
        if v.opening_hook:
            md_lines.append(f"- **Opening:** {v.opening_hook[:80]}...")
        if v.closing_tag:
            md_lines.append(f"- **Tagline:** {v.closing_tag}")
        md_lines.append("")

    md_lines.extend([
        "---",
        "",
        "## Top Trailer-Worthy Scenes",
        ""
    ])

    for i, s in enumerate(scenes[:10], 1):
        quote = s.get("key_quote", "")[:60]
        dialect_tag = f" [{s['dialect']}]" if s.get('dialect') else ""
        md_lines.append(f"{i}. **{s['scene_id']}** (potential: {s['trailer_potential']}){dialect_tag}")
        md_lines.append(f"   - Type: {s['scene_type']}")
        if quote:
            md_lines.append(f"   - Quote: \"{quote}...\"")
        md_lines.append("")

    md_path = narratives_dir / "editor_guide.md"
    with open(md_path, 'w') as f:
        f.write('\n'.join(md_lines))

    logger.info(f"Reports saved to: {narratives_dir}")
    return json_path, md_path


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="FAST Trailer Generator with LLM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python fast_trailer.py /path/to/movie.mp4 --title "My Movie"
  python fast_trailer.py /path/to/movie.mp4 --subtitle /path/to/subs.srt
  python fast_trailer.py /path/to/movie.mp4 --no-llm  # Skip LLM, use heuristics only
        """
    )
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--subtitle", "-s", help="Path to subtitle file (SRT/VTT)")
    parser.add_argument("--title", "-t", default="Untitled", help="Movie title")
    parser.add_argument("--genre", "-g", default="Drama", help="Movie genre")
    parser.add_argument("--duration", "-d", type=int, default=90, help="Target trailer duration (seconds)")
    parser.add_argument("--output", "-o", help="Output directory")
    parser.add_argument("--no-video", action="store_true", help="Skip video assembly (reports only)")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM, use heuristics only")

    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        logger.error(f"Video not found: {video_path}")
        sys.exit(1)

    subtitle_path = Path(args.subtitle) if args.subtitle else None
    output_dir = Path(args.output) if args.output else Path(f"./output/{video_path.stem}")
    output_dir.mkdir(parents=True, exist_ok=True)

    metadata = {
        "title": args.title,
        "genre": args.genre,
        "targetDuration": args.duration
    }

    use_llm = not args.no_llm

    logger.info("=" * 60)
    logger.info("FAST TRAILER GENERATOR WITH LLM")
    logger.info("=" * 60)
    logger.info(f"Video: {video_path.name}")
    logger.info(f"Title: {args.title}")
    logger.info(f"Genre: {args.genre}")
    logger.info(f"LLM: {'Enabled' if use_llm else 'Disabled'}")
    logger.info(f"Output: {output_dir}")
    logger.info("=" * 60)

    start_time = time.time()

    try:
        # Step 1: Initialize LLM (if enabled)
        if use_llm:
            logger.info("\n[1/5] Initializing LLM (google/flan-t5-base)...")
            llm = get_llm()
            if not llm.initialize():
                logger.warning("LLM not available, falling back to heuristics")
                use_llm = False
        else:
            logger.info("\n[1/5] LLM disabled, using heuristics...")

        # Step 2: Scene Detection
        logger.info("\n[2/5] Detecting scenes...")
        scene_result = detect_scenes(video_path)

        # Step 3: Parse Subtitles
        logger.info("\n[3/5] Processing dialogue...")
        dialogue_segments = []
        if subtitle_path:
            dialogue_segments = parse_subtitles(subtitle_path)
        else:
            logger.info("No subtitles - using visual-only analysis")

        # Step 4: Analyze Scenes with LLM
        logger.info("\n[4/5] Analyzing scenes" + (" with LLM..." if use_llm else "..."))
        scenes = build_scene_data(scene_result, dialogue_segments, use_llm=use_llm)

        # Step 5: Generate Narratives
        logger.info("\n[5/5] Generating narrative variants...")
        variants = generate_narratives(scenes, scene_result.video_duration, metadata, use_llm=use_llm)

        # Step 6: Assemble Trailers
        trailer_outputs = []
        if not args.no_video:
            logger.info("\n[6/6] Assembling trailer videos...")
            trailer_outputs = assemble_trailers(video_path, variants, output_dir)

        # Generate Reports
        processing_time = time.time() - start_time
        json_path, md_path = generate_report(
            variants, trailer_outputs, output_dir, metadata, processing_time, scenes
        )

        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("COMPLETE!")
        logger.info("=" * 60)
        logger.info(f"Processing Time: {processing_time:.1f} seconds")
        logger.info(f"LLM Used: {'Yes' if get_llm()._initialized else 'No'}")
        logger.info(f"Variants: {len(variants)} ({sum(1 for v in variants if v.confidence >= 75)} production-ready)")
        logger.info(f"Trailers: {len(trailer_outputs)}")
        logger.info("")
        logger.info("Output Files:")
        logger.info(f"  JSON Report: {json_path}")
        logger.info(f"  Editor Guide: {md_path}")
        for t in trailer_outputs:
            logger.info(f"  Trailer ({t.style}): {t.local_path}")
        logger.info("=" * 60)

        return 0

    except KeyboardInterrupt:
        logger.warning("\nInterrupted by user")
        return 130
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
