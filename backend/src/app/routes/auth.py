import hashlib
import re
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request
from starlette.responses import RedirectResponse

from ..auth import create_session_token, sha256_hex, verify_firebase_id_token
from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import normalize_text, now_iso, extract_country_from_email, random_compact_id

router = APIRouter()
PRIVATE_USER_RESPONSE_FIELDS = {
    "user_admin_pin_hash",
    "user_admin_pin_salt",
    "user_admin_otp_hash",
    "user_admin_otp_salt",
    "password_hash",
    "password_salt",
}
PASSWORD_HASH_ITERATIONS = 100_000


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    ).hex()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def normalize_locale(value: Any) -> str | None:
    return normalize_text(value, 48) or None


def normalize_profile_name(value: Any) -> str | None:
    return normalize_text(value, 120) or None


def normalize_country_code(value: Any) -> str | None:
    text = normalize_text(value, 8).upper()
    return text if re.fullmatch(r"[A-Z]{2}", text) else None


def extract_country_from_locale(locale: str = "") -> str | None:
    match = re.match(r"^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$", str(locale), re.IGNORECASE)
    return match.group(1).upper() if match else None


def normalize_image_url(value: Any) -> str | None:
    if value is None:
        return None
    text = normalize_text(value)
    if not text:
        return None
    if text.startswith("data:image/"):
        return text if re.fullmatch(r"data:image/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+", text, re.IGNORECASE) and len(text) <= 700_000 else None
    if len(text) > 2048:
        return None
    return text if text.startswith("http://") or text.startswith("https://") else None


async def build_user_response(user: dict[str, Any] | None, ctx: RequestContext) -> dict[str, Any] | None:
    if not user:
        return None
    email = str(user.get("email") or "").lower().strip()
    safe_user = {key: value for key, value in user.items() if key not in PRIVATE_USER_RESPONSE_FIELDS}
    safe_user["has_user_admin_pin"] = bool(user.get("user_admin_pin_hash") and user.get("user_admin_pin_salt"))
    return {**safe_user, "is_admin": await ctx.admin_access.is_admin_email(email)}


def resolve_country_code(decoded: dict[str, Any], body: dict[str, Any], locale: str | None, existing: dict[str, Any] | None, email: str | None = None) -> str | None:
    return (
        normalize_country_code(decoded.get("country_code"))
        or normalize_country_code(decoded.get("country"))
        or normalize_country_code(body.get("country_code"))
        or normalize_country_code(body.get("countryCode"))
        or normalize_country_code(extract_country_from_locale(locale or ""))
        or normalize_country_code((existing or {}).get("country_code"))
        or normalize_country_code(extract_country_from_email(email or decoded.get("email") or body.get("email")))
    )


