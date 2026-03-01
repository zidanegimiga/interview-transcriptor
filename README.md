# HR Interview Transcription & Analysis Platform

An AI-powered platform for HR teams to upload, transcribe, and analyse interview recordings. Audio and video files are automatically transcribed using Deepgram, then analysed by GPT-4o-mini to extract summaries, sentiment, keywords, Q&A pairs, candidate strengths, and red flags — all delivered through a real-time web interface.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [AI Integration](#ai-integration)
- [Technical Decisions](#technical-decisions)
- [Known Limitations](#known-limitations)

---

## Project Overview

HR teams spend significant time reviewing interview recordings. This platform automates the most tedious parts:

- **Upload** audio or video interview recordings (MP3, MP4, WAV, M4A, MOV, WebM — up to 500MB)
- **Transcribe** automatically using Deepgram Nova-2 with speaker diarisation
- **Analyse** with GPT-4o-mini to produce structured insights in seconds
- **Review** transcripts with speaker-labelled utterances and timestamps
- **Export** to TXT, PDF, or DOCX for sharing or record-keeping
- **Organise** with custom analysis templates per interview type (Technical, Behavioural, Sales, etc.)

The frontend is built with Next.js 14 and the backend with FastAPI. Status updates are delivered in real time via WebSocket so users never need to refresh.

---

## Setup Instructions

### Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 18.x | Frontend |
| Python | 3.11+ | Backend |
| MongoDB | Atlas or 6.x local | Database |
| ngrok (local dev) | Any | Deepgram webhook tunnel |

You will also need accounts and API keys for:

- [Deepgram](https://console.deepgram.com) — speech-to-text
- [OpenAI](https://platform.openai.com) — AI analysis
- [Cloudflare R2](https://dash.cloudflare.com) — file storage (S3-compatible, free egress)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/interview-transcriptor.git
cd interview-transcriptor
```

---

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

**Run the backend:**

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

**Seed system templates:**

```bash
python scripts/seed_templates.py
```

**Run tests:**

```bash
pytest tests/ -v
```

---

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables section)

# Run dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

### 4. Deepgram webhook tunnel (local development only)

Deepgram needs a publicly accessible URL to POST transcription results back to your local server. Use ngrok:

```bash
brew install ngrok           # macOS
ngrok http 8000
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.app`) and set it as `BACKEND_URL` in your backend `.env`. Restart the backend after updating.

> **Note:** The ngrok free tier generates a new URL on every restart. Update `BACKEND_URL` each time.

---

### 5. MongoDB indexes

After your first run, create indexes for query performance:

```bash
cd backend
python scripts/create_indexes.py
```

---

## Environment Variables

### Backend (`backend/.env`)

```dotenv
# Application
ENVIRONMENT=development              # development | production

# Database
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=hrinterview

# Storage — Cloudflare R2 (S3-compatible)
STORAGE_BACKEND=s3                   # s3 | mock
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY=your_r2_access_key
S3_SECRET_KEY=your_r2_secret_key
S3_BUCKET_NAME=hr-interview-uploads

# Transcription
TRANSCRIPTION_BACKEND=deepgram       # deepgram | mock
DEEPGRAM_API_KEY=your_deepgram_key
DEEPGRAM_WEBHOOK_SECRET=your_webhook_secret

# AI Analysis
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
ANALYSIS_BACKEND=openai              # openai | mock

# Authentication — must match NEXTAUTH_SECRET on the frontend
AUTH_SECRET=your_shared_secret

# URLs
BACKEND_URL=https://your-ngrok-or-railway-url.app
FRONTEND_URL=http://localhost:3000

# Email (optional)
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@yourdomain.com

# Limits
MAX_FILE_SIZE_MB=500
MAX_BATCH_FILES=10
```

### Frontend (`frontend/.env.local`)

```dotenv
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_shared_secret   # must match AUTH_SECRET above

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database (NextAuth session adapter)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=hrinterview
```

> `AUTH_SECRET` and `NEXTAUTH_SECRET` **must be the same value**. The backend signs JWTs with this secret; the frontend generates them and sends them with every API request.

---

## API Documentation

All endpoints are prefixed with `/api/v1`. Authentication is required on all endpoints except `/api/v1/health`. Pass a Bearer token in the `Authorization` header.

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check — returns `{"status": "ok"}` |

---

### Interviews

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/interviews/upload` | Upload a single interview file |
| POST | `/api/v1/interviews/batch-upload` | Upload up to 10 files at once |
| GET | `/api/v1/interviews` | List interviews with pagination, status filter, and text search |
| GET | `/api/v1/interviews/metrics` | Aggregate counts by status, sentiment, and top keywords |
| GET | `/api/v1/interviews/{id}` | Fetch full interview with transcript and analysis |
| PATCH | `/api/v1/interviews/{id}` | Update title or tags |
| DELETE | `/api/v1/interviews/{id}` | Delete interview and remove file from storage |
| GET | `/api/v1/interviews/{id}/status` | Lightweight status poll |
| POST | `/api/v1/interviews/{id}/transcribe` | Submit file to Deepgram for transcription |
| POST | `/api/v1/interviews/{id}/analyse` | Trigger GPT-4o-mini analysis (requires transcript) |
| GET | `/api/v1/interviews/{id}/export` | Export transcript as `?format=txt\|pdf\|docx` |

**Upload request** (`multipart/form-data`):

```
file        required   Audio or video file
title       optional   Display name (defaults to filename)
template_id optional   MongoDB ObjectId of an analysis template
```

**List query parameters:**

```
page              integer   Page number (default: 1)
limit             integer   Results per page (default: 20, max: 100)
interview_status  string    Filter by status: uploaded|queued|transcribing|analysing|completed|failed
search            string    Full-text search across title and transcript
```

**Interview status lifecycle:**

```
uploaded → queued → transcribing → analysing → completed
                                              ↘ failed
```

---

### Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/templates` | List system templates and user's own templates |
| POST | `/api/v1/templates` | Create a custom template |
| PUT | `/api/v1/templates/{id}` | Update a custom template (cannot edit system templates) |
| DELETE | `/api/v1/templates/{id}` | Delete a custom template |

**Template body** (`application/json`):

```json
{
  "name": "Senior Engineer Interview",
  "description": "Focus on system design and technical depth",
  "prompt": "Pay special attention to how the candidate approaches ambiguous problems...",
  "focus_areas": ["system design", "problem solving", "communication"]
}
```

---

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/webhooks/deepgram` | Deepgram transcription callback (internal — not called by frontend) |

Deepgram POSTs to this endpoint when transcription completes. The endpoint validates the HMAC signature, saves the transcript, and triggers AI analysis as a background task. The `interview_id` is embedded in the callback URL as a query parameter.

---

### WebSocket

```
WS /api/v1/ws/{user_id}?token=<jwt>
```

Authenticate with the same JWT used for REST requests. The server pushes two event types:

```json
{ "type": "status_update", "interview_id": "...", "status": "analysing", "updated_at": "..." }
{ "type": "analysis_complete", "interview_id": "...", "status": "completed", "sentiment_overall": "positive", "updated_at": "..." }
```

The client reconnects automatically with exponential backoff (max 30s) on disconnect.

---

## AI Integration

### Transcription — Deepgram Nova-2

**Why Deepgram:** Deepgram was chosen over AWS Transcribe and AssemblyAI for three reasons. First, Nova-2 has the best accuracy-per-dollar ratio for conversational audio at $0.0043/minute. Second, speaker diarisation, utterance splitting, per-utterance sentiment, and smart formatting are all included in a single API call with no additional cost. Third, the webhook callback model fits the async architecture cleanly — Deepgram processes the file and notifies the backend when done, rather than requiring long-polling.

**Features used:**
- `model=nova-2` — latest general-purpose model
- `diarize=true` — speaker separation (Speaker A, Speaker B, etc.)
- `utterances=true` — sentence-level segments with timestamps
- `smart_format=true` — punctuation, capitalisation, number formatting
- `punctuate=true` — sentence boundaries

---

### Analysis — GPT-4o-mini

**Why GPT-4o-mini:** The analysis requirement calls for structured extraction — summaries, sentiment scoring, keyword categorisation, Q&A pair detection, and candidate assessment. This needs language understanding that rule-based systems cannot provide. GPT-4o-mini was chosen over GPT-4o because it is 15× cheaper while producing indistinguishable quality for structured extraction tasks. All four analysis features are extracted in a **single API call** using a structured JSON prompt, which keeps latency low and cost predictable.

**What is extracted per interview:**

| Feature | Description |
|---------|-------------|
| Summary | 2–4 paragraph overview of the full conversation |
| Candidate assessment | HR-focused evaluation paragraph |
| Sentiment | Overall score (−1.0 to 1.0), per-speaker breakdown |
| Keywords | Term, category (skill/technology/competency/tool/soft_skill), frequency |
| Q&A pairs | Every question and answer with speaker attribution |
| Strengths | Candidate positives from an HR perspective |
| Red flags | Concerns or gaps worth following up |

**Prompt design:** Temperature is set to 0.2 for deterministic, structured output. The response format is forced to `json_object`. Transcripts over 80,000 characters are truncated (keeping the first 60% and last 40%) to stay within the context window while preserving the interview's opening and closing.

**Mock backend:** An `ANALYSIS_BACKEND=mock` mode is available for development and testing. It returns realistic fixture data instantly with no API call, enabling full UI development without OpenAI credits.

---

## Technical Decisions

### Monorepo structure with separate deployments

The project uses a single Git repository with `backend/` and `frontend/` subdirectories deployed independently — backend to Railway, frontend to Vercel. This keeps code co-located for easier development while allowing each service to scale and deploy on its optimal platform.

### JWT authentication shared between frontend and backend

NextAuth manages the user session on the frontend. On every sign-in, a backend-compatible JWT is generated (using the same `AUTH_SECRET`) and stored in the NextAuth session. The frontend includes this token in every API request. This avoids a separate auth service while keeping the backend stateless and independently testable.

**Tradeoff:** Token revocation is not instant — a signed JWT remains valid until expiry (7 days). For a production HR system handling sensitive data, a token blocklist or shorter expiry with refresh tokens would be preferable.

### Cloudflare R2 for file storage

R2 is S3-compatible with zero egress fees. Audio files can be large (500MB limit) and are accessed frequently during transcription. R2's free egress tier makes it substantially cheaper than AWS S3 for this use case. The storage layer is abstracted behind a `StorageBackend` protocol, making it trivial to swap to S3 or local disk.

### Deepgram webhook callback model

Rather than polling Deepgram for transcription status, the backend registers a webhook URL when submitting a job. Deepgram POSTs the completed transcript back, which triggers analysis as a background task. This keeps the backend request-response cycle fast and avoids wasted polling requests. The `interview_id` is embedded as a query parameter in the callback URL since Deepgram does not support custom metadata in webhook payloads.

### WebSocket for real-time status updates

The frontend opens a persistent WebSocket connection on login. The backend's `ConnectionManager` tracks active connections per user. When transcription or analysis completes, the backend pushes a status event to the relevant user's connection. The frontend surgically updates only the affected interview's status badge rather than reloading the list — preventing disruptive UI jumps.

### Single GPT call for all four analysis features

A naive implementation would make four separate OpenAI calls (one per feature). Instead, all features are extracted in a single structured JSON prompt. This reduces latency from ~8–12 seconds to ~2–4 seconds, cuts API costs by 75%, and avoids partial failures where some features succeed and others time out.

### FastAPI with async MongoDB (Motor)

All database operations use Motor (async MongoDB driver) so that I/O-bound operations — file uploads, database queries, external API calls — do not block the event loop. This allows a single-process backend to handle concurrent transcription webhooks and WebSocket connections efficiently.

---

## Known Limitations

### What would be improved with more time

**OpenAI key**
The current implementation uses a mock analysis backend for development and testing. A real OpenAI API key would be needed for production analysis. The `ANALYSIS_BACKEND=mock` mode is available for development and testing.

**Token revocation and session security**
The current JWT implementation has no revocation mechanism. A Redis-backed blocklist or shorter-lived tokens with refresh token rotation would be needed before handling genuinely sensitive HR data.

**File processing queue**
Currently, transcription is triggered immediately on upload and analysis runs inline as a FastAPI background task. Under load, this could exhaust database connections or OpenAI rate limits. A proper job queue (Celery with Redis, or Railway's built-in cron) would give better control over concurrency, retries, and backpressure.

**No audio player**
The transcript viewer shows speaker-labelled text with timestamps but there is no audio waveform or playback. Clicking a timestamp to jump to that moment in the recording would significantly improve the review experience.

**Search is limited to MongoDB text index**
The current full-text search uses MongoDB's built-in text index which tokenises words but does not understand semantic similarity. Searching for "communication skills" would not surface interviews mentioning "interpersonal ability." A vector search index (MongoDB Atlas Vector Search or Pinecone) would enable semantic search across transcripts.

**No multi-tenancy or organisation support**
All interviews are scoped to individual users. HR teams typically need shared access — a manager reviewing interviews conducted by different team members. Adding an `organisation_id` layer with role-based access control (admin, reviewer, read-only) is the most impactful missing feature for real-world use.

**Export quality**
The PDF export uses reportlab with basic styling. A more polished output — with the company logo, structured sections for Q&A and keywords, and sentiment visualisation — would make exports share-ready without further editing.

**Deepgram speaker labels are not named**
Diarisation produces "Speaker A" and "Speaker B" labels. There is no mechanism for the user to assign names (e.g. "Interviewer" and "Candidate"). This is a quick win that would significantly improve readability of both the transcript viewer and exported documents.

**No automated testing for the frontend**
The backend has 44 passing integration and unit tests. The frontend has none. Adding Playwright end-to-end tests for the critical paths (upload → transcribe → analyse → export) would catch regressions before deployment.