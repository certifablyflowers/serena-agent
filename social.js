// social.js — Serena's multi-platform posting engine via upload-post.com
// Platforms: X, Instagram, YouTube (connected) | TikTok (pending approval)
// Profile: NerdGGTeam
//
// HARD RULES:
//   - Never post without explicit content — no blanks, no templates as-is
//   - Every post attempt logged with result
//   - Failures reported immediately, never silent
//   - X also has xurl as fallback if upload-post fails

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

const API_KEY  = fs.readFileSync(path.join(os.homedir(), '.openclaw/secrets/uploadpost-api-key.txt'), 'utf8').trim();
const BASE_URL = 'https://api.upload-post.com/api';
const PROFILE  = 'NerdGGTeam';

// ── Platform availability ──────────────────────────────────────────────────
const PLATFORMS = {
  x:         { connected: true,  type: 'text+image', name: 'X/Twitter' },
  instagram: { connected: true,  type: 'image+video', name: 'Instagram' },
  youtube:   { connected: true,  type: 'video',       name: 'YouTube' },
  tiktok:    { connected: true, type: 'video',       name: 'TikTok', note: 'Pending approval' },
};

function getConnectedPlatforms(type = 'text') {
  return Object.entries(PLATFORMS)
    .filter(([_, p]) => p.connected)
    .filter(([_, p]) => {
      if (type === 'text') return p.type.includes('text');
      if (type === 'image') return p.type.includes('image');
      if (type === 'video') return p.type.includes('video');
      return true;
    })
    .map(([key]) => key);
}

// ── Core: Post Text ────────────────────────────────────────────────────────
async function postText(text, platforms = null, options = {}) {
  const targetPlatforms = platforms || getConnectedPlatforms('text');
  if (!targetPlatforms.length) throw new Error('No connected text platforms available');

  logger.info(`[social] Posting text to: ${targetPlatforms.join(', ')}`);

  const form = new FormData();
  form.append('user', PROFILE);
  targetPlatforms.forEach(p => form.append('platform[]', p));
  form.append('title', text.slice(0, 280)); // X limit

  if (options.scheduledDate) {
    form.append('scheduled_date', options.scheduledDate);
    form.append('timezone', 'America/Los_Angeles');
  }

  try {
    const res = await axios.post(`${BASE_URL}/upload_text`, form, {
      headers: { 'Authorization': `Apikey ${API_KEY}`, ...form.getHeaders() },
      timeout: 30000,
    });

    const results = res.data?.results || {};
    const summary = [];

    for (const [platform, result] of Object.entries(results)) {
      if (result.success) {
        logger.info(`[social] ✅ ${platform}: ${result.url || result.post_id}`);
        summary.push({ platform, success: true, url: result.url, id: result.post_id });
      } else {
        logger.error(`[social] ❌ ${platform}: ${result.error || 'unknown error'}`);
        summary.push({ platform, success: false, error: result.error });
      }
    }

    return { success: true, results: summary };
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    logger.error(`[social] postText failed: ${detail}`);

    // X fallback via xurl
    if (targetPlatforms.includes('x')) {
      logger.info('[social] Falling back to xurl for X...');
      try {
        const { tweet } = require('./twitter');
        const fallback = await tweet(text);
        if (fallback.success) {
          logger.info(`[social] xurl fallback ✅: ${fallback.url}`);
          return { success: true, results: [{ platform: 'x', success: true, url: fallback.url, fallback: true }] };
        }
      } catch (fbErr) {
        logger.error(`[social] xurl fallback also failed: ${fbErr.message}`);
      }
    }

    throw new Error(detail);
  }
}

// ── Core: Post Image ───────────────────────────────────────────────────────
async function postImage(imageUrl, caption, platforms = null) {
  const targetPlatforms = platforms || getConnectedPlatforms('image');
  if (!targetPlatforms.length) throw new Error('No connected image platforms available');

  logger.info(`[social] Posting image to: ${targetPlatforms.join(', ')}`);

  const form = new FormData();
  form.append('user', PROFILE);
  targetPlatforms.forEach(p => form.append('platform[]', p));
  form.append('title', caption.slice(0, 2200));
  form.append('media_url', imageUrl);

  try {
    const res = await axios.post(`${BASE_URL}/upload_photos`, form, {
      headers: { 'Authorization': `Apikey ${API_KEY}`, ...form.getHeaders() },
      timeout: 60000,
    });

    const results = res.data?.results || {};
    const summary = [];
    for (const [platform, result] of Object.entries(results)) {
      if (result.success) {
        logger.info(`[social] ✅ ${platform}: ${result.url || result.post_id}`);
        summary.push({ platform, success: true, url: result.url });
      } else {
        logger.error(`[social] ❌ ${platform}: ${result.error}`);
        summary.push({ platform, success: false, error: result.error });
      }
    }
    return { success: true, results: summary };
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    logger.error(`[social] postImage failed: ${detail}`);
    throw new Error(detail);
  }
}

// ── Post Formats (platform-specific content) ──────────────────────────────

// X/Twitter: short punchy tweet (max 280 chars)
async function postTweet(text) {
  const trimmed = text.slice(0, 280);
  return postText(trimmed, ['x']);
}

// Instagram: caption with hashtags (image required for best reach, text fallback)
async function postInstagram(caption, imageUrl = null) {
  if (imageUrl) {
    return postImage(imageUrl, caption, ['instagram']);
  }
  // Instagram doesn't support text-only — skip if no image
  logger.warn('[social] Instagram requires an image — skipping text-only post');
  return { success: false, skipped: true, reason: 'Instagram requires image' };
}

// Post to all connected text platforms simultaneously
async function postAll(text, options = {}) {
  return postText(text, null, options);
}

// ── Format Results for Telegram Notification ──────────────────────────────
function formatPostResults(results) {
  if (!results?.results?.length) return '❌ No results';
  return results.results.map(r => {
    if (r.success) return `✅ ${r.platform}${r.url ? ': ' + r.url : ''}${r.fallback ? ' (xurl fallback)' : ''}`;
    if (r.skipped) return `⏭️ ${r.platform}: ${r.reason}`;
    return `❌ ${r.platform}: ${r.error}`;
  }).join('\n');
}

module.exports = { postText, postImage, postTweet, postInstagram, postAll, formatPostResults, PLATFORMS };
