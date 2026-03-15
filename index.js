// hollie disabled
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const config = require('./config');
const { generateDailyIdeas, generateEveningRecap } = require('./content');
const { generateNursingBrief, NURSING_PILLARS } = require('./nursing');
const { buildFailureReport, wrapWithReporting } = require('../shared/failureReporter');
const { postAll, postTweet, formatPostResults } = require('./social');
const { createAndPostDailyImage, generateImage, postImageToSocials } = require('./imagegen');
const { createAndPostVideo } = require('./videogen');
const { generateBrookeDailyBrief, generateDailyContent, logPost } = require('./brookecontent');
const { getTodaysTheme } = require('./brooke');

// ── Daily content cache — generate ONCE, reuse all day ────────────────────
let _dailyContentCache = null;
let _dailyCacheDate    = null;

async function getDailyContent() {
  const today = new Date().toISOString().slice(0, 10);
  if (_dailyContentCache && _dailyCacheDate === today) {
    return _dailyContentCache; // cache hit — zero tokens
  }
  const content = await generateDailyContent();
  _dailyContentCache = content;
  _dailyCacheDate    = today;
  return content;
}
const { tweet, thread } = require('./twitter');
const { engageNursingAccounts, addAccount, listAccounts } = require('./engage');
const { getTrendingTopics, getTrendingCrypto, getBTCPrice, getTikTokTrends } = require('./trends');

const { createBot } = require('../shared/telegramBot');
const bot = createBot(config.botToken, 'Serena');
const { getDashboard, wrapAiWithTracking } = require('../shared/tokenTracker');
wrapAiWithTracking('serena');

async function send(chatId, msg) {
  // Split long messages if needed (Telegram 4096 char limit)
  const chunks = [];
  let remaining = msg;
  while (remaining.length > 4000) {
    const splitAt = remaining.lastIndexOf('\n', 4000);
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt + 1);
  }
  chunks.push(remaining);

  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
  }
}

// Daily 8 AM content brief — Brooke's brand voice
cron.schedule(config.morningIdeasCron, async () => {
  console.log('Sending morning content brief...');
  const { result: msg, failed, report } = await wrapWithReporting('Serena', 'Morning Content Brief', generateBrookeDailyBrief);
  if (failed) {
    await send(config.chatId, report);
  } else {
    await send(config.chatId, msg);
  }
}, { timezone: config.timezone });

// Daily 8 PM evening recap
cron.schedule(config.eveningWrapCron, async () => {
  console.log('Sending evening recap...');
  const { result: msg, failed, report } = await wrapWithReporting('Serena', 'Evening Recap', generateEveningRecap);
  if (failed) {
    await send(config.chatId, report);
  } else {
    await send(config.chatId, msg);
  }
}, { timezone: config.timezone });

// /usage — token budget dashboard (available on all agents)
bot.onText(/\/usage/, async (msg) => {
  const dashboard = getDashboard();
  await send(msg.chat.id, dashboard);
});

// Commands
bot.onText(/\/start/, async (msg) => {
  await send(msg.chat.id,
    `👑 *Hey, I'm Serena.*\n\n` +
    `I'm your social media content agent. Two content pillars, one brand:\n\n` +
    `🔥 *Crypto + AI* — market intel turned into content\n` +
    `🏥 *Nursing* — ICU perspective on finance, AI in healthcare, shift life, burnout\n\n` +
    `*What I do:*\n` +
    `• 📋 8 AM daily — full content brief: crypto + nursing scripts for all 4 platforms\n` +
    `• 🌙 8 PM daily — trending recap + tomorrow's nursing pillar\n` +
    `• 💰 Affiliate + monetization built into both pillars\n\n` +
    `*Commands:*\n` +
    `/ideas — Full daily brief\n` +
    `/autopost — Post text to all platforms now\n` +
    `/postimage — Generate + post image now\n` +
    `/postvideo — Generate + post video now\n` +
    `/nursing — Nursing content brief\n` +
    `/tiktok — TikTok trend report\n` +
    `/recap — Tonight's recap\n` +
    `/engage — Quote-tweet nursing accounts now\n` +
    `/addaccount <handle> — Add account to monitor\n` +
    `/accounts — List monitored accounts\n` +
    `/start — This message`
  );
});

