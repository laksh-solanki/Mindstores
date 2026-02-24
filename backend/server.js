import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import mongodb from "@fastify/mongodb";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
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
const parseBooleanEnv = (value, fallback) => {
  if (value == null) return fallback;
  return value === "true";
};

const requestBodyLimitBytes = Number.parseInt(process.env.REQUEST_BODY_LIMIT_BYTES || "1048576", 10);
const sessionDurationDays = Number.parseInt(process.env.SESSION_DURATION_DAYS || "7", 10);
const useSecureCookies =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production" || isHostedEnv;
const requestedCookieSameSite =
  process.env.COOKIE_SAMESITE || (useSecureCookies ? "none" : "lax");
const cookieSameSite =
  requestedCookieSameSite === "none" && !useSecureCookies ? "lax" : requestedCookieSameSite;
if (requestedCookieSameSite === "none" && !useSecureCookies) {
  console.warn("COOKIE_SAMESITE=none requires secure cookies. Falling back to sameSite=lax.");
}
const allowHeaderSessionToken = parseBooleanEnv(process.env.ALLOW_HEADER_SESSION_TOKEN, false);
const enforceOriginCheck = parseBooleanEnv(
  process.env.ENFORCE_ORIGIN_CHECK,
  process.env.NODE_ENV === "production" || isHostedEnv,
);
const mutationRateLimitMax = Number.parseInt(process.env.MUTATION_RATE_LIMIT_MAX || "120", 10);

const createSessionToken = () => randomBytes(32).toString("base64url");
const hashSessionToken = (token) => createHash("sha256").update(String(token)).digest("hex");

try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : JSON.parse(
        await readFile(new URL("./service-account.json", import.meta.url), "utf-8"),
      );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin Initialized");
} catch (error) {
  console.warn("Warning: Firebase service credentials not found. Firebase auth will fail.");
}

const fastify = Fastify({
  logger: true,
  bodyLimit: requestBodyLimitBytes,
  trustProxy: parseBooleanEnv(process.env.TRUST_PROXY, isHostedEnv),
});

const configuredCorsOrigins =
  process.env.CORS_ORIGIN ||
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,https://mindstores.onrender.com";

const allowedOrigins = configuredCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOriginSet = new Set(allowedOrigins);
const isOriginAllowed = (origin) =>
  !origin || allowedOriginSet.has("*") || allowedOriginSet.has(origin);

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const getRequestOrigin = (request) => {
  const rawOrigin = request.headers.origin;
  if (typeof rawOrigin === "string" && rawOrigin.trim()) {
    return rawOrigin.trim();
  }

  const referer = request.headers.referer;
  if (typeof referer === "string" && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
};

const ADMIN_EMAILS = new Set(["lakshsolanki848@gmail.com"]);
const rateLimitStore = new Map();

const createRateLimitGuard = ({ keyPrefix, windowMs, maxRequests }) => async (request, reply) => {
  const ipAddress = request.ip || "unknown";
  const key = `${keyPrefix}:${ipAddress}`;
  const now = Date.now();

  let state = rateLimitStore.get(key);
  if (!state || state.resetAt <= now) {
    state = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, state);
  }

  state.count += 1;

  if (state.count > maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
    reply.header("Retry-After", String(retryAfter));
    await reply.code(429).send({ message: "Too many requests. Please try again later." });
    return;
  }

  if (rateLimitStore.size > 5000) {
    for (const [storedKey, storedState] of rateLimitStore.entries()) {
      if (storedState.resetAt <= now) {
        rateLimitStore.delete(storedKey);
      }
    }
  }
};

const mutationRateLimitGuard = createRateLimitGuard({
  keyPrefix: "mutation",
  windowMs: 60_000,
  maxRequests: mutationRateLimitMax,
});

const corsAllowedHeaders = ["Content-Type", "Authorization"];
if (allowHeaderSessionToken) {
  corsAllowedHeaders.push("X-Session-Token");
}

fastify.register(cors, {
  credentials: true,
  allowedHeaders: corsAllowedHeaders,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) {
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

const getSessionTokenFromRequest = (request) => {
  const cookieToken = request.cookies.session_token;
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  if (allowHeaderSessionToken) {
    const headerToken = request.headers["x-session-token"];
    if (typeof headerToken === "string" && headerToken.trim()) {
      return headerToken.trim();
    }
  }

  return null;
};

const getCurrentUser = async (request) => {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  const db = fastify.mongo.db;
  const tokenHash = hashSessionToken(token);
  const session = await db
    .collection("user_sessions")
    .findOne({
      $or: [{ session_token_hash: tokenHash }, { session_token: token }],
    });

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) < new Date()) {
    await db.collection("user_sessions").deleteOne({ _id: session._id });
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
fastify.addHook("onRequest", async (request, reply) => {
  const isApiRoute = request.url.startsWith("/api/");
  const isMutatingApiRequest = isApiRoute && mutatingMethods.has(request.method);

  if (isMutatingApiRequest) {
    if (enforceOriginCheck) {
      const requestOrigin = getRequestOrigin(request);
      if (requestOrigin && !isOriginAllowed(requestOrigin)) {
        await reply.code(403).send({ message: "Forbidden origin" });
        return;
      }
    }

    await mutationRateLimitGuard(request, reply);
    if (reply.sent) return;
  }

  request.user = await getCurrentUser(request);
});

fastify.addHook("onSend", async (request, reply, payload) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Referrer-Policy", "no-referrer");
  reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  reply.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  reply.header("X-Permitted-Cross-Domain-Policies", "none");

  if (request.url.startsWith("/api/")) {
    reply.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  }

  if (useSecureCookies) {
    reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return payload;
});

const routeDeps = {
  admin,
  uuidv4,
  createSessionToken,
  hashSessionToken,
  useSecureCookies,
  cookieSameSite,
  sessionDurationDays,
  ADMIN_EMAILS,
  requireAuth,
  requireAdmin,
  createRateLimitGuard,
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
