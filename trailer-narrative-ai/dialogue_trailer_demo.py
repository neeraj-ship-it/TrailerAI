#!/usr/bin/env python3
"""Demo: Dialogue-First Trailer Generation.

This script demonstrates the new dialogue-centric approach to trailer generation.
It uses a local LLM (Ollama) to intelligently select and order dialogues.

Requirements:
    1. Install Ollama: https://ollama.ai
    2. Pull a model: ollama pull mistral (or llama3.2, phi3)
    3. Install dependencies: pip install ollama loguru

Usage:
    # With a video file (extracts dialogues using Whisper)
    python dialogue_trailer_demo.py --video /path/to/movie.mp4

    # With a subtitle file (faster, no Whisper needed)
    python dialogue_trailer_demo.py --subtitle /path/to/movie.srt

    # With sample data (no files needed)
    python dialogue_trailer_demo.py --demo

    # Specify model
    python dialogue_trailer_demo.py --demo --model llama3.2
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict

from loguru import logger

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from narrative.dialogue_narrative_engine import (
    DialogueNarrativeEngine,
    build_dialogue_narrative
)
from narrative.dialogue_pipeline import (
    DialogueFirstPipeline,
    build_dialogue_trailers
)


# Sample Hindi movie dialogues for demo
SAMPLE_DIALOGUES = [
    {"text": "Kya tum jaante ho main kaun hoon?", "start_time": 45.0, "end_time": 48.5},
    {"text": "Yeh duniya bahut zalim hai beta, par hum haar nahi manenge", "start_time": 120.3, "end_time": 125.8},
    {"text": "Maa, main tumhe kabhi akela nahi chhodunga", "start_time": 180.5, "end_time": 184.2},
    {"text": "Tu mera dushman hai, aur dushman ko maine kabhi maaf nahi kiya", "start_time": 350.0, "end_time": 355.5},
    {"text": "Pyaar mein sab kuch jayaz hai", "start_time": 420.8, "end_time": 423.9},
    {"text": "Kya tum mujhse pyaar karti ho?", "start_time": 580.2, "end_time": 583.1},
    {"text": "Main tumhare bina nahi reh sakti", "start_time": 620.5, "end_time": 624.0},
    {"text": "Yeh ladai ab sirf meri nahi, poore gaon ki hai", "start_time": 890.3, "end_time": 895.7},
    {"text": "Sach aur jhooth mein sirf ek hi farak hai - himmat", "start_time": 1020.0, "end_time": 1025.5},
    {"text": "Kya tum tayyar ho apni zindagi badalne ke liye?", "start_time": 1150.8, "end_time": 1155.2},
    {"text": "Jab tak jaan hai, tab tak jung hai", "start_time": 1280.5, "end_time": 1284.0},
    {"text": "Mujhe tumse kuch kehna hai... kal se pehle", "start_time": 1420.3, "end_time": 1425.8},
    {"text": "Kya yeh sab sach hai? Ya bas ek sapna?", "start_time": 1580.0, "end_time": 1584.5},
    {"text": "Har insaan ke andar ek hero chhupa hota hai", "start_time": 1720.5, "end_time": 1725.8},
    {"text": "Kya hoga kal? Kaun jaanta hai...", "start_time": 1890.0, "end_time": 1894.2},
    {"text": "Main haar nahi manunga, chahe kuch bhi ho jaye", "start_time": 2050.3, "end_time": 2055.5},
    {"text": "Tumhari aankhon mein jo sapne hain, woh poore honge", "start_time": 2180.8, "end_time": 2186.0},
    {"text": "Kya tum mere saath chalogi?", "start_time": 2350.0, "end_time": 2353.5},
    {"text": "Yeh kahani abhi khatam nahi hui hai", "start_time": 2520.5, "end_time": 2524.8},
    {"text": "Ek naya din, ek nayi ummeed", "start_time": 2680.3, "end_time": 2684.0},
]


def load_subtitles(subtitle_path: Path) -> List[Dict]:
    """Load dialogues from subtitle file (SRT/VTT)."""
    from input.subtitle_parser import SubtitleParser

    parser = SubtitleParser()
    result = parser.parse(str(subtitle_path))

    dialogues = []
    for seg in result.segments:
        dialogues.append({
            "text": seg.text,
            "start_time": seg.start_time,
            "end_time": seg.end_time
        })

    return dialogues


def extract_dialogues_from_video(video_path: Path) -> List[Dict]:
    """Extract dialogues from video using Whisper ASR."""
    from analysis.indian_asr import IndianDialectASR

    logger.info("Extracting dialogues from video using Whisper...")
    logger.info("This may take a few minutes depending on video length.")

    asr = IndianDialectASR(
        model_name="whisper_small",  # Use small for speed, medium for quality
        enable_dialect_detection=True
    )

    result = asr.transcribe(video_path)

    dialogues = []
    for seg in result.segments:
        dialogues.append({
            "text": seg.text,
            "start_time": seg.start_time,
            "end_time": seg.end_time
        })

    return dialogues


def demo_dialogue_narrative():
    """Run demo with sample dialogues."""
    logger.info("=" * 60)
    logger.info("DEMO: Dialogue-First Trailer Generation")
    logger.info("=" * 60)

    # Use sample dialogues
    dialogues = SAMPLE_DIALOGUES
    video_duration = 3600.0  # 1 hour movie

    logger.info(f"Processing {len(dialogues)} sample dialogues...")
    logger.info(f"Video duration: {video_duration/60:.0f} minutes")

    # Build narrative using the engine
    narrative = build_dialogue_narrative(
        dialogues=dialogues,
        video_duration=video_duration,
        style="dramatic",
        target_duration=90,
        metadata={
            "title": "Sample Hindi Movie",
            "genre": "Drama/Action"
        }
    )

    # Print results
    logger.info("\n" + "=" * 60)
    logger.info("NARRATIVE RESULT")
    logger.info("=" * 60)

    logger.info(f"Style: {narrative.style}")
    logger.info(f"Confidence: {narrative.confidence}")
    logger.info(f"Characters Found: {len(narrative.characters)}")

    logger.info("\nCHARACTERS:")
    for char in narrative.characters:
        logger.info(f"  - {char.name} ({char.role}): {char.description[:50]}...")

    logger.info(f"\nSTORY PREMISE: {narrative.story_premise}")

    logger.info("\nSELECTED DIALOGUE SEQUENCE:")
    total_duration = 0
    for seq in narrative.sequences:
        logger.info(
            f"  [{seq.phase.value:15}] "
            f"[{seq.scene_timestamp[0]:7.1f}s - {seq.scene_timestamp[1]:7.1f}s] "
            f"({seq.duration_in_trailer:.1f}s) "
            f"\"{seq.dialogue.text[:50]}...\""
        )
        total_duration += seq.duration_in_trailer

    logger.info(f"\nTotal Trailer Duration: {total_duration:.1f}s")
    logger.info(f"Opening Hook: {narrative.opening_hook[:60]}...")
    logger.info(f"Closing Hook: {narrative.closing_hook[:60]}...")

    if narrative.llm_reasoning:
        logger.info(f"\nLLM REASONING: {narrative.llm_reasoning[:200]}...")

    return narrative


def demo_multiple_styles():
    """Generate multiple trailer styles."""
    logger.info("\n" + "=" * 60)
    logger.info("GENERATING MULTIPLE TRAILER STYLES")
    logger.info("=" * 60)

    variants = build_dialogue_trailers(
        dialogue_segments=SAMPLE_DIALOGUES,
        video_duration=3600.0,
        styles=["dramatic", "emotional", "mystery"],
        target_duration=90,
        metadata={
            "title": "Sample Hindi Movie",
            "genre": "Drama"
        }
    )

    for variant in variants:
        logger.info(f"\n{'='*40}")
        logger.info(f"STYLE: {variant.style.upper()}")
        logger.info(f"{'='*40}")
        logger.info(f"Beats: {len(variant.beats)}")
        logger.info(f"Quality: {variant.structure_quality}")
        logger.info(f"Hook Strength: {variant.hook_strength}")

        if variant.cliffhanger_question:
            logger.info(f"Cliffhanger: {variant.cliffhanger_question}")

        logger.info("\nBeat Sequence:")
        for beat in variant.beats:
            logger.info(
                f"  {beat.order:2d}. [{beat.phase:15}] "
                f"{beat.start_time:7.1f}s - {beat.dialogue_text[:40]}..."
            )

    return variants


def process_video(video_path: Path, model: str = "mistral"):
    """Process a video file to generate trailer narratives."""
    logger.info(f"Processing video: {video_path}")

    # Extract dialogues
    dialogues = extract_dialogues_from_video(video_path)
    logger.info(f"Extracted {len(dialogues)} dialogue segments")

    # Get video duration
    from input.video_loader import VideoLoader
    loader = VideoLoader(video_path)
    video_duration = loader.metadata.duration

    # Generate trailers
    variants = build_dialogue_trailers(
        dialogue_segments=dialogues,
        video_duration=video_duration,
        styles=["dramatic", "emotional"],
        target_duration=90,
        metadata={"title": video_path.stem},
        model=model
    )

    return variants


def process_subtitles(subtitle_path: Path, model: str = "mistral"):
    """Process a subtitle file to generate trailer narratives."""
    logger.info(f"Processing subtitles: {subtitle_path}")

    # Load dialogues from subtitles
    dialogues = load_subtitles(subtitle_path)
    logger.info(f"Loaded {len(dialogues)} dialogue segments")

    # Estimate video duration from last dialogue
    video_duration = dialogues[-1]["end_time"] + 300 if dialogues else 3600

    # Generate trailers
    variants = build_dialogue_trailers(
        dialogue_segments=dialogues,
        video_duration=video_duration,
        styles=["dramatic", "emotional", "mystery"],
        target_duration=90,
        metadata={"title": subtitle_path.stem},
        model=model
    )

    return variants


def main():
    parser = argparse.ArgumentParser(
        description="Dialogue-First Trailer Generation Demo"
    )
    parser.add_argument(
        "--video",
        type=Path,
        help="Video file path (will extract dialogues using Whisper)"
    )
    parser.add_argument(
        "--subtitle",
        type=Path,
        help="Subtitle file path (SRT/VTT - faster than video)"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run demo with sample dialogues (no files needed)"
    )
    parser.add_argument(
        "--model",
        default="mistral",
        help="Ollama model to use (mistral, llama3.2, phi3)"
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output JSON file for results"
    )

    args = parser.parse_args()

    # Configure logging
    logger.remove()
    logger.add(
        sys.stderr,
        format="<green>{time:HH:mm:ss}</green> | <level>{level:7}</level> | <level>{message}</level>",
        level="INFO"
    )

    # Run appropriate mode
    if args.demo:
        narrative = demo_dialogue_narrative()
        variants = demo_multiple_styles()

    elif args.video:
        if not args.video.exists():
            logger.error(f"Video file not found: {args.video}")
            sys.exit(1)
        variants = process_video(args.video, args.model)

    elif args.subtitle:
        if not args.subtitle.exists():
            logger.error(f"Subtitle file not found: {args.subtitle}")
            sys.exit(1)
        variants = process_subtitles(args.subtitle, args.model)

    else:
        logger.info("No input specified. Running demo mode...")
        logger.info("Use --help to see all options")
        narrative = demo_dialogue_narrative()
        variants = demo_multiple_styles()

    # Save output if requested
    if args.output and variants:
        output_data = []
        for v in variants:
            output_data.append({
                "style": v.style,
                "beats": [
                    {
                        "order": b.order,
                        "phase": b.phase,
                        "dialogue": b.dialogue_text,
                        "start_time": b.start_time,
                        "end_time": b.end_time,
                        "duration": b.duration
                    }
                    for b in v.beats
                ],
                "cliffhanger": v.cliffhanger_question,
                "quality": v.structure_quality
            })

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to: {args.output}")

    logger.info("\n" + "=" * 60)
    logger.info("DEMO COMPLETE")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
