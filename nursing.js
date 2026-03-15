// nursing.js — Nursing content engine for Serena
// Pillar: ICU nurse perspective on finance, AI in healthcare, shift life, burnout recovery
// Brand voice: Sharp, dark humor, exhausted-but-thriving energy. No sugarcoating.
// Brand rule: FACELESS. No hospital name, no real name, no patient details ever.

const RSSParser = require('rss-parser');
const parser = new RSSParser();
const { generateTikTokScript, generateTwitterThread } = require('../shared/ai');

// ── Nursing RSS Feeds ──────────────────────────────────────────────────────
const NURSING_FEEDS = [
  { url: 'https://www.nursingworld.org/rss/', name: 'ANA NursingWorld', tier: 1 },
  { url: 'https://www.medscape.com/rss/nurses', name: 'Medscape Nursing', tier: 1 },
  { url: 'https://www.healthcarefinancenews.com/rss.xml', name: 'Healthcare Finance News', tier: 1 },
  { url: 'https://hitconsultant.net/feed/', name: 'HIT Consultant (Health AI)', tier: 1 },
  { url: 'https://www.fiercehealthcare.com/rss/xml', name: 'Fierce Healthcare', tier: 2 },
  { url: 'https://nurseslabs.com/feed/', name: 'Nurses Labs', tier: 2 },
  { url: 'https://travelingwithkrissy.com/feed/', name: 'Travel Nurse Blog', tier: 2 },
];

// ── Humor Banks ────────────────────────────────────────────────────────────
// Organized by tone and situation. Pull randomly within each set.

