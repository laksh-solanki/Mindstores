import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import mongodb from "@fastify/mongodb";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "url";

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const isHostedEnv = Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL);
const useSecureCookies =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production" || isHostedEnv;
const cookieSameSite =
  process.env.COOKIE_SAMESITE || (useSecureCookies ? "none" : "lax");

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(
    await readFile(new URL("./service-account.json", import.meta.url), "utf-8"),
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin Initialized");
} catch (error) {
  console.warn("Warning: service-account.json not found. Firebase auth will fail.");
}

const fastify = Fastify({ logger: true });

// Plugins
const configuredCorsOrigins =
  process.env.CORS_ORIGIN ||
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,https://mindstores.onrender.com";

const allowedOrigins = configuredCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

fastify.register(cors, {
  credentials: true,
  allowedHeaders: ["Content-Type", "X-Session-Token", "Authorization"],
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
});

fastify.register(cookie);

fastify.register(mongodb, {
  forceClose: true,
  url: process.env.MONGO_URL,
  database: process.env.DB_NAME,
});

// Middleware: Get Current User
const getSessionTokenFromRequest = (request) =>
  request.cookies.session_token || request.headers["x-session-token"] || null;

const getCurrentUser = async (request) => {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  const db = fastify.mongo.db;
  const session = await db
    .collection("user_sessions")
    .findOne({ session_token: token });

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return await db
    .collection("users")
    .findOne({ user_id: session.user_id }, { projection: { _id: 0 } });
};

const requireAuth = async (request, reply) => {
  if (!request.user) {
    await reply.code(401).send({ message: "Not authenticated" });
    return false;
  }
  return true;
};

const requireAdmin = async (request, reply) => {
  if (!(await requireAuth(request, reply))) return false;
  if (!request.user.is_admin) {
    await reply.code(403).send({ message: "Admin access required" });
    return false;
  }
  return true;
};

// Hook: Attach User to Request
fastify.decorateRequest("user", null);
fastify.addHook("onRequest", async (request) => {
  request.user = await getCurrentUser(request);
});

// --- API ROUTES ---

// 0. ROOT (Health Check)
fastify.get("/", async () => {
  return { status: "ok", message: "Mindstore API is running!" };
});

// 1. AUTHENTICATION (Firebase)
fastify.post("/api/auth/firebase-login", async (request, reply) => {
  const { idToken } = request.body;
  if (!idToken) return reply.code(400).send({ message: "ID Token required" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    const db = fastify.mongo.db;
    const userId = `user_${uid}`;

    // Upsert User
    const existingUser = await db.collection("users").findOne({ email });
    if (!existingUser) {
      await db.collection("users").insertOne({
        user_id: userId,
        email,
        name: name || "User",
        picture,
        is_admin: false,
        created_at: new Date(),
      });
    } else {
      await db
        .collection("users")
        .updateOne({ user_id: userId }, { $set: { name, picture } });
    }

    // Create Session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.collection("user_sessions").insertOne({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    reply.setCookie("session_token", sessionToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: cookieSameSite,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    const user = await db
      .collection("users")
      .findOne({ user_id: userId }, { projection: { _id: 0 } });
    return { user, session_token: sessionToken };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(401).send({ message: "Invalid Token" });
  }
});

fastify.get("/api/auth/me", async (request, reply) => {
  if (!(await requireAuth(request, reply))) return;
  return request.user;
});

fastify.post("/api/auth/logout", async (request, reply) => {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    await fastify.mongo.db
      .collection("user_sessions")
      .deleteOne({ session_token: token });
  }
  reply.clearCookie("session_token", {
    path: "/",
    secure: useSecureCookies,
    sameSite: cookieSameSite,
  });
  return { message: "Logged out successfully" };
});

// 2. PRODUCTS (Public + Admin)

// GET All Products (Public)
fastify.get("/api/products", async (request) => {
  const { category } = request.query;
  const query = category ? { category } : {};
  return await fastify.mongo.db
    .collection("products")
    .find(query, { projection: { _id: 0 } })
    .toArray();
});

// GET One Product (Public)
fastify.get("/api/products/:id", async (request, reply) => {
  const product = await fastify.mongo.db
    .collection("products")
    .findOne({ product_id: request.params.id }, { projection: { _id: 0 } });
  if (!product) return reply.code(404).send({ message: "Product not found" });
  return product;
});

