# Python Backend - STAGE Style Fixes

**Date:** 2026-02-05
**Issue:** Generated trailers don't match STAGE quality - need more shots, dialogues, music variations, and sound effects

---

## Current Problems

### 1. Shot Count TOO LOW ❌
- **Current:** 8-12 shots/beats per trailer
- **STAGE Requirement:** 30-40 shots
- **Impact:** Trailers feel slow, not engaging enough

### 2. Dialogue Count TOO LOW ❌
- **Current:** 8-12 dialogue moments
- **STAGE Requirement:** 15-20 dialogue cards
- **Impact:** Not enough story/character development

### 3. NO Music Variations ❌
- **Current:** Single music recommendation
- **STAGE Requirement:** 2-3 music shifts (soft → intense → emotional)
- **Impact:** Monotonous audio, no emotional peaks

### 4. NO Sound Effects/Design ❌
- **Current:** No sound effects metadata
- **STAGE Requirement:** Sound effects for action, impacts, atmosphere
- **Impact:** Feels flat, not cinematic

### 5. Wrong Target Duration ❌
- **Current:** Default 90s
- **STAGE Requirement:** 120-150s
- **Impact:** Too short to tell proper story

### 6. Shot Duration Too Long ❌
- **Current:** 6-8s per shot
- **STAGE Requirement:** 1-4s average (faster cuts)
- **Impact:** Slow pacing, not punchy enough

---

## Files to Modify

### File 1: `narrative/dialogue_narrative_engine.py`

**Line 581** - Update dialogue count target:
```python
# OLD:
TARGET: {target_duration} second trailer (need 8-12 dialogue moments)

# NEW:
TARGET: {target_duration} second trailer (need 15-25 dialogue moments)
```

**Line 673-680** - Update dialogue selection logic:
```python
# OLD:
def _rule_based_select_dialogues(self, dialogues, characters, style, target_duration):
    target_count = 10  # Target number of dialogues

# NEW:
def _rule_based_select_dialogues(self, dialogues, characters, style, target_duration):
    # STAGE style: More dialogues for storytelling
    target_count = max(15, int(target_duration / 6))  # ~2.5 dialogues per 15s
    # 90s = 15 dialogues, 120s = 20 dialogues, 150s = 25 dialogues
```

---

### File 2: `narrative/dialogue_pipeline.py`

**Line 40** - Add music shift markers:
```python
@dataclass
class TrailerBeat:
    """A beat in the final trailer assembly."""
    order: int
    phase: str
    dialogue_text: str
    start_time: float
    end_time: float
    duration: float
    transition_in: str
    transition_out: str
    audio_type: str
    text_overlay: Optional[str] = None
    is_hook: bool = False

    # ADD THESE:
    music_style: Optional[str] = None  # "soft", "intense", "emotional"
    sound_effects: List[str] = field(default_factory=list)  # ["fight", "impact", "wind"]
```

