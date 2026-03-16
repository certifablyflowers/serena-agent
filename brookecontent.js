// brookecontent.js — AI content generator using Brooke's brand voice
// Source of truth: Serena_Instructions.docx
// Generates platform-specific captions in Brooke's voice using Gemini
//Generates healthcare video scripts + captions for TikTok  
// Protects Brooke's professional license at all costs

const { gemini } = require('../shared/ai');
const { getTodaysTheme, CAPTION_FORMULA, PLATFORM_RULES, AFFILIATES, pickRandom, VOICE } = require('./brooke');
const { getTikTokTrends, getNursingTopics } = require('./trends');
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

// ── CVICU topic bank — used when no external nursing news is available ──────
const CVICU_TOPIC_BANK = [
  'What an IABP waveform actually tells you at 3am',
  'The moment you realize a patient is turning — before the numbers do',
  'Managing a post-CABG bleed when the attending is in the elevator',
  'Four pressors and a family waiting in the hall',
  'When the balloon pump alarm is the calmest sound in the room',
  'Titrating vasoactives is not a protocol, it\'s a conversation with the patient',
  'The resident who was confidently wrong and the nurse who said nothing until it mattered',
  'Night shift CVICU: what happens between 3am and 5am when everyone is stable',
  'How CVICU nurses know before the monitor does',
  'The difference between a bad rhythm and a bad patient',
];

// ── Step 2: Research trending nursing/healthcare topic ─────────────────────
async function researchTrendingHealthTopic() {
  try {
    const [nursingNews, tiktok] = await Promise.all([
      getNursingTopics().catch(() => []),
      getTikTokTrends().catch(() => ({ trends: [] })),
    ]);

    const topNews = nursingNews[0] || null;

    // TikTok health trends only
    const NURSING_TIKTOK = /nurs|health|medical|hospital|icu|doctor|wellness|fitness|mental.health/i;
    const ttHealth = tiktok.trends?.filter(t =>
      NURSING_TIKTOK.test(t.tag || '')
    ).slice(0, 3) || [];

    // If no nursing news found, pull from CVICU topic bank
    const cvicuFallback = !topNews
      ? CVICU_TOPIC_BANK[Math.floor(Math.random() * CVICU_TOPIC_BANK.length)]
      : null;

    return {
      topNewsHeadline: topNews?.title || null,
      topNewsSource:   topNews?.source || null,
      tiktokHealthTrends: ttHealth.map(t => t.tag),
      cvicuFallbackTopic: cvicuFallback,
    };
  } catch {
    const cvicuFallback = CVICU_TOPIC_BANK[Math.floor(Math.random() * CVICU_TOPIC_BANK.length)];
    return { topNewsHeadline: null, tiktokHealthTrends: [], cvicuFallbackTopic: cvicuFallback };
  }
}

// ── Generate full daily content set ───────────────────────────────────────
async function generateDailyContent(trendingNews = []) {
  const theme = getTodaysTheme();

  // Step 2: Research trending health topic (per daily checklist)
  const trendResearch = await researchTrendingHealthTopic();
  const topNews = trendingNews[0]?.title || trendResearch.topNewsHeadline || null;
  const topNewsSource = trendResearch.topNewsSource || null;
  const cvicuTopic = trendResearch.cvicuFallbackTopic || null;

  const hook = pickRandom(theme.hooks);
  const example = pickRandom(theme.examples);

  // Use Gemini to generate real content in Brookey's voice
  const topicLine = topNews
    ? `NURSING NEWS TODAY: "${topNews}"${topNewsSource ? ` (${topNewsSource})` : ''} — use if it earns its place`
    : `CVICU TOPIC: "${cvicuTopic}" — write from Brookey's direct experience`;

  const prompt = `You are writing content for Brookey — a 28-year-old CVICU nurse.

VOICE — READ THIS CAREFULLY:
Brookey is the Gossip Girl narrator of nursing. Omniscient, dry, arch. She already knows how the story ends. She has a quiet CVICU superiority complex — not because she announces it, but because she names the balloon pump waveform instead of saying "medical equipment." She posts one observation and leaves. No threads. No CTAs. No "follow me for more."

BANNED PHRASES — if any of these appear, start over:
- "real talk" / "real talk from a real nurse" / "real ICU nurse"
- "as a nurse" / "as an ICU nurse"
- "here's what nursing school doesn't teach you"
- "follow for more" / "follow me" / "save this"
- "nurses, you get it" / "can you relate" / "tag a nurse"
- "y'all" / "bestie" / "girlie"
- Any sentence starting with "I"
- Any question at the end designed to farm engagement

GOOD TWEET EXAMPLES — this is the register:
"The attending said 'good catch' and walked away. That's it. That's the whole thank you."
"Good morning from the C-V-I-C-U. Where the monitors never stop beeping and neither do I."
"He was on four pressors. We didn't say it out loud. We didn't have to."
"Someone called CVICU basically like a regular ICU. Okay."
"Three balloon pumps, one attending, zero parking spots. Tuesday."
"The 3am version of yourself is a completely different nurse. She's better. She's scarier."

TODAY'S THEME: ${theme.name}
ANGLE: "${hook}"
SEED: "${example}"
${topicLine}

OUTPUT FORMAT (exactly):
===X===
[One dry observation, under 280 chars. Zero hashtags unless one genuinely fits. No CTA. No question. Never starts with "I".]

===INSTAGRAM===
[Same voice, 100-200 words. A few sentences that build on each other. No caption formula. No hook-value-CTA structure. Just Brookey talking. 5-6 hashtags at the end: #CVICU #NurseLife #ICUnurse #CriticalCare #NursingTwitter]

===TIKTOK===
[1 sentence caption. 5-6 hashtags including #fyp #nursesoftiktok #CVICU]
SCRIPT HOOK: [first 2 seconds — what Brookey actually says to open the video, in her voice]

===YOUTUBE===
TITLE: [specific, not generic — what this video is actually about, from a CVICU nurse's POV]
DESCRIPTION: [2 paragraphs, Brookey's voice, + relevant keywords]`;



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
    getNursingTopics().catch(() => []),
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
