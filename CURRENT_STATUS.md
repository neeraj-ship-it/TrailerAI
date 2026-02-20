# TrailerAI - Current Status & Usage Guide

**Last Updated:** 2026-02-03
**Status:** ✅ All servers running, UI functional

---

## System Overview

TrailerAI consists of 3 components:

1. **Frontend (Next.js)** - `stage-admin/` - Port 3001
2. **Backend (NestJS)** - `stage-nest-backend/` - Port 3020
3. **AI Engine (Python)** - `trailer-narrative-ai/`

---

## Current Status

### ✅ Working Components

- Frontend UI at http://localhost:3001
- Backend API at http://localhost:3020
- Multi-genre selection (up to 3 genres)
- Drag & drop video upload interface
- Professional screenplay preview with shot-by-shot breakdown
- Script editing in both Visual and JSON formats

### ⚠️ Known Limitations

The web interface currently shows **sample/demo screenplays** only. For real video analysis with actual scenes, dialogues, and timecodes from your uploaded movie, use the Python backend directly (see Method 2 below).

---

## How to Use TrailerAI

### Method 1: Web Interface (Demo/Preview Mode)

**Use this to:** Preview the UI and screenplay format

```bash
# 1. Start frontend (if not running)
cd stage-admin
yarn dev

# 2. Visit http://localhost:3001
# 3. Fill in the form:
#    - Project ID: any unique identifier
#    - Movie Title: your movie name
#    - Upload video OR enter Raw Media ID
#    - Select up to 3 genres
#    - Language and duration
# 4. Click "Generate Script"
# 5. Review the screenplay (sample data for now)
# 6. Edit if needed and click "Generate Trailer"
```

**Note:** Currently generates sample screenplay. Real analysis requires Method 2.

---

### Method 2: Python Backend (Real Analysis) ⭐ **RECOMMENDED**

**Use this to:** Get actual scene analysis, dialogues, and timecodes from your video

```bash
# 1. Navigate to AI engine
cd trailer-narrative-ai

# 2. Activate virtual environment
source venv/bin/activate

# 3. Run analysis (replace VIDEO_PATH with your actual file)
python main.py '{
  "projectId": "my-movie-'$(date +%s)'",
  "localFilePath": "/path/to/your/movie.mp4",
  "contentMetadata": {
    "title": "Your Movie Title",
    "genre": "action-drama",
    "language": "hindi",
    "targetDuration": 90
  },
  "narrativeStyles": ["dramatic", "action"],
  "outputOptions": {
    "generateTrailerVideos": false
  }
}'

# 4. Check results in: output/<projectId>/
```

**Using the test script:**

```bash
# Edit test-trailer.sh and set VIDEO_PATH
nano test-trailer.sh

# Run it
bash test-trailer.sh
```

---

## Server Management

### Check if servers are running:
```bash
ps aux | grep -E "nest start|next dev" | grep -v grep
```

### Start Frontend:
```bash
cd stage-admin
yarn dev
# Runs on http://localhost:3001
```

### Start Backend:
```bash
cd stage-nest-backend
nvm use 22  # Important: Use Node 22.x
yarn start:dev
# Runs on http://localhost:3020
```

### Stop servers:
```bash
# Find process IDs
ps aux | grep -E "nest start|next dev" | grep -v grep

# Kill by PID
kill <PID>
```

---

## Understanding the Output

### Screenplay Format

The generated screenplay includes:

- **Shot Number**: Sequential number for each shot
- **Timecode**: When the shot appears (HH:MM:SS)
- **Duration**: How long the shot lasts
- **Visual Description**: What's happening on screen
- **Dialogue**: Actual lines from the movie (if any)
- **Music**: Background music cues
- **Sound Effects**: Audio elements
- **Transition**: How shots connect (cuts, fades, etc.)

### Example Output Location

```
trailer-narrative-ai/output/
└── your-project-id/
    ├── narrative_report.json     # Full analysis
    ├── trailer_cuts.json         # Edit decision list
    ├── dramatic/                 # Per-style outputs
    │   └── trailer_plan.json
    └── action/
        └── trailer_plan.json
```

---

## Configuration

### Narrative Styles

Currently set to 2 styles (faster generation):
- `dramatic`
- `action`

To change: Edit `trailer-narrative-ai/config/config.py` line 152-155

### Available Genres

Frontend supports: Dramatic, Action, Emotional, Mystery, Comedy, Thriller, Romance, Horror, Crime

Backend styles: Dramatic, Action, Romantic, Suspenseful, Comedic, Horror, Epic, Character-Driven

---

## Troubleshooting

### Issue: "Node version mismatch"
```bash
nvm use 22
cd stage-nest-backend
yarn start:dev
```

### Issue: "Port already in use"
```bash
# Find and kill process using the port
lsof -ti:3001 | xargs kill  # Frontend
lsof -ti:3020 | xargs kill  # Backend
```

### Issue: "Python dependencies missing"
```bash
cd trailer-narrative-ai
pip install -r requirements.txt
```

### Issue: "Analysis taking too long"
- Expected: 2-5 minutes for full-length movie
- Check: `output/<projectId>/` for partial results
- Reduce: Target duration or number of narrative styles

---

## Next Steps to Fix Full Integration

To enable real video analysis through the web interface, the following needs to be implemented:

1. **Complete S3 Upload Flow**
   - Fix multipart upload completion
   - Handle upload progress reporting correctly
   - Store bucket/filePath metadata

2. **Create RawMedia Record**
   - Generate rawMediaId after successful upload
   - Link to TrailerProject

3. **Connect to Python Backend**
   - Backend should invoke Python script
   - Poll for completion
   - Fetch and parse narrative_report.json
   - Convert to screenplay format

**Estimated effort:** 4-6 hours

---

## Quick Reference

| Component | Port | URL | Command |
|-----------|------|-----|---------|
| Frontend | 3001 | http://localhost:3001 | `cd stage-admin && yarn dev` |
| Backend | 3020 | http://localhost:3020 | `cd stage-nest-backend && yarn start:dev` |
| Python | - | - | `cd trailer-narrative-ai && source venv/bin/activate` |

**For Production Use:** Use Method 2 (Python Backend Direct)
**For UI/UX Testing:** Use Method 1 (Web Interface)

---

## Recent Changes

- ✅ Reduced narrative styles from 8 to 2 (faster generation)
- ✅ Simplified UI to show only trailer generator
- ✅ Added multi-genre selection (max 3)
- ✅ Added drag & drop video upload UI
- ✅ Changed script format from generic acts to shot-by-shot screenplay
- ✅ Created professional screenplay preview with visual/dialogue/music breakdown
- ⚠️ Simplified upload to demo mode (real integration in progress)

---

## File Locations

```
TrailerAI/
├── stage-admin/                    # Next.js Frontend
│   └── src/screens/trailer/Trailer.tsx  # Main UI component
├── stage-nest-backend/             # NestJS Backend
│   └── src/cms/services/trailer.service.ts
├── trailer-narrative-ai/           # Python AI Engine
│   ├── main.py                     # Entry point
│   ├── config/config.py            # Configuration
│   └── output/                     # Generated trailers
└── test-trailer.sh                 # Quick test script
```

---

For questions or issues, check the logs:
- Frontend: `/tmp/admin.log`
- Backend: Check terminal where `yarn start:dev` is running
