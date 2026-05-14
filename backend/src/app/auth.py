from __future__ import annotations

import json
import time
from base64 import urlsafe_b64decode
from typing import Any

import httpx

from .admin_access import AdminAccessService
from .config import AppConfig
from .utils import create_session_token, normalize_text, now_iso, sha256_hex

FIREBASE_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup"


def decode_unverified_jwt_payload(id_token: str) -> dict[str, Any]:
    try:
        parts = id_token.split(".")
        if len(parts) != 3:
            return {}
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        decoded = urlsafe_b64decode(payload.encode("ascii"))
        data = json.loads(decoded.decode("utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


async def verify_firebase_id_token(id_token: str, config: AppConfig | str) -> dict[str, Any]:
    if isinstance(config, AppConfig):
        project_id = config.firebase_project_id
        web_api_key = config.firebase_web_api_key
    else:
        project_id = config
        web_api_key = ""

    if not project_id:
        raise ValueError("FIREBASE_PROJECT_ID is required")
    if not web_api_key:
        raise ValueError("FIREBASE_WEB_API_KEY is required")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{FIREBASE_LOOKUP_URL}?key={web_api_key}",
            json={"idToken": id_token},
        )
    response.raise_for_status()
    data = response.json()
    users = data.get("users") if isinstance(data, dict) else None
    if not isinstance(users, list) or not users:
        raise ValueError("Token validation failed")

    account = users[0] if isinstance(users[0], dict) else {}
    uid = normalize_text(account.get("localId"), 200)
    email = normalize_text(account.get("email"), 320).lower()
    if not uid or not email:
        raise ValueError("Token validation failed")

    payload = decode_unverified_jwt_payload(id_token)
    if payload.get("aud") != project_id or payload.get("iss") != f"https://securetoken.google.com/{project_id}":
        raise ValueError("Token project validation failed")

    expires_at = int(payload.get("exp") or 0)
    issued_at = int(payload.get("iat") or 0)
    now = int(time.time())
    if expires_at <= now - 300 or issued_at > now + 300:
        raise ValueError("Token time validation failed")

    return {
        **payload,
        "uid": uid,
        "user_id": uid,
        "sub": payload.get("sub") or uid,
        "email": email,
        "name": account.get("displayName") or payload.get("name"),
        "picture": account.get("photoUrl") or payload.get("picture"),
        "email_verified": bool(account.get("emailVerified")),
        "firebase": payload.get("firebase"),
    }


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
            decoded = await verify_firebase_id_token(id_token, config)
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
