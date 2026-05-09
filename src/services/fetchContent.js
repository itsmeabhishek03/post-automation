/**
 * src/services/fetchContent.js
 *
 * Fetches candidate articles from multiple sources:
 *   - Hacker News (top stories API)
 *   - Reddit JSON API (r/MachineLearning, r/Futurology, r/Physics, r/Science, r/artificial)
 *   - RSS Feeds (TechCrunch AI, OpenAI Blog, DeepMind Blog, MIT Tech Review, Wired Science)
 *
 * Then applies:
 *   1. Keyword filtering  – keeps futuristic/educational topics, drops funding/product fluff.
 *   2. Content scoring    – ranks remaining items 0-100 based on topic relevance signals.
 *   3. Deduplication      – cross-checks against previously generated topic slugs.
 *
 * Returns top N scored articles ready for AI generation.
 */

const axios = require('axios');
const RSSParser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const parser = new RSSParser({ timeout: 10000 });

// ─── Source definitions ──────────────────────────────────────────────────────

const RSS_FEEDS = [
  { name: 'TechCrunch AI',     url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'OpenAI Blog',       url: 'https://openai.com/blog/rss.xml' },
  { name: 'DeepMind Blog',     url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'MIT Tech Review',   url: 'https://www.technologyreview.com/feed/' },
  { name: 'Wired Science',     url: 'https://www.wired.com/category/science/feed/' },
  { name: 'Ars Technica',      url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'The Verge Science', url: 'https://www.theverge.com/rss/science/index.xml' },
];

const REDDIT_SUBREDDITS = [
  'MachineLearning',
  'artificial',
  'Futurology',
  'Physics',
  'science',
  'singularity',
  'neuroscience',
  'space',
];

// ─── Filtering & scoring definitions ────────────────────────────────────────

/**
 * HIGH-PRIORITY keywords boost score significantly.
 * These topics align with the goal: complex concepts explained simply.
 */
const HIGH_PRIORITY_KEYWORDS = [
  'quantum', 'consciousness', 'AGI', 'agent', 'simulation', 'paradox',
  'black hole', 'neuroscience', 'neural', 'LLM', 'language model', 'GPT',
  'multiverse', 'dark matter', 'dark energy', 'spacetime', 'relativity',
  'cybersecurity', 'robotics', 'brain-computer', 'neuralink', 'fusion',
  'general intelligence', 'sentient', 'alignment', 'singularity', 'entropy',
  'wormhole', 'antimatter', 'photon', 'emergent', 'evolutionary', 'CRISPR',
  'gene editing', 'nanotechnology', 'cryptography', 'zero-day', 'encryption',
  'developer tools', 'transformer', 'diffusion model', 'reinforcement learning',
  'autonomous', 'future of', 'explained', 'how it works', 'what is', 'theory',
];

/**
 * NEGATIVE keywords — these typically signal generic news we want to avoid.
 */
const NEGATIVE_KEYWORDS = [
  'funding', 'raises', 'valuation', 'IPO', 'acquisition', 'acquired', 'merger',
  'quarterly', 'revenue', 'profit', 'shares', 'stock', 'investor', 'venture',
  'billion dollar', 'million dollar', 'layoff', 'lawsuit', 'regulation', 'comply',
  'policy update', 'terms of service', 'new feature', 'price', 'subscription',
  'app update', 'product launch', 'partnership', 'deal', 'CEO', 'CFO', 'CTO',
  'hire', 'fired', 'employee', 'headcount', 'restructuring',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalises a string to a comparable slug for duplicate detection.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/**
 * Scores an article 0–100 based on keyword matches.
 * +5 per high-priority match, -10 per negative match, capped to [0, 100].
 */
function scoreItem(title, summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 50; // start neutral

  HIGH_PRIORITY_KEYWORDS.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) score += 5;
  });

  NEGATIVE_KEYWORDS.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) score -= 10;
  });

  return Math.max(0, Math.min(100, score));
}

