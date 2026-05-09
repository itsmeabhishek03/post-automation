/**
 * src/utils/logger.js
 *
 * Pino-based structured logger.
 * In development: pretty-prints with colors via pino-pretty.
 * In production: outputs raw JSON for easy ingestion by log aggregators.
 */

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      })
    : undefined
);

module.exports = logger;
