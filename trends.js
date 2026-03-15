const axios = require('axios');
const cheerio = require('cheerio');
const RSSParser = require('rss-parser');
const parser = new RSSParser();
const { scrapeTikTokTrending, scrapeYouTubeTrending } = require('../shared/firecrawl');

const FEEDS = [
  'https://cointelegraph.com/rss',
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://decrypt.co/feed',
  'https://venturebeat.com/category/ai/feed/',
];

const TIKTOK_NEWS_FEEDS = [
  { url: 'https://www.theverge.com/rss/tiktok/index.xml', name: 'The Verge' },
  { url: 'https://techcrunch.com/tag/tiktok/feed/', name: 'TechCrunch' },
  { url: 'https://www.socialmediatoday.com/tag/tiktok/feed/', name: 'Social Media Today' },
  { url: 'https://later.com/blog/tag/tiktok/feed/', name: 'Later Blog' },
];

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Existing functions ─────────────────────────────────────────────────────

async function getTrendingTopics() {
  const results = [];
  for (const url of FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      feed.items.slice(0, 3).forEach(item => {
        results.push({ title: item.title, link: item.link, source: feed.title });
      });
    } catch {}
  }
  return results.slice(0, 12);
}

async function getTrendingCrypto() {
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/search/trending', { timeout: 8000 });
    return res.data.coins.slice(0, 5).map(c => ({
      symbol: c.item.symbol.toUpperCase(),
      name: c.item.name,
      rank: c.item.market_cap_rank,
    }));
  } catch { return []; }
}

async function getBTCPrice() {
  try {
    const res = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
      { timeout: 8000 }
    );
    return res.data;
  } catch { return null; }
}

// ── TikTok Trend Scraping ──────────────────────────────────────────────────
// 4-layer approach: CC API → Google Trends RSS → Reddit → WhatsTrending

async function fetchTikTokCreativeCenterAPI() {
  try {
    const res = await axios.get(
      'https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&page=1&limit=20&country_code=US&sort_by=popular',
      {
        headers: {
          ...BROWSER_HEADERS,
          'Referer': 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en',
          'Origin': 'https://ads.tiktok.com',
        },
        timeout: 10000,
      }
    );
    const list = res.data?.data?.list || [];
    return list.slice(0, 10).map(item => ({
      tag: (item.hashtag_name || item.name || '').replace(/^#/, ''),
      posts: item.publish_cnt || null,
      views: item.video_views || null,
      rank: item.rank || null,
      source: 'TikTok Creative Center',
      tier: 1,
    })).filter(t => t.tag);
  } catch { return []; }
}

async function fetchGoogleTrendsTikTok() {
  try {
    const customParser = new RSSParser({ customFields: { item: [['ht:approx_traffic', 'traffic']] } });
    const feed = await customParser.parseURL('https://trends.google.com/trending/rss?geo=US');
    const items = feed.items || [];

    const tiktokRelated = [];
    const hot = [];

    items.slice(0, 20).forEach(item => {
      const title = item.title || '';
      const entry = { tag: title, views: item.traffic || null, source: 'Google Trends', tier: 2 };
      if (/tiktok|viral|dance|challenge|trend|sound|meme|gen.?z|influencer|aesthetic|brainrot/i.test(title)) {
        tiktokRelated.push({ ...entry, source: 'Google Trends (viral)' });
      } else {
        hot.push(entry);
      }
    });

    return [...tiktokRelated, ...hot.slice(0, 5)];
  } catch { return []; }
}

async function fetchRedditTikTokTrends() {
  const results = [];
  const skipPatterns = /^(Slash posts|removed|[Mm]ods?|weekly|monthly|pinned|rules|announcement)/;

  for (const sub of ['TikTokTrends', 'TrendingRn']) {
    try {
      const res = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
        headers: { 'User-Agent': 'SerenaBot/1.0 content-agent' },
        timeout: 8000,
      });
      (res.data?.data?.children || [])
        .filter(p => !p.data?.stickied && !p.data?.pinned)
        .filter(p => {
          const t = p.data?.title || '';
          return t.length > 8 && t.length < 120 && !skipPatterns.test(t);
        })
        .slice(0, 5)
        .forEach(p => results.push({
          tag: p.data.title,
          views: p.data.score > 0 ? p.data.score : null,
          source: `Reddit r/${sub}`,
          tier: 2,
        }));
    } catch {}
  }
  return results.slice(0, 8);
}

async function scrapeWhatsTrending() {
  try {
    const res = await axios.get('https://www.whatstrending.com/', { headers: BROWSER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const trends = [];
    const skip = /^(Latest Stories|Trending|Featured|More|Search|Menu|Home|News|Entertainment)/i;

    $('h2, h3').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 15 && text.length < 120 && !skip.test(text) && i < 20) {
        trends.push({ tag: text, source: 'WhatsTrending', tier: 2 });
      }
    });
    return trends.slice(0, 5);
  } catch { return []; }
}

async function getTikTokNewsCoverage() {
  const results = [];
  for (const feed of TIKTOK_NEWS_FEEDS) {
    try {
      const f = await parser.parseURL(feed.url);
      f.items.slice(0, 3).forEach(item => {
        results.push({ title: item.title, link: item.link, source: feed.name });
      });
    } catch {}
  }
  // Deduplicate by title
  const seen = new Set();
  return results.filter(r => {
    const key = r.title?.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

async function getTikTokTrends() {
  const [firecrawlCC, ccAPI, google, reddit, whatstrending, news] = await Promise.allSettled([
    scrapeTikTokTrending(),           // Firecrawl — primary T1
    fetchTikTokCreativeCenterAPI(),   // Direct API — T1 fallback
    fetchGoogleTrendsTikTok(),
    fetchRedditTikTokTrends(),
    scrapeWhatsTrending(),
    getTikTokNewsCoverage(),
  ]);

  const all = [
    ...(firecrawlCC.status === 'fulfilled' ? firecrawlCC.value : []),
    ...(ccAPI.status === 'fulfilled' ? ccAPI.value : []),
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(reddit.status === 'fulfilled' ? reddit.value : []),
    ...(whatstrending.status === 'fulfilled' ? whatstrending.value : []),
  ];

  // Deduplicate
  const seen = new Set();
  const trends = all.filter(t => {
    if (!t.tag) return false;
    const key = t.tag.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (a.tier || 3) - (b.tier || 3)).slice(0, 12);

  const tier1Count = trends.filter(t => t.tier === 1).length;
  const confidence = tier1Count >= 3 ? 'High'
    : tier1Count >= 1 ? 'Medium'
    : trends.length > 0 ? 'Low'
    : 'Low';

  const newsItems = news.status === 'fulfilled' ? news.value : [];

  return { trends, confidence, news: newsItems };
}

module.exports = { getTrendingTopics, getTrendingCrypto, getBTCPrice, getTikTokTrends };
