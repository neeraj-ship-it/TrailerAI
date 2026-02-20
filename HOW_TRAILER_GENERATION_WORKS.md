# Trailer Generation - Complete Technical Explanation

**Date:** 2026-02-05
**Question:** Music kaha se? Shots kaise? Dialogues kaise? Storyline kaise?

---

## 🎬 STEP-BY-STEP: Kaise Kaam Kar Raha Hai

### INPUT: User Video Upload Karta Hai
```
User → Uploads: /path/to/movie.mp4 (2 hours full movie)
```

---

## STEP 1: AUDIO ANALYSIS (Dialogues Nikalna)

### Technology: **Whisper ASR (OpenAI)**
- **ASR** = Automatic Speech Recognition
- Video ke audio ko text mein convert karta hai
- **Indian Dialect Support** - Hindi, Haryanvi, Bhojpuri samajhta hai

### Kaise Kaam Karta Hai:
```python
# File: analysis/indian_asr.py
class IndianDialectASR:
    def transcribe(self, video_path):
        # 1. Video se audio extract karo (ffmpeg use karke)
        audio_file = extract_audio(video_path)

        # 2. Whisper model load karo
        model = whisper.load_model("medium")  # or "large-v3"

        # 3. Audio ko transcribe karo
        result = model.transcribe(
            audio_file,
            language="hi",  # Hindi
            task="transcribe"
        )

        # 4. Har dialogue ka timestamp nikalo
        segments = [
            {
                "text": "Tau ki izzat pe aayega koi?",
                "start_time": 123.45,  # 2 min 3 sec
                "end_time": 126.78,
                "duration": 3.33
            },
            {
                "text": "Yeh sheher mera hai",
                "start_time": 234.56,
                "end_time": 237.12,
                "duration": 2.56
            }
            # ... video ki saari dialogues
        ]

        return segments  # 100-500+ dialogues mil jaati hain
```

### Output:
```json
{
  "segments": [
    {"text": "Tau ki izzat pe aayega koi?", "start": 123.45, "end": 126.78},
    {"text": "Yeh sheher mera hai", "start": 234.56, "end": 237.12},
    {"text": "Kaun hai tu?", "start": 456.78, "end": 458.90}
    // ... 200+ more dialogues
  ],
  "primary_dialect": "haryanvi",
  "total_duration": 7200  // 2 hours
}
```

**Toh Dialogues Kaha Se?**
✅ Video ki apni audio se - Whisper ASR transcribe kar deta hai!

---

## STEP 2: SCENE DETECTION (Shots Nikalna)

### Technology: **PySceneDetect + OpenCV**
- Video ko frame-by-frame analyze karta hai
- Jab visual suddenly change hota hai = new scene
- Cuts, dissolves, fades detect karta hai

### Kaise Kaam Karta Hai:
```python
# File: analysis/scene_detector.py
class SceneDetector:
    def detect_scenes(self, video_path):
        # 1. Video open karo
        video = cv2.VideoCapture(video_path)

        # 2. Frame-by-frame compare karo
        previous_frame = None
        scenes = []

        for frame_num, frame in enumerate(video):
            if previous_frame is not None:
                # Calculate difference between frames
                diff = compare_frames(previous_frame, frame)

                # If big change = new scene!
                if diff > THRESHOLD:
                    timestamp = frame_num / fps
                    scenes.append({
                        "start_time": timestamp,
                        "scene_id": len(scenes) + 1
                    })

            previous_frame = frame

        # 3. Calculate scene durations
        for i in range(len(scenes)):
            if i < len(scenes) - 1:
                scenes[i]["end_time"] = scenes[i+1]["start_time"]
                scenes[i]["duration"] = scenes[i]["end_time"] - scenes[i]["start_time"]

        return scenes  # 500-2000 scenes (2 hour movie)
```

### Output:
```json
{
  "scenes": [
    {"id": 1, "start": 0.0, "end": 4.5, "duration": 4.5},
    {"id": 2, "start": 4.5, "end": 8.2, "duration": 3.7},
    {"id": 3, "start": 8.2, "end": 12.8, "duration": 4.6}
    // ... 1500+ more scenes
  ],
  "scene_count": 1847,
  "video_duration": 7200
}
```

