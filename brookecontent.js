// brookecontent.js — AI content generator using Brooke's brand voice
// Source of truth: Serena_Instructions.docx
// Generates platform-specific captions in Brooke's voice using Gemini
//Generates healthcare video scripts + captions for TikTok  
// Protects Brooke's professional license at all costs

const { gemini } = require('../shared/ai');
const { getTodaysTheme, CAPTION_FORMULA, PLATFORM_RULES, AFFILIATES, pickRandom, VOICE } = require('./brooke');
const { getTrendingTopics, getTikTokTrends } = require('./trends');
const { appendAffiliate, getAffiliateStatus, THEME_TO_PRODUCT } = require('./affiliates');
const fs   = require('fs');
const path = require('path');

// ── Step 8: Post logging ───────────────────────────────────────────────────
const POST_LOG_FILE = path.join(__dirname, 'post-log.json');

function loadPostLog() {
  try { return JSON.parse(fs.readFileSync(POST_LOG_FILE, 'utf8')); } catch { return []; }
}

function logPost(entry) {
  const log = loadPostLog();
  log.push({
    date:      new Date().toISOString(),
    theme:     entry.theme,
    topic:     entry.topic || null,
    platforms: entry.platforms || [],
    urls:      entry.urls || [],
    affiliated: entry.affiliated || null,
  });
  // Keep last 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const trimmed = log.filter(p => new Date(p.date).getTime() > cutoff);
  fs.writeFileSync(POST_LOG_FILE, JSON.stringify(trimmed, null, 2));
}

// ── Step 2: Research trending health/nursing topic ─────────────────────────
async function researchTrendingHealthTopic() {
  try {
    // Pull nursing + health news and TikTok trends in parallel
    const [news, tiktok] = await Promise.all([
      getTrendingTopics().catch(() => []),
      getTikTokTrends().catch(() => ({ trends: [] })),
    ]);

    // Filter for health/nursing relevance
    const healthKeywords = /health|nurse|nursing|medical|hospital|wellness|diet|sleep|stress|pain|heart|blood|cancer|mental|anxiety|depression|vitamin|exercise|covid|flu|drug|medication|surgery|patient|doctor|clinical/i;

    const relevantNews = news.filter(n => healthKeywords.test(n.title || ''));
    const topNews = relevantNews[0] || news[0] || null;

    // TikTok viral health trends
    const ttHealth = tiktok.trends?.filter(t =>
      healthKeywords.test(t.tag || '')
    ).slice(0, 3) || [];

    return {
      topNewsHeadline: topNews?.title || null,
      topNewsSource:   topNews?.source || null,
      tiktokHealthTrends: ttHealth.map(t => t.tag),
      allNews: relevantNews.slice(0, 5),
    };
  } catch {
    return { topNewsHeadline: null, tiktokHealthTrends: [], allNews: [] };
  }
}

