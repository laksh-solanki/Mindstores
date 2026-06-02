from __future__ import annotations

from copy import deepcopy
from typing import Any

from .utils import now_iso

DELIVERY_STATUS_PENDING = "pending"
DELIVERY_STATUS_SHIPPING = "continue shipping"
DELIVERY_STATUS_COMPLETED = "completed"
DELIVERY_STATUS_CANCELLED = "cancelled"

DELIVERY_TERMINAL_STATUSES = {
    DELIVERY_STATUS_COMPLETED,
    DELIVERY_STATUS_CANCELLED,
}


def normalize_delivery_status(value: Any) -> str:
    status = str(value or "").strip().lower()
    return status or DELIVERY_STATUS_PENDING


def find_delivery_item_index(order: dict[str, Any], product_id: str, vendor_id: str | None = None) -> int:
    for index, item in enumerate(order.get("items", [])):
        if item.get("product_id") != product_id:
            continue
        if vendor_id is not None and item.get("vendor_id") != vendor_id:
            continue
        return index
    return -1


def derive_order_status(items: list[dict[str, Any]]) -> str:
    statuses = [normalize_delivery_status(item.get("delivery_status")) for item in items]
    if not statuses:
        return DELIVERY_STATUS_PENDING
    if all(status == DELIVERY_STATUS_CANCELLED for status in statuses):
        return DELIVERY_STATUS_CANCELLED
    if all(status in DELIVERY_TERMINAL_STATUSES for status in statuses):
        return DELIVERY_STATUS_COMPLETED
    if any(status in {DELIVERY_STATUS_SHIPPING, DELIVERY_STATUS_COMPLETED} for status in statuses):
        return DELIVERY_STATUS_SHIPPING
    return DELIVERY_STATUS_PENDING


def build_delivery_transition(
    order: dict[str, Any],
    item_index: int,
    next_status: str,
    allowed_current_statuses: set[str],
    now: str | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    items = deepcopy(order.get("items", []))
    if item_index < 0 or item_index >= len(items):
        return None, "Item not found in order"

    timestamp = now or now_iso()
    item = items[item_index]
    current_status = normalize_delivery_status(item.get("delivery_status"))
    if current_status == next_status:
        return None, f"Delivery already {next_status}"
    if current_status not in allowed_current_statuses:
        return None, f"Cannot change delivery from {current_status} to {next_status}"

    item["delivery_status"] = next_status
    item["delivery_updated_at"] = timestamp
    if next_status == DELIVERY_STATUS_SHIPPING:
        item["approved_at"] = item.get("approved_at") or timestamp
    elif next_status == DELIVERY_STATUS_COMPLETED:
        item["approved_at"] = item.get("approved_at") or timestamp
        item["delivery_confirmed_at"] = timestamp
    elif next_status == DELIVERY_STATUS_CANCELLED:
        item["cancelled_at"] = timestamp

    return {
        "items": items,
        "status": derive_order_status(items),
        "updated_at": timestamp,
    }, None


def delivery_update_filter(order: dict[str, Any]) -> dict[str, Any]:
    query = {"order_id": order.get("order_id")}
    if order.get("updated_at"):
        query["updated_at"] = order["updated_at"]
    return query


async def resolve_inventory_collection_name(ctx, item: dict[str, Any]) -> str | None:
    stored_collection = str(item.get("inventory_collection") or "").strip()
    if stored_collection in {"products", "user_products"}:
        return stored_collection

    from .routes.products import find_catalog_product

    product, source = await find_catalog_product(ctx, item.get("product_id"))
    if not product:
        return None
    return "user_products" if source == "user_admin" else "products"


async def update_inventory_stock(ctx, collection_name: str, product_id: str, quantity_delta: int) -> bool:
    result = await ctx.db.collection(collection_name).update_one(
        {"product_id": product_id},
        {"$inc": {"stock": quantity_delta}, "$set": {"updated_at": now_iso()}},
    )
    return result.matchedCount > 0


async def persist_delivery_updates(ctx, order: dict[str, Any], updates: dict[str, Any]) -> str | None:
    result = await ctx.db.collection("orders").update_one(
        delivery_update_filter(order),
        {"$set": updates},
    )
    if result.matchedCount == 0:
        return "Delivery was updated by another request. Refresh and retry."
    return None


async def transition_delivery_item(
    ctx,
    order: dict[str, Any],
    item_index: int,
    next_status: str,
    allowed_current_statuses: set[str],
) -> tuple[dict[str, Any] | None, str | None]:
    updates, error = build_delivery_transition(order, item_index, next_status, allowed_current_statuses)
    if error:
        return None, error

    error = await persist_delivery_updates(ctx, order, updates)
    if error:
        return None, error
    return updates, None


async def cancel_delivery_item(
    ctx,
    order: dict[str, Any],
    item_index: int,
) -> tuple[dict[str, Any] | None, str | None]:
    updates, error = build_delivery_transition(
        order,
        item_index,
        DELIVERY_STATUS_CANCELLED,
        {DELIVERY_STATUS_PENDING, DELIVERY_STATUS_SHIPPING},
    )
    if error:
        return None, error

    item = updates["items"][item_index]
    product_id = str(item.get("product_id") or "").strip()
    quantity = int(item.get("quantity") or 0)
    collection_name = await resolve_inventory_collection_name(ctx, item)
    inventory_restored = False

    if collection_name and product_id and quantity > 0:
        inventory_restored = await update_inventory_stock(ctx, collection_name, product_id, quantity)
        if inventory_restored:
            item["inventory_restored_at"] = updates["updated_at"]

    error = await persist_delivery_updates(ctx, order, updates)
    if error:
        if inventory_restored:
            await update_inventory_stock(ctx, collection_name, product_id, -quantity)
        return None, error
    return updates, None
