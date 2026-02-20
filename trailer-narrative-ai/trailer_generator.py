#!/usr/bin/env python3
"""Production-Grade Trailer Generator - Best Quality Output

FEATURES:
- Indian dialect support (Hindi, Haryanvi, Bhojpuri, Rajasthani, Gujarati)
- HuggingFace open-source models (NO paid APIs)
- Professional 5-Act trailer structure
- Character introduction with emotional hooks
- Story building WITHOUT revealing climax
- Question-based endings for maximum engagement

USAGE:
    python trailer_generator.py /path/to/movie.mp4 [--output output_dir]

"""

import os
import sys
import json
import subprocess
import tempfile
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stderr, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>", level="INFO")


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class DialogueSegment:
    """A segment of dialogue with timestamp."""
    start_time: float
    end_time: float
    text: str
    dialect: Optional[str] = None
    is_question: bool = False
    emotional_score: int = 0
    trailer_score: int = 0


@dataclass
class Scene:
    """A detected scene from the video."""
    id: str
    start_time: float
    end_time: float
    duration: float
    dialogue: Optional[str] = None
    emotional_score: int = 0
    action_score: int = 0
    trailer_potential: int = 0
    is_spoiler: bool = False
    scene_type: str = "general"
    characters: List[str] = field(default_factory=list)


@dataclass
class TrailerShot:
    """A shot selected for the trailer."""
    order: int
    scene: Scene
    purpose: str  # hook, character, conflict, climax_tease
    transition: str = "cut"
    text_overlay: Optional[str] = None


@dataclass
class TrailerNarrative:
    """Complete trailer narrative."""
    id: str
    style: str
    shots: List[TrailerShot]
    total_duration: float
    dialogue_count: int
    confidence: int
    hook_ending: Optional[str] = None


# =============================================================================
# DIALECT DETECTION - Comprehensive Indian Language Support
# =============================================================================

