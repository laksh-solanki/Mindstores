const PROMO_CODES = {
  SAVE10: { code: "SAVE10", type: "percent", value: 10, minSubtotal: 60  },
  FLAT20: { code: "FLAT20", type: "flat",    value: 20, minSubtotal: 120 },
  SAVE20: { code: "SAVE20", type: "percent", value: 20, minSubtotal: 180 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeProductId(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s && s.length <= 80 ? s : "";
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({ product_id: normalizeProductId(item?.product_id), quantity: Number(item?.quantity) }))
    .filter((item) => item.product_id && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99);
}

function normalizePromoCode(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";
  return /^[A-Z0-9_-]{3,20}$/.test(s) ? s : null;
}

function calcDiscount(subtotal, promo) {
  if (!promo) return 0;
  if (promo.type === "percent") return Number(((subtotal * promo.value) / 100).toFixed(2));
  return Math.min(subtotal, promo.value);
}

// ─── Route handler ─────────────────────────────────────────────────────────

// POST /checkout/place-order
export async function handlePlaceOrder(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");

  const { db, body } = ctx;
  const b = body && typeof body === "object" ? body : {};

  // Load cart
  const cart = await db.collection("carts").findOne({ user_id: ctx.user.user_id });
  const safeCartItems = sanitizeItems(cart?.items);
  if (safeCartItems.length === 0) return ctx.error(400, "Cart is empty");

  // Parse selected product IDs
  let itemsToCheckout = safeCartItems;
  const rawSelectedIds = b.selected_product_ids;
  if (rawSelectedIds !== undefined) {
    if (!Array.isArray(rawSelectedIds) || rawSelectedIds.length === 0 || rawSelectedIds.length > 50) {
      return ctx.error(400, "selected_product_ids must be a non-empty string array");
    }
    const selectedSet = new Set();
    for (const id of rawSelectedIds) {
      const n = normalizeProductId(id);
      if (!n) return ctx.error(400, "selected_product_ids must be a non-empty string array");
      selectedSet.add(n);
    }
    itemsToCheckout = safeCartItems.filter((item) => selectedSet.has(item.product_id));
    if (itemsToCheckout.length === 0) return ctx.error(400, "No selected items found in cart");
  }

  // Parse promo code
  const promoCode = normalizePromoCode(b.promo_code);
  if (promoCode === null) return ctx.error(400, "Invalid promo code format");

  // Fetch products
  const productIds = [...new Set(itemsToCheckout.map((item) => item.product_id))];
  const products = await db.collection("products")
    .find({ product_id: { $in: productIds } }, { projection: { _id: 0 } })
    .toArray();

  const productMap = new Map(products.map((p) => [p.product_id, p]));
  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of itemsToCheckout) {
    const product = productMap.get(cartItem.product_id);
    if (!product) return ctx.error(400, `Product not found: ${cartItem.product_id}`);

    const stock = Number(product.stock ?? 0);
    if (stock < cartItem.quantity) return ctx.error(400, `Insufficient stock for ${product.name ?? cartItem.product_id}`);

    const price = Number(product.price ?? 0);
    subtotal += price * cartItem.quantity;
    orderItems.push({ product_id: cartItem.product_id, name: product.name ?? "Product", price, quantity: cartItem.quantity });
  }

  // Validate promo
  let appliedPromo = null;
  let discount = 0;
  if (promoCode) {
    const promo = PROMO_CODES[promoCode];
    if (!promo) return ctx.error(400, "Invalid promo code");
    if (subtotal < promo.minSubtotal) {
      return ctx.error(400, `Promo ${promo.code} requires minimum subtotal of $${promo.minSubtotal}`);
    }
    discount = calcDiscount(subtotal, promo);
    appliedPromo = promo.code;
  }

  const total = Math.max(0, Number((subtotal - discount).toFixed(2)));
  const orderId = `order_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const now = new Date();

  // Atomic stock decrement with rollback
  const decremented = [];
  try {
    for (const item of itemsToCheckout) {
      const result = await db.collection("products").updateOne(
        { product_id: item.product_id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity }, $set: { updated_at: now } },
      );
      if (result.modifiedCount === 0) throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`);
      decremented.push(item);
    }

    await db.collection("orders").insertOne({
      order_id: orderId,
      user_id: ctx.user.user_id,
      items: orderItems,
      subtotal_amount: Number(subtotal.toFixed(2)),
      discount_amount: Number(discount.toFixed(2)),
      promo_code: appliedPromo,
      total_amount: total,
      status: "completed",
      created_at: now,
      updated_at: now,
    });

    const purchasedSet = new Set(itemsToCheckout.map((item) => item.product_id));
    const remaining = safeCartItems.filter((item) => !purchasedSet.has(item.product_id));
    await db.collection("carts").updateOne({ user_id: ctx.user.user_id }, { $set: { items: remaining, updated_at: now } });
  } catch (err) {
    // Rollback stock
    if (decremented.length > 0) {
      await Promise.all(
        decremented.map((item) =>
          db.collection("products").updateOne(
            { product_id: item.product_id },
            { $inc: { stock: item.quantity }, $set: { updated_at: new Date() } },
          ).catch((e) => console.error("[checkout] rollback failed", e)),
        ),
      );
    }

    if (String(err?.message ?? "").startsWith("INSUFFICIENT_STOCK:")) {
      return ctx.error(409, "Stock changed while checking out. Please retry.");
    }
    throw err;
  }

  return ctx.json({
    success: true,
    order_id: orderId,
    promo_code: appliedPromo,
    subtotal_amount: Number(subtotal.toFixed(2)),
    discount_amount: Number(discount.toFixed(2)),
    total_amount: total,
    message: "Order placed successfully",
  }, 200);
}
