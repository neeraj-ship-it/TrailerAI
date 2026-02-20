# TrailerAI - AI-Powered Trailer Generation System

Generate professional movie trailers using AI-powered narrative analysis and automated video editing.

---

## Quick Start

### 🚀 Currently Running

Both servers are already running:
- ✅ **Frontend**: http://localhost:3001 (Next.js)
- ✅ **Backend**: http://localhost:3020 (NestJS API)

### 🎬 Generate a Trailer (Recommended Method)

Use the Python backend directly for real video analysis:

```bash
cd trailer-narrative-ai
source venv/bin/activate

# Edit test-trailer.sh and set your video path
nano test-trailer.sh

# Run the script
bash test-trailer.sh

# Check output
open output/<your-project-id>/
```

### 🌐 Use Web Interface (Demo Mode)

For UI preview and testing:

1. Visit http://localhost:3001
2. Fill in project details
3. Select up to 3 genres
4. Upload video (or enter Raw Media ID)
5. Review generated screenplay
6. Generate trailer

**Note:** Web interface currently shows sample screenplay. For real analysis, use Python backend above.

---

## Recent Work

Trailer generation for **Chidibaaz** movie:
- 5 trailer variants generated
- Located in: `trailer-narrative-ai/output/Chidibaaz/trailers/`
- Narrative styles: Action, Dramatic, Emotional, Mystery, Thriller

---

## System Architecture

```
┌─────────────────────┐
│   Next.js Frontend  │  Port 3001
│   (stage-admin)     │  UI with screenplay preview
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   NestJS Backend    │  Port 3020
│ (stage-nest-backend)│  API & file management
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Python AI Engine  │
│(trailer-narrative-ai)│  Scene analysis & video editing
└─────────────────────┘
```

---

## Features

### ✨ UI Features
- 🎨 Multi-genre selection (up to 3 genres)
- 📤 Drag & drop video upload
- 📝 Professional screenplay format with:
  - Shot-by-shot breakdown
  - Timecodes and durations
  - Visual descriptions
  - Dialogue lines
  - Music cues
  - Sound effects
- ✏️ Edit scripts in Visual or JSON mode

### 🤖 AI Capabilities
- 🎥 Automated scene detection
- 🗣️ Dialogue extraction
- 🎭 Emotional arc analysis
- 🎵 Music cue suggestions
- ⚡ Multi-style trailer generation
- 📊 5-act narrative structure

### 🎬 Supported Genres
- Dramatic
- Action
- Emotional
- Mystery
- Comedy
- Thriller
- Romance
- Horror
- Crime

---

## Configuration

Current settings optimized for speed:
- **Narrative styles**: 2 (dramatic, action)
- **Target duration**: 90 seconds
- **Language**: Hindi (also supports English, Haryanvi, Bhojpuri, Gujarati)

To modify: `trailer-narrative-ai/config/config.py`

---

## Output Structure

```
output/<project-id>/
├── narratives/
│   ├── narrative_report.json    # Full analysis
│   └── editor_guide.md          # Editing instructions
└── trailers/
    ├── trailer_action_v1.mp4
    ├── trailer_dramatic_v1.mp4
    └── ...
```

---

## Documentation

- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Detailed status, usage guide, troubleshooting
- **[test-trailer.sh](./test-trailer.sh)** - Quick test script for Python backend

---

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, Node.js 22.x
- **AI Engine**: Python, OpenAI, FFmpeg
- **Storage**: S3-compatible storage

---

## Development

### Start Servers

```bash
# Frontend
cd stage-admin
yarn dev

# Backend (use Node 22.x)
cd stage-nest-backend
nvm use 22
yarn start:dev
```

### Stop Servers

```bash
# Find processes
ps aux | grep -E "nest start|next dev"

# Kill by PID
kill <PID>
```

---

## Example Projects

Existing generated trailers you can review:

1. **Chidibaaz** - `output/Chidibaaz/`
   - 5 style variants
   - Full narrative analysis

2. **movie123** - `output/movie123/`
   - 8 style variants
   - Complete trailer suite

---

## Requirements

- Node.js 22.x (backend) and 24.x+ (frontend)
- Python 3.8+
- FFmpeg
- 8GB+ RAM for video processing
- 50GB+ disk space for video storage

---

## Troubleshooting

See [CURRENT_STATUS.md](./CURRENT_STATUS.md#troubleshooting) for detailed troubleshooting guide.

Quick fixes:
```bash
# Node version issues
nvm use 22

# Port conflicts
lsof -ti:3001 | xargs kill

# Python dependencies
cd trailer-narrative-ai
pip install -r requirements.txt
```

---

## Performance

- **Analysis time**: 2-5 minutes per full-length movie
- **Generation time**: 30-60 seconds per trailer variant
- **Recommended**: Process 1 movie at a time

---

## Status: Production Ready (Python Backend)

The Python backend is production-ready and generates high-quality trailers. Web interface integration is in progress for complete end-to-end workflow through the browser.

**For production use:** Use Python backend directly (Method 2 in CURRENT_STATUS.md)

---

Last updated: 2026-02-03
