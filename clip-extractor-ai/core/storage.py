"""Storage handling - HTTP video download + S3 clip upload."""

import os
import shutil
import time
from pathlib import Path
from typing import Optional, Union, Callable
from loguru import logger

import requests

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

from config import get_config
from config.constants import (
    VIDEO_DOWNLOAD_CONNECT_TIMEOUT,
    VIDEO_DOWNLOAD_READ_TIMEOUT,
    VIDEO_DOWNLOAD_CHUNK_SIZE,
    VIDEO_DOWNLOAD_MAX_RETRIES,
    VIDEO_DOWNLOAD_RETRY_WAIT,
)


class S3ProgressCallback:
    """Progress callback for S3 transfers."""

    def __init__(self, total_size: int, callback: Callable[[float], None], operation: str = "Transferring"):
        self.total_size = total_size
        self.callback = callback
        self.operation = operation
        self.transferred = 0
        self.last_percent = -1

    def __call__(self, bytes_transferred: int):
        self.transferred += bytes_transferred
        if self.total_size > 0:
            progress = self.transferred / self.total_size
            percent = int(progress * 100)
            if percent != self.last_percent:
                self.last_percent = percent
                if percent % 10 == 0:
                    logger.debug(f"{self.operation}: {percent}% ({self.transferred / (1024*1024):.1f} MB)")
                self.callback(progress)


