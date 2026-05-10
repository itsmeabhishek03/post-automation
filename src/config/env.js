/**
 * src/config/env.js
 *
 * Validates and exports all required environment variables on startup.
 * The application will exit immediately if any required variable is missing,
 * preventing cryptic runtime failures later.
 */

const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),

  // Gemini
  GEMINI_API_KEY: z
    .string()
    .min(1, 'GEMINI_API_KEY is required'),

  // Resend
  RESEND_API_KEY: z
    .string()
    .min(1, 'RESEND_API_KEY is required'),
  RESEND_FROM_EMAIL: z
    .string()
    .email('RESEND_FROM_EMAIL must be a valid email'),
  RESEND_REPLY_TO_EMAIL: z
    .string()
    .email('RESEND_REPLY_TO_EMAIL must be a valid email')
    .optional(),
  ADMIN_EMAIL: z
    .string()
    .email('ADMIN_EMAIL must be a valid email'),

  // Scheduler (cron expression)
  CRON_SCHEDULE: z
    .string()
    .default('0 10 */2 * *'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

let env;

try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error('❌ Invalid environment variables:\n');
  if (err?.errors) {
    err.errors.forEach((e) => {
      console.error(`  - ${e.path.join('.')}: ${e.message}`);
    });
  } else {
    console.error(err.message);
  }
  console.error('\nPlease copy .env.example to .env and fill in all values.\n');
  process.exit(1);
}

module.exports = env;
