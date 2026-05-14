from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import now_iso, random_compact_id
from .cart import normalize_product_id, sanitize_items

router = APIRouter()

PROMO_CODES = {
    "SAVE10": {"code": "SAVE10", "type": "percent", "value": 10, "minSubtotal": 60},
    "FLAT20": {"code": "FLAT20", "type": "flat", "value": 20, "minSubtotal": 120},
    "SAVE20": {"code": "SAVE20", "type": "percent", "value": 20, "minSubtotal": 180},
}


def normalize_promo_code(value: Any) -> str | None:
    text = str(value or "").strip().upper()
    if not text:
        return ""
    import re

    return text if re.fullmatch(r"[A-Z0-9_-]{3,20}", text) else None


def calc_discount(subtotal: float, promo: dict[str, Any] | None) -> float:
    if not promo:
        return 0
    if promo["type"] == "percent":
        return round((subtotal * promo["value"]) / 100, 2)
    return min(subtotal, promo["value"])


@router.post("/checkout/place-order")
async def place_order(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    cart = await ctx.db.collection("carts").find_one({"user_id": ctx.user.get("user_id")})
    safe_cart_items = sanitize_items((cart or {}).get("items"))
    if not safe_cart_items:
        return error_response(400, "Cart is empty")
    items_to_checkout = safe_cart_items
    if "selected_product_ids" in data:
        raw_selected_ids = data.get("selected_product_ids")
        if not isinstance(raw_selected_ids, list) or not raw_selected_ids or len(raw_selected_ids) > 50:
            return error_response(400, "selected_product_ids must be a non-empty string array")
        selected = set()
        for product_id in raw_selected_ids:
            normalized = normalize_product_id(product_id)
            if not normalized:
                return error_response(400, "selected_product_ids must be a non-empty string array")
            selected.add(normalized)
        items_to_checkout = [item for item in safe_cart_items if item["product_id"] in selected]
        if not items_to_checkout:
            return error_response(400, "No selected items found in cart")
    promo_code = normalize_promo_code(data.get("promo_code"))
    if promo_code is None:
        return error_response(400, "Invalid promo code format")
    product_ids = list({item["product_id"] for item in items_to_checkout})
    products = await ctx.db.collection("products").find({"product_id": {"$in": product_ids}}, {"projection": {"_id": 0}}).to_array()
    product_map = {product.get("product_id"): product for product in products}
    order_items = []
    subtotal = 0.0
    for cart_item in items_to_checkout:
        product = product_map.get(cart_item["product_id"])
        if not product:
            return error_response(400, f"Product not found: {cart_item['product_id']}")
        stock = int(product.get("stock") or 0)
        if stock < cart_item["quantity"]:
            return error_response(400, f"Insufficient stock for {product.get('name') or cart_item['product_id']}")
        price = float(product.get("price") or 0)
        subtotal += price * cart_item["quantity"]
        order_items.append(
            {
                "product_id": cart_item["product_id"],
                "name": product.get("name") or "Product",
                "price": price,
                "price_amount": product.get("price_amount", price),
                "price_currency": product.get("price_currency") or product.get("currency") or "USD",
                "quantity": cart_item["quantity"],
            }
        )
    applied_promo = None
    discount = 0.0
    if promo_code:
        promo = PROMO_CODES.get(promo_code)
        if not promo:
            return error_response(400, "Invalid promo code")
        if subtotal < promo["minSubtotal"]:
            return error_response(400, f"Promo {promo['code']} requires minimum subtotal of ${promo['minSubtotal']}")
        discount = calc_discount(subtotal, promo)
        applied_promo = promo["code"]
    total = max(0, round(subtotal - discount, 2))
    order_id = random_compact_id("order")
    now = now_iso()
    decremented = []
    try:
        for item in items_to_checkout:
            result = await ctx.db.collection("products").update_one(
                {"product_id": item["product_id"], "stock": {"$gte": item["quantity"]}},
                {"$inc": {"stock": -item["quantity"]}, "$set": {"updated_at": now}},
            )
            if result.modifiedCount == 0:
                raise RuntimeError(f"INSUFFICIENT_STOCK:{item['product_id']}")
            decremented.append(item)
        await ctx.db.collection("orders").insert_one(
            {
                "order_id": order_id,
                "user_id": ctx.user.get("user_id"),
                "items": order_items,
                "subtotal_amount": round(subtotal, 2),
                "discount_amount": round(discount, 2),
                "promo_code": applied_promo,
                "total_amount": total,
                "status": "completed",
                "created_at": now,
                "updated_at": now,
            },
        )
        purchased = {item["product_id"] for item in items_to_checkout}
        remaining = [item for item in safe_cart_items if item["product_id"] not in purchased]
        await ctx.db.collection("carts").update_one({"user_id": ctx.user.get("user_id")}, {"$set": {"items": remaining, "updated_at": now}})
    except Exception as exc:
        for item in decremented:
            await ctx.db.collection("products").update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"stock": item["quantity"]}, "$set": {"updated_at": now_iso()}},
            )
        if str(exc).startswith("INSUFFICIENT_STOCK:"):
            return error_response(409, "Stock changed while checking out. Please retry.")
        raise
    return json_response(
        {
            "success": True,
            "order_id": order_id,
            "promo_code": applied_promo,
            "subtotal_amount": round(subtotal, 2),
            "discount_amount": round(discount, 2),
            "total_amount": total,
            "message": "Order placed successfully",
        },
    )
