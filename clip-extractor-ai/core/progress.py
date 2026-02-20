"""Progress reporting for Clip Extractor AI."""

import time
import sys
import threading
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, Callable
from loguru import logger

import requests

from config.constants import (
    PROGRESS_STATUS_INITIATED,
    PROGRESS_STATUS_PROGRESS,
    PROGRESS_STATUS_COMPLETE,
    PROGRESS_STATUS_FAILED,
    PROGRESS_UPDATE_MIN_INTERVAL,
    PROGRESS_UPDATE_PERCENT_THRESHOLD,
    PROGRESS_UPDATE_MILESTONES,
    PROGRESS_UPDATE_TIMEOUT,
)


class ProcessingStage(Enum):
    """Processing stage enumeration."""
    INITIATED = "initiated"
    DOWNLOADING_VIDEO = "downloading-video"
    ANALYZING_NARRATIVE = "analyzing-narrative"
    EXTRACTING_CLIPS = "extracting-clips"
    COMPILING_VIDEO = "compiling-video"
    UPLOADING_TO_S3 = "uploading-to-s3"
    COMPLETE = "complete"
    FAILED = "failed"


# Progress weights: maps each stage to (start_percent, end_percent)
# Download gets large range since big files take the most time
STAGE_WEIGHTS = {
    ProcessingStage.INITIATED: (0, 1),
    ProcessingStage.DOWNLOADING_VIDEO: (1, 40),
    ProcessingStage.ANALYZING_NARRATIVE: (40, 50),
    ProcessingStage.EXTRACTING_CLIPS: (50, 80),
    ProcessingStage.COMPILING_VIDEO: (80, 90),
    ProcessingStage.UPLOADING_TO_S3: (90, 100),
    ProcessingStage.COMPLETE: (100, 100),
    ProcessingStage.FAILED: (0, 0),
}


@dataclass
class ProgressUpdate:
    """Progress update data structure."""
    stage: ProcessingStage
    progress: float  # 0-100
    message: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API calls."""
        return {
            "stage": self.stage.value,
            "progress": round(self.progress, 2),
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details,
        }


class ProgressReporter:
    """Report processing progress to NestJS backend via webhook."""

    def __init__(
        self,
        project_id: str,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
    ):
        self.project_id = project_id
        self.base_url = base_url
        self.token = token
        self._start_time = time.time()
        self._current_stage = ProcessingStage.INITIATED
        self._last_sent_percent = -1
        self._last_sent_time = 0.0
        self._lock = threading.Lock()

    def _calculate_progress(
        self, stage: ProcessingStage, stage_progress: float = 0.0
    ) -> float:
        """Calculate overall progress percentage.

        Args:
            stage: Current processing stage
            stage_progress: Progress within current stage (0.0-1.0)

        Returns:
            Overall progress percentage (0-100)
        """
        start, end = STAGE_WEIGHTS.get(stage, (0, 0))
        return start + (end - start) * min(1.0, max(0.0, stage_progress))

    def _should_send(self, progress: float) -> bool:
        """Check if we should send this update (throttling)."""
        now = time.time()

        # Always send milestones
        rounded = round(progress)
        if rounded in PROGRESS_UPDATE_MILESTONES:
            return True

        # Check time and percent thresholds
        time_diff = now - self._last_sent_time
        percent_diff = abs(progress - self._last_sent_percent)

        if time_diff >= PROGRESS_UPDATE_MIN_INTERVAL and percent_diff >= PROGRESS_UPDATE_PERCENT_THRESHOLD:
            return True

        return False

    def _send_update(self, update: ProgressUpdate) -> None:
        """Send progress update to NestJS backend."""
        if not self.base_url:
            return

        url = f"{self.base_url.rstrip('/')}/{self.project_id}"
        headers = {"Content-Type": "application/json"}

        if self.token:
            headers["x-internal-api-secret"] = self.token

        payload = {
            "projectId": self.project_id,
            "status": self._map_status(update.stage),
            "progressStage": update.stage.value,
            "progress": round(update.progress),
            "message": update.message,
            "details": update.details,
        }

        try:
            response = requests.post(
                url, json=payload, headers=headers,
                timeout=PROGRESS_UPDATE_TIMEOUT,
            )
            response.raise_for_status()
            logger.debug(f"Progress sent: {update.progress:.1f}% - {update.stage.value}")
        except requests.RequestException as e:
            logger.warning(f"Failed to send progress update: {e}")

    def _map_status(self, stage: ProcessingStage) -> str:
        """Map stage to NestJS status string."""
        if stage == ProcessingStage.INITIATED:
            return PROGRESS_STATUS_INITIATED
        elif stage == ProcessingStage.COMPLETE:
            return PROGRESS_STATUS_COMPLETE
        elif stage == ProcessingStage.FAILED:
            return PROGRESS_STATUS_FAILED
        else:
            return PROGRESS_STATUS_PROGRESS

    def update(
        self,
        stage: ProcessingStage,
        message: str,
        stage_progress: float = 0.0,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Send a progress update.

        Args:
            stage: Current processing stage
            message: Human-readable message
            stage_progress: Progress within current stage (0.0-1.0)
            details: Additional details
        """
        with self._lock:
            stage_changed = stage != self._current_stage
            self._current_stage = stage
            progress = self._calculate_progress(stage, stage_progress)

            # Always send when stage changes; otherwise throttle
            if not stage_changed and not self._should_send(progress):
                return

            update = ProgressUpdate(
                stage=stage,
                progress=progress,
                message=message,
                details=details or {},
            )

            # Log locally
            logger.info(f"[{progress:.1f}%] {stage.value}: {message}")

            # Print console progress
            self._print_progress(progress, stage, message)

            # Send to API
            self._send_update(update)

            self._last_sent_percent = progress
            self._last_sent_time = time.time()

    def _print_progress(self, progress: float, stage: ProcessingStage, message: str):
        """Print progress bar to console."""
        width = 30
        filled = int(width * progress / 100)
        bar = "█" * filled + "░" * (width - filled)
        sys.stdout.write(f"\r   |{bar}| {progress:5.1f}% - {stage.value}: {message}")
        sys.stdout.flush()
        if progress >= 100:
            print()

    def start(self) -> None:
        """Mark processing as started."""
        self._start_time = time.time()
        self.update(ProcessingStage.INITIATED, "Clip extraction started", 1.0)

    def complete(self, details: Optional[Dict[str, Any]] = None) -> None:
        """Mark processing as complete."""
        elapsed = time.time() - self._start_time
        self._last_sent_percent = -1  # Force send
        self.update(
            ProcessingStage.COMPLETE,
            f"Clip extraction complete in {elapsed:.1f}s",
            1.0,
            details={"total_time_seconds": round(elapsed, 2), **(details or {})},
        )

    def fail(self, error: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Mark processing as failed."""
        elapsed = time.time() - self._start_time
        self._last_sent_percent = -1  # Force send
        self.update(
            ProcessingStage.FAILED,
            f"Clip extraction failed: {error}",
            0.0,
            details={"error": error, "elapsed_seconds": round(elapsed, 2), **(details or {})},
        )