bot.onText(/\/ideas/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '👑 _Pulling today\'s content brief..._', { parse_mode: 'Markdown' });
  const { result, failed, report } = await wrapWithReporting('Serena', '/ideas Command', generateDailyIdeas);
  await send(msg.chat.id, failed ? report : result);
});

bot.onText(/\/recap/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '🌙 _Pulling evening recap..._', { parse_mode: 'Markdown' });
  const { result, failed, report } = await wrapWithReporting('Serena', '/recap Command', generateEveningRecap);
  await send(msg.chat.id, failed ? report : result);
});

bot.onText(/\/money/, async (msg) => {
  await send(msg.chat.id,
    `💰 *MONETIZATION ROADMAP*\n\n` +
    `*Phase 1 — This week (free):*\n` +
    `• Sign up for Coinbase, Kraken, Ledger affiliate programs\n` +
    `• Add affiliate links to all your bio sections\n` +
    `• Start posting 1x/day on X — threads perform best\n\n` +
    `*Phase 2 — Month 1:*\n` +
    `• Create one digital product (checklist or guide) — sell for $9-$27\n` +
    `• Use Gumroad (free) to sell it\n` +
    `• Promote in every post\n\n` +
    `*Phase 3 — Month 2-3:*\n` +
    `• TikTok + YouTube Shorts for reach (no face needed)\n` +
    `• Build email list via free lead magnet\n` +
    `• Launch paid newsletter or community ($5-15/mo)\n\n` +
    `*Realistic income targets:*\n` +
    `• Month 1: $100-500 (affiliates)\n` +
    `• Month 2: $500-1500 (affiliates + digital products)\n` +
    `• Month 3: $1500-3000 (all streams)\n\n` +
    `_The $16K goal is achievable. It just takes consistency. — Serena 👑_`
  );
});

// /milestones — income milestone tracker (Part 4)
bot.onText(/\/milestones/, async (msg) => {
  const log = loadPostLog ? loadPostLog() : [];
  const totalPosts = log.length;
  const last7 = log.filter(p => new Date(p.date).getTime() > Date.now() - 7*24*60*60*1000).length;

  await send(msg.chat.id,
    `📊 *BROOKE'S GROWTH MILESTONES*\n\n` +
    `*Platform Ad Revenue Targets:*\n` +
    `• YouTube: 1,000 subs + 4,000 watch hrs → Partner Program 💰\n` +
    `• TikTok: 10,000 followers + 100k views/30d → Creator Fund\n` +
    `• Instagram: Stay consistent → Reels bonus (auto-invite)\n` +
    `• X: 500+ followers + Premium → Ad revenue share\n\n` +
    `*Brand Deals:*\n` +
    `• At 5,000+ followers on ANY platform → Serena starts sending brand pitch emails\n` +
    `• Nurse niche = 2-3x premium rates vs lifestyle creators\n\n` +
    `*Affiliate Programs (pending approval):*\n` +
    `• BetterHelp — $100+/referral (applied)\n` +
    `• FIGS Scrubs — 10-15% (DM sent)\n` +
    `• Calm App — TBD (applied)\n\n` +
    `*Content Stats:*\n` +
    `• Total posts logged: ${totalPosts}\n` +
    `• Posts this week: ${last7}\n\n` +
    `_Serena tracks every post. Consistency = growth. 👸_`
  );
});

