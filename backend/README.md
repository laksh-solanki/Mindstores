# Mindstores Backend

FastAPI service for the Mindstores Vue application.

## Structure

- `src/app/main.py` creates the application, middleware, and route registration.
- `src/app/routes/` contains API route modules grouped by domain.
- `src/app/context.py` and `src/app/db.py` provide request and persistence services.
- `run.py` is the local Uvicorn entrypoint.
- `server.py` exports `app` for the root Vercel deployment adapter.

## Local development

```powershell
uv sync --all-groups
uv run python run.py
```

The service listens on `http://localhost:8000`. Copy `.env.example` to `.env` and set the Firebase, admin, CORS, and database values required for the environment. Without database credentials, local development uses the in-memory store.

## Validation

```powershell
python -m compileall -q src run.py server.py
```

## Deployment

The root `pyproject.toml` exposes `backend.server:app` to Vercel. Keep the backend environment variables configured in the deployment platform; do not commit `.env` or service-account credentials.
