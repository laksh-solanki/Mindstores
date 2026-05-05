const PROMO_CODES = {
  SAVE10: { code: "SAVE10", type: "percent", value: 10, minSubtotal: 60 },
  FLAT20: { code: "FLAT20", type: "flat", value: 20, minSubtotal: 120 },
  SAVE20: { code: "SAVE20", type: "percent", value: 20, minSubtotal: 180 },
};

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

function parseSelectedProductIds(rawIds) {
  if (rawIds === undefined) {
    return null;
  }
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 50) {
    return { error: "selected_product_ids must be a non-empty string array" };
  }

  const normalizedIds = [];
  const seen = new Set();

  for (const rawId of rawIds) {
    const normalizedId = normalizeProductId(rawId);
    if (!normalizedId) {
      return { error: "selected_product_ids must be a non-empty string array" };
    }
    if (!seen.has(normalizedId)) {
      seen.add(normalizedId);
      normalizedIds.push(normalizedId);
    }
  }

  return { ids: normalizedIds };
}

function normalizePromoCode(value) {
  const promoCode = String(value || "").trim().toUpperCase();
  if (!promoCode) {
    return "";
  }
  if (!/^[A-Z0-9_-]{3,20}$/.test(promoCode)) {
    return null;
  }
  return promoCode;
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
    .filter((item) => item.product_id && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99);
}

function calculatePromoDiscount(subtotal, promo) {
  if (!promo) {
    return 0;
  }

  if (promo.type === "percent") {
    return Number(((subtotal * promo.value) / 100).toFixed(2));
  }

  return Math.min(subtotal, promo.value);
}

export default async function registerCheckoutRoutes(fastify, deps) {
  const { uuidv4, requireAuth, createRateLimitGuard } = deps;

  const placeOrderRateLimit = createRateLimitGuard({
    keyPrefix: "checkout:place-order",
    windowMs: 60_000,
    maxRequests: 12,
  });

  fastify.post(
    "/checkout/place-order",
    { preHandler: [placeOrderRateLimit] },
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) {
        return;
      }

      const db = fastify.mongo.db;
      const body = request.body && typeof request.body === "object" ? request.body : {};

      const cart = await db.collection("carts").findOne({ user_id: request.user.user_id });
      const safeCartItems = sanitizeCartItems(cart?.items);

      if (safeCartItems.length === 0) {
        return reply.code(400).send({ message: "Cart is empty" });
      }

      const selectedIdsResult = parseSelectedProductIds(body.selected_product_ids);
      if (selectedIdsResult?.error) {
        return reply.code(400).send({ message: selectedIdsResult.error });
      }

      let itemsToCheckout = safeCartItems;
      if (selectedIdsResult?.ids) {
        const selectedIdSet = new Set(selectedIdsResult.ids);
        itemsToCheckout = safeCartItems.filter((item) => selectedIdSet.has(item.product_id));
        if (itemsToCheckout.length === 0) {
          return reply.code(400).send({ message: "No selected items found in cart" });
        }
      }

      const promoCode = normalizePromoCode(body.promo_code);
      if (promoCode === null) {
        return reply.code(400).send({ message: "Invalid promo code format" });
      }

      const productIds = [...new Set(itemsToCheckout.map((item) => item.product_id))];
      const products = await db
        .collection("products")
        .find({ product_id: { $in: productIds } }, { projection: { _id: 0 } })
        .toArray();

      const productById = new Map(products.map((product) => [product.product_id, product]));
      const orderItems = [];
      let subtotalAmount = 0;

      for (const cartItem of itemsToCheckout) {
        const product = productById.get(cartItem.product_id);
        if (!product) {
          return reply.code(400).send({ message: `Product not found: ${cartItem.product_id}` });
        }

        const stock = Number(product.stock || 0);
        if (stock < cartItem.quantity) {
          return reply.code(400).send({ message: `Insufficient stock for ${product.name || cartItem.product_id}` });
        }

        const price = Number(product.price || 0);
        const itemTotal = price * cartItem.quantity;
        subtotalAmount += itemTotal;

        orderItems.push({
          product_id: cartItem.product_id,
          name: product.name || "Product",
          price,
          quantity: cartItem.quantity,
        });
      }

      let appliedPromoCode = null;
      let discountAmount = 0;

      if (promoCode) {
        const promo = PROMO_CODES[promoCode];
        if (!promo) {
          return reply.code(400).send({ message: "Invalid promo code" });
        }
        if (subtotalAmount < promo.minSubtotal) {
          return reply.code(400).send({
            message: `Promo ${promo.code} requires minimum subtotal of $${promo.minSubtotal}`,
          });
        }

        discountAmount = calculatePromoDiscount(subtotalAmount, promo);
        appliedPromoCode = promo.code;
      }

      const totalAmount = Math.max(0, Number((subtotalAmount - discountAmount).toFixed(2)));
      const orderId = `order_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
      const now = new Date();

      const decrementedItems = [];

      try {
        for (const item of itemsToCheckout) {
          const stockUpdate = await db.collection("products").updateOne(
            { product_id: item.product_id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity }, $set: { updated_at: now } },
          );

          if (stockUpdate.modifiedCount === 0) {
            throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`);
          }

          decrementedItems.push(item);
        }

        await db.collection("orders").insertOne({
          order_id: orderId,
          user_id: request.user.user_id,
          items: orderItems,
          subtotal_amount: Number(subtotalAmount.toFixed(2)),
          discount_amount: Number(discountAmount.toFixed(2)),
          promo_code: appliedPromoCode,
          total_amount: totalAmount,
          status: "completed",
          created_at: now,
          updated_at: now,
        });

        const purchasedSet = new Set(itemsToCheckout.map((item) => item.product_id));
        const remainingItems = safeCartItems.filter((item) => !purchasedSet.has(item.product_id));

        await db
          .collection("carts")
          .updateOne(
            { user_id: request.user.user_id },
            { $set: { items: remainingItems, updated_at: now } },
          );
      } catch (error) {
        if (decrementedItems.length > 0) {
          try {
            await Promise.all(
              decrementedItems.map((item) =>
                db.collection("products").updateOne(
                  { product_id: item.product_id },
                  { $inc: { stock: item.quantity }, $set: { updated_at: new Date() } },
                ),
              ),
            );
          } catch (rollbackError) {
            fastify.log.error({ err: rollbackError, route: "/checkout/place-order", msg: "stock rollback failed" });
          }
        }

        if (String(error?.message || "").startsWith("INSUFFICIENT_STOCK:")) {
          return reply
            .code(409)
            .send({ message: "Stock changed while checking out. Please retry." });
        }

        throw error;
      }

      return {
        success: true,
        order_id: orderId,
        promo_code: appliedPromoCode,
        subtotal_amount: Number(subtotalAmount.toFixed(2)),
        discount_amount: Number(discountAmount.toFixed(2)),
        total_amount: totalAmount,
        message: "Order placed successfully",
      };
    },
  );
}
