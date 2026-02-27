# HR INTERVIEW TRANSCRIPTION AND ANALYSIS APPLICATION

# Overview

This is a HR interview transcription and analysis application using React (TypeScript), FastAPI, and MongoDB. 
The application enables HR professionals to upload interview recordings, automatically generate transcriptions, and perform AI-powered analysis of the content generated.

The system is built using modern full-stack technologies and follows clean architecture principles, API versioning, and production-ready deployment patterns.


This repository is a **monorepo** containing:

```
project-root/
├── frontend/ # Next.js (React + TypeScript)
├── backend/ # FastAPI application
├── requirements.txt # Python dependencies
├── package.json # Node dependencies
└── README.md # Root documentation
```

### Tech Stack

| Layer        | Technology |
|-------------|------------|
| Frontend     | Next.js (React + TypeScript) |
| Backend      | FastAPI (Python) |
| Database     | MongoDB |
| Speech-to-Text | Deepgram Nova-3 |
| AI Analysis  | OpenAI GPT-4o-mini |
| Local File Storage | MinIO |
| Production Storage | Cloudflare R2 |
| Deployment | Vercel (Frontend), Render/Railway (Backend), MongoDB Atlas |

---


## Setup

### Prerequisites

- Node.js (v20+)
- Python (3.11+)
- Docker & Docker Compose
- Git


### 1. Start Infrastructure (MongoDB + MinIO)

From the project root:

```bash
docker compose up -d

This starts:

MongoDB → localhost:27017

MinIO API → http://localhost:9000

MinIO Console → http://localhost:9001

Default MinIO credentials:

Username: minioadmin
Password: minioadmin
```

### 3. Backend Setup
Navigate to backend:

```bash
cd backend 
```

Create virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

Install dependencies (from root requirements.txt):

```bash
pip install -r ../requirements.txt
```

Run server:
```bash
uvicorn app.main:app --reload
```

Backend runs at: ``` http://localhost:8000 ```

API documentation (Swagger): ``` http://localhost:8000/docs ```


### 4. Frontend Setup
From project root:

```bash
npm install
cd frontend
npm run dev
```

Frontend runs at: ``` http://localhost:3000 ```

## Production Deployment
The frontend and backend are deployed separately.


#### Frontend
Hosted on Vercel. Connected to backend via environment variable:

```bash NEXT_PUBLIC_API_URL=https://your-backend-url.com ```


#### Backend
Hosted on Render or Railway. It has been setup like so because we are utilizing the freetier of both services.

```bash NEXT_PUBLIC_API_URL=https://your-backend-url.com ```









## Architecture diagram


## Local setup


## Deployment links



