from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import Request
from starlette.responses import JSONResponse

from .admin_access import AdminAccessService
from .auth import resolve_current_user
from .config import AppConfig
from .db import create_db
from .utils import deep_serialize


@dataclass
class AppState:
    config: AppConfig
    db: Any
    admin_access: AdminAccessService


@dataclass
class RequestContext:
    request: Request
    state: AppState
    user: dict[str, Any] | None

    @property
    def db(self) -> Any:
        return self.state.db

    @property
    def admin_access(self) -> AdminAccessService:
        return self.state.admin_access

    @property
    def config(self) -> AppConfig:
        return self.state.config


async def build_state(config: AppConfig) -> AppState:
    db = create_db(config)
    admin_access = AdminAccessService(db, config.admin_emails)
    await admin_access.ensure_seeded()
    return AppState(config=config, db=db, admin_access=admin_access)


async def get_context(request: Request) -> RequestContext:
    state: AppState = request.app.state.mindstores
    user = await resolve_current_user(request, state.db, state.admin_access, state.config)
    return RequestContext(request=request, state=state, user=user)


def json_response(body: Any, status_code: int = 200, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse(
        content=deep_serialize(body),
        status_code=status_code,
        headers=headers or {},
    )


def error_response(status_code: int, message: str) -> JSONResponse:
    return json_response({"message": message}, status_code)


async def read_json_body(request: Request, max_body_bytes: int) -> Any:
    content_type = request.headers.get("content-type", "")
    if not content_type:
        return None
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > max_body_bytes:
                raise ValueError("BODY_TOO_LARGE")
        except ValueError as exc:
            if str(exc) == "BODY_TOO_LARGE":
                raise
    body = await request.body()
    if len(body) > max_body_bytes:
        raise ValueError("BODY_TOO_LARGE")
    if "application/json" in content_type:
        if not body.strip():
            return {}
        try:
            return await request.json()
        except Exception as exc:
            raise ValueError("INVALID_JSON") from exc
    if "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        return dict(form)
    return body.decode("utf-8", errors="replace")
