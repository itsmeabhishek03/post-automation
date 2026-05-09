/**
 * src/server.js
 *
 * Express application entry point.
 *
 * Admin API Endpoints:
 *   GET  /health          – Liveness check.
 *   GET  /posts           – List all saved post drafts (metadata only).
 *   GET  /posts/:id       – Retrieve a specific post by its file ID.
 *   POST /generate-now    – Manually trigger the full content pipeline immediately.
 */

require('dotenv').config();
const express = require('express');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initCronJobs, runPipeline } = require('./schedulers/cronJobs');
const { listPosts, getPostById } = require('./services/savePost');

const app = express();
app.use(express.json());

// ─── Health ────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'post-automation',
    uptime:  process.uptime().toFixed(1) + 's',
    time:    new Date().toISOString(),
    env:     env.NODE_ENV,
  });
});

// ─── Posts – list ─────────────────────────────────────────────────────────

app.get('/posts', (req, res) => {
  try {
    const posts = listPosts();
    res.json({ count: posts.length, posts });
  } catch (err) {
    logger.error({ err: err.message }, 'GET /posts error');
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// ─── Posts – single ────────────────────────────────────────────────────────

app.get('/posts/:id', (req, res) => {
  try {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: `Post "${req.params.id}" not found` });
    }
    res.json(post);
  } catch (err) {
    logger.error({ err: err.message, id: req.params.id }, 'GET /posts/:id error');
    res.status(500).json({ error: 'Failed to retrieve post' });
  }
});

// ─── Manual trigger ────────────────────────────────────────────────────────

app.post('/generate-now', async (req, res) => {
  logger.info('POST /generate-now — manual pipeline trigger');

  // Respond immediately so the client knows the run started,
  // then continue processing in the background.
  res.status(202).json({
    message: 'Pipeline started. Check logs for progress.',
    startedAt: new Date().toISOString(),
  });

  try {
    const { post, filePath } = await runPipeline();
    logger.info({ topic: post.topic, filePath }, 'Manual pipeline completed');
  } catch (err) {
    logger.error({ err: err.message }, 'Manual pipeline failed');
  }
});

// ─── 404 handler ───────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ───────────────────────────────────────────────────

app.use((err, req, res, next) => {
  logger.error({ err: err.message }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  logger.info(`🚀 Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  initCronJobs();
});

module.exports = app; // export for testing