// /postlog — see recent post history
bot.onText(/\/postlog/, async (msg) => {
  const { loadPostLog } = require('./brookecontent');
  const log  = loadPostLog();
  const last7 = log.slice(-7).reverse();
  if (!last7.length) { await bot.sendMessage(msg.chat.id, '📋 No posts logged yet.'); return; }
  let out = `📋 *RECENT POSTS (last ${last7.length}):*\n\n`;
  last7.forEach(p => {
    const date = new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
    out += `• ${date} — ${p.theme}${p.affiliated ? ` 💰 ${p.affiliated}` : ''}\n`;
    if (p.urls?.length) out += `  ${p.urls[0]}\n`;
  });
  await send(msg.chat.id, out);
});

// /nursing — on-demand nursing content brief
bot.onText(/\/nursing(?:\s+(.+))?/, async (msg, match) => {
  const pillarArg = match?.[1]?.trim().toLowerCase();
  await bot.sendMessage(msg.chat.id, '🏥 _Building your nursing content brief..._', { parse_mode: 'Markdown' });

  if (pillarArg) {
    const pillarMatch = NURSING_PILLARS.find(p =>
      p.id.includes(pillarArg) ||
      p.name.toLowerCase().includes(pillarArg) ||
      p.crossover === pillarArg
    );
    if (!pillarMatch) {
      const pillarList = NURSING_PILLARS.map(p => `• \`${p.id}\` — ${p.name}`).join('\n');
      await bot.sendMessage(msg.chat.id,
        `❓ Pillar not found. Available pillars:\n\n${pillarList}\n\nExample: /nursing burnout`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
  }

  const { result, failed, report } = await wrapWithReporting('Serena', '/nursing Command', generateNursingBrief);
  await send(msg.chat.id, failed ? report : result);
});

// /tiktok — on-demand TikTok trend report
bot.onText(/\/tiktok/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '🎵 _Scraping TikTok trends..._', { parse_mode: 'Markdown' });
  const { result: tt, failed, report } = await wrapWithReporting('Serena', 'TikTok Trends Fetch', getTikTokTrends);
  if (failed) {
    await send(msg.chat.id, report);
    return;
  }

  let out = `🎵 *TIKTOK TREND REPORT*\n`;
  out += `📊 *Confidence:* ${tt.confidence}\n\n`;

  const tier1 = tt.trends.filter(t => t.tier === 1);
  const tier2 = tt.trends.filter(t => t.tier === 2);

  if (tier1.length) {
    out += `*🔥 Trending Now:*\n`;
    tier1.slice(0, 6).forEach((t, i) => {
      const stat = t.posts ? ` — ${fmtNum(t.posts)} posts` : t.views ? ` — ${t.views} views` : '';
      out += `${i + 1}. *#${t.tag}*${stat}\n`;
    });
  }

  if (tier2.length) {
    out += `\n*📡 Also Surfacing:*\n`;
    tier2.slice(0, 6).forEach(t => {
      const eng = t.views && !isNaN(t.views) ? ` [${t.views}]` : '';
      out += `• ${t.tag}${eng} _(${t.source})_\n`;
    });
  }

  if (!tt.trends.length) {
    out += `⚠️ _No trend data retrieved — TikTok is rate-limiting. Try again in a few minutes._\n`;
  }

  if (tt.news?.length) {
    out += `\n*📰 TikTok in the News:*\n`;
    tt.news.slice(0, 4).forEach(n => {
      out += `• [${n.title}](${n.link}) — _${n.source}_\n`;
    });
  }

  out += `\n👁 *Content tip:* Cross the top trend with a crypto/AI angle — that's where your audience lives.\n`;
  out += `\n_Serena 👑 | /ideas for your full content brief_`;
  await send(msg.chat.id, out);
});

