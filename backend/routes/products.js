/**
 * Environment-agnostic ObjectId helper
 */
const getObjectId = async (id) => {
  try {
    const { ObjectId } = await import("mongodb");
    return new ObjectId(id);
  } catch {
    // Fallback for environments without the mongodb driver (e.g. Workers using Atlas Data API)
    return { $oid: id };
  }
};

const isObjectIdValid = (id) => {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
};

const CATEGORY_SUBCATEGORY_OPTIONS = {
  Electronics: ["Mobiles", "Cameras", "Headphones", "Laptops", "Accessories", "Audio", "Gaming"],
  Furniture: ["Sofas", "Tables", "Chairs", "Living Room", "Bedroom", "Kitchen", "Dining", "Office"],
  Clothing: ["Shirts", "Jeans", "Jackets", "Men", "Women", "Kids", "Unisex"],
};

const CATEGORY_NAME_BY_KEY = Object.keys(CATEGORY_SUBCATEGORY_OPTIONS).reduce(
  (acc, category) => {
    acc[category.toLowerCase()] = category;
    return acc;
  },
  {},
);

const normalizeText = (value) => (value == null ? "" : String(value).trim());
const escapeRegex = (value) => normalizeText(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isSafeImageUrl = (value) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length > 2048) return false;
  try {
    const parsedUrl = new URL(normalized);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeCategoryName = (category) => {
  const normalizedCategory = normalizeText(category);
  if (!normalizedCategory) return "";
  return CATEGORY_NAME_BY_KEY[normalizedCategory.toLowerCase()] || normalizedCategory;
};

const getSubcategoryOptions = (category) =>
  CATEGORY_SUBCATEGORY_OPTIONS[normalizeCategoryName(category)] || [];

const normalizeSubcategoryName = (category, subcategory) => {
  const normalizedSubcategory = normalizeText(subcategory);
  if (!normalizedSubcategory) return "";
  const matchingSubcategory = getSubcategoryOptions(category).find(
    (option) => option.toLowerCase() === normalizedSubcategory.toLowerCase(),
  );
  return matchingSubcategory || normalizedSubcategory;
};

const parseNumberQueryParam = (value) => {
  const parsedNumber = Number(value);
  if (!Number.isFinite(parsedNumber)) return null;
  return parsedNumber;
};

const parseBooleanQueryParam = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (normalizedValue === "true" || normalizedValue === "1") return true;
  if (normalizedValue === "false" || normalizedValue === "0") return false;
  return null;
};

const parseIntegerQueryParam = (value) => {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) return null;
  return parsedValue;
};

const SORT_OPTIONS = {
  newest: { created_at: -1, _id: -1 },
  oldest: { created_at: 1, _id: 1 },
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};