// ── Generate full daily content set ───────────────────────────────────────
async function generateDailyContent(trendingNews = []) {
  const theme = getTodaysTheme();

  // Step 2: Research trending health topic (per daily checklist)
  const trendResearch = await researchTrendingHealthTopic();
  const topNews = trendingNews[0]?.title || trendResearch.topNewsHeadline || null;
  const topNewsSource = trendResearch.topNewsSource || null;

  const hook = pickRandom(theme.hooks);
  const example = pickRandom(theme.examples);

  // Use Gemini to generate real content in Brookey's voice
  const prompt = `You are writing content for Brookey — a 28-year-old CVICU nurse and social media creator.

BROOKEY'S VOICE (non-negotiable):
- Gossip Girl narrator register — omniscient, arch, already knows how this ends
- CVICU superiority complex — never announced, just present in the specificity
- Dry and deadpan. Funny without performing funny.
- Specific. Name the drip. Name the vibe. Never vague.
- Never says "as a nurse" — she shows it, doesn't credential it
- Never starts a sentence with "I"
- Never uses "real talk", "nurse friend", "y'all", or any phrase that sounds like an influencer template
- No more than 2 hashtags on X — usually zero
- Never explains the joke. Never asks "can you relate?"

TODAY'S THEME: ${theme.name}
THEME DIRECTION: ${theme.description}
STARTING ANGLE: "${hook}"
TOPIC SEED: "${example}"
${topNews ? `TRENDING TODAY: "${topNews}" — work in if it earns its place` : ''}

GOOD BROOKEY TWEET EXAMPLES (voice reference, do not reuse):
- "The attending said 'good catch' and walked away. That's it. That's the whole thank you."
- "Good morning from the C-V-I-C-U. Where the monitors never stop beeping and neither do I."
- "He was on four pressors. We didn't say it out loud. We didn't have to."
- "Someone called CVICU basically like a regular ICU. Okay."
- "The 3am version of yourself is a completely different nurse. She's better. She's scarier. She doesn't make small talk."

Generate content for ALL FOUR platforms. The X tweet should feel like something Brookey actually said — not a headline.

OUTPUT FORMAT (exactly):
===X===
[tweet under 280 chars — dry, specific, Gossip Girl register. Zero or one hashtag. Never starts with "I".]

===INSTAGRAM===
[150-250 words. Same voice — not a caption template. Line breaks for readability. 6-8 hashtags at the end including #CVICU #NurseLife #ICUnurse]

===TIKTOK===
[1-2 sentence caption that matches the video hook energy. 5-7 hashtags including #fyp #nursesoftiktok #CVICU]
SCRIPT HOOK: [first 2 seconds — what Brookey says out loud to open the video]

===YOUTUBE===
TITLE: [specific, searchable — not "A Nurse Explains", something Brookey would actually title it]
DESCRIPTION: [2 paragraphs + keywords]`;



  try {
    const response = await gemini(prompt, { temperature: 0.75, maxTokens: 1200 });
    return parsePlatformContent(response, theme, hook);
  } catch (err) {
    // Fallback to template-based content if AI fails
    return generateFallbackContent(theme, hook, example);
  }
}

// ── Parse AI response into platform objects ────────────────────────────────
function parsePlatformContent(aiResponse, theme, hook) {
  const sections = {
    x: '',
    instagram: '',
    tiktok: '',
    tiktokHook: '',
    youtube: { title: '', description: '' },
  };

  try {
    const xMatch  = aiResponse.match(/===X===\n([\s\S]*?)(?====|$)/);
    const igMatch = aiResponse.match(/===INSTAGRAM===\n([\s\S]*?)(?====|$)/);
    const ttMatch = aiResponse.match(/===TIKTOK===\n([\s\S]*?)(?=SCRIPT HOOK:|===|$)/);
    const ttHook  = aiResponse.match(/SCRIPT HOOK:\s*(.+)/);
    const ytMatch = aiResponse.match(/===YOUTUBE===\n([\s\S]*?)$/);
    const ytTitle = aiResponse.match(/TITLE:\s*(.+)/);
    const ytDesc  = aiResponse.match(/DESCRIPTION:\s*([\s\S]*?)(?=TITLE:|===|$)/);

    if (xMatch)   sections.x         = xMatch[1].trim();
    if (igMatch)  sections.instagram  = igMatch[1].trim();
    if (ttMatch)  sections.tiktok     = ttMatch[1].trim();
    if (ttHook)   sections.tiktokHook = ttHook[1].trim();
    if (ytTitle)  sections.youtube.title       = ytTitle[1].trim();
    if (ytDesc)   sections.youtube.description = ytDesc[1].trim();
  } catch { /* use what we got */ }

  const themeId = theme.name.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, '');

  // Append affiliate mention if eligible (max 1/day, max 4/week, naturally relevant)
  const xResult  = appendAffiliate(sections.x || `${hook}\n\n${pickRandom(theme.examples)}\n\n#nurse #nurselife #healthtips`, themeId, 'x');
  const igResult = appendAffiliate(sections.instagram || generateFallbackContent(theme, hook, pickRandom(theme.examples)).instagram, themeId, 'tiktok_instagram');

  return {
    theme: theme.name,
    themeId,
    hook,
    x: xResult.caption,
    instagram: igResult.caption,
    tiktok: sections.tiktok || `${hook} #nurse #nursesoftiktok #fyp #healthtips`,
    tiktokHook: sections.tiktokHook || hook,
    youtube: sections.youtube,
    affiliateUsed: xResult.affiliated ? xResult.product : null,
    raw: aiResponse,
  };
}