function fmtNum(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// /engage — quote-tweet nursing accounts now
bot.onText(/\/engage/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '💬 _Engaging nursing accounts..._', { parse_mode: 'Markdown' });
  try {
    const { engagedCount, results } = await engageNursingAccounts();
    if (!engagedCount) {
      await send(msg.chat.id, '💬 Nothing new to engage — all recent posts already covered.');
      return;
    }
    const summary = results.map(r => `✅ @${r.account}\n_"${r.take.slice(0, 80)}"_\n${r.url}`).join('\n\n');
    await send(msg.chat.id, `💬 *Posted ${engagedCount} quote-tweet${engagedCount > 1 ? 's' : ''}*\n\n${summary}`);
  } catch (err) {
    await send(msg.chat.id, `❌ Engagement failed: ${err.message}`);
  }
});

// /addaccount <handle> — add a nursing account to monitor
bot.onText(/\/addaccount (.+)/, async (msg, match) => {
  const handle = match[1].replace('@', '').trim();
  await bot.sendMessage(msg.chat.id, `🔍 Looking up @${handle}...`);
  const result = await addAccount(handle);
  if (result.success) {
    await send(msg.chat.id, `✅ *@${result.handle}* added to the engagement list.`);
  } else {
    await send(msg.chat.id, `❌ Couldn't add @${handle}: ${result.error}`);
  }
});

// /accounts — list monitored nursing accounts
bot.onText(/\/accounts/, async (msg) => {
  const accounts = listAccounts();
  await send(msg.chat.id, `💬 *Monitored accounts (${accounts.length}):*\n\n${accounts.join('\n')}`);
});

// /tweet <text> — post directly to X
bot.onText(/\/tweet (.+)/, async (msg, match) => {
  const text = match[1];
  await bot.sendMessage(msg.chat.id, `📤 Posting to @BrookeThatRN...`);
  const result = await tweet(text);
  if (result.success) {
    await send(msg.chat.id, `✅ *Posted!*\n${result.url}`);
  } else {
    await send(msg.chat.id, `❌ Failed: ${result.error}`);
  }
});

// ── Social post generator ──────────────────────────────────────────────────
async function generateAndPost() {
  const [trending, prices, tiktok] = await Promise.all([
    getTrendingCrypto(),
    getBTCPrice(),
    getTikTokTrends(),
  ]);

  const top    = trending[0]?.symbol || 'BTC';
  const btc    = prices?.bitcoin;
  const change = btc?.usd_24h_change;
  const dir    = change >= 0 ? '📈' : '📉';

  // Rotate through humor banks for variety
  const { HUMOR } = require('./nursing');
  const humorBanks = ['cryptoCrossover', 'darkRelatability', 'nightShift', 'nurseFinance'];
  const bank = humorBanks[new Date().getDay() % humorBanks.length];
  const jokes = HUMOR[bank];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];

  // Build post text
  let text;
  if (change != null) {
    text = `${dir} BTC ${change >= 0 ? '+' : ''}${change.toFixed(1)}% today.\n\n${joke}\n\n#nurse #nursetok #crypto #bitcoin #nursefinance #ICUnurse`;
  } else {
    text = `${joke}\n\n${top} is moving. Nurses — the market doesn't care about your shift schedule. Start building.\n\n#nurse #nursetok #crypto #nursefinance`;
  }

  return text;
}

// /autopost — post to all connected platforms now
bot.onText(/\/autopost/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '👑 _Generating and posting to all platforms..._', { parse_mode: 'Markdown' });
  try {
    const text = await generateAndPost();
    const result = await postAll(text);
    const summary = formatPostResults(result);
    await send(msg.chat.id, `✅ *Posted to all platforms!*\n\n"${text.slice(0,100)}..."\n\n${summary}`);
  } catch (err) {
    await send(msg.chat.id, `❌ Post failed: ${err.message}`);
  }
});

// /autotweet — X only
bot.onText(/\/autotweet/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '🐦 _Generating tweet..._', { parse_mode: 'Markdown' });
  try {
    const text = await generateAndPost();
    const result = await postTweet(text);
    const xResult = result.results?.[0];
    await send(msg.chat.id, `✅ *Posted to X!*\n\n"${text.slice(0,120)}"\n\n${xResult?.url || ''}`);
  } catch (err) {
    await send(msg.chat.id, `❌ Tweet failed: ${err.message}`);
  }
});

