/**
 * src/schedulers/cronJobs.js
 *
 * Defines and initialises the node-cron scheduled job.
 *
 * Default schedule: "0 10 [every-2-days] * *"  →  10:00 AM every 2 days (server local time).
 * Override via CRON_SCHEDULE env variable.
 *
 * Pipeline per run:
 *   1. Fetch fresh articles from all sources.
 *   2. Score and deduplicate candidates.
 *   3. Generate a single high-quality educational carousel post via OpenAI.
 *   4. Save the post + source data as a JSON file.
 *   5. Email the draft to the admin.
 */

const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../utils/logger');
const { fetchContent } = require('../services/fetchContent');
const { generatePost } = require('../services/generatePost');
const { savePost } = require('../services/savePost');
const { sendEmail } = require('../services/sendEmail');

/**
 * Runs the full content pipeline once.
 * Exported for use with the POST /generate-now endpoint.
 *
 * @returns {Promise<Object>} - The generated and saved post.
 */
async function runPipeline() {
  const startTime = Date.now();
  logger.info('🚀 Pipeline started');

  try {
    // Step 1 — Fetch
    logger.info('Step 1/4: Fetching content...');
    const articles = await fetchContent(10);

    if (!articles.length) {
      throw new Error('No suitable articles found after filtering. Aborting pipeline.');
    }

    // Step 2 — Generate
    logger.info('Step 2/4: Generating post with OpenAI...');
    const post = await generatePost(articles);

    // Step 3 — Save
    logger.info('Step 3/4: Saving post to disk...');
    const filePath = await savePost(post);

    // Step 4 — Email
    logger.info('Step 4/4: Sending email to admin...');
    await sendEmail(post);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info({ topic: post.topic, filePath, elapsed: `${elapsed}s` }, '✅ Pipeline completed');

    return { post, filePath };
  } catch (err) {
    logger.error({ err: err.message }, '❌ Pipeline failed');
    throw err;
  }
}

/**
 * Initialises the cron scheduler.
 * Called once at server startup.
 */
function initCronJobs() {
  const schedule = env.CRON_SCHEDULE;

  if (!cron.validate(schedule)) {
    logger.error({ schedule }, 'Invalid CRON_SCHEDULE value — scheduler not started');
    return;
  }

  logger.info({ schedule }, `Cron job scheduled: "${schedule}"`);

  cron.schedule(schedule, async () => {
    logger.info('⏰ Cron triggered — starting content pipeline');
    try {
      await runPipeline();
    } catch (err) {
      // Errors are already logged inside runPipeline; don't crash the process.
      logger.error({ err: err.message }, 'Cron run failed — will retry on next schedule');
    }
  });
}

module.exports = { initCronJobs, runPipeline };
