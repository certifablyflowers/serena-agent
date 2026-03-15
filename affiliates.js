// affiliates.js — Brooke's affiliate link system
// Amazon Associates ID: brookethatrn-20
// Source: Serena affiliate instructions (March 2026)
//
// RULES:
//   - Max 1 link mention per day across ALL platforms combined
//   - Max 4 out of 7 days per week
//   - Never force it — only include if genuinely relevant to content
//   - Rotate evenly across all 3 products
//   - Never repeat same caption in same month
//   - Never say "affiliate link" or "I earn commission" — say "link in bio" or "linked it for you"
//   - Lead with VALUE first. Product mention comes AFTER the tip/story.

const fs   = require('fs');
const path = require('path');

// ── Product Registry ───────────────────────────────────────────────────────
const PRODUCTS = {
  stethoscope: {
    id: 'stethoscope',
    name: '3M Littmann Classic III Stethoscope',
    emoji: '🩺',
    link: 'https://amazon.com/dp/B071DDDCTJ?tag=brookethatrn-20',
    shortLink: 'amazon.com/dp/B071DDDCTJ?tag=brookethatrn-20',
    triggerThemes: ['real-health-advice', 'behind-the-scenes', 'health-myth-busting', 'community-qa'],
    triggerKeywords: ['nursing gear', 'nurse essentials', 'nursing school', 'stethoscope', 'new nurse', 'nurse tools'],
    captions: {
      tiktok_instagram: [
        'PSA: not all stethoscopes are created equal 😅 After years on the floor, the Littmann Classic III is the one I always recommend to new nurses. You can actually HEAR with it. Linked it in my bio if you want to grab one.',
        'New nurses ask me all the time what stethoscope to get. Save yourself the trial and error — Littmann Classic III. I\'ve had mine for years. Link in bio.',
        'If you\'re starting nursing school, invest in ONE good stethoscope. The Littmann Classic III is worth every penny. You\'ll use it for your entire career. Link in bio. 🩺',
      ],
      x: [
        'New nurses: spend the money on a good stethoscope. You\'ll thank yourself on your first shift. The Littmann Classic III is worth every penny. Link in bio. #NurseTwitter #NursingSchool',
        'Nursing school tip: buy the Littmann Classic III. Skip the cheap ones. Your patients (and your ears) will thank you. Link in bio. #nurse #nursingschool',
      ],
      youtube: 'The stethoscope I recommend to every nursing student: https://amazon.com/dp/B071DDDCTJ?tag=brookethatrn-20 — I\'ve used this for years and it\'s still going strong.',
      cta_insta: 'link in bio',
      cta_x: 'Link in bio.',
    },
  },

  scissors: {
    id: 'scissors',
    name: 'MEUUT Nursing Scissors & Medical Kit',
    emoji: '✂️',
    link: 'https://amazon.com/dp/B09B5FC8XC?tag=brookethatrn-20',
    shortLink: 'amazon.com/dp/B09B5FC8XC?tag=brookethatrn-20',
    triggerThemes: ['nurse-life-humor', 'behind-the-scenes', 'community-qa'],
    triggerKeywords: ['shift prep', 'scrub pockets', 'nurse tools', 'pocket kit', 'trauma shears', 'nursing kit'],
    captions: {
      tiktok_instagram: [
        'Shift prep check ✅ Trauma shears? Check. Penlight? Check. Nurses — your pocket kit matters more than people think. I linked my favorite all-in-one set in my bio. Under $20 and it has everything. #nurselife #shiftprep #nursehacks',
        'What\'s in my scrub pockets? This little kit has everything I need for a 12-hour shift. Under $20 and it\'s been my go-to for years. Link in bio. ✂️',
      ],
      x: [
        'Nurses: the pocket kit matters. Trauma shears, penlight, everything in one set. Under $20. Link in bio. #NurseLife #NurseTips',
        'Shift prep tip: get yourself a proper pocket kit. You don\'t realize how much you need it until you\'re in the middle of a shift without it. Link in bio. #nurse',
      ],
      youtube: 'My favorite nursing scissors & pocket kit (everything in one set): https://amazon.com/dp/B09B5FC8XC?tag=brookethatrn-20',
      cta_insta: 'link in bio',
      cta_x: 'Link in bio.',
    },
  },

  compressionSocks: {
    id: 'compressionSocks',
    name: 'Compression Socks for Nurses (Medical Grade)',
    emoji: '🧦',
    link: 'https://amazon.com/dp/B082QTZ7DT?tag=brookethatrn-20',
    shortLink: 'amazon.com/dp/B082QTZ7DT?tag=brookethatrn-20',
    triggerThemes: ['wellness-wednesday', 'nurse-life-humor', 'health-myth-busting'],
    triggerKeywords: ['long shift', 'tired feet', 'compression', 'standing all day', 'nurse wellness', 'self-care', '12 hour', 'feet'],
    captions: {
      tiktok_instagram: [
        '12-hour shift survival tip number one: COMPRESSION SOCKS. I didn\'t believe the hype until I tried them. Now I won\'t do a shift without them. Your legs will literally thank you. Linked the ones I use — bio. 🧦',
        'If you\'re a nurse and you\'re not wearing compression socks on 12-hour shifts, let me change your life. Seriously. Link in bio.',
        'The thing nurses don\'t tell you: your feet and legs will take a beating. Compression socks changed everything for me on long shifts. Link in bio. 🧦',
      ],
      x: [
        'Nurses: if you\'re not wearing compression socks on 12-hour shifts you\'re doing it wrong. Game changer. Link in bio. #NurseLife #NurseTips',
        'Hot take: compression socks are the #1 underrated nurse essential. Your legs will thank you by hour 10. Link in bio. #nurse',
      ],
      youtube: 'Compression socks I actually wear on shift (medical grade, actually work): https://amazon.com/dp/B082QTZ7DT?tag=brookethatrn-20',
      cta_insta: 'link in bio',
      cta_x: 'Link in bio.',
    },
  },
};

