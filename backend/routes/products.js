import { ObjectId } from "mongodb";

const CATEGORY_SUBCATEGORY_OPTIONS = {
  Electronics: ["Mobiles", "Laptops", "Accessories", "Audio", "Gaming"],
  Furniture: ["Living Room", "Bedroom", "Kitchen", "Dining", "Office"],
  Clothing: ["Men", "Women", "Kids", "Unisex"],
};

const CATEGORY_NAME_BY_KEY = Object.keys(CATEGORY_SUBCATEGORY_OPTIONS).reduce(
  (acc, category) => {
    acc[category.toLowerCase()] = category;
    return acc;
  },
  {},
);

const normalizeText = (value) => (value == null ? "" : String(value).trim());

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

export default async function registerProductRoutes(fastify, deps) {
  const { uuidv4, requireAdmin } = deps;

  const serializeProduct = (product) => {
    if (!product) return null;
    const { _id, ...rest } = product;
    return {
      ...rest,
      product_id: rest.product_id || String(_id),
    };
  };

  const buildProductFilter = (id) => {
    const normalizedId = (id || "").toString().trim();
    if (!normalizedId) return null;

    if (ObjectId.isValid(normalizedId)) {
      return {
        $or: [{ product_id: normalizedId }, { _id: new ObjectId(normalizedId) }],
      };
    }
    return { product_id: normalizedId };
  };

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  const buildCreateProductPayload = (productInput) => {
    const payload = {
      name: normalizeText(productInput?.name),
      description: normalizeText(productInput?.description),
      category: normalizeCategoryName(productInput?.category),
      subcategory: normalizeSubcategoryName(productInput?.category, productInput?.subcategory),
      image_url: normalizeText(productInput?.image_url),
      price: Number(productInput?.price),
      stock: Number(productInput?.stock),
    };

    if (!payload.name) return { error: "Product name is required" };
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      return { error: "Price must be a valid number" };
    }
    if (!payload.category) return { error: "Category is required" };
    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      return { error: "Stock must be a non-negative integer" };
    }
    if (!payload.image_url) return { error: "Image URL is required" };

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
      updates.name = normalizedName;
    }
    if (hasOwn(updatesInput, "description")) {
      updates.description = normalizeText(updatesInput.description);
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
    const { category } = request.query;
    const normalizedCategory = normalizeCategoryName(category);
    const query = normalizedCategory ? { category: normalizedCategory } : {};
    const products = await fastify.mongo.db
      .collection("products")
      .find(query)
      .toArray();
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return products.map(serializeProduct);
  });

  fastify.get("/api/products/:id", async (request, reply) => {
    const filter = buildProductFilter(request.params.id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const product = await fastify.mongo.db
      .collection("products")
      .findOne(filter);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return serializeProduct(product);
  });

  fastify.post("/api/products", async (request, reply) => {
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

    const existingWithProductId = await fastify.mongo.db
      .collection("products")
      .findOne({ product_id: product.product_id }, { projection: { _id: 1 } });
    if (existingWithProductId) {
      return reply.code(409).send({ message: "product_id already exists" });
    }

    await fastify.mongo.db.collection("products").insertOne(product);
    return product;
  });

  fastify.put("/api/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const { id } = request.params;
    const filter = buildProductFilter(id);
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

  fastify.delete("/api/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const filter = buildProductFilter(request.params.id);
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