class DialectDetector:
    """Detect and score Indian dialects in text."""

    # Dialect-specific vocabulary
    DIALECT_WORDS = {
        'haryanvi': [
            'thare', 'mahre', 'tanne', 'manne', 'ghani', 'ghano', 'tau', 'taai',
            'chhora', 'chhori', 'lugai', 'byah', 'kai', 'kyu', 'kithe', 'kadd',
            'izzat', 'laad', 'mohabaat', 'baat', 'kade', 'haan', 'na'
        ],
        'bhojpuri': [
            'hamar', 'tohar', 'hamra', 'tohra', 'maai', 'babuji', 'bhaiya',
            'didiya', 'saiya', 'piya', 'jaan', 'pran', 'ka', 'kahe', 'kaahe',
            'kaisan', 'kahiya', 'rahi', 'jaai', 'gail', 'bhail', 'rahwe'
        ],
        'rajasthani': [
            'mhare', 'thare', 'mhara', 'thara', 'bapu', 'bai', 'banna', 'banni',
            'laadli', 'pyaaro', 'padharo', 'khamma', 'kai', 'kyu', 'futro'
        ],
        'gujarati': [
            'tame', 'ame', 'mari', 'tari', 'bhai', 'ben', 'dikro', 'dikri',
            'su', 'shu', 'kem', 'kyare', 'majama', 'saru', 'saras', 'chhe'
        ],
        'hindi': [
            'kya', 'kaun', 'kyun', 'kaise', 'kab', 'kahan', 'pyaar', 'dil',
            'maa', 'baap', 'beta', 'beti', 'zindagi', 'maut', 'sapna'
        ]
    }

    # Question words (GOLD for trailer hooks)
    QUESTION_WORDS = [
        '?', 'kya', 'kaun', 'kyun', 'kaise', 'kab', 'kahan',  # Hindi
        'kai', 'kithe', 'kadd',  # Haryanvi
        'ka', 'kahe', 'kaisan', 'kahiya',  # Bhojpuri
        'su', 'shu', 'kem', 'kyare',  # Gujarati
    ]

    # Emotional words (high trailer value)
    EMOTIONAL_WORDS = [
        'pyaar', 'love', 'dil', 'jaan', 'maa', 'baap', 'family',
        'kasam', 'promise', 'sorry', 'maaf', 'rona', 'cry',
        'zindagi', 'life', 'maut', 'death', 'sapna', 'dream',
        'izzat', 'honor', 'laad', 'mohabaat'
    ]

    # Spoiler words (AVOID in trailer)
    SPOILER_WORDS = [
        'mar gaya', 'maar diya', 'khatam', 'the end', 'ant',
        'sach yeh hai', 'truth is', 'because', 'isliye', 'finally',
        'revealed', 'solved', 'jeet gaye', 'haar gaye',
        'mar gail', 'ho gail', 'mar gyo', 'mari gayo'
    ]

    def detect_dialect(self, text: str) -> Tuple[str, float]:
        """Detect primary dialect and confidence."""
        if not text:
            return 'hindi', 0.0

        text_lower = text.lower()
        scores = {}

        for dialect, words in self.DIALECT_WORDS.items():
            score = sum(1 for w in words if w in text_lower)
            if score > 0:
                scores[dialect] = score

        if not scores:
            return 'hindi', 0.5

        best = max(scores, key=scores.get)
        confidence = min(1.0, scores[best] / 5)
        return best, confidence

    def score_for_trailer(self, text: str) -> int:
        """Score text for trailer potential (0-100)."""
        if not text:
            return 0

        text_lower = text.lower()
        score = 30  # Base score for having dialogue

        # Question = GOLD (+40)
        if '?' in text or any(w in text_lower for w in self.QUESTION_WORDS[:10]):
            score += 40

        # Emotional words (+20)
        if any(w in text_lower for w in self.EMOTIONAL_WORDS):
            score += 20

        # Good length 5-15 words (+10)
        words = text.split()
        if 5 <= len(words) <= 15:
            score += 10

        # Spoiler penalty (-50)
        if any(s in text_lower for s in self.SPOILER_WORDS):
            score -= 50

        return max(0, min(100, score))

    def is_question(self, text: str) -> bool:
        """Check if text is a question."""
        if not text:
            return False
        text_lower = text.lower()
        return '?' in text or any(w in text_lower for w in self.QUESTION_WORDS[:10])


# =============================================================================
# AUDIO EXTRACTION & TRANSCRIPTION
# =============================================================================

class AudioTranscriber:
    """Transcribe dialogue directly from video with Indian dialect support.

    NO separate audio extraction needed - Whisper handles video files directly!
    """

    def __init__(self, model_size: str = "medium"):
        """Initialize transcriber.

        Args:
            model_size: Whisper model size (small, medium, large)
        """
        self.model_size = model_size
        self.pipeline = None
        self.dialect_detector = DialectDetector()

    def _load_model(self):
        """Load Whisper model for transcription."""
        if self.pipeline is not None:
            return

        from transformers import pipeline
        import torch

        model_name = f"openai/whisper-{self.model_size}"
        logger.info(f"Loading {model_name}...")

        # Use CPU for Whisper - MPS has sparse tensor compatibility issues
        # Error: "Could not run 'aten::_sparse_coo_tensor_with_dims_and_tensors' with SparseMPS"
        if torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
        else:
            # Force CPU - MPS doesn't work reliably with Whisper
            device = "cpu"
            dtype = torch.float32

        logger.info(f"Using device: {device}")

        self.pipeline = pipeline(
            "automatic-speech-recognition",
            model=model_name,
            torch_dtype=dtype,
            device=device if device != "cpu" else -1,
        )

        logger.info("Whisper model ready")

    def transcribe(self, video_path: str) -> List[DialogueSegment]:
        """Transcribe dialogue directly from video file.

        Whisper handles video files directly - no WAV extraction needed!
        It uses ffmpeg internally to read audio from any video format.
        """
        # Load model
        self._load_model()

        # Transcribe directly from video (Whisper handles this!)
        logger.info(f"Transcribing dialogue from: {Path(video_path).name}")
        logger.info("(Whisper reads audio directly from video - no extraction needed)")

        try:
            result = self.pipeline(
                video_path,  # Direct video path - Whisper handles it!
                return_timestamps=True,
                generate_kwargs={
                    "language": "hi",  # Hindi covers all Indian dialects
                    "task": "transcribe"
                }
            )
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return []

        # Process chunks into dialogue segments
        segments = []
        chunks = result.get("chunks", [])

        if not chunks and result.get("text"):
            # Single chunk fallback
            chunks = [{"text": result["text"], "timestamp": (0, 60)}]

        for chunk in chunks:
            text = chunk.get("text", "").strip()
            if not text or len(text) < 3:
                continue

            timestamp = chunk.get("timestamp", (0, 0))
            start = timestamp[0] if timestamp[0] else 0
            end = timestamp[1] if timestamp[1] else start + 5

            dialect, _ = self.dialect_detector.detect_dialect(text)
            trailer_score = self.dialect_detector.score_for_trailer(text)
            is_question = self.dialect_detector.is_question(text)

            segment = DialogueSegment(
                start_time=start,
                end_time=end,
                text=text,
                dialect=dialect,
                is_question=is_question,
                trailer_score=trailer_score
            )
            segments.append(segment)

        logger.info(f"Found {len(segments)} dialogue segments")

        # Log sample dialogues
        for seg in segments[:5]:
            logger.info(f"  [{seg.start_time:.1f}s] \"{seg.text[:60]}\"")

        return segments


