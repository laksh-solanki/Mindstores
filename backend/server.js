// backend/server.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import mongodb from '@fastify/mongodb';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Firebase Admin
// ⚠️ You must download your Service Account JSON from Firebase Console -> Project Settings -> Service Accounts
// and save it as 'service-account.json' in the backend folder.
try {
  const serviceAccount = JSON.parse(
    await readFile(new URL('./service-account.json', import.meta.url))
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin Initialized");
} catch (error) {
  console.warn("⚠️ Warning: 'service-account.json' not found. Auth will fail.");
}

const fastify = Fastify({ logger: true });
const stripe = new Stripe(process.env.STRIPE_API_KEY);

// Plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : 'http://localhost:3000',
  credentials: true
});

fastify.register(cookie);

fastify.register(mongodb, {
  forceClose: true,
  url: process.env.MONGO_URL,
  database: process.env.DB_NAME
});

// Helper: Get Current User Middleware
const getCurrentUser = async (request, reply) => {
  const token = request.cookies.session_token;
  if (!token) return null;

  const db = fastify.mongo.db;
  const session = await db.collection('user_sessions').findOne({ session_token: token });

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return await db.collection('users').findOne({ user_id: session.user_id }, { projection: { _id: 0 } });
};

// Hook: Attach User to Request
fastify.decorateRequest('user', null);
fastify.addHook('onRequest', async (request, reply) => {
  request.user = await getCurrentUser(request, reply);
});

// --- API ROUTES ---

// 1. AUTHENTICATION (Adapted for Firebase)
fastify.post('/api/auth/firebase-login', async (request, reply) => {
  const { idToken } = request.body;
  
  if (!idToken) return reply.code(400).send({ message: "ID Token required" });

  try {
    // Verify Firebase Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    const db = fastify.mongo.db;
    const userId = `user_${uid}`; // Use Firebase UID or generate one

    // Upsert User
    const existingUser = await db.collection('users').findOne({ email });
    if (!existingUser) {
      await db.collection('users').insertOne({
        user_id: userId,
        email,
        name: name || 'User',
        picture,
        created_at: new Date()
      });
    } else {
      await db.collection('users').updateOne(
        { user_id: userId },
        { $set: { name, picture } }
      );
    }

    // Create Session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.collection('user_sessions').insertOne({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt,
      created_at: new Date()
    });

    // Set Cookie
    reply.setCookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'none' if backend/frontend are on different domains in prod
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return await db.collection('users').findOne({ user_id: userId }, { projection: { _id: 0 } });

  } catch (error) {
    fastify.log.error(error);
    return reply.code(401).send({ message: "Invalid Token" });
  }
});

fastify.get('/api/auth/me', async (request, reply) => {
  if (!request.user) return reply.code(401).send({ message: "Not authenticated" });
  return request.user;
});

fastify.post('/api/auth/logout', async (request, reply) => {
  const token = request.cookies.session_token;
  if (token) {
    await fastify.mongo.db.collection('user_sessions').deleteOne({ session_token: token });
  }
  reply.clearCookie('session_token', { path: '/' });
  return { message: "Logged out successfully" };
});

// 2. PRODUCTS
fastify.get('/api/products', async (request, reply) => {
  const { category } = request.query;
  const query = category ? { category } : {};
  return await fastify.mongo.db.collection('products').find(query, { projection: { _id: 0 } }).toArray();
});

fastify.get('/api/products/:id', async (request, reply) => {
  const product = await fastify.mongo.db.collection('products').findOne(
    { product_id: request.params.id }, 
    { projection: { _id: 0 } }
  );
  if (!product) return reply.code(404).send({ message: "Product not found" });
  return product;
});

// 3. CART
fastify.get('/api/cart', async (request, reply) => {
  if (!request.user) return reply.code(401).send({ message: "Not authenticated" });
  
  const cart = await fastify.mongo.db.collection('carts').findOne({ user_id: request.user.user_id }, { projection: { _id: 0 } });
  if (!cart) {
    return { cart_id: `cart_${uuidv4().substring(0, 12)}`, user_id: request.user.user_id, items: [] };
  }
  return cart;
});

fastify.post('/api/cart/add', async (request, reply) => {
  if (!request.user) return reply.code(401).send({ message: "Not authenticated" });
  const { product_id, quantity } = request.body;
  const db = fastify.mongo.db;

  let cart = await db.collection('carts').findOne({ user_id: request.user.user_id });
  
  if (!cart) {
    cart = {
      cart_id: `cart_${uuidv4().substring(0, 12)}`,
      user_id: request.user.user_id,
      items: [],
      updated_at: new Date()
    };
    await db.collection('carts').insertOne(cart);
  }

  const items = cart.items || [];
  const existingItemIndex = items.findIndex(i => i.product_id === product_id);

  if (existingItemIndex > -1) {
    items[existingItemIndex].quantity += quantity;
  } else {
    items.push({ product_id, quantity });
  }

  await db.collection('carts').updateOne(
    { user_id: request.user.user_id },
    { $set: { items, updated_at: new Date() } }
  );

  return { message: "Item added to cart" };
});

fastify.post('/api/cart/remove', async (request, reply) => {
  if (!request.user) return reply.code(401).send({ message: "Not authenticated" });
  const { product_id } = request.body;

  await fastify.mongo.db.collection('carts').updateOne(
    { user_id: request.user.user_id },
    { 
      $pull: { items: { product_id } },
      $set: { updated_at: new Date() }
    }
  );
  return { message: "Item removed" };
});

// 4. CHECKOUT (Stripe)
fastify.post('/api/checkout/create-session', async (request, reply) => {
  if (!request.user) return reply.code(401).send({ message: "Not authenticated" });
  // Note: Frontend sends { origin_url } but we often use headers.origin or env vars
  const { origin_url } = request.body || { origin_url: 'http://localhost:3000' };
  
  const db = fastify.mongo.db;
  const cart = await db.collection('carts').findOne({ user_id: request.user.user_id });
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return reply.code(400).send({ message: "Cart is empty" });
  }

  const line_items = [];
  let total_amount = 0;
  const order_items = [];

  for (const item of cart.items) {
    const product = await db.collection('products').findOne({ product_id: item.product_id });
    if (product) {
      total_amount += product.price * item.quantity;
      order_items.push({
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: Math.round(product.price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      });
    }
  }

  const order_id = `order_${uuidv4().substring(0, 12)}`;
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: `${origin_url}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin_url}/cart`,
    metadata: {
      user_id: request.user.user_id,
      order_id: order_id
    }
  });

  // Create Pending Order
  await db.collection('orders').insertOne({
    order_id,
    user_id: request.user.user_id,
    items: order_items,
    total_amount,
    status: 'pending',
    stripe_session_id: session.id,
    created_at: new Date()
  });

  // Create Transaction
  await db.collection('payment_transactions').insertOne({
    transaction_id: `txn_${uuidv4().substring(0, 12)}`,
    session_id: session.id,
    user_id: request.user.user_id,
    order_id,
    amount: total_amount,
    currency: 'usd',
    payment_status: 'pending',
    created_at: new Date()
  });

  return { url: session.url, session_id: session.id };
});

// Start Server
const start = async () => {
  try {
    const port = process.env.PORT || 8000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();