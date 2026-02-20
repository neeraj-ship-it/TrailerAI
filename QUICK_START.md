# 🎬 TrailerAI - Quick Start Guide

## ⚡ One-Command Trailer Generation

```bash
cd ~/Desktop/TrailerAI/trailer-narrative-ai && \
source venv/bin/activate && \
python main.py '{
  "projectId": "my-movie-'$(date +%s)'",
  "localFilePath": "/PATH/TO/YOUR/VIDEO.mp4",
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
```

**⚠️ Remember to replace `/PATH/TO/YOUR/VIDEO.mp4` with your actual video file path!**

---

## 📍 Current Status

Both servers are running:
- **Frontend**: http://localhost:3001 (Demo UI)
- **Backend**: http://localhost:3020 (API)

---

## 🎯 Three Ways to Use TrailerAI

### Option 1: Python Backend (⭐ BEST for Real Analysis)

```bash
# Quick way using test script
cd ~/Desktop/TrailerAI
nano test-trailer.sh  # Edit VIDEO_PATH
bash test-trailer.sh

# Check results
cd trailer-narrative-ai/output/<project-id>/
```

**Pros:** ✅ Real scene analysis, ✅ Actual dialogues, ✅ Precise timecodes
**Cons:** ❌ Terminal only, ❌ Manual file path entry

---

### Option 2: Web Interface (Good for UI/Preview)

1. Visit http://localhost:3001
2. Fill form (Project ID, Title, Genres)
3. Upload video or enter Raw Media ID
4. Click "Generate Script"
5. Review & edit screenplay
6. Click "Generate Trailer"

**Pros:** ✅ Beautiful UI, ✅ Easy to use, ✅ Visual screenplay editor
**Cons:** ⚠️ Currently shows sample screenplay only

---

### Option 3: Hybrid (Coming Soon)

Web interface → Real backend analysis → Visual editing → Generate trailer

**Status:** In development (upload integration needed)

---

## 📂 Where to Find Generated Trailers

```bash
cd ~/Desktop/TrailerAI/trailer-narrative-ai/output/

# Your projects will be here:
output/
├── Chidibaaz/          # Example: 5 trailer variants
│   ├── narratives/
│   │   └── narrative_report.json
│   └── trailers/
│       ├── trailer_action_v1.mp4
│       └── trailer_dramatic_v1.mp4
└── <your-project-id>/
```

---

## 🎨 Genre Selection Guide

Choose up to 3 genres that best describe your movie:

| Genre | Best For | Example Movies |
|-------|----------|----------------|
| **Dramatic** | Emotional depth, character arcs | The Godfather |
| **Action** | Fight scenes, chases, stunts | Mad Max |
| **Thriller** | Suspense, mystery, tension | Inception |
| **Comedy** | Humor, lighthearted moments | Superbad |
| **Romance** | Love stories, relationships | The Notebook |
| **Horror** | Scary, supernatural | The Conjuring |
| **Mystery** | Whodunit, puzzles | Knives Out |
| **Crime** | Heists, investigations | Heat |
| **Emotional** | Tearjerker, heartfelt | Up |

**Examples:**
- Action + Thriller + Drama = "Mission: Impossible"
- Comedy + Romance = "Crazy, Stupid, Love"
- Horror + Mystery + Thriller = "The Silence of the Lambs"

---

## ⏱️ Expected Processing Times

| Stage | Time |
|-------|------|
| Scene Detection | 30-60 sec |
| Dialogue Extraction | 1-2 min |
| Narrative Analysis | 1-2 min |
| Trailer Generation | 30-60 sec per variant |
| **Total** | **3-6 minutes** |

For a 90-second trailer from a 90-minute movie.

---

## 🔧 Quick Fixes

### "Command not found: python"
```bash
cd ~/Desktop/TrailerAI/trailer-narrative-ai
source venv/bin/activate
```

### "Port 3001 already in use"
```bash
lsof -ti:3001 | xargs kill
```

### "Node version incompatible"
```bash
nvm use 22
cd ~/Desktop/TrailerAI/stage-nest-backend
yarn start:dev
```

### "Video file not found"
```bash
# Make sure path is absolute, not relative
# ✅ Good: /Users/you/Movies/movie.mp4
# ❌ Bad: ~/Movies/movie.mp4 or ./movie.mp4
```

---

## 📊 Sample Output Structure

After generation, you'll get:

```
📁 output/<project-id>/
├── 📁 narratives/
│   ├── 📄 narrative_report.json     # Full AI analysis
│   └── 📝 editor_guide.md           # How to edit
└── 📁 trailers/
    ├── 🎥 trailer_dramatic_v1.mp4   # Dramatic version
    ├── 🎥 trailer_action_v1.mp4     # Action version
    └── 🎥 trailer_emotional_v1.mp4  # Emotional version
```

**narrative_report.json** contains:
- Scene-by-scene breakdown
- Character analysis
- Emotional arc mapping
- Dialogue transcripts
- Music cues
- Edit suggestions

---

## 💡 Pro Tips

1. **Genre Selection**: Choose genres that match your trailer goal, not necessarily the movie itself
   - Movie is drama, but want exciting trailer? Choose Action + Thriller

2. **Target Duration**:
   - 60s: Social media, YouTube pre-roll
   - 90s: Theater, streaming platform
   - 120s: Festival, extended cut

3. **Language Support**:
   - Hindi, English, Haryanvi, Bhojpuri, Gujarati
   - Affects subtitle generation and voiceover planning

4. **Faster Processing**:
   - Use fewer narrative styles (2 instead of 8)
   - Reduce target duration (60s instead of 120s)
   - Process shorter movies first to test

5. **Best Results**:
   - High-quality source video (1080p+)
   - Clear audio for dialogue extraction
   - Movies with strong narrative structure

---

## 🚦 Current Workflow Status

| Feature | Status | Notes |
|---------|--------|-------|
| Python Backend | ✅ Working | Production ready |
| Scene Analysis | ✅ Working | Real video processing |
| Dialogue Extract | ✅ Working | Automated transcription |
| Trailer Generation | ✅ Working | Multiple variants |
| Web UI | ✅ Working | Beautiful interface |
| Web Upload | ⚠️ Demo | Shows sample screenplay |
| Full Integration | 🔄 In Progress | End-to-end web workflow |

---

## 📞 Need Help?

1. Check **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** for detailed docs
2. Check **[README.md](./README.md)** for architecture overview
3. Look at existing outputs: `output/Chidibaaz/` or `output/movie123/`
4. Check logs: `/tmp/admin.log` (frontend) or backend terminal

---

## 🎯 Most Common Use Case

**"I want to generate a trailer from my video file"**

```bash
# 1. Go to AI engine
cd ~/Desktop/TrailerAI/trailer-narrative-ai
source venv/bin/activate

# 2. Run with your video
python main.py '{
  "projectId": "test-'$(date +%s)'",
  "localFilePath": "/Users/you/Movies/your-movie.mp4",
  "contentMetadata": {
    "title": "Your Movie Name",
    "genre": "action",
    "language": "hindi",
    "targetDuration": 90
  },
  "narrativeStyles": ["dramatic", "action"],
  "outputOptions": {"generateTrailerVideos": false}
}'

# 3. Wait 3-5 minutes

# 4. Check output/test-*/trailers/
```

**That's it!** 🎉

---

Last updated: 2026-02-03
Version: 1.0 (Python Backend Stable)
