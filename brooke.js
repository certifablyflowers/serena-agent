// brooke.js — Brooke's brand identity, voice, content strategy
// Source: Serena_Instructions.docx (Hollie's actual brand document)
// This file IS the source of truth for all content Serena creates.

// ── Voice & Identity ───────────────────────────────────────────────────────
const VOICE = {
  name: 'Brooke',
  handle: '@BrookeThatRN',
  identity: 'Registered Nurse — real health talk, nurse life, wellness tips',
  tone: [
    'Warm and real — like a nurse friend who tells you the truth',
    'Confident but never preachy or condescending',
    'Uses humor naturally — nursing life is wild and she owns it',
    'Simplifies medical topics so anyone can understand',
    'Never sounds like a robot or a press release',
  ],
  audience: ['Women', 'Caregivers', 'Fellow nurses', 'Health-curious people'],
  niche: 'Nurse Wellness & Real Health Talk — healthcare credibility meets everyday wellness',
  title: 'The Princess of the ICU 👸 — all the knowledge, none of the paperwork',
};

// ── Weekly Content Themes (day of week rotation) ──────────────────────────
const WEEKLY_THEMES = [
  {
    day: 0, // Sunday
    name: 'Community & Q&A',
    description: 'Answer a common health question from followers',
    examples: [
      'The #1 health question I get asked as a nurse (answered)',
      'You asked, I answered: Is it normal to feel tired all the time?',
      'Real nurse answers to your most common health questions',
    ],
    hooks: [
      'You asked. I\'m answering. 💉',
      'The question I get asked more than any other as a nurse:',
      'Real talk from a real nurse — your questions answered.',
    ],
  },
  {
    day: 1, // Monday
    name: 'Health Myth Busting',
    description: 'Debunk a common health myth with nurse-backed truth',
    examples: [
      'No, you don\'t need to drink 8 glasses of water a day — here\'s the truth',
      'Stop taking vitamins on an empty stomach (a nurse explains why)',
      'The "detox tea" lie — what\'s actually happening in your body',
    ],
    hooks: [
      'Hot take: [common belief] is not real.',
      'As a nurse, this one drives me crazy:',
      'Stop doing this. I\'m begging you. 🚨',
      'Nobody told you this but as your nurse friend, I will:',
    ],
  },
  {
    day: 2, // Tuesday
    name: 'Nurse Life & Humor',
    description: 'Relatable, funny content about the nursing experience',
    examples: [
      'Things only nurses understand (a 12-hour shift edition)',
      'When your coworker calls out and it\'s just you and the chaos',
      'The 5 stages of a night shift 😂',
    ],
    hooks: [
      'POV: Day 3 of night shifts 😵',
      'Things only nurses understand:',
      'Nobody prepared me for this part of nursing:',
      'The unspoken rules of working in healthcare:',
    ],
  },
  {
    day: 3, // Wednesday
    name: 'Wellness Wednesday',
    description: 'Practical wellness tips grounded in nursing knowledge',
    examples: [
      '5 things I do as a nurse to actually sleep after a night shift',
      'The one supplement a nurse actually recommends',
      'What I eat on shift — and why it matters',
    ],
    hooks: [
      'Wellness tip from a nurse who actually uses it:',
      'The real reason you\'re exhausted (it\'s not what you think)',
      'After 20 years in nursing, here\'s what actually works for my health:',
    ],
  },
  {
    day: 4, // Thursday
    name: 'Real Health Advice',
    description: 'Actionable health information people wish their doctor told them',
    examples: [
      'Your doctor said your labs were "normal" — here\'s what to actually ask',
      'The 3 numbers you need to know about your heart health',
      'Signs your body is telling you something is wrong (and you\'re ignoring it)',
    ],
    hooks: [
      'Your doctor didn\'t have time to tell you this. I do.',
      'The health advice I give my own family:',
      'What I notice when I look at someone\'s chart that they don\'t know about:',
    ],
  },
  {
    day: 5, // Friday
    name: 'Behind the Scenes',
    description: 'Real, unfiltered look at nursing life and healthcare',
    examples: [
      'What nurses actually eat on shift (spoiler: it\'s chaos)',
      'A day in the life of an ICU nurse — the real version',
      'Things that happen in hospitals that patients never see',
    ],
    hooks: [
      'Nobody shows you this part of nursing:',
      'What a 12-hour shift actually looks like:',
      'The things nurses do when nobody\'s watching 👀',
    ],
  },
  {
    day: 6, // Saturday
    name: 'Trending Health Topic',
    description: 'React to a viral health claim or news story with nurse perspective',
    examples: [
      'That viral "health hack" everyone is trying — a nurse\'s take',
      'Did you see that health story trending? Here\'s what\'s actually true.',
      'Reacting to the most unhinged health advice on the internet this week',
    ],
    hooks: [
      'A nurse reacts to the trending health topic everyone is talking about:',
      'Everyone is doing this. Here\'s what I actually think as a nurse:',
      'The health news this week — what\'s real and what\'s not:',
    ],
  },
];

