"""Visual analysis using CLIP and OpenCV."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Union, Dict, Any, Tuple
import numpy as np
from loguru import logger

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import torch
    from PIL import Image
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

try:
    import clip
    HAS_CLIP = True
except ImportError:
    HAS_CLIP = False


@dataclass
class FrameAnalysis:
    """Analysis of a single frame."""
    timestamp: float
    frame_number: int
    categories: Dict[str, float]  # Category -> confidence
    dominant_category: str
    brightness: float  # 0-1
    contrast: float  # 0-1
    motion_score: float  # 0-1 (if computed)
    faces_detected: int
    colors: List[Tuple[int, int, int]]  # Dominant colors (RGB)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "frame_number": self.frame_number,
            "categories": self.categories,
            "dominant_category": self.dominant_category,
            "brightness": self.brightness,
            "contrast": self.contrast,
            "motion_score": self.motion_score,
            "faces_detected": self.faces_detected,
            "colors": self.colors
        }


@dataclass
class SceneVisualAnalysis:
    """Visual analysis for a scene."""
    scene_id: str
    start_time: float
    end_time: float
    frames: List[FrameAnalysis]
    dominant_category: str
    average_brightness: float
    average_contrast: float
    motion_intensity: float
    face_presence: float  # 0-1 (percentage of frames with faces)
    visual_complexity: float  # 0-1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.end_time - self.start_time,
            "dominant_category": self.dominant_category,
            "average_brightness": self.average_brightness,
            "average_contrast": self.average_contrast,
            "motion_intensity": self.motion_intensity,
            "face_presence": self.face_presence,
            "visual_complexity": self.visual_complexity,
            "frame_count": len(self.frames)
        }


@dataclass
class VisualAnalysis:
    """Complete visual analysis result."""
    video_path: str
    scenes: List[SceneVisualAnalysis]
    total_frames_analyzed: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "video_path": self.video_path,
            "scene_count": len(self.scenes),
            "total_frames_analyzed": self.total_frames_analyzed,
            "scenes": [s.to_dict() for s in self.scenes]
        }


class VisualAnalyzer:
    """Analyze visual content of video frames."""

    # Scene categories for CLIP classification
    SCENE_CATEGORIES = [
        "action scene with fighting or explosions",
        "romantic scene with couple",
        "dramatic emotional scene",
        "comedy scene with humor",
        "chase scene with vehicles",
        "dialogue conversation scene",
        "establishing wide shot of location",
        "close-up shot of face",
        "crowd or group scene",
        "nature or landscape scene",
        "indoor scene",
        "night scene",
        "suspenseful tense scene"
    ]

    # Simplified categories for output
    CATEGORY_MAP = {
        "action scene with fighting or explosions": "action",
        "romantic scene with couple": "romantic",
        "dramatic emotional scene": "dramatic",
        "comedy scene with humor": "comedy",
        "chase scene with vehicles": "chase",
        "dialogue conversation scene": "dialogue",
        "establishing wide shot of location": "establishing",
        "close-up shot of face": "closeup",
        "crowd or group scene": "crowd",
        "nature or landscape scene": "nature",
        "indoor scene": "indoor",
        "night scene": "night",
        "suspenseful tense scene": "suspense"
    }

    def __init__(
        self,
        model_name: str = "ViT-B/32",
        device: Optional[str] = None,
        frames_per_scene: int = 5
    ):
        """Initialize visual analyzer.

        Args:
            model_name: CLIP model name
            device: Device for inference
            frames_per_scene: Number of frames to sample per scene
        """
        if not HAS_CV2:
            raise ImportError("OpenCV is required. Install with: pip install opencv-python")

        self.model_name = model_name
        self.frames_per_scene = frames_per_scene
        self._model = None
        self._preprocess = None

        # Auto-detect device (handles None, "auto", or explicit device)
        if device is None or device == "auto":
            self.device = self._detect_device()
        elif device == "cuda" and HAS_TORCH and not torch.cuda.is_available():
            # Requested cuda but not available, fall back to auto-detect
            from loguru import logger
            logger.warning("CUDA requested but not available, auto-detecting device")
            self.device = self._detect_device()
        else:
            self.device = device

        # Load face detector
        self._face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

    def _detect_device(self) -> str:
        """Auto-detect the best available device."""
        if not HAS_TORCH:
            return "cpu"

        if torch.cuda.is_available():
            return "cuda"

        # Mac Apple Silicon - use CPU for better CLIP compatibility
        # MPS can have issues with some models
        return "cpu"

    def _load_clip_model(self):
        """Load CLIP model."""
        if self._model is not None:
            return

        if not HAS_CLIP:
            logger.warning("CLIP not available, using basic analysis only")
            return

        logger.info(f"Loading CLIP model: {self.model_name}")
        self._model, self._preprocess = clip.load(self.model_name, device=self.device)

        # Pre-encode text categories
        text_tokens = clip.tokenize(self.SCENE_CATEGORIES).to(self.device)
        with torch.no_grad():
            self._text_features = self._model.encode_text(text_tokens)
            self._text_features /= self._text_features.norm(dim=-1, keepdim=True)

        logger.info("CLIP model loaded")

    def analyze_frame(self, frame: np.ndarray, timestamp: float, frame_number: int) -> FrameAnalysis:
        """Analyze a single frame.

        Args:
            frame: BGR frame from OpenCV
            timestamp: Frame timestamp in seconds
            frame_number: Frame number

        Returns:
            FrameAnalysis object
        """
        # Convert to grayscale for basic analysis
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Calculate brightness (mean intensity)
        brightness = np.mean(gray) / 255.0

        # Calculate contrast (standard deviation)
        contrast = np.std(gray) / 128.0
        contrast = min(1.0, contrast)

        # Detect faces
        faces = self._face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        faces_detected = len(faces)

        # Get dominant colors
        colors = self._get_dominant_colors(frame, n_colors=3)

        # CLIP classification
        categories = {}
        dominant_category = "unknown"

        if self._model is not None and HAS_CLIP:
            try:
                # Convert frame to PIL Image
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(frame_rgb)

                # Preprocess and encode
                image_input = self._preprocess(image).unsqueeze(0).to(self.device)

                with torch.no_grad():
                    image_features = self._model.encode_image(image_input)
                    image_features /= image_features.norm(dim=-1, keepdim=True)

                    # Calculate similarities
                    similarities = (image_features @ self._text_features.T).squeeze(0)
                    probs = similarities.softmax(dim=0).cpu().numpy()

                # Map to simplified categories
                for i, cat in enumerate(self.SCENE_CATEGORIES):
                    simple_cat = self.CATEGORY_MAP.get(cat, cat)
                    categories[simple_cat] = float(probs[i])

                # Get dominant category
                max_idx = np.argmax(probs)
                dominant_category = self.CATEGORY_MAP.get(
                    self.SCENE_CATEGORIES[max_idx],
                    self.SCENE_CATEGORIES[max_idx]
                )

            except Exception as e:
                logger.warning(f"CLIP analysis failed: {e}")

        return FrameAnalysis(
            timestamp=timestamp,
            frame_number=frame_number,
            categories=categories,
            dominant_category=dominant_category,
            brightness=brightness,
            contrast=contrast,
            motion_score=0.0,  # Will be computed separately
            faces_detected=faces_detected,
            colors=colors
        )

    def _get_dominant_colors(
        self,
        frame: np.ndarray,
        n_colors: int = 3
    ) -> List[Tuple[int, int, int]]:
        """Extract dominant colors from frame.

        Args:
            frame: BGR frame
            n_colors: Number of colors to extract

        Returns:
            List of RGB tuples
        """
        # Resize for faster processing
        small = cv2.resize(frame, (100, 100))
        pixels = small.reshape(-1, 3)

        # Simple k-means would be better, but using histogram for speed
        # Convert to RGB
        pixels_rgb = pixels[:, ::-1]

        # Quantize colors
        quantized = (pixels_rgb // 32) * 32

        # Find most common colors
        unique, counts = np.unique(quantized, axis=0, return_counts=True)
        top_indices = np.argsort(counts)[-n_colors:]

        colors = [tuple(int(c) for c in unique[i]) for i in top_indices[::-1]]
        return colors

    def compute_motion_score(
        self,
        prev_frame: np.ndarray,
        curr_frame: np.ndarray
    ) -> float:
        """Compute motion score between two frames.

        Args:
            prev_frame: Previous frame (BGR)
            curr_frame: Current frame (BGR)

        Returns:
            Motion score (0-1)
        """
        # Convert to grayscale
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

        # Compute absolute difference
        diff = cv2.absdiff(prev_gray, curr_gray)

        # Threshold
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

        # Calculate percentage of changed pixels
        motion_score = np.sum(thresh > 0) / thresh.size

        return min(1.0, motion_score * 5)  # Scale up and cap at 1

    def analyze_scene(
        self,
        video_path: Union[str, Path],
        scene_id: str,
        start_time: float,
        end_time: float
    ) -> SceneVisualAnalysis:
        """Analyze visual content of a scene.

        Args:
            video_path: Path to video file
            scene_id: Scene identifier
            start_time: Scene start time in seconds
            end_time: Scene end time in seconds

        Returns:
            SceneVisualAnalysis object
        """
        video_path = Path(video_path)
        cap = cv2.VideoCapture(str(video_path))

        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = end_time - start_time

        # Calculate frame timestamps to sample
        if duration <= 0:
            cap.release()
            return self._empty_scene_analysis(scene_id, start_time, end_time)

        # Sample frames evenly across the scene
        sample_times = np.linspace(start_time, end_time, self.frames_per_scene + 2)[1:-1]

        frames = []
        prev_frame = None

        for timestamp in sample_times:
            # Seek to timestamp
            cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
            ret, frame = cap.read()

            if not ret:
                continue

            frame_number = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
            analysis = self.analyze_frame(frame, timestamp, frame_number)

            # Compute motion if we have previous frame
            if prev_frame is not None:
                analysis.motion_score = self.compute_motion_score(prev_frame, frame)

            frames.append(analysis)
            prev_frame = frame.copy()

        cap.release()

        if not frames:
            return self._empty_scene_analysis(scene_id, start_time, end_time)

        # Aggregate analysis
        return self._aggregate_scene_analysis(scene_id, start_time, end_time, frames)

    def _empty_scene_analysis(
        self,
        scene_id: str,
        start_time: float,
        end_time: float
    ) -> SceneVisualAnalysis:
        """Create empty scene analysis."""
        return SceneVisualAnalysis(
            scene_id=scene_id,
            start_time=start_time,
            end_time=end_time,
            frames=[],
            dominant_category="unknown",
            average_brightness=0.5,
            average_contrast=0.5,
            motion_intensity=0.0,
            face_presence=0.0,
            visual_complexity=0.5
        )

    def _aggregate_scene_analysis(
        self,
        scene_id: str,
        start_time: float,
        end_time: float,
        frames: List[FrameAnalysis]
    ) -> SceneVisualAnalysis:
        """Aggregate frame analyses into scene analysis."""
        # Average metrics
        avg_brightness = np.mean([f.brightness for f in frames])
        avg_contrast = np.mean([f.contrast for f in frames])
        motion_intensity = np.mean([f.motion_score for f in frames])

        # Face presence
        frames_with_faces = sum(1 for f in frames if f.faces_detected > 0)
        face_presence = frames_with_faces / len(frames)

        # Dominant category (most common)
        category_counts = {}
        for frame in frames:
            cat = frame.dominant_category
            category_counts[cat] = category_counts.get(cat, 0) + 1

        dominant_category = max(category_counts, key=category_counts.get)

        # Visual complexity (combination of contrast, motion, and color diversity)
        visual_complexity = (avg_contrast + motion_intensity) / 2

        return SceneVisualAnalysis(
            scene_id=scene_id,
            start_time=start_time,
            end_time=end_time,
            frames=frames,
            dominant_category=dominant_category,
            average_brightness=float(avg_brightness),
            average_contrast=float(avg_contrast),
            motion_intensity=float(motion_intensity),
            face_presence=float(face_presence),
            visual_complexity=float(visual_complexity)
        )

    def analyze_video(
        self,
        video_path: Union[str, Path],
        scenes: List[Dict[str, Any]],
        show_progress: bool = True
    ) -> VisualAnalysis:
        """Analyze visual content of entire video.

        Args:
            video_path: Path to video file
            scenes: List of scenes with start_time, end_time, and id
            show_progress: Show progress

        Returns:
            VisualAnalysis object
        """
        video_path = Path(video_path)
        logger.info(f"Analyzing visual content: {video_path}")

        # Load CLIP model
        self._load_clip_model()

        scene_analyses = []
        total_frames = 0

        for i, scene in enumerate(scenes):
            if show_progress and i % 10 == 0:
                logger.info(f"Analyzing scene {i+1}/{len(scenes)}")

            analysis = self.analyze_scene(
                video_path,
                scene.get("id", f"scene_{i}"),
                scene.get("start_time", 0),
                scene.get("end_time", 0)
            )
            scene_analyses.append(analysis)
            total_frames += len(analysis.frames)

        logger.info(f"Visual analysis complete: {len(scene_analyses)} scenes, {total_frames} frames")

        return VisualAnalysis(
            video_path=str(video_path),
            scenes=scene_analyses,
            total_frames_analyzed=total_frames
        )
