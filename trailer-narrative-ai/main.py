#!/usr/bin/env python3
"""
Production-Grade Trailer Narrative AI

Generates production-ready AI-driven trailer variants with:
- Fast parallel processing
- Indian dialect detection (Haryanvi, Bhojpuri, Rajasthani, Gujarati)
- Professional 5-act story structure
- Character introduction and arc tracking
- Suspense curve optimization
- Hook-based endings
- Minimal editor intervention required

All using open-source HuggingFace models - NO paid APIs required.

Usage:
    python main.py '{"projectId": "test", "localFilePath": "/path/to/video.mp4"}'

Input JSON:
{
    "projectId": "string (required)",
    "s3FileKey": "string (optional - source video S3 key)",
    "localFilePath": "string (optional - local video path)",
    "s3Bucket": "string (optional - S3 bucket for input/output)",
    "s3TrailerFolderKey": "string (optional - S3 folder for output trailers and JSON)",
    "progressBaseUrl": "string (optional - base URL for progress API, e.g. https://api.example.com/)",
    "progressToken": "string (optional - auth token for progress API)",
    "contentMetadata": {
        "title": "string",
        "genre": "string",
        "language": "string",
        "targetDuration": 90
    },
    "narrativeStyles": ["dramatic", "action", "emotional", "mystery", "comedy", "epic", "character", "thriller"],
    "dialogueInput": {
        "subtitleS3Key": "string",
        "subtitleLocalPath": "string"
    },
    "outputOptions": {
        "generateTrailerVideos": true,
        "trailerFormat": "mp4",
        "trailerResolution": "1080p",
        "outputS3Bucket": "string (optional - override S3 bucket for output)"
    }
}

Progress API:
    When progressBaseUrl is provided, progress updates are sent to:
    POST {progressBaseUrl}/cms/trailer-narrative/progress

    Payload format:
    {
        "projectId": "string",
        "status": "processing-initiated|processing-progress|processing-complete|processing-failed",
        "progressType": "download|load-inputs|scene-detection|audio-analysis|...",
        "progressPercentage": 0-100,
        "message": "string (optional)",
        "details": {} (optional)
    }

    Headers (if progressToken provided):
    x-internal-api-secret: {progressToken}

S3 Output Structure (when s3TrailerFolderKey is provided):
    {s3TrailerFolderKey}/
    ├── narrative_report.json    # Complete analysis + narrative data
    ├── editor_guide.md          # Markdown guide for editors
    └── variants/
        ├── trailer_dramatic.mp4
        ├── trailer_action.mp4
        ├── trailer_emotional.mp4
        ├── trailer_mystery.mp4
        ├── trailer_comedy.mp4
        ├── trailer_epic.mp4
        ├── trailer_character.mp4
        └── trailer_thriller.mp4
"""

import sys
import os
import json
import time
import traceback
from pathlib import Path

from config.constants import (
    WHISPER_MODEL, USE_LLM, OLLAMA_MODEL,
    PROGRESS_DOWNLOAD, PROGRESS_LOAD_INPUTS, PROGRESS_SCENE_DETECTION,
    PROGRESS_AUDIO_ANALYSIS, PROGRESS_VISUAL_ANALYSIS, PROGRESS_CONTENT_UNDERSTANDING,
    PROGRESS_NARRATIVE_GENERATION, PROGRESS_TRAILER_ASSEMBLY, PROGRESS_UPLOAD,
    PROGRESS_OUTPUT_GENERATION
)
from typing import Dict, Any, Optional, List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config import get_config
from core.storage import StorageHandler
from core.progress import ProgressReporter, ProcessingStatus, StepProgress, APIProgressReporter
from core.parallel_processor import ParallelPipeline
from input.video_loader import VideoLoader
from input.script_parser import ScriptParser
from input.subtitle_parser import SubtitleParser
from analysis.scene_detector import SceneDetector
from analysis.indian_asr import IndianDialectASR, ASRResult
from analysis.visual_analyzer import VisualAnalyzer
from analysis.content_understanding import ContentAnalyzer
from narrative.generator import NarrativeGenerator
from narrative.professional_builder import ProfessionalNarrativeBuilder, build_professional_narratives
from analysis.llm_story_analyzer import LLMStoryAnalyzer, analyze_movie_story
from assembly.assembler import TrailerAssembler

# New dialogue-first approach
try:
    from narrative.dialogue_pipeline import DialogueFirstPipeline, build_dialogue_trailers
    DIALOGUE_PIPELINE_AVAILABLE = True
except ImportError:
    DIALOGUE_PIPELINE_AVAILABLE = False
    logger.warning("Dialogue pipeline not available. Using legacy approach.")

# Story-driven approach (Deep analysis with character names and continuity)
try:
    from narrative.story_driven_pipeline import StoryDrivenPipeline, build_story_driven_trailer
    STORY_DRIVEN_PIPELINE_AVAILABLE = True
except ImportError:
    STORY_DRIVEN_PIPELINE_AVAILABLE = False
    logger.warning("Story-driven pipeline not available.")
from output.json_formatter import JSONFormatter
from output.report_generator import ReportGenerator