// ── Daily auto-post at 9 AM Pacific — Brooke's voice, all platforms ───────
cron.schedule('0 9 * * *', async () => {
  console.log('[serena] Auto-posting to all platforms (Brooke brand)...');
  try {
    const content = await getDailyContent();
    const result  = await postAll(content.x);
    const summary = formatPostResults(result);
    const urls    = result.results?.filter(r => r.success).map(r => r.url).filter(Boolean) || [];
    console.log('[serena] Daily post:', summary.replace(/\n/g, ' | '));

    // Step 8: Log the post
    logPost({ theme: content.theme, topic: content.hook, platforms: ['x'], urls, affiliated: content.affiliateUsed });

    await send(config.chatId,
      `👸 *Serena posted*\n\nTheme: ${content.theme}\n\n"${content.x.slice(0, 120)}"\n\n${summary}`
    );
  } catch (err) {
    await send(config.chatId, buildFailureReport('Serena', 'Daily Auto-Post (9 AM)', err));
  }
}, { timezone: config.timezone });

// ── Daily image post at 11 AM Pacific — Instagram + X ─────────────────────
cron.schedule('0 11 * * *', async () => {
  console.log('[serena] Generating and posting daily image...');
  try {
    const prices = await getBTCPrice();
    const btcChange = prices?.bitcoin?.usd_24h_change ?? null;
    const { results, caption } = await createAndPostDailyImage(btcChange);
    const urls    = results.filter(r => r.success).map(r => r.url).filter(Boolean);
    const urlStr  = results.filter(r => r.success).map(r => `${r.platform}: ${r.url}`).join('\n');
    logPost({ theme: 'image', topic: caption.headline || caption.joke, platforms: results.map(r=>r.platform), urls });
    await send(config.chatId,
      `🖼 *Serena posted an image*\n\n"${(caption.headline || caption.joke || '').slice(0, 80)}"\n\n${urlStr}`
    );
  } catch (err) {
    await send(config.chatId, buildFailureReport('Serena', 'Daily Image Post (11 AM)', err));
  }
}, { timezone: config.timezone });

// /postvideo — generate and post video on demand
bot.onText(/\/postvideo/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '🎬 _Generating video... this takes ~2 minutes_', { parse_mode: 'Markdown' });
  try {
    const content = await getDailyContent();
    const { results, script } = await createAndPostVideo(content);
    const urls    = results.filter(r => r.success).map(r => `✅ ${r.platform}: ${r.url}`).join('\n');
    const failed  = results.filter(r => !r.success).map(r => `❌ ${r.platform}: ${r.error}`).join('\n');
    await send(msg.chat.id,
      `🎬 *Video posted!*\n\n"${script.title}"\n\n${urls}${failed ? '\n' + failed : ''}`
    );
  } catch (err) {
    await send(msg.chat.id, `❌ Video failed: ${err.message}`);
  }
});

// /postimage — generate and post image on demand
bot.onText(/\/postimage/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '🎨 _Generating image and posting..._', { parse_mode: 'Markdown' });
  try {
    const prices = await getBTCPrice();
    const btcChange = prices?.bitcoin?.usd_24h_change ?? null;
    const { results, caption, imagePath } = await createAndPostDailyImage(btcChange);
    const urls = results.filter(r => r.success).map(r => `✅ ${r.platform}: ${r.url}`).join('\n');
    const failed = results.filter(r => !r.success).map(r => `❌ ${r.platform}: ${r.error}`).join('\n');
    await send(msg.chat.id,
      `🖼 *Image posted!*\n\n"${(caption.headline || caption.joke || '').slice(0, 80)}"\n\n${urls}${failed ? '\n' + failed : ''}`
    );
  } catch (err) {
    await send(msg.chat.id, `❌ Image post failed: ${err.message}`);
  }
});