**Toh Shots Kaha Se?**
✅ Video ko automatically analyze karke scene boundaries detect karta hai!

---

## STEP 3: CONTENT UNDERSTANDING (Emotion + Context)

### Technology: **Rule-Based + Pattern Matching**
- Dialogues ko analyze karke emotion detect karta hai
- Scene type identify karta hai (action, emotional, dialogue, etc.)
- Trailer potential calculate karta hai

### Kaise Kaam Karta Hai:
```python
# File: analysis/content_understanding.py
def analyze_content(scenes, dialogues):
    for scene in scenes:
        # Map dialogues to this scene
        scene_dialogues = find_dialogues_in_timerange(
            dialogues,
            scene.start_time,
            scene.end_time
        )

        if scene_dialogues:
            scene.dialogue = scene_dialogues[0].text

            # Emotion detection
            if has_emotional_words(scene.dialogue):
                scene.emotional_score = 80

            # Question detection (good for hook)
            if is_question(scene.dialogue):
                scene.is_hook = True

            # Trailer potential scoring
            scene.trailer_potential = calculate_score(scene)

        # Scene type detection
        position = scene.start_time / video_duration
        if position < 0.15:
            scene.scene_type = "establishing"  # Opening
        elif position > 0.85:
            scene.is_spoiler = True  # Avoid ending

    return scenes
```

---

## STEP 4: STORYLINE GENERATION (LLM Analysis)

### Technology: **Ollama (Local LLM) - Mistral/Llama**
- **Local LLM** = Computer par hi chalta hai, internet nahi chahiye
- Saari dialogues ko padhke story samajhta hai
- Characters identify karta hai
- Best dialogues select karta hai
- Trailer ka narrative structure banata hai

### Kaise Kaam Karta Hai:
```python
# File: narrative/dialogue_narrative_engine.py
class DialogueNarrativeEngine:
    def build_narrative(self, dialogues, style, target_duration):
        # 1. Prepare prompt for LLM
        prompt = f"""
You are a professional trailer editor for STAGE OTT platform.

VIDEO DIALOGUES (with timestamps):
[00:02:03] "Tau ki izzat pe aayega koi?"
[00:03:45] "Yeh sheher mera hai"
[00:07:23] "Kaun hai tu?"
[00:12:45] "Teri himmat kaise hui?"
... (all 200+ dialogues with timestamps)

TASK: Create a {target_duration} second {style} trailer by:
1. Identifying main characters
2. Understanding the story WITHOUT revealing the ending
3. Selecting 15-20 BEST dialogue moments
4. Arranging them for maximum impact
5. Creating opening hook and cliffhanger ending

RULES:
- NO spoilers (avoid last 15% of movie)
- START with attention-grabbing dialogue
- END with question/hook (kaun? kya? kyun?)
- Include character introduction moments
- Build tension progressively
- Prefer dialogues with emotion/conflict

OUTPUT FORMAT (JSON):
{
    "characters": [...],
    "selected_dialogues": [
        {"text": "...", "timestamp": "...", "reason": "..."}
    ],
    "opening_hook": "...",
    "closing_hook": "...",
    "narrative_flow": "..."
}
"""

        # 2. Send to Ollama LLM
        response = ollama.chat(
            model="mistral",  # or llama3.2
            messages=[{"role": "user", "content": prompt}]
        )

        # 3. Parse LLM response
        narrative = json.loads(response.message.content)

        # 4. Convert to trailer beats
        beats = []
        for dialogue in narrative.selected_dialogues:
            beat = {
                "order": len(beats) + 1,
                "dialogue_text": dialogue.text,
                "start_time": dialogue.timestamp,
                "phase": determine_phase(dialogue),
                "transition": "cut"
            }
            beats.append(beat)

        return narrative
```

