from __future__ import annotations

import re
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
MAX_PRODUCT_IMAGE_DATA_URL_LENGTH = 700_000
MAX_PRODUCT_IMAGE_COUNT = 6
MAX_REVIEW_COMMENT_LENGTH = 1000
ALLOWED_PRICE_CURRENCIES = {"USD", "EUR", "GBP", "INR"}
DATA_IMAGE_URL_PATTERN = re.compile(
    r"data:image/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+",
    re.IGNORECASE,
)

SORT_OPTIONS = {
    "newest": {"created_at": -1, "_id": -1},
    "oldest": {"created_at": 1, "_id": 1},
    "price_asc": {"price": 1, "name": 1},
    "price_desc": {"price": -1, "name": 1},
    "name_asc": {"name": 1},
    "name_desc": {"name": -1},
}


def normalize_product_image_url(value: Any) -> str:
    text = normalize_text(value)
    if not text:
        return ""
    if text.startswith("data:image/"):
        if len(text) <= MAX_PRODUCT_IMAGE_DATA_URL_LENGTH and DATA_IMAGE_URL_PATTERN.fullmatch(text):
            return text
        return ""
    text = normalize_text(value, 2048)
    return text if text.startswith("http://") or text.startswith("https://") else ""


def normalize_product_image_urls(values: Any, fallback: Any = "") -> list[str]:
    if isinstance(values, list):
        candidates = values
    elif values not in (None, ""):
        candidates = [values]
    else:
        candidates = []

    normalized_images: list[str] = []
    for candidate in candidates:
        normalized = normalize_product_image_url(candidate)
        if normalized and normalized not in normalized_images:
            normalized_images.append(normalized)
        if len(normalized_images) >= MAX_PRODUCT_IMAGE_COUNT:
            break

    if not normalized_images:
        fallback_image = normalize_product_image_url(fallback)
        if fallback_image:
            normalized_images.append(fallback_image)

    return normalized_images


def normalize_category_key(value: Any) -> str:
    return normalize_text(value, 80).casefold()


def normalize_price_currency(value: Any) -> str:
    currency = normalize_text(value, 12).upper()
    return currency if currency in ALLOWED_PRICE_CURRENCIES else "USD"


def serialize_product(product: dict[str, Any] | None) -> dict[str, Any] | None:
    if not product:
        return None
    output = {key: value for key, value in product.items() if key != "_id"}
    output["product_id"] = output.get("product_id") or str(product.get("_id"))
    image_urls = normalize_product_image_urls(output.get("image_urls"), output.get("image_url"))
    output["image_urls"] = image_urls
    if image_urls:
        output["image_url"] = image_urls[0]
    return output


def serialize_user_admin_product(product: dict[str, Any] | None) -> dict[str, Any] | None:
    output = serialize_product(product)
    if not output:
        return None
    output["catalog_source"] = "user_admin"
    output["source_label"] = "User Admin"
    output["owner_email"] = normalize_text(output.get("owner_email"), 320)
    return output


def normalize_review_rating(value: Any) -> int | None:
    try:
        rating = int(float(value))
    except (TypeError, ValueError):
        return None
    return rating if 1 <= rating <= 5 else None


def resolve_reviewer_name(user: dict[str, Any] | None) -> str:
    user = user or {}
    name = normalize_text(user.get("name"), 120)
    if name:
        return name
    email = normalize_text(user.get("email"), 320)
    if email:
        return email.split("@", 1)[0] or "Mindstores user"
    return "Mindstores user"


def serialize_public_review(review: dict[str, Any] | None) -> dict[str, Any] | None:
    if not review:
        return None
    return {
        "review_id": review.get("review_id"),
        "product_id": review.get("product_id"),
        "rating": review.get("rating"),
        "comment": review.get("comment"),
        "reviewer_name": review.get("reviewer_name") or "Mindstores user",
        "created_at": review.get("created_at"),
        "updated_at": review.get("updated_at"),
    }


def build_product_filter(product_id: Any) -> dict[str, Any] | None:
    text = normalize_text(product_id, 160)
    if not text:
        return None
    if is_object_id_like(text):
        return {"$or": [{"product_id": text}, {"_id": {"$oid": text}}]}
    return {"product_id": text}


