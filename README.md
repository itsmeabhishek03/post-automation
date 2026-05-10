# 🤖 AI Tech/Science Content Automation

> **"Complex futuristic concepts explained simply."**

A production-ready Node.js backend that automatically curates interesting AI, future-tech, and science topics, generates educational Instagram/X carousel posts using Gemini, and emails one high-quality draft to the admin every 2 days for manual review.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Multi-source Fetching** | Hacker News, Reddit (r/MachineLearning, r/science, r/Futurology, etc.), TechCrunch, OpenAI Blog, DeepMind, MIT Tech Review, Wired |
| **Content Scoring** | 0–100 score per article based on educational/futuristic keyword signals |
| **Duplicate Detection** | Cross-checks previously generated topics to avoid repeating content |
| **AI Generation** | Gemini 2.5 Flash with JSON mode — strict schema, 6–7 slides, hook, caption, tweet |
| **Rich Email Drafts** | Beautiful HTML email with slide cards, source citations, tweet preview |
| **Local Storage** | Every draft saved as datestamped JSON with source provenance |
| **Admin API** | `/health`, `/posts`, `/posts/:id`, `/generate-now` |
| **Docker Ready** | Multi-stage Dockerfile, docker-compose with volume persistence |

---

## 📁 Project Structure

```
src/
├── server.js                    # Express app + API endpoints
├── config/
│   └── env.js                   # Zod-validated environment variables
├── services/
│   ├── fetchContent.js          # Multi-source fetching + scoring + dedup
│   ├── generatePost.js          # Gemini generation + Zod validation + retry
│   ├── savePost.js              # JSON file storage + list/getById helpers
│   └── sendEmail.js             # Resend email delivery
├── prompts/
│   └── carouselPrompt.js        # System + user prompt builders
├── templates/
│   └── emailTemplate.js         # HTML + plain-text email templates
├── schedulers/
│   └── cronJobs.js              # node-cron scheduler + pipeline runner
├── utils/
│   └── logger.js                # Pino structured logger
└── data/
    └── generated-posts/         # Stored JSON drafts (persisted via Docker volume)
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & install

```bash
git clone <your-repo>
cd post-automation
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual API keys
```

### 3. Run the server

```bash
npm run dev   # uses node --watch for auto-restart
```

The server starts on `http://localhost:3000`.

### 4. Trigger a manual pipeline run

```bash
curl -X POST http://localhost:3000/generate-now
```

Watch the terminal logs — a post will be generated, saved, and emailed within ~30 seconds.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in all values:

