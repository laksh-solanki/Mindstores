from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..context import RequestContext, error_response, get_context, json_response, read_json_body
from ..utils import (
    escape_regex,
    is_object_id_like,
    normalize_text,
    now_iso,
    parse_bool_param,
    parse_float_param,
    parse_int_param,
    random_compact_id,
)

router = APIRouter()

SORT_OPTIONS = {
    "newest": {"created_at": -1, "_id": -1},
    "oldest": {"created_at": 1, "_id": 1},
    "price_asc": {"price": 1, "name": 1},
    "price_desc": {"price": -1, "name": 1},
    "name_asc": {"name": 1},
    "name_desc": {"name": -1},
}


def is_safe_image_url(value: Any) -> bool:
    text = normalize_text(value, 2048)
    return text.startswith("http://") or text.startswith("https://")


def serialize_product(product: dict[str, Any] | None) -> dict[str, Any] | None:
    if not product:
        return None
    output = {key: value for key, value in product.items() if key != "_id"}
    output["product_id"] = output.get("product_id") or str(product.get("_id"))
    return output


def build_product_filter(product_id: Any) -> dict[str, Any] | None:
    text = normalize_text(product_id, 160)
    if not text:
        return None
    if is_object_id_like(text):
        return {"$or": [{"product_id": text}, {"_id": {"$oid": text}}]}
    return {"product_id": text}


def validate_create_payload(data: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    name = normalize_text(data.get("name"), 120)
    category = normalize_text(data.get("category"), 80)
    image_url = normalize_text(data.get("image_url"), 2048)
    try:
        price = float(data.get("price"))
    except (TypeError, ValueError):
        price = float("nan")
    try:
        stock = float(data.get("stock"))
    except (TypeError, ValueError):
        stock = float("nan")

    if not name:
        return None, "Product name is required"
    if not category:
        return None, "Category is required"
    if price != price or price < 0:
        return None, "Price must be a valid non-negative number"
    if stock != stock or not stock.is_integer() or stock < 0:
        return None, "Stock must be a non-negative integer"
    if not image_url or not is_safe_image_url(image_url):
        return None, "Image URL must be a valid http/https URL"

    return {
        "name": name,
        "company": normalize_text(data.get("company"), 80),
        "description": normalize_text(data.get("description"), 5000),
        "category": category,
        "subcategory": normalize_text(data.get("subcategory"), 80),
        "image_url": image_url,
        "price": price,
        "stock": int(stock),
    }, None


def validate_update_payload(data: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    if not isinstance(data, dict):
        return None, "Invalid update payload"
    updates: dict[str, Any] = {}
    if "name" in data:
        name = normalize_text(data.get("name"), 120)
        if not name:
            return None, "Product name is required"
        updates["name"] = name
    if "company" in data:
        updates["company"] = normalize_text(data.get("company"), 80)
    if "description" in data:
        updates["description"] = normalize_text(data.get("description"), 5000)
    if "category" in data:
        category = normalize_text(data.get("category"), 80)
        if not category:
            return None, "Category is required"
        updates["category"] = category
    if "subcategory" in data:
        updates["subcategory"] = normalize_text(data.get("subcategory"), 80)
    if "image_url" in data:
        image_url = normalize_text(data.get("image_url"), 2048)
        if not image_url or not is_safe_image_url(image_url):
            return None, "Image URL must be a valid http/https URL"
        updates["image_url"] = image_url
    if "price" in data:
        try:
            price = float(data.get("price"))
        except (TypeError, ValueError):
            price = float("nan")
        if price != price or price < 0:
            return None, "Price must be a valid non-negative number"
        updates["price"] = price
    if "stock" in data:
        try:
            stock = float(data.get("stock"))
        except (TypeError, ValueError):
            stock = float("nan")
        if stock != stock or not stock.is_integer() or stock < 0:
            return None, "Stock must be a non-negative integer"
        updates["stock"] = int(stock)
    if not updates:
        return None, "No valid fields provided for update"
    updates["updated_at"] = now_iso()
    return updates, None


@router.get("/products")
async def get_products(ctx: RequestContext = Depends(get_context)):
    query = ctx.request.query_params
    filters: list[dict[str, Any]] = []
    category = normalize_text(query.get("category"), 80)
    if category:
        filters.append({"category": category})
    subcategory = normalize_text(query.get("subcategory"), 80)
    if subcategory:
        filters.append({"subcategory": subcategory})
    company = normalize_text(query.get("company"), 100)
    if company:
        escaped = escape_regex(company)
        filters.append({"$or": [{"company": {"$regex": f"^{escaped}$", "$options": "i"}}, {"name": {"$regex": f"^{escaped}(\\s|\\b)", "$options": "i"}}]})
    search = normalize_text(query.get("search"), 80)
    if search:
        escaped = escape_regex(search)
        filters.append({"$or": [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"company": {"$regex": escaped, "$options": "i"}},
            {"category": {"$regex": escaped, "$options": "i"}},
            {"subcategory": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}},
        ]})
    min_price = parse_float_param(query.get("min_price") or query.get("minPrice"))
    max_price = parse_float_param(query.get("max_price") or query.get("maxPrice"))
    if min_price is not None or max_price is not None:
        if min_price is not None and min_price < 0:
            return error_response(400, "min_price cannot be negative")
        if max_price is not None and max_price < 0:
            return error_response(400, "max_price cannot be negative")
        if min_price is not None and max_price is not None and min_price > max_price:
            return error_response(400, "min_price cannot be greater than max_price")
        price_filter: dict[str, float] = {}
        if min_price is not None:
            price_filter["$gte"] = min_price
        if max_price is not None:
            price_filter["$lte"] = max_price
        filters.append({"price": price_filter})
    if parse_bool_param(query.get("in_stock") or query.get("inStock")) is True:
        filters.append({"stock": {"$gt": 0}})

    db_query = {} if not filters else filters[0] if len(filters) == 1 else {"$and": filters}
    sort_clause = SORT_OPTIONS.get(normalize_text(query.get("sort"), 30).lower(), SORT_OPTIONS["newest"])
    include_meta = parse_bool_param(query.get("include_meta") or query.get("includeMeta")) is True
    page_input = parse_int_param(query.get("page"))
    page_size_input = parse_int_param(query.get("page_size") or query.get("pageSize"))
    limit_input = parse_int_param(query.get("limit"))
    should_paginate = include_meta or page_size_input is not None or page_input is not None
    collection = ctx.db.collection("products")

    if not should_paginate:
        limit = min(max(limit_input or 150, 1), 250)
        products = await collection.find(db_query).sort(sort_clause).limit(limit).to_array()
        return json_response([serialize_product(item) for item in products], headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=300"})

    page = max(1, page_input or 1)
    page_size = min(max(page_size_input or limit_input or 24, 1), 250)
    skip = (page - 1) * page_size
    products = await collection.find(db_query).sort(sort_clause).skip(skip).limit(page_size).to_array()
    total = await collection.count_documents(db_query)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return json_response(
        {
            "items": [serialize_product(item) for item in products],
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
                "has_prev": page > 1,
                "has_next": page < total_pages,
            },
        },
        headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=300"},
    )


