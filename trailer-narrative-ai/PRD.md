# Product Requirements Document (PRD)
# AI-Driven Trailer Narrative Variant Generator

**Project:** Trailer Narrative AI
**Repository:** media-ai-tech
**Version:** 2.0.0
**Author:** BMad Master
**Date:** 2026-01-09
**Status:** Draft

---

## Executive Summary

This PRD defines the requirements for an AI-driven system that automatically generates multiple trailer narrative variants from full-length movies or shows. The system will analyze video content, understand story structure, and produce both:
1. **Detailed shot-by-shot narrative guides** for editors
2. **Auto-generated reference trailers** for each narrative variant

Editors receive AI-generated trailer videos as reference outputs that can be used directly if quality is sufficient, or as visual guides for their own editing.

**Key Value Proposition:** Reduce trailer production time from days to hours by providing editors with pre-analyzed content, multiple creative narrative directions, AND ready-to-use reference trailers.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Objectives](#2-goals--objectives)
3. [Scope Definition](#3-scope-definition)
4. [User Personas](#4-user-personas)
5. [Functional Requirements](#5-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [AI/ML Components](#7-aiml-components)
8. [Trailer Assembly Engine](#8-trailer-assembly-engine)
9. [Data Flow](#9-data-flow)
10. [Output Specifications](#10-output-specifications)
11. [Success Metrics](#11-success-metrics)
12. [Constraints & Assumptions](#12-constraints--assumptions)
13. [Implementation Phases](#13-implementation-phases)
14. [Risk Analysis](#14-risk-analysis)
15. [Appendix](#appendix)

---

## 1. Problem Statement

### Current State
- **Manual Process:** Editors must watch entire movies (90-180 minutes) multiple times to identify trailer-worthy moments
- **Time-Intensive:** Creating one trailer takes 3-7 days for initial cut
- **Subjective Selection:** Shot selection depends heavily on individual editor's interpretation
- **Inconsistent Quality:** Trailer impact varies based on editor experience
- **Scalability Issue:** Stage produces content in multiple dialects; each needs customized trailers
- **No Reference Point:** Editors start from scratch with no visual reference

### Pain Points
| Pain Point | Impact | Frequency |
|-----------|--------|-----------|
| Full content viewing required | 4-8 hours per project | Every project |
| Identifying key emotional moments | 2-4 hours analysis | Every project |
| Creating multiple trailer versions | 2x-3x time per variant | 50% of projects |
| Missing impactful scenes | Lower trailer engagement | 20% of projects |
| Regional content adaptation | Additional 1-2 days | Multi-dialect content |
| No starting reference | Creative block | 30% of projects |

### Opportunity
Leverage AI to:
1. Automatically extract and analyze all scenes
2. Identify high-impact moments (emotional peaks, action sequences, plot reveals)
3. Generate multiple narrative structures optimized for different trailer styles
4. Provide editors with ready-to-use shot lists with timecodes
5. **NEW: Generate actual trailer videos as reference outputs**
6. **NEW: Use existing script/subtitle data when available**

---

## 2. Goals & Objectives

### Primary Goal
Create an AI system that generates **multiple trailer narrative variants** from any video input, providing editors with:
1. Comprehensive, actionable shot-by-shot guidance
2. **Auto-generated trailer videos** for each narrative variant

### Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Reduce initial viewing time | Hours saved per project | 80% reduction |
| Accelerate trailer production | Time to first cut | From 5 days to 1 day |
| Increase trailer variants | Narratives per project | 5-7 variants minimum |
| Improve shot selection | Key moments identified | 95% coverage |
| Enable non-viewers to edit | Editor needs to watch | <20% of content |
| **Provide visual reference** | Auto-generated trailers | 5-7 per input |
| **Usable output quality** | Trailers usable as-is | 40%+ cases |

### Success Criteria (POC)
1. Generate at least 5 distinct narrative variants per input
2. Each variant includes shot-by-shot guidance with timecodes
3. **Each variant includes an auto-generated trailer video**
4. Narrative quality rated 4+/5 by editors
5. Processing time under 30 minutes for 2-hour content
6. No external API dependencies in core pipeline
7. **Accept script/subtitle inputs when available**

---

## 3. Scope Definition

### In Scope (POC - Phase 1)

| Feature | Description | Priority |
|---------|-------------|----------|
| Video Ingestion | Accept video from S3 or local path | P0 |
| **Script Input** | Accept optional PDF/text script | P0 |
| **Subtitle Input** | Accept optional SRT/VTT files | P0 |
| Scene Detection | Automatic scene boundary detection | P0 |
| Audio Transcription | Dialogue extraction using Whisper | P0 |
| Visual Analysis | Frame-level content understanding | P0 |
| Emotion Detection | Identify emotional peaks and valleys | P0 |
| Narrative Generation | Multiple trailer narrative styles | P0 |
| Shot List Output | Timecoded shot recommendations | P0 |
| **Trailer Assembly** | Auto-generate trailer videos | P0 |
| JSON Output | Structured output for integration | P0 |

### In Scope (Phase 2 - Future)

| Feature | Description | Priority |
|---------|-------------|----------|
| Music Recommendations | Suggest music style/tempo per section | P1 |
| Music Overlay | Add royalty-free music to trailers | P1 |
| Text Overlay Rendering | Burn-in title cards to trailers | P1 |
| Multi-language Support | Hindi/Regional dialogue handling | P1 |
| Editor Feedback Loop | Learn from editor selections | P2 |
| Trailer Quality Scoring | Auto-rate generated trailers | P2 |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Final polished trailer | Editor refinement required |
| Music licensing | Business process, not AI |
| Voice-over generation | Separate system |
| Marketing copy | Different product |
| Social media cuts | Phase 3 consideration |

---

## 4. User Personas

### Primary: Video Editor (Rahul)
- **Role:** Senior Video Editor at Stage
- **Experience:** 5+ years in film/TV editing
- **Pain Points:**
  - Watches 10+ hours of content weekly for trailers
  - Struggles to maintain consistent quality across dialects
  - Limited time for creative exploration of narrative options
  - No visual reference to start from
- **Needs:**
  - Pre-analyzed content with key moments highlighted
  - Multiple narrative directions to choose from
  - Accurate timecodes for rapid editing
  - **Reference trailers to view before editing**
  - **Ability to use auto-generated trailers as starting point**

### Secondary: Content Producer (Priya)
- **Role:** Content Producer managing trailer production
- **Experience:** 8 years in content production
- **Pain Points:**
  - Bottleneck in trailer delivery timeline
  - Can't scale trailer production with content volume
  - Quality inconsistency across different editors
- **Needs:**
  - Faster turnaround on trailers
  - Standardized narrative frameworks
  - Quality baseline across all productions
  - **Quick preview trailers for stakeholder review**

### Tertiary: Junior Editor (Amit)
- **Role:** Junior Editor, 1 year experience
- **Pain Points:**
  - Struggles to identify best moments in unfamiliar content
  - Lacks intuition for narrative pacing
  - Needs guidance on trailer structure
- **Needs:**
  - AI-guided shot selection
  - Narrative templates to follow
  - Learning from AI recommendations
  - **Visual examples of how narratives translate to trailers**

---

## 5. Functional Requirements

### 5.1 Input Processing

**FR-001: Video Input**
- Accept video files from AWS S3 (s3FileKey)
- Accept local file paths (localFilePath)
- Support formats: MP4, MOV, MKV, AVI
- Maximum file size: 50GB
- S3 precedence over local when both provided

**FR-002: Input Payload (UPDATED)**
```json
{
  "projectId": "string (required)",
  "s3FileKey": "string (optional)",
  "localFilePath": "string (optional)",
  "s3Bucket": "string (optional, default from config)",
  "s3Region": "string (optional, default ap-south-1)",
  "token": "string (optional, for auth)",
  "progressBaseUrl": "string (optional)",

  "contentMetadata": {
    "title": "string (optional)",
    "genre": "string (optional)",
    "language": "string (optional)",
    "targetDuration": "number (optional, trailer length in seconds, default 90)"
  },

  "narrativeStyles": ["dramatic", "action", "emotional", "mystery", "comedy"],

  "scriptInput": {
    "scriptS3Key": "string (optional, S3 path to script PDF/TXT)",
    "scriptLocalPath": "string (optional, local path to script PDF/TXT)",
    "scriptText": "string (optional, raw script text)",
    "scriptFormat": "string (optional, 'pdf' | 'txt' | 'fountain', default auto-detect)"
  },

  "dialogueInput": {
    "subtitleS3Key": "string (optional, S3 path to subtitle file)",
    "subtitleLocalPath": "string (optional, local path to subtitle file)",
    "subtitleFormat": "string (optional, 'srt' | 'vtt' | 'ass', default auto-detect)"
  },

  "outputOptions": {
    "generateTrailerVideos": "boolean (optional, default true)",
    "trailerFormat": "string (optional, 'mp4' | 'mov', default 'mp4')",
    "trailerResolution": "string (optional, '1080p' | '720p' | '4k', default '1080p')",
    "includeWatermark": "boolean (optional, default true for POC)",
    "outputS3Bucket": "string (optional, where to upload outputs)",
    "outputLocalPath": "string (optional, local output directory)"
  }
}
```

**FR-003: Script Processing**
- Parse PDF scripts using PyMuPDF/pdfplumber
- Parse TXT scripts with scene header detection
- Parse Fountain format screenplay files
- Extract:
  - Scene headings (INT/EXT locations)
  - Character names and dialogue
  - Action descriptions
  - Scene numbers if present
- Map script scenes to video timecodes (via dialogue matching)

**FR-004: Subtitle/Dialogue Processing**
- Parse SRT (SubRip) subtitle format
- Parse VTT (WebVTT) subtitle format
- Parse ASS/SSA subtitle format
- When subtitle provided, skip Whisper transcription (saves processing time)
- Use subtitle timecodes as dialogue reference
- Support multi-language subtitle files

**FR-005: Progress Reporting**
- Send progress updates to progressBaseUrl if provided
- Status types: initiated, downloading, analyzing, generating, assembling, uploading, complete, failed
- Progress percentage: 0-100
- Milestone updates at key processing stages
- Include ETA for completion

### 5.2 Video Analysis

**FR-006: Scene Detection**
- Detect all scene boundaries/cuts
- Classify scene types (dialogue, action, establishing, transition)
- Calculate scene duration and complexity score
- Output: List of scenes with start/end timecodes

**FR-007: Audio Analysis**
- If subtitle provided: Use subtitle data
- If no subtitle: Transcribe using Whisper
- Detect music segments
- Identify silence and ambient sections
- Detect emotional tone from voice (intensity, pitch variation)
- Language detection per segment

**FR-008: Visual Analysis**
- Extract key frames per scene
- Detect characters/faces and their emotions
- Identify action intensity (motion, cuts, visual complexity)
- Detect location/setting changes
- Identify visual mood (lighting, color palette)

**FR-009: Script-Enhanced Analysis**
When script is provided:
- Cross-reference script scenes with detected video scenes
- Use script dialogue to improve transcription accuracy
- Extract character names from script
- Identify key plot points marked in script
- Use scene descriptions for visual context

**FR-010: Content Understanding**
- Generate scene-level summaries
- Identify plot structure (setup, conflict, climax, resolution)
- Detect character introductions
- Identify quotable dialogue lines
- Detect twist/reveal moments
- Identify "money shots" (visually spectacular moments)

### 5.3 Narrative Generation

**FR-011: Narrative Style Templates**

The system must generate narratives for these trailer styles:

| Style | Focus | Pacing | Key Elements |
|-------|-------|--------|--------------|
| **Dramatic** | Emotional journey | Slow build to climax | Character moments, dramatic pauses |
| **Action** | Energy and excitement | Fast, punchy | Quick cuts, peak action, impacts |
| **Emotional** | Heart and sentiment | Flowing, musical | Relationships, sacrifices, tears |
| **Mystery** | Intrigue and questions | Deliberate, suspenseful | Shadows, reveals, unanswered questions |
| **Comedy** | Humor and lightness | Rhythmic, punchy | Punchlines, reactions, timing |
| **Epic** | Scale and grandeur | Building crescendo | Wide shots, music swells, stakes |
| **Character-Driven** | Protagonist journey | Personal, intimate | Close-ups, internal conflict |

**FR-012: Narrative Output Structure**
Each narrative variant must include:
- Narrative title and style
- Target duration (30s, 60s, 90s, 120s variants)
- Three-act structure breakdown
- Shot-by-shot sequence with:
  - Scene reference (timecode)
  - Duration recommendation
  - Purpose (hook, build, reveal, climax, tag)
  - Audio recommendation (dialogue, music, silence)
  - Transition type (cut, fade, dissolve)
- Suggested music tempo and mood
- Text overlay suggestions (titles, quotes)
- Opening hook recommendation
- Closing tag/call-to-action
- **Trailer video file path (when generated)**

**FR-013: Variant Diversity**
- Minimum 5 distinct narrative variants per input
- No two variants should have >40% shot overlap
- Each variant must have unique opening and closing
- Variants should cover different emotional tones

### 5.4 Trailer Video Assembly (NEW)

**FR-014: Trailer Video Generation**
For each narrative variant, generate an actual trailer video:
- Assemble shots according to narrative shot sequence
- Apply specified transitions (cut, fade, dissolve, crossfade)
- Maintain audio continuity or use music bed
- Apply basic color consistency
- Add optional watermark ("AI-Generated Reference")
- Export in specified format and resolution

**FR-015: Trailer Audio Handling**
- Option 1: Use original audio from selected shots
- Option 2: Music bed with dialogue peaks
- Option 3: Music only (for style reference)
- Smooth audio transitions between shots
- Maintain dialogue clarity when used

**FR-016: Trailer Quality**
- Resolution: 1080p default (720p, 4K options)
- Frame rate: Match source (24/25/30 fps)
- Codec: H.264 for MP4, ProRes for MOV
- Bitrate: 8-15 Mbps for 1080p
- Audio: AAC 320kbps stereo

### 5.5 Output Generation

**FR-017: JSON Output**
```json
{
  "projectId": "string",
  "processingTime": "number (seconds)",
  "inputSources": {
    "video": "string (source path)",
    "script": "string (source path if provided)",
    "subtitles": "string (source path if provided)"
  },
  "contentAnalysis": {
    "duration": "number",
    "sceneCount": "number",
    "dialogueWordCount": "number",
    "language": "string",
    "genres": ["string"],
    "emotionalProfile": {
      "peaks": [{"timecode": "string", "intensity": "number", "type": "string"}],
      "valleys": [{"timecode": "string", "type": "string"}]
    },
    "scriptCorrelation": "number (0-100, how well script matched video)"
  },
  "scenes": [
    {
      "id": "string",
      "startTime": "string (HH:MM:SS.mmm)",
      "endTime": "string",
      "duration": "number",
      "type": "string (dialogue|action|establishing|transition)",
      "summary": "string",
      "emotionalScore": "number (0-100)",
      "actionScore": "number (0-100)",
      "dialogueHighlight": "string (best quote if any)",
      "visualDescription": "string",
      "characters": ["string"],
      "mood": "string",
      "trailerPotential": "number (0-100)",
      "scriptSceneRef": "string (optional, scene number from script)"
    }
  ],
  "narrativeVariants": [
    {
      "id": "string",
      "style": "string",
      "title": "string (creative title for this variant)",
      "targetDuration": "number (seconds)",
      "actualDuration": "number (seconds, of generated trailer)",
      "structure": {
        "act1": {"purpose": "hook", "duration": "number"},
        "act2": {"purpose": "build", "duration": "number"},
        "act3": {"purpose": "climax", "duration": "number"},
        "tag": {"purpose": "close", "duration": "number"}
      },
      "shotSequence": [
        {
          "order": "number",
          "sceneRef": "string (scene ID)",
          "timecodeStart": "string",
          "timecodeEnd": "string",
          "recommendedDuration": "number",
          "actualDuration": "number (in generated trailer)",
          "purpose": "string (hook|build|reveal|climax|breather|tag)",
          "audioRecommendation": "string (dialogue|music|silence|sfx)",
          "dialogueLine": "string (if using dialogue)",
          "transitionIn": "string (cut|fade|dissolve|crossfade)",
          "transitionDuration": "number (frames)",
          "notes": "string (editor guidance)"
        }
      ],
      "musicRecommendation": {
        "tempo": "string (slow|medium|fast|building)",
        "mood": "string",
        "dropPoints": ["string (timecode)"]
      },
      "textOverlays": [
        {
          "timecode": "string",
          "text": "string",
          "type": "string (title|quote|tagline)"
        }
      ],
      "openingHook": "string (description of opening strategy)",
      "closingTag": "string (description of closing strategy)",
      "confidence": "number (0-100)",
      "trailerVideo": {
        "localPath": "string (local file path)",
        "s3Key": "string (S3 path if uploaded)",
        "s3Url": "string (presigned URL if available)",
        "format": "string (mp4|mov)",
        "resolution": "string (1080p|720p|4k)",
        "fileSize": "number (bytes)",
        "duration": "number (seconds)"
      }
    }
  ],
  "recommendations": {
    "bestForMarketing": "string (variant ID)",
    "bestForSocialMedia": "string (variant ID)",
    "mostUnique": "string (variant ID)",
    "bestAutoGenerated": "string (variant ID, best trailer video quality)",
    "editorNotes": "string"
  },
  "outputFiles": {
    "jsonReport": "string (path to this JSON)",
    "markdownReport": "string (path to MD report)",
    "trailerVideos": [
      {
        "variantId": "string",
        "path": "string",
        "s3Url": "string"
      }
    ]
  }
}
```

**FR-018: Human-Readable Report**
Generate a markdown report summarizing:
- Content overview
- Key moments identified
- Narrative variant summaries
- Quick-start guide for editors
- **Links/paths to generated trailer videos**

---

## 6. Technical Architecture

### 6.1 System Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                       TRAILER NARRATIVE AI SYSTEM v2.0                         │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────────┐                                                          │
│  │     INPUTS      │                                                          │
│  │  ┌───────────┐  │                                                          │
│  │  │   Video   │  │                                                          │
│  │  │  (S3/Loc) │  │                                                          │
│  │  ├───────────┤  │                                                          │
│  │  │  Script   │  │  (Optional: PDF/TXT)                                     │
│  │  │  (S3/Loc) │  │                                                          │
│  │  ├───────────┤  │                                                          │
│  │  │ Subtitles │  │  (Optional: SRT/VTT)                                     │
│  │  │  (S3/Loc) │  │                                                          │
│  │  └───────────┘  │                                                          │
│  └────────┬────────┘                                                          │
│           │                                                                    │
│           ▼                                                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────────────────┐ │
│  │     INPUT       │    │    ANALYSIS     │    │   NARRATIVE ENGINE         │ │
│  │    HANDLER      │───▶│    PIPELINE     │───▶│   (LLM-Driven)            │ │
│  │                 │    │                 │    │                            │ │
│  │ - Video decode  │    │ - Scene detect  │    │ - Style templates          │ │
│  │ - Script parse  │    │ - Audio analyze │    │ - Shot selection           │ │
│  │ - Subtitle load │    │ - Visual analyze│    │ - Narrative structure      │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┬──────────────┘ │
│                                                              │                 │
│                                                              ▼                 │
│                                              ┌───────────────────────────────┐ │
│                                              │    TRAILER ASSEMBLY ENGINE    │ │
│                                              │                               │ │
│                                              │  - FFmpeg-based assembly      │ │
│                                              │  - Shot sequencing            │ │
│                                              │  - Transition rendering       │ │
│                                              │  - Audio mixing               │ │
│                                              │  - Video export               │ │
│                                              └───────────────┬───────────────┘ │
│                                                              │                 │
│                                                              ▼                 │
│                                              ┌───────────────────────────────┐ │
│                                              │          OUTPUTS              │ │
│                                              │  ┌─────────┐  ┌────────────┐  │ │
│                                              │  │  JSON   │  │  Trailer   │  │ │
│                                              │  │ Report  │  │  Videos    │  │ │
│                                              │  └─────────┘  │  (5-7 MP4) │  │ │
│                                              │               └────────────┘  │ │
│                                              └───────────────────────────────┘ │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Component Architecture

```
trailer-narrative-ai/
├── main.py                      # Entry point (similar to media-qc)
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Container definition
├── config/
│   ├── __init__.py
│   ├── config.py               # Configuration management
│   └── prompts/                # LLM prompt templates
│       ├── scene_analysis.txt
│       ├── narrative_dramatic.txt
│       ├── narrative_action.txt
│       └── ...
├── core/
│   ├── __init__.py
│   ├── storage.py              # S3/local file handling
│   └── progress.py             # Progress reporting
├── input/
│   ├── __init__.py
│   ├── video_loader.py         # Video file handling
│   ├── script_parser.py        # PDF/TXT/Fountain parsing
│   └── subtitle_parser.py      # SRT/VTT/ASS parsing
├── analysis/
│   ├── __init__.py
│   ├── scene_detector.py       # PySceneDetect integration
│   ├── audio_analyzer.py       # Whisper transcription
│   ├── visual_analyzer.py      # Frame analysis
│   ├── script_correlator.py    # Match script to video
│   └── content_understanding.py # Scene summarization
├── narrative/
│   ├── __init__.py
│   ├── generator.py            # Main narrative generation
│   ├── styles/
│   │   ├── base.py            # Base narrative class
│   │   ├── dramatic.py
│   │   ├── action.py
│   │   ├── emotional.py
│   │   └── ...
│   └── shot_selector.py        # Shot selection logic
├── assembly/                   # NEW: Trailer Assembly Engine
│   ├── __init__.py
│   ├── assembler.py            # Main assembly orchestrator
│   ├── shot_extractor.py       # Extract shots from source
│   ├── transition_renderer.py  # Apply transitions
│   ├── audio_mixer.py          # Audio handling
│   └── video_exporter.py       # Final render
├── llm/
│   ├── __init__.py
│   ├── client.py               # LLM client abstraction
│   └── prompts.py              # Prompt management
├── output/
│   ├── __init__.py
│   ├── json_formatter.py       # JSON output generation
│   └── report_generator.py     # Markdown report
└── utils/
    ├── __init__.py
    ├── ffmpeg.py               # FFmpeg utilities
    ├── timecode.py             # Timecode handling
    └── pdf_utils.py            # PDF parsing utilities
```

### 6.3 Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| **Language** | Python 3.11+ | ML ecosystem, FFmpeg bindings |
| **Scene Detection** | PySceneDetect | Open-source, battle-tested, no API dependency |
| **Audio Transcription** | Whisper (local) | Open-source, runs offline, high accuracy |
| **Visual Analysis** | OpenCV + Custom | No API dependency, full control |
| **Frame Understanding** | Video-LLaVA (local) or CLIP | Open-source, runs locally |
| **LLM for Narratives** | Anthropic Claude API | Best narrative quality (configurable to local LLM) |
| **Video Processing** | FFmpeg | Industry standard, open-source |
| **Trailer Assembly** | FFmpeg + moviepy | Programmatic video editing |
| **Script Parsing** | PyMuPDF / pdfplumber | PDF text extraction |
| **Subtitle Parsing** | pysrt / webvtt-py | Standard subtitle formats |
| **Data Storage** | boto3 (S3) | AWS integration |
| **Containerization** | Docker | Consistent deployment |

### 6.4 Open-Source Dependencies

```
# Core Processing
ffmpeg-python>=0.2.0       # Video processing
moviepy>=1.0.3             # Video editing
opencv-python>=4.8.0       # Image analysis
numpy>=1.24.0              # Numerical operations

# Scene Detection
scenedetect>=0.6.7         # PySceneDetect

# Audio Processing
openai-whisper>=20231117   # Local Whisper model
torch>=2.0.0               # PyTorch for models
pydub>=0.25.1              # Audio manipulation

# Visual Understanding (choose one)
transformers>=4.35.0       # For Video-LLaVA
clip>=1.0                  # CLIP model (fallback)

# Script/Subtitle Parsing
PyMuPDF>=1.23.0            # PDF parsing (fitz)
pdfplumber>=0.10.0         # Alternative PDF parsing
pysrt>=1.1.2               # SRT subtitle parsing
webvtt-py>=0.4.6           # VTT subtitle parsing
chardet>=5.2.0             # Encoding detection

# LLM Client
anthropic>=0.18.0          # Claude API (primary)
# OR for fully local:
llama-cpp-python>=0.2.0    # Local Llama models

# Infrastructure
boto3>=1.35.0              # AWS S3
requests>=2.31.0           # HTTP client
pydantic>=2.0.0            # Data validation
```

---

## 7. AI/ML Components

### 7.1 Scene Detection (PySceneDetect)

**Purpose:** Identify scene boundaries and transitions

**Implementation:**
```python
from scenedetect import detect, ContentDetector, ThresholdDetector

def detect_scenes(video_path: str) -> List[Scene]:
    # Content-aware detection for cuts
    scenes = detect(video_path, ContentDetector(threshold=27.0))

    # Threshold detection for fades
    fade_scenes = detect(video_path, ThresholdDetector(threshold=12))

    return merge_scenes(scenes, fade_scenes)
```

**Output:**
- Scene boundaries with timecodes
- Scene duration
- Transition type (cut, fade, dissolve)

### 7.2 Audio Analysis (Whisper Local / Subtitle Input)

**Purpose:** Get dialogue and audio cues

**Implementation with Subtitle Priority:**
```python
import whisper
from input.subtitle_parser import parse_subtitles

def analyze_audio(video_path: str, subtitle_path: str = None) -> AudioAnalysis:
    # If subtitle provided, use it directly (saves processing time)
    if subtitle_path:
        return AudioAnalysis(
            source="subtitle_file",
            segments=parse_subtitles(subtitle_path),
            language=detect_language(subtitle_path)
        )

    # Otherwise, use Whisper
    model = whisper.load_model("medium")
    result = model.transcribe(
        video_path,
        word_timestamps=True,
        language=None  # Auto-detect
    )

    return AudioAnalysis(
        source="whisper",
        transcript=result["text"],
        segments=result["segments"],
        language=result["language"]
    )
```

### 7.3 Script Parsing

**Purpose:** Extract structured data from screenplay files

**Implementation:**
```python
import fitz  # PyMuPDF
from dataclasses import dataclass

@dataclass
class ScriptScene:
    scene_number: str
    heading: str  # INT/EXT location
    description: str
    dialogue: List[DialogueLine]
    characters: List[str]

def parse_script_pdf(pdf_path: str) -> List[ScriptScene]:
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()

    scenes = []
    # Parse scene headers (INT./EXT.)
    scene_pattern = r'(INT\.|EXT\.)[^\n]+'
    # Parse character names (ALL CAPS before dialogue)
    character_pattern = r'^([A-Z][A-Z\s]+)$'
    # Parse dialogue (indented text after character)

    return extract_scenes(text, scene_pattern, character_pattern)

def correlate_script_to_video(
    script_scenes: List[ScriptScene],
    video_scenes: List[VideoScene],
    audio_transcript: str
) -> List[CorrelatedScene]:
    """
    Match script scenes to video scenes using dialogue matching
    """
    correlations = []
    for script_scene in script_scenes:
        # Find video scene with matching dialogue
        best_match = find_dialogue_match(
            script_scene.dialogue,
            video_scenes,
            audio_transcript
        )
        correlations.append(CorrelatedScene(
            script=script_scene,
            video=best_match,
            confidence=calculate_confidence(script_scene, best_match)
        ))
    return correlations
```

### 7.4 Visual Analysis

**Purpose:** Understand visual content of each scene

**Implementation (CLIP-Based):**
```python
import clip
import torch
from PIL import Image

def analyze_frame(frame: np.ndarray, model, preprocess) -> FrameAnalysis:
    image = preprocess(Image.fromarray(frame)).unsqueeze(0)

    categories = [
        "action scene", "romantic scene", "dramatic scene",
        "comedy scene", "chase scene", "fight scene",
        "emotional scene", "establishing shot", "close-up shot"
    ]

    text_features = clip.tokenize(categories)

    with torch.no_grad():
        image_features = model.encode_image(image)
        text_features = model.encode_text(text_features)
        similarity = (image_features @ text_features.T).softmax(dim=-1)

    return FrameAnalysis(
        categories=dict(zip(categories, similarity[0].tolist())),
        dominant_category=categories[similarity.argmax()]
    )
```

### 7.5 Content Understanding & Summarization

**Purpose:** Generate scene summaries using all available context

**LLM Prompt Template (Enhanced with Script):**
```
You are analyzing a movie scene for trailer creation.

Scene Information:
- Timecode: {start_time} - {end_time}
- Duration: {duration} seconds
- Dialogue: {transcript}
- Visual Description: {visual_analysis}
- Audio Mood: {audio_mood}

Script Context (if available):
- Scene Heading: {script_heading}
- Script Description: {script_description}
- Character Names: {characters}

Analyze this scene and provide:

1. **Summary** (2-3 sentences): What happens in this scene?
2. **Emotional Impact** (1-100): How emotionally impactful is this scene?
3. **Trailer Potential** (1-100): How suitable is this for a trailer?
4. **Scene Type**: One of [exposition, conflict, climax, resolution, action, dialogue, montage, reveal, emotional_beat]
5. **Key Quote** (if any): The most impactful dialogue line
6. **Visual Hook**: The most visually striking element
7. **Spoiler Level** (1-10): How much plot does this reveal?

Respond in JSON format.
```

### 7.6 Narrative Generation

**Purpose:** Generate multiple trailer narrative variants

**Core Algorithm:**
1. **Score all scenes** on trailer potential, emotional impact, action level
2. **Identify key moments:**
   - Opening hook candidates (first 5% of high-potential scenes)
   - Build sequences (rising tension scenes)
   - Climax moments (highest emotional/action peaks)
   - Closing tag candidates (resolution or cliffhanger scenes)
3. **Apply style templates** to select and arrange shots
4. **Generate shot sequence** with pacing appropriate to style
5. **Add recommendations** for music, text, transitions
6. **Prepare assembly instructions** for trailer video generation

---

## 8. Trailer Assembly Engine (NEW)

### 8.1 Overview

The Trailer Assembly Engine takes narrative shot sequences and produces actual video files.

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRAILER ASSEMBLY ENGINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: Narrative Variant                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Shot Sequence:                                               ││
│  │   Shot 1: 00:12:34.000 - 00:12:38.500 (transition: cut)     ││
│  │   Shot 2: 00:45:12.200 - 00:45:15.800 (transition: fade)    ││
│  │   ...                                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              SHOT EXTRACTION (FFmpeg)                        ││
│  │  - Extract each shot as individual clip                      ││
│  │  - Maintain original quality                                 ││
│  │  - Extract audio track                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              TRANSITION RENDERING (moviepy)                  ││
│  │  - Apply cut/fade/dissolve/crossfade                         ││
│  │  - Render transition frames                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              AUDIO MIXING (pydub + FFmpeg)                   ││
│  │  - Mix dialogue with music bed (optional)                    ││
│  │  - Smooth audio transitions                                  ││
│  │  - Normalize levels                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              VIDEO EXPORT (FFmpeg)                           ││
│  │  - Concatenate shots                                         ││
│  │  - Apply watermark (optional)                                ││
│  │  - Encode to target format                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  OUTPUT: trailer_dramatic_v1.mp4                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Shot Extraction

```python
import ffmpeg

def extract_shot(
    source_video: str,
    start_time: str,
    end_time: str,
    output_path: str
) -> str:
    """Extract a single shot from source video"""
    (
        ffmpeg
        .input(source_video, ss=start_time, to=end_time)
        .output(output_path, c='copy')  # No re-encoding for speed
        .overwrite_output()
        .run()
    )
    return output_path

def extract_all_shots(
    source_video: str,
    shot_sequence: List[Shot],
    temp_dir: str
) -> List[str]:
    """Extract all shots for a narrative variant"""
    shot_paths = []
    for i, shot in enumerate(shot_sequence):
        output_path = f"{temp_dir}/shot_{i:03d}.mp4"
        extract_shot(
            source_video,
            shot.timecode_start,
            shot.timecode_end,
            output_path
        )
        shot_paths.append(output_path)
    return shot_paths
```

### 8.3 Transition Rendering

```python
from moviepy.editor import VideoFileClip, concatenate_videoclips
from moviepy.video.fx.all import fadein, fadeout, crossfadein, crossfadeout

def apply_transition(
    clip1: VideoFileClip,
    clip2: VideoFileClip,
    transition_type: str,
    duration: float = 0.5
) -> VideoFileClip:
    """Apply transition between two clips"""

    if transition_type == "cut":
        return concatenate_videoclips([clip1, clip2])

    elif transition_type == "fade":
        clip1 = fadeout(clip1, duration)
        clip2 = fadein(clip2, duration)
        return concatenate_videoclips([clip1, clip2])

    elif transition_type == "dissolve":
        # Crossfade/dissolve
        clip1 = clip1.crossfadeout(duration)
        clip2 = clip2.crossfadein(duration)
        # Overlap clips
        return CompositeVideoClip([
            clip1,
            clip2.set_start(clip1.duration - duration)
        ])

    elif transition_type == "crossfade":
        return concatenate_videoclips(
            [clip1, clip2],
            method="compose",
            padding=-duration
        )

    return concatenate_videoclips([clip1, clip2])

def assemble_trailer(
    shot_paths: List[str],
    transitions: List[str],
    output_path: str
) -> str:
    """Assemble full trailer from shots with transitions"""

    clips = [VideoFileClip(path) for path in shot_paths]

    # Apply transitions
    result = clips[0]
    for i, (clip, transition) in enumerate(zip(clips[1:], transitions)):
        result = apply_transition(result, clip, transition)

    # Write final video
    result.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        bitrate='10M'
    )

    # Cleanup
    for clip in clips:
        clip.close()

    return output_path
```

### 8.4 Audio Handling

```python
from pydub import AudioSegment

def create_audio_mix(
    shot_audio_paths: List[str],
    music_bed_path: str = None,
    dialogue_shots: List[int] = None
) -> AudioSegment:
    """Create audio mix for trailer"""

    # Concatenate shot audio
    trailer_audio = AudioSegment.empty()
    for i, path in enumerate(shot_audio_paths):
        shot_audio = AudioSegment.from_file(path)

        # Ducking: Lower music during dialogue
        if music_bed_path and i in (dialogue_shots or []):
            shot_audio = shot_audio + 3  # Boost dialogue

        trailer_audio += shot_audio

    # Add music bed if provided
    if music_bed_path:
        music = AudioSegment.from_file(music_bed_path)
        music = music[:len(trailer_audio)]  # Trim to trailer length
        music = music - 6  # Lower music volume

        # Mix
        trailer_audio = trailer_audio.overlay(music)

    # Normalize
    trailer_audio = trailer_audio.normalize()

    return trailer_audio
```

### 8.5 Watermark Application

```python
def add_watermark(
    video_path: str,
    output_path: str,
    watermark_text: str = "AI-Generated Reference"
) -> str:
    """Add watermark to trailer"""
    (
        ffmpeg
        .input(video_path)
        .drawtext(
            text=watermark_text,
            fontsize=24,
            fontcolor='white@0.5',
            x='w-tw-10',
            y='h-th-10'
        )
        .output(output_path)
        .overwrite_output()
        .run()
    )
    return output_path
```

### 8.6 Complete Assembly Pipeline

```python
class TrailerAssembler:
    def __init__(self, config: AssemblyConfig):
        self.config = config
        self.temp_dir = tempfile.mkdtemp()

    def assemble_variant(
        self,
        source_video: str,
        narrative: NarrativeVariant,
        output_dir: str
    ) -> TrailerOutput:
        """Assemble a single trailer variant"""

        # 1. Extract shots
        shot_paths = extract_all_shots(
            source_video,
            narrative.shot_sequence,
            self.temp_dir
        )

        # 2. Get transitions
        transitions = [shot.transition_in for shot in narrative.shot_sequence[1:]]

        # 3. Assemble video
        raw_trailer = f"{self.temp_dir}/raw_{narrative.id}.mp4"
        assemble_trailer(shot_paths, transitions, raw_trailer)

        # 4. Process audio (optional music)
        if self.config.add_music_bed:
            self._add_music(raw_trailer, narrative)

        # 5. Add watermark
        final_path = f"{output_dir}/trailer_{narrative.style}_{narrative.id}.mp4"
        if self.config.include_watermark:
            add_watermark(raw_trailer, final_path)
        else:
            shutil.move(raw_trailer, final_path)

        # 6. Upload to S3 if configured
        s3_url = None
        if self.config.output_s3_bucket:
            s3_url = self._upload_to_s3(final_path)

        return TrailerOutput(
            local_path=final_path,
            s3_url=s3_url,
            duration=get_video_duration(final_path),
            file_size=os.path.getsize(final_path)
        )

    def assemble_all_variants(
        self,
        source_video: str,
        narratives: List[NarrativeVariant],
        output_dir: str
    ) -> List[TrailerOutput]:
        """Assemble trailers for all narrative variants"""
        outputs = []
        for narrative in narratives:
            output = self.assemble_variant(source_video, narrative, output_dir)
            outputs.append(output)
        return outputs
```

---

## 9. Data Flow

### 9.1 Complete Processing Pipeline

```
INPUTS                   ANALYSIS                 GENERATION              ASSEMBLY                OUTPUT
──────                   ────────                 ──────────              ────────                ──────

┌─────────┐
│ Video   │
│ File    │
└────┬────┘
     │
┌────┴────┐  (optional)
│ Script  │───┐
│ PDF/TXT │   │
└─────────┘   │
              │
┌─────────┐   │
│Subtitle │───┤
│ SRT/VTT │   │
└─────────┘   │
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INPUT PROCESSING                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                         │
│  │    Video     │   │   Script     │   │  Subtitle    │                         │
│  │   Loader     │   │   Parser     │   │   Parser     │                         │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                         │
│         └────────────┬─────┴──────────────────┘                                  │
│                      │                                                           │
└──────────────────────┼───────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ANALYSIS PHASE (Parallel)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                         │
│  │    Scene     │   │    Audio     │   │   Visual     │                         │
│  │  Detection   │   │  Analysis    │   │  Analysis    │                         │
│  │ (PyScene-   │   │ (Whisper OR  │   │ (CLIP/LLaVA) │                         │
│  │   Detect)    │   │  Subtitle)   │   │              │                         │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                         │
│         │                  │                  │                                  │
│         │    ┌──────────────────────────┐    │                                  │
│         └───▶│   Script Correlator      │◀───┘                                  │
│              │   (if script provided)   │                                        │
│              └────────────┬─────────────┘                                        │
│                           │                                                      │
│                           ▼                                                      │
│              ┌──────────────────────────┐                                        │
│              │   Content Understanding  │                                        │
│              │   (LLM + All Context)    │                                        │
│              └────────────┬─────────────┘                                        │
│                           │                                                      │
└───────────────────────────┼──────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        NARRATIVE GENERATION PHASE                                  │
├───────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │                    Scene Scoring & Ranking                                  │   │
│  └────────────────────────────────┬───────────────────────────────────────────┘   │
│                                   │                                                │
│                                   ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │                  Parallel Narrative Generation                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │   │
│  │  │Dramatic │ │ Action  │ │Emotional│ │ Mystery │ │ Comedy  │ ...          │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘              │   │
│  │       └───────────┴───────────┴───────────┴───────────┘                    │   │
│  └────────────────────────────────┬───────────────────────────────────────────┘   │
│                                   │                                                │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        TRAILER ASSEMBLY PHASE (NEW)                                │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  For EACH narrative variant:                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │    Shot      │  │  Transition  │  │    Audio     │  │   Export     │   │   │
│  │  │  Extraction  │─▶│  Rendering   │─▶│   Mixing     │─▶│  + Upload    │   │   │
│  │  │  (FFmpeg)    │  │  (moviepy)   │  │  (pydub)     │  │  (FFmpeg)    │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│  × 5-7 variants (parallel processing)                                              │
│                                                                                    │
└───────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              OUTPUTS                                               │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │   JSON Report       │  │  Markdown Report    │  │  Trailer Videos     │        │
│  │   (Full analysis)   │  │  (Editor guide)     │  │  (5-7 MP4 files)    │        │
│  │                     │  │                     │  │                     │        │
│  │  - Scene analysis   │  │  - Overview         │  │  - dramatic.mp4     │        │
│  │  - Narrative vars   │  │  - Top moments      │  │  - action.mp4       │        │
│  │  - Trailer paths    │  │  - Quick start      │  │  - emotional.mp4    │        │
│  └─────────────────────┘  └─────────────────────┘  │  - mystery.mp4      │        │
│                                                    │  - comedy.mp4       │        │
│                                                    │  - epic.mp4         │        │
│                                                    │  - character.mp4    │        │
│                                                    └─────────────────────┘        │
│                                                                                    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Processing Time Estimates (Updated)

| Phase | 2-hour Movie | Optimization |
|-------|--------------|--------------|
| Download (S3) | 2-5 min | Stream if possible |
| Input Parsing (Script/Subtitle) | 0-1 min | Only if provided |
| Scene Detection | 3-5 min | GPU acceleration |
| Audio Transcription | 0-15 min | Skip if subtitle provided |
| Visual Analysis | 10-20 min | Key frames only |
| Content Understanding | 5-10 min | Batch LLM calls |
| Narrative Generation | 3-5 min | Parallel generation |
| **Trailer Assembly (NEW)** | 5-10 min | Parallel per variant |
| **Total (with subtitle)** | **25-45 min** | Target: <30 min |
| **Total (without subtitle)** | **30-50 min** | Target: <40 min |

---

## 10. Output Specifications

### 10.1 Primary Outputs

| Output | Format | Description |
|--------|--------|-------------|
| JSON Report | `.json` | Complete analysis and narrative data |
| Markdown Report | `.md` | Human-readable editor guide |
| Trailer Videos | `.mp4` / `.mov` | 5-7 auto-generated trailers |

### 10.2 Trailer Video Specifications

| Property | Value |
|----------|-------|
| Resolution | 1080p (default), 720p, 4K options |
| Frame Rate | Match source (24/25/30 fps) |
| Codec (MP4) | H.264 |
| Codec (MOV) | ProRes 422 LT |
| Bitrate | 8-15 Mbps (1080p) |
| Audio | AAC 320kbps stereo |
| Duration | 30-120 seconds per variant |
| Watermark | "AI-Generated Reference" (optional) |

### 10.3 Output Directory Structure

```
output/{projectId}/
├── analysis/
│   ├── scenes.json              # Scene detection results
│   ├── audio.json               # Audio analysis/transcript
│   └── visual.json              # Visual analysis results
├── narratives/
│   ├── narrative_report.json    # Full JSON output
│   └── editor_guide.md          # Markdown report
├── trailers/
│   ├── dramatic_v1.mp4
│   ├── action_v1.mp4
│   ├── emotional_v1.mp4
│   ├── mystery_v1.mp4
│   ├── comedy_v1.mp4
│   ├── epic_v1.mp4
│   └── character_v1.mp4
└── metadata/
    ├── processing_log.json
    └── input_sources.json
```

### 10.4 Editor Report (Updated)

```markdown
# Trailer Narrative Analysis Report
## [Movie Title]

### Content Overview
- **Duration:** 2h 15m
- **Scenes Detected:** 147
- **Language:** Hindi
- **Primary Genre:** Drama/Action
- **Script Provided:** Yes (correlated 89%)
- **Subtitles Used:** Provided SRT file

### Emotional Profile
[ASCII chart of emotional intensity over time]

### Top 10 Trailer-Worthy Moments

| Rank | Timecode | Score | Description |
|------|----------|-------|-------------|
| 1 | 01:45:23 | 98 | Climactic confrontation |
| 2 | 00:23:45 | 95 | Hero's introduction |
| ... | ... | ... | ... |

### Generated Trailers

| Variant | Duration | File | Watch |
|---------|----------|------|-------|
| Dramatic | 92s | `trailers/dramatic_v1.mp4` | [Preview](#) |
| Action | 87s | `trailers/action_v1.mp4` | [Preview](#) |
| Emotional | 95s | `trailers/emotional_v1.mp4` | [Preview](#) |
| Mystery | 88s | `trailers/mystery_v1.mp4` | [Preview](#) |
| Comedy | 82s | `trailers/comedy_v1.mp4` | [Preview](#) |

### Narrative Variants Summary

#### 1. Dramatic: "The Weight of Choice"
- **File:** `trailers/dramatic_v1.mp4`
- **Duration:** 92 seconds
- **Focus:** Internal conflict and sacrifice
- **Opening:** Close-up of protagonist's troubled face (00:12:34)
- **Climax:** The impossible choice moment (01:45:23)
- **Closing:** Lingering shot, unresolved tension
- **AI Confidence:** 87%

[Continue for all variants...]

### Quick Start Guide for Editors

1. **Watch the AI-generated trailers first** to understand each narrative approach
2. **Use trailer as-is if quality meets standards** (40% of cases)
3. **Use as reference and refine** using the detailed shot sequences below
4. **Key scenes to definitely include:** [List with timecodes]
5. **Scenes to avoid (spoilers):** [List with timecodes]
```

---

## 11. Success Metrics

### 11.1 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Processing Time | <40 min for 2h content | Automated logging |
| Scene Detection Accuracy | >95% | Manual validation sample |
| Transcription Accuracy | >90% WER | Compare to manual |
| Narrative Diversity | >60% unique shots per variant | Automated check |
| **Trailer Generation Success** | 100% variants produce video | Automated check |
| **Trailer Quality** | Playable, correct duration | Automated validation |
| System Uptime | >99% | Monitoring |

### 11.2 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Editor Time Savings | 80% reduction | Before/after study |
| Time to First Cut | 5 days → 1 day | Project tracking |
| Trailer Quality Score | 4+/5 editor rating | Survey |
| Key Moment Coverage | 95% | Editor validation |
| **Auto-Trailer Usable As-Is** | 40%+ | Editor survey |
| **Auto-Trailer Used As Reference** | 90%+ | Usage tracking |
| Adoption Rate | 80% of projects | Usage tracking |

### 11.3 POC Success Criteria

1. ✅ Process a 2-hour movie in <40 minutes
2. ✅ Generate 5+ distinct narrative variants
3. ✅ **Generate 5+ auto-assembled trailer videos**
4. ✅ Editor rates narrative quality 4+/5
5. ✅ 90%+ of top moments identified by AI match editor selection
6. ✅ **Auto-generated trailers usable as-is in 40%+ cases**
7. ✅ System runs without external API dependencies (except LLM)
8. ✅ **Accept and utilize script/subtitle inputs**

---

## 12. Constraints & Assumptions

### 12.1 Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| No cloud AI services (except LLM) | Must run locally | Use open-source models |
| GPU availability | Processing speed | Support CPU fallback |
| Storage requirements | Large temp files | Cleanup after processing |
| LLM context limits | Long transcripts | Chunking strategy |
| Regional language support | Hindi/dialects | Whisper multilingual |
| **Trailer rendering time** | Adds processing time | Parallel assembly |
| **Transition quality** | Basic transitions only | Use proven FFmpeg methods |

### 12.2 Assumptions

1. Input videos are properly encoded and playable
2. Videos have clear audio tracks (or subtitle provided)
3. Content is narrative-driven (not abstract/experimental)
4. Target trailer length is 30-120 seconds
5. Editors have basic understanding of trailer structure
6. AWS S3 access is available for input/output
7. GPU with 8GB+ VRAM available for processing
8. **Scripts (if provided) are accurate to final cut**
9. **Subtitles (if provided) are time-synced correctly**

### 12.3 Dependencies

| Dependency | Type | Risk |
|-----------|------|------|
| PySceneDetect | Open-source library | Low |
| Whisper | Open-source model | Low |
| CLIP/Video-LLaVA | Open-source model | Medium (model size) |
| Claude API | External service | Medium (fallback to local LLM) |
| FFmpeg | System dependency | Low |
| **moviepy** | Open-source library | Low |
| **PyMuPDF** | Open-source library | Low |
| **pysrt/webvtt-py** | Open-source library | Low |

---

## 13. Implementation Phases

### Phase 1: POC (6 weeks)

**Week 1-2: Core Infrastructure + Input Handling**
- [ ] Project setup and structure
- [ ] S3/local file handling (port from media-qc)
- [ ] Progress reporting system
- [ ] Basic configuration management
- [ ] **Script parser (PDF/TXT)**
- [ ] **Subtitle parser (SRT/VTT)**

**Week 3-4: Analysis Pipeline**
- [ ] PySceneDetect integration
- [ ] Whisper transcription integration (with subtitle bypass)
- [ ] Basic visual analysis (CLIP)
- [ ] **Script-to-video correlation**
- [ ] Scene data aggregation

**Week 5-6: Narrative Generation + Trailer Assembly**
- [ ] LLM integration (Claude)
- [ ] Prompt engineering for narratives
- [ ] 3 narrative style implementations
- [ ] **Trailer assembly engine (FFmpeg + moviepy)**
- [ ] **Basic transitions (cut, fade)**
- [ ] JSON + video output generation

**Deliverable:** Working system generating 3 narrative variants + 3 trailer videos

### Phase 2: Enhancement (4 weeks)

**Week 7-8: Advanced Analysis + Full Assembly**
- [ ] Video-LLaVA integration (optional)
- [ ] Improved content understanding
- [ ] Character detection
- [ ] Music segment detection
- [ ] **Dissolve/crossfade transitions**
- [ ] **Audio mixing improvements**

**Week 9-10: Full Narrative Suite**
- [ ] All 7 narrative styles
- [ ] Shot diversity optimization
- [ ] Music recommendations
- [ ] Text overlay suggestions
- [ ] **Trailer quality validation**
- [ ] **S3 upload for trailers**

**Deliverable:** Production-ready system with 7 variants + 7 trailers

### Phase 3: Production & Learning (Ongoing)

- [ ] Editor feedback integration
- [ ] Model fine-tuning based on selections
- [ ] **Trailer quality scoring AI**
- [ ] **Music bed integration**
- [ ] **Text overlay burn-in**
- [ ] Multi-language optimization

---

## 14. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM quality issues | Medium | High | Extensive prompt engineering, fallback templates |
| Processing too slow | Medium | Medium | GPU optimization, parallel processing |
| Scene detection errors | Low | Medium | Multiple detection algorithms, manual override |
| Model size too large | Medium | Medium | Quantized models, cloud inference option |
| Editor adoption low | Medium | High | User training, iterative improvement |
| Regional content issues | Medium | Medium | Multilingual models, custom training |
| **Trailer assembly fails** | Low | High | Robust FFmpeg error handling |
| **Transition artifacts** | Medium | Low | Simple transitions, quality checks |
| **Script correlation poor** | Medium | Medium | Fallback to Whisper transcription |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Shot** | A continuous segment of footage from a single camera setup |
| **Scene** | A collection of shots in one location/time |
| **Narrative Variant** | A unique trailer structure/approach |
| **Money Shot** | A visually spectacular moment suitable for trailer climax |
| **Hook** | Opening moment designed to grab viewer attention |
| **Tag** | Closing moment/line that leaves lasting impression |
| **Timecode** | Timestamp in HH:MM:SS.mmm format |
| **Assembly** | The process of combining shots into a complete trailer |
| **Transition** | Visual effect connecting two shots (cut, fade, dissolve) |

### B. Supported Input Formats

**Video:**
- MP4 (H.264, H.265)
- MOV (ProRes, H.264)
- MKV (Various codecs)
- AVI (Various codecs)

**Script:**
- PDF (text-based, not scanned images)
- TXT (plain text)
- Fountain (.fountain screenplay format)

**Subtitles:**
- SRT (SubRip)
- VTT (WebVTT)
- ASS/SSA (Advanced SubStation Alpha)

### C. Sample Input Payload

```json
{
  "projectId": "movie_xyz_2026",
  "s3FileKey": "uploads/movies/movie_xyz_final.mp4",
  "s3Bucket": "stage-media-bucket",
  "s3Region": "ap-south-1",
  "progressBaseUrl": "https://api.stage.com/progress",
  "token": "auth_token_here",

  "contentMetadata": {
    "title": "The Last Stand",
    "genre": "action-drama",
    "language": "hindi",
    "targetDuration": 90
  },

  "narrativeStyles": ["dramatic", "action", "emotional", "mystery", "epic"],

  "scriptInput": {
    "scriptS3Key": "uploads/scripts/movie_xyz_script.pdf",
    "scriptFormat": "pdf"
  },

  "dialogueInput": {
    "subtitleS3Key": "uploads/subtitles/movie_xyz_hindi.srt",
    "subtitleFormat": "srt"
  },

  "outputOptions": {
    "generateTrailerVideos": true,
    "trailerFormat": "mp4",
    "trailerResolution": "1080p",
    "includeWatermark": true,
    "outputS3Bucket": "stage-output-bucket"
  }
}
```

### D. API Endpoint (Future)

```
POST /api/v1/trailer-narrative/generate

Request Body: (See Sample Input Payload above)

Response:
{
  "status": "processing",
  "jobId": "job_12345",
  "estimatedTime": 2400,
  "progressUrl": "wss://api.stage.com/progress/job_12345"
}

GET /api/v1/trailer-narrative/status/{jobId}

Response:
{
  "status": "complete",
  "progress": 100,
  "outputs": {
    "jsonReport": "s3://stage-output-bucket/movie_xyz/narrative_report.json",
    "trailers": [
      "s3://stage-output-bucket/movie_xyz/trailers/dramatic_v1.mp4",
      "s3://stage-output-bucket/movie_xyz/trailers/action_v1.mp4",
      ...
    ]
  }
}
```

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-09 | BMad Master | Initial PRD |
| 2.0.0 | 2026-01-09 | BMad Master | Added trailer video generation, script input, subtitle input |

---

*This PRD was generated by BMad Master for Stage Tech Projects*
