// content.js — Serena's content generation for @BrookeThatRN
// Primary: ICU/Critical Care Nursing | Secondary: Lifestyle (balance, income, wellness, fashion)
// Goal: Audience growth + brand deals

const { getTrendingTopics, getTrendingCrypto, getBTCPrice, getTikTokTrends } = require('./trends');
const { generateNursingBrief, getTodaysPillar } = require('./nursing');

function contentPillars() {
  return `🏛 *BROOKE'S CONTENT PILLARS (@BrookeThatRN)*\n\n` +
    `1️⃣ ICU NURSE LIFE — "What they don't show you on Grey's Anatomy"\n` +
    `   Behind the scenes, shift stories, critical care truths\n\n` +
    `2️⃣ NURSING EDUCATION — "Know this before your next shift"\n` +
    `   Clinical tips, skills, drips, assessments, NCLEX content\n\n` +
    `3️⃣ WORK-LIFE BALANCE — "How I protect my peace on 12s"\n` +
    `   Routines, burnout prevention, self-care, boundaries\n\n` +
    `4️⃣ FINANCIAL FREEDOM — "Nurses deserve more than one income"\n` +
    `   Side income, travel nursing, brand deals, investing basics\n\n` +
    `5️⃣ LIFESTYLE & AESTHETICS — "Yes you can be an ICU nurse and look like this"\n` +
    `   Fashion, wellness, scrubs, beauty, day-in-the-life`;
}

function xThread(topic, angle) {
  return `🐦 *X/TWITTER THREAD*\n\n` +
    `Topic: ${topic}\n\n` +
    `1/ ${angle}\n\n` +
    `2/ Here's what nursing school doesn't prepare you for...\n\n` +
    `3/ After years in the ICU, here's what I actually know:\n` +
    `• [insight one]\n• [insight two]\n• [insight three]\n\n` +
    `4/ What I wish someone had told me as a new nurse:\n\n` +
    `5/ If this helped, follow @BrookeThatRN — ICU nurse sharing what actually happens 🔁\n\n` +
    `_#NurseLife #ICUnurse #NursingTips #CriticalCare #NurseTok_`;
}

function tiktokScript(topic, hook, trendingTags = []) {
  const hashtags = trendingTags.length
    ? trendingTags.slice(0, 5).map(t => `#${t.replace(/^#/, '').replace(/\s+/g, '')}`).join(' ')
    : '#nursetok #icunurse #nurselife #nursing #nursesoftiktok';

  return `🎵 *TIKTOK SCRIPT (Viral Short-Form)*\n\n` +
    `⏱ Target: 30-60 seconds\n\n` +
    `🎣 HOOK (0-3s): "${hook}"\n` +
    `_Why it works: curiosity gap — speaks directly to nurses + healthcare curious viewers_\n\n` +
    `📖 BODY (3-45s):\n` +
    `• The reality of ${topic} that nobody talks about\n` +
    `• What I learned after years in the ICU\n` +
    `• One thing you can do/know TODAY\n\n` +
    `🔚 CTA (last 5s): "Follow for real talk from a real ICU nurse 🩺"\n\n` +
    `🎨 Style: AI visuals + voiceover. No face needed.\n` +
    `📊 Best upload: Tue/Thu/Sun 7-9am or 7-9pm PT\n` +
    `⚡ First 48hrs: reply to every comment to boost distribution\n\n` +
    `${hashtags}`;
}

function instagramCaption(topic) {
  return `📸 *INSTAGRAM CAPTION*\n\n` +
    `${topic} 👇\n\n` +
    `Here's the reality nobody talks about...\n\n` +
    `[3-5 bullet points — real, specific, value-driven]\n\n` +
    `Save this if you're a nurse or know one 🩺\n` +
    `Drop a ❤️ if this hit different.\n\n` +
    `Follow @BrookeThatRN — ICU nurse, real talk, real life 🔔\n\n` +
    `.\n.\n.\n` +
    `#nurselife #icunurse #nursing #nursesofinstagram #criticalcare #nursetok #rnlife #nursingschool #healthcareworker #selfcarenurse`;
}

function youtubeShort(topic, hook) {
  return `▶️ *YOUTUBE SHORT*\n\n` +
    `⏱ Target: 45-60 seconds\n\n` +
    `Title formula: "${topic} (ICU nurse tells the truth)"\n` +
    `CTR tip: Bold text on dark background. Scrubs or aesthetic visual.\n\n` +
    `🎣 HOOK (0-3s): "${hook}"\n` +
    `📖 3 punchy bullets — fast, real, specific\n` +
    `🔚 CTA: "Subscribe — an ICU nurse breaks it down weekly"\n\n` +
    `⚡ First 48hrs: reply to comments, share to Stories + X, add to playlist immediately`;
}