// ── Daily nursing engagement at 10 AM Pacific ─────────────────────────────
cron.schedule('0 10 * * *', async () => {
  console.log('[serena] Engaging nursing accounts...');
  try {
    const { engagedCount, results } = await engageNursingAccounts();
    if (engagedCount > 0) {
      const summary = results.map(r => `✅ @${r.account}: ${r.url}`).join('\n');
      await send(config.chatId,
        `💬 *Serena engaged ${engagedCount} nursing post${engagedCount > 1 ? 's' : ''}*\n\n${summary}`
      );
    }
  } catch (err) {
    await send(config.chatId, buildFailureReport('Serena', 'Nursing Engagement (10 AM)', err));
  }
}, { timezone: config.timezone });

// ── Weekly video post — Wednesdays 2 PM Pacific ────────────────────────────
cron.schedule('0 14 * * 3', async () => {
  console.log('[serena] Generating weekly video...');
  try {
    const content = await getDailyContent();
    const { results, script } = await createAndPostVideo(content);
    const urls = results.filter(r => r.success).map(r => `✅ ${r.platform}: ${r.url}`).join('\n');
    await send(config.chatId,
      `🎬 *Serena posted a video!*\n\n"${script.title}"\n\n${urls}`
    );
  } catch (err) {
    await send(config.chatId, buildFailureReport('Serena', 'Weekly Video Post (Wed 2 PM)', err));
  }
}, { timezone: config.timezone });

// ── Evening post at 6 PM Pacific — Brooke's voice ─────────────────────────
cron.schedule('0 18 * * *', async () => {
  console.log('[serena] Evening social post (Brooke brand)...');
  try {
    const theme  = getTodaysTheme();
    const hook   = theme.hooks[Math.floor(Math.random() * theme.hooks.length)];
    const text   = `${hook}\n\n${theme.examples[0]}\n\n#nurse #nurselife #healthtips #wellness #RN`;
    const result = await postAll(text);
    const summary = formatPostResults(result);
    console.log('[serena] Evening post:', summary.replace(/\n/g, ' | '));
  } catch (err) {
    await send(config.chatId, buildFailureReport('Serena', 'Evening Auto-Post (6 PM)', err));
  }
}, { timezone: config.timezone });

// ── Conversational AI handler — natural language ───────────────────────────
const { processMessage, detectIntent } = require('../shared/conversational');
const { downloadTelegramPhoto, processImage, generateImage: geminiProcessImage, sendImage, detectImageIntent } = require('../shared/imageHandler');

