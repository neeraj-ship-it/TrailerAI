"""Parallel Processing Pipeline for Fast Trailer Generation.

Enables concurrent execution of independent analysis stages:
- Scene detection
- Audio analysis (ASR)
- Visual analysis

Reduces total processing time significantly through parallelization.
"""

import time
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable, Tuple
from pathlib import Path
from loguru import logger

from config import get_config


@dataclass
class PipelineStage:
    """A stage in the processing pipeline."""
    name: str
    func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    result: Any = None
    error: Optional[Exception] = None
    duration: float = 0.0
    completed: bool = False


@dataclass
class PipelineResult:
    """Result of pipeline execution."""
    stages: Dict[str, Any]
    total_duration: float
    parallel_savings: float  # Time saved by parallelization
    errors: List[str]
    success: bool


class ParallelPipeline:
    """Parallel processing pipeline for trailer analysis.

    Executes independent stages concurrently while respecting dependencies.
    """

    def __init__(self, max_workers: Optional[int] = None):
        """Initialize pipeline.

        Args:
            max_workers: Maximum parallel workers (None = auto)
        """
        self.config = get_config()
        self.max_workers = max_workers or self.config.parallel.max_cpu_workers
        self.stages: Dict[str, PipelineStage] = {}
        self._executor = None
        logger.info(f"ParallelPipeline initialized: max_workers={self.max_workers}")

    def add_stage(
        self,
        name: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        depends_on: List[str] = None
    ) -> "ParallelPipeline":
        """Add a stage to the pipeline.

        Args:
            name: Stage name
            func: Function to execute
            args: Positional arguments
            kwargs: Keyword arguments
            depends_on: List of stage names this depends on

        Returns:
            Self for chaining
        """
        self.stages[name] = PipelineStage(
            name=name,
            func=func,
            args=args,
            kwargs=kwargs or {},
            depends_on=depends_on or []
        )
        return self

    def execute(self) -> PipelineResult:
        """Execute the pipeline with parallel stages.

        Returns:
            PipelineResult with all stage outputs
        """
        start_time = time.time()
        errors = []
        sequential_time = 0.0

        # Group stages by dependency level
        levels = self._build_execution_levels()

        logger.info(f"Executing pipeline: {len(self.stages)} stages, {len(levels)} levels")

        # Execute each level
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for level_idx, level_stages in enumerate(levels):
                logger.info(f"Level {level_idx + 1}: {[s.name for s in level_stages]}")

                if len(level_stages) == 1:
                    # Single stage, execute directly
                    stage = level_stages[0]
                    self._execute_stage(stage)
                    sequential_time += stage.duration
                    if stage.error:
                        errors.append(f"{stage.name}: {stage.error}")
                else:
                    # Multiple stages, execute in parallel
                    futures = {}
                    for stage in level_stages:
                        future = executor.submit(self._execute_stage, stage)
                        futures[future] = stage

                    # Wait for all to complete
                    max_duration = 0
                    for future in as_completed(futures):
                        stage = futures[future]
                        try:
                            future.result()
                        except Exception as e:
                            stage.error = e
                            errors.append(f"{stage.name}: {e}")

                        sequential_time += stage.duration
                        max_duration = max(max_duration, stage.duration)

        total_duration = time.time() - start_time
        parallel_savings = max(0, sequential_time - total_duration)

        logger.info(
            f"Pipeline complete: {total_duration:.1f}s "
            f"(saved {parallel_savings:.1f}s via parallelization)"
        )

        # Collect results
        results = {}
        for name, stage in self.stages.items():
            results[name] = {
                "result": stage.result,
                "duration": stage.duration,
                "error": str(stage.error) if stage.error else None
            }

        return PipelineResult(
            stages=results,
            total_duration=total_duration,
            parallel_savings=parallel_savings,
            errors=errors,
            success=len(errors) == 0
        )

    def _execute_stage(self, stage: PipelineStage) -> None:
        """Execute a single stage."""
        logger.info(f"Starting stage: {stage.name}")
        stage_start = time.time()

        try:
            # Inject dependency results into kwargs
            for dep_name in stage.depends_on:
                dep_stage = self.stages.get(dep_name)
                if dep_stage and dep_stage.result is not None:
                    stage.kwargs[f"{dep_name}_result"] = dep_stage.result

            # Execute
            stage.result = stage.func(*stage.args, **stage.kwargs)
            stage.completed = True

        except Exception as e:
            logger.error(f"Stage {stage.name} failed: {e}")
            stage.error = e

        finally:
            stage.duration = time.time() - stage_start
            logger.info(f"Stage {stage.name} completed in {stage.duration:.1f}s")

    def _build_execution_levels(self) -> List[List[PipelineStage]]:
        """Build execution levels based on dependencies.

        Stages in the same level can run in parallel.
        """
        levels = []
        remaining = set(self.stages.keys())
        completed = set()

        while remaining:
            # Find stages whose dependencies are all completed
            level = []
            for name in list(remaining):
                stage = self.stages[name]
                deps_met = all(dep in completed for dep in stage.depends_on)
                if deps_met:
                    level.append(stage)
                    remaining.remove(name)

            if not level:
                # Circular dependency or error
                logger.error(f"Circular dependency detected: {remaining}")
                # Add remaining stages anyway
                for name in remaining:
                    level.append(self.stages[name])
                remaining.clear()

            levels.append(level)
            completed.update(s.name for s in level)

        return levels

    def get_result(self, stage_name: str) -> Any:
        """Get result from a specific stage.

        Args:
            stage_name: Name of the stage

        Returns:
            Stage result or None
        """
        stage = self.stages.get(stage_name)
        return stage.result if stage else None