# =============================================================================
# SCENE DETECTION
# =============================================================================

class SceneDetector:
    """Detect scenes in video."""

    def detect(self, video_path: str) -> List[Scene]:
        """Detect scenes using PySceneDetect."""
        try:
            from scenedetect import detect, ContentDetector

            logger.info("Detecting scenes...")

            scene_list = detect(video_path, ContentDetector(threshold=27.0))

            scenes = []
            for i, (start, end) in enumerate(scene_list):
                scene = Scene(
                    id=f"scene_{i+1:03d}",
                    start_time=start.get_seconds(),
                    end_time=end.get_seconds(),
                    duration=end.get_seconds() - start.get_seconds()
                )
                scenes.append(scene)

            logger.info(f"Detected {len(scenes)} scenes")
            return scenes

        except Exception as e:
            logger.error(f"Scene detection failed: {e}")
            # Fallback: create scenes at regular intervals
            return self._fallback_scenes(video_path)

    def _fallback_scenes(self, video_path: str, interval: float = 10.0) -> List[Scene]:
        """Create scenes at regular intervals as fallback."""
        try:
            # Get video duration
            cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                   '-of', 'default=noprint_wrappers=1:nokey=1', video_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            duration = float(result.stdout.strip())
        except:
            duration = 7200  # Assume 2 hours

        scenes = []
        current = 0
        i = 0
        while current < duration:
            scene = Scene(
                id=f"scene_{i+1:03d}",
                start_time=current,
                end_time=min(current + interval, duration),
                duration=min(interval, duration - current)
            )
            scenes.append(scene)
            current += interval
            i += 1

        logger.info(f"Created {len(scenes)} fallback scenes")
        return scenes


# =============================================================================
# CONTENT ANALYZER - Score scenes for trailer
# =============================================================================

