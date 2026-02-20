# Trailer Narrative AI - Production Docker Configuration
# Version: 3.0.0
#
# Build: docker build -t trailer-narrative-ai .
# Run:   docker run -v /path/to/input:/app/input -v /path/to/output:/app/output trailer-narrative-ai /app/input/movie.mp4

FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Build arguments
ARG WHISPER_MODEL=medium
ARG LLM_MODEL=google/flan-t5-large

# Labels
LABEL maintainer="Stage Tech"
LABEL version="3.0.0"
LABEL description="Production-ready trailer generation from movies using AI"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Pre-download Whisper model (for faster startup)
RUN python3 -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

# Pre-download LLM model (for faster startup)
RUN python3 -c "from transformers import AutoModelForSeq2SeqLM, AutoTokenizer; \
    AutoTokenizer.from_pretrained('${LLM_MODEL}'); \
    AutoModelForSeq2SeqLM.from_pretrained('${LLM_MODEL}')"

# Copy application code
COPY . .

# Create directories
RUN mkdir -p /app/output /app/input /tmp/trailer-narrative-ai

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Device configuration (auto-detected)
ENV WHISPER_DEVICE=cuda
ENV VISUAL_DEVICE=cuda
ENV LLM_DEVICE=cuda

# LLM configuration
ENV USE_LLM=true
ENV LLM_MODEL=${LLM_MODEL}

# Processing configuration
ENV ASR_CHUNKED=false
ENV MAX_WORKERS=2

# Production settings
ENV ENVIRONMENT=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import torch; print('GPU available:', torch.cuda.is_available())" || exit 1

# Entry point
ENTRYPOINT ["python3", "main.py"]
