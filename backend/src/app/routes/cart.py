from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import now_iso, random_compact_id

router = APIRouter()


def normalize_product_id(value: Any) -> str:
    return value.strip() if isinstance(value, str) and value.strip() and len(value.strip()) <= 80 else ""


def parse_quantity(value: Any) -> int | None:
    try:
        quantity = float(value)
    except (TypeError, ValueError):
        return None
    return int(quantity) if quantity.is_integer() and 1 <= quantity <= 99 else None


def sanitize_items(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    output = []
    for item in items:
        product_id = normalize_product_id((item or {}).get("product_id") if isinstance(item, dict) else None)
        quantity = parse_quantity((item or {}).get("quantity") if isinstance(item, dict) else None)
        if product_id and quantity is not None:
            output.append({"product_id": product_id, "quantity": quantity})
    return output


def cart_response(cart: dict[str, Any] | None, user_id: str, fallback_cart_id: str) -> dict[str, Any]:
    return {
        "cart_id": (cart or {}).get("cart_id") or fallback_cart_id,
        "user_id": user_id,
        "items": sanitize_items((cart or {}).get("items")),
        "updated_at": (cart or {}).get("updated_at"),
    }


async def ensure_cart(db: Any, user_id: str) -> dict[str, Any]:
    existing = await db.collection("carts").find_one({"user_id": user_id})
    if existing:
        return existing
    now = now_iso()
    cart = {
        "cart_id": random_compact_id("cart"),
        "user_id": user_id,
        "items": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.collection("carts").insert_one(cart)
    return cart


@router.get("/cart")
async def get_cart(ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    cart = await ctx.db.collection("carts").find_one({"user_id": ctx.user.get("user_id")}, {"projection": {"_id": 0}})
    return json_response(cart_response(cart, ctx.user.get("user_id"), random_compact_id("cart")))


@router.post("/cart/add")
async def cart_add(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    product_id = normalize_product_id(data.get("product_id"))
    quantity = parse_quantity(data.get("quantity"))
    if not product_id or quantity is None:
        return error_response(400, "Valid product_id and quantity are required")
    product = await ctx.db.collection("products").find_one({"product_id": product_id}, {"projection": {"_id": 0, "product_id": 1, "stock": 1, "name": 1}})
    if not product:
        return error_response(404, "Product not found")
    stock = int(product.get("stock") or 0)
    if stock <= 0:
        return error_response(400, "Product is out of stock")
    cart = await ensure_cart(ctx.db, ctx.user.get("user_id"))
    items = sanitize_items(cart.get("items"))
    index = next((idx for idx, item in enumerate(items) if item["product_id"] == product_id), -1)
    existing_quantity = items[index]["quantity"] if index >= 0 else 0
    next_quantity = existing_quantity + quantity
    if next_quantity > stock:
        return error_response(400, "Insufficient stock")
    if index >= 0:
        items[index]["quantity"] = next_quantity
    else:
        items.append({"product_id": product_id, "quantity": quantity})
    now = now_iso()
    await ctx.db.collection("carts").update_one(
        {"user_id": ctx.user.get("user_id")},
        {"$set": {"items": items, "updated_at": now}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    updated = await ctx.db.collection("carts").find_one({"user_id": ctx.user.get("user_id")}, {"projection": {"_id": 0}})
    return json_response({"message": "Item added to cart", "cart": cart_response(updated, ctx.user.get("user_id"), cart.get("cart_id"))})


@router.post("/cart/remove")
async def cart_remove(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    product_id = normalize_product_id(data.get("product_id"))
    if not product_id:
        return error_response(400, "Valid product_id is required")
    cart = await ctx.db.collection("carts").find_one({"user_id": ctx.user.get("user_id")})
    if not cart:
        return json_response({"message": "Item removed"})
    items = [item for item in sanitize_items(cart.get("items")) if item["product_id"] != product_id]
    await ctx.db.collection("carts").update_one({"user_id": ctx.user.get("user_id")}, {"$set": {"items": items, "updated_at": now_iso()}})
    return json_response({"message": "Item removed"})


@router.post("/cart/update")
async def cart_update(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    product_id = normalize_product_id(data.get("product_id"))
    quantity = parse_quantity(data.get("quantity"))
    if not product_id or quantity is None:
        return error_response(400, "Valid product_id and quantity are required")
    product = await ctx.db.collection("products").find_one({"product_id": product_id}, {"projection": {"_id": 0, "stock": 1}})
    if not product:
        return error_response(404, "Product not found")
    if quantity > int(product.get("stock") or 0):
        return error_response(400, "Insufficient stock")
    cart = await ctx.db.collection("carts").find_one({"user_id": ctx.user.get("user_id")})
    if not cart:
        return error_response(404, "Cart not found")
    items = sanitize_items(cart.get("items"))
    index = next((idx for idx, item in enumerate(items) if item["product_id"] == product_id), -1)
    if index < 0:
        return error_response(404, "Item not found in cart")
    items[index]["quantity"] = quantity
    await ctx.db.collection("carts").update_one({"user_id": ctx.user.get("user_id")}, {"$set": {"items": items, "updated_at": now_iso()}})
    return json_response({"message": "Cart item quantity updated", "product_id": product_id, "quantity": quantity})