// ── Caption Formula ────────────────────────────────────────────────────────
// Every post follows: Hook → Value → Personality → CTA → Hashtags
const CAPTION_FORMULA = {
  hook: 'First line — stops the scroll. Bold statement, question, or surprising fact.',
  value: '2-4 sentences of real useful content. Simple. No jargon. Like texting a friend.',
  personality: 'One line that sounds like Brooke — a joke, relatable moment, or nurse truth.',
  cta: 'Tell people what to do: Save this. Share with a friend. Comment your question.',
  hashtags: {
    required: ['#nurse', '#nurselife', '#healthtips', '#wellness', '#RN'],
    extra: ['#nursing', '#healthfacts', '#selfcare', '#medicaladvice', '#nursetok', '#nursesoftiktok'],
  },
};

// ── Platform Rules ─────────────────────────────────────────────────────────
const PLATFORM_RULES = {
  x: {
    maxChars: 280,
    style: 'Punchy and direct. No fluff. 2-3 hashtags max.',
    hashtagCount: 3,
    format: 'single post or thread for longer tips',
  },
  tiktok: {
    maxCaption: 150,
    style: 'Caption is short — 1-2 sentences. Content IS the video.',
    hashtagCount: 8,
    requiredTags: ['#fyp', '#foryou', '#nursesoftiktok'],
    hook: 'Strong hook in first 2 seconds',
  },
  instagram: {
    maxCaption: 2200,
    style: 'Longer captions work well. 150-300 words. Use line breaks. First line is critical.',
    hashtagCount: 10,
    format: 'Reels outperform static images — prioritize video',
  },
  youtube: {
    titleFormula: '"The Truth About [topic] (A Nurse Explains)"',
    style: 'Title must be searchable. Description 2-3 paragraphs + keywords + affiliate links.',
    hashtagCount: 5,
  },
};

// ── Affiliate Programs ─────────────────────────────────────────────────────
const AFFILIATES = [
  { name: 'Amazon Associates', category: 'Nurse gear, wellness products, health books', commission: '1-10%' },
  { name: 'FIGS Scrubs', category: 'Scrubs & nurse apparel', commission: '10-15%' },
  { name: 'AG1 / Athletic Greens', category: 'Daily greens supplement', commission: '$15-30/referral' },
  { name: 'BetterHelp', category: 'Mental health / therapy app', commission: '$100+/referral' },
  { name: 'Care/of Vitamins', category: 'Personalized vitamins', commission: '10-20%' },
];

// ── Growth Milestones ──────────────────────────────────────────────────────
const MILESTONES = {
  youtube: '1,000 subscribers + 4,000 watch hours → YouTube Partner Program',
  tiktok: '10,000 followers + 100k views/30 days → TikTok Creator Fund',
  instagram: 'Stay consistent → Reels bonus program invites come automatically',
  x: '500+ followers + Premium → ad revenue share',
  brandDeals: '5,000+ followers on any platform → start sending brand pitch emails',
};

// ── Get Today's Theme ──────────────────────────────────────────────────────
function getTodaysTheme() {
  const day = new Date().getDay();
  return WEEKLY_THEMES.find(t => t.day === day) || WEEKLY_THEMES[1];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { VOICE, WEEKLY_THEMES, CAPTION_FORMULA, PLATFORM_RULES, AFFILIATES, MILESTONES, getTodaysTheme, pickRandom };
