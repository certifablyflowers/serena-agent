// engage.js — Quote-tweet nursing accounts in Brookey's voice
// Fetches recent posts from critical care accounts, generates takes, posts as Brookey

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { TwitterApi } = require('twitter-api-v2');
const { gemini } = require('../shared/ai');
const logger = require('./logger');

// ── Credentials (read from secrets files, fall back to env) ──────────────────
function readSecret(file, envKey) {
  const filePath = path.join(os.homedir(), '.openclaw', 'secrets', file);
  try { return fs.readFileSync(filePath, 'utf8').trim(); } catch {}
  return process.env[envKey] || null;
}

const xClient = new TwitterApi({
  appKey:       readSecret('x-consumer-key.txt',        'X_CONSUMER_KEY'),
  appSecret:    readSecret('x-consumer-secret.txt',     'X_CONSUMER_SECRET'),
  accessToken:  readSecret('x-access-token.txt',        'X_ACCESS_TOKEN'),
  accessSecret: readSecret('x-access-token-secret.txt', 'X_ACCESS_TOKEN_SECRET'),
});

// ── Nursing accounts to monitor ───────────────────────────────────────────────
const NURSING_ACCOUNTS = [
  { handle: 'Crit_Care',       id: '1617837012' },
  { handle: 'niccjournal',     id: '1202646770737729536' },
  { handle: 'Gyathshammha',    id: '305882906' },
  { handle: 'CriticalCareNow', id: '210653242' },
];

// ── State: track which tweets we've already engaged with ─────────────────────
const STATE_FILE = path.join(__dirname, 'engage-state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  return { engagedTweetIds: [] };
}

function markEngaged(tweetId) {
  const state = loadState();
  if (!state.engagedTweetIds.includes(tweetId)) {
    state.engagedTweetIds.push(tweetId);
    if (state.engagedTweetIds.length > 500) {
      state.engagedTweetIds = state.engagedTweetIds.slice(-500);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
}

function alreadyEngaged(tweetId) {
  return loadState().engagedTweetIds.includes(tweetId);
}

// ── Generate a quote-tweet take in Brookey's voice ────────────────────────────
async function generateTake(originalText) {
  const prompt = `You are Brookey — a 28-year-old CVICU nurse and social media creator.

Someone posted this on X:
"${originalText}"

Write a quote-tweet response in Brookey's voice:
- 1-2 sentences max
- Dry, Gossip Girl narrator register — omniscient, arch, already knows the ending
- CVICU nurse perspective — specific, not generic
- Never says "as a nurse"
- No hashtags
- No em dashes
- Never starts with "I"
- Dark humor welcome, warmth without sentimentality
- Just the response text — no quotes, no annotation`;

  try {
    return await gemini(prompt, { temperature: 0.9, maxTokens: 120 });
  } catch (err) {
    logger.error(`[engage] Gemini failed: ${err.message}`);
    return null;
  }
}

// ── Main: engage all nursing accounts ────────────────────────────────────────
async function engageNursingAccounts() {
  logger.info('[engage] Starting nursing account engagement...');
  let engagedCount = 0;
  const results = [];

  for (const account of NURSING_ACCOUNTS) {
    try {
      const res = await xClient.v2.userTimeline(account.id, { max_results: 5 });
      const tweets = res.data?.data || [];

      for (const tweet of tweets.slice(0, 3)) {
        if (alreadyEngaged(tweet.id)) continue;
        if (tweet.text.startsWith('RT ')) continue; // skip retweets

        const take = await generateTake(tweet.text);
        if (!take) continue;

        const tweetUrl = `https://x.com/${account.handle}/status/${tweet.id}`;
        const fullText = `${take}\n\n${tweetUrl}`;

        // Post via xurl (consistent with existing twitter.js pattern)
        const { tweet: postTweet } = require('./twitter');
        const result = await postTweet(fullText);

        if (result.success) {
          markEngaged(tweet.id);
          engagedCount++;
          results.push({ account: account.handle, tweetId: tweet.id, url: result.url, take });
          logger.info(`[engage] ✅ Quoted @${account.handle} (${tweet.id}): ${result.url}`);
        } else {
          logger.error(`[engage] ❌ Failed on ${tweet.id}: ${result.error}`);
        }

        // Pace between posts — don't burst
        await new Promise(r => setTimeout(r, 8000));
      }
    } catch (err) {
      logger.error(`[engage] Error fetching @${account.handle}: ${err.message}`);
    }
  }

  logger.info(`[engage] Done. ${engagedCount} new quote-tweets posted.`);
  return { engagedCount, results };
}

// ── Add an account to monitor ─────────────────────────────────────────────────
async function addAccount(handle) {
  try {
    const user = await xClient.v2.userByUsername(handle);
    if (!user.data) return { success: false, error: 'Account not found' };
    if (NURSING_ACCOUNTS.find(a => a.handle.toLowerCase() === handle.toLowerCase())) {
      return { success: false, error: 'Already in the list' };
    }
    NURSING_ACCOUNTS.push({ handle: user.data.username, id: user.data.id });
    return { success: true, handle: user.data.username, id: user.data.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function listAccounts() {
  return NURSING_ACCOUNTS.map(a => `@${a.handle}`);
}

module.exports = { engageNursingAccounts, addAccount, listAccounts };
