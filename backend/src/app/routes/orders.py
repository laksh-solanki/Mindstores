from __future__ import annotations

from fastapi import APIRouter, Depends

from ..context import RequestContext, error_response, get_context, json_response
from ..delivery import (
    cancel_delivery_item,
    find_delivery_item_index,
)

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


@router.post("/orders/{order_id}/items/{product_id}/cancel")
async def cancel_order_item(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    
    order = await ctx.db.collection("orders").find_one({"order_id": order_id, "user_id": ctx.user.get("user_id")})
    if not order:
        return error_response(404, "Order not found")
    
    from ..utils import now_iso, random_compact_id
    now = now_iso()
    
    item_index = find_delivery_item_index(order, product_id)
    item = order.get("items", [])[item_index] if item_index >= 0 else None
            
    if not item:
        return error_response(404, "Item not found in order")
        
    if order.get("scheduled_delivery_date") and order.get("scheduled_delivery_date") < now:
         return error_response(400, "Cannot cancel after scheduled delivery date")

    _updates, error = await cancel_delivery_item(ctx, order, item_index)
    if error:
        return error_response(400, error)
        
    # Send message to User Admin (vendor)
    vendor_id = item.get("vendor_id")
    if vendor_id and vendor_id != "admin":
        await ctx.db.collection("messages").insert_one({
            "message_id": random_compact_id("msg"),
            "recipient_user_id": vendor_id,
            "order_id": order_id,
            "product_id": product_id,
            "product_name": item.get("name"),
            "message": f"User cancelled delivery for product '{item.get('name')}'.",
            "read": False,
            "created_at": now
        })
        
    return json_response({"message": "Product delivery cancelled successfully"}, 200)
