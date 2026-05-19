from __future__ import annotations

import re
from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request

from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import normalize_text, now_iso, random_compact_id
from .products import normalize_price_currency, normalize_product_image_urls

router = APIRouter()
DEFAULT_USER_ADMIN_OTP = "291206"


def normalize_mobile_country_code(value: Any) -> str:
    text = normalize_text(value, 8).replace(" ", "")
    if not text:
        return ""
    if not text.startswith("+"):
        text = f"+{text}"
    return text if re.fullmatch(r"\+[1-9]\d{0,3}", text) else ""


def normalize_mobile_number(value: Any) -> str:
    digits = re.sub(r"\D+", "", normalize_text(value, 32))
    return digits if 6 <= len(digits) <= 15 else ""


def normalize_otp(value: Any) -> str:
    text = normalize_text(value, 12).replace(" ", "")
    return text if re.fullmatch(r"\d{6}", text) else ""


def build_mobile_display(country_code: str, mobile_number: str) -> str:
    return " ".join(part for part in [country_code, mobile_number] if part)


def serialize_user_admin_profile(user: dict[str, Any] | None) -> dict[str, Any]:
    user = user or {}
    country_code = normalize_mobile_country_code(user.get("mobile_country_code"))
    mobile_number = normalize_mobile_number(user.get("mobile_number"))
    full_number = normalize_text(user.get("mobile_full_number"), 32) or build_mobile_display(country_code, mobile_number)
    return {
        "email": user.get("email"),
        "name": user.get("name"),
        "mobile_country_code": country_code,
        "mobile_number": mobile_number,
        "mobile_full_number": full_number,
        "mobile_verified_at": user.get("mobile_verified_at"),
        "has_mobile_access": bool(country_code and mobile_number and user.get("mobile_verified_at")),
    }


def serialize_user_product(product: dict[str, Any] | None) -> dict[str, Any] | None:
    if not product:
        return None
    return {key: value for key, value in product.items() if key != "_id"}


def validate_user_product_payload(data: dict[str, Any], *, partial: bool = False) -> tuple[dict[str, Any] | None, str | None]:
    if not isinstance(data, dict):
        return None, "Invalid product payload"

    updates: dict[str, Any] = {}
    if not partial or "name" in data:
        name = normalize_text(data.get("name"), 120)
        if not name:
            return None, "Product name is required"
        updates["name"] = name

    if "company" in data or not partial:
        updates["company"] = normalize_text(data.get("company"), 80)

    if not partial or "category" in data:
        category = normalize_text(data.get("category"), 80)
        if not category:
            return None, "Category is required"
        updates["category"] = category

    if "subcategory" in data or not partial:
        updates["subcategory"] = normalize_text(data.get("subcategory"), 80)

    if "description" in data or not partial:
        updates["description"] = normalize_text(data.get("description"), 5000)
    if "image_urls" in data or "image_url" in data or not partial:
        image_urls = normalize_product_image_urls(data.get("image_urls"), data.get("image_url"))
        if not image_urls:
            return None, "At least one image must be a valid http/https URL or image upload"
        updates["image_url"] = image_urls[0]
        updates["image_urls"] = image_urls
    if "price_currency" in data or "currency" in data or not partial:
        price_currency = normalize_price_currency(data.get("price_currency") or data.get("currency"))
        updates["price_currency"] = price_currency
        updates["currency"] = price_currency
    if "price_amount" in data or not partial:
        try:
            price_amount = float(data.get("price_amount", data.get("price", 0)))
        except (TypeError, ValueError):
            price_amount = float("nan")
        if price_amount != price_amount or price_amount < 0:
            return None, "Price amount must be a valid non-negative number"
        updates["price_amount"] = price_amount
    if "price" in data or "price_amount" in data or not partial:
        try:
            price = float(data.get("price_amount", data.get("price", 0)))
        except (TypeError, ValueError):
            price = float("nan")
        if price != price or price < 0:
            return None, "Price must be a valid non-negative number"
        updates["price"] = price
        updates["price_amount"] = price
    if "stock" in data or not partial:
        try:
            stock = float(data.get("stock", 0))
        except (TypeError, ValueError):
            stock = float("nan")
        if stock != stock or not stock.is_integer() or stock < 0:
            return None, "Stock must be a non-negative integer"
        updates["stock"] = int(stock)

    if not updates:
        return None, "No valid fields provided for update"
    return updates, None


def require_authenticated_user(ctx: RequestContext):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    return None


def require_mobile_access(ctx: RequestContext):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied
    profile = serialize_user_admin_profile(ctx.user)
    if not profile["has_mobile_access"]:
        return error_response(403, "Mobile verification required")
    return None


