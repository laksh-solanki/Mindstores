from __future__ import annotations

from fastapi import APIRouter, Depends

from ..context import RequestContext, error_response, get_context, json_response

router = APIRouter()


@router.get("/orders")
async def get_orders(ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    orders = await ctx.db.collection("orders").find(
        {"user_id": ctx.user.get("user_id")},
        {"projection": {"_id": 0}},
    ).sort({"created_at": -1}).to_array()
    return json_response(orders if isinstance(orders, list) else [], 200, {"Cache-Control": "no-store"})
