from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request

from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..delivery import (
    DELIVERY_STATUS_COMPLETED,
    DELIVERY_STATUS_PENDING,
    DELIVERY_STATUS_SHIPPING,
    cancel_delivery_item,
    find_delivery_item_index,
    transition_delivery_item,
)
from ..utils import normalize_text, now_iso, random_compact_id
from .products import normalize_price_currency, normalize_product_image_urls

router = APIRouter()
USER_ADMIN_PIN_LENGTH = 6
USER_ADMIN_PIN_HASH_ITERATIONS = 120_000
USER_ADMIN_PIN_UNLOCK_HOURS = 12


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


def build_mobile_display(country_code: str, mobile_number: str) -> str:
    return " ".join(part for part in [country_code, mobile_number] if part)


def normalize_pin(value: Any) -> str:
    text = normalize_text(value, 16).replace(" ", "")
    return text if re.fullmatch(rf"\d{{{USER_ADMIN_PIN_LENGTH}}}", text) else ""


def build_pin_hash(pin: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        pin.encode("utf-8"),
        salt.encode("utf-8"),
        USER_ADMIN_PIN_HASH_ITERATIONS,
    ).hex()


def create_pin_secret(pin: str) -> tuple[str, str]:
    salt = secrets.token_hex(16)
    return salt, build_pin_hash(pin, salt)


def has_user_admin_pin(user: dict[str, Any] | None) -> bool:
    user = user or {}
    return bool(user.get("user_admin_pin_hash") and user.get("user_admin_pin_salt"))


def verify_user_admin_pin(pin: str, user: dict[str, Any] | None) -> bool:
    user = user or {}
    salt = normalize_text(user.get("user_admin_pin_salt"), 128)
    stored_hash = normalize_text(user.get("user_admin_pin_hash"), 256)
    if not pin or not salt or not stored_hash:
        return False
    return hmac.compare_digest(build_pin_hash(pin, salt), stored_hash)


def user_admin_pin_unlock_until() -> str:
    return (
        datetime.now(timezone.utc)
        + timedelta(hours=USER_ADMIN_PIN_UNLOCK_HOURS)
    ).isoformat().replace("+00:00", "Z")


def has_active_pin_access(user: dict[str, Any] | None) -> bool:
    if not has_user_admin_pin(user):
        return False
    user = user or {}
    if user.get("user_admin_blocked"):
        return False
    locked_until = normalize_text(user.get("user_admin_pin_locked_until"), 48)
    if locked_until and locked_until > now_iso():
        return False
    unlocked_until = normalize_text(user.get("user_admin_pin_unlocked_until"), 48)
    return bool(unlocked_until and unlocked_until > now_iso())


def serialize_user_admin_profile(user: dict[str, Any] | None) -> dict[str, Any]:
    user = user or {}
    pin_created = has_user_admin_pin(user)
    country_code = normalize_mobile_country_code(user.get("mobile_country_code"))
    mobile_number = normalize_mobile_number(user.get("mobile_number"))
    full_number = normalize_text(user.get("mobile_full_number"), 32) or build_mobile_display(country_code, mobile_number)
    locked_until = normalize_text(user.get("user_admin_pin_locked_until"), 48)
    is_locked = bool(locked_until and locked_until > now_iso())
    return {
        "email": user.get("email"),
        "name": user.get("name"),
        "mobile_country_code": country_code,
        "mobile_number": mobile_number,
        "mobile_full_number": full_number,
        "has_user_admin_pin": pin_created,
        "has_pin_access": has_active_pin_access(user),
        "is_pin_locked": is_locked,
        "pin_locked_until": locked_until if is_locked else None,
        "user_admin_pin_created_at": user.get("user_admin_pin_created_at") if pin_created else None,
        "user_admin_pin_verified_at": user.get("user_admin_pin_verified_at") if pin_created else None,
        "user_admin_pin_unlocked_until": user.get("user_admin_pin_unlocked_until") if pin_created else None,
        "user_admin_blocked": bool(user.get("user_admin_blocked", False)),
        "user_admin_hidden": bool(user.get("user_admin_hidden", False)),
    }


