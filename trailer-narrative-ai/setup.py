#!/usr/bin/env python3
"""
Quick Setup Script - Installs everything automatically.

Usage:
    python setup.py          # Install all dependencies
    python setup.py --test   # Install and run a quick test
"""

import subprocess
import sys

# Add project root to path for imports
sys.path.insert(0, str(__file__).rsplit('/', 1)[0])
from config.constants import LLM_MODEL, WHISPER_MODEL

def run_cmd(cmd, check=True):
    """Run a command and print output."""
    print(f"\n>> {cmd}")
    result = subprocess.run(cmd, shell=True, check=check)
    return result.returncode == 0

def main():
    print("=" * 60)
    print("Trailer Narrative AI - Auto Setup")
    print("=" * 60)

    # Step 1: Install Python dependencies
    print("\n[1/4] Installing Python dependencies...")
    run_cmd(f"{sys.executable} -m pip install -r requirements.txt --quiet")

    # Step 2: Check FFmpeg
    print("\n[2/4] Checking FFmpeg...")
    if not run_cmd("ffmpeg -version > /dev/null 2>&1", check=False):
        print("WARNING: FFmpeg not found. Install it:")
        print("  Mac: brew install ffmpeg")
        print("  Ubuntu: sudo apt install ffmpeg")
        print("  Windows: Download from https://ffmpeg.org/download.html")
    else:
        print("FFmpeg: OK")

    # Step 3: Pre-download LLM model
    print(f"\n[3/4] Pre-downloading LLM model ({LLM_MODEL})...")
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        print(f"Downloading {LLM_MODEL}...")
        AutoTokenizer.from_pretrained(LLM_MODEL)
        AutoModelForSeq2SeqLM.from_pretrained(LLM_MODEL)
        print(f"LLM Model: OK ({LLM_MODEL})")
    except Exception as e:
        print(f"LLM download skipped: {e}")
        print("Model will auto-download on first run")

    # Step 4: Pre-download Whisper model
    print("\n[4/4] Pre-downloading Whisper model...")
    try:
        import whisper
        print(f"Downloading whisper {WHISPER_MODEL}...")
        whisper.load_model(WHISPER_MODEL)
        print(f"Whisper Model: OK ({WHISPER_MODEL})")
    except Exception as e:
        print(f"Whisper download skipped: {e}")
        print("Model will auto-download on first run")

    print("\n" + "=" * 60)
    print("Setup Complete!")
    print("=" * 60)
    print("\nUsage:")
    print('  python main.py \'{"projectId": "test", "localFilePath": "/path/to/video.mp4"}\'')
    print("\nConfiguration:")
    print("  Edit config/constants.py to change settings:")
    print(f"    LLM_MODEL = \"{LLM_MODEL}\"")
    print(f"    WHISPER_MODEL = \"{WHISPER_MODEL}\"")
    print("=" * 60)

    # Run test if requested
    if "--test" in sys.argv:
        print("\nRunning quick test...")
        run_cmd(f"{sys.executable} -c \"from analysis.llm_helper import _init_model; _init_model(); print('LLM: OK')\"")

if __name__ == "__main__":
    main()
