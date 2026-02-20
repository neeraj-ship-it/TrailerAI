"""Production-Grade Story Engine for Trailer Narratives.

Creates trailers with professional narrative structure:
- 5-Act Story Structure (Hook, World, Character, Conflict, Climax Tease)
- Character Arc Detection and Introduction
- Suspense Curve Optimization
- Hook and Payoff Patterns
- Dialect-Aware Emotional Beats

Output: Production-ready trailers requiring minimal editor intervention.
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Set
from enum import Enum
from loguru import logger

from config import get_config


class StoryBeat(Enum):
    """Professional trailer story beats (5-Act Structure)."""
    HOOK = "hook"                    # 5-10% - Attention grabber
    WORLD = "world"                  # 10-15% - Setting, atmosphere
    CHARACTER = "character"          # 20-25% - Hero introduction
    CONFLICT = "conflict"            # 30-35% - Rising tension
    CLIMAX_TEASE = "climax_tease"   # 15-20% - Suspense, question ending


class SceneCategory(Enum):
    """Scene categories for trailer selection."""
    ESTABLISHING = "establishing"    # Location, world-building
    CHARACTER_INTRO = "character_intro"  # First appearance
    DIALOGUE = "dialogue"            # Conversation scenes
    ACTION = "action"                # High energy sequences
    EMOTIONAL = "emotional"          # Emotional moments
    TENSION = "tension"              # Suspenseful scenes
    REVELATION = "revelation"        # Plot reveals
    SPECTACLE = "spectacle"          # Visual highlights


@dataclass
class StoryBeatConfig:
    """Configuration for each story beat."""
    beat: StoryBeat
    duration_ratio: float           # % of total trailer
    max_scenes: int                 # Max scenes in this beat
    priority_categories: List[str]  # Preferred scene types
    requires_dialogue: bool         # Must have dialogue
    allows_spoiler: bool            # Can use higher spoiler scenes
    transition_style: str           # Transition to next beat


# Professional 5-Act Trailer Structure
TRAILER_STRUCTURE = {
    StoryBeat.HOOK: StoryBeatConfig(
        beat=StoryBeat.HOOK,
        duration_ratio=0.08,
        max_scenes=2,
        priority_categories=["spectacle", "action", "establishing"],
        requires_dialogue=False,
        allows_spoiler=False,
        transition_style="cut"
    ),
    StoryBeat.WORLD: StoryBeatConfig(
        beat=StoryBeat.WORLD,
        duration_ratio=0.12,
        max_scenes=2,
        priority_categories=["establishing", "spectacle"],
        requires_dialogue=False,
        allows_spoiler=False,
        transition_style="dissolve"
    ),
    StoryBeat.CHARACTER: StoryBeatConfig(
        beat=StoryBeat.CHARACTER,
        duration_ratio=0.22,
        max_scenes=3,
        priority_categories=["character_intro", "dialogue", "emotional"],
        requires_dialogue=True,
        allows_spoiler=False,
        transition_style="dissolve"
    ),
    StoryBeat.CONFLICT: StoryBeatConfig(
        beat=StoryBeat.CONFLICT,
        duration_ratio=0.33,
        max_scenes=5,
        priority_categories=["tension", "action", "dialogue", "emotional"],
        requires_dialogue=True,
        allows_spoiler=False,
        transition_style="cut"
    ),
    StoryBeat.CLIMAX_TEASE: StoryBeatConfig(
        beat=StoryBeat.CLIMAX_TEASE,
        duration_ratio=0.25,
        max_scenes=4,
        priority_categories=["tension", "revelation", "emotional"],
        requires_dialogue=True,
        allows_spoiler=False,  # Tease, don't spoil
        transition_style="cut"
    )
}


@dataclass
class CharacterProfile:
    """Detected character profile for trailer."""
    name: Optional[str]
    first_appearance: float         # Timestamp of first appearance
    total_screen_time: float        # Total seconds on screen
    dialogue_count: int             # Number of dialogue scenes
    emotional_moments: int          # Emotional scenes
    key_quotes: List[str]           # Best dialogue lines
    arc_type: str                   # hero, antagonist, supporting
    introduction_scene_id: str      # Best scene for intro


@dataclass
class TrailerShot:
    """A single shot in the trailer."""
    order: int
    scene_id: str
    start_time: float
    end_time: float
    duration: float
    beat: StoryBeat
    category: SceneCategory
    has_dialogue: bool
    dialogue_text: Optional[str]
    emotional_score: int
    action_score: int
    is_character_intro: bool
    is_hook_ending: bool
    transition_in: str
    transition_out: str
    music_cue: str                  # music, dialogue, silence
    text_overlay: Optional[str]     # Title, tagline, etc.

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order": self.order,
            "scene_ref": self.scene_id,
            "timecode_start": self._format_tc(self.start_time),
            "timecode_end": self._format_tc(self.end_time),
            "recommended_duration": self.duration,
            "purpose": self.beat.value,
            "category": self.category.value,
            "audio_recommendation": self.music_cue,
            "dialogue_line": self.dialogue_text,
            "transition_in": self.transition_in,
            "transition_out": self.transition_out,
            "emotional_score": self.emotional_score,
            "action_score": self.action_score,
            "is_character_intro": self.is_character_intro,
            "is_hook_ending": self.is_hook_ending,
            "text_overlay": self.text_overlay
        }

    @staticmethod
    def _format_tc(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}"


@dataclass
class SuspenseCurve:
    """Suspense/tension curve for the trailer."""
    timestamps: List[float]         # Time points
    values: List[float]             # Tension values (0-100)
    peak_position: float            # Where peak occurs (0-1)
    peak_value: float               # Peak tension value
    average_tension: float          # Average across trailer
    curve_quality: float            # How well it matches ideal (0-100)


@dataclass
class StoryNarrative:
    """Complete story narrative for a trailer variant."""
    id: str
    style: str
    title: str
    target_duration: int
    actual_duration: float
    shots: List[TrailerShot]
    characters: List[CharacterProfile]
    suspense_curve: SuspenseCurve
    opening_hook: str
    closing_hook: str
    title_position: float           # Where title appears (0-1)
    structure_quality: int          # Quality score (0-100)
    confidence: int                 # Overall confidence (0-100)
    beat_breakdown: Dict[str, float]  # Duration per beat

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "style": self.style,
            "title": self.title,
            "target_duration": self.target_duration,
            "actual_duration": self.actual_duration,
            "shot_sequence": [s.to_dict() for s in self.shots],
            "character_count": len(self.characters),
            "suspense_curve": {
                "peak_position": self.suspense_curve.peak_position,
                "peak_value": self.suspense_curve.peak_value,
                "quality": self.suspense_curve.curve_quality
            },
            "opening_hook": self.opening_hook,
            "closing_tag": self.closing_hook,
            "title_position": self.title_position,
            "structure": {"phases": [b.value for b in StoryBeat]},
            "structure_quality": self.structure_quality,
            "confidence": self.confidence,
            "beat_breakdown": self.beat_breakdown
        }


class StoryEngine:
    """Production-grade story engine for trailer narratives.

    Creates trailers with:
    - Professional 5-act structure
    - Character introduction and arc
    - Suspense curve optimization
    - Hook-based endings
    - Dialect-aware emotional beats
    """

    # Dialect-aware power words for scoring
    POWER_WORDS = {
        "question": ["?", "kya", "kaun", "kyun", "kaise", "kai", "ka", "kem", "su"],
        "emotional": ["pyaar", "dil", "maa", "jaan", "kasam", "mohabaat", "laad"],
        "tension": ["khatre", "dar", "jung", "ladai", "mukabla", "takkar"],
        "spectacle": ["toofan", "tabahi", "andhera", "aag", "pani"],
    }

    # Spoiler patterns (avoid in trailer)
    SPOILER_PATTERNS = [
        "mar gaya", "khatam", "ant", "the end", "sach yeh hai",
        "isliye", "finally", "revealed", "truth is"
    ]

    # Style-specific configurations
    STYLE_CONFIGS = {
        "dramatic": {
            "pacing": "slow_build",
            "music_style": "orchestral_build",
            "dialogue_ratio": 0.4,
            "action_ratio": 0.2
        },
        "action": {
            "pacing": "fast_cuts",
            "music_style": "high_energy",
            "dialogue_ratio": 0.2,
            "action_ratio": 0.5
        },
        "emotional": {
            "pacing": "flowing",
            "music_style": "melodic",
            "dialogue_ratio": 0.5,
            "action_ratio": 0.1
        },
        "mystery": {
            "pacing": "deliberate",
            "music_style": "suspenseful",
            "dialogue_ratio": 0.35,
            "action_ratio": 0.15
        },
        "thriller": {
            "pacing": "tension_build",
            "music_style": "pulsing",
            "dialogue_ratio": 0.3,
            "action_ratio": 0.35
        },
        "comedy": {
            "pacing": "rhythmic",
            "music_style": "upbeat",
            "dialogue_ratio": 0.5,
            "action_ratio": 0.15
        },
        "epic": {
            "pacing": "crescendo",
            "music_style": "orchestral_epic",
            "dialogue_ratio": 0.3,
            "action_ratio": 0.35
        },
        "character": {
            "pacing": "intimate",
            "music_style": "subtle",
            "dialogue_ratio": 0.55,
            "action_ratio": 0.1
        }
    }

    def __init__(self):
        """Initialize story engine."""
        self.config = get_config()
        logger.info("StoryEngine initialized - Production Grade")

    def build_narrative(
        self,
        scenes: List[Dict[str, Any]],
        video_duration: float,
        style: str,
        target_duration: int = 90,
        metadata: Optional[Dict[str, Any]] = None
    ) -> StoryNarrative:
        """Build a complete story narrative for trailer.

        Args:
            scenes: Analyzed scenes with scores
            video_duration: Total video duration
            style: Narrative style
            target_duration: Target trailer duration
            metadata: Content metadata (title, genre, etc.)

        Returns:
            Complete StoryNarrative
        """
        logger.info(f"Building {style} narrative from {len(scenes)} scenes")

        metadata = metadata or {}
        title = metadata.get("title", "Untitled")
        style_config = self.STYLE_CONFIGS.get(style, self.STYLE_CONFIGS["dramatic"])

        # Step 1: Categorize and score scenes
        categorized = self._categorize_scenes(scenes, video_duration)

        # Step 2: Detect characters
        characters = self._detect_characters(scenes, video_duration)

        # Step 3: Find best hook ending
        hook_ending = self._find_hook_ending(categorized)

        # Step 4: Build shot sequence following 5-act structure
        shots = self._build_shot_sequence(
            categorized,
            characters,
            hook_ending,
            target_duration,
            style_config
        )

        # Step 5: Calculate suspense curve
        suspense = self._calculate_suspense_curve(shots)

        # Step 6: Optimize suspense curve
        shots = self._optimize_suspense(shots, suspense)

        # Step 7: Add text overlays (title, taglines)
        shots = self._add_overlays(shots, title, style)

        # Step 8: Calculate quality scores
        structure_quality = self._score_structure(shots)
        confidence = self._calculate_confidence(shots, suspense, characters)

        # Calculate beat breakdown
        beat_breakdown = self._calculate_beat_breakdown(shots)

        actual_duration = sum(s.duration for s in shots)

        # Log dialogue in selected shots
        dialogue_shots = [s for s in shots if s.has_dialogue and s.dialogue_text]
        logger.info(
            f"Narrative built: {len(shots)} shots, {actual_duration:.1f}s, "
            f"quality: {structure_quality}, confidence: {confidence}"
        )
        logger.info(f"Shots with dialogue: {len(dialogue_shots)}/{len(shots)}")

        if len(dialogue_shots) < 5:
            logger.warning(f"WARNING: Only {len(dialogue_shots)} shots have dialogue - trailer may lack impact!")

        for shot in dialogue_shots[:5]:
            if shot.dialogue_text:
                logger.info(f"  [{shot.beat.value}] \"{shot.dialogue_text[:60]}...\"")

        # List shots WITHOUT dialogue for debugging
        no_dialogue = [s for s in shots if not s.dialogue_text]
        if no_dialogue:
            logger.info(f"Shots without dialogue: {len(no_dialogue)} ({[s.beat.value for s in no_dialogue[:5]]})")

        return StoryNarrative(
            id=f"{style}_v1",
            style=style,
            title=title,
            target_duration=target_duration,
            actual_duration=actual_duration,
            shots=shots,
            characters=characters,
            suspense_curve=suspense,
            opening_hook=self._describe_hook(shots[0]) if shots else "",
            closing_hook=self._describe_hook(shots[-1]) if shots else "",
            title_position=self._get_title_position(shots),
            structure_quality=structure_quality,
            confidence=confidence,
            beat_breakdown=beat_breakdown
        )

    def _categorize_scenes(
        self,
        scenes: List[Dict],
        video_duration: float
    ) -> Dict[str, List[Dict]]:
        """Categorize scenes by type for story beats."""
        categorized = {cat.value: [] for cat in SceneCategory}

        for scene in scenes:
            # Skip scenes from last 15% (spoiler zone)
            if video_duration > 0:
                pos = scene.get("start_time", 0) / video_duration
                if pos > 0.85:
                    continue

            duration = scene.get("end_time", 0) - scene.get("start_time", 0)
            if duration < 2 or duration > 20:
                continue

            # Calculate scores
            emotional = scene.get("emotional_score", 0)
            action = scene.get("action_score", 0)
            # Get dialogue from multiple possible fields
            dialogue = (
                scene.get("key_quote") or
                scene.get("dialogue") or
                scene.get("dialogue_highlight") or
                scene.get("dialogue_text") or
                ""
            )
            visual_hook = scene.get("visual_hook")
            scene_type = scene.get("scene_type", "general")
            spoiler = scene.get("spoiler_level", 0)

            # Skip high spoiler scenes
            if spoiler >= 6:
                continue

            # Enhanced scene dict
            enhanced = {
                **scene,
                "duration": duration,
                "position": pos if video_duration > 0 else 0.5,
                "has_dialogue": bool(dialogue and len(dialogue) > 10),
                "dialogue_text": dialogue,
                "is_question": "?" in dialogue if dialogue else False,
                "category_scores": {}
            }

            # Score for each category
            # Establishing shots
            if scene_type in ["establishing", "nature", "location"] or (
                pos < 0.15 and not enhanced["has_dialogue"]
            ):
                enhanced["category_scores"]["establishing"] = 70 + (30 if visual_hook else 0)

            # Character introduction
            if pos < 0.35 and enhanced["has_dialogue"]:
                enhanced["category_scores"]["character_intro"] = 60 + emotional * 0.3

            # Dialogue scenes
            if enhanced["has_dialogue"]:
                dial_score = 50
                if enhanced["is_question"]:
                    dial_score += 30
                dial_score += min(20, len(dialogue.split()) * 2)
                enhanced["category_scores"]["dialogue"] = dial_score

            # Action scenes
            if action > 40:
                enhanced["category_scores"]["action"] = action

            # Emotional scenes
            if emotional > 40:
                enhanced["category_scores"]["emotional"] = emotional

            # Tension scenes
            if 0.4 < pos < 0.8 and (emotional > 50 or action > 40):
                enhanced["category_scores"]["tension"] = (emotional + action) / 2

            # Spectacle scenes
            if visual_hook or action > 60:
                enhanced["category_scores"]["spectacle"] = max(action, 60)

            # Add to best category AND dialogue category if has dialogue
            if enhanced["category_scores"]:
                best_cat = max(enhanced["category_scores"], key=enhanced["category_scores"].get)
                categorized[best_cat].append(enhanced)

                # ALWAYS add to dialogue category if has dialogue (for prioritization)
                if enhanced["has_dialogue"] and best_cat != "dialogue":
                    categorized["dialogue"].append(enhanced)
            elif enhanced["has_dialogue"]:
                # Scene with dialogue but no other scores - still add to dialogue
                enhanced["category_scores"]["dialogue"] = 50
                categorized["dialogue"].append(enhanced)

        # Sort each category by score
        for cat in categorized:
            categorized[cat].sort(
                key=lambda x: x["category_scores"].get(cat, 0),
                reverse=True
            )

        # Log dialogue scene count
        dialogue_count = len(categorized.get("dialogue", []))
        logger.info(f"Categorized scenes: {dialogue_count} with dialogue, {sum(len(v) for v in categorized.values())} total")

        return categorized

    def _detect_characters(
        self,
        scenes: List[Dict],
        video_duration: float
    ) -> List[CharacterProfile]:
        """Detect main characters from scenes."""
        character_data = {}

        for scene in scenes:
            dialogue = scene.get("key_quote") or scene.get("dialogue", "")
            if not dialogue:
                continue

            # Simple character detection from dialogue patterns
            # In production, this would use face detection + speaker diarization
            start_time = scene.get("start_time", 0)
            duration = scene.get("end_time", 0) - start_time
            emotional = scene.get("emotional_score", 0)
            scene_id = scene.get("scene_id", "unknown")

            # Create pseudo-character based on position
            position = start_time / video_duration if video_duration > 0 else 0.5

            if position < 0.3:
                char_key = "protagonist"
            elif 0.3 <= position < 0.6:
                char_key = "supporting"
            else:
                char_key = "antagonist"

            if char_key not in character_data:
                character_data[char_key] = {
                    "first_appearance": start_time,
                    "screen_time": 0,
                    "dialogue_count": 0,
                    "emotional_moments": 0,
                    "quotes": [],
                    "intro_scene": scene_id
                }

            data = character_data[char_key]
            data["screen_time"] += duration
            data["dialogue_count"] += 1
            if emotional > 50:
                data["emotional_moments"] += 1
            if len(dialogue) > 10 and len(data["quotes"]) < 5:
                data["quotes"].append(dialogue[:100])
            if start_time < data["first_appearance"]:
                data["first_appearance"] = start_time
                data["intro_scene"] = scene_id

        # Convert to CharacterProfile objects
        characters = []
        for char_type, data in character_data.items():
            characters.append(CharacterProfile(
                name=None,  # Would be detected by face recognition
                first_appearance=data["first_appearance"],
                total_screen_time=data["screen_time"],
                dialogue_count=data["dialogue_count"],
                emotional_moments=data["emotional_moments"],
                key_quotes=data["quotes"],
                arc_type=char_type,
                introduction_scene_id=data["intro_scene"]
            ))

        # Sort by screen time (protagonist first)
        characters.sort(key=lambda c: c.total_screen_time, reverse=True)

        return characters

    def _find_hook_ending(self, categorized: Dict[str, List[Dict]]) -> Optional[Dict]:
        """Find the best hook scene to end the trailer - MUST have dialogue."""
        best_hook = None
        best_score = 0

        # Check ALL categories for scenes with dialogue
        candidates = []
        for cat_scenes in categorized.values():
            for scene in cat_scenes:
                if scene.get("has_dialogue") and scene.get("dialogue_text"):
                    candidates.append(scene)

        logger.info(f"Finding hook ending from {len(candidates)} dialogue scenes")

        for scene in candidates:
            dialogue = scene.get("dialogue_text", "")
            if not dialogue:
                continue

            score = 0
            dial_lower = dialogue.lower()

            # Question = GOLD
            if "?" in dialogue:
                score += 100

            # Dialect question words
            for word in self.POWER_WORDS["question"]:
                if word in dial_lower:
                    score += 50
                    break

            # Emotional words
            for word in self.POWER_WORDS["emotional"]:
                if word in dial_lower:
                    score += 20

            # Not a spoiler
            for pattern in self.SPOILER_PATTERNS:
                if pattern in dial_lower:
                    score -= 100

            # Good length (5-15 words)
            word_count = len(dialogue.split())
            if 5 <= word_count <= 15:
                score += 20

            # Position bonus (not too early, not too late)
            pos = scene.get("position", 0.5)
            if 0.3 < pos < 0.75:
                score += 15

            if score > best_score:
                best_score = score
                best_hook = scene

        return best_hook

    def _build_shot_sequence(
        self,
        categorized: Dict[str, List[Dict]],
        characters: List[CharacterProfile],
        hook_ending: Optional[Dict],
        target_duration: int,
        style_config: Dict
    ) -> List[TrailerShot]:
        """Build shot sequence following 5-act structure."""
        shots = []
        used_scene_ids = set()
        current_time = 0.0
        order = 1

        # Reserve hook ending
        if hook_ending:
            used_scene_ids.add(hook_ending.get("scene_id"))

        # Count total available dialogue scenes
        total_dialogue_scenes = sum(
            1 for scenes in categorized.values()
            for s in scenes if s.get("has_dialogue")
        )
        has_enough_dialogue = total_dialogue_scenes >= 5

        # Build each act
        for beat in StoryBeat:
            beat_config = TRAILER_STRUCTURE[beat]
            beat_duration = target_duration * beat_config.duration_ratio
            beat_scenes_added = 0
            beat_time = 0.0

            # Get candidate scenes for this beat
            candidates = []
            for cat in beat_config.priority_categories:
                candidates.extend(categorized.get(cat, []))

            # Also include all scenes if we don't have enough candidates
            if len(candidates) < beat_config.max_scenes:
                for cat, scenes in categorized.items():
                    for scene in scenes:
                        if scene not in candidates:
                            candidates.append(scene)

            # Remove already used scenes
            candidates = [c for c in candidates if c.get("scene_id") not in used_scene_ids]

            # Filter by dialogue requirement ONLY if we have enough dialogue scenes
            # Otherwise, be lenient and use non-dialogue scenes
            if beat_config.requires_dialogue and has_enough_dialogue:
                dialogue_candidates = [c for c in candidates if c.get("has_dialogue")]
                if dialogue_candidates:
                    candidates = dialogue_candidates

            # Sort by trailer potential - PRIORITIZE DIALOGUE SCENES
            # Dialogue scenes get a massive boost for character, conflict, and climax_tease beats
            def score_candidate(x):
                base_score = x.get("trailer_potential", 0) + x.get("emotional_score", 0)
                # Massive bonus for dialogue scenes in key beats
                if x.get("has_dialogue") and beat in [StoryBeat.CHARACTER, StoryBeat.CONFLICT, StoryBeat.CLIMAX_TEASE]:
                    base_score += 100  # Prioritize dialogue
                # Extra bonus for questions (hook endings)
                if x.get("is_question") and beat == StoryBeat.CLIMAX_TEASE:
                    base_score += 50
                return base_score

            candidates.sort(key=score_candidate, reverse=True)

            for scene in candidates:
                if beat_scenes_added >= beat_config.max_scenes:
                    break
                if beat_time >= beat_duration * 1.2:
                    break

                scene_id = scene.get("scene_id")
                if scene_id in used_scene_ids:
                    continue

                # Calculate shot duration based on quality
                potential = scene.get("trailer_potential", 50)
                if potential > 70:
                    shot_dur = min(scene.get("duration", 5), 7)
                elif potential > 50:
                    shot_dur = min(scene.get("duration", 5), 5)
                else:
                    shot_dur = min(scene.get("duration", 5), 4)

                # Determine category
                best_cat = max(
                    scene.get("category_scores", {"dialogue": 50}),
                    key=scene.get("category_scores", {"dialogue": 50}).get
                )
                try:
                    category = SceneCategory(best_cat)
                except ValueError:
                    category = SceneCategory.DIALOGUE

                # Check if character intro
                is_char_intro = False
                for char in characters:
                    if char.introduction_scene_id == scene_id:
                        is_char_intro = True
                        break

                # Transition style
                if order == 1:
                    trans_in = "fade"
                elif beat == StoryBeat.CONFLICT:
                    trans_in = "cut"
                else:
                    trans_in = beat_config.transition_style

                shot = TrailerShot(
                    order=order,
                    scene_id=scene_id,
                    start_time=scene.get("start_time", 0),
                    end_time=scene.get("start_time", 0) + shot_dur,
                    duration=shot_dur,
                    beat=beat,
                    category=category,
                    has_dialogue=scene.get("has_dialogue", False),
                    dialogue_text=scene.get("dialogue_text") if scene.get("has_dialogue") else None,
                    emotional_score=scene.get("emotional_score", 0),
                    action_score=scene.get("action_score", 0),
                    is_character_intro=is_char_intro,
                    is_hook_ending=False,
                    transition_in=trans_in,
                    transition_out="cut",
                    music_cue="dialogue" if scene.get("has_dialogue") else "music",
                    text_overlay=None
                )

                shots.append(shot)
                used_scene_ids.add(scene_id)
                beat_scenes_added += 1
                beat_time += shot_dur
                order += 1

        # Add hook ending
        if hook_ending:
            scene = hook_ending
            shot_dur = min(scene.get("duration", 5), 6)

            shot = TrailerShot(
                order=order,
                scene_id=scene.get("scene_id"),
                start_time=scene.get("start_time", 0),
                end_time=scene.get("start_time", 0) + shot_dur,
                duration=shot_dur,
                beat=StoryBeat.CLIMAX_TEASE,
                category=SceneCategory.DIALOGUE,
                has_dialogue=True,
                dialogue_text=scene.get("dialogue_text"),
                emotional_score=scene.get("emotional_score", 0),
                action_score=scene.get("action_score", 0),
                is_character_intro=False,
                is_hook_ending=True,
                transition_in="cut",
                transition_out="fade",
                music_cue="dialogue",
                text_overlay=None
            )
            shots.append(shot)
            order += 1

        # FALLBACK: If we don't have minimum shots, add more from available scenes
        min_shots = self.config.narrative.min_shots
        if len(shots) < min_shots:
            logger.warning(f"Only {len(shots)} shots generated, adding more to reach minimum {min_shots}")

            # Gather all remaining scenes
            all_remaining = []
            for cat, scenes in categorized.items():
                for scene in scenes:
                    if scene.get("scene_id") not in used_scene_ids:
                        all_remaining.append(scene)

            # Sort by trailer potential - PRIORITIZE DIALOGUE
            def fallback_score(x):
                score = x.get("trailer_potential", 0) + x.get("emotional_score", 0) * 0.5
                if x.get("has_dialogue"):
                    score += 100  # Strongly prefer dialogue scenes
                if x.get("is_question"):
                    score += 50
                return score

            all_remaining.sort(key=fallback_score, reverse=True)

            # Add more shots to reach minimum
            for scene in all_remaining:
                if len(shots) >= min_shots:
                    break

                scene_id = scene.get("scene_id")
                if scene_id in used_scene_ids:
                    continue

                shot_dur = min(scene.get("duration", 5), 5)

                # Assign to CONFLICT beat by default (middle of trailer)
                shot = TrailerShot(
                    order=order,
                    scene_id=scene_id,
                    start_time=scene.get("start_time", 0),
                    end_time=scene.get("start_time", 0) + shot_dur,
                    duration=shot_dur,
                    beat=StoryBeat.CONFLICT,
                    category=SceneCategory.ACTION,
                    has_dialogue=scene.get("has_dialogue", False),
                    dialogue_text=scene.get("dialogue_text") if scene.get("has_dialogue") else None,
                    emotional_score=scene.get("emotional_score", 0),
                    action_score=scene.get("action_score", 0),
                    is_character_intro=False,
                    is_hook_ending=False,
                    transition_in="cut",
                    transition_out="cut",
                    music_cue="music",
                    text_overlay=None
                )

                # Insert before hook ending if present
                if shots and shots[-1].is_hook_ending:
                    shots.insert(-1, shot)
                else:
                    shots.append(shot)

                used_scene_ids.add(scene_id)
                order += 1

            # Re-number all shots
            for i, shot in enumerate(shots):
                shot.order = i + 1

            logger.info(f"Added fallback shots, now have {len(shots)} shots")

        return shots

    def _calculate_suspense_curve(self, shots: List[TrailerShot]) -> SuspenseCurve:
        """Calculate the suspense/tension curve of the trailer."""
        if not shots:
            return SuspenseCurve([], [], 0, 0, 0, 0)

        timestamps = []
        values = []
        current_time = 0.0

        for shot in shots:
            mid_point = current_time + shot.duration / 2
            timestamps.append(mid_point)

            # Calculate tension value
            tension = 0
            tension += shot.emotional_score * 0.4
            tension += shot.action_score * 0.3

            # Beat-based modifiers
            beat_multipliers = {
                StoryBeat.HOOK: 0.7,
                StoryBeat.WORLD: 0.4,
                StoryBeat.CHARACTER: 0.5,
                StoryBeat.CONFLICT: 0.8,
                StoryBeat.CLIMAX_TEASE: 1.0
            }
            tension *= beat_multipliers.get(shot.beat, 0.6)

            # Question endings boost tension
            if shot.is_hook_ending:
                tension = max(tension, 80)

            values.append(min(100, tension))
            current_time += shot.duration

        # Find peak
        if values:
            peak_idx = values.index(max(values))
            peak_position = timestamps[peak_idx] / current_time if current_time > 0 else 0.5
            peak_value = values[peak_idx]
            avg_tension = sum(values) / len(values)
        else:
            peak_position = 0.5
            peak_value = 0
            avg_tension = 0

        # Calculate curve quality (ideal: gradual rise, peak at 85%)
        ideal_peak_pos = self.config.narrative.suspense_peak_position
        position_diff = abs(peak_position - ideal_peak_pos)
        curve_quality = max(0, 100 - position_diff * 200)

        return SuspenseCurve(
            timestamps=timestamps,
            values=values,
            peak_position=peak_position,
            peak_value=peak_value,
            average_tension=avg_tension,
            curve_quality=curve_quality
        )

    def _optimize_suspense(
        self,
        shots: List[TrailerShot],
        suspense: SuspenseCurve
    ) -> List[TrailerShot]:
        """Optimize shot order for better suspense curve."""
        # If curve quality is already good, don't change
        if suspense.curve_quality >= 70:
            return shots

        # Simple optimization: ensure high-tension shots are later
        # More sophisticated optimization would require significant reordering

        # Sort shots within CONFLICT beat by tension (ascending)
        conflict_shots = [s for s in shots if s.beat == StoryBeat.CONFLICT]
        other_shots = [s for s in shots if s.beat != StoryBeat.CONFLICT]

        if len(conflict_shots) > 2:
            conflict_shots.sort(key=lambda s: s.emotional_score + s.action_score)

        # Rebuild shot list
        optimized = []
        conflict_idx = 0
        for shot in shots:
            if shot.beat == StoryBeat.CONFLICT and conflict_idx < len(conflict_shots):
                optimized.append(conflict_shots[conflict_idx])
                conflict_idx += 1
            elif shot.beat != StoryBeat.CONFLICT:
                optimized.append(shot)

        # Re-number shots
        for i, shot in enumerate(optimized):
            shot.order = i + 1

        return optimized

    def _add_overlays(
        self,
        shots: List[TrailerShot],
        title: str,
        style: str
    ) -> List[TrailerShot]:
        """Add text overlays (title, taglines) to shots."""
        if not shots:
            return shots

        total_duration = sum(s.duration for s in shots)

        # Find character beat for title placement
        title_placed = False
        for shot in shots:
            if shot.beat == StoryBeat.CHARACTER and not title_placed:
                shot.text_overlay = title
                title_placed = True
                break

        # If no character beat, place after first 3 shots
        if not title_placed and len(shots) > 3:
            shots[2].text_overlay = title

        # Add tagline before hook ending
        taglines = self._get_style_taglines(style)
        if taglines and len(shots) > 5:
            # Place at ~75% through trailer
            target_idx = int(len(shots) * 0.75)
            if shots[target_idx].text_overlay is None:
                import random
                shots[target_idx].text_overlay = random.choice(taglines)

        return shots

    def _get_style_taglines(self, style: str) -> List[str]:
        """Get style-appropriate taglines in multiple dialects."""
        taglines = {
            "dramatic": [
                "Kuch kahaniyan badal deti hain",
                "Ghani badi kahani hai",
                "Tohar ke dekhna padega"
            ],
            "action": [
                "Koi rok nahi sakta",
                "Dangal hone wala hai",
                "Ab hogi takkar"
            ],
            "emotional": [
                "Dil se mehsoos karo",
                "Har lamha jeeo",
                "Mohabaat ki kahani"
            ],
            "mystery": [
                "Sach chhupa hai",
                "Raaz khulega",
                "Kya sach hai?"
            ],
            "thriller": [
                "Khatre mein hai sab",
                "Dar ke aage kya?",
                "Ab bachna mushkil"
            ],
            "comedy": [
                "Hansi rukegi nahi",
                "Mazaa aayega",
                "Entertainment garanteed"
            ],
            "epic": [
                "Ek dastan shuru hoti hai",
                "Mahayudh aa raha hai",
                "Itihaas badlega"
            ],
            "character": [
                "Ek insaan, ek safar",
                "Kaun hai ye?",
                "Zindagi ki kahani"
            ]
        }
        return taglines.get(style, ["Jald aane wali hai"])

    def _score_structure(self, shots: List[TrailerShot]) -> int:
        """Score how well the trailer follows professional structure."""
        if not shots:
            return 0

        score = 50  # Base score

        # Check all beats are represented
        beats_present = set(s.beat for s in shots)
        for beat in StoryBeat:
            if beat in beats_present:
                score += 8

        # Check character introduction exists
        if any(s.is_character_intro for s in shots):
            score += 10

        # Check hook ending exists
        if shots and shots[-1].is_hook_ending:
            score += 10

        # Check dialogue presence
        dialogue_ratio = sum(1 for s in shots if s.has_dialogue) / len(shots)
        if 0.3 <= dialogue_ratio <= 0.6:
            score += 10

        # Good shot count
        if 10 <= len(shots) <= 18:
            score += 5

        return min(100, score)

    def _calculate_confidence(
        self,
        shots: List[TrailerShot],
        suspense: SuspenseCurve,
        characters: List[CharacterProfile]
    ) -> int:
        """Calculate overall confidence in the narrative."""
        if not shots:
            return 0

        confidence = 50

        # Structure quality contribution
        confidence += suspense.curve_quality * 0.2

        # Character detection contribution
        if characters:
            confidence += min(15, len(characters) * 5)

        # Hook ending contribution
        if shots and shots[-1].is_hook_ending:
            if shots[-1].dialogue_text and "?" in shots[-1].dialogue_text:
                confidence += 15
            else:
                confidence += 8

        # Shot diversity contribution
        categories = set(s.category for s in shots)
        confidence += min(10, len(categories) * 2)

        return min(100, int(confidence))

    def _calculate_beat_breakdown(self, shots: List[TrailerShot]) -> Dict[str, float]:
        """Calculate duration breakdown by beat."""
        breakdown = {}
        total = sum(s.duration for s in shots)

        for beat in StoryBeat:
            beat_duration = sum(s.duration for s in shots if s.beat == beat)
            breakdown[beat.value] = round(beat_duration / total, 2) if total > 0 else 0

        return breakdown

    def _describe_hook(self, shot: TrailerShot) -> str:
        """Generate description for a hook shot."""
        if shot.has_dialogue:
            if "?" in (shot.dialogue_text or ""):
                return f"Question hook: {shot.dialogue_text[:50]}..."
            return f"Dialogue: {shot.dialogue_text[:50]}..."
        return f"{shot.category.value} scene"

    def _get_title_position(self, shots: List[TrailerShot]) -> float:
        """Get the position where title appears (0-1)."""
        if not shots:
            return 0.25

        total_duration = sum(s.duration for s in shots)
        current_time = 0.0

        for shot in shots:
            if shot.text_overlay and shot.text_overlay != "Coming Soon":
                return current_time / total_duration if total_duration > 0 else 0.25
            current_time += shot.duration

        return 0.25  # Default