def serialize_user_product(product: dict[str, Any] | None) -> dict[str, Any] | None:
    if not product:
        return None
    return {key: value for key, value in product.items() if key != "_id"}


def serialize_user_review(review: dict[str, Any] | None) -> dict[str, Any] | None:
    if not review:
        return None
    return {
        "review_id": review.get("review_id"),
        "product_id": review.get("product_id"),
        "product_name": review.get("product_name"),
        "product_image_url": review.get("product_image_url"),
        "rating": review.get("rating"),
        "comment": review.get("comment"),
        "reviewer_name": review.get("reviewer_name") or "Mindstores user",
        "reviewer_email": review.get("reviewer_email"),
        "created_at": review.get("created_at"),
        "updated_at": review.get("updated_at"),
    }


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

    if "status" in data or not partial:
        status = normalize_text(data.get("status"), 30)
        if status:
            status = status.lower()
            if status not in ("active", "draft", "discontinued"):
                return None, "Status must be one of: active, draft, discontinued"
            updates["status"] = status
        else:
            updates["status"] = "draft"

    if "compare_at_price" in data or not partial:
        val = data.get("compare_at_price")
        if val is not None and val != "" and val != "null":
            try:
                compare_at_price = float(val)
                if compare_at_price != compare_at_price or compare_at_price < 0:
                    return None, "Compare-at price must be a valid non-negative number"
                updates["compare_at_price"] = compare_at_price
            except (TypeError, ValueError):
                return None, "Compare-at price must be a valid number"
        else:
            updates["compare_at_price"] = None

    if "low_stock_threshold" in data or not partial:
        val = data.get("low_stock_threshold")
        if val is not None and val != "" and val != "null":
            try:
                low_stock_threshold = float(val)
                if low_stock_threshold != low_stock_threshold or not low_stock_threshold.is_integer() or low_stock_threshold < 0:
                    return None, "Low stock threshold must be a non-negative integer"
                updates["low_stock_threshold"] = int(low_stock_threshold)
            except (TypeError, ValueError):
                return None, "Low stock threshold must be a valid integer"
        else:
            updates["low_stock_threshold"] = None

    if "tags" in data or not partial:
        raw_tags = data.get("tags")
        tags = []
        if isinstance(raw_tags, list):
            for t in raw_tags:
                v = normalize_text(t, 40)
                if v:
                    tags.append(v)
        elif isinstance(raw_tags, str):
            for t in raw_tags.split(","):
                v = normalize_text(t, 40)
                if v:
                    tags.append(v)
        updates["tags"] = tags

    if not updates:
        return None, "No valid fields provided for update"
    return updates, None


def require_authenticated_user(ctx: RequestContext):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    return None


def require_pin_access(ctx: RequestContext):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied
    profile = serialize_user_admin_profile(ctx.user)
    if profile.get("user_admin_blocked"):
        return error_response(403, "your user admin page block")
    if not profile["has_pin_access"]:
        return error_response(403, "User Admin PIN required")
    return None


@router.get("/user-admin/profile")
async def get_user_admin_profile(ctx: RequestContext = Depends(get_context)):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied
    return json_response(serialize_user_admin_profile(ctx.user), 200, {"Cache-Control": "no-store"})


