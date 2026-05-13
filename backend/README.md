# Mindstores Backend

Python FastAPI backend for the Mindstores API contract.

## Run locally

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python run.py
```

The service listens on `http://localhost:8000`, matching the frontend development API base URL.

## Environment

- `FIREBASE_PROJECT_ID`
- `DB_NAME`
- `MONGO_ATLAS_DATA_API_URL`
- `MONGO_ATLAS_DATA_API_KEY`
- `MONGO_ATLAS_DATA_SOURCE`
- `CORS_ORIGINS`
- `ADMIN_EMAILS`
- `ENVIRONMENT`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `SESSION_DURATION_DAYS`

Without Atlas Data API credentials, the app uses an in-memory store for local development.
