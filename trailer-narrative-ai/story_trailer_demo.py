#!/usr/bin/env python3
"""Demo: Story-Driven Trailer Generation with Deep Analysis.

This demo shows how the new deep story analyzer works:
1. Analyzes ALL dialogues to understand complete story
2. Extracts character NAMES from dialogue content
3. Identifies relationships (allies, antagonists, family)
4. Builds coherent trailer narrative with continuity
5. Creates proper character introductions
6. Ends with compelling cliffhanger

Requirements:
    1. Install Ollama: https://ollama.ai
    2. Pull a model: ollama pull mistral (or llama3.2)
    3. pip install ollama loguru

Usage:
    python story_trailer_demo.py --demo        # Sample Jholachaap dialogues
    python story_trailer_demo.py --subtitle movie.srt
    python story_trailer_demo.py --model llama3.2 --demo
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict

from loguru import logger

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from narrative.deep_story_analyzer import DeepStoryAnalyzer, analyze_story_deeply
from narrative.story_driven_pipeline import StoryDrivenPipeline, build_story_driven_trailer


# Sample dialogues simulating a "Jholachaap" style movie
# A story about a fake/quack doctor in a village
JHOLACHAAP_SAMPLE_DIALOGUES = [
    # Opening - Village establishment
    {"text": "Yeh gaon toh bahut door hai sheher se", "start_time": 30.0, "end_time": 33.5},
    {"text": "Yahan ka sabse bada hospital bhi 50 kilometer door hai", "start_time": 45.0, "end_time": 49.5},

    # Protagonist introduction - Ramu the fake doctor
    {"text": "Ramu bhaiya aaj bhi late ho gaye clinic mein", "start_time": 120.0, "end_time": 124.0},
    {"text": "Main Ramu... Doctor Ramu... gaon ka akela doctor", "start_time": 150.0, "end_time": 155.0},
    {"text": "Padhai toh nahi ki maine, par logo ki seva karna seekha hai", "start_time": 180.0, "end_time": 186.0},

    # Ramu helping villagers
    {"text": "Doctor sahab, mere bachche ko bahut tez bukhar hai", "start_time": 250.0, "end_time": 254.5},
    {"text": "Chinta mat karo Kamla, yeh dawai do, subah tak theek ho jayega", "start_time": 260.0, "end_time": 265.0},
    {"text": "Ramu bhaiya ne meri maa ki jaan bachai thi pichhle saal", "start_time": 320.0, "end_time": 325.0},

    # Village elder support
    {"text": "Sarpanch ji, Ramu humare gaon ki shaan hai", "start_time": 400.0, "end_time": 404.0},
    {"text": "Bina Ramu ke yeh gaon kaise chalega", "start_time": 420.0, "end_time": 423.5},

    # Ramu's backstory
    {"text": "Maa, main doctor nahi hoon... jhootha hoon main", "start_time": 500.0, "end_time": 505.0},
    {"text": "Beta, jo kaam tu karta hai, woh asli doctor bhi nahi karte", "start_time": 510.0, "end_time": 515.5},
    {"text": "Tu logo ki seva karta hai, yahi teri degree hai", "start_time": 520.0, "end_time": 525.0},

    # Love interest introduction
    {"text": "Meera ji, aap sheher se aai hain?", "start_time": 600.0, "end_time": 603.5},
    {"text": "Main Meera, PHC mein nayi nurse hoon", "start_time": 610.0, "end_time": 614.0},
    {"text": "Ramu ji, aap doctor hain ya nahi?", "start_time": 650.0, "end_time": 653.5},
    {"text": "Kya farak padta hai agar main logo ko theek kar deta hoon?", "start_time": 660.0, "end_time": 665.0},

    # Conflict introduction - Real doctor arrives
    {"text": "Main Dr. Sharma, sheher se aaya hoon is gaon mein", "start_time": 800.0, "end_time": 805.0},
    {"text": "Sunna hai yahan ek jholachaap doctor rehta hai", "start_time": 820.0, "end_time": 824.5},
    {"text": "Bina degree ke ilaaj karna crime hai!", "start_time": 850.0, "end_time": 854.0},
    {"text": "Is Ramu ko jail bhijna chahiye", "start_time": 870.0, "end_time": 873.5},

    # Village defense
    {"text": "Dr. Sharma sahab, Ramu ko mat chedo", "start_time": 920.0, "end_time": 924.0},
    {"text": "Jab sheher ke doctor yahan nahi aate the, tab Ramu ne humari madad ki", "start_time": 930.0, "end_time": 936.5},
    {"text": "Tum log andhe ho! Woh nakli doctor hai!", "start_time": 950.0, "end_time": 954.5},

    # Ramu's dilemma
    {"text": "Meera, mujhe sach batana chahiye sabko?", "start_time": 1000.0, "end_time": 1004.5},
    {"text": "Sach se zyada important hai ki tum logo ki madad karte ho", "start_time": 1010.0, "end_time": 1016.0},
    {"text": "Par agar koi mar gaya mere ilaaj se?", "start_time": 1030.0, "end_time": 1034.5},

    # Rising tension - Medical emergency
    {"text": "Doctor sahab! Sarpanch ji ko heart attack aa gaya!", "start_time": 1200.0, "end_time": 1205.5},
    {"text": "Hospital bahut door hai, unhe bachana mushkil hai", "start_time": 1220.0, "end_time": 1225.0},
    {"text": "Ramu, tujhe kuch karna hoga", "start_time": 1250.0, "end_time": 1253.5},
    {"text": "Main... main yeh nahi kar sakta... yeh mere bas ki baat nahi", "start_time": 1260.0, "end_time": 1266.0},

    # Dr. Sharma's challenge
    {"text": "Dekho, tumhara jholachaap doctor kuch nahi kar sakta", "start_time": 1300.0, "end_time": 1305.0},
    {"text": "Asli doctor ki zaroorat hai, nakli ki nahi", "start_time": 1320.0, "end_time": 1324.5},
    {"text": "Ramu, tujhe prove karna hoga ki tu asli hai ya nakli", "start_time": 1350.0, "end_time": 1356.0},

    # Emotional confrontation
    {"text": "Haan, main jholachaap hoon! Degree nahi hai mere paas!", "start_time": 1450.0, "end_time": 1456.0},
    {"text": "Par dil hai... aur yeh gaon mera apna hai", "start_time": 1460.0, "end_time": 1465.0},
    {"text": "Tum sheher walon ko kya pata gaon ki takleef?", "start_time": 1480.0, "end_time": 1485.5},

    # Meera's support
    {"text": "Ramu, main tumhari madad karungi", "start_time": 1550.0, "end_time": 1554.0},
    {"text": "Agar tum sahi ho, toh main tumhare saath hoon", "start_time": 1560.0, "end_time": 1565.5},

    # Stakes raised
    {"text": "Agar Sarpanch ji ko kuch hua, toh tum zimmedar hoge Ramu", "start_time": 1650.0, "end_time": 1656.0},
    {"text": "Yeh gaon tujhe kabhi maaf nahi karega", "start_time": 1670.0, "end_time": 1674.5},
    {"text": "Main maaf nahi chahunga... main unhe bachaunga", "start_time": 1680.0, "end_time": 1685.5},

    # Critical moment questions
    {"text": "Kya Ramu asli doctor ban payega?", "start_time": 1750.0, "end_time": 1754.0},
    {"text": "Kya ek jholachaap zindagi bacha sakta hai?", "start_time": 1780.0, "end_time": 1785.0},
    {"text": "Jab degree nahi, toh vishwas kaun karega?", "start_time": 1820.0, "end_time": 1825.5},

    # Climax buildup (but not resolution - we shouldn't use these)
    {"text": "Sarpanch ji ki saans ruk rahi hai!", "start_time": 1900.0, "end_time": 1904.0},
    {"text": "Ramu... ab tere haath mein hai sab", "start_time": 1920.0, "end_time": 1924.5},

    # These would be spoilers - ending zone
    {"text": "Sarpanch ji bach gaye!", "start_time": 2200.0, "end_time": 2203.5},
    {"text": "Ramu, tu asli doctor hai", "start_time": 2250.0, "end_time": 2253.5},
]


def load_subtitles(subtitle_path: Path) -> List[Dict]:
    """Load dialogues from subtitle file."""
    try:
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
    except Exception as e:
        logger.error(f"Failed to load subtitles: {e}")
        return []


def demo_deep_analysis():
    """Run demo with Jholachaap sample dialogues."""
    logger.info("=" * 70)
    logger.info("DEEP STORY ANALYSIS DEMO: Jholachaap (Fake Doctor)")
    logger.info("=" * 70)

    dialogues = JHOLACHAAP_SAMPLE_DIALOGUES
    video_duration = 2400.0  # 40 minute movie

    logger.info(f"Processing {len(dialogues)} dialogues...")
    logger.info(f"Video duration: {video_duration/60:.0f} minutes")
    logger.info("")

    # Build story-driven trailer (auto-selects Ollama or HuggingFace)
    trailer = build_story_driven_trailer(
        dialogues=dialogues,
        video_duration=video_duration,
        metadata={
            "title": "Jholachaap",
            "genre": "Drama",
            "language": "Hindi"
        },
        target_duration=90,
        model="auto",  # Auto-select backend
        hf_model="qwen2.5-1.5b"  # HuggingFace model (auto-downloads)
    )

    # Print detailed summary
    print_trailer_analysis(trailer)

    return trailer


def print_trailer_analysis(trailer):
    """Print comprehensive trailer analysis."""
    print("\n" + "=" * 70)
    print(f"🎬 TRAILER ANALYSIS: {trailer.title}")
    print("=" * 70)

    print("\n📖 STORY UNDERSTANDING:")
    print(f"   Logline: {trailer.story_logline}")
    print(f"   Conflict: {trailer.central_conflict}")
    print(f"   Hook: {trailer.hook_question}")

    print("\n👤 PROTAGONIST:")
    print(f"   Name: {trailer.protagonist_name}")
    print(f"   Description: {trailer.protagonist_description}")

    if trailer.antagonist_name:
        print(f"\n👿 ANTAGONIST:")
        print(f"   Name: {trailer.antagonist_name}")

    print("\n👥 ALL CHARACTERS:")
    for c in trailer.all_characters:
        role_emoji = {
            "protagonist": "⭐",
            "antagonist": "👿",
            "ally": "🤝",
            "family": "👨‍👩‍👧",
            "authority": "👔"
        }.get(c['role'], "👤")
        print(f"   {role_emoji} {c['name']} ({c['role']})")
        print(f"      Relationship: {c['relationship']}")

    print(f"\n🎬 TRAILER SEQUENCE ({len(trailer.beats)} scenes, {trailer.total_duration:.0f}s):")
    print("-" * 70)

    for beat in trailer.beats:
        phase_emoji = {
            "opening_hook": "🎣",
            "protagonist_intro": "⭐",
            "world_setup": "🌍",
            "ally_intro": "🤝",
            "conflict_intro": "⚔️",
            "tension_1": "📈",
            "tension_2": "📈",
            "emotional_peak": "💔",
            "cliffhanger": "❓"
        }.get(beat.phase, "🎬")

        print(f"\n{beat.order}. {phase_emoji} [{beat.phase.upper()}] ({beat.duration_in_trailer:.0f}s)")
        print(f"   🗣️  {beat.speaker_name}" + (f" → {beat.speaking_to}" if beat.speaking_to else ""))

        # Format dialogue
        dial = beat.dialogue_text
        if len(dial) > 65:
            print(f"   💬 \"{dial[:65]}...\"")
        else:
            print(f"   💬 \"{dial}\"")

        if beat.context:
            print(f"   📍 Context: {beat.context}")
        if beat.emotion:
            print(f"   😢 Emotion: {beat.emotion}")
        if beat.follows_from and beat.leads_to:
            print(f"   ➡️  {beat.follows_from} → {beat.leads_to}")

    print("\n" + "-" * 70)
    print(f"\n📊 ANALYSIS QUALITY: {trailer.confidence}/100")

    print("\n📝 NARRATIVE FLOW:")
    for line in trailer.narrative_flow.split("\n")[:10]:
        print(f"   {line}")

    print("\n" + "=" * 70)


def demo_with_custom_dialogues(dialogues: List[Dict], title: str, model: str, hf_model: str):
    """Run demo with custom dialogues."""
    logger.info(f"Processing {len(dialogues)} dialogues for: {title}")

    # Estimate video duration
    video_duration = dialogues[-1]["end_time"] + 300 if dialogues else 3600

    trailer = build_story_driven_trailer(
        dialogues=dialogues,
        video_duration=video_duration,
        metadata={"title": title},
        target_duration=90,
        model=model,
        hf_model=hf_model
    )

    print_trailer_analysis(trailer)
    return trailer


def main():
    parser = argparse.ArgumentParser(
        description="Story-Driven Trailer Generation Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python story_trailer_demo.py --demo
  python story_trailer_demo.py --subtitle movie.srt
  python story_trailer_demo.py --demo --model llama3.2

This demo shows:
  1. Deep story analysis from dialogues
  2. Character extraction with ACTUAL NAMES
  3. Relationship identification
  4. Coherent narrative building
  5. Proper character introductions
  6. Story continuity in trailer
"""
    )

    parser.add_argument(
        "--demo", action="store_true",
        help="Run with sample Jholachaap dialogues"
    )
    parser.add_argument(
        "--subtitle", type=Path,
        help="Path to subtitle file (SRT/VTT)"
    )
    parser.add_argument(
        "--model", default="auto",
        help="LLM backend: 'auto' (recommended), or Ollama model name"
    )
    parser.add_argument(
        "--hf-model", default="qwen2.5-1.5b",
        dest="hf_model",
        help="HuggingFace model: qwen2.5-1.5b (default), qwen2.5-3b, phi3-mini, tinyllama"
    )
    parser.add_argument(
        "--output", type=Path,
        help="Save analysis to JSON file"
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
        trailer = demo_deep_analysis()

    elif args.subtitle:
        if not args.subtitle.exists():
            logger.error(f"Subtitle file not found: {args.subtitle}")
            sys.exit(1)
        dialogues = load_subtitles(args.subtitle)
        if not dialogues:
            logger.error("Failed to load dialogues from subtitle")
            sys.exit(1)
        trailer = demo_with_custom_dialogues(
            dialogues, args.subtitle.stem, args.model, args.hf_model
        )

    else:
        logger.info("No input specified. Running demo mode...")
        logger.info("Use --help for options")
        trailer = demo_deep_analysis()

    # Save output if requested
    if args.output and trailer:
        output_data = {
            "title": trailer.title,
            "story": {
                "logline": trailer.story_logline,
                "conflict": trailer.central_conflict,
                "hook_question": trailer.hook_question
            },
            "protagonist": {
                "name": trailer.protagonist_name,
                "description": trailer.protagonist_description
            },
            "antagonist": trailer.antagonist_name,
            "characters": trailer.all_characters,
            "beats": [
                {
                    "order": b.order,
                    "phase": b.phase,
                    "speaker": b.speaker_name,
                    "dialogue": b.dialogue_text,
                    "start_time": b.start_time,
                    "end_time": b.end_time,
                    "duration": b.duration_in_trailer,
                    "context": b.context,
                    "emotion": b.emotion
                }
                for b in trailer.beats
            ],
            "confidence": trailer.confidence
        }

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Analysis saved to: {args.output}")

    print("\n✅ Demo complete!")
    print("\nTo use with your own movie:")
    print("  python story_trailer_demo.py --subtitle your_movie.srt")


if __name__ == "__main__":
    main()
