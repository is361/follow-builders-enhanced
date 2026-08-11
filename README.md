# Follow Builders Enhanced

Extended version of [follow-builders](https://github.com/zarazhangrui/follow-builders) with Reddit and YouTube support.

## Features

- ✅ X/Twitter builder updates (from original)
- ✅ Podcast transcripts (from original)
- ✅ AI blog posts (from original)
- 🆕 Reddit hot posts from AI subreddits
- 🆕 YouTube trending AI videos

## Data Sources

### Reddit Subreddits
- r/LocalLLaMA
- r/artificial
- r/MachineLearning
- r/openai
- r/ChatGPT
- r/ClaudeAI

### YouTube Channels
- Lex Fridman
- Two Minute Papers
- AI Explained
- Yannic Kilcher
- The AI Revolution
- Machine Learnia

## Setup

1. Fork this repository
2. Add secrets to your repository:
   - `X_BEARER_TOKEN`: X API Bearer Token (for tweet fetching)
   - `POD2TXT_API_KEY`: Pod2txt API key (for podcast transcripts)
3. Enable GitHub Actions
4. The workflow runs daily at 6:17 UTC

## Usage in Minis

Update `prepare-digest-enhanced.js` to fetch from this repo:

```javascript
const FEED_REDDIT_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/follow-builders-enhanced/main/feed-reddit.json';
const FEED_YOUTUBE_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/follow-builders-enhanced/main/feed-youtube.json';
```

## Files

- `.github/workflows/generate-feed.yml` - GitHub Actions workflow
- `scripts/generate-feed.js` - Original feed generator (X, podcasts, blogs)
- `scripts/generate-feed-reddit.js` - Reddit feed generator
- `scripts/generate-feed-youtube.js` - YouTube feed generator
- `scripts/prepare-digest-enhanced.js` - Enhanced digest preparer
- `scripts/run-enhanced-digest.sh` - One-command runner

## License

Same as original follow-builders
