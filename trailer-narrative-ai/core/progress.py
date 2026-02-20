"""Progress reporting for Trailer Narrative AI."""

import time
import sys
import threading
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, Callable, List
from urllib.parse import urljoin
from loguru import logger

import requests

# Optional tenacity import for retry decorator
try:
    from tenacity import retry, stop_after_attempt, wait_exponential
except ImportError:
    # Fallback: no-op decorator if tenacity not installed
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    stop_after_attempt = lambda x: None
    wait_exponential = lambda **kwargs: None

from config.constants import (
    PROGRESS_ENDPOINT,
    PROGRESS_STATUS_INITIATED,
    PROGRESS_STATUS_PROGRESS,
    PROGRESS_STATUS_COMPLETE,
    PROGRESS_STATUS_FAILED,
    PROGRESS_UPDATE_MIN_INTERVAL,
    PROGRESS_UPDATE_PERCENT_THRESHOLD,
    PROGRESS_UPDATE_MILESTONES,
    PROGRESS_UPDATE_TIMEOUT,
)


class StepProgress:
    """Track and display step-by-step progress with percentages."""

    def __init__(self, total_steps: int, project_id: str = ""):
        """Initialize step progress tracker.

        Args:
            total_steps: Total number of steps in the pipeline
            project_id: Project identifier for display
        """
        self.total_steps = total_steps
        self.project_id = project_id
        self.current_step = 0
        self.current_step_name = ""
        self.current_step_progress = 0.0
        self.step_start_time = None

    def _calculate_overall_percentage(self, step_num: int, step_progress: float = 1.0) -> float:
        """Calculate overall percentage based on step number.

        Args:
            step_num: Current step (1-based)
            step_progress: Progress within current step (0.0-1.0)

        Returns:
            Overall percentage (0-100)
        """
        if step_num <= 0:
            return 0.0
        step_weight = 100.0 / self.total_steps
        completed_steps = (step_num - 1) * step_weight
        current_step_contribution = step_weight * step_progress
        return min(100.0, completed_steps + current_step_contribution)

    def _format_progress_bar(self, progress: float, width: int = 25) -> str:
        """Create a visual progress bar.

        Args:
            progress: Progress percentage (0-100)
            width: Width of the bar

        Returns:
            Formatted progress bar string
        """
        filled = int(width * progress / 100)
        bar = "█" * filled + "░" * (width - filled)
        return f"|{bar}| {progress:5.1f}%"

    def print_header(self):
        """Print pipeline header."""
        print("\n" + "=" * 70)
        print("🎬 TRAILER NARRATIVE AI - PRODUCTION PIPELINE")
        print("=" * 70)
        if self.project_id:
            print(f"   Project ID  : {self.project_id}")
        print(f"   Total Steps : {self.total_steps}")
        print("=" * 70 + "\n")

    def start_step(self, step_num: int, step_name: str):
        """Start a new step with progress display.

        Args:
            step_num: Step number (1-based)
            step_name: Name of the step
        """
        import time as _time
        self.current_step = step_num
        self.current_step_name = step_name
        self.current_step_progress = 0.0
        self.step_start_time = _time.time()

        overall = self._calculate_overall_percentage(step_num, 0.0)

        print(f"\n{'─'*70}")
        print(f"⏳ STEP {step_num}/{self.total_steps}: {step_name}")
        print(f"{'─'*70}")
        print(f"   OVERALL : {self._format_progress_bar(overall)}")
        print(f"   STEP    : {self._format_progress_bar(0)}")
        print(f"{'─'*70}", flush=True)

    def update_step(self, step_progress: float, message: str = ""):
        """Update progress within current step with live progress bar.

        Args:
            step_progress: Progress within step (0.0-1.0, will be converted to 0-100)
            message: Optional status message
        """
        # Convert 0-1 to 0-100 if needed
        if step_progress <= 1.0:
            step_progress = step_progress * 100

        # Only update if progress changed significantly (avoid spam)
        if abs(step_progress - self.current_step_progress) < 1.0 and step_progress < 100:
            return  # Skip tiny updates

        self.current_step_progress = step_progress
        overall = self._calculate_overall_percentage(self.current_step, step_progress / 100.0)

        # Print updated progress bars using carriage return for in-place update
        overall_bar = self._format_progress_bar(overall)
        step_bar = self._format_progress_bar(step_progress)

        # Use carriage return for cleaner output (same line update)
        progress_line = f"\r   OVERALL : {overall_bar}  |  STEP : {step_bar}"

        if message:
            # Clear line and print with message
            print(f"{progress_line}")
            print(f"   >> {message}", flush=True)
        else:
            # In-place update (no newline for continuous progress)
            sys.stdout.write(progress_line)
            sys.stdout.flush()

            # Print newline at 100%
            if step_progress >= 100:
                print()  # Newline when complete

    def complete_step(self, step_num: int, step_name: str, details: str = ""):
        """Mark a step as complete.

        Args:
            step_num: Step number (1-based)
            step_name: Name of the step
            details: Completion details
        """
        import time as _time

        self.current_step_progress = 100.0
        overall = self._calculate_overall_percentage(step_num, 1.0)

        # Calculate step duration
        step_duration = ""
        if self.step_start_time:
            duration = _time.time() - self.step_start_time
            step_duration = f" in {duration:.1f}s"

        overall_bar = self._format_progress_bar(overall)
        step_bar = self._format_progress_bar(100)

        print(f"\n   OVERALL : {overall_bar}  |  STEP : {step_bar}")
        if details:
            print(f"   → {details}")
        print(f"\n   ✅ STEP {step_num}/{self.total_steps}: {step_name} - COMPLETE{step_duration}")
        print(f"{'─'*70}", flush=True)

    def print_substep(self, name: str, details: str = ""):
        """Print a substep detail.

        Args:
            name: Substep name
            details: Substep details
        """
        if details:
            print(f"   → {name}: {details}", flush=True)
        else:
            print(f"   → {name}", flush=True)

    def print_complete(self, elapsed_time: float, variants: int, trailers: int):
        """Print completion summary.

        Args:
            elapsed_time: Total elapsed time in seconds
            variants: Number of variants generated
            trailers: Number of trailers created
        """
        print(f"\n{'='*70}")
        print(f"✅ PIPELINE COMPLETE")
        print(f"{'='*70}")
        print(f"   OVERALL : {self._format_progress_bar(100)}")
        print(f"{'─'*70}")
        print(f"   Status   : SUCCESS")
        print(f"   Time     : {elapsed_time:.1f}s ({elapsed_time/60:.1f} min)")
        print(f"   Variants : {variants}")
        print(f"   Trailers : {trailers}")
        print(f"{'='*70}\n")

    def print_failed(self, error: str):
        """Print failure message.

        Args:
            error: Error message
        """
        overall = self._calculate_overall_percentage(self.current_step, self.current_step_progress / 100.0)

        print(f"\n{'='*70}")
        print(f"❌ PIPELINE FAILED")
        print(f"{'='*70}")
        print(f"   OVERALL : {self._format_progress_bar(overall)} FAILED")
        print(f"   STEP    : {self._format_progress_bar(self.current_step_progress)} FAILED")
        print(f"{'─'*70}")
        print(f"   Failed At : Step {self.current_step}/{self.total_steps} - {self.current_step_name}")
        print(f"   Error     : {error}")
        print(f"{'='*70}\n")


