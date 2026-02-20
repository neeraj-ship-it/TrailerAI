"""Storage handling for S3 and local files."""

import os
import shutil
from pathlib import Path
from typing import Optional, Union, Callable
from loguru import logger

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

from config import get_config


class S3ProgressCallback:
    """Progress callback for S3 transfers."""

    def __init__(self, total_size: int, callback: Callable[[float], None], operation: str = "Transferring"):
        """Initialize progress callback.

        Args:
            total_size: Total file size in bytes
            callback: Function to call with progress (0.0-1.0)
            operation: Operation name for logging
        """
        self.total_size = total_size
        self.callback = callback
        self.operation = operation
        self.transferred = 0
        self.last_percent = -1

    def __call__(self, bytes_transferred: int):
        """Called by boto3 with bytes transferred."""
        self.transferred += bytes_transferred
        if self.total_size > 0:
            progress = self.transferred / self.total_size
            percent = int(progress * 100)
            # Only call callback when percentage changes (avoid too many updates)
            if percent != self.last_percent:
                self.last_percent = percent
                # Log every 10% for visibility
                if percent % 10 == 0:
                    logger.debug(f"{self.operation}: {percent}% ({self.transferred / (1024*1024):.1f} MB)")
                self.callback(progress)


class StorageHandler:
    """Handle file storage operations for S3 and local filesystem."""

    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None
    ):
        """Initialize storage handler.

        Args:
            bucket: S3 bucket name (optional, uses config default)
            region: AWS region (optional, uses config default)
        """
        config = get_config()
        self.bucket = bucket or config.s3.bucket
        self.region = region or config.s3.region
        self._s3_client = None

    @property
    def s3_client(self):
        """Lazy-load S3 client."""
        if self._s3_client is None and HAS_BOTO3:
            config = get_config()
            self._s3_client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=config.s3.access_key,
                aws_secret_access_key=config.s3.secret_key
            )
        return self._s3_client

    def download_from_s3(
        self,
        s3_key: str,
        local_path: Union[str, Path],
        bucket: Optional[str] = None,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> Path:
        """Download file from S3 with progress tracking.

        Args:
            s3_key: S3 object key
            local_path: Local destination path
            bucket: Override bucket name
            progress_callback: Function to call with progress (0.0-1.0)

        Returns:
            Path to downloaded file
        """
        if not HAS_BOTO3:
            raise ImportError("boto3 is required for S3 operations")

        bucket = bucket or self.bucket
        local_path = Path(local_path)
        local_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Downloading s3://{bucket}/{s3_key} to {local_path}")

        try:
            # Get file size for progress tracking
            callback = None
            if progress_callback:
                try:
                    response = self.s3_client.head_object(Bucket=bucket, Key=s3_key)
                    file_size = response.get('ContentLength', 0)
                    logger.info(f"S3 file size: {file_size / (1024*1024):.1f} MB")
                    if file_size > 0:
                        callback = S3ProgressCallback(file_size, progress_callback, "Downloading")
                        logger.info("Progress tracking enabled for S3 download")
                    else:
                        logger.warning("Could not get file size - progress tracking disabled")
                except Exception as e:
                    logger.warning(f"Could not get S3 file size for progress: {e}")
                    # Still continue download, just without progress

            self.s3_client.download_file(
                bucket, s3_key, str(local_path),
                Callback=callback
            )
            logger.info(f"Downloaded successfully: {local_path}")
            return local_path
        except ClientError as e:
            logger.error(f"Failed to download from S3: {e}")
            raise

    def upload_to_s3(
        self,
        local_path: Union[str, Path],
        s3_key: str,
        bucket: Optional[str] = None,
        content_type: Optional[str] = None,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """Upload file to S3 with progress tracking.

        Args:
            local_path: Local file path
            s3_key: S3 object key
            bucket: Override bucket name
            content_type: MIME type for the file
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
            extra_args['ContentType'] = content_type

        # Get file size for progress tracking
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
                Callback=callback
            )
            s3_uri = f"s3://{bucket}/{s3_key}"
            logger.info(f"Uploaded successfully: {s3_uri}")
            return s3_uri
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise

    def get_presigned_url(
        self,
        s3_key: str,
        bucket: Optional[str] = None,
        expiration: int = 3600
    ) -> str:
        """Generate presigned URL for S3 object.

        Args:
            s3_key: S3 object key
            bucket: Override bucket name
            expiration: URL expiration time in seconds

        Returns:
            Presigned URL
        """
        if not HAS_BOTO3:
            raise ImportError("boto3 is required for S3 operations")

        bucket = bucket or self.bucket

        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise

    def copy_local(
        self,
        source: Union[str, Path],
        destination: Union[str, Path]
    ) -> Path:
        """Copy file locally.

        Args:
            source: Source file path
            destination: Destination file path

        Returns:
            Path to copied file
        """
        source = Path(source)
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Copying {source} to {destination}")
        shutil.copy2(source, destination)

        return destination

    def ensure_local(
        self,
        s3_key: Optional[str] = None,
        local_path: Optional[Union[str, Path]] = None,
        bucket: Optional[str] = None,
        temp_dir: Optional[Union[str, Path]] = None,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> Path:
        """Ensure file is available locally (download if needed).

        Args:
            s3_key: S3 object key (optional)
            local_path: Local file path (optional)
            bucket: Override bucket name
            temp_dir: Temporary directory for downloads
            progress_callback: Function to call with progress (0.0-1.0)

        Returns:
            Path to local file
        """
        # Prefer local path if provided and exists
        if local_path:
            local_path = Path(local_path)
            if local_path.exists():
                file_size = local_path.stat().st_size
                logger.info(f"Using local file: {local_path} ({file_size / (1024*1024):.1f} MB)")
                if progress_callback:
                    logger.info("Local file - no download needed (100% complete)")
                    progress_callback(1.0)  # Immediately complete
                return local_path

        # Download from S3 if key provided
        if s3_key:
            config = get_config()
            temp_dir = Path(temp_dir or config.assembly.temp_dir)
            temp_dir.mkdir(parents=True, exist_ok=True)

            filename = Path(s3_key).name
            download_path = temp_dir / filename

            return self.download_from_s3(s3_key, download_path, bucket, progress_callback)

        raise ValueError("Either s3_key or local_path must be provided")

    def cleanup_temp(self, temp_dir: Union[str, Path]) -> None:
        """Clean up temporary directory.

        Args:
            temp_dir: Directory to clean up
        """
        temp_dir = Path(temp_dir)
        if temp_dir.exists():
            logger.info(f"Cleaning up: {temp_dir}")
            shutil.rmtree(temp_dir)
