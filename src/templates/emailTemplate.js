/**
 * src/templates/emailTemplate.js
 *
 * Generates a clean, rich HTML email for the admin post review.
 *
 * Layout:
 *   - Header with branding
 *   - Topic + category badge
 *   - Hook (hero text)
 *   - Slides (numbered cards)
 *   - Caption
 *   - Tweet version
 *   - Hashtags
 *   - Source articles used
 *   - Footer with generation timestamp
 */

/**
 * Returns a CSS-colored badge for the post category.
 * @param {string} category
 */
function categoryBadge(category) {
  const colors = {
    'AI':                   '#6366f1',
    'Quantum':              '#8b5cf6',
    'Neuroscience':         '#ec4899',
    'Space':                '#0ea5e9',
    'Physics':              '#14b8a6',
    'Cybersecurity':        '#f59e0b',
    'Future Tech':          '#10b981',
    'Biology':              '#22c55e',
    'Philosophy of Mind':   '#a855f7',
    'Developer Tools':      '#3b82f6',
  };
  const color = colors[category] || '#64748b';
  return `<span style="background:${color};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;letter-spacing:0.5px;">${category}</span>`;
}

/**
 * Builds the full HTML email string.
 *
 * @param {Object} post - The fully generated post object.
 * @returns {string}    - Complete HTML email body.
 */
function buildEmailHtml(post) {
  const slidesHtml = post.slides
    .map(
      (slide) => `
      <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
          Slide ${slide.slideNumber}
        </p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b;">${slide.title}</p>
        <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">${slide.content}</p>
      </div>
    `
    )
    .join('');

  const hashtagsHtml = post.hashtags
    .map((tag) => `<span style="background:#ede9fe;color:#7c3aed;padding:3px 8px;border-radius:6px;font-size:12px;margin:2px;display:inline-block;">#${tag}</span>`)
    .join(' ');

  const sourcesHtml = (post.sourceArticles || [])
    .map(
      (article) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${article.title}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">${article.source} · Score: ${article.score}</p>
          <a href="${article.url}" style="font-size:12px;color:#6366f1;">${article.url}</a>
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Post Draft – ${post.topic}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Wrapper -->
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 32px;">
      <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;">AI Content Pipeline</p>
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">📬 New Post Draft Ready</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">

      <!-- Topic + Category -->
      <div style="margin-bottom:20px;">
        ${categoryBadge(post.category)}
        <h2 style="margin:10px 0 0;font-size:24px;color:#1e293b;font-weight:800;">${post.topic}</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Generated on ${new Date(post.generatedAt).toUTCString()}</p>
      </div>

      <!-- Hook -->
      <div style="background:linear-gradient(135deg,#ede9fe,#dbeafe);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🪝 Hook</p>
        <p style="margin:0;font-size:18px;font-weight:600;color:#1e293b;font-style:italic;line-height:1.6;">"${post.hook}"</p>
      </div>

      <!-- Slides -->
      <h3 style="margin:0 0 14px;font-size:16px;color:#1e293b;font-weight:700;">🎠 Carousel Slides</h3>
      ${slidesHtml}

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">

      <!-- Caption -->
      <h3 style="margin:0 0 10px;font-size:16px;color:#1e293b;font-weight:700;">📝 Instagram Caption</h3>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:15px;color:#475569;line-height:1.8;">${post.caption}</p>
      </div>

      <!-- Tweet -->
      <h3 style="margin:0 0 10px;font-size:16px;color:#1e293b;font-weight:700;">𝕏 Tweet Version</h3>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:15px;color:#1d4ed8;line-height:1.6;">${post.tweet}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#93c5fd;">${post.tweet.length}/280 characters</p>
      </div>

      <!-- Hashtags -->
      <h3 style="margin:0 0 10px;font-size:16px;color:#1e293b;font-weight:700;"># Hashtags</h3>
      <div style="margin-bottom:24px;">${hashtagsHtml}</div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">

      <!-- Source Articles -->
      <h3 style="margin:0 0 14px;font-size:16px;color:#1e293b;font-weight:700;">📰 Source Articles Used</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${sourcesHtml}</tbody>
      </table>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        This is an automatically generated draft. Review carefully before posting.
        <br>AI Content Automation System · post-automation
      </p>
    </div>

  </div>
</body>
</html>
`.trim();
}

/**
 * Builds a plain-text fallback for email clients that don't render HTML.
 *
 * @param {Object} post
 * @returns {string}
 */
function buildEmailText(post) {
  const slidesText = post.slides
    .map((s) => `[Slide ${s.slideNumber}] ${s.title}\n${s.content}`)
    .join('\n\n');

  const sources = (post.sourceArticles || [])
    .map((a) => `- ${a.title} (${a.source})\n  ${a.url}`)
    .join('\n');

  return `
NEW POST DRAFT: ${post.topic}
Category: ${post.category}
Generated: ${post.generatedAt}

HOOK:
"${post.hook}"

SLIDES:
${slidesText}

CAPTION:
${post.caption}

TWEET:
${post.tweet}

HASHTAGS:
${post.hashtags.map((h) => '#' + h).join(' ')}

SOURCES:
${sources}
`.trim();
}

module.exports = { buildEmailHtml, buildEmailText };
