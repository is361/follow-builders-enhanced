#!/usr/bin/env node

// ============================================================================
// Follow Builders — Reddit Feed Generator (Local)
// ============================================================================
// Fetches top posts from AI-related subreddits for the digest.
// Uses Reddit's public JSON API with proper user-agent.
//
// Usage: node generate-feed-reddit.js
// Output: feed-reddit.json
// ============================================================================

import { writeFile } from "fs/promises";
import { join } from "path";

const SCRIPT_DIR = decodeURIComponent(new URL(".", import.meta.url).pathname);
const OUTPUT_PATH = join(SCRIPT_DIR, "..", "feed-reddit.json");

const SUBREDDITS = [
  "LocalLLaMA",
  "artificial",
  "MachineLearning",
  "openai",
  "ChatGPT",
  "ClaudeAI"
];

const LOOKBACK_HOURS = 24;
const MAX_POSTS_PER_SUB = 5;
const MIN_SCORE = 10;

const USER_AGENT = "follow-builders/1.0 (by /u/followbuilders)";

async function fetchRedditPosts(subreddit, limit) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) {
      console.error(`  Reddit ${subreddit}: HTTP ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const posts = data.data.children.map(child => child.data);
    
    return posts.filter(p => 
      p.score >= MIN_SCORE &&
      !p.stickied &&
      !p.isSelfPost || p.selftext?.length > 100
    ).slice(0, limit);
  } catch (err) {
    console.error(`  Reddit ${subreddit}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.error("Fetching Reddit content...");
  
  const allPosts = [];
  const errors = [];
  
  for (const sub of SUBREDDITS) {
    console.error(`  Fetching r/${sub}...`);
    const posts = await fetchRedditPosts(sub, MAX_POSTS_PER_SUB);
    
    for (const post of posts) {
      allPosts.push({
        subreddit: sub,
        title: post.title,
        score: post.score,
        comments: post.num_comments,
        author: post.author,
        createdUtc: new Date(post.created * 1000).toISOString(),
        url: post.url,
        permalink: `https://reddit.com${post.permalink}`,
        selftext: post.selftext?.substring(0, 500) || "",
        isSelf: post.isSelf,
        flair: post.link_flair_text,
      });
    }
    
    if (posts.length === 0) {
      errors.push(`Reddit ${sub}: No posts found or fetch failed`);
    }
  }
  
  // Sort by score descending
  allPosts.sort((a, b) => b.score - a.score);
  
  // Take top 15
  const topPosts = allPosts.slice(0, 15);
  
  const feed = {
    generatedAt: new Date().toISOString(),
    lookbackHours: LOOKBACK_HOURS,
    subreddit: SUBREDDITS,
    posts: topPosts,
    stats: {
      totalPosts: topPosts.length,
      subreddits: SUBREDDITS.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
  
  await writeFile(OUTPUT_PATH, JSON.stringify(feed, null, 2));
  console.error(`  feed-reddit.json: ${topPosts.length} posts from ${SUBREDDITS.length} subreddits`);
  
  if (errors.length > 0) {
    console.error(`  ${errors.length} errors`);
  }
}

main().catch(err => {
  console.error("Reddit feed generation failed:", err.message);
  process.exit(1);
});