@router.get("/user-admin/profile")
async def get_user_admin_profile(ctx: RequestContext = Depends(get_context)):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied
    return json_response(serialize_user_admin_profile(ctx.user), 200, {"Cache-Control": "no-store"})


@router.post("/user-admin/mobile")
async def verify_user_admin_mobile(request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied

    data = await read_json_body(request, ctx.config.max_body_bytes)
    payload = data if isinstance(data, dict) else {}
    mobile_country_code = normalize_mobile_country_code(
        payload.get("mobile_country_code") or payload.get("mobileCountryCode") or payload.get("country_code") or payload.get("countryCode"),
    )
    mobile_number = normalize_mobile_number(payload.get("mobile_number") or payload.get("mobileNumber"))
    otp = normalize_otp(payload.get("otp"))
    if not mobile_country_code:
        return error_response(400, "Valid country calling code is required")
    if not mobile_number:
        return error_response(400, "Valid mobile number is required")
    if not otp:
        return error_response(400, "Valid OTP is required")
    if otp != DEFAULT_USER_ADMIN_OTP:
        return error_response(400, "Invalid OTP")

    now = now_iso()
    mobile_full_number = build_mobile_display(mobile_country_code, mobile_number)
    await ctx.db.collection("users").update_one(
        {"user_id": ctx.user.get("user_id")},
        {
            "$set": {
                "mobile_country_code": mobile_country_code,
                "mobile_number": mobile_number,
                "mobile_full_number": mobile_full_number,
                "mobile_verified_at": now,
                "mobile_verification_provider": "default_otp",
                "updated_at": now,
            },
        },
    )
    updated = await ctx.db.collection("users").find_one({"user_id": ctx.user.get("user_id")}, {"projection": {"_id": 0}})
    return json_response(
        {
            "message": "Mobile number verified",
            "profile": serialize_user_admin_profile(updated),
            "user": updated,
        },
        200,
        {"Cache-Control": "no-store"},
    )


@router.get("/user-admin/products")
async def list_user_products(ctx: RequestContext = Depends(get_context)):
    denied = require_mobile_access(ctx)
    if denied:
        return denied
    products = await ctx.db.collection("user_products").find(
        {"owner_user_id": ctx.user.get("user_id")},
        {"projection": {"_id": 0}, "sort": {"updated_at": -1, "created_at": -1}},
    ).to_array()
    return json_response({"items": [serialize_user_product(item) for item in products]}, 200, {"Cache-Control": "no-store"})


@router.post("/user-admin/products")
async def create_user_product(request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_mobile_access(ctx)
    if denied:
        return denied
    data = await read_json_body(request, ctx.config.max_body_bytes)
    payload, error = validate_user_product_payload(data if isinstance(data, dict) else {})
    if error:
        return error_response(400, error)
    now = now_iso()
    product = {
        **payload,
        "product_id": random_compact_id("userprod"),
        "status": "draft",
        "owner_user_id": ctx.user.get("user_id"),
        "owner_email": ctx.user.get("email"),
        "created_at": now,
        "updated_at": now,
    }
    await ctx.db.collection("user_products").insert_one(product)
    return json_response(serialize_user_product(product), 201, {"Cache-Control": "no-store"})


@router.put("/user-admin/products/{product_id}")
async def update_user_product(product_id: str, request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_mobile_access(ctx)
    if denied:
        return denied
    normalized_product_id = normalize_text(unquote(product_id), 100)
    data = await read_json_body(request, ctx.config.max_body_bytes)
    updates, error = validate_user_product_payload(data if isinstance(data, dict) else {}, partial=True)
    if error:
        return error_response(400, error)
    updates["updated_at"] = now_iso()
    product_filter = {"owner_user_id": ctx.user.get("user_id"), "product_id": normalized_product_id}
    result = await ctx.db.collection("user_products").update_one(product_filter, {"$set": updates})
    if result.matchedCount == 0:
        return error_response(404, "Product draft not found")
    updated = await ctx.db.collection("user_products").find_one(product_filter, {"projection": {"_id": 0}})
    return json_response(serialize_user_product(updated), 200, {"Cache-Control": "no-store"})


@router.delete("/user-admin/products/{product_id}")
async def delete_user_product(product_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_mobile_access(ctx)
    if denied:
        return denied
    product_filter = {
        "owner_user_id": ctx.user.get("user_id"),
        "product_id": normalize_text(unquote(product_id), 100),
    }
    result = await ctx.db.collection("user_products").delete_one(product_filter)
    if result.deletedCount == 0:
        return error_response(404, "Product draft not found")
    return json_response({"message": "Product draft removed"}, 200, {"Cache-Control": "no-store"})
