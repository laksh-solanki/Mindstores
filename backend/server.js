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

import registerAuthRoutes from "./routes/auth.js";
import registerCartRoutes from "./routes/cart.js";
import registerCheckoutRoutes from "./routes/checkout.js";
import registerOrderRoutes from "./routes/orders.js";
import registerProductRoutes from "./routes/products.js";
import registerRootRoutes from "./routes/root.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const isHostedEnv = Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL);
const useSecureCookies =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production" || isHostedEnv;
const cookieSameSite =
  process.env.COOKIE_SAMESITE || (useSecureCookies ? "none" : "lax");

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

const configuredCorsOrigins =
  process.env.CORS_ORIGIN ||
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,https://mindstores.onrender.com";

const allowedOrigins = configuredCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ADMIN_EMAILS = new Set(["lakshsolanki848@gmail.com"]);

fastify.register(cors, {
  credentials: true,
  allowedHeaders: ["Content-Type", "X-Session-Token", "Authorization"],
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
  const normalizedEmail = (request.user.email || "").toLowerCase().trim();
  if (!ADMIN_EMAILS.has(normalizedEmail)) {
    await reply.code(403).send({ message: "Admin access required" });
    return false;
  }
  return true;
};

fastify.decorateRequest("user", null);
fastify.addHook("onRequest", async (request) => {
  request.user = await getCurrentUser(request);
});

const routeDeps = {
  admin,
  uuidv4,
  useSecureCookies,
  cookieSameSite,
  ADMIN_EMAILS,
  requireAuth,
  requireAdmin,
  getSessionTokenFromRequest,
};

await registerRootRoutes(fastify);
await registerAuthRoutes(fastify, routeDeps);
await registerProductRoutes(fastify, routeDeps);
await registerCartRoutes(fastify, routeDeps);
await registerCheckoutRoutes(fastify, routeDeps);
await registerOrderRoutes(fastify, routeDeps);

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
