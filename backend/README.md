# FAST API APPLICATION

## Folder Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       └── api.py - main file
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── transcription_service.py
│   │   └── analysis_service.py
│   ├── repositories/
│   │   └── interview_repository.py
│   └── main.py
│
├── tests/
│   ├── test_health.py
│   └── test_interviews.py
│
├── .env.example
├── Dockerfile
└── README.md
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

- I had to leave Allow all IPs  setting open given that we are connecting 