import { normalizeText, escapeRegex, isObjectIdLike, parseIntParam, parseFloatParam, parseBoolParam } from "../utils.js";

const SORT_OPTIONS = {
  newest:     { created_at: -1, _id: -1 },
  oldest:     { created_at: 1,  _id: 1  },
  price_asc:  { price: 1,  name: 1 },
  price_desc: { price: -1, name: 1 },
  name_asc:   { name: 1 },
  name_desc:  { name: -1 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function isSafeImageUrl(v) {
  const s = normalizeText(v, 2048);
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

function serializeProduct(p) {
  if (!p) return null;
  const { _id, ...rest } = p;
  return { ...rest, product_id: rest.product_id ?? String(_id) };
}

function buildProductFilter(id) {
  const s = normalizeText(id, 160);
  if (!s) return null;
  return isObjectIdLike(s)
    ? { $or: [{ product_id: s }, { _id: { $oid: s } }] }
    : { product_id: s };
}

function validateCreatePayload(input) {
  const name = normalizeText(input?.name, 120);
  const category = normalizeText(input?.category, 80);
  const image_url = normalizeText(input?.image_url, 2048);
  const price = Number(input?.price);
  const stock = Number(input?.stock);

  if (!name)                                      return { error: "Product name is required" };
  if (!category)                                  return { error: "Category is required" };
  if (!Number.isFinite(price) || price < 0)       return { error: "Price must be a valid non-negative number" };
  if (!Number.isInteger(stock) || stock < 0)      return { error: "Stock must be a non-negative integer" };
  if (!image_url || !isSafeImageUrl(image_url))   return { error: "Image URL must be a valid http/https URL" };

  return {
    payload: {
      name,
      company:     normalizeText(input?.company, 80),
      description: normalizeText(input?.description, 5000),
      category,
      subcategory: normalizeText(input?.subcategory, 80),
      image_url,
      price,
      stock,
    },
  };
}

function validateUpdatePayload(input, existing) {
  if (!input || typeof input !== "object") return { error: "Invalid update payload" };

  const updates = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(input, k);

  if (has("name")) {
    const name = normalizeText(input.name, 120);
    if (!name) return { error: "Product name is required" };
    updates.name = name;
  }
  if (has("company"))     updates.company = normalizeText(input.company, 80);
  if (has("description")) updates.description = normalizeText(input.description, 5000);
  if (has("category")) {
    const cat = normalizeText(input.category, 80);
    if (!cat) return { error: "Category is required" };
    updates.category = cat;
  }
  if (has("subcategory")) updates.subcategory = normalizeText(input.subcategory, 80);
  if (has("image_url")) {
    const url = normalizeText(input.image_url, 2048);
    if (!url || !isSafeImageUrl(url)) return { error: "Image URL must be a valid http/https URL" };
    updates.image_url = url;
  }
  if (has("price")) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) return { error: "Price must be a valid non-negative number" };
    updates.price = price;
  }
  if (has("stock")) {
    const stock = Number(input.stock);
    if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a non-negative integer" };
    updates.stock = stock;
  }

  if (Object.keys(updates).length === 0) return { error: "No valid fields provided for update" };
  updates.updated_at = new Date();
  return { updates };
}

// ─── Route handlers ────────────────────────────────────────────────────────

// GET /products
export async function handleGetProducts(ctx) {
  const { db, query } = ctx;

  const filters = [];

  const cat = normalizeText(query.category, 80);
  if (cat) filters.push({ category: cat });

  const sub = normalizeText(query.subcategory, 80);
  if (sub) filters.push({ subcategory: sub });

  const company = normalizeText(query.company, 100);
  if (company) {
    const esc = escapeRegex(company);
    filters.push({ $or: [{ company: { $regex: `^${esc}$`, $options: "i" } }, { name: { $regex: `^${esc}(\\s|\\b)`, $options: "i" } }] });
  }

  const search = normalizeText(query.search, 80);
  if (search) {
    const esc = escapeRegex(search);
    filters.push({ $or: [
      { name:        { $regex: esc, $options: "i" } },
      { company:     { $regex: esc, $options: "i" } },
      { category:    { $regex: esc, $options: "i" } },
      { subcategory: { $regex: esc, $options: "i" } },
      { description: { $regex: esc, $options: "i" } },
    ]});
  }

  const minPrice = parseFloatParam(query.min_price ?? query.minPrice);
  const maxPrice = parseFloatParam(query.max_price ?? query.maxPrice);
  if (minPrice != null || maxPrice != null) {
    if (minPrice != null && minPrice < 0) return ctx.error(400, "min_price cannot be negative");
    if (maxPrice != null && maxPrice < 0) return ctx.error(400, "max_price cannot be negative");
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) return ctx.error(400, "min_price cannot be greater than max_price");
    const pf = {};
    if (minPrice != null) pf.$gte = minPrice;
    if (maxPrice != null) pf.$lte = maxPrice;
    filters.push({ price: pf });
  }

  const inStock = parseBoolParam(query.in_stock ?? query.inStock);
  if (inStock === true) filters.push({ stock: { $gt: 0 } });

  const dbQuery = filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { $and: filters };
  const sortKey = normalizeText(query.sort, 30).toLowerCase();
  const sortClause = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.newest;

  const includeMeta = parseBoolParam(query.include_meta ?? query.includeMeta) === true;
  const pageInput = parseIntParam(query.page);
  const pageSizeInput = parseIntParam(query.page_size ?? query.pageSize);
  const limitInput = parseIntParam(query.limit);
  const shouldPaginate = includeMeta || pageSizeInput != null || pageInput != null;

  const col = db.collection("products");

  if (!shouldPaginate) {
    const limit = limitInput != null ? Math.min(Math.max(limitInput, 1), 250) : 150;
    const products = await col.find(dbQuery).sort(sortClause).limit(limit).toArray();
    return ctx.json(products.map(serializeProduct), 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
  }

  const page = Math.max(1, pageInput ?? 1);
  const pageSize = Math.min(Math.max(pageSizeInput ?? limitInput ?? 24, 1), 250);
  const skip = (page - 1) * pageSize;

  const [products, total] = await Promise.all([
    col.find(dbQuery).sort(sortClause).skip(skip).limit(pageSize).toArray(),
    col.countDocuments(dbQuery),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return ctx.json({
    items: products.map(serializeProduct),
    meta: { page, page_size: pageSize, total, total_pages: totalPages, has_prev: page > 1, has_next: page < totalPages },
  }, 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
}

// GET /products/:id
export async function handleGetProduct(ctx) {
  const { db, params } = ctx;
  const filter = buildProductFilter(params.id);
  if (!filter) return ctx.error(400, "Invalid product id");

  const product = await db.collection("products").findOne(filter);
  if (!product) return ctx.error(404, "Product not found");
  return ctx.json(serializeProduct(product), 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
}

// POST /products  (admin only)
export async function handleCreateProduct(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const { db, body } = ctx;
  const b = body && typeof body === "object" ? body : {};
  const { payload, error } = validateCreatePayload(b);
  if (error) return ctx.error(400, error);

  const explicitId = normalizeText(b.product_id, 80);
  const generatedId = `prod_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const productId = explicitId || generatedId;

  if (!/^[a-zA-Z0-9_-]{4,80}$/.test(productId)) return ctx.error(400, "product_id format is invalid");

  const existing = await db.collection("products").findOne({ product_id: productId }, { projection: { _id: 1 } });
  if (existing) return ctx.error(409, "product_id already exists");

  const now = new Date();
  const newProduct = { ...payload, product_id: productId, created_at: now, updated_at: now };
  await db.collection("products").insertOne(newProduct);
  return ctx.json(serializeProduct(newProduct), 201);
}

// PUT /products/:id  (admin only)
export async function handleUpdateProduct(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const { db, params, body } = ctx;
  const filter = buildProductFilter(params.id);
  if (!filter) return ctx.error(400, "Invalid product id");

  const existing = await db.collection("products").findOne(filter);
  if (!existing) return ctx.error(404, "Product not found");

  const b = body && typeof body === "object" ? body : {};
  const { updates, error } = validateUpdatePayload(b, existing);
  if (error) return ctx.error(400, error);

  const result = await db.collection("products").updateOne(filter, { $set: updates });
  if (result.matchedCount === 0) return ctx.error(404, "Product not found");

  const updated = await db.collection("products").findOne(filter);
  return ctx.json(serializeProduct(updated));
}

// DELETE /products/:id  (admin only)
export async function handleDeleteProduct(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const { db, params } = ctx;
  const filter = buildProductFilter(params.id);
  if (!filter) return ctx.error(400, "Invalid product id");

  const result = await db.collection("products").deleteOne(filter);
  if (result.deletedCount === 0) return ctx.error(404, "Product not found");
  return ctx.json({ message: "Product deleted successfully" });
}
