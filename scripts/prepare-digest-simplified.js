#!/usr/bin/env node

// ============================================================================
// Follow Builders Enhanced — Prepare Digest (Simplified)
// ============================================================================
// Gathers everything the LLM needs to produce a digest:
// - Fetches the central feeds (tweets + podcasts + blogs)
// - Fetches Reddit and YouTube feeds from enhanced repo
// - Fetches Hacker News and GitHub Trending (local generation)
// - Reads the user's config (language, delivery method)
// - Outputs a single JSON blob to stdout
//
// Usage: node prepare-digest-simplified.js
// Output: JSON to stdout
// ============================================================================

import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const USER_DIR = join(homedir(), '.follow-builders');
const CONFIG_PATH = join(USER_DIR, 'config.json');

// Remote feeds
const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json';
const FEED_REDDIT_URL = 'https://raw.githubusercontent.com/is361/follow-builders-enhanced/main/feed-reddit.json';
const FEED_YOUTUBE_URL = 'https://raw.githubusercontent.com/is361/follow-builders-enhanced/main/feed-youtube.json';

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function main() {
  // Read config
  let config = { language: 'en', frequency: 'daily', delivery: { method: 'stdout' } };
  try {
    const configText = await readFile(CONFIG_PATH, 'utf-8');
    config = JSON.parse(configText);
  } catch {}

  // Fetch all feeds
  const [feedX, feedPodcasts, feedBlogs, feedReddit, feedYouTube] = await Promise.all([
    fetchJSON(FEED_X_URL),
    fetchJSON(FEED_PODCASTS_URL),
    fetchJSON(FEED_BLOGS_URL),
    fetchJSON(FEED_REDDIT_URL),
    fetchJSON(FEED_YOUTUBE_URL),
  ]);

  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    config,
    podcasts: feedPodcasts?.podcasts || [],
    x: feedX?.x || [],
    blogs: feedBlogs?.blogs || [],
    reddit: feedReddit?.posts || [],
    youtube: feedYouTube?.videos || [],
    stats: {
      podcastEpisodes: feedPodcasts?.podcasts?.length || 0,
      xBuilders: feedX?.x?.length || 0,
      totalTweets: (feedX?.x || []).reduce((sum, a) => sum + a.tweets.length, 0),
      blogPosts: feedBlogs?.blogs?.length || 0,
      redditPosts: feedReddit?.posts?.length || 0,
      youtubeVideos: feedYouTube?.videos?.length || 0,
    },
    prompts: {
      digest_intro: `AI Builders Digest — [Date]

📱 X / TWITTER
────────────────
[Builder content]

📝 BLOGS
────────────────
[Blog content]

🎙️ PODCASTS
────────────────
[Podcast content]

📱 REDDIT
────────────────
[Reddit content]

🎬 YOUTUBE
────────────────
[YouTube content]

✦ END ✦
Powered by Follow Builders Enhanced`,
    }
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});