// ── Fallback template content ──────────────────────────────────────────────
function generateFallbackContent(theme, hook, example) {
  return {
    theme: theme.name,
    hook,
    x: `${example} #CVICU`,
    instagram: `${example}\n\nThis is what the floor actually looks like.\n\n#CVICU #NurseLife #ICUnurse #CriticalCare #NursingTwitter #NursesOfInstagram`,
    tiktok: `${hook} #CVICU #nursesoftiktok #fyp #ICUnurse #NurseLife`,
    tiktokHook: hook,
    youtube: {
      title: `${theme.name} — From the CVICU`,
      description: `${example}\n\nCVICU nurse. 12-hour shifts. This is what it's actually like.\n\n#CVICU #NurseLife #CriticalCare`,
    },
  };
}

// ── Generate morning brief for Telegram ───────────────────────────────────
// Brief also uses the daily content cache — no double generation
async function generateBrookeDailyBrief() {
    // Generate content ONCE — no re-generation with news to save tokens
  const [news, fullContent] = await Promise.all([
    getTrendingTopics().catch(() => []),
    generateDailyContent([]).catch(() => null),
  ]);

  if (!fullContent) return '❌ Content generation failed — check logs.';

  let msg = `👑 *SERENA'S DAILY CONTENT BRIEF*\n`;
  msg += `_${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })}_\n\n`;
  msg += `📅 *Theme: ${fullContent.theme}*\n`;
  msg += `🎣 *Hook: "${fullContent.hook}"*\n\n`;

  msg += `────────────────────\n`;
  msg += `🐦 *X/TWITTER*\n${fullContent.x}\n\n`;

  msg += `────────────────────\n`;
  msg += `📸 *INSTAGRAM*\n${fullContent.instagram?.slice(0, 600)}${fullContent.instagram?.length > 600 ? '...' : ''}\n\n`;

  msg += `────────────────────\n`;
  msg += `🎵 *TIKTOK*\n${fullContent.tiktok}\n`;
  if (fullContent.tiktokHook) msg += `🎣 Video hook: _"${fullContent.tiktokHook}"_\n\n`;

  if (fullContent.youtube?.title) {
    msg += `────────────────────\n`;
    msg += `▶️ *YOUTUBE*\nTitle: ${fullContent.youtube.title}\n\n`;
  }

  msg += `────────────────────\n`;
  msg += `💰 *AFFILIATE STATUS:*\n`;
  const affStatus = getAffiliateStatus();
  const todayThemeId = (getTodaysTheme().name || '').toLowerCase().replace(/[\s&]+/g, '-');
  const eligible = THEME_TO_PRODUCT[todayThemeId] || [];
  if (affStatus.canPostToday) {
    msg += `• ✅ Will mention today (${affStatus.weekCount}/4 this week)\n`;
    if (eligible.length) msg += `• Product: ${eligible[0]} — woven in automatically\n`;
  } else if (affStatus.todayUsed) {
    msg += `• ✅ Already mentioned today\n`;
  } else {
    msg += `• ⏸ Weekly limit (${affStatus.weekCount}/4) — resumes next week\n`;
  }
  msg += `• This week: ${Object.entries(affStatus.productCounts).map(([k,v]) => `${k.replace('compressionSocks','socks')} ×${v}`).join(' | ')}\n\n`;

  msg += `_Serena posts automatically at 9 AM + 11 AM + 6 PM. — 👸_`;
  return msg;
}

module.exports = { generateDailyContent, generateBrookeDailyBrief, logPost, loadPostLog };
