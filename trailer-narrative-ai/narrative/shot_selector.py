"""Shot selection logic for trailer narratives."""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Set
from loguru import logger

from analysis.content_understanding import SceneUnderstanding


@dataclass
class SelectedShot:
    """A selected shot for the trailer."""
    scene_id: str
    start_time: float
    end_time: float
    duration: float
    purpose: str
    score: float
    reason: str


class ShotSelector:
    """Select optimal shots for trailer narratives."""

    def __init__(
        self,
        min_shots: int = 15,
        max_shots: int = 30,
        min_shot_duration: float = 1.0,
        max_shot_duration: float = 6.0,
        max_spoiler_level: int = 6
    ):
        """Initialize shot selector.

        Args:
            min_shots: Minimum number of shots
            max_shots: Maximum number of shots
            min_shot_duration: Minimum shot duration in seconds
            max_shot_duration: Maximum shot duration in seconds
            max_spoiler_level: Maximum allowed spoiler level
        """
        self.min_shots = min_shots
        self.max_shots = max_shots
        self.min_shot_duration = min_shot_duration
        self.max_shot_duration = max_shot_duration
        self.max_spoiler_level = max_spoiler_level

    def select_shots(
        self,
        scenes: List[SceneUnderstanding],
        style: str,
        target_duration: int = 90,
        used_scenes: Optional[Set[str]] = None
    ) -> List[SelectedShot]:
        """Select shots for a trailer variant.

        Args:
            scenes: List of analyzed scenes
            style: Trailer style
            target_duration: Target trailer duration
            used_scenes: Set of already used scene IDs (for diversity)

        Returns:
            List of selected shots
        """
        used_scenes = used_scenes or set()

        # Filter scenes by spoiler level
        eligible_scenes = [
            s for s in scenes
            if s.spoiler_level <= self.max_spoiler_level
        ]

        if not eligible_scenes:
            logger.warning("No eligible scenes found, using all scenes")
            eligible_scenes = scenes

        # Score scenes for this style
        scored_scenes = self._score_scenes(eligible_scenes, style, used_scenes)

        # Select shots
        selected = self._greedy_select(scored_scenes, target_duration)

        # Ensure minimum shots
        if len(selected) < self.min_shots:
            selected = self._fill_minimum(selected, scored_scenes, self.min_shots)

        logger.info(f"Selected {len(selected)} shots for {style} trailer")
        return selected

    def _score_scenes(
        self,
        scenes: List[SceneUnderstanding],
        style: str,
        used_scenes: Set[str]
    ) -> List[Dict[str, Any]]:
        """Score scenes based on style and other factors.

        Args:
            scenes: List of scenes
            style: Trailer style
            used_scenes: Already used scene IDs

        Returns:
            List of scored scene dictionaries
        """
        scored = []

        for scene in scenes:
            # Base score from trailer potential
            score = scene.trailer_potential

            # Style-specific adjustments
            if style == "action":
                score += scene.action_score * 0.4
                score -= scene.emotional_score * 0.1
            elif style == "dramatic":
                score += scene.emotional_score * 0.3
                score += scene.action_score * 0.1
            elif style == "emotional":
                score += scene.emotional_score * 0.5
                score -= scene.action_score * 0.1
            elif style == "comedy":
                if scene.mood == "comedic":
                    score += 30
            elif style == "mystery":
                if scene.mood in ["mysterious", "tense"]:
                    score += 20
                # Slight spoilers create intrigue
                if 3 <= scene.spoiler_level <= 5:
                    score += 10
            elif style == "epic":
                score += scene.action_score * 0.2
                # Prefer establishing shots
                if scene.scene_type == "establishing":
                    score += 15
            elif style == "character":
                # Prefer dialogue and emotional scenes
                if scene.scene_type in ["dialogue", "emotional_beat"]:
                    score += 20
                score += scene.emotional_score * 0.3

            # Penalize heavily used scenes
            if scene.scene_id in used_scenes:
                score *= 0.5

            # Bonus for key quote
            if scene.key_quote:
                score += 10

            # Bonus for visual hook
            if scene.visual_hook:
                score += 10

            scored.append({
                "scene": scene,
                "score": score,
                "reason": self._get_selection_reason(scene, style)
            })

        # Sort by score
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored

    def _get_selection_reason(
        self,
        scene: SceneUnderstanding,
        style: str
    ) -> str:
        """Get human-readable reason for selection."""
        reasons = []

        if scene.trailer_potential >= 80:
            reasons.append("high trailer potential")
        if scene.key_quote:
            reasons.append("strong dialogue")
        if scene.visual_hook:
            reasons.append("visual impact")
        if scene.action_score >= 70:
            reasons.append("action")
        if scene.emotional_score >= 70:
            reasons.append("emotional")

        return ", ".join(reasons) if reasons else "general quality"

    def _greedy_select(
        self,
        scored_scenes: List[Dict[str, Any]],
        target_duration: int
    ) -> List[SelectedShot]:
        """Greedily select shots to fill target duration.

        Args:
            scored_scenes: Scored scene list
            target_duration: Target duration in seconds

        Returns:
            List of selected shots
        """
        selected = []
        current_duration = 0
        used_scenes = set()

        for scored in scored_scenes:
            if len(selected) >= self.max_shots:
                break

            if current_duration >= target_duration:
                break

            scene = scored["scene"]

            # Skip if already used twice
            scene_count = sum(1 for s in selected if s.scene_id == scene.scene_id)
            if scene_count >= 2:
                continue

            # Calculate shot duration
            scene_duration = scene.end_time - scene.start_time
            shot_duration = min(
                self.max_shot_duration,
                max(self.min_shot_duration, scene_duration * 0.3)
            )

            # Determine purpose based on position and content
            position = current_duration / target_duration
            purpose = self._determine_purpose(scene, position)

            selected.append(SelectedShot(
                scene_id=scene.scene_id,
                start_time=scene.start_time,
                end_time=scene.start_time + shot_duration,
                duration=shot_duration,
                purpose=purpose,
                score=scored["score"],
                reason=scored["reason"]
            ))

            current_duration += shot_duration
            used_scenes.add(scene.scene_id)

        return selected

    def _determine_purpose(
        self,
        scene: SceneUnderstanding,
        position: float
    ) -> str:
        """Determine shot purpose based on content and position.

        Args:
            scene: Scene understanding
            position: Position in trailer (0-1)

        Returns:
            Purpose string
        """
        # Position-based
        if position < 0.1:
            return "hook"
        elif position > 0.9:
            return "tag"
        elif position > 0.75:
            return "climax"

        # Content-based
        if scene.scene_type == "climax":
            return "climax"
        elif scene.scene_type == "reveal":
            return "reveal"
        elif scene.action_score >= 80:
            return "climax" if position > 0.6 else "build"
        elif scene.emotional_score >= 80:
            return "reveal"

        return "build"

    def _fill_minimum(
        self,
        selected: List[SelectedShot],
        scored_scenes: List[Dict[str, Any]],
        min_shots: int
    ) -> List[SelectedShot]:
        """Fill up to minimum number of shots.

        Args:
            selected: Currently selected shots
            scored_scenes: All scored scenes
            min_shots: Minimum number of shots

        Returns:
            Extended list of shots
        """
        used_scenes = {s.scene_id for s in selected}

        for scored in scored_scenes:
            if len(selected) >= min_shots:
                break

            scene = scored["scene"]
            if scene.scene_id in used_scenes:
                continue

            scene_duration = scene.end_time - scene.start_time
            shot_duration = min(self.max_shot_duration, scene_duration * 0.3)

            selected.append(SelectedShot(
                scene_id=scene.scene_id,
                start_time=scene.start_time,
                end_time=scene.start_time + shot_duration,
                duration=shot_duration,
                purpose="build",
                score=scored["score"],
                reason=scored["reason"]
            ))

            used_scenes.add(scene.scene_id)

        return selected

    def organize_for_narrative(
        self,
        shots: List[SelectedShot],
        target_duration: int = 90
    ) -> List[SelectedShot]:
        """Organize shots into narrative structure.

        Args:
            shots: Selected shots
            target_duration: Target duration

        Returns:
            Reordered shots
        """
        if not shots:
            return shots

        # Group by purpose
        hooks = [s for s in shots if s.purpose == "hook"]
        builds = [s for s in shots if s.purpose == "build"]
        reveals = [s for s in shots if s.purpose == "reveal"]
        climaxes = [s for s in shots if s.purpose == "climax"]
        tags = [s for s in shots if s.purpose == "tag"]

        # Organize in narrative order
        organized = []

        # Act 1: Hook (10%)
        organized.extend(hooks[:2] if hooks else builds[:2])

        # Act 2: Build (50%)
        mid_count = int(len(shots) * 0.5)
        organized.extend(builds[:mid_count])
        organized.extend(reveals)

        # Act 3: Climax (30%)
        organized.extend(climaxes)

        # Tag (10%)
        organized.extend(tags[:1] if tags else [])

        # Fill any remaining
        remaining = [s for s in shots if s not in organized]
        organized.extend(remaining)

        return organized[:len(shots)]