// ── Theme → Product Mapping ────────────────────────────────────────────────
const THEME_TO_PRODUCT = {
  'health-myth-busting':  ['compressionSocks', 'stethoscope'],
  'nurse-life-humor':     ['scissors', 'compressionSocks'],
  'wellness-wednesday':   ['compressionSocks'],
  'real-health-advice':   ['stethoscope'],
  'behind-the-scenes':    ['scissors', 'stethoscope'],
  'trending-health-topic': [],  // only if genuinely relevant
  'community-qa':         ['stethoscope', 'scissors', 'compressionSocks'],
};

// ── Usage Tracking ─────────────────────────────────────────────────────────
const TRACKING_FILE = path.join(__dirname, 'affiliate-log.json');

function loadLog() {
  try { return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8')); } catch { return { posts: [] }; }
}

function saveLog(log) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(log, null, 2));
}

function getThisWeekPosts() {
  const log = loadLog();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return log.posts.filter(p => new Date(p.date).getTime() > weekAgo);
}

function getTodayPosts() {
  const log  = loadLog();
  const today = new Date().toISOString().slice(0, 10);
  return log.posts.filter(p => p.date.startsWith(today));
}

function recordPost(productId) {
  const log = loadLog();
  log.posts.push({ productId, date: new Date().toISOString() });
  // Keep last 60 days only
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  log.posts = log.posts.filter(p => new Date(p.date).getTime() > cutoff);
  saveLog(log);
}

function getLeastUsedProduct(candidates) {
  const log      = loadLog();
  const weekAgo  = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekPosts = log.posts.filter(p => new Date(p.date).getTime() > weekAgo);
  const counts   = {};
  candidates.forEach(id => counts[id] = 0);
  weekPosts.forEach(p => { if (counts[p.productId] !== undefined) counts[p.productId]++; });
  // Pick least used
  return candidates.sort((a, b) => counts[a] - counts[b])[0];
}

// ── Main: Get Affiliate Mention for Today ──────────────────────────────────
function getAffiliateMention(themeId, platform = 'tiktok_instagram') {
  // Check daily limit — max 1 per day
  if (getTodayPosts().length >= 1) return null;

  // Check weekly limit — max 4 per week
  if (getThisWeekPosts().length >= 4) return null;

  // Get eligible products for this theme
  const eligible = THEME_TO_PRODUCT[themeId] || [];
  if (!eligible.length) return null;

  // Pick least used product for rotation
  const productId = getLeastUsedProduct(eligible);
  const product   = PRODUCTS[productId];
  if (!product) return null;

  // Pick a caption variant (rotate by day of month to avoid repeats)
  const captions    = product.captions[platform] || product.captions['tiktok_instagram'];
  const captionArr  = Array.isArray(captions) ? captions : [captions];
  const dayOfMonth  = new Date().getDate();
  const caption     = captionArr[dayOfMonth % captionArr.length];

  return {
    productId,
    product,
    caption,
    fullLink: product.link,
    platform,
  };
}

// ── Append affiliate mention to a caption ──────────────────────────────────
function appendAffiliate(mainCaption, themeId, platform) {
  const mention = getAffiliateMention(themeId, platform);
  if (!mention) return { caption: mainCaption, affiliated: false };

  let finalCaption;
  if (platform === 'x') {
    // X: append as separate line with link
    finalCaption = `${mainCaption}\n\n${mention.product.emoji} ${mention.caption}`;
    // Ensure under 280 chars — trim main caption if needed
    if (finalCaption.length > 280) {
      const maxMain = 280 - mention.caption.length - 10;
      finalCaption = `${mainCaption.slice(0, maxMain)}...\n\n${mention.caption}`;
    }
  } else if (platform === 'youtube') {
    // YouTube: append to description
    finalCaption = `${mainCaption}\n\n---\n🛒 Products I Recommend:\n${mention.product.emoji} ${mention.product.name}: ${mention.fullLink}`;
  } else {
    // Instagram/TikTok: append mention + "link in bio"
    finalCaption = `${mainCaption}\n\n${mention.product.emoji} ${mention.caption}`;
  }

  // Record the use
  recordPost(mention.productId);

  return {
    caption: finalCaption,
    affiliated: true,
    product: mention.product.name,
    productId: mention.productId,
  };
}

// ── Status check ───────────────────────────────────────────────────────────
function getAffiliateStatus() {
  const weekPosts  = getThisWeekPosts();
  const todayPosts = getTodayPosts();
  const log        = loadLog();

  // Count by product this week
  const counts = {};
  Object.keys(PRODUCTS).forEach(id => counts[id] = 0);
  weekPosts.forEach(p => { if (counts[p.productId] !== undefined) counts[p.productId]++; });

  return {
    todayUsed:     todayPosts.length >= 1,
    weekCount:     weekPosts.length,
    weekLimit:     4,
    productCounts: counts,
    canPostToday:  todayPosts.length < 1 && weekPosts.length < 4,
  };
}

module.exports = { PRODUCTS, getAffiliateMention, appendAffiliate, getAffiliateStatus, THEME_TO_PRODUCT };
