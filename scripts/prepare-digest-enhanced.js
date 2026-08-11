#!/usr/bin/env node

// ============================================================================
// Follow Builders Enhanced — Prepare Digest
// ============================================================================
// Gathers everything the LLM needs to produce a digest:
// - Fetches the central feeds (tweets + podcasts + blogs)
// - Fetches Reddit and YouTube feeds from enhanced repo
// - Fetches the latest prompts from GitHub
// - Reads the user's config (language, delivery method)
// - Outputs a single JSON blob to stdout
//
// Usage: node prepare-digest-enhanced.js
// Output: JSON to stdout
// ============================================================================

import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// -- Constants ---------------------------------------------------------------

const USER_DIR = join(homedir(), '.follow-builders');
const CONFIG_PATH = join(USER_DIR, 'config.json');

// Original follow-builders feeds
const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json';

// Enhanced feeds (Reddit + YouTube) - FROM YOUR REPO
// TODO: Replace with your GitHub username
const FEED_REDDIT_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/follow-builders-enhanced/main/feed-reddit.json';
const FEED_YOUTUBE_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/follow-builders-enhanced/main/feed-youtube.json';

const PROMPTS_BASE = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/prompts';
const PROMPT_FILES = [
  'summarize-podcast.md',
  'summarize-tweets.md',
  'summarize-blogs.md',
  'summarize-reddit.md',
  'summarize-youtube.md',
  'digest-intro.md',
  'translate.md'
];

// -- Fetch helpers -----------------------------------------------------------

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    return null;
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.text();
  } catch (err) {
    return null;
  }
}

// -- Main --------------------------------------------------------------------

async function main() {
  const errors = [];

  // 1. Read user config
  let config = {
    language: 'en',
    frequency: 'daily',
    delivery: { method: 'stdout' }
  };
  if (existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      errors.push(`Could not read config: ${err.message}`);
    }
  }

  // 2. Fetch all five feeds in parallel
  const [feedX, feedPodcasts, feedBlogs, feedReddit, feedYouTube] = await Promise.all([
    fetchJSON(FEED_X_URL),
    fetchJSON(FEED_PODCASTS_URL),
    fetchJSON(FEED_BLOGS_URL),
    fetchJSON(FEED_REDDIT_URL),
    fetchJSON(FEED_YOUTUBE_URL)
  ]);

  if (!feedX) errors.push('Could not fetch tweet feed');
  if (!feedPodcasts) errors.push('Could not fetch podcast feed');
  if (!feedBlogs) errors.push('Could not fetch blog feed');
  if (!feedReddit) errors.push('Could not fetch Reddit feed');
  if (!feedYouTube) errors.push('Could not fetch YouTube feed');

  // Collect errors from feeds
  if (feedX?.errors?.length) {
    errors.push(...feedX.errors.map((error) => `Tweet feed problem: ${error}`));
  }
  if (feedPodcasts?.errors?.length) {
    errors.push(...feedPodcasts.errors.map((error) => `Podcast feed problem: ${error}`));
  }
  if (feedBlogs?.errors?.length) {
    errors.push(...feedBlogs.errors.map((error) => `Blog feed problem: ${error}`));
  }
  if (feedReddit?.errors?.length) {
    errors.push(...feedReddit.errors.map((error) => `Reddit feed problem: ${error}`));
  }
  if (feedYouTube?.errors?.length) {
    errors.push(...feedYouTube.errors.map((error) => `YouTube feed problem: ${error}`));
  }

  // 3. Load prompts with priority: user custom > remote (GitHub) > local default
  const prompts = {};
  const scriptDir = decodeURIComponent(new URL('.', import.meta.url).pathname);
  const localPromptsDir = join(scriptDir, '..', 'prompts');
  const userPromptsDir = join(USER_DIR, 'prompts');

  for (const filename of PROMPT_FILES) {
    const key = filename.replace('.md', '').replace(/-/g, '_');
    const userPath = join(userPromptsDir, filename);
    const localPath = join(localPromptsDir, filename);

    // Priority 1: user's custom prompt
    if (existsSync(userPath)) {
      prompts[key] = await readFile(userPath, 'utf-8');
      continue;
    }

    // Priority 2: latest from GitHub
    const remote = await fetchText(`${PROMPTS_BASE}/${filename}`);
    if (remote) {
      prompts[key] = remote;
      continue;
    }

    // Priority 3: local copy
    if (existsSync(localPath)) {
      prompts[key] = await readFile(localPath, 'utf-8');
    } else {
      errors.push(`Could not load prompt: ${filename}`);
    }
  }

  // 4. Build the output
  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),

    // User preferences
    config: {
      language: config.language || 'en',
      frequency: config.frequency || 'daily',
      delivery: config.delivery || { method: 'stdout' }
    },

    // Content to remix
    podcasts: feedPodcasts?.podcasts || [],
    x: feedX?.x || [],
    blogs: feedBlogs?.blogs || [],
    reddit: feedReddit?.posts || [],
    youtube: feedYouTube?.videos || [],

    // Stats for the LLM
    stats: {
      podcastEpisodes: feedPodcasts?.podcasts?.length || 0,
      xBuilders: feedX?.x?.length || 0,
      totalTweets: (feedX?.x || []).reduce((sum, a) => sum + a.tweets.length, 0),
      blogPosts: feedBlogs?.blogs?.length || 0,
      redditPosts: feedReddit?.posts?.length || 0,
      youtubeVideos: feedYouTube?.videos?.length || 0,
      feedGeneratedAt: feedX?.generatedAt || feedPodcasts?.generatedAt || feedBlogs?.generatedAt || feedReddit?.generatedAt || feedYouTube?.generatedAt || null
    },

    // Prompts
    prompts,

    // Non-fatal errors
    errors: errors.length > 0 ? errors : undefined
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({
    status: 'error',
    message: err.message
  }));
  process.exit(1);
});
