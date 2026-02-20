#!/usr/bin/env python3
"""Demo: Character-Centric Trailer Builder.

This demo shows the NEW approach:
1. Maps ALL characters with names from dialogues
2. Categorizes EVERY dialogue by narrative function
3. Builds MULTIPLE DISTINCT variants:
   - Hero's Journey: Character → Desire → Obstacle → Hope
   - Mystery: Question → Hints → Revelation → Bigger Question
   - Conflict: Two Forces → Clash → Stakes → Unresolved
4. Scores each variant for quality

Usage:
    python character_trailer_demo.py --demo
    python character_trailer_demo.py --subtitle movie.srt
    python character_trailer_demo.py --demo --hf-model qwen2.5-3b
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict

from loguru import logger

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from narrative.character_trailer_builder import (
    CharacterTrailerBuilder,
    build_character_trailers,
    TrailerVariant
)


# Sample dialogues simulating "Jholachaap" - story of a fake doctor
JHOLACHAAP_SAMPLE_DIALOGUES = [
    # Opening - Village establishment
    {"text": "Yeh gaon toh bahut door hai sheher se", "start_time": 30.0, "end_time": 33.5},
    {"text": "Yahan ka sabse bada hospital bhi 50 kilometer door hai", "start_time": 45.0, "end_time": 49.5},

    # Protagonist introduction - Ramu the fake doctor
    {"text": "Ramu bhaiya aaj bhi late ho gaye clinic mein", "start_time": 120.0, "end_time": 124.0},
    {"text": "Main Ramu... Doctor Ramu... gaon ka akela doctor hoon", "start_time": 150.0, "end_time": 155.0},
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
    {"text": "Main Meera hoon, PHC mein nayi nurse", "start_time": 610.0, "end_time": 614.0},
    {"text": "Ramu ji, aap doctor hain ya nahi?", "start_time": 650.0, "end_time": 653.5},
    {"text": "Kya farak padta hai agar main logo ko theek kar deta hoon?", "start_time": 660.0, "end_time": 665.0},

    # Conflict introduction - Real doctor arrives
    {"text": "Main Dr. Sharma hoon, sheher se aaya hoon is gaon mein", "start_time": 800.0, "end_time": 805.0},
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

    # Climax buildup (but not resolution)
    {"text": "Sarpanch ji ki saans ruk rahi hai!", "start_time": 1900.0, "end_time": 1904.0},
    {"text": "Ramu... ab tere haath mein hai sab", "start_time": 1920.0, "end_time": 1924.5},
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


def run_demo(hf_model: str = "qwen2.5-1.5b"):
    """Run demo with Jholachaap sample dialogues."""
    logger.info("=" * 70)
    logger.info("CHARACTER-CENTRIC TRAILER DEMO: Jholachaap")
    logger.info("=" * 70)

    dialogues = JHOLACHAAP_SAMPLE_DIALOGUES
    logger.info(f"Processing {len(dialogues)} dialogues...")

    # Build trailers
    builder = CharacterTrailerBuilder(hf_model=hf_model)
    variants = builder.build_trailers(
        dialogues=dialogues,
        metadata={
            "title": "Jholachaap",
            "genre": "Drama",
            "language": "Hindi"
        },
        target_duration=90,
        num_variants=3
    )

    # Print all variants
    print("\n" + "=" * 70)
    print("                    TRAILER VARIANTS GENERATED")
    print("=" * 70)

    for i, variant in enumerate(variants, 1):
        print(f"\n{'='*70}")
        print(f"                    VARIANT {i} of {len(variants)}")
        builder.print_variant(variant)

    # Print comparison summary
    print("\n" + "=" * 70)
    print("                    VARIANT COMPARISON")
    print("=" * 70)
    print(f"\n{'Variant':<25} {'Coherence':<12} {'Emotional':<12} {'Hook':<10}")
    print("-" * 60)
    for v in variants:
        print(f"{v.variant_name:<25} {v.coherence_score:<12} {v.emotional_impact:<12} {v.hook_strength:<10}")

    # Recommend best
    best = variants[0]
    print(f"\n🏆 RECOMMENDED: {best.variant_name} (Coherence: {best.coherence_score}/100)")

    return variants


def run_with_subtitles(subtitle_path: Path, hf_model: str):
    """Run with custom subtitle file."""
    logger.info(f"Loading subtitles from: {subtitle_path}")

    dialogues = load_subtitles(subtitle_path)
    if not dialogues:
        logger.error("No dialogues loaded")
        return []

    logger.info(f"Loaded {len(dialogues)} dialogues")

    builder = CharacterTrailerBuilder(hf_model=hf_model)
    variants = builder.build_trailers(
        dialogues=dialogues,
        metadata={"title": subtitle_path.stem},
        target_duration=90,
        num_variants=3
    )

    for i, variant in enumerate(variants, 1):
        print(f"\n{'='*70}")
        print(f"                    VARIANT {i}")
        builder.print_variant(variant)

    return variants


def main():
    parser = argparse.ArgumentParser(
        description="Character-Centric Trailer Builder Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python character_trailer_demo.py --demo
  python character_trailer_demo.py --subtitle movie.srt
  python character_trailer_demo.py --demo --hf-model qwen2.5-3b

This NEW approach:
  1. Maps ALL characters by NAME from dialogues
  2. Categorizes EVERY dialogue by narrative function
  3. Builds 3 DISTINCT trailer variants:
     - Hero's Journey (character-focused)
     - Mystery (question-driven)
     - Conflict (drama-focused)
  4. Scores each variant for quality
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
        "--hf-model", default="qwen2.5-1.5b",
        dest="hf_model",
        help="HuggingFace model: qwen2.5-1.5b (default), qwen2.5-3b, tinyllama"
    )
    parser.add_argument(
        "--output", type=Path,
        help="Save results to JSON file"
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
        variants = run_demo(args.hf_model)
    elif args.subtitle:
        if not args.subtitle.exists():
            logger.error(f"Subtitle file not found: {args.subtitle}")
            sys.exit(1)
        variants = run_with_subtitles(args.subtitle, args.hf_model)
    else:
        logger.info("No input specified. Running demo mode...")
        variants = run_demo(args.hf_model)

    # Save output if requested
    if args.output and variants:
        output_data = {
            "variants": [
                {
                    "type": v.variant_type,
                    "name": v.variant_name,
                    "description": v.description,
                    "protagonist": v.protagonist_name,
                    "antagonist": v.antagonist_name,
                    "allies": v.allies,
                    "sequence": v.sequence,
                    "hook": v.hook,
                    "cliffhanger": v.cliffhanger,
                    "scores": {
                        "coherence": v.coherence_score,
                        "emotional": v.emotional_impact,
                        "hook": v.hook_strength
                    },
                    "duration": v.total_duration
                }
                for v in variants
            ]
        }

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to: {args.output}")

    print("\n" + "=" * 70)
    print("Demo complete!")
    print("\nTo use with your own movie:")
    print("  python character_trailer_demo.py --subtitle your_movie.srt")
    print("=" * 70)


if __name__ == "__main__":
    main()
