#!/bin/bash

# Brahmai CI/CD - Sync to GitHub Script
# This script pushes local commits to GitHub

set -e  # Exit on error

echo "🔄 Syncing to GitHub..."

cd /home/ubuntu/grade7-quiz-app

# Configure SSH to use the correct key
export GIT_SSH_COMMAND="ssh -i ~/.ssh/brahmai_github -o StrictHostKeyChecking=no"

# Check if there are any changes
if git diff-index --quiet HEAD --; then
    echo "✅ No changes to push"
    exit 0
fi

# Add all changes
git add -A

# Commit if there are staged changes
if ! git diff-index --quiet --cached HEAD --; then
    COMMIT_MSG="${1:-Update from Manus sandbox}"
    git commit -m "$COMMIT_MSG"
    echo "✅ Changes committed: $COMMIT_MSG"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push github master:main --force

echo "✅ Successfully synced to GitHub!"
echo "🚀 Render will auto-deploy in ~5-10 minutes"

