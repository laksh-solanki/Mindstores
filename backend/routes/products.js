const SORT_OPTIONS = {
  newest: { created_at: -1, _id: -1 },
  oldest: { created_at: 1, _id: 1 },
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};

function normalizeText(value, maxLength = 0) {
  const text = value == null ? "" : String(value).trim();
  if (!text) {
    return "";
  }
  if (maxLength > 0 && text.length > maxLength) {
    return text.slice(0, maxLength);
  }
  return text;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCategoryName(value) {
  return normalizeText(value, 80);
}

function normalizeSubcategoryName(subcategory) {
  return normalizeText(subcategory, 80);
}

function parseNumberQueryParam(value) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerQueryParam(value) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanQueryParam(value) {
  const normalized = normalizeText(value, 10).toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return null;
}

function isObjectIdLike(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

async function buildObjectId(value) {
  const normalized = String(value || "").trim();
  if (!isObjectIdLike(normalized)) {
    return null;
  }

  return { $oid: normalized };
}

function isSafeImageUrl(value) {
  const normalized = normalizeText(value, 2048);
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function serializeProduct(product) {
  if (!product) {
    return null;
  }
  const { _id, ...rest } = product;
  return {
    ...rest,
    product_id: rest.product_id || String(_id),
  };
}

function buildCreateProductPayload(input) {
  const payload = {
    name: normalizeText(input?.name, 120),
    company: normalizeText(input?.company, 80),
    description: normalizeText(input?.description, 5000),
    category: normalizeCategoryName(input?.category),
    subcategory: normalizeSubcategoryName(input?.subcategory),
    image_url: normalizeText(input?.image_url, 2048),
    price: Number(input?.price),
    stock: Number(input?.stock),
  };

  if (!payload.name) {
    return { error: "Product name is required" };
  }
  if (!payload.category) {
    return { error: "Category is required" };
  }
  if (!Number.isFinite(payload.price) || payload.price < 0) {
    return { error: "Price must be a valid number" };
  }
  if (!Number.isInteger(payload.stock) || payload.stock < 0) {
    return { error: "Stock must be a non-negative integer" };
  }
  if (!payload.image_url || !isSafeImageUrl(payload.image_url)) {
    return { error: "Image URL must be a valid http/https URL" };
  }

  return { payload };
}

function buildUpdateProductPayload(input, existingProduct) {
  if (!input || typeof input !== "object") {
    return { error: "Invalid update payload" };
  }

  const existingCategory = normalizeCategoryName(existingProduct?.category);
  const nextCategory = hasOwn(input, "category")
    ? normalizeCategoryName(input.category)
    : existingCategory;

  const nextSubcategory = hasOwn(input, "subcategory")
    ? normalizeSubcategoryName(input.subcategory)
    : normalizeSubcategoryName(existingProduct?.subcategory);

  const updates = {};

  if (hasOwn(input, "name")) {
    const normalized = normalizeText(input.name, 120);
    if (!normalized) {
      return { error: "Product name is required" };
    }
    updates.name = normalized;
  }

  if (hasOwn(input, "company")) {
    updates.company = normalizeText(input.company, 80);
  }

  if (hasOwn(input, "description")) {
    updates.description = normalizeText(input.description, 5000);
  }

  if (hasOwn(input, "category")) {
    if (!nextCategory) {
      return { error: "Category is required" };
    }
    updates.category = nextCategory;
  }

  if (hasOwn(input, "subcategory")) {
    updates.subcategory = nextSubcategory;
  }

  if (hasOwn(input, "image_url")) {
    const imageUrl = normalizeText(input.image_url, 2048);
    if (!imageUrl || !isSafeImageUrl(imageUrl)) {
      return { error: "Image URL must be a valid http/https URL" };
    }
    updates.image_url = imageUrl;
  }

  if (hasOwn(input, "price")) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Price must be a valid number" };
    }
    updates.price = price;
  }

  if (hasOwn(input, "stock")) {
    const stock = Number(input.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "Stock must be a non-negative integer" };
    }
    updates.stock = stock;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No valid fields provided for update" };
  }

  updates.updated_at = new Date();
  return { updates };
}

async function buildProductFilter(id) {
  const normalizedId = normalizeText(id, 160);
  if (!normalizedId) {
    return null;
  }

  const objectId = await buildObjectId(normalizedId);
  if (objectId) {
    return {
      $or: [{ product_id: normalizedId }, { _id: objectId }],
    };
  }

  return { product_id: normalizedId };
}