### LLM Ka Response Example:
```json
{
  "characters": [
    {"name": "Tau", "role": "protagonist", "description": "Village elder with honor"},
    {"name": "Dushman", "role": "antagonist", "description": "City goon threatening village"}
  ],
  "selected_dialogues": [
    {
      "text": "Tau ki izzat pe aayega koi?",
      "timestamp": "00:02:03",
      "reason": "Strong opening hook - establishes stakes",
      "phase": "opening_hook"
    },
    {
      "text": "Yeh sheher mera hai",
      "timestamp": "00:03:45",
      "reason": "Character introduction - shows protagonist's claim",
      "phase": "character_intro"
    },
    {
      "text": "Jung shuru ho gayi hai",
      "timestamp": "00:15:30",
      "reason": "Conflict escalation",
      "phase": "tension_build"
    },
    {
      "text": "Kya hoga iska anjaam?",
      "timestamp": "00:45:20",
      "reason": "Perfect cliffhanger question",
      "phase": "cliffhanger"
    }
    // ... 15-20 total dialogues
  ],
  "opening_hook": "Tau ki izzat pe aayega koi?",
  "closing_hook": "Kya hoga iska anjaam?",
  "story_premise": "Village elder fights to protect honor against city threats"
}
```

**Toh Storyline Kaise?**
✅ LLM (AI) saari dialogues padhke story samajhta hai aur best narrative banata hai!

---

## STEP 5: VIDEO ASSEMBLY (Actual Trailer Banana)

### Technology: **FFmpeg (Video Editing)**
- Selected shots ko video se extract karta hai
- Shots ko sequence mein join karta hai
- Final trailer video banata hai

### Kaise Kaam Karta Hai:
```python
# File: assembly/assembler.py
class TrailerAssembler:
    def assemble(self, video_path, narrative):
        shot_files = []

        # 1. Extract each selected shot
        for beat in narrative.beats:
            # Extract clip using ffmpeg
            output_file = f"shot_{beat.order:03d}.mp4"

            ffmpeg_cmd = [
                'ffmpeg',
                '-ss', str(beat.start_time),     # Start at this time
                '-i', video_path,                 # Input video
                '-t', str(beat.duration),         # Duration of clip
                '-c:v', 'libx264',               # Video codec
                '-c:a', 'aac',                   # Audio codec
                output_file
            ]

            subprocess.run(ffmpeg_cmd)
            shot_files.append(output_file)

        # 2. Concatenate all shots into final trailer
        concat_list = "concat.txt"
        with open(concat_list, 'w') as f:
            for shot_file in shot_files:
                f.write(f"file '{shot_file}'\n")

        ffmpeg_concat = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list,
            '-c', 'copy',
            'trailer_final.mp4'
        ]

        subprocess.run(ffmpeg_concat)

        return 'trailer_final.mp4'
```

### Step-by-Step Extract:
```bash
# Shot 1: Extract from 00:02:03 for 3 seconds
ffmpeg -ss 123.0 -i movie.mp4 -t 3.0 shot_001.mp4

# Shot 2: Extract from 00:03:45 for 2.5 seconds
ffmpeg -ss 225.0 -i movie.mp4 -t 2.5 shot_002.mp4

# Shot 3: Extract from 00:15:30 for 4 seconds
ffmpeg -ss 930.0 -i movie.mp4 -t 4.0 shot_003.mp4

# ... 15-20 more shots

# Finally: Join all shots
ffmpeg -f concat -i concat.txt -c copy trailer_final.mp4
```

**Toh Shots Kaise Extract?**
✅ FFmpeg selected timestamps se video clips cut karta hai aur join karta hai!

---

## ❓ MUSIC KA SAWAL

### Current System:
```json
{
  "music_recommendation": {
    "style": "Regional Epic Drama",
    "instruments": ["dhol", "tabla", "strings"],
    "mood": "intense",
    "bpm": "120-140"
  }
}
```

**Music System NAHI Add Karta! ❌**

### Kyun Nahi?
1. **Copyright Issue** - Background music licensed hona chahiye
2. **Complexity** - Music timing, mixing, ducking (dialogue pe kam karna) bahut complex hai
3. **Creative Choice** - Different trailers need different music

### Options:

**Option 1: Manual Post-Production** (Current)
- Trailer video generate ho jaata hai
- Video editor separately music add karta hai (Adobe Premiere, Final Cut)

