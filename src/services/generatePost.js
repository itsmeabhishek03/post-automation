/**
 * src/services/generatePost.js
 *
 * Calls the OpenAI API to generate an educational carousel post.
 *
 * Features:
 *   - Uses gpt-4o with response_format: json_object for guaranteed JSON output.
 *   - Attaches raw source article metadata to the output for provenance.
 *   - Includes retry logic (up to 3 attempts) with exponential backoff.
 *   - Validates the returned JSON structure using Zod before accepting it.
 */

const OpenAI = require('openai');
const { z } = require('zod');
const env = require('../config/env');
const logger = require('../utils/logger');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../prompts/carouselPrompt');

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Output schema (Zod) ─────────────────────────────────────────────────────

const SlideSchema = z.object({
  slideNumber: z.number().int().min(1).max(7),
  title:       z.string().min(1),
  content:     z.string().min(10),
});

const PostSchema = z.object({
  topic:     z.string().min(1),
  category:  z.string().min(1),
  hook:      z.string().min(1),
  slides:    z.array(SlideSchema).min(5).max(7),
  caption:   z.string().min(20),
  hashtags:  z.array(z.string()).min(5).max(20),
  tweet:     z.string().max(280),
  sources:   z.array(z.string()),
});

// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Retries an async function up to `maxAttempts` times with exponential backoff.
 *
 * @param {Function} fn          - Async function to retry.
 * @param {number}   maxAttempts - Maximum number of attempts (default 3).
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      logger.warn(
        { attempt, maxAttempts, delay, err: err.message },
        `OpenAI call failed — retrying in ${delay / 1000}s`
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generates a single high-quality educational carousel post.
 *
 * @param {Array}  articles     - Scored candidate articles from fetchContent.
 * @returns {Promise<Object>}   - Validated post object with sourceArticles appended.
 */
async function generatePost(articles) {
  logger.info({ articleCount: articles.length }, 'Generating post with OpenAI...');

  const userPrompt = buildUserPrompt(articles);

  const raw = await withRetry(async () => {
    const response = await client.chat.completions.create({
      model:           'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.75, // Creative but grounded
      max_tokens:  2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content);
  });

  // ── Validate structure ──
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, 'OpenAI response failed schema validation');
    throw new Error(`Invalid post structure: ${parsed.error.issues.map(i => i.message).join(', ')}`);
  }

  const post = parsed.data;

  // ── Attach source article data for provenance & storage ──
  post.sourceArticles = articles.slice(0, 5).map((a) => ({
    title:     a.title,
    url:       a.url,
    source:    a.source,
    summary:   a.summary?.slice(0, 300) || '',
    score:     a.score,
    fetchedAt: a.fetchedAt,
  }));

  post.generatedAt = new Date().toISOString();

  logger.info({ topic: post.topic, category: post.category }, 'Post generated successfully');
  return post;
}

module.exports = { generatePost };
