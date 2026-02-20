#!/bin/bash

# Quick test script to verify Python changes work

echo "🧪 Testing STAGE Style Changes..."
echo ""

cd /Users/neerajsachdeva/Desktop/TrailerAI/trailer-narrative-ai

echo "1️⃣ Testing Python syntax..."
python3 -m py_compile narrative/dialogue_narrative_engine.py 2>&1 && echo "✅ dialogue_narrative_engine.py - OK" || echo "❌ dialogue_narrative_engine.py - FAILED"
python3 -m py_compile narrative/dialogue_pipeline.py 2>&1 && echo "✅ dialogue_pipeline.py - OK" || echo "❌ dialogue_pipeline.py - FAILED"
python3 -m py_compile config/constants.py 2>&1 && echo "✅ constants.py - OK" || echo "❌ constants.py - FAILED"

echo ""
echo "2️⃣ Testing dataclass with field()..."
python3 -c "
from dataclasses import dataclass, field
from typing import List

@dataclass
class TestBeat:
    order: int
    sound_effects: List[str] = field(default_factory=list)

beat = TestBeat(order=1, sound_effects=['test'])
print(f'✅ Dataclass works: {beat.order}, {beat.sound_effects}')
" 2>&1

echo ""
echo "3️⃣ Checking constants..."
python3 -c "
import sys
sys.path.insert(0, '/Users/neerajsachdeva/Desktop/TrailerAI/trailer-narrative-ai')
try:
    from config.constants import DEFAULT_TARGET_DURATION, STAGE_MIN_SHOTS
    print(f'✅ Constants loaded:')
    print(f'   DEFAULT_TARGET_DURATION = {DEFAULT_TARGET_DURATION}')
    print(f'   STAGE_MIN_SHOTS = {STAGE_MIN_SHOTS}')
except Exception as e:
    print(f'❌ Error: {e}')
" 2>&1

echo ""
echo "4️⃣ Test complete!"
echo ""
echo "Agar sab ✅ hai toh Python code theek hai."
echo "Agar ❌ hai toh us file mein problem hai."