async def find_catalog_product(ctx: RequestContext, product_id: Any) -> tuple[dict[str, Any] | None, str]:
    product_filter = build_product_filter(product_id)
    if not product_filter:
        return None, ""
    product = await ctx.db.collection("products").find_one(product_filter)
    if product:
        return product, "admin"
    product = await ctx.db.collection("user_products").find_one(product_filter)
    if product:
        return product, "user_admin"
    return None, ""


def build_review_summary(reviews: list[dict[str, Any]]) -> dict[str, Any]:
    ratings = [int(review.get("rating") or 0) for review in reviews if review.get("rating")]
    count = len(ratings)
    average = round(sum(ratings) / count, 2) if count else 0
    return {"count": count, "average_rating": average}


def serialize_category_record(record: dict[str, Any] | None) -> dict[str, Any] | None:
    if not record:
        return None
    category = normalize_text(record.get("category"), 80)
    if not category:
        return None
    subcategories = [
        normalize_text(subcategory, 80)
        for subcategory in record.get("subcategories", [])
        if normalize_text(subcategory, 80)
    ]
    return {
        "category": category,
        "subcategories": sorted(set(subcategories), key=str.casefold),
    }


def merge_category_record(
    records: dict[str, dict[str, Any]],
    category_value: Any,
    subcategory_value: Any = "",
) -> None:
    category = normalize_text(category_value, 80)
    if not category:
        return
    key = normalize_category_key(category)
    records.setdefault(key, {"category": category, "subcategories": set()})
    subcategory = normalize_text(subcategory_value, 80)
    if subcategory:
        records[key]["subcategories"].add(subcategory)


def serialize_category_records(records: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {"category": record["category"], "subcategories": sorted(record["subcategories"], key=str.casefold)}
        for record in sorted(records.values(), key=lambda item: item["category"].casefold())
    ]


async def save_category_metadata(
    ctx: RequestContext,
    category_value: Any,
    subcategory_value: Any = "",
    updated_by: Any = "",
) -> dict[str, Any] | None:
    category = normalize_text(category_value, 80)
    if not category:
        return None

    category_key = normalize_category_key(category)
    subcategory = normalize_text(subcategory_value, 80)
    collection = ctx.db.collection("product_categories")
    existing = await collection.find_one({"category_key": category_key})
    now = now_iso()
    subcategories = set()
    if existing:
        for item in existing.get("subcategories", []):
            normalized = normalize_text(item, 80)
            if normalized:
                subcategories.add(normalized)
    if subcategory:
        subcategories.add(subcategory)

    payload = {
        "category_key": category_key,
        "category": category,
        "subcategories": sorted(subcategories, key=str.casefold),
        "updated_at": now,
        "updated_by": normalize_text(updated_by, 320),
    }
    if existing:
        await collection.update_one({"category_key": category_key}, {"$set": payload})
        return payload

    document = {**payload, "created_at": now}
    await collection.insert_one(document)
    return document