function youtubeFullScript(topic) {
  return `🎬 *YOUTUBE LONG-FORM SCRIPT (8 min)*\n\n` +
    `Topic: ${topic}\n\n` +
    `━━ HOOK (0-30s) ━━\n` +
    `Open with the most shocking or relatable truth about ${topic}.\n` +
    `Example: "I've worked in the ICU for years and ${topic} is the thing nobody warns you about."\n\n` +
    `━━ CREDIBILITY (30-60s) ━━\n` +
    `"I'm Brooke — ICU RN. Here's what I actually know about ${topic}."\n\n` +
    `━━ POINT 1 (1:00-2:00) ━━\n[Clinical insight #1 + story or example]\n\n` +
    `━━ POINT 2 (2:00-3:00) ━━\n[What nursing school doesn't teach about this]\n\n` +
    `━━ POINT 3 (3:00-4:00) ━━\n[The emotional/human side of ${topic}]\n\n` +
    `━━ POINT 4 (4:00-5:00) ━━\n[Practical tip viewers can use or share]\n\n` +
    `━━ POINT 5 (5:00-6:00) ━━\n[What I wish I knew earlier]\n\n` +
    `━━ CTA (last 30s) ━━\n` +
    `"Subscribe for weekly content from an actual ICU nurse. Comment 'ICU' for my free resource."\n\n` +
    `📌 CHAPTERS:\n` +
    `0:00 The truth about ${topic}\n0:30 My background\n` +
    `1:00 Point 1 | 2:00 Point 2 | 3:00 Point 3 | 4:00 Point 4 | 5:00 Point 5\n7:00 What to do next`;
}

function youtubeSEO(topic) {
  return `🔍 *YOUTUBE SEO PACK*\n\n` +
    `━━ LOW COMPETITION KEYWORDS ━━\n` +
    `• "${topic} nurse perspective"\n` +
    `• "ICU nurse explains ${topic}"\n` +
    `• "${topic} for nurses 2025"\n` +
    `• "nursing ${topic} tips"\n` +
    `• "what nurses know about ${topic}"\n\n` +
    `━━ DESCRIPTION TEMPLATE ━━\n` +
    `[Hook — same as video opener]\n\n` +
    `In this video: ✅ [Point 1] ✅ [Point 2] ✅ [Point 3]\n\n` +
    `🔗 Resources: [links] | 📲 @BrookeThatRN everywhere\n\n` +
    `━━ PINNED COMMENT ━━\n` +
    `"What nursing topic do you want me to cover next? 👇 (Free resource in my bio)"`;
}

function affiliateIdeas() {
  return `💰 *BRAND DEAL & MONETIZATION STACK*\n\n` +
    `*Best brand categories for @BrookeThatRN:*\n` +
    `• Scrubs & nursing apparel (FIGS, Jaanuu, Cherokee)\n` +
    `• Medical accessories (stethoscopes, bags, badge reels)\n` +
    `• Wellness & supplements (nurse-focused self-care)\n` +
    `• Coffee & energy (massive authenticity for nurses)\n` +
    `• Finance apps (nurses want passive income)\n` +
    `• Nursing education platforms (CEUs, NCLEX prep)\n\n` +
    `*Digital Products ($0 to create):*\n` +
    `• "ICU Nurse Survival Guide" PDF — $17-$37\n` +
    `• Nursing notes/study templates — $9-$19\n` +
    `• "How I Built Income Outside the Hospital" — $27-$47\n` +
    `• Shift worker self-care routine — $9-$17\n\n` +
    `*Tip: 10K engaged nursing followers > 100K general followers to brands.*`;
}

function thirtyDayCalendar() {
  return `📅 *30-DAY CONTENT CALENDAR — @BrookeThatRN*\n\n` +
    `WEEK 1 — AWARENESS (ICU Nurse Life)\n` +
    `Mon: "Things I do before every ICU shift" — Instagram carousel\n` +
    `Tue: TikTok — shift story hook\n` +
    `Wed: X thread — "What the ICU actually taught me about life"\n` +
    `Thu: YouTube Short — clinical tip\n` +
    `Fri: Lifestyle/aesthetic post\n` +
    `Sun: Poll or community question\n\n` +
    `WEEK 2 — ENGAGEMENT (Work-Life Balance)\n` +
    `Reply to every comment from Week 1\n` +
    `"Day in my life as an ICU nurse"\n` +
    `"Unpopular nursing opinion" — conversation starter\n\n` +
    `WEEK 3 — EDUCATION (Nursing Tips)\n` +
    `Clinical quick tips series\n` +
    `"Things nursing school doesn't teach you"\n` +
    `Trending healthcare topic breakdown\n\n` +
    `WEEK 4 — CONVERSION (Financial Freedom)\n` +
    `"How nurses can earn outside the hospital"\n` +
    `Brand partnership content\n` +
    `Monthly recap + tease next month\n\n` +
    `💡 1 post/day = 365 touchpoints/year. Nurses trust nurses.`;
}

