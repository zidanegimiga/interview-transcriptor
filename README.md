# Audio Transcriber and Analyser

A web app for teams to upload  recordings and get AI generated transcripts and analysis. You upload a file, Deepgram transcribes it, and GPT-4o-mini pulls out the key insights. Everything happens in the background and the UI updates in real time.

---

## What it does

- Upload audio or video interview recordings up to 500MB
- Automatic transcription with speaker labels (Speaker A, Speaker B)
- AI analysis that extracts a summary, sentiment score, keywords, Q&A pairs, candidate strengths and red flags
- Export transcripts as TXT, PDF or DOCX
- Custom analysis templates per interview type (Technical, Behavioural, Sales etc.)
- Real time status updates so you never have to refresh

---

## Tech Stack

**Frontend** Next.js 14, Tailwind CSS, shadcn/ui, NextAuth v5, Framer Motion

**Backend** FastAPI, Motor (async MongoDB), Deepgram Nova 2, GPT-4o-mini

**Storage** Cloudflare R2

**Database** MongoDB Atlas

**Deployment** Vercel (frontend), Railway (backend)

---

## Prerequisites

You need the following before getting started.

- Node.js 18 or higher
- Python 3.11 or higher
- A MongoDB Atlas account
- A Deepgram account and API key
- An OpenAI account and API key
- A Cloudflare R2 bucket
- ngrok (for local Deepgram webhook testing)

---

## Running locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in your .env values
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/api/docs`

Seed the system templates once:

```bash
python scripts/seed_templates.py
```

Run the test suite:

```bash
pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# fill in your .env.local values
npm run dev
```

App runs at `http://localhost:3000`

### Webhook tunnel

Deepgram needs a public URL to send transcription results back to your local machine. Start ngrok and point it at port 8000:

```bash
ngrok http 8000
```

Copy the HTTPS URL and set it as `BACKEND_URL` in your backend `.env`. Restart the backend after changing it.

---

## Environment Variables

### Backend (`backend/.env`)

```dotenv
ENVIRONMENT=development

MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=hrinterview

STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY=your_r2_access_key
S3_SECRET_KEY=your_r2_secret_key
S3_BUCKET_NAME=hr-interview-uploads

TRANSCRIPTION_BACKEND=deepgram
DEEPGRAM_API_KEY=your_deepgram_key
DEEPGRAM_WEBHOOK_SECRET=your_webhook_secret

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
ANALYSIS_BACKEND=openai

AUTH_SECRET=your_shared_secret

BACKEND_URL=https://your-ngrok-url.ngrok-free.app
FRONTEND_URL=http://localhost:3000

MAX_FILE_SIZE_MB=500
MAX_BATCH_FILES=10
```

### Frontend (`frontend/.env.local`)

```dotenv
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_shared_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

NEXT_PUBLIC_API_URL=http://localhost:8000

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=hrinterview
```

`AUTH_SECRET` and `NEXTAUTH_SECRET` must be the same value. The backend uses it to validate tokens the frontend generates.

---

## API Endpoints

All endpoints sit under `/api/v1` and require a Bearer token except for `/health`.

### Interviews

| Method | Path | Description |
|--------|------|-------------|
| POST | `/interviews/upload` | Upload a single file |
| POST | `/interviews/batch-upload` | Upload up to 10 files |
| GET | `/interviews` | List interviews with pagination and filters |
| GET | `/interviews/metrics` | Status counts, sentiment breakdown, top keywords |
| GET | `/interviews/{id}` | Full interview with transcript and analysis |
| PATCH | `/interviews/{id}` | Update title or tags |
| DELETE | `/interviews/{id}` | Delete interview |
| POST | `/interviews/{id}/transcribe` | Submit to Deepgram |
| POST | `/interviews/{id}/analyse` | Run GPT analysis |
| GET | `/interviews/{id}/export?format=txt` | Export as txt, pdf or docx |

### Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | List all templates |
| POST | `/templates` | Create a custom template |
| PUT | `/templates/{id}` | Update a custom template |
| DELETE | `/templates/{id}` | Delete a custom template |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/webhooks/deepgram` | Deepgram callback (internal) |
| WS | `/ws/{user_id}?token=` | Real time status updates |

### Interview status flow

```
uploaded -> queued -> transcribing -> analysing -> completed
                                               -> failed
```

---

## AI Services

### Deepgram Nova 2

Used for transcription. It was chosen because it has the best accuracy for conversational audio and speaker diarisation is included at no extra cost. The webhook callback model fits well with the async architecture. Deepgram processes the file and notifies the backend when done rather than the backend polling for status.

Features used: `diarize`, `utterances`, `smart_format`, `punctuate`

### GPT-4o-mini

Used for analysis. All features (summary, sentiment, keywords, Q&A, strengths, red flags) are extracted in a single API call using a structured JSON prompt. This keeps latency low and cost predictable. GPT-4o-mini was chosen over GPT-4o because the quality difference for structured extraction tasks is minimal and the cost difference is significant.

A `ANALYSIS_BACKEND=mock` mode is available for development without needing OpenAI credits.

---

## Architecture Notes

**Shared JWT secret**
NextAuth manages sessions on the frontend. On sign in, a backend compatible JWT is generated using the same `AUTH_SECRET` and stored in the session. The frontend sends this token with every API request. The backend validates it without any database lookup so the backend stays fully stateless.

**Cloudflare R2 for storage**
R2 is S3 compatible with zero egress fees. Audio files can be large and are accessed frequently during transcription. The storage layer is abstracted behind a protocol so swapping to S3 or local disk is a one line config change.

**Webhook over polling**
When a transcription job is submitted, Deepgram gets a callback URL. It POSTs the result back when done. The backend does not waste requests checking status and the user sees the update within seconds of processing finishing.

**Single GPT call for all analysis**
A naive approach would make four separate OpenAI calls. Instead everything is extracted in one structured JSON prompt. This cuts latency by about 75% and eliminates partial failure scenarios.

---

## Known Limitations

**No speaker naming**
Diarisation produces Speaker A and Speaker B. There is no way yet to assign real names to speakers. This is a quick win that would make transcripts significantly more readable.

**In memory rate limiting**
The current rate limiter resets on every deploy and does not work across multiple instances. A Redis backed limiter would be needed for proper production use.

**No audio playback**
There is no audio player on the transcript page. Clicking a timestamp to jump to that moment in the recording would improve the review experience considerably.

**File not deleted from R2 on interview delete**
Deleting an interview removes the MongoDB record but leaves the file in storage. This needs a follow up storage cleanup call.

**No frontend tests**
The backend has 44 passing tests. The frontend has none. Playwright end to end tests for the core flows would be the next thing to add.

**No organisation support**
Everything is scoped to individual users. Real HR teams need shared access with role based permissions across team members.
