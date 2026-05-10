/**
 * src/services/sendEmail.js
 *
 * Sends the generated post draft to the admin using Resend.
 *
 * Imports the HTML and text email builders from the template module,
 * keeping this service clean and focused only on delivery.
 */

const { Resend } = require('resend');
const env = require('../config/env');
const logger = require('../utils/logger');
const { buildEmailHtml, buildEmailText } = require('../templates/emailTemplate');

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Sends the post draft email to the admin.
 *
 * @param {Object} post - The fully generated post object.
 * @returns {Promise<Object>} - Resend API response data.
 */
async function sendEmail(post) {
  logger.info({ topic: post.topic, to: env.ADMIN_EMAIL }, 'Sending post draft email...');

  const subject = `📬 New Draft: ${post.topic} [${post.category}]`;
  const html = buildEmailHtml(post);
  const text = buildEmailText(post);

  const { data, error } = await resend.emails.send({
    from:    env.RESEND_FROM_EMAIL,
    to:      [env.ADMIN_EMAIL],
    reply_to: env.RESEND_REPLY_TO_EMAIL || undefined,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error({ error }, 'Failed to send email via Resend');
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  logger.info({ emailId: data?.id, topic: post.topic }, 'Email sent successfully');
  return data;
}

module.exports = { sendEmail };