async function generateDailyIdeas() {
  const [topics, trending, prices, tiktok] = await Promise.all([
    getTrendingTopics(),
    getTrendingCrypto(),
    getBTCPrice(),
    getTikTokTrends(),
  ]);

  const topTopic = topics[0]?.title || 'Nursing burnout and how to beat it';
  const hook = `"I've been an ICU nurse for years — here's what nobody tells you about ${topTopic}"`;

  const ttTier1 = tiktok.trends.filter(t => t.tier === 1).slice(0, 2).map(t => t.tag);
  const ttTags = ['nursetok', 'icunurse', 'nurselife', ...ttTier1];
  const ttHook = `"As an ICU nurse, here's my take on ${topTopic}"`;

  let msg = `👑 *BROOKE'S DAILY CONTENT BRIEF*\n\n`;
  msg += `_@BrookeThatRN | ICU Nurse · Lifestyle · Real Talk_\n\n`;

  if (tiktok.trends.length) {
    const ttDisplay = tiktok.trends.slice(0, 4).map(t =>
      `#${t.tag.replace(/\s+/g, '').slice(0, 25)}`
    ).join(' ');
    msg += `🎵 *TIKTOK HOT:* ${ttDisplay}\n`;
    msg += `_📊 Confidence: ${tiktok.confidence}_\n\n`;
  }

  msg += `*TODAY'S CONTENT TOPIC:*\n📰 ${topTopic}\n\n`;
  msg += `────────────────────\n`;
  msg += xThread(topTopic, `I've worked in the ICU for years. ${topTopic} is the thing nobody warns you about.`) + '\n\n';
  msg += `────────────────────\n`;
  msg += tiktokScript(topTopic, ttHook, ttTags) + '\n\n';
  msg += `────────────────────\n`;
  msg += instagramCaption(topTopic) + '\n\n';
  msg += `────────────────────\n`;
  msg += youtubeShort(topTopic, hook) + '\n\n';
  msg += `────────────────────\n`;
  msg += youtubeFullScript(topTopic) + '\n\n';
  msg += `────────────────────\n`;
  msg += youtubeSEO(topTopic) + '\n\n';
  msg += `────────────────────\n`;
  msg += contentPillars() + '\n\n';
  msg += `────────────────────\n`;
  msg += affiliateIdeas() + '\n\n';
  msg += `────────────────────\n`;
  msg += thirtyDayCalendar() + '\n\n';

  if (tiktok.news?.length) {
    msg += `────────────────────\n`;
    msg += `🎵 *TIKTOK INTEL:*\n`;
    tiktok.news.slice(0, 3).forEach(n => {
      msg += `• [${n.title}](${n.link}) — _${n.source}_\n`;
    });
    msg += '\n';
  }

  msg += `_1 post/day = 365 touchpoints/year. Nurses trust nurses. — Serena 👑_\n\n`;
  return msg;
}

async function generateEveningRecap() {
  const [topics, trending, tiktok] = await Promise.all([
    getTrendingTopics(),
    getTrendingCrypto(),
    getTikTokTrends(),
  ]);

  let msg = `🌙 *BROOKE'S EVENING RECAP*\n\n`;
  msg += `_What blew up today — post about this tomorrow:_\n\n`;
  msg += `*📰 TOP STORIES:*\n`;
  topics.slice(0, 5).forEach((t, i) => { msg += `${i + 1}. [${t.title}](${t.link})\n`; });

  if (tiktok.trends.length) {
    msg += `\n*🎵 TIKTOK TREND REPORT:*\n_📊 ${tiktok.confidence} confidence_\n\n`;
    const tier1 = tiktok.trends.filter(t => t.tier === 1);
    if (tier1.length) {
      msg += `*🔥 Verified trending:*\n`;
      tier1.slice(0, 5).forEach((t, i) => { msg += `${i + 1}. #${t.tag}\n`; });
    }
    const ttAngle = tiktok.trends[0]?.tag;
    if (ttAngle) msg += `\n💡 *TikTok angle for tomorrow:* Tie "${ttAngle}" to nursing/ICU for maximum reach.\n`;
  }

  msg += `\n💡 *Tomorrow's play:* Pick the #1 story + nursing angle. Post on all 4 platforms.\n`;
  const pillar = getTodaysPillar();
  msg += `\n*🏥 NURSING PILLAR TOMORROW:* ${pillar.name}\n_Angle: "${pillar.hooks[0]}"_\n`;
  msg += `\n_Consistency is the only strategy that works. — Serena 👑_`;
  return msg;
}

function fmtNum(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

module.exports = { generateDailyIdeas, generateEveningRecap };
