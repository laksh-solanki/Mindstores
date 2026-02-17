// backend/server.js
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

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(
    await readFile(new URL("./service-account.json", import.meta.url)),
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin Initialized");
} catch (error) {
  console.warn("⚠️ Warning: 'service-account.json' not found. Auth will fail.");
}

const fastify = Fastify({ logger: true });

// Plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : "http://localhost:3000",
  credentials: true,
});

fastify.register(cookie);

fastify.register(mongodb, {
  forceClose: true,
  url: process.env.MONGO_URL,
  database: process.env.DB_NAME,
});

// Middleware: Get Current User
const getCurrentUser = async (request, reply) => {
  const token = request.cookies.session_token;
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

// Hook: Attach User to Request
fastify.decorateRequest("user", null);
fastify.addHook("onRequest", async (request, reply) => {
  request.user = await getCurrentUser(request, reply);
});

// --- API ROUTES ---

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return await db
      .collection("users")
      .findOne({ user_id: userId }, { projection: { _id: 0 } });
  } catch (error) {
    fastify.log.error(error);
    return reply.code(401).send({ message: "Invalid Token" });
  }
});

fastify.get("/api/auth/me", async (request, reply) => {
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });
  return request.user;
});

fastify.post("/api/auth/logout", async (request, reply) => {
  const token = request.cookies.session_token;
  if (token) {
    await fastify.mongo.db
      .collection("user_sessions")
      .deleteOne({ session_token: token });
  }
  reply.clearCookie("session_token", { path: "/" });
  return { message: "Logged out successfully" };
});

// 2. PRODUCTS
fastify.post("/api/products", async (request, reply) => {
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });

  const product = request.body;

  // Basic validation
  if (!product.name || !product.price) {
    return reply.code(400).send({ message: "Name and Price are required" });
  }

  // Generate ID if missing
  if (!product.product_id) {
    product.product_id = `prod_${Math.random().toString(36).substring(2, 14)}`;
  }

  // Set creation date
  product.created_at = new Date();

  await fastify.mongo.db.collection("products").insertOne(product);
  return product;
});

// Update Product
fastify.put("/api/products/:id", async (request, reply) => {
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });

  const { id } = request.params;
  const updates = request.body;
  delete updates._id; // Protect immutable field

  const result = await fastify.mongo.db
    .collection("products")
    .findOneAndUpdate(
      { product_id: id },
      { $set: updates },
      { returnDocument: "after" },
    );

  if (!result) return reply.code(404).send({ message: "Product not found" });
  return result;
});

// Delete Product
fastify.delete("/api/products/:id", async (request, reply) => {
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });

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
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });

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
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });
  const { product_id, quantity } = request.body;
  const db = fastify.mongo.db;

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

  if (existingItemIndex > -1) {
    items[existingItemIndex].quantity += quantity;
  } else {
    items.push({ product_id, quantity });
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
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });
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
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });

  const db = fastify.mongo.db;
  const cart = await db
    .collection("carts")
    .findOne({ user_id: request.user.user_id });

  if (!cart || !cart.items || cart.items.length === 0) {
    return reply.code(400).send({ message: "Cart is empty" });
  }

  let total_amount = 0;
  const order_items = [];

  // Calculate totals
  for (const item of cart.items) {
    const product = await db
      .collection("products")
      .findOne({ product_id: item.product_id });
    if (product) {
      total_amount += product.price * item.quantity;
      order_items.push({
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }
  }

  const order_id = `order_${uuidv4().substring(0, 12)}`;

  // Create Order Record
  await db.collection("orders").insertOne({
    order_id,
    user_id: request.user.user_id,
    items: order_items,
    total_amount,
    status: "completed", // Automatically completed since no payment
    created_at: new Date(),
  });

  // Clear Cart
  await db
    .collection("carts")
    .updateOne(
      { user_id: request.user.user_id },
      { $set: { items: [], updated_at: new Date() } },
    );

  return { success: true, order_id, message: "Order placed successfully" };
});

// 5. ORDERS (View History)
fastify.get("/api/orders", async (request, reply) => {
  if (!request.user)
    return reply.code(401).send({ message: "Not authenticated" });

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
