function normalizeProductId(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 80) {
    return "";
  }
  return normalized;
}

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
    return null;
  }
  return quantity;
}

function sanitizeCartItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      product_id: normalizeProductId(item?.product_id),
      quantity: Number(item?.quantity),
    }))
    .filter((item) => item.product_id && Number.isInteger(item.quantity) && item.quantity > 0);
}

function buildCartResponse(cart, userId, fallbackCartId) {
  const safeItems = sanitizeCartItems(cart?.items);
  return {
    cart_id: cart?.cart_id || fallbackCartId,
    user_id: userId,
    items: safeItems,
    updated_at: cart?.updated_at || null,
  };
}

async function ensureUserCart(db, userId, uuidv4) {
  const existingCart = await db.collection("carts").findOne({ user_id: userId });
  if (existingCart) {
    return existingCart;
  }

  const now = new Date();
  const newCart = {
    cart_id: `cart_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    user_id: userId,
    items: [],
    created_at: now,
    updated_at: now,
  };

  await db.collection("carts").insertOne(newCart);
  return newCart;
}

export default async function registerCartRoutes(fastify, deps) {
  const { uuidv4, requireAuth, createRateLimitGuard } = deps;

  const cartMutationRateLimit = createRateLimitGuard({
    keyPrefix: "cart:mutation",
    windowMs: 60_000,
    maxRequests: 60,
  });

  fastify.get("/cart", async (request, reply) => {
    if (!(await requireAuth(request, reply))) {
      return;
    }

    const db = fastify.mongo.db;
    const cart = await db
      .collection("carts")
      .findOne({ user_id: request.user.user_id }, { projection: { _id: 0 } });

    const fallbackCartId = `cart_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    return buildCartResponse(cart, request.user.user_id, fallbackCartId);
  });

  fastify.post("/cart/add", { preHandler: [cartMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const productId = normalizeProductId(body.product_id);
    const quantity = parseQuantity(body.quantity);

    if (!productId || quantity == null) {
      return reply.code(400).send({ message: "Valid product_id and quantity are required" });
    }

    const db = fastify.mongo.db;
    const product = await db
      .collection("products")
      .findOne({ product_id: productId }, { projection: { _id: 0, product_id: 1, stock: 1, name: 1 } });

    if (!product) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const availableStock = Number(product.stock || 0);
    if (availableStock <= 0) {
      return reply.code(400).send({ message: "Product is out of stock" });
    }

    const cart = await ensureUserCart(db, request.user.user_id, uuidv4);
    const items = sanitizeCartItems(cart.items);

    const existingItemIndex = items.findIndex((item) => item.product_id === productId);
    const existingQuantity = existingItemIndex >= 0 ? items[existingItemIndex].quantity : 0;
    const nextQuantity = existingQuantity + quantity;

    if (nextQuantity > availableStock) {
      return reply.code(400).send({ message: "Insufficient stock" });
    }

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity = nextQuantity;
    } else {
      items.push({ product_id: productId, quantity });
    }

    const updatedAt = new Date();
    await db
      .collection("carts")
      .updateOne(
        { user_id: request.user.user_id },
        { $set: { items, updated_at: updatedAt }, $setOnInsert: { created_at: updatedAt } },
        { upsert: true },
      );

    const updatedCart = await db
      .collection("carts")
      .findOne({ user_id: request.user.user_id }, { projection: { _id: 0 } });

    return {
      message: "Item added to cart",
      cart: buildCartResponse(updatedCart, request.user.user_id, cart.cart_id),
    };
  });

  fastify.post("/cart/remove", { preHandler: [cartMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const productId = normalizeProductId(body.product_id);
    if (!productId) {
      return reply.code(400).send({ message: "Valid product_id is required" });
    }

    const db = fastify.mongo.db;
    const cart = await db.collection("carts").findOne({ user_id: request.user.user_id });
    if (!cart) {
      return { message: "Item removed" };
    }

    const items = sanitizeCartItems(cart.items).filter((item) => item.product_id !== productId);

    await db
      .collection("carts")
      .updateOne(
        { user_id: request.user.user_id },
        { $set: { items, updated_at: new Date() } },
      );

    return { message: "Item removed" };
  });

  fastify.post("/cart/update", { preHandler: [cartMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const productId = normalizeProductId(body.product_id);
    const quantity = parseQuantity(body.quantity);

    if (!productId || quantity == null) {
      return reply.code(400).send({ message: "Valid product_id and quantity are required" });
    }

    const db = fastify.mongo.db;
    const product = await db
      .collection("products")
      .findOne({ product_id: productId }, { projection: { _id: 0, stock: 1 } });

    if (!product) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const availableStock = Number(product.stock || 0);
    if (quantity > availableStock) {
      return reply.code(400).send({ message: "Insufficient stock" });
    }

    const cart = await db.collection("carts").findOne({ user_id: request.user.user_id });
    if (!cart) {
      return reply.code(404).send({ message: "Cart not found" });
    }

    const items = sanitizeCartItems(cart.items);
    const existingItemIndex = items.findIndex((item) => item.product_id === productId);

    if (existingItemIndex < 0) {
      return reply.code(404).send({ message: "Item not found in cart" });
    }

    items[existingItemIndex].quantity = quantity;

    const updatedAt = new Date();
    await db
      .collection("carts")
      .updateOne(
        { user_id: request.user.user_id },
        { $set: { items, updated_at: updatedAt } },
      );

    return {
      message: "Cart item quantity updated",
      product_id: productId,
      quantity,
    };
  });
}
