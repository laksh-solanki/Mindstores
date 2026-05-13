// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeProductId(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s && s.length <= 80 ? s : "";
}

function parseQuantity(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({ product_id: normalizeProductId(item?.product_id), quantity: Number(item?.quantity) }))
    .filter((item) => item.product_id && Number.isInteger(item.quantity) && item.quantity > 0);
}

function cartResponse(cart, userId, fallbackCartId) {
  return {
    cart_id: cart?.cart_id ?? fallbackCartId,
    user_id: userId,
    items: sanitizeItems(cart?.items),
    updated_at: cart?.updated_at ?? null,
  };
}

async function ensureCart(db, userId) {
  const existing = await db.collection("carts").findOne({ user_id: userId });
  if (existing) return existing;
  const now = new Date();
  const cart = {
    cart_id: `cart_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    user_id: userId,
    items: [],
    created_at: now,
    updated_at: now,
  };
  await db.collection("carts").insertOne(cart);
  return cart;
}

// ─── Route handlers ────────────────────────────────────────────────────────

// GET /cart
export async function handleGetCart(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  const { db } = ctx;
  const cart = await db.collection("carts").findOne({ user_id: ctx.user.user_id }, { projection: { _id: 0 } });
  const fallback = `cart_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  return ctx.json(cartResponse(cart, ctx.user.user_id, fallback));
}

// POST /cart/add
export async function handleCartAdd(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  const { db, body } = ctx;
  const b = body && typeof body === "object" ? body : {};
  const productId = normalizeProductId(b.product_id);
  const quantity = parseQuantity(b.quantity);

  if (!productId || quantity == null) return ctx.error(400, "Valid product_id and quantity are required");

  const product = await db.collection("products").findOne({ product_id: productId }, { projection: { _id: 0, product_id: 1, stock: 1, name: 1 } });
  if (!product) return ctx.error(404, "Product not found");

  const stock = Number(product.stock ?? 0);
  if (stock <= 0) return ctx.error(400, "Product is out of stock");

  const cart = await ensureCart(db, ctx.user.user_id);
  const items = sanitizeItems(cart.items);
  const idx = items.findIndex((item) => item.product_id === productId);
  const existingQty = idx >= 0 ? items[idx].quantity : 0;
  const nextQty = existingQty + quantity;

  if (nextQty > stock) return ctx.error(400, "Insufficient stock");

  if (idx >= 0) items[idx].quantity = nextQty;
  else items.push({ product_id: productId, quantity });

  const now = new Date();
  await db.collection("carts").updateOne(
    { user_id: ctx.user.user_id },
    { $set: { items, updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true },
  );

  const updated = await db.collection("carts").findOne({ user_id: ctx.user.user_id }, { projection: { _id: 0 } });
  return ctx.json({ message: "Item added to cart", cart: cartResponse(updated, ctx.user.user_id, cart.cart_id) });
}

// POST /cart/remove
export async function handleCartRemove(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  const { db, body } = ctx;
  const b = body && typeof body === "object" ? body : {};
  const productId = normalizeProductId(b.product_id);
  if (!productId) return ctx.error(400, "Valid product_id is required");

  const cart = await db.collection("carts").findOne({ user_id: ctx.user.user_id });
  if (!cart) return ctx.json({ message: "Item removed" });

  const items = sanitizeItems(cart.items).filter((item) => item.product_id !== productId);
  await db.collection("carts").updateOne({ user_id: ctx.user.user_id }, { $set: { items, updated_at: new Date() } });
  return ctx.json({ message: "Item removed" });
}

// POST /cart/update
export async function handleCartUpdate(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  const { db, body } = ctx;
  const b = body && typeof body === "object" ? body : {};
  const productId = normalizeProductId(b.product_id);
  const quantity = parseQuantity(b.quantity);

  if (!productId || quantity == null) return ctx.error(400, "Valid product_id and quantity are required");

  const product = await db.collection("products").findOne({ product_id: productId }, { projection: { _id: 0, stock: 1 } });
  if (!product) return ctx.error(404, "Product not found");
  if (quantity > Number(product.stock ?? 0)) return ctx.error(400, "Insufficient stock");

  const cart = await db.collection("carts").findOne({ user_id: ctx.user.user_id });
  if (!cart) return ctx.error(404, "Cart not found");

  const items = sanitizeItems(cart.items);
  const idx = items.findIndex((item) => item.product_id === productId);
  if (idx < 0) return ctx.error(404, "Item not found in cart");

  items[idx].quantity = quantity;
  await db.collection("carts").updateOne({ user_id: ctx.user.user_id }, { $set: { items, updated_at: new Date() } });
  return ctx.json({ message: "Cart item quantity updated", product_id: productId, quantity });
}