export default async function registerProductRoutes(fastify, deps) {
  const { uuidv4, requireAdmin, createRateLimitGuard } = deps;
  const adminMutationRateLimit = createRateLimitGuard({
    keyPrefix: "products:admin-mutation",
    windowMs: 60_000,
    maxRequests: 40,
  });

  const serializeProduct = (product) => {
    if (!product) return null;
    const { _id, ...rest } = product;
    return {
      ...rest,
      product_id: rest.product_id || String(_id),
    };
  };

  const buildProductFilter = async (id) => {
    const normalizedId = (id || "").toString().trim();
    if (!normalizedId) return null;

    if (isObjectIdValid(normalizedId)) {
      return {
        $or: [{ product_id: normalizedId }, { _id: await getObjectId(normalizedId) }],
      };
    }
    return { product_id: normalizedId };
  };

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  const buildCreateProductPayload = (productInput) => {
    const payload = {
      name: normalizeText(productInput?.name),
      company: normalizeText(productInput?.company),
      description: normalizeText(productInput?.description),
      category: normalizeCategoryName(productInput?.category),
      subcategory: normalizeSubcategoryName(productInput?.category, productInput?.subcategory),
      image_url: normalizeText(productInput?.image_url),
      price: Number(productInput?.price),
      stock: Number(productInput?.stock),
    };

    if (!payload.name) return { error: "Product name is required" };
    if (payload.name.length > 120) return { error: "Product name is too long" };
    if (payload.company.length > 80) return { error: "Company name is too long" };
    if (payload.description.length > 5000) return { error: "Description is too long" };
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      return { error: "Price must be a valid number" };
    }
    if (!payload.category) return { error: "Category is required" };
    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      return { error: "Stock must be a non-negative integer" };
    }
    if (!payload.image_url) return { error: "Image URL is required" };
    if (!isSafeImageUrl(payload.image_url)) return { error: "Image URL must be a valid http/https URL" };

    const requiredSubcategories = getSubcategoryOptions(payload.category);
    if (requiredSubcategories.length > 0 && !payload.subcategory) {
      return { error: "Subcategory is required for the selected category" };
    }

    return { payload };
  };

  const buildUpdateProductPayload = (updatesInput, existingProduct) => {
    if (!updatesInput || typeof updatesInput !== "object") {
      return { error: "Invalid update payload" };
    }

    const existingCategory = normalizeCategoryName(existingProduct?.category);
    const nextCategory = hasOwn(updatesInput, "category")
      ? normalizeCategoryName(updatesInput.category)
      : existingCategory;
    const nextSubcategory = hasOwn(updatesInput, "subcategory")
      ? normalizeSubcategoryName(nextCategory, updatesInput.subcategory)
      : normalizeSubcategoryName(nextCategory, existingProduct?.subcategory);

    const updates = {};
    if (hasOwn(updatesInput, "name")) {
      const normalizedName = normalizeText(updatesInput.name);
      if (!normalizedName) return { error: "Product name is required" };
      if (normalizedName.length > 120) return { error: "Product name is too long" };
      updates.name = normalizedName;
    }
    if (hasOwn(updatesInput, "company")) {
      const normalizedCompany = normalizeText(updatesInput.company);
      if (normalizedCompany.length > 80) return { error: "Company name is too long" };
      updates.company = normalizedCompany;
    }
    if (hasOwn(updatesInput, "description")) {
      const normalizedDescription = normalizeText(updatesInput.description);
      if (normalizedDescription.length > 5000) return { error: "Description is too long" };
      updates.description = normalizedDescription;
    }
    if (hasOwn(updatesInput, "category")) {
      if (!nextCategory) return { error: "Category is required" };
      updates.category = nextCategory;
    }
    if (hasOwn(updatesInput, "subcategory")) {
      updates.subcategory = nextSubcategory;
    }
    if (hasOwn(updatesInput, "image_url")) {
      const normalizedImageUrl = normalizeText(updatesInput.image_url);
      if (!normalizedImageUrl) return { error: "Image URL is required" };
      if (!isSafeImageUrl(normalizedImageUrl)) return { error: "Image URL must be a valid http/https URL" };
      updates.image_url = normalizedImageUrl;
    }
    if (hasOwn(updatesInput, "price")) {
      const normalizedPrice = Number(updatesInput.price);
      if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
        return { error: "Price must be a valid number" };
      }
      updates.price = normalizedPrice;
    }
    if (hasOwn(updatesInput, "stock")) {
      const normalizedStock = Number(updatesInput.stock);
      if (!Number.isInteger(normalizedStock) || normalizedStock < 0) {
        return { error: "Stock must be a non-negative integer" };
      }
      updates.stock = normalizedStock;
    }

    const requiredSubcategories = getSubcategoryOptions(nextCategory);
    if (requiredSubcategories.length > 0 && !nextSubcategory) {
      return { error: "Subcategory is required for the selected category" };
    }

    if (Object.keys(updates).length === 0) {
      return { error: "No valid fields provided for update" };
    }

    updates.updated_at = new Date();
    return { updates };
  };

  fastify.get("/api/products", async (request, reply) => {
    const { category, subcategory, company, sort, search } = request.query;
    const normalizedCategory = normalizeCategoryName(category);
    const normalizedSubcategory = normalizeSubcategoryName(normalizedCategory || category, subcategory);
    const normalizedCompany = normalizeText(company);
    const normalizedSearch = normalizeText(search).slice(0, 80);
    const filters = [];

    if (normalizedCategory) {
      filters.push({ category: normalizedCategory });
    }
    if (normalizedSubcategory) {
      filters.push({ subcategory: normalizedSubcategory });
    }
    if (normalizedCompany) {
      const escapedCompany = escapeRegex(normalizedCompany);
      filters.push({
        $or: [
          { company: { $regex: `^${escapedCompany}$`, $options: "i" } },
          { name: { $regex: `^${escapedCompany}(\\s|\\b)`, $options: "i" } },
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

    const minPriceInput = request.query?.min_price ?? request.query?.minPrice;
    const maxPriceInput = request.query?.max_price ?? request.query?.maxPrice;
    const minPrice = parseNumberQueryParam(minPriceInput);
    const maxPrice = parseNumberQueryParam(maxPriceInput);
    if (minPrice != null || maxPrice != null) {
      const priceQuery = {};
      if (minPrice != null) priceQuery.$gte = Math.max(0, minPrice);
      if (maxPrice != null) priceQuery.$lte = Math.max(0, maxPrice);
      filters.push({ price: priceQuery });
    }

    const inStockInput = request.query?.in_stock ?? request.query?.inStock;
    const inStock = parseBooleanQueryParam(inStockInput);
    if (inStock === true) {
      filters.push({ stock: { $gt: 0 } });
    }

    const query =
      filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { $and: filters };
    const normalizedSort = normalizeText(sort).toLowerCase();
    const sortClause = SORT_OPTIONS[normalizedSort] || SORT_OPTIONS.newest;

    const includeMetaInput = request.query?.include_meta ?? request.query?.includeMeta;
    const includeMeta = parseBooleanQueryParam(includeMetaInput) === true;
    const pageInput = parseIntegerQueryParam(request.query?.page);
    const pageSizeInput = parseIntegerQueryParam(
      request.query?.page_size ?? request.query?.pageSize,
    );
    const limitInput = parseIntegerQueryParam(request.query?.limit);
    const usePagination = includeMeta || pageInput != null || pageSizeInput != null;

    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

    if (!usePagination) {
      const limit = Number.isFinite(limitInput)
        ? Math.min(Math.max(limitInput, 1), 250)
        : 150;

      const products = await fastify.mongo.db
        .collection("products")
        .find(query)
        .sort(sortClause)
        .limit(limit)
        .toArray();
      return products.map(serializeProduct);
    }

    const page = Math.max(1, pageInput || 1);
    const pageSizeBase = pageSizeInput ?? limitInput ?? 24;
    const pageSize = Math.min(Math.max(pageSizeBase, 1), 250);
    const skip = (page - 1) * pageSize;

    const productCollection = fastify.mongo.db.collection("products");
    const [products, total] = await Promise.all([
      productCollection
        .find(query)
        .sort(sortClause)
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      productCollection.countDocuments(query),
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

  fastify.get("/api/products/:id", async (request, reply) => {
    const filter = await buildProductFilter(request.params.id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const product = await fastify.mongo.db
      .collection("products")
      .findOne(filter);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return serializeProduct(product);
  });

  fastify.post("/api/products", { preHandler: [adminMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const { payload, error: validationError } = buildCreateProductPayload(request.body);
    if (validationError) {
      return reply.code(400).send({ message: validationError });
    }

    const product = {
      ...payload,
      product_id: normalizeText(request.body?.product_id) || `prod_${uuidv4().substring(0, 12)}`,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (!product.product_id) {
      product.product_id = `prod_${uuidv4().substring(0, 12)}`;
    }
    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(product.product_id)) {
      return reply.code(400).send({ message: "product_id format is invalid" });
    }

    const existingWithProductId = await fastify.mongo.db
      .collection("products")
      .findOne({ product_id: product.product_id }, { projection: { _id: 1 } });
    if (existingWithProductId) {
      return reply.code(409).send({ message: "product_id already exists" });
    }

    await fastify.mongo.db.collection("products").insertOne(product);
    return product;
  });

  fastify.put("/api/products/:id", { preHandler: [adminMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const { id } = request.params;
    const filter = await buildProductFilter(id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const existingProduct = await fastify.mongo.db
      .collection("products")
      .findOne(filter);
    if (!existingProduct) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const { updates, error: validationError } = buildUpdateProductPayload(request.body, existingProduct);
    if (validationError) {
      return reply.code(400).send({ message: validationError });
    }

    const result = await fastify.mongo.db
      .collection("products")
      .updateOne(filter, { $set: updates });

    if (result.matchedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const updatedProduct = await fastify.mongo.db
      .collection("products")
      .findOne(filter);

    return serializeProduct(updatedProduct);
  });

  fastify.delete("/api/products/:id", { preHandler: [adminMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const filter = await buildProductFilter(request.params.id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const result = await fastify.mongo.db
      .collection("products")
      .deleteOne(filter);

    if (result.deletedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }
    return { message: "Product deleted successfully" };
  });
}