class StorageHandler:
    """Handle video download from URL and clip upload to S3."""

    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None,
    ):
        config = get_config()
        self.bucket = bucket or config.s3.bucket
        self.region = region or config.s3.region
        self._s3_client = None

    @property
    def s3_client(self):
        """Lazy-load S3 client."""
        if self._s3_client is None and HAS_BOTO3:
            config = get_config()
            kwargs = {
                "service_name": "s3",
                "region_name": self.region,
            }
            if config.s3.access_key and config.s3.secret_key:
                kwargs["aws_access_key_id"] = config.s3.access_key
                kwargs["aws_secret_access_key"] = config.s3.secret_key
            self._s3_client = boto3.client(**kwargs)
        return self._s3_client

    def download_video_from_url(
        self,
        video_url: str,
        local_path: Union[str, Path],
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> Path:
        """Download video from public URL with progress tracking and retry/resume.

        Supports resuming partial downloads using HTTP Range headers.
        Retries on timeout or connection errors.

        Args:
            video_url: Public video URL (CMS link)
            local_path: Local destination path
            progress_callback: Function to call with progress (0.0-1.0)

        Returns:
            Path to downloaded video file
        """
        local_path = Path(local_path)
        local_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Downloading video from URL: {video_url}")
        logger.info(f"Saving to: {local_path}")

        timeout = (VIDEO_DOWNLOAD_CONNECT_TIMEOUT, VIDEO_DOWNLOAD_READ_TIMEOUT)

        # First, get the total size with a HEAD request
        total_size = 0
        supports_range = False
        try:
            head_resp = requests.head(
                video_url,
                timeout=timeout,
                headers={"User-Agent": "ClipExtractorAI/1.0"},
                allow_redirects=True,
            )
            total_size = int(head_resp.headers.get("content-length", 0))
            accept_ranges = head_resp.headers.get("accept-ranges", "none")
            supports_range = accept_ranges.lower() != "none"
            if total_size > 0:
                logger.info(f"Video size: {total_size / (1024*1024):.1f} MB")
            if supports_range:
                logger.info("Server supports Range requests - resume enabled")
        except Exception as e:
            logger.warning(f"HEAD request failed, will try direct download: {e}")

        for attempt in range(1, VIDEO_DOWNLOAD_MAX_RETRIES + 1):
            try:
                downloaded = 0
                headers = {"User-Agent": "ClipExtractorAI/1.0"}

                # Check for partial download to resume
                if supports_range and local_path.exists():
                    existing_size = local_path.stat().st_size
                    if existing_size > 0 and total_size > 0 and existing_size < total_size:
                        downloaded = existing_size
                        headers["Range"] = f"bytes={existing_size}-"
                        logger.info(
                            f"Resuming download from {existing_size / (1024*1024):.1f} MB "
                            f"({existing_size * 100 // total_size}%)"
                        )

                response = requests.get(
                    video_url,
                    stream=True,
                    timeout=timeout,
                    headers=headers,
                )
                response.raise_for_status()

                # If server doesn't return content-length in GET, use HEAD value
                if total_size == 0:
                    total_size = int(response.headers.get("content-length", 0))
                    if total_size > 0:
                        logger.info(f"Video size: {total_size / (1024*1024):.1f} MB")

                # Open in append mode if resuming, else write mode
                mode = "ab" if downloaded > 0 else "wb"

                with open(local_path, mode) as f:
                    for chunk in response.iter_content(chunk_size=VIDEO_DOWNLOAD_CHUNK_SIZE):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)

                            if total_size > 0 and progress_callback:
                                progress = downloaded / total_size
                                progress_callback(min(1.0, progress))

                actual_size = local_path.stat().st_size
                logger.info(f"Download complete: {actual_size / (1024*1024):.1f} MB")

                if progress_callback:
                    progress_callback(1.0)

                return local_path

            except requests.exceptions.HTTPError as e:
                # HTTP errors like 404, 403 should not be retried
                logger.error(f"HTTP error downloading video: {e}")
                raise

            except Exception as e:
                # Catch ALL errors during download (ConnectionError, Timeout,
                # ChunkedEncodingError, IncompleteRead, socket errors, etc.)
                downloaded_so_far = local_path.stat().st_size if local_path.exists() else 0
                logger.warning(
                    f"Download attempt {attempt}/{VIDEO_DOWNLOAD_MAX_RETRIES} failed "
                    f"({downloaded_so_far / (1024*1024):.1f} MB downloaded so far): {e}"
                )
                if attempt < VIDEO_DOWNLOAD_MAX_RETRIES:
                    wait_time = VIDEO_DOWNLOAD_RETRY_WAIT * attempt
                    logger.info(f"Retrying in {wait_time}s (will resume if server supports Range)...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Download failed after {VIDEO_DOWNLOAD_MAX_RETRIES} attempts")
                    raise

    def upload_to_s3(
        self,
        local_path: Union[str, Path],
        s3_key: str,
        bucket: Optional[str] = None,
        content_type: Optional[str] = None,
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> str:
        """Upload file to S3 with progress tracking.

        Args:
            local_path: Local file path
            s3_key: S3 object key
            bucket: Override bucket name
            content_type: MIME type
            progress_callback: Function to call with progress (0.0-1.0)

        Returns:
            S3 URI of uploaded file
        """
        if not HAS_BOTO3:
            raise ImportError("boto3 is required for S3 operations")

        bucket = bucket or self.bucket
        local_path = Path(local_path)

        logger.info(f"Uploading {local_path} to s3://{bucket}/{s3_key}")

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        callback = None
        if progress_callback:
            try:
                file_size = local_path.stat().st_size
                if file_size > 0:
                    callback = S3ProgressCallback(file_size, progress_callback, "Uploading")
            except Exception:
                pass

        try:
            self.s3_client.upload_file(
                str(local_path),
                bucket,
                s3_key,
                ExtraArgs=extra_args if extra_args else None,
                Callback=callback,
            )
            s3_uri = f"s3://{bucket}/{s3_key}"
            logger.info(f"Uploaded successfully: {s3_uri}")
            return s3_uri
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise

    def get_cloudfront_url(self, s3_key: str) -> str:
        """Generate CloudFront URL for an S3 key.

        Args:
            s3_key: S3 object key

        Returns:
            CloudFront URL string
        """
        config = get_config()
        cf_url = config.s3.cloudfront_url.rstrip("/")
        if cf_url:
            return f"{cf_url}/{s3_key}"
        # Fallback to S3 URL
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{s3_key}"

    def cleanup_temp(self, temp_dir: Union[str, Path]) -> None:
        """Clean up temporary directory."""
        temp_dir = Path(temp_dir)
        if temp_dir.exists():
            logger.info(f"Cleaning up: {temp_dir}")
            shutil.rmtree(temp_dir)