const HUMOR = {

  // Relatable nurse dark humor — the stuff that goes viral
  darkRelatability: [
    'I can start an IV on the first try in the dark but I cannot figure out why I\'m still broke.',
    'My coworkers asked how I stay calm under pressure. 20 years in the ICU. The market crashing is literally nothing.',
    'Charted "patient tolerated procedure well" and "I checked my crypto portfolio mid-shift" in the same hour.',
    'The hospital gave us a pizza party for Nurses Week. I gave myself a Bitcoin wallet. We are not the same.',
    'I\'ve coded patients and watched charts go to zero. Only one of those actually scared me.',
    'They say nurses are resilient. Yeah. We also have a 12% match on our 403b that we never touch. Different kind of strong.',
    'My coworker asked why I look so calm. Babe, I\'ve had 6 patients, one crash, and a BTC dip — all before noon.',
    'Nursing school taught me to assess, prioritize, and delegate. Crypto taught me to do all of that with my rent money.',
    'The doctor said "it\'s not that serious." I said that about my savings account too. We were both wrong.',
    'Day 1 of nursing: I will help people. Day 3,000: I will also help myself to compound interest.',
  ],

  // Night shift specific — the sacred suffering
  nightShift: [
    'It\'s 3am. My patient is stable. My portfolio is not. This is fine.',
    'Night shift teaches you that time is fake, sleep is optional, and your 401k needs attention.',
    '3am thoughts: what if I just... didn\'t come back tomorrow. (I will. I always do. But still.)',
    'I peaked at my crypto at 0300. Went up. Cried a little. Charted. Nobody will ever know.',
    'Night shift diet: coffee, spite, and the knowledge that I\'m getting paid while crypto compounds.',
    'Me at 0200 explaining to my patient why they can\'t have their phone: very calm, very professional.\nMe at 0201 checking my portfolio: absolutely unhinged.',
    'Night shifters understand time differently. The market opens at 9:30am and we are still technically awake.',
    '7am handoff. Survived another one. Logged into my brokerage account before I even got to my car.',
  ],

  // Nurse × crypto crossover — the brand sweet spot
  cryptoCrossover: [
    'I monitor vitals and I monitor charts. One pays me hourly. One pays me while I sleep.',
    'ICU nurse skill set: stay calm in a crisis, read data fast, make decisions under pressure. Wall Street hires people for that. I do it in scrubs.',
    'My patients stabilize. My portfolio oscillates. Both require the same energy: patience and not panicking.',
    'They told me to diversify. I have 3 jobs, 2 investments, and a TikTok account. Diversified.',
    'Running a drip and running a DCA strategy simultaneously. This is fine. This is called multitasking.',
    'The hospital doesn\'t offer equity. So I bought some myself.',
    'A nurse\'s risk tolerance: calculated. I\'ve seen what happens when people YOLO. I\'m not doing that with my body OR my money.',
    'Shift ends. Market opens. The second job begins. No scrubs required.',
    'I give my patients the best care possible. I give my portfolio the same energy. Consistent, evidence-based, no gambling.',
    'My coworker asked what I do on my days off. Invest. Sleep. Repeat. Not necessarily in that order.',
  ],

  // AI in nursing — skeptical but curious
  aiHumor: [
    'Hospital just rolled out AI documentation. It charted "patient resting comfortably" during a code. We are not replacing nurses yet.',
    'AI said the diagnosis was X. I said hold on. It was Y. I\'ve been doing this for 20 years. The algorithm has not.',
    'They said AI would make nursing easier. It made the charting longer. Same as every other "upgrade."',
    'AI can read a chest X-ray in 0.3 seconds. It cannot hold someone\'s hand at 3am. I have thoughts about this.',
    'The hospital\'s new AI tool costs $2M. Nurses asked for a raise. You know how this ends.',
    'I\'m not afraid of AI replacing me. I\'m afraid of AI replacing me and the hospital keeping the savings.',
    'New AI model can predict patient deterioration. I\'ve been doing that since 2004 with just vibes and labs. Respect.',
    'AI in healthcare is real and coming fast. That\'s why I started learning about it NOW — not when it\'s too late.',
  ],

  // Burnout — honest but not hopeless
  burnout: [
    'Burned out doesn\'t mean done. It means the system extracted too much and didn\'t put anything back.',
    'I didn\'t leave nursing. I left the bedside. There is a difference and more of us need to talk about it.',
    'The hospital will replace you in 2 weeks. Your mental health takes longer. Act accordingly.',
    'Boundaries aren\'t selfish. They\'re how you stay in this career for 20 years instead of 5.',
    'I used to stay late every shift. Now I clock out on time and invest the difference in energy into myself. Both are still caring.',
    '"You\'re so strong" is not a compensation package.',
    'If the hospital treated equipment the way it treats nurses, JCAHO would shut them down immediately.',
    'Rest is not weakness. It\'s maintenance. Even the best machines need it. Especially the ones doing ICU work.',
  ],

  // Financial reality of nursing — relatable + motivating
  nurseFinance: [
    'I make good money and I still live like I\'m one missed shift away from disaster. That ends now.',
    'Nobody in nursing school mentioned the pay, the debt, OR that you could build wealth while doing this job.',
    'Student loans, rent, and a 403b nobody explained to me. I figured it out anyway. You can too.',
    'Travel nursing pays 2-3x. The math is not complicated. The decision is.',
    'I started investing on a nurse\'s salary. It\'s slower than I wanted and faster than doing nothing.',
    'The hospital gets billing rates. I get hourly. I\'m working on changing that ratio.',
    'Nurses have incredible job security. We just forgot to use that stability to build actual wealth.',
    'Overtime is not a financial strategy. It\'s a stopgap. I learned this the hard way.',
  ],
};