/**
 * Loads previously used topic slugs from the generated-posts directory
 * to avoid repeating recent topics.
 */
function loadUsedTopicSlugs() {
  const dir = path.join(__dirname, '../data/generated-posts');
  if (!fs.existsSync(dir)) return new Set();

  const slugs = new Set();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (content.topic) slugs.add(slugify(content.topic));
    } catch (_) {
      // skip malformed files
    }
  }
  return slugs;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchRSSFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return result.items.slice(0, 15).map((item) => ({
      title:     item.title || '',
      summary:   item.contentSnippet || item.content || item.summary || '',
      url:       item.link || '',
      source:    feed.name,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (err) {
    logger.warn({ feed: feed.name, err: err.message }, 'RSS feed failed');
    return [];
  }
}

async function fetchRedditSubreddit(subreddit) {
  try {
    const { data } = await axios.get(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`,
      {
        headers: { 'User-Agent': 'post-automation-bot/1.0' },
        timeout: 8000,
      }
    );
    return (data?.data?.children || []).map((child) => {
      const post = child.data;
      return {
        title:     post.title || '',
        summary:   post.selftext?.slice(0, 300) || '',
        url:       `https://reddit.com${post.permalink}`,
        source:    `Reddit r/${subreddit}`,
        fetchedAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    logger.warn({ subreddit, err: err.message }, 'Reddit fetch failed');
    return [];
  }
}

async function fetchHackerNews() {
  try {
    // Fetch top story IDs
    const { data: ids } = await axios.get(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      { timeout: 8000 }
    );

    // Grab the first 30, then fetch them concurrently
    const topIds = ids.slice(0, 30);
    const stories = await Promise.allSettled(
      topIds.map((id) =>
        axios
          .get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
          .then((r) => r.data)
      )
    );

    return stories
      .filter((s) => s.status === 'fulfilled' && s.value?.title)
      .map((s) => s.value)
      .map((story) => ({
        title:     story.title || '',
        summary:   story.text?.replace(/<[^>]+>/g, '')?.slice(0, 300) || '',
        url:       story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        source:    'Hacker News',
        fetchedAt: new Date().toISOString(),
      }));
  } catch (err) {
    logger.warn({ err: err.message }, 'Hacker News fetch failed');
    return [];
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Fetches, filters, scores, and deduplicates content from all sources.
 *
 * @param {number} topN   Number of top-scored candidates to return (default 10).
 * @returns {Promise<Array>}  Scored + deduplicated article objects.
 */
async function fetchContent(topN = 10) {
  logger.info('Starting content fetch from all sources...');

  // ── Parallel fetch ──
  const [hnItems, ...otherResults] = await Promise.all([
    fetchHackerNews(),
    ...RSS_FEEDS.map(fetchRSSFeed),
    ...REDDIT_SUBREDDITS.map(fetchRedditSubreddit),
  ]);

  const allItems = [hnItems, ...otherResults].flat();
  logger.info({ count: allItems.length }, 'Raw articles fetched');

  // ── Deduplicate by URL ──
  const seenUrls = new Set();
  const unique = allItems.filter((item) => {
    if (!item.url || seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });

  // ── Score each item ──
  const scored = unique.map((item) => ({
    ...item,
    score: scoreItem(item.title, item.summary),
  }));

  // ── Remove negative-score (<30) items ──
  const filtered = scored.filter((item) => item.score >= 30);
  logger.info({ count: filtered.length }, 'Articles after quality filter');

  // ── Remove topics similar to previously generated posts ──
  const usedSlugs = loadUsedTopicSlugs();
  const deduped = filtered.filter((item) => !usedSlugs.has(slugify(item.title)));
  logger.info({ count: deduped.length }, 'Articles after duplicate topic filter');

  // ── Sort by score descending and return top N ──
  const topItems = deduped
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  logger.info({ count: topItems.length, scores: topItems.map(i => i.score) }, 'Top candidates selected');

  return topItems;
}

module.exports = { fetchContent, scoreItem, slugify };
