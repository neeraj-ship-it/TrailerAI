#!/bin/bash

echo "🎬 TrailerAI - Simple Trailer Generator"
echo "========================================"
echo ""

# Ask for video file path
read -p "Enter video file path: " VIDEO_PATH

# Ask for movie details
read -p "Movie Title: " TITLE
read -p "Genre (action/drama/thriller): " GENRE
read -p "Language (hindi/english): " LANGUAGE
read -p "Target Duration (seconds, default 90): " DURATION
DURATION=${DURATION:-90}

# Generate project ID
PROJECT_ID="trailer-$(date +%s)"

echo ""
echo "🚀 Starting trailer generation..."
echo "Project ID: $PROJECT_ID"
echo ""

cd trailer-narrative-ai
source venv/bin/activate

python main.py "{
  \"projectId\": \"$PROJECT_ID\",
  \"localFilePath\": \"$VIDEO_PATH\",
  \"contentMetadata\": {
    \"title\": \"$TITLE\",
    \"genre\": \"$GENRE\",
    \"language\": \"$LANGUAGE\",
    \"targetDuration\": $DURATION
  },
  \"narrativeStyles\": [\"dramatic\", \"action\"],
  \"outputOptions\": {\"generateTrailerVideos\": false}
}"

echo ""
echo "✅ Done! Check output in: trailer-narrative-ai/output/$PROJECT_ID/"
