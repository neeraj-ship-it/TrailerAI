# TrailerAI - Setup Guide

## Project Structure

```
TrailerAI/
├── stage-admin/              # Frontend (Next.js) - port 3000
├── stage-nest-backend/       # Backend API (NestJS) - port 3020
├── trailer-narrative-ai/     # AI trailer generation (Python)
├── clip-extractor-ai/        # AI clip extraction (Python)
├── generate-trailer.sh       # Helper script to trigger trailer generation
└── test-trailer.sh           # Helper script to test trailer pipeline
```

## Prerequisites

Install these before starting:

| Tool | Version | Install Command |
|------|---------|-----------------|
| Node.js | **22.x** | `nvm install 22 && nvm use 22` |
| Yarn | 1.22+ | `npm install -g yarn` |
| Python | 3.11 | macOS: `brew install python@3.11` |
| FFmpeg | any | macOS: `brew install ffmpeg` / Ubuntu: `apt install ffmpeg` |
| Docker | any | [docker.com](https://www.docker.com/products/docker-desktop/) |

## Step 1: Start Databases (MongoDB + Redis)

The backend needs MongoDB and Redis running locally.

**Option A - Docker (recommended):**

```bash
# MongoDB
docker run -d --name stage-mongodb -p 27017:27017 mongo:7

# Redis
docker run -d --name stage-redis -p 6379:6379 redis:7
```

**Option B - Using the project's docker-compose:**

```bash
cd stage-nest-backend
docker compose -f docker-compose-mongo.yml up -d
```

**Option C - Install natively (macOS):**

```bash
brew install mongodb-community redis
brew services start mongodb-community
brew services start redis
```

## Step 2: Backend (NestJS)

```bash
cd stage-nest-backend

# Use Node 22
nvm use 22

# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# Start dev server (runs on port 3020)
yarn start:dev
```

Verify: Open http://localhost:3020 - you should get a response.

## Step 3: Frontend (Next.js)

```bash
cd stage-admin

# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# The default points to http://localhost:3020 (the backend)

# Start dev server (runs on port 3000)
yarn dev
```

Verify: Open http://localhost:3000 in your browser.

## Step 4: Python AI Engine (for trailer generation)

Only needed if you want to run the AI trailer/clip processing.

```bash
cd trailer-narrative-ai

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate    # macOS/Linux
# venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Defaults work as-is (uses free local models)
```

AI models (~2-5 GB) will auto-download on first run.

## Step 5: Clip Extractor (for clip extraction)

```bash
cd clip-extractor-ai

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running Order

Start services in this order:

1. **MongoDB + Redis** (Step 1)
2. **Backend** - `cd stage-nest-backend && yarn start:dev`
3. **Frontend** - `cd stage-admin && yarn dev`
4. Python AI engines only when needed for processing

## Key URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Clip Extractor UI | http://localhost:3000/clip-extractor |
| Backend API | http://localhost:3020 |

## System Requirements

- **RAM**: 8GB minimum (16GB+ recommended if running AI engine)
- **Disk**: ~10GB for dependencies, ~5GB+ for AI model caches
- **GPU**: Optional but recommended for AI processing (CUDA or Apple MPS)

## Notes

- **AWS keys** are only needed if uploading/downloading from S3. Without them, the web UI and API still work.
- **Analytics/Payment/SMS keys** are production-only. Leave blank for local dev.
- **Kafka** is disabled by default (`KAFKA_ENABLED=false`). Not needed locally.
- The AI engine uses free open-source models (Whisper, CLIP, Flan-T5, MusicGen) that auto-download from HuggingFace.

## Troubleshooting

- **Port already in use**: Kill the process with `lsof -i :PORT | grep LISTEN` then `kill PID`
- **MongoDB connection error**: Make sure MongoDB is running (`docker ps` or `brew services list`)
- **Node version error**: Backend requires Node 22.x exactly (`node --version` to check)
- **Python module not found**: Make sure your virtualenv is activated (`which python` should show the venv path)
