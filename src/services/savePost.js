/**
 * src/services/savePost.js
 *
 * Saves a generated post as a rich JSON file to src/data/generated-posts/.
 *
 * Filename format: YYYY-MM-DD-topic-slug.json
 * (e.g., 2026-05-10-quantum-computing.json)
 *
 * Stored JSON structure includes:
 *   - All generated fields (topic, category, hook, slides, caption, tweet, hashtags)
 *   - Raw source articles (title, URL, summary, score, fetchedAt)
 *   - generatedAt timestamp
 *   - filename (self-reference for easy lookup)
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const POSTS_DIR = path.join(__dirname, '../data/generated-posts');

/**
 * Slugifies a topic string for use in the filename.
 * @param {string} topic
 * @returns {string}
 */
function topicToSlug(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

/**
 * Returns today's date as YYYY-MM-DD.
 * @returns {string}
 */
function todayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Saves a post object to disk as JSON.
 *
 * @param {Object} post - The fully generated and validated post object.
 * @returns {string}     - The absolute file path where the post was saved.
 */
async function savePost(post) {
  // Ensure the directory exists (idempotent)
  fs.mkdirSync(POSTS_DIR, { recursive: true });

  const slug = topicToSlug(post.topic);
  const date = todayString();
  const filename = `${date}-${slug}.json`;
  const filePath = path.join(POSTS_DIR, filename);

  // Attach the filename to the stored object for easy cross-referencing
  const dataToSave = {
    ...post,
    filename,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  logger.info({ filePath }, 'Post saved to disk');

  return filePath;
}

/**
 * Lists all saved posts (metadata only) sorted by date descending.
 *
 * @returns {Array<Object>} - Array of { filename, topic, category, generatedAt } objects.
 */
function listPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((filename) => {
      try {
        const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');
        const data = JSON.parse(raw);
        return {
          id:          filename.replace('.json', ''),
          filename,
          topic:       data.topic,
          category:    data.category,
          generatedAt: data.generatedAt,
          savedAt:     data.savedAt,
        };
      } catch (_) {
        return { filename, error: 'Could not parse file' };
      }
    });
}

/**
 * Retrieves a single post by its ID (filename without .json).
 *
 * @param {string} id
 * @returns {Object|null}
 */
function getPostById(id) {
  const filePath = path.join(POSTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (_) {
    return null;
  }
}

module.exports = { savePost, listPosts, getPostById };