@router.get("/products/{product_id}")
async def get_product(product_id: str, ctx: RequestContext = Depends(get_context)):
    product_filter = build_product_filter(product_id)
    if not product_filter:
        return error_response(400, "Invalid product id")
    product = await ctx.db.collection("products").find_one(product_filter)
    if not product:
        return error_response(404, "Product not found")
    return json_response(serialize_product(product), headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=300"})


@router.post("/products")
async def create_product(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    if not ctx.user.get("is_admin"):
        return error_response(403, "Admin access required")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    payload, error = validate_create_payload(data)
    if error:
        return error_response(400, error)
    product_id = normalize_text(data.get("product_id"), 80) or random_compact_id("prod")
    if not __import__("re").fullmatch(r"[a-zA-Z0-9_-]{4,80}", product_id):
        return error_response(400, "product_id format is invalid")
    existing = await ctx.db.collection("products").find_one({"product_id": product_id}, {"projection": {"_id": 1}})
    if existing:
        return error_response(409, "product_id already exists")
    now = now_iso()
    product = {**payload, "product_id": product_id, "created_at": now, "updated_at": now}
    await ctx.db.collection("products").insert_one(product)
    return json_response(serialize_product(product), 201)


@router.put("/products/{product_id}")
async def update_product(product_id: str, request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    if not ctx.user.get("is_admin"):
        return error_response(403, "Admin access required")
    product_filter = build_product_filter(product_id)
    if not product_filter:
        return error_response(400, "Invalid product id")
    existing = await ctx.db.collection("products").find_one(product_filter)
    if not existing:
        return error_response(404, "Product not found")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    updates, error = validate_update_payload(body if isinstance(body, dict) else {})
    if error:
        return error_response(400, error)
    result = await ctx.db.collection("products").update_one(product_filter, {"$set": updates})
    if result.matchedCount == 0:
        return error_response(404, "Product not found")
    updated = await ctx.db.collection("products").find_one(product_filter)
    return json_response(serialize_product(updated))


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    if not ctx.user.get("is_admin"):
        return error_response(403, "Admin access required")
    product_filter = build_product_filter(product_id)
    if not product_filter:
        return error_response(400, "Invalid product id")
    result = await ctx.db.collection("products").delete_one(product_filter)
    if result.deletedCount == 0:
        return error_response(404, "Product not found")
    return json_response({"message": "Product deleted successfully"})
