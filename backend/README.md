# FAST API APPLICATION

## Folder Structure

```bash
app/
├── main.py                ← Entry point (FastAPI app created here)
├── core/                  ← Infrastructure layer
│    ├── config.py         ← Settings
│    ├── database.py       ← DB connection/session
│    └── deps.py           ← Dependency injection
│
├── api/
│    └── v1/               ← API layer (versioned routes)
│         ├── interviews.py - Core interview endpoints
│         ├── templates.py  - Template management
│         ├── webhooks.py   - External callback handlers like Deepgram webhook
│         └── websocket.py  - Realtime communication
│
├── models/                ← Data layer (schemas + ORM)
│
├── services/              ← Business logic layer
│    ├── transcription.py
│    ├── analysis.py
│    ├── notification.py
│    └── storage.py
```

## Env
Create service accounts for openAI, Cloudflrae R2 and Deepgram. Ensure Db URL is present.
Run ```openssl rand -hex 32``` to create Deepgram webhook key
Run ```openssl rand -base64 32``` to create Auth secret. This one needs to exactly match NEXTAUTH_SECRET in the frontend.

---

## Install and run

Navigate to the backend repo:
```bash
cd backend
```

Then:


```bash
python3 -m venv .venv  to create a venv
source .venv/bin/activate

pip install -r ../requirements.txt

python -m uvicorn app.main:app --reload
```

---

## Expected output
```
INFO | Starting up — environment: development
INFO | Connecting to MongoDB...
INFO | MongoDB connected — database: hr_interviews
INFO | Uvicorn running on http://127.0.0.1:8000
```

Then open http://localhost:8000/api/v1/health in your browser.


## Running Tests:
Ensure virtual environment is running:

```pytest tests/integration/test_auth.py -v```


## Tradeoffs and Decisions

- I had to leave Allow all IPs setting open given that we are connecting 

Regarding analysis, Deepgram offers Intelligence features built into the transcription response itself, no separate API call needed. The useful ones for this app are:
summarize=True — generates a summary
detect_topics=True — extracts topics
intents=True — detects speaker intents
sentiment=True — per-utterance sentiment (we already have this)

These are cheaper than GPT but less detailed i.e:
no Q&A extraction, no strengths/red flags, no candidate assessment.
I'm using GPT-4o-mini as the primary analysis engine once I add credits, and optionally use Deepgram's summarize and sentiment as a fast fallback. 

For now I am using a mock to get me unblocked.


## Miscellaneous
Useful bash commands:

- Freeze requirements
```bash
pip freeze > requirements.txt
pip install -r requirements.txt
```

- List all files not including .pyc and __pycache__ folders
```bash
find . -type d \( -name "__pycache__" -o -name ".pytest_cache" -o -name "venv" -o -name ".venv" -o -name ".git" \) -prune -o -print
```

- Running tests
```bash
pytest tests/ -v
```