@router.post("/user-admin/pin")
async def submit_user_admin_pin(request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied

    data = await read_json_body(request, ctx.config.max_body_bytes)
    payload = data if isinstance(data, dict) else {}
    pin = normalize_pin(payload.get("pin") or payload.get("user_admin_pin") or payload.get("userAdminPin"))
    if not pin:
        return error_response(400, f"Enter a valid {USER_ADMIN_PIN_LENGTH} digit PIN")

    now = now_iso()
    user_has_pin = has_user_admin_pin(ctx.user)
    updates = {
        "user_admin_pin_verified_at": now,
        "user_admin_pin_unlocked_until": user_admin_pin_unlock_until(),
        "user_admin_pin_failed_attempts": 0,
        "user_admin_pin_locked_until": None,
        "updated_at": now,
    }
    message = "User Admin PIN verified"

    if user_has_pin:
        locked_until = (ctx.user or {}).get("user_admin_pin_locked_until")
        if locked_until and locked_until > now:
            return error_response(429, "Account security lockout: Too many failed PIN attempts. Please try again later.")

        if not verify_user_admin_pin(pin, ctx.user):
            failed_attempts = int((ctx.user or {}).get("user_admin_pin_failed_attempts", 0)) + 1
            if failed_attempts >= 5:
                lock_until = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat().replace("+00:00", "Z")
                await ctx.db.collection("users").update_one(
                    {"user_id": ctx.user.get("user_id")},
                    {"$set": {"user_admin_pin_failed_attempts": failed_attempts, "user_admin_pin_locked_until": lock_until, "updated_at": now}},
                )
                return error_response(429, "Too many failed PIN attempts. Account locked for 15 minutes.")

            await ctx.db.collection("users").update_one(
                {"user_id": ctx.user.get("user_id")},
                {"$set": {"user_admin_pin_failed_attempts": failed_attempts, "updated_at": now}},
            )
            return error_response(400, f"Invalid User Admin PIN. {5 - failed_attempts} attempt(s) remaining.")
    else:
        mobile_country_code = normalize_mobile_country_code(
            payload.get("mobile_country_code")
            or payload.get("mobileCountryCode")
            or payload.get("country_code")
            or payload.get("countryCode"),
        )
        mobile_number = normalize_mobile_number(payload.get("mobile_number") or payload.get("mobileNumber"))
        if not mobile_country_code:
            return error_response(400, "Valid country calling code is required")
        if not mobile_number:
            return error_response(400, "Valid mobile number is required")
        salt, pin_hash = create_pin_secret(pin)
        mobile_full_number = build_mobile_display(mobile_country_code, mobile_number)
        updates.update(
            {
                "mobile_country_code": mobile_country_code,
                "mobile_number": mobile_number,
                "mobile_full_number": mobile_full_number,
                "user_admin_pin_hash": pin_hash,
                "user_admin_pin_salt": salt,
                "user_admin_pin_created_at": now,
            },
        )
        message = "User Admin PIN created"

    await ctx.db.collection("users").update_one(
        {"user_id": ctx.user.get("user_id")},
        {"$set": updates},
    )
    updated = await ctx.db.collection("users").find_one({"user_id": ctx.user.get("user_id")}, {"projection": {"_id": 0}})
    profile = serialize_user_admin_profile(updated)
    return json_response(
        {
            "message": message,
            "mode": "verify" if user_has_pin else "create",
            "profile": profile,
            "user": profile,
        },
        200,
        {"Cache-Control": "no-store"},
    )


@router.post("/user-admin/pin/reset")
async def reset_user_admin_pin(request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_authenticated_user(ctx)
    if denied:
        return denied

    data = await read_json_body(request, ctx.config.max_body_bytes)
    payload = data if isinstance(data, dict) else {}
    pin = normalize_pin(payload.get("pin") or payload.get("user_admin_pin") or payload.get("userAdminPin"))
    mobile_country_code = normalize_mobile_country_code(
        payload.get("mobile_country_code")
        or payload.get("mobileCountryCode")
        or payload.get("country_code")
        or payload.get("countryCode"),
    )
    mobile_number = normalize_mobile_number(payload.get("mobile_number") or payload.get("mobileNumber"))

    now = now_iso()
    locked_until = (ctx.user or {}).get("user_admin_pin_locked_until")
    if locked_until and locked_until > now:
        return error_response(429, "Account security lockout: Too many failed PIN attempts. Please try again later.")

    if not has_user_admin_pin(ctx.user):
        return error_response(400, "Create a User Admin PIN first")
    if not mobile_country_code:
        return error_response(400, "Valid country calling code is required")
    if not mobile_number:
        return error_response(400, "Valid mobile number is required")
    if not pin:
        return error_response(400, f"Enter a valid {USER_ADMIN_PIN_LENGTH} digit PIN")

    saved_country_code = normalize_mobile_country_code((ctx.user or {}).get("mobile_country_code"))
    saved_mobile_number = normalize_mobile_number((ctx.user or {}).get("mobile_number"))
    if not saved_country_code or not saved_mobile_number:
        return error_response(400, "Saved mobile number is required to reset PIN")
    if mobile_country_code != saved_country_code or mobile_number != saved_mobile_number:
        return error_response(400, "Mobile number does not match this account")

    salt, pin_hash = create_pin_secret(pin)
    await ctx.db.collection("users").update_one(
        {"user_id": ctx.user.get("user_id")},
        {
            "$set": {
                "user_admin_pin_hash": pin_hash,
                "user_admin_pin_salt": salt,
                "user_admin_pin_failed_attempts": 0,
                "user_admin_pin_locked_until": None,
                "user_admin_pin_created_at": now,
                "user_admin_pin_verified_at": now,
                "user_admin_pin_unlocked_until": user_admin_pin_unlock_until(),
                "updated_at": now,
            },
        },
    )
    updated = await ctx.db.collection("users").find_one({"user_id": ctx.user.get("user_id")}, {"projection": {"_id": 0}})
    profile = serialize_user_admin_profile(updated)
    return json_response(
        {
            "message": "User Admin PIN reset",
            "profile": profile,
            "user": profile,
        },
        200,
        {"Cache-Control": "no-store"},
    )


@router.get("/user-admin/products")
async def list_user_products(ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied
    products = await ctx.db.collection("user_products").find(
        {"owner_user_id": ctx.user.get("user_id")},
        {"projection": {"_id": 0}, "sort": {"updated_at": -1, "created_at": -1}},
    ).to_array()
    return json_response({"items": [serialize_user_product(item) for item in products]}, 200, {"Cache-Control": "no-store"})


@router.get("/user-admin/reviews")
async def list_user_product_reviews(ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied
    owner_filters = []
    owner_user_id = normalize_text(ctx.user.get("user_id"), 200)
    owner_email = normalize_text(ctx.user.get("email"), 320)
    if owner_user_id:
        owner_filters.append({"product_owner_user_id": owner_user_id})
    if owner_email:
        owner_filters.append({"product_owner_email": owner_email})
    if not owner_filters:
        return json_response({"items": []}, 200, {"Cache-Control": "no-store"})
    review_filter = owner_filters[0] if len(owner_filters) == 1 else {"$or": owner_filters}
    reviews = await ctx.db.collection("product_reviews").find(
        review_filter,
        {"projection": {"_id": 0}, "sort": {"created_at": -1}},
    ).to_array()
    return json_response(
        {"items": [item for item in (serialize_user_review(review) for review in reviews) if item]},
        200,
        {"Cache-Control": "no-store"},
    )


@router.post("/user-admin/products")
async def create_user_product(request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied
    data = await read_json_body(request, ctx.config.max_body_bytes)
    payload, error = validate_user_product_payload(data if isinstance(data, dict) else {})
    if error:
        return error_response(400, error)
    now = now_iso()
    product = {
        "status": "draft",
        **payload,
        "product_id": random_compact_id("userprod"),
        "owner_user_id": ctx.user.get("user_id"),
        "owner_email": ctx.user.get("email"),
        "created_at": now,
        "updated_at": now,
    }
    await ctx.db.collection("user_products").insert_one(product)
    return json_response(serialize_user_product(product), 201, {"Cache-Control": "no-store"})


@router.put("/user-admin/products/{product_id}")
async def update_user_product(product_id: str, request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
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
    denied = require_pin_access(ctx)
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


@router.get("/user-admin/messages")
async def list_user_admin_messages(ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied
    messages = await ctx.db.collection("messages").find(
        {"recipient_user_id": ctx.user.get("user_id")},
        {"projection": {"_id": 0}, "sort": {"created_at": -1}}
    ).to_array()
    return json_response({"items": messages}, 200, {"Cache-Control": "no-store"})


@router.post("/user-admin/messages/{message_id}/read")
async def read_user_admin_message(message_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied
    await ctx.db.collection("messages").update_one(
        {"message_id": unquote(message_id), "recipient_user_id": ctx.user.get("user_id")},
        {"$set": {"read": True, "updated_at": now_iso()}}
    )
    return json_response({"message": "Message marked as read"}, 200, {"Cache-Control": "no-store"})


@router.get("/user-admin/deliveries")
async def list_user_admin_deliveries(ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied
        
    user_id = ctx.user.get("user_id")
    # Find orders where this user is the vendor for at least one item
    orders = await ctx.db.collection("orders").find(
        {"items.vendor_id": user_id},
        {"projection": {"_id": 0}, "sort": {"created_at": -1}}
    ).to_array()
    
    # Filter the order items to only include this vendor's items
    deliveries = []
    for order in orders:
        for item in order.get("items", []):
            if item.get("vendor_id") == user_id:
                # Merge order context into the delivery item
                delivery_item = {
                    **item,
                    "order_id": order.get("order_id"),
                    "order_created_at": order.get("created_at"),
                    "scheduled_delivery_date": order.get("scheduled_delivery_date"),
                    "billing_profile": order.get("billing_profile"),
                    "order_status": order.get("status"),
                    "order_updated_at": order.get("updated_at"),
                }
                deliveries.append(delivery_item)
                
    return json_response({"items": deliveries}, 200, {"Cache-Control": "no-store"})

@router.post("/user-admin/orders/{order_id}/items/{product_id}/approve")
async def user_admin_approve_order_item(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied

    order = await ctx.db.collection("orders").find_one({"order_id": order_id})
    if not order:
        return error_response(404, "Order not found")

    item_index = find_delivery_item_index(order, product_id, ctx.user.get("user_id"))
    if item_index < 0:
        return error_response(404, "Item not found in order for this vendor")

    _updates, error = await transition_delivery_item(
        ctx,
        order,
        item_index,
        DELIVERY_STATUS_SHIPPING,
        {DELIVERY_STATUS_PENDING},
    )
    if error:
        return error_response(400, error)
    
    await ctx.db.collection("messages").update_many(
        {"order_id": order_id, "product_id": product_id, "recipient_user_id": ctx.user.get("user_id")},
        {"$set": {"status": "approved", "updated_at": now_iso()}}
    )
    return json_response({"message": "Order item approved"}, 200)


@router.post("/user-admin/orders/{order_id}/items/{product_id}/confirm-delivery")
async def user_admin_confirm_delivery(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied

    order = await ctx.db.collection("orders").find_one({"order_id": order_id})
    if not order:
        return error_response(404, "Order not found")

    item_index = find_delivery_item_index(order, product_id, ctx.user.get("user_id"))
    if item_index < 0:
        return error_response(404, "Item not found in order for this vendor")

    _updates, error = await transition_delivery_item(
        ctx,
        order,
        item_index,
        DELIVERY_STATUS_COMPLETED,
        {DELIVERY_STATUS_SHIPPING},
    )
    if error:
        return error_response(400, error)

    return json_response({"message": "Delivery confirmed"}, 200)


@router.post("/user-admin/orders/{order_id}/items/{product_id}/cancel")
async def user_admin_cancel_order_item(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_pin_access(ctx)
    if denied:
        return denied

    order = await ctx.db.collection("orders").find_one({"order_id": order_id})
    if not order:
        return error_response(404, "Order not found")

    item_index = find_delivery_item_index(order, product_id, ctx.user.get("user_id"))
    if item_index < 0:
        return error_response(404, "Item not found in order for this vendor")

    _updates, error = await cancel_delivery_item(ctx, order, item_index)
    if error:
        return error_response(400, error)

    await ctx.db.collection("messages").update_many(
        {"order_id": order_id, "product_id": product_id, "recipient_user_id": ctx.user.get("user_id")},
        {"$set": {"status": "cancelled", "updated_at": now_iso()}}
    )
    return json_response({"message": "Order item cancelled"}, 200)