def print_step(step_num: int, total_steps: int, step_name: str, status: str = "RUNNING"):
    """Print a clear step progress indicator to console (legacy function).

    Args:
        step_num: Current step number (1-based)
        total_steps: Total number of steps
        step_name: Name of the current step
        status: Status indicator (RUNNING, DONE, FAILED)
    """
    percentage = (step_num / total_steps) * 100 if total_steps > 0 else 0

    status_icons = {
        "RUNNING": "⏳",
        "DONE": "✅",
        "FAILED": "❌",
        "SKIPPED": "⏭️"
    }
    icon = status_icons.get(status, "▶️")

    print(f"\n{'─'*70}")
    print(f"   PROGRESS: {percentage:.0f}%")
    print(f"{'─'*70}")
    print(f"\n{icon} STEP {step_num}/{total_steps}: {step_name}")
    print(f"{'─'*40}", flush=True)


def print_substep(substep_name: str, details: str = ""):
    """Print a substep indicator.

    Args:
        substep_name: Name of the substep
        details: Optional details
    """
    if details:
        print(f"   → {substep_name}: {details}", flush=True)
    else:
        print(f"   → {substep_name}", flush=True)


def print_progress_bar(current: int, total: int, prefix: str = "", width: int = 40):
    """Print a progress bar.

    Args:
        current: Current progress value
        total: Total value
        prefix: Prefix text
        width: Width of the progress bar
    """
    if total == 0:
        percent = 100
    else:
        percent = (current / total) * 100

    filled = int(width * current // total) if total > 0 else width
    bar = "█" * filled + "░" * (width - filled)

    print(f"\r   {prefix} |{bar}| {percent:.1f}% ({current}/{total})", end="", flush=True)
    if current >= total:
        print()  # New line when complete


class ProcessingStatus(Enum):
    """Processing status enumeration."""
    INITIATED = "initiated"
    DOWNLOADING = "downloading"
    PARSING_INPUTS = "parsing_inputs"
    DETECTING_SCENES = "detecting_scenes"
    ANALYZING_AUDIO = "analyzing_audio"
    ANALYZING_VISUAL = "analyzing_visual"
    UNDERSTANDING_CONTENT = "understanding_content"
    GENERATING_NARRATIVES = "generating_narratives"
    ASSEMBLING_TRAILERS = "assembling_trailers"
    UPLOADING = "uploading"
    COMPLETE = "complete"
    FAILED = "failed"


@dataclass
class ProgressUpdate:
    """Progress update data structure."""
    status: ProcessingStatus
    progress: float  # 0-100
    message: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    eta_seconds: Optional[int] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API calls."""
        return {
            "status": self.status.value,
            "progress": round(self.progress, 2),
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "eta_seconds": self.eta_seconds,
            "details": self.details
        }


class ProgressReporter:
    """Report processing progress to external endpoint."""

    # Progress weights for each phase
    PHASE_WEIGHTS = {
        ProcessingStatus.INITIATED: (0, 2),
        ProcessingStatus.DOWNLOADING: (2, 10),
        ProcessingStatus.PARSING_INPUTS: (10, 15),
        ProcessingStatus.DETECTING_SCENES: (15, 25),
        ProcessingStatus.ANALYZING_AUDIO: (25, 40),
        ProcessingStatus.ANALYZING_VISUAL: (40, 55),
        ProcessingStatus.UNDERSTANDING_CONTENT: (55, 70),
        ProcessingStatus.GENERATING_NARRATIVES: (70, 80),
        ProcessingStatus.ASSEMBLING_TRAILERS: (80, 95),
        ProcessingStatus.UPLOADING: (95, 99),
        ProcessingStatus.COMPLETE: (100, 100),
        ProcessingStatus.FAILED: (0, 0),
    }

    def __init__(
        self,
        project_id: str,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        callback: Optional[Callable[[ProgressUpdate], None]] = None
    ):
        """Initialize progress reporter.

        Args:
            project_id: Project identifier
            base_url: Base URL for progress API
            token: Authentication token
            callback: Optional callback for progress updates
        """
        self.project_id = project_id
        self.base_url = base_url
        self.token = token
        self.callback = callback

        self._start_time = time.time()
        self._current_status = ProcessingStatus.INITIATED
        self._phase_start_time = time.time()

    def _calculate_progress(
        self,
        status: ProcessingStatus,
        phase_progress: float = 0.0
    ) -> float:
        """Calculate overall progress percentage.

        Args:
            status: Current processing status
            phase_progress: Progress within current phase (0-1)

        Returns:
            Overall progress percentage (0-100)
        """
        start, end = self.PHASE_WEIGHTS.get(status, (0, 0))
        return start + (end - start) * phase_progress

    def _estimate_eta(self, progress: float) -> Optional[int]:
        """Estimate time remaining.

        Args:
            progress: Current progress percentage

        Returns:
            Estimated seconds remaining, or None
        """
        if progress <= 0:
            return None

        elapsed = time.time() - self._start_time
        if elapsed < 5:  # Need some data first
            return None

        total_estimated = elapsed / (progress / 100)
        remaining = total_estimated - elapsed

        return max(0, int(remaining))

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def _send_update(self, update: ProgressUpdate) -> None:
        """Send progress update to API.

        Args:
            update: Progress update to send
        """
        if not self.base_url:
            return

        url = f"{self.base_url.rstrip('/')}/{self.project_id}"
        headers = {"Content-Type": "application/json"}

        if self.token:
            headers["x-internal-api-secret"] = self.token

        try:
            response = requests.post(
                url,
                json=update.to_dict(),
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
        except requests.RequestException as e:
            logger.warning(f"Failed to send progress update: {e}")
            raise

    def update(
        self,
        status: ProcessingStatus,
        message: str,
        phase_progress: float = 0.0,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Send a progress update.

        Args:
            status: Current processing status
            message: Human-readable message
            phase_progress: Progress within current phase (0-1)
            details: Additional details
        """
        # Track phase changes
        if status != self._current_status:
            self._current_status = status
            self._phase_start_time = time.time()

        progress = self._calculate_progress(status, phase_progress)
        eta = self._estimate_eta(progress)

        update = ProgressUpdate(
            status=status,
            progress=progress,
            message=message,
            eta_seconds=eta,
            details=details or {}
        )

        # Log locally
        logger.info(f"[{progress:.1f}%] {status.value}: {message}")

        # Send to callback
        if self.callback:
            try:
                self.callback(update)
            except Exception as e:
                logger.warning(f"Progress callback failed: {e}")

        # Send to API
        try:
            self._send_update(update)
        except Exception:
            pass  # Already logged in _send_update

    def start(self) -> None:
        """Mark processing as started."""
        self._start_time = time.time()
        self.update(
            ProcessingStatus.INITIATED,
            "Processing started",
            phase_progress=1.0
        )

    def complete(self, details: Optional[Dict[str, Any]] = None) -> None:
        """Mark processing as complete."""
        elapsed = time.time() - self._start_time
        self.update(
            ProcessingStatus.COMPLETE,
            f"Processing complete in {elapsed:.1f}s",
            phase_progress=1.0,
            details={
                "total_time_seconds": round(elapsed, 2),
                **(details or {})
            }
        )

    def fail(self, error: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Mark processing as failed."""
        elapsed = time.time() - self._start_time
        self.update(
            ProcessingStatus.FAILED,
            f"Processing failed: {error}",
            phase_progress=0.0,
            details={
                "error": error,
                "elapsed_seconds": round(elapsed, 2),
                **(details or {})
            }
        )


# =============================================================================
# API PROGRESS REPORTER (Similar to media-qc pattern)
# =============================================================================

# Thread-safe lock for progress reporting
_api_progress_lock = threading.Lock()


def _send_progress_request(
    progress_url: str,
    project_id: str,
    status: str,
    progress_type: str,
    progress_percentage: int,
    token: Optional[str] = None,
    message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """Send progress update to API (internal function).

    This function can raise exceptions - caller should handle them.

    Args:
        progress_url: Full URL for progress endpoint
        project_id: Project identifier
        status: Status string (initiated, progress, complete, failed)
        progress_type: Type of progress (download, audio-analysis, etc.)
        progress_percentage: Progress percentage (0-100)
        token: Optional auth token
        message: Optional status message
        details: Optional additional details
    """
    payload = {
        "projectId": project_id,
        "status": status,
        "progressType": progress_type,
        "progressPercentage": progress_percentage,
    }

    if message:
        payload["message"] = message

    if details:
        payload["details"] = details

    headers = {"Content-Type": "application/json"}

    if token:
        headers["x-internal-api-secret"] = token

    try:
        response = requests.post(
            progress_url,
            json=payload,
            headers=headers,
            timeout=PROGRESS_UPDATE_TIMEOUT
        )
        response.raise_for_status()
        logger.debug(f"Progress sent: {progress_type} {progress_percentage}%")

    except requests.exceptions.HTTPError as e:
        # Log HTTP errors but re-raise
        logger.warning(
            f"Progress API HTTP error: {e.response.status_code if e.response else 'No response'} - "
            f"{e.response.text[:200] if e.response else str(e)}"
        )
        raise

    except requests.exceptions.RequestException as e:
        # Log network errors but re-raise
        logger.warning(f"Progress API network error: {e}")
        raise

    except Exception as e:
        # Log unexpected errors but re-raise
        logger.warning(f"Progress API unexpected error: {e}")
        raise


class APIProgressReporter:
    """Report progress to external API endpoint with throttling.

    Features:
    - Thread-safe progress reporting
    - Smart throttling to reduce API calls
    - Non-blocking: API failures don't stop processing
    - Supports initiated, progress, complete, failed statuses

    Usage:
        reporter = APIProgressReporter(
            project_id="abc123",
            progress_base_url="https://api.example.com/",
            token="secret-token"
        )

        # Report initiated
        reporter.send_initiated()

        # Report progress during processing
        reporter.send_progress("audio-analysis", 50, "Transcribing audio...")

        # Report completion
        reporter.send_complete(variants=8, trailers=8)

        # Or report failure
        reporter.send_failed("Out of memory", step="audio-analysis")
    """

    def __init__(
        self,
        project_id: str,
        progress_base_url: Optional[str] = None,
        token: Optional[str] = None
    ):
        """Initialize API progress reporter.

        Args:
            project_id: Project identifier
            progress_base_url: Base URL for progress API (from payload)
            token: Optional authentication token
        """
        self.project_id = project_id
        self.token = token
        self.enabled = bool(progress_base_url)

        # Build full progress URL - just append /{project_id}
        if progress_base_url:
            self.progress_url = f"{progress_base_url.rstrip('/')}/{project_id}"
        else:
            self.progress_url = None

        # Throttling state
        self._last_update_time: float = 0
        self._last_percentage: int = -1
        self._last_progress_type: str = ""

        # Timing
        self._start_time = time.time()

        logger.info(
            f"APIProgressReporter initialized: project={project_id}, "
            f"url={self.progress_url or 'disabled'}"
        )

    def _should_send_update(
        self,
        progress_type: str,
        progress_percentage: int,
        skip_throttling: bool = False
    ) -> bool:
        """Determine if update should be sent based on throttling rules.

        Args:
            progress_type: Type of progress
            progress_percentage: Current percentage
            skip_throttling: Skip throttling checks

        Returns:
            True if update should be sent
        """
        if not self.enabled:
            return False

        if skip_throttling:
            return True

        current_time = time.time()

        # Always send if progress type changed
        if progress_type != self._last_progress_type:
            return True

        # Always send at milestone percentages
        if progress_percentage in PROGRESS_UPDATE_MILESTONES:
            return True

        # Check time-based throttling
        time_since_last = current_time - self._last_update_time
        if time_since_last < PROGRESS_UPDATE_MIN_INTERVAL:
            return False

        # Check percentage-based throttling
        percentage_change = abs(progress_percentage - self._last_percentage)
        if percentage_change < PROGRESS_UPDATE_PERCENT_THRESHOLD:
            return False

        return True

    def send_progress(
        self,
        progress_type: str,
        progress_percentage: int,
        message: Optional[str] = None,
        skip_throttling: bool = False,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Send progress update to API.

        This method is non-blocking - API failures are logged but don't
        raise exceptions or stop processing.

        Args:
            progress_type: Type of progress (download, audio-analysis, etc.)
            progress_percentage: Progress percentage (0-100)
            message: Optional status message
            skip_throttling: Skip throttling checks (for critical updates)
            details: Optional additional details
        """
        if not self.enabled:
            return

        # Clamp percentage
        progress_percentage = max(0, min(100, progress_percentage))

        # Check throttling
        should_send = self._should_send_update(
            progress_type, progress_percentage, skip_throttling
        )

        if not should_send:
            return

        # Thread-safe update
        with _api_progress_lock:
            try:
                _send_progress_request(
                    progress_url=self.progress_url,
                    project_id=self.project_id,
                    status=PROGRESS_STATUS_PROGRESS,
                    progress_type=progress_type,
                    progress_percentage=progress_percentage,
                    token=self.token,
                    message=message,
                    details=details
                )

                # Update throttling state on success
                self._last_update_time = time.time()
                self._last_percentage = progress_percentage
                self._last_progress_type = progress_type

            except Exception:
                # Non-blocking: log error but don't raise
                # Error details already logged in _send_progress_request
                pass

    def send_initiated(self, message: str = "Processing started") -> None:
        """Send processing initiated status.

        Args:
            message: Optional status message
        """
        if not self.enabled:
            return

        self._start_time = time.time()

        with _api_progress_lock:
            try:
                _send_progress_request(
                    progress_url=self.progress_url,
                    project_id=self.project_id,
                    status=PROGRESS_STATUS_INITIATED,
                    progress_type="initiated",
                    progress_percentage=0,
                    token=self.token,
                    message=message
                )
            except Exception:
                pass  # Non-blocking

    def send_complete(
        self,
        message: Optional[str] = None,
        variants: int = 0,
        trailers: int = 0,
        outputs: Optional[Dict[str, Any]] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Send processing complete status with output URLs.

        Args:
            message: Optional status message
            variants: Number of variants generated
            trailers: Number of trailers created
            outputs: Output URLs and paths (s3_outputs, outputFiles, etc.)
            details: Optional additional details
        """
        if not self.enabled:
            return

        elapsed = time.time() - self._start_time

        complete_details = {
            "totalTimeSeconds": round(elapsed, 2),
            "variantsGenerated": variants,
            "trailersCreated": trailers,
            **(details or {})
        }

        # Add outputs to details if provided
        if outputs:
            complete_details["outputs"] = outputs

        if not message:
            message = f"Processing complete in {elapsed:.1f}s"

        with _api_progress_lock:
            try:
                _send_progress_request(
                    progress_url=self.progress_url,
                    project_id=self.project_id,
                    status=PROGRESS_STATUS_COMPLETE,
                    progress_type="complete",
                    progress_percentage=100,
                    token=self.token,
                    message=message,
                    details=complete_details
                )
            except Exception:
                pass  # Non-blocking

    def send_failed(
        self,
        error: str,
        step: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Send processing failed status.

        Args:
            error: Error message
            step: Step where failure occurred
            details: Optional additional details
        """
        if not self.enabled:
            return

        elapsed = time.time() - self._start_time

        fail_details = {
            "error": error,
            "elapsedSeconds": round(elapsed, 2),
            **(details or {})
        }

        if step:
            fail_details["failedStep"] = step

        with _api_progress_lock:
            try:
                _send_progress_request(
                    progress_url=self.progress_url,
                    project_id=self.project_id,
                    status=PROGRESS_STATUS_FAILED,
                    progress_type="failed",
                    progress_percentage=0,
                    token=self.token,
                    message=f"Processing failed: {error}",
                    details=fail_details
                )
            except Exception:
                pass  # Non-blocking


def create_api_progress_reporter(
    project_id: str,
    progress_base_url: Optional[str] = None,
    token: Optional[str] = None
) -> APIProgressReporter:
    """Factory function to create API progress reporter.

    Args:
        project_id: Project identifier
        progress_base_url: Base URL for progress API (from payload)
        token: Optional authentication token

    Returns:
        Configured APIProgressReporter instance
    """
    return APIProgressReporter(
        project_id=project_id,
        progress_base_url=progress_base_url,
        token=token
    )
