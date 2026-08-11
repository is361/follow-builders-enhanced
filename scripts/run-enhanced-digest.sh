#!/bin/bash
# Follow Builders — Enhanced Digest Runner
# Fetches all feeds and generates digest with Reddit & YouTube

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Follow Builders Enhanced Digest ==="
echo ""

# Step 1: Generate Reddit feed
echo "1. Fetching Reddit..."
cd "$SCRIPT_DIR"
node generate-feed-reddit.js 2>&1 || echo "  Warning: Reddit feed generation failed"

# Step 2: Generate YouTube feed
echo "2. Fetching YouTube..."
node generate-feed-youtube.js 2>&1 || echo "  Warning: YouTube feed generation failed"

# Step 3: Generate enhanced digest
echo "3. Preparing enhanced digest..."
node prepare-digest-enhanced.js > /tmp/digest-enhanced.json 2>&1

# Step 4: Output stats
echo ""
echo "=== Digest Statistics ==="
python3 -c "
import json
with open('/tmp/digest-enhanced.json') as f:
    data = json.load(f)
stats = data.get('stats', {})
print(f\"  X/Twitter: {stats.get('xBuilders', 0)} builders, {stats.get('totalTweets', 0)} tweets\")
print(f\"  Podcasts: {stats.get('podcastEpisodes', 0)} episodes\")
print(f\"  Blogs: {stats.get('blogPosts', 0)} posts\")
print(f\"  Reddit: {stats.get('redditPosts', 0)} posts\")
print(f\"  YouTube: {stats.get('youtubeVideos', 0)} videos\")
print(f\"  Generated: {data.get('generatedAt', 'N/A')}\")
"

echo ""
echo "Digest saved to /tmp/digest-enhanced.json"
echo "Run 'node prepare-digest-enhanced.js' to get the full JSON for LLM processing"
