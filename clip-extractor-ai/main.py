#!/usr/bin/env python3
"""
Clip Extractor AI - Extract best emotional clips from movies.

Analyzes video using scene detection + audio energy analysis to find
the most emotional/high-energy moments and extract them as clips.
No narrative required - pure emotion-based extraction.

Usage:
    python main.py '<json_payload>'

Input JSON:
{
    "projectId": "string (required)",
    "videoUrl": "string (required - public CMS video URL)",
    "s3Bucket": "string (optional - S3 bucket for output clips)",
    "s3Region": "string (optional - AWS region)",
    "s3ClipsOutputFolderKey": "string (optional - S3 folder for clips)",
    "progressBaseUrl": "string (optional - NestJS webhook URL)",
    "token": "string (optional - auth token for progress API)",
    "contentMetadata": {
        "title": "string",
        "genre": "string",
        "language": "string"
    },
    "clipConfig": {
        "numClips": 5,
        "minClipDuration": 60,
        "maxClipDuration": 120,
        "generateCompiled": true,
        "compiledMaxDuration": 120
    }
}
"""

import sys
import json
import time
from pathlib import Path
from loguru import logger

# Configure loguru
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level:<7} | {message}")


def main():
    """Main entry point for clip extraction."""

    # Parse JSON payload from command line argument
    if len(sys.argv) < 2:
        logger.error("Usage: python main.py '<json_payload>'")
        sys.exit(1)

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON payload: {e}")
        sys.exit(1)

    # Extract required fields
    project_id = payload.get("projectId")
    video_url = payload.get("videoUrl")

    if not project_id:
        logger.error("projectId is required")
        sys.exit(1)

    if not video_url:
        logger.error("videoUrl is required (public CMS video link)")
        sys.exit(1)

    # Extract optional fields
    s3_bucket = payload.get("s3Bucket")
    s3_region = payload.get("s3Region", "ap-south-1")
    s3_output_folder = payload.get("s3ClipsOutputFolderKey", f"clip-extractor/{project_id}/clips")
    progress_base_url = payload.get("progressBaseUrl")
    token = payload.get("token")
    content_metadata = payload.get("contentMetadata", {})
    clip_config = payload.get("clipConfig", {})

    # Import after payload parsing (so errors are clearer)
    from config.config import get_config
    from core.progress import ProgressReporter, ProcessingStage
    from core.storage import StorageHandler
    from extraction.clip_selector import select_clips
    from extraction.clip_assembler import extract_all_clips

    # Configure
    config = get_config()
    if s3_bucket:
        config.s3.bucket = s3_bucket
    if s3_region:
        config.s3.region = s3_region

    # Apply clip config overrides
    if clip_config.get("numClips"):
        config.clip.num_clips = clip_config["numClips"]
    if clip_config.get("minClipDuration"):
        config.clip.min_clip_duration = clip_config["minClipDuration"]
    if clip_config.get("maxClipDuration"):
        config.clip.max_clip_duration = clip_config["maxClipDuration"]
    if clip_config.get("segmentMinDuration"):
        config.clip.segment_min_duration = clip_config["segmentMinDuration"]
    if clip_config.get("segmentMaxDuration"):
        config.clip.segment_max_duration = clip_config["segmentMaxDuration"]
    if clip_config.get("compiledMaxDuration"):
        config.clip.compiled_max_duration = clip_config["compiledMaxDuration"]
    if "generateCompiled" in clip_config:
        config.clip.generate_compiled = clip_config["generateCompiled"]

    # Setup
    progress = ProgressReporter(
        project_id=project_id,
        base_url=progress_base_url,
        token=token,
    )
    storage = StorageHandler(bucket=s3_bucket, region=s3_region)

    temp_dir = Path(config.temp_dir) / project_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir = temp_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    start_time = time.time()

    logger.info("=" * 60)
    logger.info("CLIP EXTRACTOR AI (Emotion-Based)")
    logger.info("=" * 60)
    logger.info(f"Project ID  : {project_id}")
    logger.info(f"Video URL   : {video_url}")
    logger.info(f"Content     : {content_metadata.get('title', 'Unknown')}")
    logger.info(f"Num Clips   : {config.clip.num_clips}")
    logger.info(f"Clip Duration: {config.clip.min_clip_duration}-{config.clip.max_clip_duration}s")
    logger.info(f"Mode        : Emotion analysis (no narrative)")
    logger.info("=" * 60)

    try:
        # =============================================================
        # STEP 1: Download video from public URL
        # =============================================================
        progress.start()
        progress.update(ProcessingStage.DOWNLOADING_VIDEO, "Downloading video from URL", 0.0)

        source_video = str(temp_dir / "source_video.mp4")

        def download_progress(p):
            progress.update(
                ProcessingStage.DOWNLOADING_VIDEO,
                f"Downloading: {p*100:.0f}%",
                p,
            )

        storage.download_video_from_url(video_url, source_video, download_progress)
        video_size = Path(source_video).stat().st_size
        logger.info(f"Video downloaded: {video_size / (1024*1024):.1f} MB")

        progress.update(ProcessingStage.DOWNLOADING_VIDEO, "Download complete", 1.0)

        # =============================================================
        # STEP 2: Analyze video emotions and select clips
        # =============================================================
        progress.update(ProcessingStage.ANALYZING_NARRATIVE, "Analyzing video emotions", 0.0)

        def analysis_progress(p, msg):
            progress.update(ProcessingStage.ANALYZING_NARRATIVE, msg, p)

        clip_plans = select_clips(
            video_path=source_video,
            num_clips=config.clip.num_clips,
            min_clip_duration=config.clip.min_clip_duration,
            max_clip_duration=config.clip.max_clip_duration,
            segment_min_duration=config.clip.segment_min_duration,
            segment_max_duration=config.clip.segment_max_duration,
            progress_callback=analysis_progress,
        )

        if not clip_plans:
            raise ValueError("No emotional clips could be identified in the video")

        logger.info(f"Selected {len(clip_plans)} clips for extraction")
        progress.update(ProcessingStage.ANALYZING_NARRATIVE, "Emotion analysis complete", 1.0)

        # =============================================================
        # STEP 3: Extract clips using FFmpeg
        # =============================================================
        progress.update(ProcessingStage.EXTRACTING_CLIPS, "Starting clip extraction", 0.0)

        def extraction_progress(p, msg):
            progress.update(ProcessingStage.EXTRACTING_CLIPS, msg, p)

        results = extract_all_clips(
            source_video=source_video,
            clip_plans=clip_plans,
            output_dir=str(output_dir),
            generate_compiled=config.clip.generate_compiled,
            compiled_max_duration=config.clip.compiled_max_duration,
            progress_callback=extraction_progress,
        )

        if not results["clip_files"]:
            raise ValueError("No clips were successfully extracted")

        logger.info(f"Extracted {len(results['clip_files'])} clips successfully")

        # =============================================================
        # STEP 4: Compile video (already done in extract_all_clips)
        # =============================================================
        progress.update(ProcessingStage.COMPILING_VIDEO, "Compilation complete", 1.0)

        # =============================================================
        # STEP 5: Upload clips to S3
        # =============================================================
        if s3_bucket:
            progress.update(ProcessingStage.UPLOADING_TO_S3, "Uploading clips to S3", 0.0)

            total_uploads = len(results["clip_files"]) + (1 if results["compiled_file"] else 0) + 1

            for idx, clip_file in enumerate(results["clip_files"]):
                clip_filename = Path(clip_file).name
                s3_key = f"{s3_output_folder}/{clip_filename}"

                storage.upload_to_s3(clip_file, s3_key, content_type="video/mp4")

                clip_url = storage.get_cloudfront_url(s3_key)

                # Update clip results with S3 info
                for cr in results["clip_results"]:
                    if cr["fileName"] == clip_filename:
                        cr["s3Key"] = s3_key
                        cr["clipUrl"] = clip_url

                progress.update(
                    ProcessingStage.UPLOADING_TO_S3,
                    f"Uploaded {idx + 1}/{len(results['clip_files'])} clips",
                    (idx + 1) / total_uploads,
                )

            # Upload compiled video
            compiled_s3_key = None
            compiled_url = None
            if results["compiled_file"]:
                compiled_filename = Path(results["compiled_file"]).name
                compiled_s3_key = f"{s3_output_folder}/{compiled_filename}"
                storage.upload_to_s3(results["compiled_file"], compiled_s3_key, content_type="video/mp4")
                compiled_url = storage.get_cloudfront_url(compiled_s3_key)

                progress.update(
                    ProcessingStage.UPLOADING_TO_S3,
                    "Uploaded compiled video",
                    (len(results["clip_files"]) + 1) / total_uploads,
                )

            # Upload report
            report_s3_key = f"{s3_output_folder}/extraction_report.json"
            storage.upload_to_s3(results["report_path"], report_s3_key, content_type="application/json")

            progress.update(ProcessingStage.UPLOADING_TO_S3, "All uploads complete", 1.0)
        else:
            compiled_s3_key = None
            compiled_url = None
            report_s3_key = None
            logger.info("No S3 bucket configured, skipping upload")

        # =============================================================
        # DONE - Report completion
        # =============================================================
        elapsed = time.time() - start_time

        completion_details = {
            "projectId": project_id,
            "totalClips": len(results["clip_results"]),
            "clips": results["clip_results"],
            "compiledVideo": {
                "s3Key": compiled_s3_key,
                "clipUrl": compiled_url,
                "duration": results["report"]["compiledVideo"]["duration"] if results["report"].get("compiledVideo") else 0,
            } if config.clip.generate_compiled else None,
            "reportS3Key": report_s3_key,
            "totalTimeSeconds": round(elapsed, 2),
        }

        progress.complete(details=completion_details)

        logger.info("=" * 60)
        logger.info("CLIP EXTRACTION COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Clips extracted : {len(results['clip_files'])}")
        logger.info(f"Compiled video  : {'Yes' if results['compiled_file'] else 'No'}")
        logger.info(f"Total time      : {elapsed:.1f}s ({elapsed/60:.1f} min)")
        logger.info("=" * 60)

        # Print final result JSON to stdout (NestJS reads this)
        print(json.dumps(completion_details, indent=2))

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Clip extraction failed: {e}")
        progress.fail(str(e))
        sys.exit(1)

    finally:
        # Cleanup temp files
        try:
            storage.cleanup_temp(temp_dir)
        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")


if __name__ == "__main__":
    main()
