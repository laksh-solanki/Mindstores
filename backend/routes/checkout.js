export default async function registerCheckoutRoutes(fastify, deps) {
  const { uuidv4, requireAuth, createRateLimitGuard } = deps;
  const PROMO_CODES = {
    SAVE10: { code: "SAVE10", type: "percent", value: 10, minSubtotal: 60 },
    FLAT20: { code: "FLAT20", type: "flat", value: 20, minSubtotal: 120 },
    SAVE20: { code: "SAVE20", type: "percent", value: 20, minSubtotal: 180 },
  };
  const placeOrderRateLimit = createRateLimitGuard({
    keyPrefix: "checkout:place-order",
    windowMs: 60_000,
    maxRequests: 12,
  });

  fastify.post("/api/checkout/place-order", { preHandler: [placeOrderRateLimit] }, async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    const db = fastify.mongo.db;
    const cart = await db
      .collection("carts")
      .findOne({ user_id: request.user.user_id });
    const { selected_product_ids, promo_code } = request.body || {};
    const normalizedPromoCode = String(promo_code || "").trim().toUpperCase();

    if (!cart || !cart.items || cart.items.length === 0) {
      return reply.code(400).send({ message: "Cart is empty" });
    }

    let itemsToCheckout = cart.items;
    if (selected_product_ids !== undefined) {
      if (
        !Array.isArray(selected_product_ids) ||
        selected_product_ids.length === 0 ||
        selected_product_ids.length > 50 ||
        selected_product_ids.some((id) => typeof id !== "string" || !id.trim() || id.trim().length > 80)
      ) {
        return reply.code(400).send({ message: "selected_product_ids must be a non-empty string array" });
      }

      const selectedIds = new Set(selected_product_ids.map((id) => id.trim()));
      itemsToCheckout = cart.items.filter((item) => selectedIds.has(item.product_id));
      if (itemsToCheckout.length === 0) {
        return reply.code(400).send({ message: "No selected items found in cart" });
      }
    }

    let subtotal_amount = 0;
    const order_items = [];

    for (const item of itemsToCheckout) {
      const product = await db
        .collection("products")
        .findOne({ product_id: item.product_id });

      if (!product) {
        return reply.code(400).send({ message: `Product not found: ${item.product_id}` });
      }

      if ((product.stock ?? 0) < item.quantity) {
        return reply.code(400).send({ message: `Insufficient stock for ${product.name}` });
      }

      subtotal_amount += product.price * item.quantity;
      order_items.push({
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    let appliedPromo = null;
    let discount_amount = 0;

    if (normalizedPromoCode) {
      if (!/^[A-Z0-9_-]{3,20}$/.test(normalizedPromoCode)) {
        return reply.code(400).send({ message: "Invalid promo code format" });
      }

      const promo = PROMO_CODES[normalizedPromoCode];
      if (!promo) {
        return reply.code(400).send({ message: "Invalid promo code" });
      }
      if (subtotal_amount < promo.minSubtotal) {
        return reply.code(400).send({
          message: `Promo ${promo.code} requires minimum subtotal of $${promo.minSubtotal}`,
        });
      }

      if (promo.type === "percent") {
        discount_amount = Number(((subtotal_amount * promo.value) / 100).toFixed(2));
      } else {
        discount_amount = Math.min(subtotal_amount, promo.value);
      }

      appliedPromo = promo.code;
    }

    const total_amount = Math.max(0, subtotal_amount - discount_amount);

    const order_id = `order_${uuidv4().substring(0, 12)}`;
    const decrementedItems = [];

    try {
      for (const item of itemsToCheckout) {
        const stockUpdateResult = await db.collection("products").updateOne(
          { product_id: item.product_id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
        );

        if (stockUpdateResult.modifiedCount === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`);
        }
        decrementedItems.push(item);
      }

      await db.collection("orders").insertOne({
        order_id,
        user_id: request.user.user_id,
        items: order_items,
        subtotal_amount,
        discount_amount,
        promo_code: appliedPromo,
        total_amount,
        status: "completed",
        created_at: new Date(),
      });

      const purchasedIds = new Set(itemsToCheckout.map((item) => item.product_id));
      const remainingItems = cart.items.filter((item) => !purchasedIds.has(item.product_id));
      await db
        .collection("carts")
        .updateOne(
          { user_id: request.user.user_id },
          { $set: { items: remainingItems, updated_at: new Date() } },
        );
    } catch (error) {
      if (decrementedItems.length > 0) {
        try {
          await Promise.all(
            decrementedItems.map((item) =>
              db.collection("products").updateOne(
                { product_id: item.product_id },
                { $inc: { stock: item.quantity } },
              ),
            ),
          );
        } catch (compensationError) {
          fastify.log?.error?.({ err: compensationError, msg: "Failed to compensate stock" });
        }
      }

      if (String(error?.message || "").startsWith("INSUFFICIENT_STOCK:")) {
        return reply.code(409).send({ message: "Stock changed while checking out. Please retry." });
      }

      throw error;
    }

    return {
      success: true,
      order_id,
      promo_code: appliedPromo,
      subtotal_amount,
      discount_amount,
      total_amount,
      message: "Order placed successfully",
    };
  });
}
