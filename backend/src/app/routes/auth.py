from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import create_session_token, sha256_hex, verify_firebase_id_token
from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import normalize_text, now_iso, extract_country_from_email

router = APIRouter()
PRIVATE_USER_RESPONSE_FIELDS = {"user_admin_pin_hash", "user_admin_pin_salt"}


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


@router.post("/auth/firebase-login")
async def firebase_login(request: Request, ctx: RequestContext = Depends(get_context)):
    try:
        body = await read_json_body(request, ctx.config.max_body_bytes)
    except ValueError as exc:
        if str(exc) == "BODY_TOO_LARGE":
            return error_response(413, "Request body too large")
        if str(exc) == "INVALID_JSON":
            return error_response(400, "Invalid JSON body")
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
        
        # Look up by email (Google ID email) to fetch country, mobile, address details
        existing_by_email = await ctx.db.collection("users").find_one(
            {"email": email, "user_id": {"$ne": user_id}},
            {"projection": {"_id": 0}}
        )

        locale = normalize_locale(decoded.get("locale")) or normalize_locale(data.get("locale")) or normalize_locale((existing or {}).get("locale")) or normalize_locale((existing_by_email or {}).get("locale"))
        country_code = resolve_country_code(decoded, data, locale, existing or existing_by_email, email)
        profile_name = normalize_profile_name(decoded.get("name")) or normalize_profile_name((existing or {}).get("name")) or normalize_profile_name((existing_by_email or {}).get("name")) or "User"
        profile_picture = normalize_image_url(decoded.get("picture")) or normalize_image_url((existing or {}).get("picture")) or normalize_image_url((existing_by_email or {}).get("picture"))
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
        merged_delivery_profile = (existing or {}).get("delivery_profile") or (existing_by_email or {}).get("delivery_profile")
        merged_phone = (existing or {}).get("phone") or (existing_by_email or {}).get("phone")
        merged_mobile = (existing or {}).get("mobile") or (existing_by_email or {}).get("mobile")

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
            if val is None and existing_by_email:
                val = existing_by_email.get(pref_key)
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


def now_iso_from_days(days: int) -> str:
    from datetime import datetime, timedelta, timezone

    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat().replace("+00:00", "Z")


@router.get("/auth/me")
async def auth_me(ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    return json_response(await build_user_response(ctx.user, ctx), 200, {"Cache-Control": "no-store"})


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