class ContentAnalyzer:
    """Analyze and score scenes for trailer potential."""

    def __init__(self):
        self.dialect_detector = DialectDetector()

    def analyze(
        self,
        scenes: List[Scene],
        dialogues: List[DialogueSegment],
        video_duration: float
    ) -> List[Scene]:
        """Analyze scenes and assign scores."""
        logger.info("Analyzing scene content...")

        # Map dialogues to scenes
        for scene in scenes:
            scene_dialogues = [
                d for d in dialogues
                if d.start_time >= scene.start_time and d.start_time < scene.end_time
            ]

            if scene_dialogues:
                # Combine dialogue text
                scene.dialogue = " ".join(d.text for d in scene_dialogues)

                # Use best scoring dialogue
                best = max(scene_dialogues, key=lambda d: d.trailer_score)
                scene.emotional_score = best.trailer_score

            # Position-based scoring
            position = scene.start_time / video_duration if video_duration > 0 else 0.5

            # Mark potential spoilers (last 15% of movie)
            if position > 0.85:
                scene.is_spoiler = True
                scene.trailer_potential = 10
            else:
                # Calculate trailer potential
                potential = 30  # Base

                if scene.dialogue:
                    potential += 30  # Has dialogue

                    # Question bonus
                    if self.dialect_detector.is_question(scene.dialogue):
                        potential += 25

                    # Emotional words
                    potential += min(20, scene.emotional_score // 5)

                # Position bonus (early-mid movie = good intro material)
                if 0.1 < position < 0.6:
                    potential += 15

                scene.trailer_potential = min(100, potential)

            # Determine scene type
            if position < 0.15 and not scene.dialogue:
                scene.scene_type = "establishing"
            elif scene.dialogue and position < 0.35:
                scene.scene_type = "character"
            elif scene.dialogue:
                scene.scene_type = "dialogue"
            else:
                scene.scene_type = "action"

        # Log analysis results
        dialogue_scenes = [s for s in scenes if s.dialogue]
        logger.info(f"Analyzed {len(scenes)} scenes: {len(dialogue_scenes)} with dialogue")

        return scenes


# =============================================================================
# NARRATIVE BUILDER - Create professional trailer structure
# =============================================================================

class NarrativeBuilder:
    """Build professional 5-Act trailer narrative."""

    # Professional Trailer Structure
    # ACT 1: HOOK (5-10%) - Grab attention with visual/audio impact
    # ACT 2: WORLD (10-15%) - Establish setting, atmosphere
    # ACT 3: CHARACTER (20-25%) - Introduce protagonist, show personality
    # ACT 4: CONFLICT (30-35%) - Rising tension, story stakes
    # ACT 5: CLIMAX TEASE (15-20%) - End with question hook, don't reveal

    STRUCTURE = {
        'hook': {'ratio': 0.08, 'max_shots': 2, 'needs_dialogue': False},
        'world': {'ratio': 0.12, 'max_shots': 2, 'needs_dialogue': False},
        'character': {'ratio': 0.22, 'max_shots': 3, 'needs_dialogue': True},
        'conflict': {'ratio': 0.33, 'max_shots': 5, 'needs_dialogue': True},
        'climax_tease': {'ratio': 0.25, 'max_shots': 3, 'needs_dialogue': True}
    }

    def __init__(self):
        self.dialect_detector = DialectDetector()

    def build(
        self,
        scenes: List[Scene],
        target_duration: int = 90,
        style: str = "dramatic"
    ) -> TrailerNarrative:
        """Build trailer narrative from analyzed scenes."""
        logger.info(f"Building {style} trailer narrative ({target_duration}s)...")

        # Filter out spoilers and very short scenes
        valid_scenes = [
            s for s in scenes
            if not s.is_spoiler and s.duration >= 2 and s.duration <= 20
        ]

        # Separate scenes with/without dialogue
        dialogue_scenes = [s for s in valid_scenes if s.dialogue]
        visual_scenes = [s for s in valid_scenes if not s.dialogue]

        logger.info(f"Available: {len(dialogue_scenes)} dialogue, {len(visual_scenes)} visual scenes")

        # Sort by trailer potential
        dialogue_scenes.sort(key=lambda s: s.trailer_potential, reverse=True)
        visual_scenes.sort(key=lambda s: s.trailer_potential, reverse=True)

        # Build shot sequence
        shots = []
        used_ids = set()
        order = 1

        for act_name, config in self.STRUCTURE.items():
            act_duration = target_duration * config['ratio']
            act_shots = []
            act_time = 0

            # Select scenes for this act
            if config['needs_dialogue'] and dialogue_scenes:
                candidates = [s for s in dialogue_scenes if s.id not in used_ids]
            else:
                candidates = [s for s in visual_scenes if s.id not in used_ids]
                if not candidates:
                    candidates = [s for s in dialogue_scenes if s.id not in used_ids]

            for scene in candidates:
                if len(act_shots) >= config['max_shots']:
                    break
                if act_time >= act_duration * 1.2:
                    break

                # Calculate shot duration
                shot_dur = min(scene.duration, 6 if act_name == 'hook' else 8)

                shot = TrailerShot(
                    order=order,
                    scene=scene,
                    purpose=act_name,
                    transition="cut" if act_name == "conflict" else "dissolve"
                )

                act_shots.append(shot)
                used_ids.add(scene.id)
                act_time += shot_dur
                order += 1

            shots.extend(act_shots)

        # Find best hook ending (question dialogue)
        hook_ending = self._find_hook_ending(dialogue_scenes, used_ids)
        if hook_ending:
            shot = TrailerShot(
                order=order,
                scene=hook_ending,
                purpose="climax_tease",
                transition="cut"
            )
            shots.append(shot)
            logger.info(f"Hook ending: \"{hook_ending.dialogue[:60]}...\"")

        # Ensure minimum shots
        if len(shots) < 10:
            logger.warning(f"Only {len(shots)} shots, adding more...")
            remaining = [s for s in valid_scenes if s.id not in used_ids]
            remaining.sort(key=lambda s: s.trailer_potential, reverse=True)

            for scene in remaining[:10 - len(shots)]:
                shot = TrailerShot(
                    order=len(shots) + 1,
                    scene=scene,
                    purpose="conflict"
                )
                shots.append(shot)

        # Calculate stats
        total_duration = sum(min(s.scene.duration, 7) for s in shots)
        dialogue_count = sum(1 for s in shots if s.scene.dialogue)
        confidence = self._calculate_confidence(shots)

        logger.info(f"Narrative: {len(shots)} shots, {total_duration:.0f}s, confidence: {confidence}")
        logger.info(f"Shots with dialogue: {dialogue_count}/{len(shots)}")

        # Log selected dialogue scenes
        for shot in shots:
            if shot.scene.dialogue:
                logger.info(f"  [{shot.purpose}] \"{shot.scene.dialogue[:50]}...\"")

        return TrailerNarrative(
            id=f"{style}_v1",
            style=style,
            shots=shots,
            total_duration=total_duration,
            dialogue_count=dialogue_count,
            confidence=confidence,
            hook_ending=hook_ending.dialogue if hook_ending else None
        )

    def _find_hook_ending(self, scenes: List[Scene], used_ids: set) -> Optional[Scene]:
        """Find best scene for hook ending (question/emotional)."""
        candidates = []

        for scene in scenes:
            if scene.id in used_ids:
                continue
            if not scene.dialogue:
                continue

            score = 0

            # Question = BEST
            if self.dialect_detector.is_question(scene.dialogue):
                score += 100

            # Emotional content
            score += scene.emotional_score

            # Good length
            words = scene.dialogue.split()
            if 5 <= len(words) <= 15:
                score += 20

            if score > 50:
                candidates.append((scene, score))

        if candidates:
            candidates.sort(key=lambda x: x[1], reverse=True)
            return candidates[0][0]

        return None

    def _calculate_confidence(self, shots: List[TrailerShot]) -> int:
        """Calculate confidence score for narrative."""
        if not shots:
            return 0

        score = 50

        # Dialogue presence
        dialogue_ratio = sum(1 for s in shots if s.scene.dialogue) / len(shots)
        score += int(dialogue_ratio * 30)

        # Hook ending
        if shots and shots[-1].scene.dialogue:
            if self.dialect_detector.is_question(shots[-1].scene.dialogue):
                score += 15

        # Shot count
        if 10 <= len(shots) <= 18:
            score += 5

        return min(100, score)


# =============================================================================
# TRAILER ASSEMBLER - Create final video
# =============================================================================

class TrailerAssembler:
    """Assemble final trailer video."""

    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir = Path(tempfile.gettempdir()) / "trailer_assembly"
        self.temp_dir.mkdir(exist_ok=True)

    def assemble(
        self,
        video_path: str,
        narrative: TrailerNarrative,
        project_id: str
    ) -> str:
        """Assemble trailer from narrative."""
        logger.info(f"Assembling trailer: {len(narrative.shots)} shots")

        # Extract individual shots
        shot_files = []
        for i, shot in enumerate(narrative.shots):
            shot_file = self._extract_shot(
                video_path,
                shot.scene.start_time,
                min(shot.scene.duration, 7),
                i
            )
            if shot_file:
                shot_files.append(shot_file)

        if not shot_files:
            raise RuntimeError("No shots extracted")

        # Concatenate shots
        output_path = self.output_dir / f"{project_id}_{narrative.style}_trailer.mp4"
        self._concatenate(shot_files, str(output_path))

        # Cleanup temp files
        for f in shot_files:
            try:
                Path(f).unlink()
            except:
                pass

        logger.info(f"Trailer assembled: {output_path}")
        return str(output_path)

    def _extract_shot(
        self,
        video_path: str,
        start_time: float,
        duration: float,
        index: int
    ) -> Optional[str]:
        """Extract single shot from video."""
        output = self.temp_dir / f"shot_{index:03d}.mp4"

        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-i', video_path,
            '-t', str(duration),
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            '-avoid_negative_ts', 'make_zero',
            str(output)
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and output.exists():
                return str(output)
        except:
            pass

        return None

    def _concatenate(self, shot_files: List[str], output_path: str):
        """Concatenate shots into final video."""
        # Create concat file
        concat_file = self.temp_dir / "concat.txt"
        with open(concat_file, 'w') as f:
            for shot in shot_files:
                f.write(f"file '{shot}'\n")

        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat', '-safe', '0',
            '-i', str(concat_file),
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
            '-c:a', 'aac', '-b:a', '256k',
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Concatenation failed: {result.stderr[:200]}")

        concat_file.unlink()


# =============================================================================
# OUTPUT FORMATTER
# =============================================================================

class OutputFormatter:
    """Format output JSON."""

    def format(
        self,
        narrative: TrailerNarrative,
        trailer_path: str,
        project_id: str
    ) -> Dict[str, Any]:
        """Format narrative as JSON output."""
        shots = []
        for shot in narrative.shots:
            shots.append({
                "order": shot.order,
                "scene_ref": shot.scene.id,
                "timecode_start": self._format_timecode(shot.scene.start_time),
                "timecode_end": self._format_timecode(shot.scene.end_time),
                "recommended_duration": min(shot.scene.duration, 7),
                "purpose": shot.purpose,
                "audio_recommendation": "dialogue" if shot.scene.dialogue else "music",
                "dialogue_line": shot.scene.dialogue[:100] if shot.scene.dialogue else None,
                "transition_in": shot.transition,
                "transition_out": "cut"
            })

        return {
            "projectId": project_id,
            "status": "success",
            "generatedAt": datetime.now().isoformat(),
            "trailer": {
                "id": narrative.id,
                "style": narrative.style,
                "duration": narrative.total_duration,
                "shotCount": len(narrative.shots),
                "dialogueCount": narrative.dialogue_count,
                "confidence": narrative.confidence,
                "hookEnding": narrative.hook_ending,
                "videoPath": trailer_path
            },
            "shotSequence": shots
        }

    def _format_timecode(self, seconds: float) -> str:
        """Format seconds as timecode."""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}"


