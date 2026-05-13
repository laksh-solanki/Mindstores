from __future__ import annotations

import json
import time
from typing import Any

import httpx
import jwt

from .admin_access import AdminAccessService
from .config import AppConfig
from .utils import create_session_token, normalize_text, now_iso, sha256_hex

JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
_jwks_cache: dict[str, Any] | None = None
_jwks_expiry = 0.0


async def get_firebase_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_expiry
    now = time.time()
    if _jwks_cache and _jwks_expiry > now:
        return _jwks_cache
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(JWKS_URL)
    response.raise_for_status()
    cache_control = response.headers.get("cache-control", "")
    max_age = 3600
    for part in cache_control.split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                max_age = int(part.split("=", 1)[1])
            except ValueError:
                max_age = 3600
    _jwks_cache = response.json()
    _jwks_expiry = now + max(60, max_age - 60)
    return _jwks_cache


async def verify_firebase_id_token(id_token: str, project_id: str) -> dict[str, Any]:
    if not project_id:
        raise ValueError("FIREBASE_PROJECT_ID is required")
    header = jwt.get_unverified_header(id_token)
    if header.get("alg") != "RS256" or not header.get("kid"):
        raise ValueError("Unsupported token header")
    jwks = await get_firebase_jwks()
    key = next((item for item in jwks.get("keys", []) if item.get("kid") == header["kid"]), None)
    if not key:
        global _jwks_expiry
        _jwks_expiry = 0
        raise ValueError("Signing key not found")
    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    payload = jwt.decode(
        id_token,
        public_key,
        algorithms=["RS256"],
        audience=project_id,
        issuer=f"https://securetoken.google.com/{project_id}",
        leeway=300,
    )
    subject = payload.get("sub")
    if not subject or len(str(subject)) > 128:
        raise ValueError("Token validation failed")
    return {**payload, "uid": payload.get("user_id") or subject}


def get_session_token_from_request(request: Any) -> str | None:
    token = request.cookies.get("session_token")
    if isinstance(token, str) and token.strip():
        return token.strip()
    return None


async def resolve_current_user(
    request: Any,
    db: Any,
    admin_access: AdminAccessService,
    config: AppConfig,
) -> dict[str, Any] | None:
    session_token = get_session_token_from_request(request)
    if session_token:
        token_hash = sha256_hex(session_token)
        session = await db.collection("user_sessions").find_one(
            {"$or": [{"session_token_hash": token_hash}, {"session_token": session_token}]},
        )
        if session:
            expires_at = str(session.get("expires_at") or "")
            if expires_at and expires_at > now_iso():
                user = await db.collection("users").find_one(
                    {"user_id": session.get("user_id")},
                    {"projection": {"_id": 0}},
                )
                if user:
                    email = str(user.get("email") or "").lower().strip()
                    return {**user, "is_admin": await admin_access.is_admin_email(email)}
            else:
                await db.collection("user_sessions").delete_one({"_id": session.get("_id")})

    auth_header = request.headers.get("authorization", "")
    parts = auth_header.strip().split(" ", 1)
    id_token = parts[1].strip() if len(parts) == 2 and parts[0].lower() == "bearer" else None
    if id_token and 100 <= len(id_token) <= 8000:
        try:
            decoded = await verify_firebase_id_token(id_token, config.firebase_project_id)
            uid = normalize_text(decoded.get("uid") or decoded.get("user_id") or decoded.get("sub"), 200)
            email = normalize_text(decoded.get("email") or "", 320).lower()
            if not uid or not email:
                return None
            user_id = f"user_{uid}"
            now = now_iso()
            name = normalize_text(decoded.get("name") or decoded.get("displayName") or "", 120) or "User"
            picture = normalize_text(decoded.get("picture") or "", 2048) or None
            await db.collection("users").update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "email": email,
                        "name": name,
                        "picture": picture,
                        "is_admin": await admin_access.is_admin_email(email),
                        "updated_at": now,
                    },
                    "$setOnInsert": {"user_id": user_id, "created_at": now},
                },
                upsert=True,
            )
            user = await db.collection("users").find_one({"user_id": user_id}, {"projection": {"_id": 0}})
            if user:
                return {**user, "is_admin": await admin_access.is_admin_email(email)}
        except Exception:
            return None
    return None


__all__ = [
    "create_session_token",
    "sha256_hex",
    "verify_firebase_id_token",
    "resolve_current_user",
]
