#!/usr/bin/env node

// ============================================================================
// Follow Builders Enhanced — Simplified Feed Generator (No API Keys)
// ============================================================================
// This version uses public APIs that don't require authentication:
// - Hacker News (Algolia API)
// - GitHub Trending (public API)
// - Reddit (public JSON API with proper headers)
// - YouTube RSS (public feeds)
//
// Usage: node generate-feed-simplified.js
// Output: feed-hn.json, feed-github.json, feed-reddit.json, feed-youtube.json
// ============================================================================

import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const SCRIPT_DIR = decodeURIComponent(new URL(".", import.meta.url).pathname);
const OUTPUT_DIR = join(SCRIPT_DIR, "..");

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// -- Hacker News -------------------------------------------------------------

async function fetchHackerNews() {
  console.error("Fetching Hacker News...");
  
  try {
    const res = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15", {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) {
      console.error("  HN API error:", res.status);
      return null;
    }
    
    const data = await res.json();
    const stories = data.hits.map(hit => ({
      title: hit.title,
      points: hit.points,
      comments: hit.num_comments,
      author: hit.author,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      created: hit.created_at_i ? new Date(hit.created_at_i * 1000).toISOString() : null,
      type: hit.type,
    }));
    
    console.error(`  Found ${stories.length} stories`);
    
    return {
      generatedAt: new Date().toISOString(),
      source: "hacker-news",
      stories,
      stats: { totalStories: stories.length },
    };
  } catch (err) {
    console.error("  HN fetch error:", err.message);
    return null;
  }
}

// -- GitHub Trending ----------------------------------------------------------

async function fetchGitHubTrending() {
  console.error("Fetching GitHub Trending...");
  
  try {
    // Use GitHub API to get trending repositories
    const res = await fetch("https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=15", {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/vnd.github.v3+json",
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) {
      console.error("  GitHub API error:", res.status);
      return null;
    }
    
    const data = await res.json();
    const repos = (data.items || []).map(repo => ({
      name: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      url: repo.html_url,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
    }));
    
    console.error(`  Found ${repos.length} repos`);
    
    return {
      generatedAt: new Date().toISOString(),
      source: "github-trending",
      repositories: repos,
      stats: { totalRepos: repos.length },
    };
  } catch (err) {
    console.error("  GitHub fetch error:", err.message);
    return null;
  }
}

// -- Reddit (Public API) ------------------------------------------------------

async function fetchReddit() {
  console.error("Fetching Reddit...");
  
  const subreddits = ["LocalLLaMA", "artificial", "MachineLearning", "openai", "ChatGPT"];
  const allPosts = [];
  
  for (const subreddit of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`, {
        headers: {
          "User-Agent": "follow-builders/1.0 (https://github.com/is361/follow-builders-enhanced)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!res.ok) {
        console.error(`  Reddit r/${subreddit}: HTTP ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      const posts = data.data.children.map(child => child.data);
      
      for (const post of posts) {
        if (post.score >= 50 && !post.stickied) {
          allPosts.push({
            subreddit,
            title: post.title,
            score: post.score,
            comments: post.num_comments,
            author: post.author,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            selftext: post.selftext?.substring(0, 300) || "",
            isSelf: post.isSelf,
            flair: post.link_flair_text,
            created: new Date(post.created * 1000).toISOString(),
          });
        }
      }
      
      console.error(`  r/${subreddit}: ${posts.length} posts`);
    } catch (err) {
      console.error(`  r/${subreddit}: ${err.message}`);
    }
  }
  
  // Sort by score
  allPosts.sort((a, b) => b.score - a.score);
  
  return {
    generatedAt: new Date().toISOString(),
    source: "reddit",
    posts: allPosts.slice(0, 15),
    stats: { totalPosts: allPosts.length, subreddits: subreddits.length },
  };
}

// -- YouTube (Public RSS) ----------------------------------------------------

async function fetchYouTube() {
  console.error("Fetching YouTube...");
  
  const channels = [
    { name: "Lex Fridman", url: "https://www.youtube.com/@lexfridman" },
    { name: "Two Minute Papers", url: "https://www.youtube.com/@TwoMinutePapers" },
    { name: "AI Explained", url: "https://www.youtube.com/@AIExplained" },
  ];
  
  const allVideos = [];
  
  for (const channel of channels) {
    try {
      // Try to get channel ID from page
      const pageRes = await fetch(channel.url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!pageRes.ok) continue;
      
      const html = await pageRes.text();
      const idMatch = html.match(/"channelId":"(UC[A-Za-z0-9_-]{20,})"/);
      
      if (!idMatch) {
        console.error(`  ${channel.name}: Could not find channel ID`);
        continue;
      }
      
      const channelId = idMatch[1];
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      
      const feedRes = await fetch(feedUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!feedRes.ok) continue;
      
      const xml = await feedRes.text();
      
      // Parse XML
      const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
      
      for (const entry of entries.slice(0, 3)) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/);
        const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
        
        if (titleMatch && videoIdMatch) {
          allVideos.push({
            channel: channel.name,
            channelUrl: channel.url,
            title: titleMatch[1].trim(),
            videoId: videoIdMatch[1].trim(),
            url: `https://www.youtube.com/watch?v=${videoIdMatch[1].trim()}`,
            publishedAt: publishedMatch ? new Date(publishedMatch[1].trim()).toISOString() : null,
          });
        }
      }
      
      console.error(`  ${channel.name}: ${entries.length} videos`);
    } catch (err) {
      console.error(`  ${channel.name}: ${err.message}`);
    }
  }
  
  return {
    generatedAt: new Date().toISOString(),
    source: "youtube",
    videos: allVideos.slice(0, 10),
    stats: { totalVideos: allVideos.length, channels: channels.length },
  };
}

// -- Main --------------------------------------------------------------------

async function main() {
  console.error("=== Generating Enhanced Feeds (Simplified) ===\n");
  
  const [hnFeed, githubFeed, redditFeed, youtubeFeed] = await Promise.all([
    fetchHackerNews(),
    fetchGitHubTrending(),
    fetchReddit(),
    fetchYouTube(),
  ]);
  
  // Save feeds
  if (hnFeed) {
    await writeFile(join(OUTPUT_DIR, "feed-hn.json"), JSON.stringify(hnFeed, null, 2));
    console.error("\n✅ feed-hn.json saved");
  }
  
  if (githubFeed) {
    await writeFile(join(OUTPUT_DIR, "feed-github.json"), JSON.stringify(githubFeed, null, 2));
    console.error("✅ feed-github.json saved");
  }
  
  if (redditFeed) {
    await writeFile(join(OUTPUT_DIR, "feed-reddit.json"), JSON.stringify(redditFeed, null, 2));
    console.error("✅ feed-reddit.json saved");
  }
  
  if (youtubeFeed) {
    await writeFile(join(OUTPUT_DIR, "feed-youtube.json"), JSON.stringify(youtubeFeed, null, 2));
    console.error("✅ feed-youtube.json saved");
  }
  
  console.error("\n=== Feed Generation Complete ===");
}

main().catch(err => {
  console.error("Feed generation failed:", err.message);
  process.exit(1);
});
