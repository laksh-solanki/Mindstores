from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - only used before dependencies are installed
    load_dotenv = None

from .utils import parse_boolean_env, parse_integer_env


DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://mindstores.vercel.app",
    "https://mindstores.onrender.com",
]

if load_dotenv:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def read_env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


@dataclass(frozen=True)
class AppConfig:
    environment: str
    is_production: bool
    allowed_origins: list[str]
    use_secure_cookies: bool
    cookie_samesite: str
    enforce_origin_check: bool
    allow_null_origin_on_mutations: bool
    max_body_bytes: int
    mutation_rate_limit_max: int
    session_duration_days: int
    admin_emails: list[str]
    firebase_project_id: str
    firebase_web_api_key: str
    db_name: str
    mongo_url: str
    mongo_data_api_url: str
    mongo_data_api_key: str
    mongo_data_source: str


def get_config() -> AppConfig:
    environment = read_env("ENVIRONMENT", "development") or "development"
    is_production = environment.lower() == "production"
    use_secure_cookies = (
        parse_boolean_env(read_env("COOKIE_SECURE"), True)
        if read_env("COOKIE_SECURE") is not None
        else is_production
    )
    requested_samesite = (read_env("COOKIE_SAMESITE") or ("none" if use_secure_cookies else "lax")).lower()
    cookie_samesite = "lax" if requested_samesite == "none" and not use_secure_cookies else requested_samesite
    cors_raw = read_env("CORS_ORIGINS") or read_env("CORS_ORIGIN") or ",".join(DEFAULT_CORS_ORIGINS)

    return AppConfig(
        environment=environment,
        is_production=is_production,
        allowed_origins=[item.strip() for item in cors_raw.split(",") if item.strip()],
        use_secure_cookies=use_secure_cookies,
        cookie_samesite=cookie_samesite,
        enforce_origin_check=parse_boolean_env(read_env("ENFORCE_ORIGIN_CHECK"), is_production),
        allow_null_origin_on_mutations=parse_boolean_env(
            read_env("ALLOW_NULL_ORIGIN_ON_MUTATIONS"),
            False,
        ),
        max_body_bytes=parse_integer_env(read_env("REQUEST_BODY_LIMIT_BYTES"), 1_048_576),
        mutation_rate_limit_max=parse_integer_env(read_env("MUTATION_RATE_LIMIT_MAX"), 120),
        session_duration_days=parse_integer_env(read_env("SESSION_DURATION_DAYS"), 7),
        admin_emails=[item.strip() for item in (read_env("ADMIN_EMAILS") or "").split(",") if item.strip()],
        firebase_project_id=read_env("FIREBASE_PROJECT_ID", "") or "",
        firebase_web_api_key=read_env("FIREBASE_WEB_API_KEY", "") or read_env("FIREBASE_API_KEY", "") or "",
        db_name=read_env("DB_NAME", "mindstores") or "mindstores",
        mongo_url=read_env("MONGO_URL", "") or read_env("MONGODB_URI", "") or "",
        mongo_data_api_url=(read_env("MONGO_ATLAS_DATA_API_URL", "") or "").rstrip("/"),
        mongo_data_api_key=read_env("MONGO_ATLAS_DATA_API_KEY", "") or "",
        mongo_data_source=read_env("MONGO_ATLAS_DATA_SOURCE", "Cluster0") or "Cluster0",
    )