export default async function registerProductRoutes(fastify, deps) {
  const { uuidv4, requireAdmin, createRateLimitGuard } = deps;

  const adminMutationRateLimit = createRateLimitGuard({
    keyPrefix: "products:admin-mutation",
    windowMs: 60_000,
    maxRequests: 40,
  });

  fastify.get("/products", async (request, reply) => {
    const queryParams = request.query || {};

    const normalizedCategory = normalizeCategoryName(queryParams.category);
    const normalizedSubcategory = normalizeSubcategoryName(queryParams.subcategory);
    const normalizedCompany = normalizeText(queryParams.company, 100);
    const normalizedSearch = normalizeText(queryParams.search, 80);

    const filters = [];

    if (normalizedCategory) {
      filters.push({ category: normalizedCategory });
    }

    if (normalizedSubcategory) {
      filters.push({ subcategory: normalizedSubcategory });
    }

    if (normalizedCompany) {
      const escaped = escapeRegex(normalizedCompany);
      filters.push({
        $or: [
          { company: { $regex: `^${escaped}$`, $options: "i" } },
          { name: { $regex: `^${escaped}(\\s|\\b)`, $options: "i" } },
        ],
      });
    }

    if (normalizedSearch) {
      const escapedSearch = escapeRegex(normalizedSearch);
      filters.push({
        $or: [
          { name: { $regex: escapedSearch, $options: "i" } },
          { company: { $regex: escapedSearch, $options: "i" } },
          { category: { $regex: escapedSearch, $options: "i" } },
          { subcategory: { $regex: escapedSearch, $options: "i" } },
          { description: { $regex: escapedSearch, $options: "i" } },
        ],
      });
    }

    const minPriceInput = queryParams.min_price ?? queryParams.minPrice;
    const maxPriceInput = queryParams.max_price ?? queryParams.maxPrice;
    const minPrice = parseNumberQueryParam(minPriceInput);
    const maxPrice = parseNumberQueryParam(maxPriceInput);

    if (minPrice != null || maxPrice != null) {
      if (minPrice != null && minPrice < 0) {
        return reply.code(400).send({ message: "min_price cannot be negative" });
      }
      if (maxPrice != null && maxPrice < 0) {
        return reply.code(400).send({ message: "max_price cannot be negative" });
      }
      if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
        return reply.code(400).send({ message: "min_price cannot be greater than max_price" });
      }

      const priceFilter = {};
      if (minPrice != null) {
        priceFilter.$gte = minPrice;
      }
      if (maxPrice != null) {
        priceFilter.$lte = maxPrice;
      }
      filters.push({ price: priceFilter });
    }

    const inStockInput = queryParams.in_stock ?? queryParams.inStock;
    const inStock = parseBooleanQueryParam(inStockInput);
    if (inStock === true) {
      filters.push({ stock: { $gt: 0 } });
    }

    const query =
      filters.length === 0
        ? {}
        : filters.length === 1
          ? filters[0]
          : { $and: filters };

    const normalizedSortKey = normalizeText(queryParams.sort, 30).toLowerCase();
    const sortClause = SORT_OPTIONS[normalizedSortKey] || SORT_OPTIONS.newest;

    const includeMetaInput = queryParams.include_meta ?? queryParams.includeMeta;
    const includeMeta = parseBooleanQueryParam(includeMetaInput) === true;

    const page = Math.max(1, parseIntegerQueryParam(queryParams.page) || 1);
    const pageSizeInput = parseIntegerQueryParam(queryParams.page_size ?? queryParams.pageSize);
    const limitInput = parseIntegerQueryParam(queryParams.limit);

    const shouldPaginate = includeMeta || pageSizeInput != null || parseIntegerQueryParam(queryParams.page) != null;

    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

    const productsCollection = fastify.mongo.db.collection("products");

    if (!shouldPaginate) {
      const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 250) : 150;
      const products = await productsCollection.find(query).sort(sortClause).limit(limit).toArray();
      return products.map(serializeProduct);
    }

    const pageSizeBase = pageSizeInput ?? limitInput ?? 24;
    const pageSize = Math.min(Math.max(pageSizeBase, 1), 250);
    const skip = (page - 1) * pageSize;

    const [products, total] = await Promise.all([
      productsCollection.find(query).sort(sortClause).skip(skip).limit(pageSize).toArray(),
      productsCollection.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: products.map(serializeProduct),
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_prev: page > 1,
        has_next: page < totalPages,
      },
    };
  });

  fastify.get("/products/:id", async (request, reply) => {
    const filter = await buildProductFilter(request.params?.id);
    if (!filter) {
      return reply.code(400).send({ message: "Invalid product id" });
    }

    const product = await fastify.mongo.db.collection("products").findOne(filter);
    if (!product) {
      return reply.code(404).send({ message: "Product not found" });
    }

    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return serializeProduct(product);
  });

  fastify.post("/products", { preHandler: [adminMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const { payload, error } = buildCreateProductPayload(body);
    if (error) {
      return reply.code(400).send({ message: error });
    }

    const explicitProductId = normalizeText(body.product_id, 80);
    const generatedProductId = `prod_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    const productId = explicitProductId || generatedProductId;

    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(productId)) {
      return reply.code(400).send({ message: "product_id format is invalid" });
    }

    const existing = await fastify.mongo.db
      .collection("products")
      .findOne({ product_id: productId }, { projection: { _id: 1 } });

    if (existing) {
      return reply.code(409).send({ message: "product_id already exists" });
    }

    const now = new Date();
    const newProduct = {
      ...payload,
      product_id: productId,
      created_at: now,
      updated_at: now,
    };

    await fastify.mongo.db.collection("products").insertOne(newProduct);
    return serializeProduct(newProduct);
  });

  fastify.put("/products/:id", { preHandler: [adminMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const filter = await buildProductFilter(request.params?.id);
    if (!filter) {
      return reply.code(400).send({ message: "Invalid product id" });
    }

    const existingProduct = await fastify.mongo.db.collection("products").findOne(filter);
    if (!existingProduct) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const { updates, error } = buildUpdateProductPayload(body, existingProduct);

    if (error) {
      return reply.code(400).send({ message: error });
    }

    const result = await fastify.mongo.db.collection("products").updateOne(filter, { $set: updates });
    if (result.matchedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const updatedProduct = await fastify.mongo.db.collection("products").findOne(filter);
    return serializeProduct(updatedProduct);
  });

  fastify.delete("/products/:id", { preHandler: [adminMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const filter = await buildProductFilter(request.params?.id);
    if (!filter) {
      return reply.code(400).send({ message: "Invalid product id" });
    }

    const result = await fastify.mongo.db.collection("products").deleteOne(filter);
    if (result.deletedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }

    return { message: "Product deleted successfully" };
  });
}