class ProductionTrailerProcessor:
    """Production-grade trailer processor with parallel execution.

    Features:
    - Parallel analysis pipeline (scene, audio, visual)
    - Indian dialect detection using HuggingFace models
    - Professional narrative structure
    - Fast processing with GPU acceleration
    - Production-ready output
    """

    def __init__(self, payload: Dict[str, Any]):
        """Initialize processor.

        Args:
            payload: Input JSON payload
        """
        self.payload = payload
        self.project_id = payload.get("projectId", "unknown")
        self.config = get_config()

        # Initialize progress reporter (console/callback based)
        self.progress = ProgressReporter(
            project_id=self.project_id,
            base_url=payload.get("progressBaseUrl"),
            token=payload.get("token")
        )

        # Initialize API progress reporter (sends to external API)
        self.api_progress = APIProgressReporter(
            project_id=self.project_id,
            progress_base_url=payload.get("progressBaseUrl"),
            token=payload.get("progressToken") or payload.get("token")
        )

        # Initialize storage handler
        self.storage = StorageHandler(
            bucket=payload.get("s3Bucket"),
            region=payload.get("s3Region")
        )

        # Setup output directory
        output_options = payload.get("outputOptions", {})
        self.output_dir = Path(
            output_options.get("outputLocalPath") or
            self.config.output_dir / self.project_id
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Track input sources
        self.input_sources = {}

        logger.info(f"ProductionTrailerProcessor initialized: {self.project_id}")

    def process(self) -> Dict[str, Any]:
        """Run the complete processing pipeline.

        Returns:
            Complete output dictionary
        """
        start_time = time.time()

        # Determine if we need download step (S3 input)
        is_s3_input = bool(self.payload.get("s3FileKey"))
        total_steps = 8 if is_s3_input else 7

        # Initialize step progress tracker
        step = StepProgress(total_steps=total_steps, project_id=self.project_id)
        step.print_header()

        current_step = 0

        try:
            self.progress.start()
            self.api_progress.send_initiated("Trailer processing started")

            # Step 1: Download from S3 (only if S3 input)
            if is_s3_input:
                current_step = 1
                step.start_step(current_step, "DOWNLOADING FROM S3")
                step.print_substep("Bucket", self.payload.get("s3Bucket", "default"))
                step.print_substep("File", self.payload.get("s3FileKey"))
                self.api_progress.send_progress(PROGRESS_DOWNLOAD, 0, "Starting download from S3")

                # Real progress callback for S3 download
                def download_progress(progress: float):
                    step.update_step(progress, f"Downloading... {progress*100:.0f}%")
                    self.api_progress.send_progress(PROGRESS_DOWNLOAD, int(progress * 100), f"Downloading... {progress*100:.0f}%")

                video_path = self._load_video_with_progress(download_progress)

                step.print_substep("Local path", str(video_path))
                step.complete_step(current_step, "DOWNLOADING FROM S3", "Video downloaded successfully")
                self.api_progress.send_progress(PROGRESS_DOWNLOAD, 100, "Download complete")
            else:
                video_path = self._load_video()

            # Step 2: Load Input Files
            current_step = 2 if is_s3_input else 1
            step.start_step(current_step, "LOADING INPUT FILES")
            self.api_progress.send_progress(PROGRESS_LOAD_INPUTS, 0, "Loading input files")

            if not is_s3_input:
                step.print_substep("Video", str(video_path))

            subtitle_path = self._load_subtitles()
            step.update_step(0.5, "Subtitles checked")
            self.api_progress.send_progress(PROGRESS_LOAD_INPUTS, 50, "Subtitles checked")
            if subtitle_path:
                step.print_substep("Subtitles", str(subtitle_path))
            else:
                step.print_substep("Subtitles", "Not provided - will use ASR")

            script_data = self._load_script()
            if script_data:
                step.print_substep("Script", "Loaded")

            step.complete_step(current_step, "LOADING INPUT FILES", "All inputs loaded")
            self.api_progress.send_progress(PROGRESS_LOAD_INPUTS, 100, "Input files loaded")

            # Step 3: Analyze Video (this is the longest step)
            current_step += 1
            step.start_step(current_step, "ANALYZING VIDEO (Scene + Audio + Visual)")
            step.print_substep("Status", "Running parallel analysis - this may take several minutes...")
            step.print_substep("Tasks", "Scene Detection (20%) | Audio/ASR (60%) | Visual (20%)")
            self.progress.update(
                ProcessingStatus.ANALYZING_AUDIO,
                "Running parallel analysis (scene, audio, visual)"
            )
            self.api_progress.send_progress(PROGRESS_AUDIO_ANALYSIS, 0, "Starting video analysis")

            # Progress callback for parallel analysis
            def analysis_progress_callback(task_name: str, status: str, progress_pct: float):
                """Called when analysis sub-task updates progress."""
                step.update_step(progress_pct / 100.0, f"{task_name}: {status}")
                # Map task name to progress type
                if "AUDIO" in task_name.upper():
                    self.api_progress.send_progress(PROGRESS_AUDIO_ANALYSIS, int(progress_pct), status)
                elif "SCENE" in task_name.upper():
                    self.api_progress.send_progress(PROGRESS_SCENE_DETECTION, int(progress_pct), status)
                elif "VISUAL" in task_name.upper():
                    self.api_progress.send_progress(PROGRESS_VISUAL_ANALYSIS, int(progress_pct), status)

            scene_result, audio_result, visual_result = self._run_parallel_analysis(
                video_path, subtitle_path, progress_callback=analysis_progress_callback
            )

            step.print_substep("Scenes detected", f"{scene_result.scene_count}")
            step.print_substep("Dialogue segments", f"{len(audio_result.segments) if hasattr(audio_result, 'segments') else 0}")
            step.print_substep("Video duration", f"{scene_result.video_duration:.0f}s ({scene_result.video_duration/60:.1f} min)")
            if hasattr(audio_result, 'primary_dialect') and audio_result.primary_dialect:
                step.print_substep("Dialect", f"{audio_result.primary_dialect.upper()} ({audio_result.dialect_confidence:.0%})")

            step.complete_step(current_step, "ANALYZING VIDEO", f"{scene_result.scene_count} scenes, {len(audio_result.segments) if hasattr(audio_result, 'segments') else 0} dialogues")
            self.api_progress.send_progress(PROGRESS_AUDIO_ANALYSIS, 100, f"Analysis complete: {scene_result.scene_count} scenes")

            # Step 4: Understanding Content
            current_step += 1
            step.start_step(current_step, "UNDERSTANDING CONTENT")
            step.print_substep("Status", "Analyzing emotions and key moments...")
            self.progress.update(
                ProcessingStatus.UNDERSTANDING_CONTENT,
                "Understanding scene content with dialect awareness"
            )
            self.api_progress.send_progress(PROGRESS_CONTENT_UNDERSTANDING, 0, "Analyzing emotions and key moments")

            scene_understandings = self._analyze_content(
                scene_result, audio_result, visual_result, script_data
            )

            step.print_substep("Scenes analyzed", f"{len(scene_understandings)}")
            step.complete_step(current_step, "UNDERSTANDING CONTENT", f"{len(scene_understandings)} scenes understood")
            self.api_progress.send_progress(PROGRESS_CONTENT_UNDERSTANDING, 100, f"{len(scene_understandings)} scenes understood")

            # ========================================================================
            # WORKFLOW MODE CHECK: Draft Narrative vs Generate Trailer
            # ========================================================================
            workflow_mode = self.payload.get("workflowMode", "standard")

            if workflow_mode == "draft-narrative":
                # PHASE 1: Draft Narrative Only (no trailer generation)
                logger.info("WORKFLOW MODE: Draft Narrative Only")
                step.print_substep("Workflow", "DRAFT NARRATIVE (approval required)")

                current_step += 1
                step.start_step(current_step, "DRAFTING NARRATIVE")
                self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 0, "Drafting narrative")

                # Import workflow manager
                from narrative.workflow_manager import WorkflowManager, WorkflowConfig

                # Create workflow manager
                wf_config = WorkflowConfig(
                    mode="draft-narrative",
                    project_id=self.project_id,
                    output_dir=self.output_dir
                )
                wf_manager = WorkflowManager(wf_config)

                # Execute draft narrative
                draft_result = wf_manager.execute_draft_narrative(
                    scenes=scene_result.scenes if hasattr(scene_result, 'scenes') else [],
                    dialogues=audio_result.dialogues if hasattr(audio_result, 'dialogues') else [],
                    content_metadata=self.payload.get('contentMetadata', {})
                )

                step.print_substep("Draft saved", draft_result['files']['draft_json'])
                step.print_substep("Readable", draft_result['files']['draft_readable'])
                step.complete_step(current_step, "DRAFTING NARRATIVE", "Draft ready for approval")
                self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 100, "Narrative draft complete")

                # Return draft result and exit early (no trailer generation)
                elapsed = time.time() - start_time
                step.print_complete(elapsed, 0, 0)

                self.api_progress.send_complete(
                    variants=0,
                    trailers=0,
                    outputs={
                        "workflow_mode": "draft-narrative",
                        "draft_status": "ready_for_approval",
                        "draft_files": draft_result['files'],
                        "draft": draft_result['draft']
                    },
                    details={"message": "Narrative draft ready. Please review and approve before generating trailer."}
                )

                logger.info("Draft narrative workflow complete. Waiting for approval.")
                return draft_result

            # ========================================================================
            # STANDARD WORKFLOW OR APPROVED NARRATIVE MODE
            # ========================================================================

            # Step 5: Generate Narrative Variants
            current_step += 1
            step.start_step(current_step, "GENERATING NARRATIVE VARIANTS")
            self.progress.update(
                ProcessingStatus.GENERATING_NARRATIVES,
                "Analyzing story and generating narrative variants"
            )
            self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 0, "Generating narrative variants")

            # Check for approved narrative from Phase 1
            approved_narrative = self.payload.get("approvedNarrative")

            if approved_narrative:
                # PHASE 2: Generate trailer from approved narrative
                logger.info("WORKFLOW MODE: Generate Trailer from Approved Narrative")
                step.print_substep("Mode", "APPROVED NARRATIVE (using pre-approved structure)")
                self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 10, "Using approved narrative")

                from narrative.workflow_manager import WorkflowManager, WorkflowConfig

                wf_config = WorkflowConfig(
                    mode="generate-trailer",
                    project_id=self.project_id,
                    output_dir=self.output_dir
                )
                wf_manager = WorkflowManager(wf_config)

                trailer_config = wf_manager.execute_generate_trailer(
                    scenes=scene_result.scenes if hasattr(scene_result, 'scenes') else [],
                    dialogues=audio_result.dialogues if hasattr(audio_result, 'dialogues') else [],
                    approved_narrative=approved_narrative
                )

                # Convert approved narrative to standard narrative variants format
                # This allows the rest of the pipeline to work unchanged
                from narrative.generator import NarrativeVariant
                narrative_variants = self._convert_approved_narrative_to_variants(
                    trailer_config, audio_result
                )
                story_analysis = {"reasoning": approved_narrative.get('narrative_reasoning', '')}

            # Check which narrative mode to use
            else:
                use_dialogue_first = self.payload.get("useDialogueFirst", False)
                use_story_driven = self.payload.get("useStoryDriven", False)

            if use_story_driven and STORY_DRIVEN_PIPELINE_AVAILABLE:
                step.print_substep("Mode", "STORY-DRIVEN (Deep analysis with character names)")
                self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 10, "Using story-driven mode")
                narrative_variants, story_analysis = self._generate_story_driven_narratives(
                    audio_result, scene_result.video_duration
                )
            elif use_dialogue_first and DIALOGUE_PIPELINE_AVAILABLE:
                step.print_substep("Mode", "DIALOGUE-FIRST (LLM-based dialogue selection)")
                self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 10, "Using dialogue-first mode")
                narrative_variants, story_analysis = self._generate_dialogue_first_narratives(
                    audio_result, scene_result.video_duration
                )
            else:
                step.print_substep("Mode", "STANDARD (Scene + Story analysis)")
                self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 10, "Using standard mode")
                narrative_variants, story_analysis = self._generate_narratives(
                    scene_understandings, audio_result, scene_result.video_duration
                )

            step.print_substep("Variants created", f"{len(narrative_variants)}")
            for v in narrative_variants:
                step.print_substep(f"  {v.style}", f"{len(v.shot_sequence)} shots, confidence={v.confidence}")

            step.complete_step(current_step, "GENERATING NARRATIVE VARIANTS", f"{len(narrative_variants)} variants")
            self.api_progress.send_progress(PROGRESS_NARRATIVE_GENERATION, 100, f"{len(narrative_variants)} variants created")

            # Step 6: Assemble Trailer Videos
            current_step += 1
            step.start_step(current_step, "ASSEMBLING TRAILER VIDEOS")
            self.api_progress.send_progress(PROGRESS_TRAILER_ASSEMBLY, 0, "Assembling trailer videos")

            trailer_outputs = self._assemble_trailers(video_path, narrative_variants)

            if trailer_outputs:
                step.print_substep("Trailers created", f"{len(trailer_outputs)}")
                for t in trailer_outputs:
                    step.print_substep(f"  {t.style}", f"{t.duration:.1f}s @ {t.resolution}")
                step.complete_step(current_step, "ASSEMBLING TRAILER VIDEOS", f"{len(trailer_outputs)} trailers")
                self.api_progress.send_progress(PROGRESS_TRAILER_ASSEMBLY, 100, f"{len(trailer_outputs)} trailers assembled")
            else:
                step.print_substep("Status", "Skipped (generateTrailerVideos=false)")
                step.complete_step(current_step, "ASSEMBLING TRAILER VIDEOS", "Skipped")
                self.api_progress.send_progress(PROGRESS_TRAILER_ASSEMBLY, 100, "Skipped - video generation disabled")

            # Step 7: Upload to S3
            current_step += 1
            s3_bucket = self.payload.get("outputOptions", {}).get("outputS3Bucket") or self.payload.get("s3Bucket")
            s3_folder_key = self.payload.get("s3TrailerFolderKey")

            step.start_step(current_step, "UPLOADING TO S3")
            self.api_progress.send_progress(PROGRESS_UPLOAD, 0, "Preparing S3 upload")

            if s3_bucket and s3_folder_key:
                step.print_substep("Bucket", s3_bucket)
                step.print_substep("Folder", s3_folder_key)
                step.print_substep("Status", "Upload happens during output generation...")
                step.complete_step(current_step, "UPLOADING TO S3", f"Target: {s3_folder_key}")
                self.api_progress.send_progress(PROGRESS_UPLOAD, 50, f"S3 target: {s3_folder_key}")
            else:
                step.print_substep("Status", "Skipped (no s3TrailerFolderKey)")
                step.complete_step(current_step, "UPLOADING TO S3", "Skipped")
                self.api_progress.send_progress(PROGRESS_UPLOAD, 100, "Skipped - no S3 folder key")

            # Step 8: Generate Output Files
            current_step += 1
            step.start_step(current_step, "GENERATING OUTPUT FILES")
            step.print_substep("Status", "Writing JSON and uploading to S3...")
            self.progress.update(
                ProcessingStatus.UPLOADING,
                "Generating output files"
            )
            self.api_progress.send_progress(PROGRESS_OUTPUT_GENERATION, 0, "Generating output files")

            json_output = self._generate_outputs(
                start_time, scene_result, audio_result, visual_result,
                scene_understandings, narrative_variants, trailer_outputs,
                story_analysis=story_analysis
            )

            step.print_substep("Narrative JSON", str(self.output_dir / "narratives" / "narrative_report.json"))
            step.print_substep("Editor Guide", str(self.output_dir / "narratives" / "editor_guide.md"))
            self.api_progress.send_progress(PROGRESS_OUTPUT_GENERATION, 50, "JSON and guide generated")

            if json_output.get("s3_outputs"):
                s3_out = json_output["s3_outputs"]
                if s3_out.get("narrative_json"):
                    step.print_substep("S3 JSON", s3_out["narrative_json"]["s3_key"])
                if s3_out.get("trailers"):
                    step.print_substep("S3 Trailers", f"{len(s3_out['trailers'])} in variants/")
                self.api_progress.send_progress(PROGRESS_UPLOAD, 100, "S3 upload complete")

            step.complete_step(current_step, "GENERATING OUTPUT FILES", "All outputs generated")
            self.api_progress.send_progress(PROGRESS_OUTPUT_GENERATION, 100, "All outputs generated")

            # Complete - 100%
            elapsed = time.time() - start_time
            step.print_complete(elapsed, len(narrative_variants), len(trailer_outputs))

            self.progress.complete({
                "variant_count": len(narrative_variants),
                "trailer_count": len(trailer_outputs),
                "output_dir": str(self.output_dir),
                "processing_time": elapsed,
                "dialect_detected": audio_result.primary_dialect if hasattr(audio_result, 'primary_dialect') else None
            })

            # Send API completion with S3 outputs
            self.api_progress.send_complete(
                variants=len(narrative_variants),
                trailers=len(trailer_outputs),
                outputs={
                    "s3Outputs": json_output.get("s3_outputs", {}),
                    "outputFiles": json_output.get("outputFiles", {}),
                    "projectId": self.project_id
                },
                details={
                    "outputDir": str(self.output_dir),
                    "dialectDetected": audio_result.primary_dialect if hasattr(audio_result, 'primary_dialect') else None
                }
            )

            logger.info(f"Processing complete in {elapsed:.1f}s")
            logger.info(f"Output directory: {self.output_dir}")

            return json_output

        except Exception as e:
            step.print_failed(str(e))
            logger.error(f"Processing failed: {e}")
            logger.error(traceback.format_exc())
            self.progress.fail(str(e))
            # Send API failure
            self.api_progress.send_failed(str(e), step=step.current_step_name)
            raise

    def _load_video(self) -> Path:
        """Load video file from S3 or local path."""
        self.progress.update(
            ProcessingStatus.DOWNLOADING,
            "Loading video file"
        )

        video_path = self.storage.ensure_local(
            s3_key=self.payload.get("s3FileKey"),
            local_path=self.payload.get("localFilePath"),
            bucket=self.payload.get("s3Bucket")
        )

        self.input_sources["video"] = str(video_path)

        # Validate video
        loader = VideoLoader(video_path)
        metadata = loader.metadata

        logger.info(
            f"Video loaded: {metadata.duration:.0f}s, "
            f"{metadata.resolution}, {metadata.codec}"
        )

        return video_path

    def _load_video_with_progress(self, progress_callback) -> Path:
        """Load video file from S3 with progress tracking.

        Args:
            progress_callback: Function to call with progress (0.0-1.0)

        Returns:
            Path to local video file
        """
        self.progress.update(
            ProcessingStatus.DOWNLOADING,
            "Loading video file"
        )

        video_path = self.storage.ensure_local(
            s3_key=self.payload.get("s3FileKey"),
            local_path=self.payload.get("localFilePath"),
            bucket=self.payload.get("s3Bucket"),
            progress_callback=progress_callback
        )

        self.input_sources["video"] = str(video_path)

        # Validate video
        loader = VideoLoader(video_path)
        metadata = loader.metadata

        logger.info(
            f"Video loaded: {metadata.duration:.0f}s, "
            f"{metadata.resolution}, {metadata.codec}"
        )

        return video_path

    def _load_subtitles(self) -> Optional[Path]:
        """Load subtitle file if provided."""
        dialogue_input = self.payload.get("dialogueInput", {})

        subtitle_key = dialogue_input.get("subtitleS3Key")
        subtitle_path = dialogue_input.get("subtitleLocalPath")

        if not subtitle_key and not subtitle_path:
            return None

        self.progress.update(
            ProcessingStatus.PARSING_INPUTS,
            "Loading subtitle file",
            phase_progress=0.3
        )

        path = self.storage.ensure_local(
            s3_key=subtitle_key,
            local_path=subtitle_path,
            bucket=self.payload.get("s3Bucket")
        )

        self.input_sources["subtitles"] = str(path)
        logger.info(f"Subtitles loaded: {path}")

        return path

    def _load_script(self) -> Optional[Dict[str, Any]]:
        """Load and parse script if provided."""
        script_input = self.payload.get("scriptInput", {})

        script_key = script_input.get("scriptS3Key")
        script_path = script_input.get("scriptLocalPath")
        script_text = script_input.get("scriptText")

        if not script_key and not script_path and not script_text:
            return None

        self.progress.update(
            ProcessingStatus.PARSING_INPUTS,
            "Parsing script file",
            phase_progress=0.6
        )

        parser = ScriptParser()

        if script_text:
            parsed = parser.parse(text=script_text)
        else:
            path = self.storage.ensure_local(
                s3_key=script_key,
                local_path=script_path,
                bucket=self.payload.get("s3Bucket")
            )
            self.input_sources["script"] = str(path)
            parsed = parser.parse(file_path=path)

        logger.info(f"Script parsed: {len(parsed.scenes)} scenes")
        return parsed.to_dict()

    def _run_parallel_analysis(
        self,
        video_path: Path,
        subtitle_path: Optional[Path],
        progress_callback: Optional[callable] = None
    ) -> tuple:
        """Run scene, audio, and visual analysis in parallel.

        Args:
            video_path: Path to video
            subtitle_path: Optional subtitle file
            progress_callback: Optional callback(task_name, status, progress_pct)

        Returns:
            Tuple of (scene_result, audio_result, visual_result)
        """
        logger.info("Starting parallel analysis pipeline...")
        parallel_start = time.time()

        # Progress tracking - weighted by typical duration
        # Audio/ASR is usually the slowest (60%), scene (20%), visual (20%)
        progress_state = {"scene": 0, "audio": 0, "visual": 0}
        weights = {"scene": 20, "audio": 60, "visual": 20}

        def report_progress(task: str, status: str, task_pct: float = 0):
            """Report progress for a task."""
            progress_state[task] = task_pct
            total_pct = sum(progress_state[t] * weights[t] / 100 for t in progress_state)
            if progress_callback:
                progress_callback(task.upper(), status, total_pct)

        # Create parallel pipeline
        pipeline = ParallelPipeline(max_workers=self.config.parallel.max_cpu_workers)

        # Scene detection stage
        def run_scene_detection():
            logger.info("Running scene detection...")
            report_progress("scene", "Starting scene detection...", 0)
            detector = SceneDetector()
            result = detector.detect(video_path, show_progress=True)
            report_progress("scene", f"Complete - {result.scene_count} scenes", 100)
            return result

        # Audio/ASR stage with Indian dialect detection
        # Uses Whisper medium by default for better Indian dialect support
        def run_audio_analysis():
            logger.info("Running audio analysis...")
            report_progress("audio", "Starting audio analysis...", 0)

            # If subtitles provided, use them directly (FASTEST - no model download)
            if subtitle_path and subtitle_path.exists():
                logger.info("Using provided subtitles (skipping heavy ASR)")
                report_progress("audio", "Parsing subtitles...", 10)
                asr = IndianDialectASR(
                    model_name="auto",
                    device=None,
                    enable_dialect_detection=True
                )
                result = asr.transcribe(video_path, subtitle_path=subtitle_path)
                report_progress("audio", f"Complete - {len(result.segments)} segments from subtitles", 100)
            else:
                # No subtitles - use Whisper medium for better Indian dialect support
                try:
                    # Default from constants.py
                    whisper_size = WHISPER_MODEL
                    logger.info(f"Transcribing audio with Whisper {whisper_size} model...")
                    logger.info("(Edit WHISPER_MODEL in constants.py to change)")
                    report_progress("audio", f"Loading Whisper {whisper_size} model...", 5)

                    asr = IndianDialectASR(
                        model_name=f"whisper_{whisper_size}",
                        device=None,
                        enable_dialect_detection=True
                    )
                    report_progress("audio", f"Transcribing with Whisper {whisper_size} (this takes time)...", 10)
                    result = asr.transcribe(video_path, subtitle_path=None)
                    report_progress("audio", f"Complete - {len(result.segments)} segments", 100)

                except Exception as e:
                    logger.error(f"ASR failed: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    report_progress("audio", "Failed - returning empty result", 100)
                    # Return empty result to continue pipeline
                    from analysis.indian_asr import ASRResult
                    result = ASRResult(
                        segments=[],
                        full_text="",
                        total_duration=0,
                        primary_language="hi",
                        primary_dialect=None,
                        dialect_confidence=0,
                        dialect_distribution={},
                        processing_time=0,
                        model_used="failed",
                        word_count=0
                    )

            if hasattr(result, 'primary_dialect') and result.primary_dialect:
                logger.info(
                    f"Detected dialect: {result.primary_dialect.upper()} "
                    f"(confidence: {result.dialect_confidence:.2f})"
                )

            # Log ASR results for debugging
            if result.segments:
                logger.info(f"ASR completed: {len(result.segments)} segments, {result.word_count} words")
                if result.segments[:3]:
                    for seg in result.segments[:3]:
                        logger.info(f"  Sample: [{seg.start_time:.1f}s] \"{seg.text[:60]}...\"")
            else:
                logger.warning("ASR produced no segments - check audio track or provide subtitles")

            return result

        # Visual analysis stage (depends on scene detection)
        def run_visual_analysis(scene_detection_result=None):
            logger.info("Running visual analysis...")
            report_progress("visual", "Starting visual analysis...", 0)
            analyzer = VisualAnalyzer(
                device=self.config.visual.device,
                frames_per_scene=self.config.visual.frames_per_scene
            )

            scenes = []
            if scene_detection_result:
                scenes = [s.to_dict() for s in scene_detection_result.scenes]
                report_progress("visual", f"Analyzing {len(scenes)} scenes...", 20)

            result = analyzer.analyze_video(video_path, scenes=scenes, show_progress=True)
            report_progress("visual", f"Complete - {len(result.scenes) if result else 0} scenes analyzed", 100)
            return result

        # Add stages to pipeline
        pipeline.add_stage("scene_detection", run_scene_detection)
        pipeline.add_stage("audio_analysis", run_audio_analysis)
        pipeline.add_stage(
            "visual_analysis",
            run_visual_analysis,
            depends_on=["scene_detection"]
        )

        # Execute pipeline
        result = pipeline.execute()

        parallel_time = time.time() - parallel_start
        logger.info(
            f"Parallel analysis complete: {parallel_time:.1f}s "
            f"(saved {result.parallel_savings:.1f}s)"
        )

        # Extract results
        scene_result = result.stages.get("scene_detection", {}).get("result")
        audio_result = result.stages.get("audio_analysis", {}).get("result")
        visual_result = result.stages.get("visual_analysis", {}).get("result")

        return scene_result, audio_result, visual_result

    def _analyze_content(
        self,
        scene_result,
        audio_result,
        visual_result,
        script_data: Optional[Dict]
    ) -> List:
        """Analyze content for trailer potential."""
        content_analyzer = ContentAnalyzer()

        # Build transcript map - map ASR segments to scenes
        transcripts = {}
        dialogue_scene_count = 0

        for scene in scene_result.scenes:
            if hasattr(audio_result, 'get_segments_in_range') and audio_result.segments:
                segments = audio_result.get_segments_in_range(
                    scene.start_time,
                    scene.end_time
                )
                text = ' '.join(s.text for s in segments)
            else:
                text = ""

            transcripts[scene.id] = text
            if text and len(text) > 10:
                dialogue_scene_count += 1

        logger.info(f"Mapped dialogue to {dialogue_scene_count}/{len(scene_result.scenes)} scenes")

        # Log sample dialogue mapping
        sample_count = 0
        for scene_id, text in transcripts.items():
            if text and len(text) > 10 and sample_count < 3:
                logger.info(f"  {scene_id}: \"{text[:60]}...\"")
                sample_count += 1

        # Build visual map
        visual_map = {}
        if visual_result:
            for v in visual_result.scenes:
                visual_map[v.scene_id] = v.to_dict()

        # Build script context map
        script_contexts = self._build_script_context_map(scene_result, script_data)

        # Analyze scenes
        scene_understandings = content_analyzer.analyze_scenes(
            scenes=[s.to_dict() for s in scene_result.scenes],
            transcripts=transcripts,
            visual_analyses=visual_map,
            script_contexts=script_contexts,
            video_duration=scene_result.video_duration,
            show_progress=True
        )

        # Log content analysis results
        scenes_with_dialogue = [s for s in scene_understandings if s.key_quote and len(s.key_quote) > 10]
        logger.info(f"Content analysis complete: {len(scene_understandings)} scenes, {len(scenes_with_dialogue)} with dialogue")

        # Log best dialogue scenes
        scenes_with_dialogue.sort(key=lambda s: s.trailer_potential, reverse=True)
        for scene in scenes_with_dialogue[:5]:
            logger.info(f"  [{scene.trailer_potential}] {scene.scene_id}: \"{scene.key_quote[:60]}...\"")

        return scene_understandings

    def _build_script_context_map(
        self,
        scene_result,
        script_data: Optional[Dict]
    ) -> Dict[str, Dict]:
        """Build map of scene IDs to script context."""
        if not script_data:
            return {}

        script_scenes = script_data.get("scenes", [])
        video_scenes = scene_result.scenes

        if not script_scenes:
            return {}

        contexts = {}
        ratio = len(script_scenes) / len(video_scenes) if video_scenes else 1

        for i, scene in enumerate(video_scenes):
            script_idx = min(int(i * ratio), len(script_scenes) - 1)
            script_scene = script_scenes[script_idx]

            contexts[scene.id] = {
                "heading": script_scene.get("heading", ""),
                "description": script_scene.get("description", ""),
                "characters": script_scene.get("characters", [])
            }

        return contexts

    def _convert_approved_narrative_to_variants(
        self,
        trailer_config: Dict,
        audio_result
    ) -> List:
        """Convert approved narrative beats to standard NarrativeVariant format.

        Args:
            trailer_config: Configuration from approved narrative
            audio_result: Audio analysis result with dialogues

        Returns:
            List of NarrativeVariant objects
        """
        from narrative.generator import NarrativeVariant, ShotSequence

        logger.info("Converting approved narrative to variants...")

        beats = trailer_config.get('beats', [])
        narrative = trailer_config.get('narrative', {})

        # Create shot sequence from approved beats
        shot_sequence = []
        for beat in beats:
            shot = ShotSequence(
                order=beat.get('order', 0),
                scene_id=f"scene_{beat.get('order', 0):04d}",
                timecode_start=beat.get('timecode_start', '00:00:00'),
                timecode_end=beat.get('timecode_end', '00:00:00'),
                dialogue_line=beat.get('key_dialogue', ''),
                emotional_beat=beat.get('emotional_tone', 'dramatic'),
                recommended_duration=beat.get('duration', 3.0),
                transition_type="cut"
            )
            shot_sequence.append(shot)

        # Create single variant from approved narrative
        variant = NarrativeVariant(
            style="approved",
            name="Approved Narrative",
            description=narrative.get('story_premise', 'Approved narrative structure'),
            shot_sequence=shot_sequence,
            target_duration=narrative.get('target_duration', 120),
            actual_duration=narrative.get('estimated_duration', 120),
            confidence=100,  # Approved by human
            reasoning=narrative.get('narrative_reasoning', 'User-approved narrative')
        )

        logger.info(f"Converted approved narrative: {len(shot_sequence)} shots")
        return [variant]

    def _generate_narratives(
        self,
        scene_understandings: List,
        audio_result,
        video_duration: float
    ) -> Tuple[List, Optional[Dict]]:
        """Generate narrative variants using LLM story analysis.

        Returns:
            Tuple of (variants list, story analysis dict) - always returns valid data
        """
        content_metadata = self.payload.get("contentMetadata", {})
        target_duration = content_metadata.get("targetDuration", 90)

        # Ensure valid video duration
        if video_duration <= 0:
            video_duration = 3600  # Default 1 hour if not provided
            logger.warning(f"Invalid video duration, defaulting to {video_duration}s")

        # Step 1: Analyze full movie story using LLM
        logger.info("=" * 60)
        logger.info("STORY ANALYSIS: Analyzing full movie from dialogues...")
        logger.info("=" * 60)

        # Prepare dialogue segments for story analysis
        dialogue_segments = []
        if hasattr(audio_result, 'segments') and audio_result.segments:
            for seg in audio_result.segments:
                dialogue_segments.append({
                    "text": seg.text,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "duration": seg.duration,
                    "is_question": seg.is_question if hasattr(seg, 'is_question') else ("?" in seg.text),
                    "emotional_score": seg.emotional_score if hasattr(seg, 'emotional_score') else 0
                })

        logger.info(f"Analyzing {len(dialogue_segments)} dialogue segments for story structure...")

        # Prepare scenes for analysis
        scenes_for_analysis = [
            {
                "scene_id": s.scene_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "duration": s.end_time - s.start_time,
                "key_quote": s.key_quote,
                "emotional_score": s.emotional_score,
                "action_score": s.action_score,
                "visual_hook": s.visual_hook,
                "trailer_potential": s.trailer_potential
            }
            for s in scene_understandings
        ]

        # Run story analysis (uses LLM if available, falls back to rule-based)
        use_llm = USE_LLM
        story_analysis = analyze_movie_story(
            segments=dialogue_segments,
            scenes=scenes_for_analysis,
            video_duration=video_duration,
            metadata=content_metadata,
            use_llm=use_llm
        )

        # Log story analysis results
        logger.info(f"Story Analysis Results:")
        logger.info(f"  Genre: {story_analysis.genre}")
        logger.info(f"  Primary Emotion: {story_analysis.primary_emotion}")
        logger.info(f"  Characters: {len(story_analysis.characters)}")
        if story_analysis.protagonist:
            logger.info(f"  Protagonist: {story_analysis.protagonist.description[:50]}...")
        if story_analysis.antagonist:
            logger.info(f"  Antagonist: {story_analysis.antagonist.description[:50]}...")
        logger.info(f"  Best Hooks: {len(story_analysis.best_hooks)}")
        logger.info(f"  Best Questions: {len(story_analysis.best_questions)}")
        logger.info(f"  Recommended Variants: {story_analysis.recommended_variants}")

        # Log best hooks and questions
        if story_analysis.best_hooks:
            logger.info("Top Hook Dialogues:")
            for hook in story_analysis.best_hooks[:3]:
                logger.info(f"    \"{hook.get('dialogue', '')[:60]}...\"")

        if story_analysis.best_questions:
            logger.info("Top Cliffhanger Questions:")
            for q in story_analysis.best_questions[:3]:
                logger.info(f"    \"{q.get('dialogue', '')[:60]}\"")

        # Step 2: Build professional trailer narratives based on story analysis
        logger.info("=" * 60)
        logger.info("NARRATIVE BUILDING: Creating trailer variants...")
        logger.info("=" * 60)

        professional_variants = []
        try:
            professional_variants = build_professional_narratives(
                story_analysis=story_analysis,
                scenes=scenes_for_analysis,
                segments=dialogue_segments,
                video_duration=video_duration,
                target_duration=target_duration
            )

            # Log variant results
            logger.info(f"Generated {len(professional_variants)} professional trailer variants:")
            for v in professional_variants:
                dialogue_beats = [b for b in v.beats if b.dialogue]
                logger.info(
                    f"  {v.style.upper()}: {len(v.beats)} beats, "
                    f"{len(dialogue_beats)} with dialogue, "
                    f"hook_strength={v.hook_strength}, "
                    f"cliffhanger={'YES' if v.cliffhanger_question else 'NO'}"
                )
                if v.cliffhanger_question:
                    logger.info(f"    Cliffhanger: \"{v.cliffhanger_question[:60]}...\"")
        except Exception as e:
            logger.error(f"Professional narrative building failed: {e}")
            logger.info("Falling back to legacy narrative generator only")

        # Also generate legacy variants for backward compatibility
        legacy_variants = []
        try:
            generator = NarrativeGenerator()
            styles = self.payload.get("narrativeStyles") or self.config.narrative.default_styles

            legacy_variants = generator.generate_all_variants(
                scenes=scene_understandings,
                video_duration=video_duration,
                styles=styles,
                target_duration=target_duration,
                metadata=content_metadata
            )
        except Exception as e:
            logger.error(f"Legacy narrative generation failed: {e}")

        # Combine professional and legacy variants (professional first)
        all_variants = []

        # Convert professional variants to expected format
        for pv in professional_variants:
            try:
                all_variants.append(self._convert_professional_variant(pv, scene_understandings))
            except Exception as e:
                logger.error(f"Failed to convert professional variant {pv.id}: {e}")
                continue

        # Add legacy variants that aren't duplicates
        existing_styles = {v.style for v in professional_variants}
        for lv in legacy_variants:
            if lv.style not in existing_styles:
                all_variants.append(lv)

        # Ensure we have at least one variant
        if not all_variants and legacy_variants:
            all_variants = legacy_variants[:3]  # Take first 3 legacy variants

        if not all_variants:
            logger.error("No variants generated! This should not happen.")

        return all_variants, story_analysis.to_dict()

    def _generate_dialogue_first_narratives(
        self,
        audio_result,
        video_duration: float
    ) -> Tuple[List, Optional[Dict]]:
        """Generate narratives using the dialogue-first pipeline.

        This approach:
        1. Takes ALL dialogues with timestamps
        2. Uses local LLM (Ollama) to select and order best dialogues
        3. Builds narrative from dialogue selections
        4. Maps dialogues to scene timestamps for assembly

        Returns:
            Tuple of (variants list, story analysis dict)
        """
        from narrative.dialogue_pipeline import DialogueFirstPipeline

        content_metadata = self.payload.get("contentMetadata", {})
        target_duration = content_metadata.get("targetDuration", 90)

        # Get Ollama model from payload or constants
        ollama_model = self.payload.get("ollamaModel", OLLAMA_MODEL)

        # Prepare dialogue segments from ASR result
        dialogue_segments = []
        if hasattr(audio_result, 'segments') and audio_result.segments:
            for seg in audio_result.segments:
                dialogue_segments.append({
                    "text": seg.text,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "duration": seg.duration if hasattr(seg, 'duration') else seg.end_time - seg.start_time
                })

        logger.info(f"Dialogue-First Pipeline: Processing {len(dialogue_segments)} dialogue segments")
        logger.info(f"Using Ollama model: {ollama_model}")

        if len(dialogue_segments) < 10:
            logger.warning("Less than 10 dialogues found. Results may be limited.")
            logger.info("Consider providing subtitles for better dialogue extraction.")

        # Initialize pipeline
        pipeline = DialogueFirstPipeline(model=ollama_model)

        # Get styles from config
        styles = self.payload.get("narrativeStyles") or self.config.narrative.default_styles

        # Generate variants
        dialogue_variants = pipeline.process(
            dialogue_segments=dialogue_segments,
            video_duration=video_duration,
            styles=styles,
            target_duration=target_duration,
            metadata=content_metadata
        )

        # Convert to format compatible with rest of pipeline
        from narrative.generator import NarrativeVariant, ShotInstruction

        all_variants = []
        story_analysis_dict = {
            "method": "dialogue_first",
            "dialogues_processed": len(dialogue_segments),
            "variants_generated": len(dialogue_variants),
            "model_used": ollama_model
        }

        for dv in dialogue_variants:
            # Convert beats to shot instructions
            shots = []
            for beat in dv.beats:
                shot = ShotInstruction(
                    order=beat.order,
                    scene_ref=f"dial_{beat.order:04d}",
                    timecode_start=self._format_tc(beat.start_time),
                    timecode_end=self._format_tc(beat.end_time),
                    duration=beat.duration,
                    phase=beat.phase,
                    audio=beat.audio_type,
                    dialogue=beat.dialogue_text,
                    transition=beat.transition_in,
                    text_overlay=beat.text_overlay,
                    is_hook=beat.is_hook
                )
                shots.append(shot)

            variant = NarrativeVariant(
                id=dv.id,
                style=dv.style,
                title=dv.name,
                target_duration=dv.target_duration,
                structure={
                    "phases": [b.phase for b in dv.beats],
                    "hook_strength": dv.hook_strength,
                    "cliffhanger": dv.cliffhanger_question,
                    "description": dv.description,
                    "characters": dv.characters
                },
                shot_sequence=shots,
                music_recommendation={"style": dv.style},
                text_overlays=[],
                opening_hook=dv.opening_hook,
                closing_tag=dv.cliffhanger_question or "",
                confidence=dv.structure_quality,
                suspense_peak=0.85,
                character_intro_present=any(b.phase == "character_intro" for b in dv.beats),
                hook_ending_present=dv.cliffhanger_question is not None
            )
            all_variants.append(variant)

            logger.info(
                f"Dialogue-First Variant: {dv.style} - {len(dv.beats)} beats, "
                f"quality={dv.structure_quality}, cliffhanger={'YES' if dv.cliffhanger_question else 'NO'}"
            )
            if dv.cliffhanger_question:
                logger.info(f"  Cliffhanger: \"{dv.cliffhanger_question[:60]}...\"")

        # Add LLM reasoning to story analysis
        if dialogue_variants:
            story_analysis_dict["llm_reasoning"] = dialogue_variants[0].llm_reasoning
            story_analysis_dict["characters"] = dialogue_variants[0].characters
            story_analysis_dict["story_premise"] = dialogue_variants[0].story_premise

        return all_variants, story_analysis_dict

    def _generate_story_driven_narratives(
        self,
        audio_result,
        video_duration: float
    ) -> Tuple[List, Optional[Dict]]:
        """Generate narratives using deep story analysis with character extraction.

        This approach:
        1. Analyzes ALL dialogues to understand complete story
        2. Extracts character NAMES from dialogue content
        3. Identifies relationships (allies, antagonists, family)
        4. Builds coherent trailer with story continuity
        5. Creates proper character introductions
        6. Ends with compelling cliffhanger

        Returns:
            Tuple of (variants list, story analysis dict)
        """
        from narrative.story_driven_pipeline import StoryDrivenPipeline

        content_metadata = self.payload.get("contentMetadata", {})
        target_duration = content_metadata.get("targetDuration", 90)

        # Get Ollama model from payload or constants
        ollama_model = self.payload.get("ollamaModel", OLLAMA_MODEL)

        # Prepare dialogue segments from ASR result
        dialogue_segments = []
        if hasattr(audio_result, 'segments') and audio_result.segments:
            for seg in audio_result.segments:
                dialogue_segments.append({
                    "text": seg.text,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "duration": seg.duration if hasattr(seg, 'duration') else seg.end_time - seg.start_time
                })

        logger.info(f"Story-Driven Pipeline: Processing {len(dialogue_segments)} dialogue segments")
        logger.info(f"Using Ollama model: {ollama_model}")

        if len(dialogue_segments) < 10:
            logger.warning("Less than 10 dialogues found. Results may be limited.")
            logger.info("Consider providing subtitles for better dialogue extraction.")

        # Initialize story-driven pipeline
        pipeline = StoryDrivenPipeline(model=ollama_model)

        # Generate story-driven trailer
        story_trailer = pipeline.process(
            dialogues=dialogue_segments,
            video_duration=video_duration,
            metadata=content_metadata,
            target_duration=target_duration
        )

        # Convert to format compatible with rest of pipeline
        from narrative.generator import NarrativeVariant, ShotInstruction

        all_variants = []
        story_analysis_dict = {
            "method": "story_driven",
            "dialogues_processed": len(dialogue_segments),
            "model_used": ollama_model,
            "protagonist": story_trailer.protagonist_name,
            "antagonist": story_trailer.antagonist_name,
            "story_logline": story_trailer.story_logline,
            "central_conflict": story_trailer.central_conflict,
            "hook_question": story_trailer.hook_question,
            "characters": story_trailer.all_characters,
            "narrative_flow": story_trailer.narrative_flow,
            "confidence": story_trailer.confidence
        }

        # Convert beats to shot instructions
        shots = []
        for beat in story_trailer.beats:
            shot = ShotInstruction(
                order=beat.order,
                scene_ref=f"story_{beat.order:04d}",
                timecode_start=self._format_tc(beat.start_time),
                timecode_end=self._format_tc(beat.end_time),
                duration=beat.duration_in_trailer,
                phase=beat.phase,
                audio=beat.audio_type,
                dialogue=beat.dialogue_text,
                transition=beat.transition,
                text_overlay=beat.text_overlay,
                is_hook=beat.phase in ["opening_hook", "cliffhanger"]
            )
            shots.append(shot)

        # Create single variant (story-driven produces one coherent narrative)
        variant = NarrativeVariant(
            id=story_trailer.id,
            style="story_driven",
            title=f"{story_trailer.title} - Story Narrative",
            target_duration=target_duration,
            structure={
                "phases": [b.phase for b in story_trailer.beats],
                "protagonist": story_trailer.protagonist_name,
                "antagonist": story_trailer.antagonist_name,
                "story_logline": story_trailer.story_logline,
                "hook_question": story_trailer.hook_question,
                "characters": story_trailer.all_characters
            },
            shot_sequence=shots,
            music_recommendation={"style": "dramatic", "builds_to_climax": True},
            text_overlays=[],
            opening_hook=story_trailer.beats[0].dialogue_text if story_trailer.beats else "",
            closing_tag=story_trailer.hook_question,
            confidence=story_trailer.confidence,
            suspense_peak=0.9,
            character_intro_present=any(b.phase == "protagonist_intro" for b in story_trailer.beats),
            hook_ending_present=any(b.phase == "cliffhanger" for b in story_trailer.beats)
        )
        all_variants.append(variant)

        logger.info(
            f"Story-Driven Narrative: {len(story_trailer.beats)} beats, "
            f"confidence={story_trailer.confidence}, "
            f"protagonist={story_trailer.protagonist_name}"
        )
        logger.info(f"  Story: {story_trailer.story_logline[:60]}...")
        logger.info(f"  Hook: {story_trailer.hook_question}")

        # Print trailer summary
        pipeline.print_trailer_summary(story_trailer)

        return all_variants, story_analysis_dict

    def _format_tc(self, seconds: float) -> str:
        """Convert seconds to timecode string."""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}"

    def _convert_professional_variant(self, prof_variant, scene_understandings):
        """Convert professional variant to legacy format for compatibility."""
        from narrative.generator import NarrativeVariant, ShotInstruction

        def _tc(seconds: float) -> str:
            """Convert seconds to timecode string."""
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = seconds % 60
            return f"{h:02d}:{m:02d}:{s:06.3f}"

        # Build shot sequence from beats
        shots = []
        for beat in prof_variant.beats:
            shot = ShotInstruction(
                order=len(shots) + 1,
                scene_ref=beat.scene_id,
                timecode_start=_tc(beat.start_time),
                timecode_end=_tc(beat.end_time),
                duration=beat.duration,
                phase=beat.phase.value,
                audio="dialogue" if beat.dialogue else beat.audio_type,
                dialogue=beat.dialogue,
                transition=beat.transition_in,
                text_overlay=beat.text_overlay,
                is_hook=beat.phase.value in ["story_hook", "cliffhanger"]
            )
            shots.append(shot)

        # Find opening hook and closing tag from beats
        opening_hook = ""
        closing_tag = ""
        for beat in prof_variant.beats:
            if beat.phase.value == "opening_hook" and beat.dialogue:
                opening_hook = beat.dialogue
            if beat.phase.value == "cliffhanger" and beat.dialogue:
                closing_tag = beat.dialogue

        # Build text overlays from beats with text
        text_overlays = []
        for beat in prof_variant.beats:
            if beat.text_overlay:
                text_overlays.append({
                    "text": beat.text_overlay,
                    "phase": beat.phase.value,
                    "timing": beat.duration
                })

        return NarrativeVariant(
            id=prof_variant.id,
            style=prof_variant.style,
            title=prof_variant.name,
            target_duration=prof_variant.target_duration,
            structure={
                "phases": [b.phase.value for b in prof_variant.beats],
                "hook_strength": prof_variant.hook_strength,
                "cliffhanger": prof_variant.cliffhanger_question,
                "description": prof_variant.description
            },
            shot_sequence=shots,
            music_recommendation={
                "style": prof_variant.style,
                "has_dialogue_gaps": prof_variant.dialogue_coverage < 0.5
            },
            text_overlays=text_overlays,
            opening_hook=opening_hook,
            closing_tag=closing_tag,
            confidence=prof_variant.structure_quality,
            suspense_peak=0.85,
            character_intro_present=any(b.phase.value == "character_intro" and b.dialogue for b in prof_variant.beats),
            hook_ending_present=prof_variant.cliffhanger_question is not None
        )

    def _assemble_trailers(
        self,
        video_path: Path,
        narrative_variants: List
    ) -> List:
        """Assemble trailer videos."""
        output_options = self.payload.get("outputOptions", {})

        if not output_options.get("generateTrailerVideos", True):
            return []

        self.progress.update(
            ProcessingStatus.ASSEMBLING_TRAILERS,
            "Assembling production-quality trailer videos"
        )

        assembler = TrailerAssembler(
            output_format=output_options.get("trailerFormat", "mp4"),
            resolution=output_options.get("trailerResolution", "1080p"),
            include_watermark=not self.config.production_mode
        )

        trailers_dir = self.output_dir / "trailers"
        trailer_outputs = assembler.assemble_all_variants(
            video_path,
            narrative_variants,
            trailers_dir
        )

        # Upload to S3 if configured
        s3_bucket = output_options.get("outputS3Bucket") or self.payload.get("s3Bucket")
        s3_folder_key = self.payload.get("s3TrailerFolderKey")

        if s3_bucket and s3_folder_key:
            self._upload_trailers(trailer_outputs, s3_bucket, s3_folder_key)
        elif s3_bucket:
            # Fallback to project-based path if no folder key specified
            fallback_folder = f"{self.project_id}/trailers"
            self._upload_trailers(trailer_outputs, s3_bucket, fallback_folder)

        return trailer_outputs

    def _upload_trailers(self, trailers: List, bucket: str, folder_key: str) -> None:
        """Upload trailers to S3 variants subfolder.

        Args:
            trailers: List of trailer output objects
            bucket: S3 bucket name
            folder_key: S3 folder path (e.g., "content/123/trailers")

        Uploads to: {folder_key}/variants/{trailer_filename}.mp4
        """
        # Ensure folder_key doesn't have leading/trailing slashes
        folder_key = folder_key.strip("/")

        for trailer in trailers:
            filename = Path(trailer.local_path).name
            s3_key = f"{folder_key}/variants/{filename}"
            try:
                s3_uri = self.storage.upload_to_s3(
                    trailer.local_path,
                    s3_key,
                    bucket=bucket,
                    content_type="video/mp4"
                )
                trailer.s3_key = s3_key
                trailer.s3_uri = s3_uri
                trailer.s3_url = self.storage.get_presigned_url(s3_key, bucket)
                logger.info(f"Uploaded trailer: s3://{bucket}/{s3_key}")
            except Exception as e:
                logger.warning(f"Failed to upload trailer {trailer.variant_id}: {e}")

    def _generate_outputs(
        self,
        start_time: float,
        scene_result,
        audio_result,
        visual_result,
        scene_understandings: List,
        narrative_variants: List,
        trailer_outputs: List,
        story_analysis: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate JSON and Markdown outputs."""
        content_metadata = self.payload.get("contentMetadata", {})

        # JSON output
        json_formatter = JSONFormatter(self.project_id)
        json_output = json_formatter.format_complete_output(
            processing_time=time.time() - start_time,
            input_sources=self.input_sources,
            scene_detection=scene_result,
            audio_analysis=audio_result,
            visual_analysis=visual_result,
            scene_understandings=scene_understandings,
            narrative_variants=narrative_variants,
            trailer_outputs=trailer_outputs,
            content_metadata=content_metadata
        )

        # Add dialect information
        if hasattr(audio_result, 'primary_dialect') and audio_result.primary_dialect:
            json_output["dialect_analysis"] = {
                "primary_dialect": audio_result.primary_dialect,
                "confidence": audio_result.dialect_confidence,
                "distribution": audio_result.dialect_distribution
            }

        # Add production readiness flag
        production_ready_count = sum(
            1 for v in narrative_variants if v.confidence >= 75
        )
        json_output["production_summary"] = {
            "total_variants": len(narrative_variants),
            "production_ready_variants": production_ready_count,
            "requires_minimal_editing": production_ready_count == len(narrative_variants)
        }

        # Add story analysis if available
        if story_analysis:
            json_output["story_analysis"] = story_analysis

        json_path = self.output_dir / "narratives" / "narrative_report.json"
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_formatter.save(json_output, json_path)

        # Upload narrative JSON to S3 if configured
        output_options = self.payload.get("outputOptions", {})
        s3_bucket = output_options.get("outputS3Bucket") or self.payload.get("s3Bucket")
        s3_folder_key = self.payload.get("s3TrailerFolderKey")

        if s3_bucket and s3_folder_key:
            folder_key = s3_folder_key.strip("/")
            json_s3_key = f"{folder_key}/narrative_report.json"
            try:
                s3_uri = self.storage.upload_to_s3(
                    str(json_path),
                    json_s3_key,
                    bucket=s3_bucket,
                    content_type="application/json"
                )
                json_output["s3_outputs"] = json_output.get("s3_outputs", {})
                json_output["s3_outputs"]["narrative_json"] = {
                    "s3_key": json_s3_key,
                    "s3_uri": s3_uri,
                    "s3_url": self.storage.get_presigned_url(json_s3_key, s3_bucket)
                }
                logger.info(f"Uploaded narrative JSON: s3://{s3_bucket}/{json_s3_key}")
            except Exception as e:
                logger.warning(f"Failed to upload narrative JSON to S3: {e}")

        # Markdown report
        report_generator = ReportGenerator(self.project_id)

        # Get language info
        language = "hi"
        dialect = None
        if hasattr(audio_result, 'primary_language'):
            language = audio_result.primary_language
        if hasattr(audio_result, 'primary_dialect'):
            dialect = audio_result.primary_dialect

        report = report_generator.generate_report(
            title=content_metadata.get("title", "Untitled"),
            duration=scene_result.video_duration,
            scene_count=scene_result.scene_count,
            language=f"{language} ({dialect})" if dialect else language,
            genre=content_metadata.get("genre", "Unknown"),
            scene_understandings=scene_understandings,
            narrative_variants=narrative_variants,
            trailer_outputs=trailer_outputs,
            processing_time=time.time() - start_time,
            input_sources=self.input_sources
        )

        report_path = self.output_dir / "narratives" / "editor_guide.md"
        report_generator.save(report, report_path)

        # Upload markdown report to S3 if configured
        if s3_bucket and s3_folder_key:
            md_s3_key = f"{folder_key}/editor_guide.md"
            try:
                md_s3_uri = self.storage.upload_to_s3(
                    str(report_path),
                    md_s3_key,
                    bucket=s3_bucket,
                    content_type="text/markdown"
                )
                json_output["s3_outputs"]["editor_guide"] = {
                    "s3_key": md_s3_key,
                    "s3_uri": md_s3_uri,
                    "s3_url": self.storage.get_presigned_url(md_s3_key, s3_bucket)
                }
                logger.info(f"Uploaded editor guide: s3://{s3_bucket}/{md_s3_key}")
            except Exception as e:
                logger.warning(f"Failed to upload editor guide to S3: {e}")

        # Add trailer S3 info to output
        if trailer_outputs and s3_bucket:
            json_output["s3_outputs"] = json_output.get("s3_outputs", {})
            json_output["s3_outputs"]["trailers"] = []
            for trailer in trailer_outputs:
                if hasattr(trailer, 's3_key') and trailer.s3_key:
                    json_output["s3_outputs"]["trailers"].append({
                        "variant_id": trailer.variant_id,
                        "style": trailer.style,
                        "s3_key": trailer.s3_key,
                        "s3_uri": getattr(trailer, 's3_uri', f"s3://{s3_bucket}/{trailer.s3_key}"),
                        "s3_url": getattr(trailer, 's3_url', None)
                    })

        # Update JSON with output paths
        json_output["outputFiles"]["jsonReport"] = str(json_path)
        json_output["outputFiles"]["markdownReport"] = str(report_path)

        return json_output


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Production-Grade Trailer Narrative AI")
        print("=" * 50)
        print("\nUsage: python main.py '<json_payload>'")
        print("\nExamples:")
        print("\n  Local file:")
        print('  python main.py \'{"projectId": "test", "localFilePath": "/path/to/video.mp4"}\'')
        print("\n  S3 input with S3 output:")
        print('  python main.py \'{"projectId": "test", "s3Bucket": "my-bucket", "s3FileKey": "videos/movie.mp4", "s3TrailerFolderKey": "output/trailers/movie123"}\'')
        print("\nFeatures:")
        print("  - Fast parallel processing")
        print("  - Indian dialect detection (Haryanvi, Bhojpuri, Rajasthani, Gujarati)")
        print("  - Professional 5-act story structure")
        print("  - Production-ready output (minimal editor changes)")
        print("  - S3 upload for trailers and narrative JSON")
        print("  - All open-source models (NO paid APIs)")
        sys.exit(1)

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON payload: {e}")
        sys.exit(1)

    # Validate required fields
    if "projectId" not in payload:
        logger.error("projectId is required")
        sys.exit(1)

    if not payload.get("s3FileKey") and not payload.get("localFilePath"):
        logger.error("Either s3FileKey or localFilePath is required")
        sys.exit(1)

    # Process
    processor = ProductionTrailerProcessor(payload)
    result = processor.process()

    # Output result
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