def validate_create_payload(data: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    name = normalize_text(data.get("name"), 120)
    category = normalize_text(data.get("category"), 80)
    image_urls = normalize_product_image_urls(data.get("image_urls"), data.get("image_url"))
    price_currency = normalize_price_currency(data.get("price_currency") or data.get("currency"))
    try:
        price = float(data.get("price"))
    except (TypeError, ValueError):
        price = float("nan")
    try:
        price_amount = float(data.get("price_amount", price))
    except (TypeError, ValueError):
        price_amount = float("nan")
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
    if price_amount != price_amount or price_amount < 0:
        return None, "Price amount must be a valid non-negative number"
    if stock != stock or not stock.is_integer() or stock < 0:
        return None, "Stock must be a non-negative integer"
    if not image_urls:
        return None, "At least one image must be a valid http/https URL or image upload"

    return {
        "name": name,
        "company": normalize_text(data.get("company"), 80),
        "description": normalize_text(data.get("description"), 5000),
        "category": category,
        "subcategory": normalize_text(data.get("subcategory"), 80),
        "image_url": image_urls[0],
        "image_urls": image_urls,
        "price": price,
        "price_amount": price_amount,
        "price_currency": price_currency,
        "currency": price_currency,
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
    if "image_urls" in data:
        image_urls = normalize_product_image_urls(data.get("image_urls"), data.get("image_url"))
        if not image_urls:
            return None, "At least one image must be a valid http/https URL or image upload"
        updates["image_url"] = image_urls[0]
        updates["image_urls"] = image_urls
    elif "image_url" in data:
        image_url = normalize_product_image_url(data.get("image_url"))
        if not image_url:
            return None, "Image must be a valid http/https URL or image upload"
        updates["image_url"] = image_url
        updates["image_urls"] = [image_url]
    if "price_currency" in data or "currency" in data:
        price_currency = normalize_price_currency(data.get("price_currency") or data.get("currency"))
        updates["price_currency"] = price_currency
        updates["currency"] = price_currency
    if "price_amount" in data:
        try:
            price_amount = float(data.get("price_amount"))
        except (TypeError, ValueError):
            price_amount = float("nan")
        if price_amount != price_amount or price_amount < 0:
            return None, "Price amount must be a valid non-negative number"
        updates["price_amount"] = price_amount
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
    include_user_products = (
        parse_bool_param(query.get("include_user_products") or query.get("includeUserProducts")) is True
        and bool(ctx.user and ctx.user.get("is_admin"))
    )
    should_paginate = include_meta or page_size_input is not None or page_input is not None
    collection = ctx.db.collection("products")

    if not should_paginate:
        limit = min(max(limit_input or 150, 1), 250)
        products = await collection.find(db_query).sort(sort_clause).limit(limit).to_array()
        items = [serialize_product(item) for item in products]
        if include_user_products:
            user_products = await ctx.db.collection("user_products").find(db_query).sort(sort_clause).limit(limit).to_array()
            items.extend(serialize_user_admin_product(item) for item in user_products)
            reverse = list(sort_clause.values())[0] < 0 if sort_clause else True
            items = sorted(
                [item for item in items if item],
                key=lambda item: str(item.get("updated_at") or item.get("created_at") or ""),
                reverse=reverse,
            )[:limit]
        cache_header = (
            {"Cache-Control": "no-store"}
            if include_user_products
            else {"Cache-Control": "public, max-age=60, stale-while-revalidate=300"}
        )
        return json_response(items, headers=cache_header)

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


@router.get("/products/categories")
async def get_product_categories(ctx: RequestContext = Depends(get_context)):
    records: dict[str, dict[str, Any]] = {}
    category_documents = await ctx.db.collection("product_categories").find({}).to_array()
    for document in category_documents:
        category_record = serialize_category_record(document)
        if not category_record:
            continue
        merge_category_record(records, category_record["category"])
        for subcategory in category_record["subcategories"]:
            merge_category_record(records, category_record["category"], subcategory)

    products = await ctx.db.collection("products").find(
        {},
        {"projection": {"_id": 0, "category": 1, "subcategory": 1}},
    ).to_array()
    for product in products:
        merge_category_record(records, product.get("category"), product.get("subcategory"))

    return json_response({"items": serialize_category_records(records)}, headers={"Cache-Control": "no-store"})


@router.post("/products/categories")
async def create_product_category(request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    if not ctx.user.get("is_admin"):
        return error_response(403, "Admin access required")

    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    category = normalize_text(data.get("category"), 80)
    subcategory = normalize_text(data.get("subcategory"), 80)
    if not category:
        return error_response(400, "Category is required")

    record = await save_category_metadata(ctx, category, subcategory, ctx.user.get("email"))
    return json_response(serialize_category_record(record), 201, {"Cache-Control": "no-store"})


@router.get("/products/{product_id}")
async def get_product(product_id: str, ctx: RequestContext = Depends(get_context)):
    product, product_source = await find_catalog_product(ctx, product_id)
    if not product and not build_product_filter(product_id):
        return error_response(400, "Invalid product id")
    if not product:
        return error_response(404, "Product not found")
    if product_source == "user_admin":
        return json_response(
            serialize_user_admin_product(product),
            headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=300"},
        )
    return json_response(serialize_product(product), headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=300"})


@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str, ctx: RequestContext = Depends(get_context)):
    product, _product_source = await find_catalog_product(ctx, product_id)
    if not product and not build_product_filter(product_id):
        return error_response(400, "Invalid product id")
    if not product:
        return error_response(404, "Product not found")
    canonical_product_id = normalize_text(product.get("product_id") or product_id, 160)
    reviews = await ctx.db.collection("product_reviews").find(
        {"product_id": canonical_product_id},
        {"projection": {"_id": 0}, "sort": {"created_at": -1}},
    ).to_array()
    public_reviews = [item for item in (serialize_public_review(review) for review in reviews) if item]
    return json_response(
        {
            "items": public_reviews,
            "summary": build_review_summary(public_reviews),
        },
        headers={"Cache-Control": "no-store"},
    )


@router.post("/products/{product_id}/reviews")
async def create_product_review(product_id: str, request: Request, ctx: RequestContext = Depends(get_context)):
    if not ctx.user:
        return error_response(401, "Not authenticated")
    product, product_source = await find_catalog_product(ctx, product_id)
    if not product and not build_product_filter(product_id):
        return error_response(400, "Invalid product id")
    if not product:
        return error_response(404, "Product not found")

    body = await read_json_body(request, ctx.config.max_body_bytes)
    data = body if isinstance(body, dict) else {}
    rating = normalize_review_rating(data.get("rating"))
    comment = normalize_text(data.get("comment") or data.get("review") or data.get("body"), MAX_REVIEW_COMMENT_LENGTH)
    if rating is None:
        return error_response(400, "Rating must be between 1 and 5")
    if not comment:
        return error_response(400, "Review is required")

    canonical_product_id = normalize_text(product.get("product_id") or product_id, 160)
    now = now_iso()
    image_urls = normalize_product_image_urls(product.get("image_urls"), product.get("image_url"))
    review = {
        "review_id": random_compact_id("review"),
        "product_id": canonical_product_id,
        "product_source": product_source,
        "product_name": normalize_text(product.get("name"), 120),
        "product_image_url": image_urls[0] if image_urls else "",
        "product_owner_user_id": normalize_text(product.get("owner_user_id"), 200),
        "product_owner_email": normalize_text(product.get("owner_email"), 320),
        "rating": rating,
        "comment": comment,
        "reviewer_user_id": normalize_text(ctx.user.get("user_id"), 200),
        "reviewer_name": resolve_reviewer_name(ctx.user),
        "reviewer_email": normalize_text(ctx.user.get("email"), 320),
        "created_at": now,
        "updated_at": now,
    }
    await ctx.db.collection("product_reviews").insert_one(review)
    return json_response(serialize_public_review(review), 201, {"Cache-Control": "no-store"})


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
    product = {
        **payload,
        "product_id": product_id,
        "owner_user_id": normalize_text(ctx.user.get("user_id"), 200),
        "owner_email": normalize_text(ctx.user.get("email"), 320),
        "catalog_source": "admin",
        "created_at": now,
        "updated_at": now,
    }
    await ctx.db.collection("products").insert_one(product)
    await save_category_metadata(ctx, product.get("category"), product.get("subcategory"), ctx.user.get("email"))
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
    user_product_collection = False
    if not existing:
        existing = await ctx.db.collection("user_products").find_one(product_filter)
        user_product_collection = bool(existing)
    if not existing:
        return error_response(404, "Product not found")
    body = await read_json_body(request, ctx.config.max_body_bytes)
    updates, error = validate_update_payload(body if isinstance(body, dict) else {})
    if error:
        return error_response(400, error)
    collection = ctx.db.collection("user_products" if user_product_collection else "products")
    result = await collection.update_one(product_filter, {"$set": updates})
    if result.matchedCount == 0:
        return error_response(404, "Product not found")
    await save_category_metadata(
        ctx,
        updates.get("category", existing.get("category")),
        updates.get("subcategory", existing.get("subcategory")),
        ctx.user.get("email"),
    )
    updated = await collection.find_one(product_filter)
    return json_response(serialize_user_admin_product(updated) if user_product_collection else serialize_product(updated))


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
        result = await ctx.db.collection("user_products").delete_one(product_filter)
    if result.deletedCount == 0:
        return error_response(404, "Product not found")
    return json_response({"message": "Product deleted successfully"})
