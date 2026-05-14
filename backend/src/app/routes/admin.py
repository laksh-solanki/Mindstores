from __future__ import annotations

from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request

from ..admin_access import normalize_admin_email
from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import escape_regex, normalize_text, parse_int_param

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
    }


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
    if role == "admin":
        db_query["is_admin"] = True
    if role == "customer":
        db_query["is_admin"] = {"$ne": True}
    admin_entries = await ctx.admin_access.list(ctx.user.get("email"))
    collection = ctx.db.collection("users")
    users = await collection.find(db_query, {"projection": {"_id": 0}}).sort({"updated_at": -1}).skip(skip).limit(page_size).to_array()
    total = await collection.count_documents(db_query)
    return json_response(
        {
            "items": [serialize_user(user, admin_entries) for user in users if user],
            "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": max(1, (total + page_size - 1) // page_size)},
        },
        200,
        {"Cache-Control": "no-store"},
    )
