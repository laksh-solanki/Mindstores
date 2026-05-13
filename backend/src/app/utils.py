from __future__ import annotations

import hashlib
import json
import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any


def normalize_text(value: Any, max_length: int = 0) -> str:
    text = "" if value is None else str(value).strip()
    if not text:
        return ""
    return text[:max_length] if max_length > 0 and len(text) > max_length else text


def escape_regex(value: Any) -> str:
    return re.escape(str(value or ""))


def is_object_id_like(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[0-9a-fA-F]{24}", value) is not None


def parse_int_param(value: Any, fallback: int | None = None) -> int | None:
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return fallback


def parse_float_param(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_bool_param(value: Any) -> bool | None:
    text = normalize_text(value, 10).lower()
    if text in {"true", "1"}:
        return True
    if text in {"false", "0"}:
        return False
    return None


def parse_integer_env(value: Any, fallback: int) -> int:
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return fallback


def parse_boolean_env(value: Any, fallback: bool = False) -> bool:
    if value is None:
        return fallback
    text = str(value).strip().lower()
    if text in {"true", "1"}:
        return True
    if text in {"false", "0"}:
        return False
    return fallback


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def random_compact_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def create_session_token() -> str:
    return secrets.token_hex(32)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()


def deep_clone(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


def deep_serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if isinstance(value, list):
        return [deep_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: deep_serialize(item) for key, item in value.items()}
    return value