**Line 149-180** - Add music variation logic:
```python
def _convert_to_variant(self, narrative: DialogueNarrative, style: str) -> DialogueTrailerVariant:
    """Convert DialogueNarrative to DialogueTrailerVariant with beats."""
    beats = []
    total_duration = 0

    # STAGE Style: 2-3 music variations
    music_shifts = self._calculate_music_shifts(len(narrative.sequences))

    for i, seq in enumerate(narrative.sequences):
        # Determine music style based on phase
        music_style = self._get_music_style(seq.phase, i, music_shifts)

        # Add sound effects based on dialogue content
        sound_effects = self._extract_sound_effects(seq.dialogue.text)

        beat = TrailerBeat(
            order=i + 1,
            phase=seq.phase.value,
            dialogue_text=seq.dialogue.text,
            start_time=seq.scene_timestamp[0],
            end_time=seq.scene_timestamp[1],
            duration=seq.duration_in_trailer,
            transition_in=seq.transition,
            transition_out="cut" if i < len(narrative.sequences) - 1 else "fade",
            audio_type="dialogue",
            text_overlay=seq.text_overlay,
            is_hook=seq.dialogue.is_hook,
            music_style=music_style,  # NEW
            sound_effects=sound_effects  # NEW
        )
        beats.append(beat)
        total_duration += beat.duration

def _calculate_music_shifts(self, total_beats: int) -> List[int]:
    """Calculate where music should shift (STAGE style: 2-3 shifts).

    Returns indices where music should change.
    """
    if total_beats <= 10:
        return [0, total_beats // 2]  # 2 shifts
    else:
        return [0, total_beats // 3, 2 * total_beats // 3]  # 3 shifts

def _get_music_style(self, phase: str, index: int, music_shifts: List[int]) -> str:
    """Get music style for this beat based on phase and position.

    STAGE Music Pattern:
    - Opening (0-30%): Soft/mysterious (dhol, tabla, ambient)
    - Middle (30-70%): Intense/action (epic orchestral, regional drums)
    - Ending (70-100%): Emotional/suspense (strings, building tension)
    """
    if index < music_shifts[1]:
        return "soft_regional"  # Dhol, tabla, ambient pads
    elif index < music_shifts[-1]:
        return "intense_action"  # Epic orchestral + regional drums
    else:
        return "emotional_suspense"  # Strings, building to climax

def _extract_sound_effects(self, dialogue_text: str) -> List[str]:
    """Extract sound effects hints from dialogue content.

    STAGE trailers use heavy sound design:
    - Fight words → punch, impact, whoosh
    - Emotional words → heartbeat, breathing
    - Tense words → suspense_drone, wind
    """
    effects = []
    text_lower = dialogue_text.lower()

    # Action/Fight effects
    if any(word in text_lower for word in ['maar', 'maara', 'fight', 'ladai', 'jung']):
        effects.extend(['punch_impact', 'whoosh', 'body_hit'])

    # Emotional effects
    if any(word in text_lower for word in ['pyaar', 'mohabbat', 'dil', 'jaan']):
        effects.extend(['heartbeat', 'soft_breath'])

    # Tension/Danger effects
    if any(word in text_lower for word in ['dar', 'khatre', 'danger', 'dushman']):
        effects.extend(['suspense_drone', 'tension_hit', 'wind_gust'])

    # Questions (hook ending)
    if '?' in dialogue_text or any(word in text_lower for word in ['kya', 'kaun', 'kyun']):
        effects.append('question_chord')

    return effects
```

---

### File 3: `assembly/assembler.py`

**Shot Duration** - Update extraction logic:
```python
# OLD (line ~680):
shot_dur = min(scene.duration, 6 if act_name == 'hook' else 8)

# NEW - STAGE style faster cuts:
# Base duration by phase
base_durations = {
    'opening_hook': 3.0,      # Fast grab attention
    'character_intro': 4.0,   # Show character
    'world_setup': 3.5,       # Quick establish
    'conflict_setup': 3.0,    # Fast escalation
    'tension_build': 2.5,     # Rapid cuts
    'emotional_peak': 5.0,    # Hold emotion
    'cliffhanger': 4.0        # Question moment
}

shot_dur = min(scene.duration, base_durations.get(phase, 3.0))
```

**Add Text Overlay Support:**
```python
def _extract_shot_with_subtitle(
    self,
    video_path: str,
    start_time: float,
    duration: float,
    dialogue_text: str,
    index: int
) -> Optional[str]:
    """Extract shot and burn-in Hindi/Haryanvi dialogue as subtitle.

    STAGE trailers use 6-10 dialogue cards with white text.
    """
    output = self.temp_dir / f"shot_{index:03d}.mp4"

    # Escape text for ffmpeg drawtext
    safe_text = dialogue_text.replace("'", "\\'").replace(":", "\\:")

    # STAGE text style: White, bold, bottom center
    subtitle_filter = (
        f"drawtext="
        f"text='{safe_text}':"
        f"fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf:"
        f"fontsize=48:"
        f"fontcolor=white:"
        f"borderw=2:"
        f"bordercolor=black:"
        f"x=(w-text_w)/2:"  # Center horizontally
        f"y=h-80"           # 80px from bottom
    )

    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start_time),
        '-i', video_path,
        '-t', str(duration),
        '-vf', subtitle_filter,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k',
        str(output)
    ]

    # ... rest of extraction code
```

---

### File 4: `config/constants.py`

**Update default values:**
```python
# OLD:
DEFAULT_TARGET_DURATION = 90
DEFAULT_NARRATIVE_STYLES = ["dramatic", "action", "emotional"]

# NEW - STAGE defaults:
DEFAULT_TARGET_DURATION = 120  # STAGE standard
DEFAULT_NARRATIVE_STYLES = [
    "dramatic",     # Main style
    "action",       # Action-heavy
    "emotional",    # Character-focused
    "thriller",     # Suspense build
    "epic",         # Grand scale
    "character"     # Character intro
]

# STAGE shot parameters
STAGE_MIN_SHOTS = 30
STAGE_MAX_SHOTS = 40
STAGE_AVG_SHOT_DURATION = 3.5  # seconds (vs 6-8s standard)

# STAGE dialogue parameters
STAGE_MIN_DIALOGUES = 15
STAGE_MAX_DIALOGUES = 25
STAGE_DIALOGUE_RATIO = 0.7  # 70% of trailer should have dialogue

# STAGE music parameters
STAGE_MUSIC_SHIFTS = 3  # Number of music style changes
STAGE_MUSIC_STYLES = [
    "soft_regional",      # Opening (dhol, tabla, ambient)
    "intense_action",     # Middle (epic + regional drums)
    "emotional_suspense"  # Ending (strings, tension)
]
```