**Option 2: Music Library Integration** (Can Implement)
```python
# Add background music from library
def add_background_music(trailer_video, music_style):
    # Select music file based on style
    if music_style == "intense_action":
        music_file = "library/epic_action_120bpm.mp3"
    elif music_style == "emotional":
        music_file = "library/emotional_strings.mp3"

    # Mix music with trailer (ffmpeg)
    ffmpeg_cmd = [
        'ffmpeg',
        '-i', trailer_video,          # Video with dialogue audio
        '-i', music_file,              # Background music
        '-filter_complex',
        '[1:a]volume=0.3[music];'     # Music at 30% volume
        '[0:a][music]amix=inputs=2'   # Mix dialogue + music
        '-shortest',                   # Match video length
        'trailer_with_music.mp4'
    ]

    subprocess.run(ffmpeg_cmd)
```

**Option 3: AI Music Generation** (Future)
- Services like Suno AI, MusicGen
- Generate custom music for each trailer style
- Expensive and complex

---

## 📊 COMPLETE PIPELINE SUMMARY

```
USER INPUT
   |
   v
[1] AUDIO ANALYSIS (Whisper ASR)
   → Extract ALL dialogues with timestamps (200+ dialogues)
   |
   v
[2] SCENE DETECTION (PySceneDetect)
   → Find ALL scene boundaries (1500+ scenes)
   |
   v
[3] CONTENT UNDERSTANDING (Rules + Patterns)
   → Map dialogues to scenes
   → Score trailer potential
   → Detect emotions, questions, hooks
   |
   v
[4] NARRATIVE GENERATION (Ollama LLM)
   → Understand story from dialogues
   → Identify characters
   → Select best 15-20 dialogues
   → Create narrative structure (opening → character → conflict → climax → hook)
   |
   v
[5] VIDEO ASSEMBLY (FFmpeg)
   → Extract selected shots from original video
   → Concatenate into trailer sequence
   → Output final trailer video
   |
   v
FINAL OUTPUT: trailer_video.mp4 (without background music)
```

---

## 🎯 MERE PROPOSED CHANGES KA MATLAB

### What I'm Proposing:

1. **More Shots (30-40 vs 8-12)**
   - LLM ko bolo: "Select 20 dialogues instead of 10"
   - Har dialogue ka shot 2-4s ka instead of 6-8s
   - Result: More dynamic, faster-paced trailer

2. **More Dialogues (15-25 vs 8-12)**
   - LLM prompt update: "Select 15-25 best dialogues"
   - Better story coverage
   - More character moments

3. **Music Variations (2-3 shifts)**
   - **NOT adding actual music**
   - Just metadata: "Beat 1-10: soft music, Beat 11-20: intense, Beat 21-30: emotional"
   - Video editor uses this as guide

4. **Sound Effects Metadata**
   - **NOT adding actual sound effects**
   - Just recommendations: "Add punch sound here, heartbeat here"
   - Post-production uses as guide

5. **Faster Cuts**
   - Change shot duration from 6-8s to 2-4s
   - Gives STAGE-style fast pacing

---

## ✅ KIYA JA SAKTA HAI?

**YES!** Sab kuch already video se hi aa raha hai:
- ✅ Dialogues → Whisper ASR se
- ✅ Shots → Scene Detection + FFmpeg se
- ✅ Storyline → LLM analysis se
- ✅ Video Assembly → FFmpeg se

**Music?**
- ❌ System add nahi karta (manual post-production)
- ✅ Metadata/recommendations de sakta hai

**Sound Effects?**
- ❌ System add nahi karta
- ✅ Recommendations de sakta hai

---

## 🚀 NEXT STEPS

**Simple Changes** (No Music/SFX):
1. Increase dialogue count (8→20)
2. Increase shot count (12→35)
3. Faster shot cuts (6s→3s)
4. Better LLM prompts for STAGE style

**Advanced (With Music/SFX):**
1. Integrate music library (royalty-free tracks)
2. Auto-mix with ffmpeg
3. Add sound effects layer

Kya karein? Simple changes ya advanced bhi? 🎬
