from __future__ import annotations

import os

import asgi
from workers import WorkerEntrypoint

from app.main import app


ENV_KEYS = (
    "ADMIN_EMAILS",
    "ALLOW_NULL_ORIGIN_ON_MUTATIONS",
    "COOKIE_SAMESITE",
    "COOKIE_SECURE",
    "CORS_ORIGIN",
    "CORS_ORIGINS",
    "DB_NAME",
    "ENFORCE_ORIGIN_CHECK",
    "ENVIRONMENT",
    "FIREBASE_PROJECT_ID",
    "MONGO_ATLAS_DATA_API_KEY",
    "MONGO_ATLAS_DATA_API_URL",
    "MONGO_ATLAS_DATA_SOURCE",
    "MUTATION_RATE_LIMIT_MAX",
    "REQUEST_BODY_LIMIT_BYTES",
    "SESSION_DURATION_DAYS",
)


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        for key in ENV_KEYS:
            value = getattr(self.env, key, None)
            if value is not None:
                os.environ[key] = str(value)
        return await asgi.fetch(app, request, self.env)
