#!/usr/bin/env node

// ============================================================================
// Follow Builders — YouTube Trending Feed Generator (Local)
// ============================================================================
// Fetches trending AI/tech videos from YouTube.
// Uses YouTube RSS feeds for specific channels.
//
// Usage: node generate-feed-youtube.js
// Output: feed-youtube.json
// ============================================================================

import { writeFile } from "fs/promises";
import { join } from "path";

const SCRIPT_DIR = decodeURIComponent(new URL(".", import.meta.url).pathname);
const OUTPUT_PATH = join(SCRIPT_DIR, "..", "feed-youtube.json");

const AI_YOUTUBE_CHANNELS = [
  { name: "Two Minute Papers", url: "https://www.youtube.com/@TwoMinutePapers" },
  { name: "Lex Fridman", url: "https://www.youtube.com/@lexfridman" },
  { name: "AI Explained", url: "https://www.youtube.com/@AIExplained" },
  { name: "Yannic Kilcher", url: "https://www.youtube.com/@YannicKilcher" },
  { name: "The AI Revolution", url: "https://www.youtube.com/@TheAIREVOLUTION" },
  { name: "Machine Learnia", url: "https://www.youtube.com/@MachineLearnia" },
];

const LOOKBACK_HOURS = 168; // 7 days

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

async function getYouTubeChannelId(channelUrl) {
  if (!channelUrl || !channelUrl.includes("youtube.com")) return null;
  
  const playlistMatch = channelUrl.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (playlistMatch) {
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistMatch[1]}`;
  }
  
  const channelIdMatch = channelUrl.match(/\/channel\/(UC[A-Za-z0-9_-]+)/);
  if (channelIdMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;
  }
  
  if (channelUrl.match(/\/@[A-Za-z0-9_.-]+/)) {
    try {
      const res = await fetch(channelUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      const idMatch = html.match(/"channelId":"(UC[A-Za-z0-9_-]{20,})"/);
      if (idMatch) {
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${idMatch[1]}`;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchYouTubeFeed(feedUrl) {
  if (!feedUrl) return [];
  
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) return [];
    const xml = await res.text();
    
    const videos = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let entryMatch;
    
    while ((entryMatch = entryRegex.exec(xml)) !== null) {
      const block = entryMatch[1];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const videoIdMatch = block.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/);
      const publishedMatch = block.match(/<published>([\s\S]*?)<\/published>/);
      
      if (titleMatch && videoIdMatch) {
        videos.push({
          title: titleMatch[1].trim(),
          videoId: videoIdMatch[1].trim(),
          url: `https://www.youtube.com/watch?v=${videoIdMatch[1].trim()}`,
          publishedAt: publishedMatch ? new Date(publishedMatch[1].trim()).toISOString() : null,
        });
      }
    }
    
    return videos;
  } catch (err) {
    console.error(`    Error fetching feed: ${err.message}`);
    return [];
  }
}

async function main() {
  console.error("Fetching YouTube content...");
  
  const allVideos = [];
  const errors = [];
  
  for (const channel of AI_YOUTUBE_CHANNELS) {
    console.error(`  Fetching ${channel.name}...`);
    
    const feedUrl = await getYouTubeChannelId(channel.url);
    if (!feedUrl) {
      errors.push(`${channel.name}: Could not get YouTube feed URL`);
      continue;
    }
    
    const videos = await fetchYouTubeFeed(feedUrl);
    
    for (const video of videos.slice(0, 3)) {
      allVideos.push({
        channel: channel.name,
        channelUrl: channel.url,
        title: video.title,
        videoId: video.videoId,
        url: video.url,
        publishedAt: video.publishedAt,
      });
    }
    
    if (videos.length === 0) {
      errors.push(`${channel.name}: No videos found`);
    }
  }
  
  // Sort by published date descending
  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Take top 15
  const topVideos = allVideos.slice(0, 15);
  
  const feed = {
    generatedAt: new Date().toISOString(),
    lookbackHours: LOOKBACK_HOURS,
    channels: AI_YOUTUBE_CHANNELS.length,
    videos: topVideos,
    stats: {
      totalVideos: topVideos.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
  
  await writeFile(OUTPUT_PATH, JSON.stringify(feed, null, 2));
  console.error(`  feed-youtube.json: ${topVideos.length} videos from ${AI_YOUTUBE_CHANNELS.length} channels`);
  
  if (errors.length > 0) {
    console.error(`  ${errors.length} errors`);
  }
}

main().catch(err => {
  console.error("YouTube feed generation failed:", err.message);
  process.exit(1);
});
