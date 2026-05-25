from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import normalize_text, now_iso, random_compact_id
import datetime
from .cart import normalize_product_id, sanitize_items
from .products import find_catalog_product

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


def normalize_billing_profile(value: Any) -> dict[str, str]:
    profile = value if isinstance(value, dict) else {}
    return {
        "name": normalize_text(profile.get("name"), 120),
        "email": normalize_text(profile.get("email"), 320),
        "phone": normalize_text(profile.get("phone"), 32),
        "address": normalize_text(profile.get("address"), 220),
        "city": normalize_text(profile.get("city"), 96),
        "state": normalize_text(profile.get("state"), 96),
        "postal_code": normalize_text(profile.get("postal_code") or profile.get("postalCode") or profile.get("zip"), 32),
    }


def checkout_collection_name(product_source: str) -> str:
    return "user_products" if product_source == "user_admin" else "products"


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
    billing_profile = normalize_billing_profile(data.get("billing_profile"))
    payment_method = normalize_text(data.get("payment_method") or "card", 30)
    product_entries: dict[str, tuple[dict[str, Any], str]] = {}
    for product_id in {item["product_id"] for item in items_to_checkout}:
        product, product_source = await find_catalog_product(ctx, product_id)
        if product:
            product_entries[product_id] = (product, checkout_collection_name(product_source))

    order_items = []
    subtotal = 0.0
    for cart_item in items_to_checkout:
        product_entry = product_entries.get(cart_item["product_id"])
        if not product_entry:
            return error_response(400, f"Product not found: {cart_item['product_id']}")
        product, _collection_name = product_entry
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
                "vendor_id": product.get("owner_user_id") or product.get("user_id") or "admin",
                "delivery_status": "pending",
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
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now = now_dt.isoformat().replace("+00:00", "Z")
    scheduled_date = (now_dt + datetime.timedelta(days=5)).isoformat().replace("+00:00", "Z")
    decremented = []
    try:
        for item in items_to_checkout:
            product_entry = product_entries.get(item["product_id"])
            if not product_entry:
                raise RuntimeError(f"PRODUCT_NOT_FOUND:{item['product_id']}")
            _product, collection_name = product_entry
            result = await ctx.db.collection(collection_name).update_one(
                {"product_id": item["product_id"], "stock": {"$gte": item["quantity"]}},
                {"$inc": {"stock": -item["quantity"]}, "$set": {"updated_at": now}},
            )
            if result.modifiedCount == 0:
                raise RuntimeError(f"INSUFFICIENT_STOCK:{item['product_id']}")
            decremented.append({**item, "collection_name": collection_name})
        await ctx.db.collection("orders").insert_one(
            {
                "order_id": order_id,
                "user_id": ctx.user.get("user_id"),
                "items": order_items,
                "subtotal_amount": round(subtotal, 2),
                "discount_amount": round(discount, 2),
                "promo_code": applied_promo,
                "billing_profile": billing_profile,
                "payment_method": payment_method,
                "total_amount": total,
                "status": "pending",
                "scheduled_delivery_date": scheduled_date,
                "created_at": now,
                "updated_at": now,
            },
        )
        purchased = {item["product_id"] for item in items_to_checkout}
        remaining = [item for item in safe_cart_items if item["product_id"] not in purchased]
        await ctx.db.collection("carts").update_one({"user_id": ctx.user.get("user_id")}, {"$set": {"items": remaining, "updated_at": now}})
        
        # Generate messages for vendors
        vendor_items = {}
        for item in order_items:
            vid = item.get("vendor_id")
            if vid and vid != "admin":
                vendor_items.setdefault(vid, []).append(item)
                
        for vid, v_items in vendor_items.items():
            for v_item in v_items:
                await ctx.db.collection("messages").insert_one(
                    {
                        "message_id": random_compact_id("msg"),
                        "recipient_user_id": vid,
                        "type": "order_request",
                        "order_id": order_id,
                        "product_id": v_item["product_id"],
                        "product_name": v_item["name"],
                        "payment_method": payment_method,
                        "payment_status": "pending",
                        "status": "pending",
                        "message": f"New order requires approval for '{v_item['name']}'.",
                        "read": False,
                        "created_at": now,
                        "updated_at": now,
                    }
                )
    except Exception as exc:
        for item in decremented:
            await ctx.db.collection(item["collection_name"]).update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"stock": item["quantity"]}, "$set": {"updated_at": now_iso()}},
            )
        if str(exc).startswith("PRODUCT_NOT_FOUND:"):
            return error_response(400, "Product not found")
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