// POST Create Product (Admin Only)
fastify.post("/api/products", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;

  const product = request.body;
  if (!product.name || product.price == null) {
    return reply.code(400).send({ message: "Name and Price are required" });
  }
  if (typeof product.price !== "number" || product.price < 0) {
    return reply.code(400).send({ message: "Invalid price" });
  }

  // Generate ID if missing
  if (!product.product_id) {
    product.product_id = `prod_${uuidv4().substring(0, 12)}`;
  }

  product.created_at = new Date();

  await fastify.mongo.db.collection("products").insertOne(product);
  return product;
});

// PUT Update Product (Admin Only)
fastify.put("/api/products/:id", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;

  const { id } = request.params;
  const updates = request.body;
  delete updates._id; // Protect immutable field

  const result = await fastify.mongo.db
    .collection("products")
    .findOneAndUpdate(
      { product_id: id },
      { $set: updates },
      { returnDocument: "after", projection: { _id: 0 } },
    );

  if (!result) return reply.code(404).send({ message: "Product not found" });
  return result;
});

// DELETE Product (Admin Only)
fastify.delete("/api/products/:id", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;

  const result = await fastify.mongo.db
    .collection("products")
    .deleteOne({ product_id: request.params.id });

  if (result.deletedCount === 0) {
    return reply.code(404).send({ message: "Product not found" });
  }
  return { message: "Product deleted successfully" };
});

// 3. CART
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

fastify.post("/api/cart/add", async (request, reply) => {
  if (!(await requireAuth(request, reply))) return;
  const { product_id, quantity } = request.body;
  const db = fastify.mongo.db;
  const parsedQuantity = Number(quantity);

  if (!product_id || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
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

fastify.post("/api/cart/remove", async (request, reply) => {
  if (!(await requireAuth(request, reply))) return;
  const { product_id } = request.body;

  await fastify.mongo.db.collection("carts").updateOne(
    { user_id: request.user.user_id },
    {
      $pull: { items: { product_id } },
      $set: { updated_at: new Date() },
    },
  );
  return { message: "Item removed" };
});

// 4. CHECKOUT (Simplified - No Payment)
fastify.post("/api/checkout/place-order", async (request, reply) => {
  if (!(await requireAuth(request, reply))) return;

  const db = fastify.mongo.db;
  const cart = await db
    .collection("carts")
    .findOne({ user_id: request.user.user_id });
  const { selected_product_ids } = request.body || {};

  if (!cart || !cart.items || cart.items.length === 0) {
    return reply.code(400).send({ message: "Cart is empty" });
  }

  let itemsToCheckout = cart.items;
  if (selected_product_ids !== undefined) {
    if (
      !Array.isArray(selected_product_ids) ||
      selected_product_ids.length === 0 ||
      selected_product_ids.some((id) => typeof id !== "string")
    ) {
      return reply.code(400).send({ message: "selected_product_ids must be a non-empty string array" });
    }

    const selectedIds = new Set(selected_product_ids);
    itemsToCheckout = cart.items.filter((item) => selectedIds.has(item.product_id));
    if (itemsToCheckout.length === 0) {
      return reply.code(400).send({ message: "No selected items found in cart" });
    }
  }

  let total_amount = 0;
  const order_items = [];

  // Validate stock and calculate totals
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

    total_amount += product.price * item.quantity;
    order_items.push({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
  }

  const order_id = `order_${uuidv4().substring(0, 12)}`;

  // Create Order Record
  await db.collection("orders").insertOne({
    order_id,
    user_id: request.user.user_id,
    items: order_items,
    total_amount,
    status: "completed",
    created_at: new Date(),
  });

  // Decrement product stock
  for (const item of itemsToCheckout) {
    await db.collection("products").updateOne(
      { product_id: item.product_id },
      { $inc: { stock: -item.quantity } },
    );
  }

  // Remove purchased items from cart (or clear all if all were purchased)
  const purchasedIds = new Set(itemsToCheckout.map((item) => item.product_id));
  const remainingItems = cart.items.filter((item) => !purchasedIds.has(item.product_id));
  await db
    .collection("carts")
    .updateOne(
      { user_id: request.user.user_id },
      { $set: { items: remainingItems, updated_at: new Date() } },
    );

  return { success: true, order_id, message: "Order placed successfully" };
});

// 5. ORDERS (View History)
fastify.get("/api/orders", async (request, reply) => {
  if (!(await requireAuth(request, reply))) return;

  return await fastify.mongo.db
    .collection("orders")
    .find({ user_id: request.user.user_id }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();
});

// Start Server
const start = async () => {
  try {
    const port = process.env.PORT || 8000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