# =============================================================================
# MAIN GENERATOR
# =============================================================================

class TrailerGenerator:
    """Main trailer generator - orchestrates entire pipeline."""

    def __init__(
        self,
        output_dir: str = "./output",
        whisper_model: str = "medium"
    ):
        self.output_dir = Path(output_dir)
        self.whisper_model = whisper_model

        # Initialize components
        self.transcriber = AudioTranscriber(model_size=whisper_model)
        self.scene_detector = SceneDetector()
        self.content_analyzer = ContentAnalyzer()
        self.narrative_builder = NarrativeBuilder()
        self.assembler = TrailerAssembler(str(self.output_dir / "trailers"))
        self.formatter = OutputFormatter()

    def generate(
        self,
        video_path: str,
        project_id: str = "trailer",
        style: str = "dramatic",
        target_duration: int = 90
    ) -> Dict[str, Any]:
        """Generate trailer from video.

        Args:
            video_path: Path to source video
            project_id: Project identifier
            style: Trailer style (dramatic, action, emotional, mystery)
            target_duration: Target trailer duration in seconds

        Returns:
            Output JSON with trailer info and shot sequence
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        logger.info("=" * 60)
        logger.info(f"TRAILER GENERATOR - {video_path.name}")
        logger.info("=" * 60)

        # Step 1: Scene Detection
        logger.info("\n[1/5] SCENE DETECTION")
        scenes = self.scene_detector.detect(str(video_path))

        # Get video duration
        try:
            cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                   '-of', 'default=noprint_wrappers=1:nokey=1', str(video_path)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            video_duration = float(result.stdout.strip())
        except:
            video_duration = scenes[-1].end_time if scenes else 7200

        # Step 2: Audio Transcription
        logger.info("\n[2/5] AUDIO TRANSCRIPTION (Indian Dialects)")
        dialogues = self.transcriber.transcribe(str(video_path))

        # Step 3: Content Analysis
        logger.info("\n[3/5] CONTENT ANALYSIS")
        scenes = self.content_analyzer.analyze(scenes, dialogues, video_duration)

        # Step 4: Narrative Building
        logger.info("\n[4/5] NARRATIVE BUILDING (5-Act Structure)")
        narrative = self.narrative_builder.build(scenes, target_duration, style)

        # Step 5: Trailer Assembly
        logger.info("\n[5/5] TRAILER ASSEMBLY")
        trailer_path = self.assembler.assemble(str(video_path), narrative, project_id)

        # Format output
        output = self.formatter.format(narrative, trailer_path, project_id)

        # Save JSON
        json_path = self.output_dir / f"{project_id}_output.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        logger.info("\n" + "=" * 60)
        logger.info("GENERATION COMPLETE")
        logger.info(f"Trailer: {trailer_path}")
        logger.info(f"JSON: {json_path}")
        logger.info(f"Confidence: {narrative.confidence}%")
        if narrative.hook_ending:
            logger.info(f"Hook: \"{narrative.hook_ending[:50]}...\"")
        logger.info("=" * 60)

        return output


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

def main():
    """Command line interface."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate professional movie trailer with Indian dialect support"
    )
    parser.add_argument("video", help="Path to source video file")
    parser.add_argument("--output", "-o", default="./output", help="Output directory")
    parser.add_argument("--project", "-p", default="trailer", help="Project ID")
    parser.add_argument("--style", "-s", default="dramatic",
                       choices=["dramatic", "action", "emotional", "mystery", "thriller"],
                       help="Trailer style")
    parser.add_argument("--duration", "-d", type=int, default=90,
                       help="Target duration in seconds")
    parser.add_argument("--whisper", "-w", default="medium",
                       choices=["small", "medium", "large"],
                       help="Whisper model size (medium recommended for Indian dialects)")
    parser.add_argument("--json", "-j", help="JSON input (for compatibility)")

    args = parser.parse_args()

    # Handle JSON input for compatibility
    if args.json:
        try:
            data = json.loads(args.json)
            video = data.get("localFilePath", args.video)
            project = data.get("projectId", args.project)
        except:
            video = args.video
            project = args.project
    else:
        video = args.video
        project = args.project

    # Generate trailer
    generator = TrailerGenerator(
        output_dir=args.output,
        whisper_model=args.whisper
    )

    try:
        output = generator.generate(
            video_path=video,
            project_id=project,
            style=args.style,
            target_duration=args.duration
        )

        # Print output JSON
        print(json.dumps(output, indent=2, ensure_ascii=False))

    except Exception as e:
        logger.error(f"Generation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
