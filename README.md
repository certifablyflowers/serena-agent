# Serena Agent

Autonomous social media agent for the Brookey persona — a 28-year-old CVICU nurse and content creator. Serena runs 24/7, generates content in Brookey's voice, posts across platforms, and engages with the critical care nursing community on X.

## What Serena Does

| Time | Job |
|------|-----|
| 8:00 AM | Daily content brief → Telegram |
| 9:00 AM | Auto-post to X (Brooke brand voice) |
| 10:00 AM | Engage nursing accounts — quote-tweet with Brookey takes |
| 11:00 AM | Image post to Instagram + X |
| 2:00 PM (Wed) | Weekly video post to all platforms |
| 6:00 PM | Evening post |
| 8:00 PM | Evening recap → Telegram |

## Architecture

```
index.js          — Entry point, Telegram bot, cron scheduler
social.js         — Multi-platform text/image posting via upload-post.com
twitter.js        — X posting via xurl CLI (fallback chain)
engage.js         — Nursing account engagement (fetch timelines, quote-tweet)
videogen.js       — Avatar video generation + posting
imagegen.js       — Image generation + posting
brookecontent.js  — AI content generation in Brookey's voice
brooke.js         — Brand voice, themes, content pillars
nursing.js        — Nursing content pillars and humor banks
content.js        — Daily brief and evening recap generation
trends.js         — TikTok trend scraping
affiliates.js     — Affiliate program management
logger.js         — Winston logging
config.js         — Cron schedule, timezone, platform config
```

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/ideas` | Full daily content brief |
| `/autopost` | Post to all platforms now |
| `/autotweet` | Post to X only |
| `/postimage` | Generate and post image |
| `/postvideo` | Generate and post video |
| `/nursing` | Nursing content brief |
| `/tiktok` | TikTok trend report |
| `/recap` | Evening recap |
| `/engage` | Quote-tweet nursing accounts now |
| `/addaccount <handle>` | Add account to engagement list |
| `/accounts` | List monitored accounts |
| `/tweet <text>` | Post directly to X |
| `/postlog` | Recent post history |
| `/milestones` | Growth milestone tracker |
| `/usage` | Token budget dashboard |

## Setup

### Secrets

All credentials live in `~/.openclaw/secrets/`:

```
social-bot-token.txt          — Telegram bot token
uploadpost-api-key.txt        — upload-post.com API key
x-consumer-key.txt            — X API consumer key
x-consumer-secret.txt         — X API consumer secret
x-access-token.txt            — X API access token
x-access-token-secret.txt     — X API access token secret
```

### Install & Start

```bash
npm install
pm2 start index.js --name serena
pm2 logs serena
```

## Platforms

- **X/Twitter** — via xurl CLI + upload-post.com fallback
- **Instagram** — via upload-post.com
- **TikTok** — via upload-post.com
- **YouTube** — via upload-post.com
- **Telegram** — control interface

## Nursing Engagement

`engage.js` monitors these critical care accounts and posts Brookey-voice quote-tweets on their recent content:

- `@Crit_Care`
- `@niccjournal`
- `@Gyathshammha`
- `@CriticalCareNow`

Add more with `/addaccount <handle>` in Telegram. Engaged tweet IDs are tracked in `engage-state.json` to prevent double-posting.
