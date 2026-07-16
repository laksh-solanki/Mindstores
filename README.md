# Mindstores

Mindstores is a Vue 3/Vuetify frontend backed by a Python FastAPI service.

## Repository layout

```text
frontend/              Vue application and Vercel frontend proxy
  src/pages/           route-level views
  src/components/      shared UI components
  src/stores/          Pinia state
  src/utils/           API and domain helpers
  api/index.js         same-origin backend proxy
backend/               FastAPI application
  src/app/             application package
  src/app/routes/      domain route modules
  run.py               local Uvicorn entrypoint
  server.py            Vercel app export
pyproject.toml          root Vercel deployment adapter
```

## Run locally

Start the backend first:

```powershell
cd backend
uv sync --all-groups
uv run python run.py
```

Then start the frontend in a second terminal:

```powershell
cd frontend
pnpm install
pnpm run dev
```

## Checks

```powershell
cd frontend
pnpm run lint
pnpm run build

cd ../backend
python -m compileall -q src run.py server.py
```

Use `.env.example` files as the configuration reference. Local `.env` files, logs, caches, build output, and deployment metadata are intentionally excluded from source control.
