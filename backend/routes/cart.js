export default async function registerCartRoutes(fastify, deps) {
  const { uuidv4, requireAuth, createRateLimitGuard } = deps;
  const cartMutationRateLimit = createRateLimitGuard({
    keyPrefix: "cart:mutation",
    windowMs: 60_000,
    maxRequests: 60,
  });
  const normalizeProductId = (value) => (typeof value === "string" ? value.trim() : "");
  const parseQuantity = (value) => Number(value);

  fastify.get("/api/cart", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    const cart = await fastify.mongo.db
      .collection("carts")
      .findOne({ user_id: request.user.user_id }, { projection: { _id: 0 } });
    if (!cart) {
      return {
        cart_id: `cart_${uuidv4().substring(0, 12)}`,
        user_id: request.user.user_id,
        items: [],
      };
    }
    return cart;
  });

  fastify.post("/api/cart/add", { preHandler: [cartMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const product_id = normalizeProductId(request.body?.product_id);
    const { quantity } = request.body || {};
    const db = fastify.mongo.db;
    const parsedQuantity = parseQuantity(quantity);

    if (
      !product_id ||
      product_id.length > 80 ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > 99
    ) {
      return reply.code(400).send({ message: "Valid product_id and quantity are required" });
    }

    const product = await db.collection("products").findOne({ product_id });
    if (!product) {
      return reply.code(404).send({ message: "Product not found" });
    }

    let cart = await db
      .collection("carts")
      .findOne({ user_id: request.user.user_id });

    if (!cart) {
      cart = {
        cart_id: `cart_${uuidv4().substring(0, 12)}`,
        user_id: request.user.user_id,
        items: [],
        updated_at: new Date(),
      };
      await db.collection("carts").insertOne(cart);
    }

    const items = cart.items || [];
    const existingItemIndex = items.findIndex((i) => i.product_id === product_id);
    const existingQuantity = existingItemIndex > -1 ? items[existingItemIndex].quantity : 0;
    const requestedQuantity = existingQuantity + parsedQuantity;

    if (requestedQuantity > (product.stock ?? 0)) {
      return reply.code(400).send({ message: "Insufficient stock" });
    }

    if (existingItemIndex > -1) {
      items[existingItemIndex].quantity = requestedQuantity;
    } else {
      items.push({ product_id, quantity: parsedQuantity });
    }

    await db
      .collection("carts")
      .updateOne(
        { user_id: request.user.user_id },
        { $set: { items, updated_at: new Date() } },
      );

    return { message: "Item added to cart" };
  });

  fastify.post("/api/cart/remove", { preHandler: [cartMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const product_id = normalizeProductId(request.body?.product_id);
    if (!product_id || product_id.length > 80) {
      return reply.code(400).send({ message: "Valid product_id is required" });
    }

    await fastify.mongo.db.collection("carts").updateOne(
      { user_id: request.user.user_id },
      {
        $pull: { items: { product_id } },
        $set: { updated_at: new Date() },
      },
    );
    return { message: "Item removed" };
  });

  fastify.post("/api/cart/update", { preHandler: [cartMutationRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    const product_id = normalizeProductId(request.body?.product_id);
    const { quantity } = request.body || {};
    const db = fastify.mongo.db;
    const parsedQuantity = parseQuantity(quantity);

    if (
      !product_id ||
      product_id.length > 80 ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > 99
    ) {
      return reply.code(400).send({ message: "Valid product_id and quantity are required" });
    }

    const product = await db.collection("products").findOne({ product_id });
    if (!product) {
      return reply.code(404).send({ message: "Product not found" });
    }

    if (parsedQuantity > (product.stock ?? 0)) {
      return reply.code(400).send({ message: "Insufficient stock" });
    }

    const cart = await db
      .collection("carts")
      .findOne({ user_id: request.user.user_id });

    if (!cart) {
      return reply.code(404).send({ message: "Cart not found" });
    }

    const items = cart.items || [];
    const existingItemIndex = items.findIndex((item) => item.product_id === product_id);

    if (existingItemIndex === -1) {
      return reply.code(404).send({ message: "Item not found in cart" });
    }

    items[existingItemIndex].quantity = parsedQuantity;

    await db
      .collection("carts")
      .updateOne(
        { user_id: request.user.user_id },
        { $set: { items, updated_at: new Date() } },
      );

    return { message: "Cart item quantity updated", product_id, quantity: parsedQuantity };
  });
}
