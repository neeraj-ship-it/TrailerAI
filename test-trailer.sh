#!/bin/bash
# Quick test script for trailer generation

cd trailer-narrative-ai
source venv/bin/activate

# Replace with your actual video path
VIDEO_PATH="/path/to/your/movie.mp4"

python main.py "{
  \"projectId\": \"test-$(date +%s)\",
  \"localFilePath\": \"$VIDEO_PATH\",
  \"contentMetadata\": {
    \"title\": \"Test Movie\",
    \"genre\": \"action-drama\",
    \"language\": \"hindi\",
    \"targetDuration\": 90
  },
  \"narrativeStyles\": [\"dramatic\", \"action\"],
  \"outputOptions\": {
    \"generateTrailerVideos\": false
  }
}"

echo ""
echo "Check output/ folder for results!"
