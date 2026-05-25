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


@router.post("/orders/{order_id}/items/{product_id}/cancel")
async def cancel_order_item(order_id: str, product_id: str, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    
    order = await ctx.db.collection("orders").find_one({"order_id": order_id, "user_id": ctx.user.get("user_id")})
    if not order:
        return error_response(404, "Order not found")
    
    from ..utils import now_iso, random_compact_id
    now = now_iso()
    
    # Find item
    item_index = -1
    item = None
    for i, it in enumerate(order.get("items", [])):
        if it.get("product_id") == product_id:
            item_index = i
            item = it
            break
            
    if not item:
        return error_response(404, "Item not found in order")
        
    if item.get("delivery_status") == "cancelled":
        return error_response(400, "Item already cancelled")
        
    if order.get("scheduled_delivery_date") and order.get("scheduled_delivery_date") < now:
         return error_response(400, "Cannot cancel after scheduled delivery date")

    # Update item status
    update_result = await ctx.db.collection("orders").update_one(
        {"order_id": order_id, "user_id": ctx.user.get("user_id")},
        {"$set": {
            f"items.{item_index}.delivery_status": "cancelled",
            "updated_at": now
        }}
    )
    
    if update_result.modifiedCount == 0:
        return error_response(500, "Failed to cancel item")
        
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
        
    # Check if all items are cancelled to cancel the entire order
    all_cancelled = True
    for i, it in enumerate(order.get("items", [])):
        if i == item_index:
            continue
        if it.get("delivery_status") != "cancelled":
            all_cancelled = False
            break
            
    if all_cancelled:
        await ctx.db.collection("orders").update_one(
            {"order_id": order_id, "user_id": ctx.user.get("user_id")},
            {"$set": {"status": "cancelled", "updated_at": now}}
        )

    return json_response({"message": "Product delivery cancelled successfully"}, 200)