---

## Testing the Changes

### Step 1: Update Python Files
```bash
cd /Users/neerajsachdeva/Desktop/TrailerAI/trailer-narrative-ai

# Edit files as described above
nano narrative/dialogue_narrative_engine.py
nano narrative/dialogue_pipeline.py
nano assembly/assembler.py
nano config/constants.py
```

### Step 2: Test with Sample Video
```bash
python main.py '{
  "localFilePath": "/Users/neerajsachdeva/Desktop/Trailers/HR_Chalava.mp4",
  "projectId": "test-stage-style",
  "contentMetadata": {
    "title": "Test STAGE Style",
    "genre": "action-dramatic",
    "language": "hindi",
    "targetDuration": 120
  },
  "narrativeStyles": ["dramatic", "action"],
  "outputOptions": {
    "generateTrailerVideos": true,
    "outputS3Bucket": "test",
    "trailerFormat": "mp4",
    "trailerResolution": "1080p"
  }
}'
```

### Step 3: Verify Output
Check the generated `narrative.json` for:
- ✅ **30-40 shots** in shot_sequence
- ✅ **15-20 dialogue moments** with text
- ✅ **2-3 music_style changes** across beats
- ✅ **Sound effects** in metadata
- ✅ **Average shot duration** 2-4s (not 6-8s)
- ✅ **Total duration** 120-150s (not 90s)

---

## Expected Output Example

```json
{
  "variant_id": "001",
  "style": "dramatic",
  "target_duration": 125,
  "actual_duration": 127.5,
  "shot_count": 35,
  "dialogue_count": 18,
  "music_shifts": 3,
  "shot_sequence": [
    {
      "order": 1,
      "timecode_start": "00:05:23",
      "timecode_end": "00:05:26",
      "duration": 3.0,
      "dialogue": "Yeh sheher mera hai!",
      "music_style": "soft_regional",
      "sound_effects": ["wind_ambience", "dhol_soft"],
      "phase": "opening_hook"
    },
    {
      "order": 2,
      "timecode_start": "00:12:45",
      "timecode_end": "00:12:48",
      "duration": 3.0,
      "dialogue": "Tau ki izzat pe aayega koi?",
      "music_style": "soft_regional",
      "sound_effects": ["tension_drone"],
      "phase": "world_setup"
    },
    // ... 33 more shots
    {
      "order": 35,
      "timecode_start": "01:23:15",
      "timecode_end": "01:23:20",
      "duration": 5.0,
      "dialogue": "Kya hoga iska anjaam?",
      "music_style": "emotional_suspense",
      "sound_effects": ["question_chord", "heartbeat", "suspense_rise"],
      "phase": "cliffhanger",
      "is_hook_ending": true
    }
  ],
  "music_recommendation": {
    "style": "STAGE Regional Epic",
    "variations": [
      {"phase": "opening", "style": "soft_regional", "instruments": ["dhol", "tabla", "ambient_pads"]},
      {"phase": "middle", "style": "intense_action", "instruments": ["orchestra", "regional_drums", "brass"]},
      {"phase": "ending", "style": "emotional_suspense", "instruments": ["strings", "choir", "tension_hits"]}
    ],
    "has_dialogue_gaps": true
  }
}
```

---

## Summary of Changes

| Parameter | Before | After (STAGE) | Change |
|-----------|--------|---------------|--------|
| Shot Count | 8-12 | 30-40 | +250% |
| Dialogue Count | 8-12 | 15-25 | +100% |
| Music Variations | 1 | 2-3 | +200% |
| Sound Effects | None | Full design | NEW |
| Target Duration | 90s | 120-150s | +33-66% |
| Avg Shot Length | 6-8s | 2-4s | -50% |
| Dialogue Ratio | ~40% | ~70% | +75% |

---

## Priority Order

1. **HIGHEST:** Shot count (30-40) + faster cuts (2-4s)
2. **HIGH:** Dialogue count (15-25)
3. **MEDIUM:** Music variations (2-3 shifts)
4. **MEDIUM:** Sound effects metadata
5. **LOW:** Text overlay rendering (can be done in post)

---

**Ab yeh changes karne ke baad output STAGE quality ka hoga!** 🎬