class AsyncPipeline:
    """Async version of parallel pipeline for I/O-bound operations."""

    def __init__(self, max_concurrent: int = 10):
        """Initialize async pipeline.

        Args:
            max_concurrent: Maximum concurrent tasks
        """
        self.max_concurrent = max_concurrent
        self.semaphore = None
        self.tasks: Dict[str, Callable] = {}
        self.results: Dict[str, Any] = {}
        logger.info(f"AsyncPipeline initialized: max_concurrent={max_concurrent}")

    def add_task(self, name: str, coro_func: Callable, *args, **kwargs):
        """Add an async task.

        Args:
            name: Task name
            coro_func: Async function
            *args, **kwargs: Arguments for the function
        """
        self.tasks[name] = (coro_func, args, kwargs)
        return self

    async def execute(self) -> Dict[str, Any]:
        """Execute all tasks concurrently.

        Returns:
            Dict of task results
        """
        self.semaphore = asyncio.Semaphore(self.max_concurrent)

        async def run_task(name: str, coro_func: Callable, args: tuple, kwargs: dict):
            async with self.semaphore:
                try:
                    result = await coro_func(*args, **kwargs)
                    return name, result, None
                except Exception as e:
                    return name, None, str(e)

        # Create all tasks
        coros = [
            run_task(name, func, args, kwargs)
            for name, (func, args, kwargs) in self.tasks.items()
        ]

        # Execute concurrently
        results = await asyncio.gather(*coros)

        # Collect results
        for name, result, error in results:
            self.results[name] = {"result": result, "error": error}

        return self.results


def create_analysis_pipeline(
    video_path: Path,
    subtitle_path: Optional[Path] = None,
    config: Optional[Any] = None
) -> ParallelPipeline:
    """Create a pre-configured analysis pipeline.

    Args:
        video_path: Path to video file
        subtitle_path: Optional subtitle file
        config: Configuration object

    Returns:
        Configured ParallelPipeline
    """
    from analysis.scene_detector import SceneDetector
    from analysis.indian_asr import IndianDialectASR
    from analysis.visual_analyzer import VisualAnalyzer

    config = config or get_config()
    pipeline = ParallelPipeline(max_workers=config.parallel.max_cpu_workers)

    # Scene detection (independent)
    def run_scene_detection():
        detector = SceneDetector()
        return detector.detect(video_path, show_progress=True)

    # Audio analysis (independent)
    def run_audio_analysis():
        asr = IndianDialectASR(
            model_name="auto",
            device=config.indian_asr.device
        )
        return asr.transcribe(video_path, subtitle_path=subtitle_path)

    # Visual analysis (depends on scene detection)
    def run_visual_analysis(scene_detection_result=None):
        analyzer = VisualAnalyzer(
            device=config.visual.device,
            frames_per_scene=config.visual.frames_per_scene
        )
        scenes = [s.to_dict() for s in scene_detection_result.scenes] if scene_detection_result else []
        return analyzer.analyze_video(video_path, scenes=scenes, show_progress=True)

    # Add stages
    pipeline.add_stage("scene_detection", run_scene_detection)
    pipeline.add_stage("audio_analysis", run_audio_analysis)
    pipeline.add_stage(
        "visual_analysis",
        run_visual_analysis,
        depends_on=["scene_detection"]
    )

    return pipeline


def run_parallel_analysis(
    video_path: Path,
    subtitle_path: Optional[Path] = None
) -> Tuple[Any, Any, Any]:
    """Run parallel analysis pipeline.

    Args:
        video_path: Path to video
        subtitle_path: Optional subtitles

    Returns:
        Tuple of (scene_result, audio_result, visual_result)
    """
    pipeline = create_analysis_pipeline(video_path, subtitle_path)
    result = pipeline.execute()

    scene_result = result.stages.get("scene_detection", {}).get("result")
    audio_result = result.stages.get("audio_analysis", {}).get("result")
    visual_result = result.stages.get("visual_analysis", {}).get("result")

    return scene_result, audio_result, visual_result
