# Mindstores Backend

Python FastAPI backend for the Mindstores API contract, structured for Vercel.

## Entry Points

- `server.py` exports the FastAPI `app` for Vercel.
- `run.py` starts the same app locally with Uvicorn.
- `src/app/main.py` owns the FastAPI app, middleware, and route registration.

## Run Locally

```powershell
uv sync --all-groups
uv run python run.py
```

The service listens on `http://localhost:8000`.

## Deploy On Vercel

Create the backend project from the `backend/` directory and add the environment variables from `.env.example` in Vercel Project Settings.

```powershell
pnpm dlx vercel@latest --prod --yes
```

## Environment

Required:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_WEB_API_KEY`
- `DB_NAME`
- `CORS_ORIGINS`
- `ADMIN_EMAILS`
- `ENVIRONMENT`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `SESSION_DURATION_DAYS`

Database, choose one:

- `MONGO_URL`
- `MONGO_ATLAS_DATA_API_URL`, `MONGO_ATLAS_DATA_API_KEY`, `MONGO_ATLAS_DATA_SOURCE`

Without database credentials, the app uses an in-memory store for local development.
