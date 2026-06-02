from __future__ import annotations

from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request

from ..admin_access import normalize_admin_email
from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..delivery import (
    DELIVERY_STATUS_COMPLETED,
    DELIVERY_STATUS_PENDING,
    DELIVERY_STATUS_SHIPPING,
    cancel_delivery_item,
    find_delivery_item_index,
    transition_delivery_item,
)
from ..utils import escape_regex, normalize_text, parse_int_param, now_iso

router = APIRouter()


def serialize_user(user: dict[str, Any], admin_entries: list[dict[str, Any]]) -> dict[str, Any]:
    email = normalize_admin_email(user.get("email"))
    admin_emails = {entry["email"] for entry in admin_entries}
    return {
        "user_id": user.get("user_id"),
        "name": user.get("name") or "User",
        "email": email or user.get("email"),
        "country_code": user.get("country_code"),
        "locale": user.get("locale"),
        "picture": user.get("picture") or user.get("photo_url") or user.get("photoURL"),
        "is_admin": bool(email and email in admin_emails),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
        "user_admin_blocked": bool(user.get("user_admin_blocked", False)),
        "user_admin_hidden": bool(user.get("user_admin_hidden", False)),
    }


def user_identity_key(user: dict[str, Any]) -> str:
    email = normalize_admin_email(user.get("email"))
    if email:
        return f"email:{email}"
    return f"user:{user.get('user_id') or ''}"


def merge_user_record(current: dict[str, Any], duplicate: dict[str, Any]) -> dict[str, Any]:
    merged = {**current}
    for key in ("name", "email", "country_code", "locale", "picture", "created_at", "updated_at"):
        if not merged.get(key) and duplicate.get(key):
            merged[key] = duplicate[key]
    if duplicate.get("created_at") and (
        not merged.get("created_at") or str(duplicate["created_at"]) < str(merged["created_at"])
    ):
        merged["created_at"] = duplicate["created_at"]
    merged["user_admin_blocked"] = current.get("user_admin_blocked") or duplicate.get("user_admin_blocked") or False
    merged["user_admin_hidden"] = current.get("user_admin_hidden") or duplicate.get("user_admin_hidden") or False
    return merged