def get_request_base_url(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{forwarded_proto}://{forwarded_host}".rstrip("/")


def resolve_google_redirect_uri(request: Request, ctx: RequestContext) -> str:
    if ctx.config.google_redirect_uri:
        return ctx.config.google_redirect_uri
    base = get_request_base_url(request)
    return f"{base}/auth/google/callback"


def now_iso_from_days(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat().replace("+00:00", "Z")


def is_safe_redirect_target(target: str, allowed_origins: list[str]) -> bool:
    try:
        parsed = urllib.parse.urlparse(target)
        if not parsed.scheme and not parsed.netloc:
            return target.startswith("/") and not target.startswith("//")
        origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
        if "*" in allowed_origins or origin in allowed_origins:
            return True
        hostname = (parsed.hostname or "").lower()
        if hostname in ("localhost", "127.0.0.1"):
            return True
        if hostname.endswith(".vercel.app") or hostname.endswith(".onrender.com"):
            return True
        return False
    except Exception:
        return False


def resolve_frontend_target(
    raw_target: str,
    allowed_origins: list[str],
    default_base: str,
    request: Request | None = None,
) -> str:
    target = (raw_target or "").strip()
    base = default_base.rstrip("/") if default_base else ""
    if not base and request:
        base = get_request_base_url(request)
    if not base:
        base = "http://localhost:3000"

    if target and is_safe_redirect_target(target, allowed_origins):
        if target.startswith("/"):
            return f"{base}{target}"
        return target
    return f"{base}/"


@router.get("/auth/google")
async def google_oauth_start(
    request: Request,
    return_to: str = "/",
    ctx: RequestContext = Depends(get_context),
):
    frontend_base = (ctx.config.frontend_url or get_request_base_url(request)).rstrip("/")
    sanitized_target = resolve_frontend_target(return_to, ctx.config.allowed_origins, frontend_base, request)

    if not ctx.config.google_client_id:
        accept = request.headers.get("accept", "")
        if "application/json" in accept and "text/html" not in accept:
            return error_response(501, "Google OAuth is not configured. GOOGLE_CLIENT_ID is required.")
        parsed_target = urllib.parse.urlparse(sanitized_target)
        target_origin = f"{parsed_target.scheme}://{parsed_target.netloc}" if parsed_target.scheme and parsed_target.netloc else frontend_base
        return RedirectResponse(
            url=f"{target_origin}/login?oauth_error=oauth_not_configured",
            status_code=302,
        )

    state_token = secrets.token_urlsafe(32)
    oauth_state_data = f"{state_token}:{sanitized_target}"

    redirect_uri = resolve_google_redirect_uri(request, ctx)
    params = {
        "client_id": ctx.config.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state_token,
        "prompt": "select_account",
        "access_type": "online",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    response = RedirectResponse(url=auth_url, status_code=302)
    response.set_cookie(
        "oauth_state",
        oauth_state_data,
        httponly=True,
        secure=ctx.config.use_secure_cookies,
        samesite="lax",
        path="/",
        max_age=600,
    )
    return response


@router.get("/auth/google/callback")
async def google_oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    ctx: RequestContext = Depends(get_context),
):
    frontend_base = (ctx.config.frontend_url or get_request_base_url(request)).rstrip("/")
    cookie_state_data = request.cookies.get("oauth_state") or ""

    saved_state = ""
    target_url = ""
    if ":" in cookie_state_data:
        saved_state, target_url = cookie_state_data.split(":", 1)
    else:
        saved_state = cookie_state_data

    final_redirect_url = resolve_frontend_target(target_url, ctx.config.allowed_origins, frontend_base, request)
    parsed_final = urllib.parse.urlparse(final_redirect_url)
    target_origin = f"{parsed_final.scheme}://{parsed_final.netloc}" if parsed_final.scheme and parsed_final.netloc else frontend_base

    def error_redirect(reason: str) -> RedirectResponse:
        url = f"{target_origin}/login?oauth_error={urllib.parse.quote(reason)}"
        res = RedirectResponse(url=url, status_code=302)
        res.delete_cookie("oauth_state", path="/")
        return res

    if error:
        return error_redirect(f"google_error_{error}")

    if not code or not state:
        return error_redirect("missing_code_or_state")

    if not saved_state or not secrets.compare_digest(state, saved_state):
        return error_redirect("invalid_state")

    if not ctx.config.google_client_id or not ctx.config.google_client_secret:
        return error_redirect("oauth_not_configured")

    redirect_uri = resolve_google_redirect_uri(request, ctx)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": ctx.config.google_client_id,
                    "client_secret": ctx.config.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                print("[google_oauth_callback] Token exchange failed:", token_resp.text)
                return error_redirect("token_exchange_failed")
            token_data = token_resp.json()

            access_token = token_data.get("access_token")
            if not access_token:
                return error_redirect("missing_access_token")

            userinfo_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                print("[google_oauth_callback] UserInfo fetch failed:", userinfo_resp.text)
                return error_redirect("userinfo_fetch_failed")
            userinfo = userinfo_resp.json()
    except Exception as exc:
        print("[google_oauth_callback] OAuth communication error:", exc)
        return error_redirect("oauth_request_failed")

    google_sub = normalize_text(userinfo.get("sub"), 200)
    email = normalize_text(userinfo.get("email"), 320).lower()
    if not google_sub or not email:
        return error_redirect("invalid_user_data")

    user_id = f"user_{google_sub}"
    now = now_iso()

    existing = await ctx.db.collection("users").find_one({"user_id": user_id}, {"projection": {"_id": 0}})
    existing_by_email = await ctx.db.collection("users").find_one(
        {"email": email, "user_id": {"$ne": user_id}},
        {"projection": {"_id": 0}},
    ) if not existing else None

    base_user = existing or existing_by_email or {}
    target_user_id = existing.get("user_id") if existing else (existing_by_email.get("user_id") if existing_by_email else user_id)

    locale = normalize_locale(userinfo.get("locale")) or normalize_locale(base_user.get("locale"))
    country_code = resolve_country_code(userinfo, {}, locale, base_user, email) or "IN"
    profile_name = normalize_profile_name(userinfo.get("name")) or normalize_profile_name(base_user.get("name")) or "User"
    profile_picture = normalize_image_url(userinfo.get("picture")) or normalize_image_url(base_user.get("picture"))
    is_admin = await ctx.admin_access.is_admin_email(email)

    updates_set: dict[str, Any] = {
        "email": email,
        "name": profile_name,
        "picture": profile_picture,
        "locale": locale,
        "country_code": country_code,
        "is_admin": is_admin,
        "updated_at": now,
    }

    merged_delivery_profile = base_user.get("delivery_profile")
    merged_phone = base_user.get("phone")
    merged_mobile = base_user.get("mobile")

    if merged_delivery_profile:
        updates_set["delivery_profile"] = merged_delivery_profile
    if merged_phone:
        updates_set["phone"] = merged_phone
    if merged_mobile:
        updates_set["mobile"] = merged_mobile

    for pref_key in [
        "currency",
        "order_updates",
        "promotional_emails",
        "quick_checkout",
        "low_stock_alerts",
        "save_delivery_details",
    ]:
        val = base_user.get(pref_key)
        if val is not None:
            updates_set[pref_key] = val

    await ctx.db.collection("users").update_one(
        {"user_id": target_user_id},
        {
            "$set": updates_set,
            "$setOnInsert": {"user_id": target_user_id, "created_at": now},
        },
        upsert=True,
    )

    session_token = create_session_token()
    expires_at = now_iso_from_days(ctx.config.session_duration_days)
    await ctx.db.collection("user_sessions").insert_one(
        {
            "user_id": target_user_id,
            "session_token_hash": sha256_hex(session_token),
            "expires_at": expires_at,
            "created_at": now,
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for", "").split(",")[0].strip() or "unknown",
        },
    )

    sessions = await ctx.db.collection("user_sessions").find(
        {"user_id": target_user_id},
        {"projection": {"_id": 1, "expires_at": 1, "created_at": 1}},
    ).sort({"created_at": -1}).to_array()
    delete_ids = [item.get("_id") for index, item in enumerate(sessions) if item.get("_id") and (str(item.get("expires_at") or "") <= now_iso() or index >= 5)]
    if delete_ids:
        await ctx.db.collection("user_sessions").delete_many({"_id": {"$in": delete_ids}})

    response = RedirectResponse(url=final_redirect_url, status_code=302)
    response.set_cookie(
        "session_token",
        session_token,
        httponly=True,
        secure=ctx.config.use_secure_cookies,
        samesite=ctx.config.cookie_samesite,
        path="/",
        max_age=ctx.config.session_duration_days * 86_400,
    )
    response.delete_cookie("oauth_state", path="/")
    return response


@router.post("/auth/register")
async def register_user(request: Request, ctx: RequestContext = Depends(get_context)):
    try:
        body = await read_json_body(request, ctx.config.max_body_bytes)
    except ValueError as exc:
        if str(exc) == "BODY_TOO_LARGE":
            return error_response(413, "Request body too large")
        if str(exc) == "INVALID_JSON":
            return error_response(400, "Invalid JSON body")
        if str(exc) == "INVALID_INPUT_KEY":
            return error_response(400, "Invalid characters in request")
        return error_response(400, "Unable to parse request body")

    data = body if isinstance(body, dict) else {}
    name = normalize_profile_name(data.get("name"))
    email = normalize_text(data.get("email"), 320).lower()
    password = str(data.get("password") or "")

    if not name:
        return error_response(400, "Full name is required.")
    if not email or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return error_response(400, "Please enter a valid email address.")
    if not password or len(password) < 6:
        return error_response(400, "Password must be at least 6 characters.")
    if len(password) > 128:
        return error_response(400, "Password cannot exceed 128 characters.")

    existing = await ctx.db.collection("users").find_one({"email": email})
    if existing and existing.get("password_hash"):
        return error_response(400, "This email is already in use. Please log in instead.")

    salt = secrets.token_hex(16)
    pw_hash = hash_password(password, salt)
    now = now_iso()

    if existing:
        user_id = existing["user_id"]
        await ctx.db.collection("users").update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "name": name or existing.get("name"),
                    "password_hash": pw_hash,
                    "password_salt": salt,
                    "updated_at": now,
                }
            },
        )
    else:
        user_id = random_compact_id("user")
        country_code = extract_country_from_email(email) or "IN"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": pw_hash,
            "password_salt": salt,
            "picture": None,
            "locale": None,
            "country_code": country_code,
            "is_admin": await ctx.admin_access.is_admin_email(email),
            "created_at": now,
            "updated_at": now,
        }
        await ctx.db.collection("users").insert_one(new_user)

    session_token = create_session_token()
    expires_at = now_iso_from_days(ctx.config.session_duration_days)
    await ctx.db.collection("user_sessions").insert_one(
        {
            "user_id": user_id,
            "session_token_hash": sha256_hex(session_token),
            "expires_at": expires_at,
            "created_at": now,
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.headers.get("cf-connecting-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or "unknown",
        }
    )

    user = await ctx.db.collection("users").find_one({"user_id": user_id}, {"projection": {"_id": 0}})
    response = json_response({"user": await build_user_response(user, ctx)}, 201, {"Cache-Control": "no-store"})
    response.set_cookie(
        "session_token",
        session_token,
        httponly=True,
        secure=ctx.config.use_secure_cookies,
        samesite=ctx.config.cookie_samesite,
        path="/",
        max_age=ctx.config.session_duration_days * 86_400,
    )
    return response


@router.post("/auth/login")
async def login_user(request: Request, ctx: RequestContext = Depends(get_context)):
    try:
        body = await read_json_body(request, ctx.config.max_body_bytes)
    except ValueError as exc:
        if str(exc) == "BODY_TOO_LARGE":
            return error_response(413, "Request body too large")
        if str(exc) == "INVALID_JSON":
            return error_response(400, "Invalid JSON body")
        if str(exc) == "INVALID_INPUT_KEY":
            return error_response(400, "Invalid characters in request")
        return error_response(400, "Unable to parse request body")

    data = body if isinstance(body, dict) else {}
    email = normalize_text(data.get("email"), 320).lower()
    password = str(data.get("password") or "")

    if not email or not password:
        return error_response(400, "Email and password are required.")

    user = await ctx.db.collection("users").find_one({"email": email})
    if not user:
        return error_response(401, "Invalid email or password.")

    if not user.get("password_hash") or not user.get("password_salt"):
        return error_response(401, "This account was registered with Google sign-in. Please continue with Google.")

    expected_hash = hash_password(password, user["password_salt"])
    if not secrets.compare_digest(user["password_hash"], expected_hash):
        return error_response(401, "Invalid email or password.")

    user_id = user["user_id"]
    now = now_iso()
    session_token = create_session_token()
    expires_at = now_iso_from_days(ctx.config.session_duration_days)

    await ctx.db.collection("user_sessions").insert_one(
        {
            "user_id": user_id,
            "session_token_hash": sha256_hex(session_token),
            "expires_at": expires_at,
            "created_at": now,
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.headers.get("cf-connecting-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or "unknown",
        }
    )

    clean_user = await ctx.db.collection("users").find_one({"user_id": user_id}, {"projection": {"_id": 0}})
    response = json_response({"user": await build_user_response(clean_user, ctx)}, 200, {"Cache-Control": "no-store"})
    response.set_cookie(
        "session_token",
        session_token,
        httponly=True,
        secure=ctx.config.use_secure_cookies,
        samesite=ctx.config.cookie_samesite,
        path="/",
        max_age=ctx.config.session_duration_days * 86_400,
    )
    return response


@router.post("/auth/firebase-login")
async def firebase_login(request: Request, ctx: RequestContext = Depends(get_context)):
    try:
        body = await read_json_body(request, ctx.config.max_body_bytes)
    except ValueError as exc:
        if str(exc) == "BODY_TOO_LARGE":
            return error_response(413, "Request body too large")
        if str(exc) == "INVALID_JSON":
            return error_response(400, "Invalid JSON body")
        if str(exc) == "INVALID_INPUT_KEY":
            return error_response(400, "Invalid characters in request")
        return error_response(400, "Unable to parse request body")
    data = body if isinstance(body, dict) else {}
    id_token = normalize_text(data.get("idToken"), 8000)
    if not id_token or len(id_token) < 100:
        return error_response(400, "Valid ID Token required")

    try:
        decoded = await verify_firebase_id_token(id_token, ctx.config)
        uid = normalize_text(decoded.get("uid") or decoded.get("user_id"), 200)
        email = normalize_text(decoded.get("email") or "", 320).lower()
        if not uid or not email:
            return error_response(401, "Invalid Token")
        user_id = f"user_{uid}"
        now = now_iso()
        existing = await ctx.db.collection("users").find_one({"user_id": user_id}, {"projection": {"_id": 0}})
        
        locale = normalize_locale(decoded.get("locale")) or normalize_locale(data.get("locale")) or normalize_locale((existing or {}).get("locale"))
        country_code = resolve_country_code(decoded, data, locale, existing, email) or "IN"
        profile_name = normalize_profile_name(decoded.get("name")) or normalize_profile_name((existing or {}).get("name")) or "User"
        profile_picture = normalize_image_url(decoded.get("picture")) or normalize_image_url((existing or {}).get("picture"))
        is_admin = await ctx.admin_access.is_admin_email(email)

        updates_set = {
            "email": email,
            "name": profile_name,
            "picture": profile_picture,
            "locale": locale,
            "country_code": country_code,
            "is_admin": is_admin,
            "updated_at": now,
        }

        # Merge country, mobile/phone, and delivery profile address
        merged_delivery_profile = (existing or {}).get("delivery_profile")
        merged_phone = (existing or {}).get("phone")
        merged_mobile = (existing or {}).get("mobile")

        if merged_delivery_profile:
            updates_set["delivery_profile"] = merged_delivery_profile
        if merged_phone:
            updates_set["phone"] = merged_phone
        if merged_mobile:
            updates_set["mobile"] = merged_mobile

        for pref_key in [
            "currency",
            "order_updates",
            "promotional_emails",
            "quick_checkout",
            "low_stock_alerts",
            "save_delivery_details",
        ]:
            val = (existing or {}).get(pref_key)
            if val is not None:
                updates_set[pref_key] = val

        await ctx.db.collection("users").update_one(
            {"user_id": user_id},
            {
                "$set": updates_set,
                "$setOnInsert": {"user_id": user_id, "created_at": now},
            },
            upsert=True,
        )
        session_token = create_session_token()
        expires_at = now_iso_from_days(ctx.config.session_duration_days)
        await ctx.db.collection("user_sessions").insert_one(
            {
                "user_id": user_id,
                "session_token_hash": sha256_hex(session_token),
                "expires_at": expires_at,
                "created_at": now,
                "user_agent": request.headers.get("user-agent"),
                "ip_address": request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for", "").split(",")[0].strip() or "unknown",
            },
        )
        sessions = await ctx.db.collection("user_sessions").find(
            {"user_id": user_id},
            {"projection": {"_id": 1, "expires_at": 1, "created_at": 1}},
        ).sort({"created_at": -1}).to_array()
        delete_ids = [item.get("_id") for index, item in enumerate(sessions) if item.get("_id") and (str(item.get("expires_at") or "") <= now_iso() or index >= 5)]
        if delete_ids:
            await ctx.db.collection("user_sessions").delete_many({"_id": {"$in": delete_ids}})
        user = await ctx.db.collection("users").find_one({"user_id": user_id}, {"projection": {"_id": 0}})
        response = json_response({"user": await build_user_response(user, ctx)}, 200, {"Cache-Control": "no-store"})
        response.set_cookie(
            "session_token",
            session_token,
            httponly=True,
            secure=ctx.config.use_secure_cookies,
            samesite=ctx.config.cookie_samesite,
            path="/",
            max_age=ctx.config.session_duration_days * 86_400,
        )
        return response
    except Exception as exc:
        print("[auth/firebase-login]", exc)
        return error_response(401, "Invalid Token")


@router.get("/auth/me")
async def auth_me(ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return json_response({"user": None, "authenticated": False}, 200, {"Cache-Control": "no-store"})
    user_payload = await build_user_response(ctx.user, ctx)
    return json_response({"user": user_payload, "authenticated": True, **user_payload}, 200, {"Cache-Control": "no-store"})


@router.put("/auth/profile")
async def update_profile(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    try:
        body = await read_json_body(request, ctx.config.max_body_bytes)
    except ValueError as exc:
        if str(exc) == "BODY_TOO_LARGE":
            return error_response(413, "Request body too large")
        if str(exc) == "INVALID_JSON":
            return error_response(400, "Invalid JSON body")
        if str(exc) == "INVALID_INPUT_KEY":
            return error_response(400, "Invalid characters in request")
        return error_response(400, "Unable to parse request body")
    data = body if isinstance(body, dict) else {}
    updates: dict[str, Any] = {}
    if "name" in data:
        name = normalize_profile_name(data.get("name"))
        if not name:
            return error_response(400, "Valid name is required")
        updates["name"] = name
    if "picture" in data:
        picture = data.get("picture")
        if picture is None or (isinstance(picture, str) and not picture.strip()):
            updates["picture"] = None
        else:
            normalized = normalize_image_url(picture)
            if not normalized:
                return error_response(400, "Profile image must be a valid image upload or http/https URL")
            updates["picture"] = normalized
    if "country_code" in data or "countryCode" in data:
        raw = data.get("country_code") if "country_code" in data else data.get("countryCode")
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            updates["country_code"] = None
        else:
            country_code = normalize_country_code(raw)
            if not country_code:
                return error_response(400, "country_code must be a 2-letter code")
            updates["country_code"] = country_code
    if "delivery_profile" in data or "deliveryProfile" in data:
        dp = data.get("delivery_profile") if "delivery_profile" in data else data.get("deliveryProfile")
        if dp is None:
            updates["delivery_profile"] = None
            updates["phone"] = None
            updates["mobile"] = None
        elif isinstance(dp, dict):
            phone = normalize_text(dp.get("phone"), 32)
            address = normalize_text(dp.get("address"), 220)
            city = normalize_text(dp.get("city"), 96)
            state = normalize_text(dp.get("state"), 96)
            postal_code = normalize_text(dp.get("postal_code") or dp.get("postalCode") or dp.get("zip"), 32)
            instructions = normalize_text(dp.get("instructions"), 240)
            updates["delivery_profile"] = {
                "phone": phone or "",
                "address": address or "",
                "city": city or "",
                "state": state or "",
                "postal_code": postal_code or "",
                "instructions": instructions or "",
            }
            if phone:
                updates["phone"] = phone
                updates["mobile"] = phone
    if "currency" in data:
        curr = normalize_text(data.get("currency"), 8)
        if curr:
            curr_upper = curr.upper()
            if curr_upper in ("USD", "EUR", "GBP", "INR"):
                updates["currency"] = curr_upper
    for snake, camel in [
        ("order_updates", "orderUpdates"),
        ("promotional_emails", "promotionalEmails"),
        ("quick_checkout", "quickCheckout"),
        ("low_stock_alerts", "lowStockAlerts"),
        ("save_delivery_details", "saveDeliveryDetails"),
    ]:
        if snake in data or camel in data:
            val = data.get(snake) if snake in data else data.get(camel)
            if isinstance(val, bool):
                updates[snake] = val
    if not updates:
        return json_response(await build_user_response(ctx.user, ctx), 200, {"Cache-Control": "no-store"})
    updates["updated_at"] = now_iso()
    await ctx.db.collection("users").update_one({"user_id": ctx.user.get("user_id")}, {"$set": updates})
    updated = await ctx.db.collection("users").find_one({"user_id": ctx.user.get("user_id")}, {"projection": {"_id": 0}})
    return json_response(await build_user_response(updated, ctx), 200, {"Cache-Control": "no-store"})


@router.post("/auth/logout")
async def logout(request: Request, ctx: RequestContext = Depends(get_context)):
    token = request.cookies.get("session_token")
    if token:
        await ctx.db.collection("user_sessions").delete_many({"$or": [{"session_token_hash": sha256_hex(token)}, {"session_token": token}]})
    response = json_response({"message": "Logged out successfully"}, 200, {"Cache-Control": "no-store"})
    response.set_cookie(
        "session_token",
        "",
        httponly=True,
        secure=ctx.config.use_secure_cookies,
        samesite=ctx.config.cookie_samesite,
        path="/",
        max_age=0,
    )
    return response


@router.delete("/auth/account")
async def delete_account(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    
    user_id = ctx.user.get("user_id")

    await ctx.db.collection("products").delete_many({"owner_user_id": user_id})
    await ctx.db.collection("user_products").delete_many({"owner_user_id": user_id})
    await ctx.db.collection("product_reviews").delete_many({"reviewer_user_id": user_id})
    await ctx.db.collection("user_sessions").delete_many({"user_id": user_id})
    await ctx.db.collection("carts").delete_many({"user_id": user_id})
    await ctx.db.collection("orders").delete_many({"user_id": user_id})
    await ctx.db.collection("messages").delete_many({"$or": [{"user_id": user_id}, {"recipient_user_id": user_id}]})
    await ctx.db.collection("users").delete_one({"user_id": user_id})
    
    response = json_response({"message": "Account deleted successfully"}, 200, {"Cache-Control": "no-store"})
    response.set_cookie(
        "session_token",
        "",
        httponly=True,
        secure=ctx.config.use_secure_cookies,
        samesite=ctx.config.cookie_samesite,
        path="/",
        max_age=0,
    )
    return response