| Variable | Description |
|---|---|
| `PORT` | Express server port (default: `3000`) |
| `GEMINI_API_KEY` | Your Gemini API key (`AIzaSy...`) |
| `RESEND_API_KEY` | Your [Resend](https://resend.com) API key (`re_...`) |
| `RESEND_FROM_EMAIL` | Verified sender email (e.g. `noreply@yourdomain.com`) |
| `ADMIN_EMAIL` | Where post drafts are emailed |
| `CRON_SCHEDULE` | Cron expression (default: `0 10 */2 * *` = 10 AM every 2 days) |
| `NODE_ENV` | `development` or `production` |

> **Important:** `RESEND_FROM_EMAIL` must be a verified domain/email in your Resend account.

---

## 🐳 Docker Deployment (Ubuntu VPS)

### Build and start

```bash
# Copy and configure .env
cp .env.example .env
nano .env   # fill in your keys

# Build and run in background
docker-compose up -d --build
```

### Check health

```bash
curl http://localhost:3000/health
```

### View logs

```bash
docker-compose logs -f
```

### Stop

```bash
docker-compose down
```

### Data persistence

Generated posts are stored in a named Docker volume (`posts_data`) and survive container restarts and rebuilds. To inspect them:

```bash
docker exec -it post-automation ls src/data/generated-posts/
```

---

## 📡 API Endpoints

### `GET /health`
Returns server status and uptime.

```json
{
  "status": "ok",
  "service": "post-automation",
  "uptime": "42.3s",
  "time": "2026-05-10T10:00:00.000Z",
  "env": "production"
}
```

### `GET /posts`
Lists all saved post drafts (metadata only, newest first).

```json
{
  "count": 5,
  "posts": [
    {
      "id": "2026-05-10-quantum-computing",
      "filename": "2026-05-10-quantum-computing.json",
      "topic": "What Quantum Computers Actually Do",
      "category": "Quantum",
      "generatedAt": "2026-05-10T10:00:12.000Z"
    }
  ]
}
```

### `GET /posts/:id`
Returns a full saved post by its ID (filename without `.json`).

```bash
curl http://localhost:3000/posts/2026-05-10-quantum-computing
```

### `POST /generate-now`
Manually triggers the full pipeline immediately. Returns `202 Accepted` instantly and runs in the background.

```bash
curl -X POST http://localhost:3000/generate-now
```

---

## 📧 Email Format

Each admin email includes:
- 🎯 **Topic** + colour-coded **category badge**
- 🪝 **Hook** — the curiosity-opening line
- 🎠 **6–7 Carousel slides** — numbered cards with title + content
- 📝 **Instagram caption** — ready to copy-paste
- 𝕏 **Tweet version** — with character count
- **#️⃣ Hashtags** — colour-coded pills
- 📰 **Source articles** — titles, sources, scores, and URLs

---

## 🗂️ Stored JSON Structure

Each post is saved as `YYYY-MM-DD-topic-slug.json`:

```json
{
  "topic": "What Quantum Computers Actually Do",
  "category": "Quantum",
  "hook": "Your laptop thinks in 1s and 0s. A quantum computer doesn't have to choose.",
  "slides": [
    { "slideNumber": 1, "title": "The Mind-Bending Opening", "content": "..." },
    { "slideNumber": 2, "title": "Core Concept", "content": "..." },
    { "slideNumber": 3, "title": "Why This Matters", "content": "..." },
    { "slideNumber": 4, "title": "Deeper Insight", "content": "..." },
    { "slideNumber": 5, "title": "Real-World Implication", "content": "..." },
    { "slideNumber": 6, "title": "Surprising Takeaway", "content": "..." }
  ],
  "caption": "...",
  "hashtags": ["quantumcomputing", "futuretech", "ai"],
  "tweet": "...",
  "sources": ["https://..."],
  "sourceArticles": [
    {
      "title": "Google Claims Quantum Supremacy",
      "url": "https://...",
      "source": "MIT Tech Review",
      "summary": "...",
      "score": 80,
      "fetchedAt": "2026-05-10T10:00:01.000Z"
    }
  ],
  "generatedAt": "2026-05-10T10:00:12.000Z",
  "filename": "2026-05-10-quantum-computing.json",
  "savedAt": "2026-05-10T10:00:14.000Z"
}
```

---

## 🏗️ Content Pipeline

```
Every 2 days at 10 AM (UTC)
         │
         ▼
  fetchContent.js
  ┌──────────────────────────────────────────┐
  │  Hacker News + Reddit + 7 RSS feeds      │
  │  → Score 0-100 per article               │
  │  → Drop score < 30 (generic/funding)     │
  │  → Deduplicate vs. past topics           │
  │  → Return top 10 candidates              │
  └──────────────────────────────────────────┘
         │
         ▼
  generatePost.js
  ┌──────────────────────────────────────────┐
  │  Gemini 2.5 Flash + JSON mode              │
  │  → System prompt (educational rules)     │
  │  → Top 5 candidates sent as context      │
  │  → Zod validates output schema           │
  │  → Retry up to 3x on failure            │
  └──────────────────────────────────────────┘
         │
         ▼
  savePost.js  ──→  src/data/generated-posts/YYYY-MM-DD-slug.json
         │
         ▼
  sendEmail.js  ──→  Resend  ──→  Admin inbox
```

---

## 📝 Content Rules (enforced in prompt)

**✅ DO:** Explain complex concepts simply · Build curiosity · Stay factually accurate · Include "Why This Matters" + "Real-World Implication" slides

**❌ DON'T:** Invent facts · Write motivational fluff · Recap generic news · Mention funding/product launches · Use excessive emojis

---

## 🔧 Tech Stack

- **Runtime:** Node.js 20 (Alpine)
- **Framework:** Express.js
- **AI:** Google Gemini 2.5 Flash (JSON mode)
- **Email:** Resend
- **Scheduler:** node-cron
- **HTTP:** axios
- **RSS Parsing:** rss-parser
- **Validation:** Zod
- **Logging:** Pino + pino-pretty
- **Config:** dotenv
- **Container:** Docker + Docker Compose
