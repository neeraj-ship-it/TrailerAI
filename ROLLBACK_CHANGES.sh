#!/bin/bash

# Rollback script - reverts STAGE style changes

echo "⚠️  ROLLBACK: Reverting STAGE style changes..."
echo ""

cd /Users/neerajsachdeva/Desktop/TrailerAI/trailer-narrative-ai

echo "Checking git status..."
git status --short

echo ""
read -p "Do you want to revert these files? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Reverting..."
    git checkout narrative/dialogue_narrative_engine.py
    git checkout narrative/dialogue_pipeline.py
    git checkout config/constants.py
    echo "✅ Files reverted to original state"
else
    echo "❌ Rollback cancelled"
fi