// ── Content Pillars ────────────────────────────────────────────────────────
const NURSING_PILLARS = [
  {
    id: 'financial-freedom',
    name: 'Nurses & Financial Freedom',
    description: 'Side hustles, investing, escaping living paycheck to paycheck on a nursing salary',
    hooks: [
      'I made more from crypto last month than I did in overtime — as an ICU nurse',
      'Nobody tells nurses this about building wealth',
      'I work 3 days a week and I\'m building a second income — here\'s how',
      'Nurses are burned out AND broke — this is how I\'m fixing both',
      'What I wish someone had told me about money when I started nursing',
    ],
    humorBank: 'nurseFinance',
    hashtags: ['nurse', 'nurselife', 'nursinglife', 'nursefinance', 'sidehustle', 'passiveincome', 'financialfreedom', 'nursetok'],
    crossover: 'crypto',
  },
  {
    id: 'ai-in-healthcare',
    name: 'AI Is Coming for Healthcare',
    description: 'AI tools nurses actually use, what AI means for the profession, honest takes',
    hooks: [
      'AI just changed how I document — here\'s what actually happened',
      'As an ICU nurse, here\'s my honest take on AI in healthcare',
      'The AI tool my hospital just rolled out — breakdown from a nurse\'s perspective',
      'They said AI would replace nurses. Here\'s what\'s actually happening.',
      'AI is doing this in hospitals right now and most people don\'t know',
    ],
    humorBank: 'aiHumor',
    hashtags: ['nurse', 'nursetok', 'AIhealthcare', 'healthtech', 'nursinglife', 'AItools', 'medicaltok', 'healthcareworker'],
    crossover: 'ai',
  },
  {
    id: 'shift-life',
    name: 'Shift Life Reality',
    description: 'Night shifts, 12-hour shifts, work-life balance, real talk about bedside nursing',
    hooks: [
      'Day 3 of night shifts. Here\'s how I actually recover.',
      'What a 12-hour ICU shift actually looks like (no sugarcoating)',
      'Things they don\'t teach you in nursing school',
      'The part of nursing nobody posts about',
      'My night shift survival routine — 20 years in ICU',
    ],
    humorBank: 'nightShift',
    hashtags: ['nurse', 'nurselife', 'nightshift', 'ICUnurse', 'nursinglife', 'nursetok', 'healthcareworker', 'shiftwork'],
    crossover: null,
  },
  {
    id: 'burnout-recovery',
    name: 'Burnout & Mental Health',
    description: 'Nurse burnout is real — honest content about recovery, boundaries, leaving bedside',
    hooks: [
      'I almost quit nursing after 15 years. What stopped me.',
      'Burnout isn\'t weakness — here\'s what\'s actually happening to your nervous system',
      'How I stopped dreading going to work',
      'The moment I realized I needed to change something',
      'Setting boundaries as a nurse without guilt',
    ],
    humorBank: 'burnout',
    hashtags: ['nurse', 'nurselife', 'nursingburnout', 'nursetok', 'mentalhealthmatters', 'healthcareworker', 'selfcare', 'nursestruggles'],
    crossover: null,
  },
  {
    id: 'travel-nursing',
    name: 'Travel Nursing & Income',
    description: 'Travel nursing as a wealth-building tool, housing stipends, tax implications',
    hooks: [
      'Travel nurses make HOW much? Breaking down the actual numbers',
      'I looked into travel nursing. Here\'s the real math.',
      'Housing stipends, tax-free money, and why travel nursing is actually smart',
      'The financial case for travel nursing nobody talks about',
    ],
    humorBank: 'nurseFinance',
    hashtags: ['travelnurse', 'travelnursing', 'nurselife', 'nursetok', 'nursinglife', 'nursefinance', 'healthcarejobs'],
    crossover: 'crypto',
  },
  {
    id: 'nurse-side-hustles',
    name: 'Nurse Side Hustles',
    description: 'Real ways nurses make extra money — legal nurse consulting, education, content creation',
    hooks: [
      'Side hustles that actually work for nurses (from a nurse who does them)',
      'How nurses are making $500-$2000/month outside of bedside',
      'Legal nurse consulting: what it is and how to start',
      'I started creating content as a nurse. Here\'s what happened.',
      'The side hustle that fits a 3-day nursing schedule',
    ],
    humorBank: 'darkRelatability',
    hashtags: ['nurse', 'nursetok', 'nursesidehustle', 'nursinglife', 'sidehustle', 'passiveincome', 'nursefinance', 'workfromhome'],
    crossover: 'crypto',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickHumor(pillar, override = null) {
  const bank = override || pillar.humorBank || 'darkRelatability';
  return pick(HUMOR[bank] || HUMOR.darkRelatability);
}

function pickCrossoverJoke(cryptoTrend) {
  const jokes = HUMOR.cryptoCrossover;
  return pick(jokes);
}

// ── Fetch Nursing News ─────────────────────────────────────────────────────
async function getNursingNews() {
  const results = [];
  const seen = new Set();

  await Promise.allSettled(NURSING_FEEDS.map(async (feed) => {
    try {
      const f = await parser.parseURL(feed.url);
      f.items.slice(0, 3).forEach(item => {
        const key = (item.title || '').toLowerCase().slice(0, 60);
        if (!seen.has(key) && item.title) {
          seen.add(key);
          results.push({
            title: item.title.trim(),
            link: item.link,
            summary: item.contentSnippet?.slice(0, 200) || '',
            pubDate: item.pubDate || item.isoDate || null,
            source: feed.name,
            tier: feed.tier,
          });
        }
      });
    } catch { /* feed down, skip */ }
  }));

  results.sort((a, b) => a.tier - b.tier);
  return results.slice(0, 10);
}

// ── Pillar Rotation ────────────────────────────────────────────────────────
function getTodaysPillar() {
  const day = new Date().getDay();
  const rotation = [
    'financial-freedom',  // Sun
    'ai-in-healthcare',   // Mon
    'shift-life',         // Tue
    'financial-freedom',  // Wed
    'nurse-side-hustles', // Thu
    'ai-in-healthcare',   // Fri
    'burnout-recovery',   // Sat
  ];
  return NURSING_PILLARS.find(p => p.id === rotation[day]) || NURSING_PILLARS[0];
}

// ── Content Generators (with humor woven in) ───────────────────────────────

function nursingXThread(pillar, newsHeadline, cryptoTrend) {
  const hook     = pick(pillar.hooks);
  const joke     = pickHumor(pillar);
  const hashtags = pillar.hashtags.slice(0, 5).map(h => `#${h}`).join(' ');

  // Crypto crossover tweet if applicable
  const crossoverTweet = pillar.crossover === 'crypto' && cryptoTrend
    ? `4/ Real talk: ${pick(HUMOR.cryptoCrossover)}\n\n`
    : pillar.crossover === 'ai'
    ? `4/ ${pick(HUMOR.aiHumor)}\n\n`
    : `4/ What this means for nurses trying to build financial security:\n\n`;

  return `🐦 *X/TWITTER THREAD — NURSING*\n\n` +
    `Topic: ${pillar.name}\n\n` +
    `1/ ${hook}\n\n` +
    `2/ ${joke}\n\n` +
    `3/ ${newsHeadline
      ? `The news: "${newsHeadline.slice(0, 80)}" — as an ICU nurse, here's my actual take`
      : `What 20 years in the ICU actually teaches you about this`}\n\n` +
    crossoverTweet +
    `5/ Follow if you're a nurse who's done with surviving and ready to start building 🔁\n\n` +
    `_${hashtags}_`;
}

function nursingTikTokScript(pillar, trendingTags = [], cryptoTrend = null) {
  const hook  = pick(pillar.hooks);
  const joke  = pickHumor(pillar);
  const xjoke = pillar.crossover ? pickCrossoverJoke(cryptoTrend) : null;

  const nursingTags = pillar.hashtags.slice(0, 4).map(h => `#${h}`).join(' ');
  const trendTags   = trendingTags.slice(0, 2).map(t => `#${t.replace(/^#/, '').replace(/\s+/g, '')}`).join(' ');
  const hashtags    = `${nursingTags} ${trendTags}`.trim();

  return `🎵 *TIKTOK SCRIPT — NURSING*\n\n` +
    `⏱ Target: 30-60 seconds\n` +
    `📌 Pillar: ${pillar.name}\n\n` +
    `🎣 HOOK (0-3s):\n"${hook}"\n\n` +
    `😂 HUMOR BEAT (3-8s — say this deadpan):\n"${joke}"\n\n` +
    `📖 PIVOT (8-45s):\n` +
    `• But seriously — here's the reality\n` +
    `• What I actually did about it\n` +
    `• The one thing you can do TODAY\n` +
    (xjoke ? `\n💸 CROSSOVER MOMENT (optional, 20-30s):\n"${xjoke}"\n` : '') +
    `\n🔚 CTA (last 5s):\n"Follow if you're a nurse building something outside bedside"\n\n` +
    `🎨 Style: Text on screen + AI voiceover. Trending audio if available.\n` +
    `No face. No hospital ID. No patient details.\n` +
    `${hashtags}`;
}

function nursingInstagramCaption(pillar, newsHeadline, cryptoTrend) {
  const hook  = pick(pillar.hooks);
  const joke  = pickHumor(pillar);
  const hashtags = [
    ...pillar.hashtags,
    'icunurse', 'nursemoney', 'healthcareworker', 'nursehumor',
  ].slice(0, 15).map(h => `#${h}`).join(' ');

  const body = newsHeadline
    ? `Real news today: "${newsHeadline.slice(0, 100)}"\n\nAs an ICU nurse, here's my honest reaction:`
    : `Here's what 20 years in the ICU actually looks like:`;

  return `📸 *INSTAGRAM — NURSING*\n\n` +
    `${hook} 👇\n\n` +
    `${body}\n\n` +
    `"${joke}"\n\n` +
    `Save this post. Come back when you need a reminder you're not alone in this.\n\n` +
    `Follow for nurse finance + real talk (with a side of humor) 🔔\n\n` +
    `.\n.\n.\n` +
    `${hashtags}`;
}

function nursingYouTubeShort(pillar, cryptoTrend) {
  const hook = pick(pillar.hooks);
  const joke = pickHumor(pillar);

  return `▶️ *YOUTUBE SHORT — NURSING*\n\n` +
    `⏱ Target: 45-60 seconds\n\n` +
    `Title: "${hook}"\n\n` +
    `🎣 HOOK (on screen, first 2s): "${hook}"\n\n` +
    `😂 HUMOR (say it deadpan, 3-5s): "${joke}"\n\n` +
    `📖 MEAT: 3 bullets — real, specific, no fluff\n` +
    `🔚 CTA: "Subscribe — weekly content for nurses building wealth outside bedside"\n\n` +
    `💡 Style: Bold text on dark/clean background. AI voiceover.\n` +
    `⚠️ No real patient stories. Composite examples only.`;
}

// ── Humor-Only Content (standalone viral format) ───────────────────────────
// The "just the joke" format — highest engagement, lowest effort
function nursingHumorPost(pillar, cryptoTrend = null) {
  // Decide which humor type to feature
  let jokeType, label;
  if (pillar.crossover === 'crypto' && cryptoTrend && Math.random() > 0.4) {
    jokeType = 'cryptoCrossover';
    label    = `Nursing × Crypto`;
  } else if (pillar.id === 'shift-life' || Math.random() > 0.6) {
    jokeType = 'nightShift';
    label    = `Night Shift Life`;
  } else {
    jokeType = pillar.humorBank || 'darkRelatability';
    label    = pillar.name;
  }

  const jokes = [pick(HUMOR[jokeType]), pick(HUMOR[jokeType])];
  // Make sure we don't accidentally pick the same one twice
  while (jokes[0] === jokes[1]) jokes[1] = pick(HUMOR[jokeType]);

  const tags = [...pillar.hashtags.slice(0, 3), 'nursehumor', 'nursetok', 'nurselife']
    .map(h => `#${h}`).join(' ');

  return `😂 *HUMOR POST (high-engagement format)*\n\n` +
    `_Theme: ${label}_\n\n` +
    `*Option A — Single punchline:*\n` +
    `"${jokes[0]}"\n\n` +
    `*Option B — Two-parter:*\n` +
    `"${jokes[0]}"\n\n` +
    `"${jokes[1]}"\n\n` +
    `📌 Post as-is on TikTok (text on screen), X (thread starter), or IG (carousel slide 1).\n` +
    `Why it works: nurses share content that makes them feel seen. This is that.\n\n` +
    `${tags} #nursehumor #darkhumor`;
}

function nursingAffiliates() {
  return `💰 *NURSING-SPECIFIC MONETIZATION*\n\n` +
    `*Affiliate Programs for Nurses:*\n` +
    `• Figs / Scrubs & Beyond — uniform affiliate, 8-10% commission\n` +
    `• NurseGrid (scheduling app) — nurse-specific, easy sell\n` +
    `• Calm / Headspace — burnout angle, 20-30% commission\n` +
    `• Coursera / Udemy — CE courses, 15% commission\n` +
    `• Amazon nurse gear — stethoscopes, badge reels, tote bags\n\n` +
    `*Digital Products Nurses Will Actually Buy:*\n` +
    `• "ICU Nurse's Guide to Side Hustles" — $17-$37\n` +
    `• "Building Wealth on a 3-Day Work Week" — $9-$27\n` +
    `• Shift schedule + budget Notion template — $7-$15\n` +
    `• "AI Tools Every Nurse Should Know" guide — $9-$19\n\n` +
    `*The Humor Angle Monetizes Too:*\n` +
    `• Nurse humor merch (mugs, shirts) — Redbubble, zero upfront cost\n` +
    `• "Nurse Brain" digital sticker packs — $3-$7, impulse buy\n` +
    `• Patreon for "the unfiltered version" — nurses will pay for realness`;
}

function crossoverAngle(pillar, cryptoTrend) {
  if (!pillar.crossover || !cryptoTrend) return null;
  const joke = pickCrossoverJoke(cryptoTrend);

  if (pillar.crossover === 'crypto') {
    return `💡 *CROSSOVER ANGLE (Nursing × Crypto):*\n` +
      `Hook: "I'm an ICU nurse and I use ${cryptoTrend} to build wealth on my days off — here's exactly how"\n` +
      `Humor beat: "${joke}"\n` +
      `Why it works: trusted voice (nurse) + underserved audience (nurses who want wealth) + relatable humor = viral formula.`;
  }

  if (pillar.crossover === 'ai') {
    return `💡 *CROSSOVER ANGLE (Nursing × AI):*\n` +
      `Hook: "As an ICU nurse, here's what AI actually looks like inside a hospital right now"\n` +
      `Humor beat: "${pick(HUMOR.aiHumor)}"\n` +
      `Why it works: healthcare AI is everywhere. A real nurse's skeptical-but-curious take is rare content.`;
  }

  return null;
}

// ── Master Nursing Brief ───────────────────────────────────────────────────
async function generateNursingBrief(trendingTags = [], cryptoTrend = null) {
  const [pillar, news] = await Promise.all([
    Promise.resolve(getTodaysPillar()),
    getNursingNews(),
  ]);

  const topNews  = news[0];
  const crossover = crossoverAngle(pillar, cryptoTrend);

  let msg = `🏥 *NURSING CONTENT BRIEF*\n\n`;
  msg += `_Today's pillar: *${pillar.name}*_\n`;
  msg += `_${pillar.description}_\n\n`;

  if (news.length) {
    msg += `*📰 NURSING NEWS:*\n`;
    news.slice(0, 3).forEach(n => {
      msg += `• [${n.title}](${n.link}) — _${n.source}_\n`;
    });
    msg += '\n';
  }

  // ── AI-generated scripts (with template fallbacks) ────────────────────────
  const humor = pickHumor(pillar);
  const hook  = pick(pillar.hooks);

  const [aiTikTok, aiThread] = await Promise.all([
    generateTikTokScript({
      topic: pillar.name,
      hook,
      trendingTags,
      newsHeadline: topNews?.title || null,
      pillar: pillar.id,
      humor,
    }).catch(() => null),
    generateTwitterThread({
      topic: pillar.name,
      newsHeadline: topNews?.title || null,
      humor,
      cryptoTrend,
      pillar: pillar.id,
    }).catch(() => null),
  ]);

  msg += `────────────────────\n`;
  if (aiThread) {
    msg += `🐦 *X/TWITTER THREAD — NURSING (AI-generated)*\n\n${aiThread}\n\n`;
  } else {
    msg += nursingXThread(pillar, topNews?.title, cryptoTrend) + '\n\n';
  }
  msg += `────────────────────\n`;
  if (aiTikTok) {
    msg += `🎵 *TIKTOK SCRIPT — NURSING (AI-generated)*\n\n${aiTikTok}\n\n`;
  } else {
    msg += nursingTikTokScript(pillar, trendingTags, cryptoTrend) + '\n\n';
  }
  msg += `────────────────────\n`;
  msg += nursingInstagramCaption(pillar, topNews?.title, cryptoTrend) + '\n\n';
  msg += `────────────────────\n`;
  msg += nursingYouTubeShort(pillar, cryptoTrend) + '\n\n';
  msg += `────────────────────\n`;
  msg += nursingHumorPost(pillar, cryptoTrend) + '\n\n';
  msg += `────────────────────\n`;
  msg += nursingAffiliates() + '\n\n';

  if (crossover) {
    msg += `────────────────────\n`;
    msg += crossover + '\n\n';
  }

  msg += `⚠️ *Privacy: No patient details. No hospital name. No coworkers. Composite examples only.*\n`;
  msg += `_Nurses building wealth — with humor. — Serena 👑_`;

  return msg;
}

module.exports = { generateNursingBrief, getNursingNews, getTodaysPillar, NURSING_PILLARS, HUMOR };
