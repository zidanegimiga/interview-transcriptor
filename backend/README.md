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



- I had to leave Allow all IPs  setting open given that we are connecting 