// ── Photo handler — Serena can receive and work with images ────────────────
bot.on('photo', async (msg) => {
  const fromId = String(msg.chat?.id || '');
  if (fromId !== '6157070475') return;

  bot.sendChatAction(msg.chat.id, 'upload_photo').catch(() => {});
  await bot.sendMessage(msg.chat.id, '📸 Got it! Working on it...').catch(() => {});

  try {
    // Get largest photo version
    const photo   = msg.photo[msg.photo.length - 1];
    const caption = msg.caption || '';
    const intent  = detectImageIntent(caption);

    // Download the photo
    const inputPath = await downloadTelegramPhoto(bot, photo.file_id);

    // Process with Gemini
    const outputPath = processImage(inputPath, intent.prompt, '2K');

    // Send back
    await sendImage(bot, msg.chat.id, outputPath, `✅ Done! Action: ${intent.action.replace(/_/g, ' ')}`);

    // Clean up input
    try { require('fs').unlinkSync(inputPath); } catch {}
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `❌ Couldn't process that image: ${err.message.slice(0, 150)}\n\nTry sending it with a caption like "make realistic" or "make it a social post"`).catch(() => {});
  }
});

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  const fromId = String(msg.chat?.id || '');
  if (fromId !== '6157070475') return;

  // Show typing indicator
  bot.sendChatAction(msg.chat.id, 'typing').catch(() => {});

  // Check for action intent — trigger command automatically if clear
  const intent = detectIntent('serena', msg.text);

  try {
    // Intent fires FIRST — no AI for action requests
    // Handle post approval
    if (/^post it$/i.test(msg.text.trim()) && global.pendingVideo) {
      const { videoPath, script, dailyContent } = global.pendingVideo;
      global.pendingVideo = null;
      await bot.sendMessage(msg.chat.id, '📤 Posting now...').catch(() => {});
      const { postVideo, buildYouTubeDescription } = require('./videogen');
      const ytDesc = buildYouTubeDescription(dailyContent);
      const results = await postVideo(videoPath, script.title, ytDesc, ['youtube', 'instagram', 'x', 'tiktok']);
      const posted = results.filter(r => r.success).map(r => r.platform).join(', ');
      await bot.sendMessage(msg.chat.id, posted ? `✅ Posted to: ${posted}` : '❌ Post failed — check logs').catch(() => {});
      return;
    }

    if (/^skip$/i.test(msg.text.trim()) && global.pendingVideo) {
      global.pendingVideo = null;
      await bot.sendMessage(msg.chat.id, '🗑 Video discarded.').catch(() => {});
      return;
    }

    if (intent === 'video') {
      await bot.sendMessage(msg.chat.id, '🎬 Generating video — sending for your approval before posting...').catch(() => {});
      const dailyContent = await getDailyContent();
      const { videoPath, script } = await createAndPostVideo(dailyContent, { dryRun: true });
      await bot.sendVideo(msg.chat.id, videoPath, {
        caption: `🎬 *${script.title}*

Reply *post it* to publish everywhere, or *skip* to discard.`,
        parse_mode: 'Markdown'
      }).catch(() => {});
      global.pendingVideo = { videoPath, script, dailyContent };
      return;
    }

    if (intent === 'image') {
      await bot.sendMessage(msg.chat.id, '🖼 Generating image now...').catch(() => {});
      const { results, caption } = await createAndPostDailyImage(null);
      const posted = results.filter(r => r.success).map(r => r.platform).join(', ');
      await bot.sendMessage(msg.chat.id, posted ? `✅ Image posted to: ${posted}` : '❌ Image post failed').catch(() => {});
      return;
    }

    if (intent === 'brief') {
      const { result, failed, report } = await wrapWithReporting('Serena', 'On-demand brief', generateBrookeDailyBrief);
      await send(msg.chat.id, failed ? report : result);
      return;
    }

    // Fall through to AI only if no action intent
    const reply = await processMessage('serena', msg.chat.id, msg.text);
    await bot.sendMessage(msg.chat.id, reply).catch(() =>
      bot.sendMessage(msg.chat.id, reply.replace(/[*_`\[\]()]/g, ''))
    );
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `Sorry, something went wrong: ${err.message.slice(0, 100)}`).catch(() => {});
  }
});

console.log(`[${new Date().toISOString()}] 👑 Serena agent started.`);
console.log(`Daily brief: 8 AM Pacific | Evening recap: 8 PM Pacific`);

// Send startup message
bot.sendMessage(config.chatId,
  `👸 *Serena is online.*\n\n` +
  `Brooke is ready. Princess of the ICU — all the knowledge, none of the paperwork.\n\n` +
  `• 📋 *8 AM* — daily content brief\n` +
  `• 📱 *9 AM* — auto-post to X\n` +
  `• 💬 *10 AM* — engage nursing accounts\n` +
  `• 🖼 *11 AM* — image post to Instagram + X\n` +
  `• 🌙 *6 PM* — evening post\n\n` +
  `/ideas | /autopost | /engage | /postimage`,
  { parse_mode: 'Markdown' }
).catch(console.error);