def unique_users_by_email(users: list[dict[str, Any]], admin_entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_identity: dict[str, dict[str, Any]] = {}
    for user in users:
        if not user:
            continue
        serialized = serialize_user(user, admin_entries)
        identity_key = user_identity_key(serialized)
        if identity_key not in by_identity:
            by_identity[identity_key] = serialized
            continue
        by_identity[identity_key] = merge_user_record(by_identity[identity_key], serialized)
    return list(by_identity.values())


def require_admin(ctx: RequestContext):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    if not ctx.user.get("is_admin"):
        return error_response(403, "Admin access required")
    return None


@router.get("/admin/access")
async def get_admin_access(ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    return json_response({"items": await ctx.admin_access.list(ctx.user.get("email"))}, 200, {"Cache-Control": "no-store"})


@router.post("/admin/access")
async def add_admin_access(request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    result = await ctx.admin_access.add(data.get("email"), ctx.user.get("email"))
    if result.get("error"):
        return error_response(result.get("statusCode", 400), result["error"])
    return json_response(result["entry"], 201, {"Cache-Control": "no-store"})


@router.put("/admin/access/{email}")
async def update_admin_access(email: str, request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    result = await ctx.admin_access.update(unquote(email), data.get("email"), ctx.user.get("email"))
    if result.get("error"):
        return error_response(result.get("statusCode", 400), result["error"])
    return json_response(result["entry"], 200, {"Cache-Control": "no-store"})


@router.delete("/admin/access/{email}")
async def delete_admin_access(email: str, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    result = await ctx.admin_access.remove(unquote(email), ctx.user.get("email"))
    if result.get("error"):
        return error_response(result.get("statusCode", 400), result["error"])
    return json_response({"message": "Admin email deleted successfully"}, 200, {"Cache-Control": "no-store"})


@router.get("/admin/users")
async def get_admin_users(ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    query = ctx.request.query_params
    search = normalize_text(query.get("search"), 80)
    role = normalize_text(query.get("role"), 20).lower()
    page = max(1, parse_int_param(query.get("page"), 1) or 1)
    page_size = min(max(parse_int_param(query.get("page_size") or query.get("pageSize"), 25) or 25, 1), 100)
    skip = (page - 1) * page_size
    filters = []
    if search:
        escaped = escape_regex(search)
        filters.append({"$or": [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
            {"user_id": {"$regex": escaped, "$options": "i"}},
        ]})
    db_query: dict[str, Any] = {} if not filters else filters[0] if len(filters) == 1 else {"$and": filters}
    admin_entries = await ctx.admin_access.list(ctx.user.get("email"))
    collection = ctx.db.collection("users")
    users = await collection.find(db_query, {"projection": {"_id": 0}}).sort({"updated_at": -1}).to_array()
    unique_users = unique_users_by_email(users, admin_entries)
    if role == "admin":
        unique_users = [user for user in unique_users if user.get("is_admin")]
    if role == "customer":
        unique_users = [user for user in unique_users if not user.get("is_admin")]
    total = len(unique_users)
    page_items = unique_users[skip : skip + page_size]
    return json_response(
        {
            "items": page_items,
            "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": max(1, (total + page_size - 1) // page_size)},
        },
        200,
        {"Cache-Control": "no-store"},
    )


@router.put("/admin/users/{user_id}/block")
async def toggle_block_user_admin(user_id: str, request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    blocked = bool(data.get("blocked", False))
    
    result = await ctx.db.collection("users").update_one(
        {"user_id": unquote(user_id)},
        {"$set": {"user_admin_blocked": blocked, "updated_at": now_iso()}}
    )
    if result.matchedCount == 0:
        return error_response(404, "User not found")
    return json_response({"message": "User admin status updated", "blocked": blocked}, 200, {"Cache-Control": "no-store"})


@router.put("/admin/users/{user_id}/hide")
async def toggle_hide_user_admin(user_id: str, request: Request, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    hidden = bool(data.get("hidden", False))
    
    result = await ctx.db.collection("users").update_one(
        {"user_id": unquote(user_id)},
        {"$set": {"user_admin_hidden": hidden, "updated_at": now_iso()}}
    )
    if result.matchedCount == 0:
        return error_response(404, "User not found")
    return json_response({"message": "User admin visibility updated", "hidden": hidden}, 200, {"Cache-Control": "no-store"})


@router.get("/admin/deliveries")
async def get_admin_deliveries(ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied
        
    orders = await ctx.db.collection("orders").find(
        {},
        {"projection": {"_id": 0}, "sort": {"created_at": -1}}
    ).to_array()
    
    deliveries = []
    for order in orders:
        for item in order.get("items", []):
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


@router.post("/admin/orders/{order_id}/items/{product_id}/confirm-delivery")
async def admin_confirm_delivery(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied

    order = await ctx.db.collection("orders").find_one({"order_id": unquote(order_id)})
    if not order:
        return error_response(404, "Order not found")

    normalized_product_id = unquote(product_id)
    item_index = find_delivery_item_index(order, normalized_product_id)
    if item_index < 0:
        return error_response(404, "Item not found in order")

    _updates, error = await transition_delivery_item(
        ctx,
        order,
        item_index,
        DELIVERY_STATUS_COMPLETED,
        {DELIVERY_STATUS_PENDING, DELIVERY_STATUS_SHIPPING},
    )
    if error:
        return error_response(400, error)

    await ctx.db.collection("messages").update_many(
        {"order_id": unquote(order_id), "product_id": normalized_product_id},
        {"$set": {"status": "approved", "updated_at": now_iso()}},
    )
    return json_response({"message": "Delivery confirmed"}, 200)


@router.post("/admin/orders/{order_id}/items/{product_id}/cancel-delivery")
async def admin_cancel_delivery(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    denied = require_admin(ctx)
    if denied:
        return denied

    order = await ctx.db.collection("orders").find_one({"order_id": unquote(order_id)})
    if not order:
        return error_response(404, "Order not found")

    normalized_product_id = unquote(product_id)
    item_index = find_delivery_item_index(order, normalized_product_id)
    if item_index < 0:
        return error_response(404, "Item not found in order")

    _updates, error = await cancel_delivery_item(ctx, order, item_index)
    if error:
        return error_response(400, error)

    await ctx.db.collection("messages").update_many(
        {"order_id": unquote(order_id), "product_id": normalized_product_id},
        {"$set": {"status": "cancelled", "updated_at": now_iso()}},
    )
    return json_response({"message": "Delivery cancelled"}, 200)
