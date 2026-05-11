import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import mongodb from "@fastify/mongodb";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAdminAccessService } from "./adminAccess.js";
import { createDbClient } from "./db.js";

import registerAdminRoutes from "./routes/admin.js";
import registerAuthRoutes from "./routes/auth.js";
import registerCartRoutes from "./routes/cart.js";
import registerCheckoutRoutes from "./routes/checkout.js";
import registerOrderRoutes from "./routes/orders.js";
import registerProductRoutes from "./routes/products.js";
import registerRootRoutes from "./routes/root.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

function parseBooleanEnv(value, fallback = false) {
  if (value == null) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return fallback;
}

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const isHostedEnv = Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL);
const isProductionEnv = String(process.env.NODE_ENV || "").toLowerCase() === "production" || isHostedEnv;

const requestBodyLimitBytes = parseIntegerEnv(process.env.REQUEST_BODY_LIMIT_BYTES, 1_048_576);
const sessionDurationDays = parseIntegerEnv(process.env.SESSION_DURATION_DAYS, 7);
const mutationRateLimitMax = parseIntegerEnv(process.env.MUTATION_RATE_LIMIT_MAX, 120);
const trustProxy = parseBooleanEnv(process.env.TRUST_PROXY, isHostedEnv);

const useSecureCookies =
  process.env.COOKIE_SECURE != null
    ? parseBooleanEnv(process.env.COOKIE_SECURE, true)
    : isProductionEnv;

const requestedCookieSameSite = String(process.env.COOKIE_SAMESITE || (useSecureCookies ? "none" : "lax"))
  .trim()
  .toLowerCase();

const cookieSameSite = requestedCookieSameSite === "none" && !useSecureCookies ? "lax" : requestedCookieSameSite;
if (requestedCookieSameSite === "none" && !useSecureCookies) {
  console.warn("COOKIE_SAMESITE=none requires secure cookies. Falling back to sameSite=lax.");
}

const allowHeaderSessionToken = parseBooleanEnv(process.env.ALLOW_HEADER_SESSION_TOKEN, false);
const enforceOriginCheck = parseBooleanEnv(process.env.ENFORCE_ORIGIN_CHECK, isProductionEnv);
const allowNullOriginOnMutations = parseBooleanEnv(process.env.ALLOW_NULL_ORIGIN_ON_MUTATIONS, false);

const apiPathPrefixes = ["/admin", "/auth", "/cart", "/checkout", "/orders", "/products"];
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const isBackendApiRoute = (pathname) =>
  apiPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

function getRequestPath(url = "") {
  return String(url).split("?")[0] || "/";
}

function getRequestOrigin(request) {
  const rawOrigin = request.headers?.origin;
  if (typeof rawOrigin === "string" && rawOrigin.trim()) {
    return rawOrigin.trim();
  }

  const referer = request.headers?.referer;
  if (typeof referer === "string" && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

const configuredCorsOrigins =
  process.env.CORS_ORIGIN ||
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,https://mindstores.vercel.app,https://mindstores.onrender.com";

const allowedOrigins = configuredCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOriginSet = new Set(allowedOrigins);
const isOriginAllowed = (origin) => !origin || allowedOriginSet.has("*") || allowedOriginSet.has(origin);

const bootstrapAdminEmails = String(process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

const createSessionToken = () => randomBytes(32).toString("base64url");
const hashSessionToken = async (token) => createHash("sha256").update(String(token)).digest("hex");

async function createFirebaseAdmin() {
  if (admin.apps?.length > 0) {
    return admin;
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : JSON.parse(await readFile(new URL("./service-account.json", import.meta.url), "utf-8"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized.");
    return admin;
  } catch (error) {
    console.warn("Firebase credentials unavailable. Auth token verification will fail until configured.");
    return {
      auth() {
        return {
          async verifyIdToken() {
            throw new Error("Firebase Admin credentials not configured");
          },
        };
      },
    };
  }
}

const rateLimitStore = new Map();

function createRateLimitGuard({ keyPrefix, windowMs, maxRequests }) {
  return async (request, reply) => {
    const ipAddress = request.ip || "unknown";
    const now = Date.now();
    const key = `${keyPrefix}:${ipAddress}`;

    let state = rateLimitStore.get(key);
    if (!state || state.resetAt <= now) {
      state = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, state);
    }

    state.count += 1;
    if (state.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
      reply.header("Retry-After", String(retryAfterSeconds));
      await reply.code(429).send({ message: "Too many requests. Please try again later." });
      return;
    }

    if (rateLimitStore.size > 5_000) {
      for (const [storedKey, storedState] of rateLimitStore.entries()) {
        if (storedState.resetAt <= now) {
          rateLimitStore.delete(storedKey);
        }
      }
    }
  };
}

const mutationRateLimitGuard = createRateLimitGuard({
  keyPrefix: "mutation",
  windowMs: 60_000,
  maxRequests: mutationRateLimitMax,
});

const fastify = Fastify({
  logger: true,
  bodyLimit: requestBodyLimitBytes,
  trustProxy,
});

fastify.register(cookie);

const corsAllowedHeaders = ["Content-Type", "Authorization"];
if (allowHeaderSessionToken) {
  corsAllowedHeaders.push("X-Session-Token");
}

fastify.register(cors, {
  credentials: true,
  allowedHeaders: corsAllowedHeaders,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
});

if (process.env.MONGO_URL) {
  fastify.register(mongodb, {
    forceClose: true,
    url: process.env.MONGO_URL,
    database: process.env.DB_NAME,
  });
} else {
  fastify.decorate("mongo", {
    db: createDbClient(process.env),
  });
}

const firebaseAdmin = await createFirebaseAdmin();

if (process.env.MONGO_URL) {
  await fastify.after();
}

if (!fastify.mongo?.db) {
  fastify.mongo = { db: createDbClient(process.env) };
}

const adminAccess = createAdminAccessService(fastify.mongo.db, {
  bootstrapEmails: bootstrapAdminEmails,
});
await adminAccess.ensureSeeded();

function getSessionTokenFromRequest(request) {
  const cookieToken = request.cookies?.session_token;
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  if (allowHeaderSessionToken) {
    const headerToken = request.headers?.["x-session-token"];
    if (typeof headerToken === "string" && headerToken.trim()) {
      return headerToken.trim();
    }
  }

  return null;
}

function getBearerTokenFromRequest(request) {
  const authorization = request.headers?.authorization || request.headers?.Authorization;
  if (typeof authorization !== "string") {
    return null;
  }

  const match = authorization.trim().match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : "";
  return token && token.length <= 8_000 ? token : null;
}

function normalizeTokenText(value, maxLength = 0) {
  const normalized = value == null ? "" : String(value).trim();
  if (!normalized) {
    return "";
  }
  return maxLength > 0 && normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

async function serializeAuthenticatedUser(user, fallbackEmail = "") {
  if (!user) {
    return null;
  }

  const normalizedEmail = normalizeTokenText(fallbackEmail || user.email, 320).toLowerCase();
  return {
    ...user,
    email: normalizedEmail || user.email || null,
    is_admin: await adminAccess.isAdminEmail(normalizedEmail),
  };
}

async function getCurrentUserFromSessionToken(token) {
  const db = fastify.mongo.db;
  const tokenHash = await hashSessionToken(token);
  const session = await db.collection("user_sessions").findOne({
    $or: [{ session_token_hash: tokenHash }, { session_token: token }],
  });

  if (!session) {
    return null;
  }

  const expiresAtMs = new Date(session.expires_at || 0).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    await db.collection("user_sessions").deleteOne({ _id: session._id });
    return null;
  }

  const user = await db
    .collection("users")
    .findOne({ user_id: session.user_id }, { projection: { _id: 0 } });

  if (!user) {
    return null;
  }

  return await serializeAuthenticatedUser(user);
}

async function getCurrentUserFromFirebaseBearer(request) {
  const idToken = getBearerTokenFromRequest(request);
  if (!idToken || idToken.length < 100) {
    return null;
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const uid = normalizeTokenText(decodedToken?.uid || decodedToken?.user_id || decodedToken?.sub, 200);
    const normalizedEmail = normalizeTokenText(decodedToken?.email, 320).toLowerCase();
    if (!uid || !normalizedEmail) {
      return null;
    }

    const db = fastify.mongo.db;
    const userId = `user_${uid}`;
    let user = await db.collection("users").findOne({ user_id: userId }, { projection: { _id: 0 } });

    if (!user) {
      const now = new Date();
      const profileName = normalizeTokenText(decodedToken?.name || decodedToken?.displayName, 120) || "User";
      const profilePicture = normalizeTokenText(decodedToken?.picture, 2048) || null;
      await db.collection("users").updateOne(
        { user_id: userId },
        {
          $set: {
            email: normalizedEmail,
            name: profileName,
            picture: profilePicture,
            is_admin: await adminAccess.isAdminEmail(normalizedEmail),
            updated_at: now,
          },
          $setOnInsert: {
            user_id: userId,
            created_at: now,
          },
        },
        { upsert: true },
      );
      user = await db.collection("users").findOne({ user_id: userId }, { projection: { _id: 0 } });
    }

    return await serializeAuthenticatedUser(user || { user_id: userId, name: "User" }, normalizedEmail);
  } catch {
    return null;
  }
}

async function getCurrentUser(request) {
  const sessionToken = getSessionTokenFromRequest(request);
  if (sessionToken) {
    const sessionUser = await getCurrentUserFromSessionToken(sessionToken);
    if (sessionUser) {
      return sessionUser;
    }
  }

  return await getCurrentUserFromFirebaseBearer(request);
}

async function requireAuth(request, reply) {
  if (!request.user) {
    await reply.code(401).send({ message: "Not authenticated" });
    return false;
  }
  return true;
}

async function requireAdmin(request, reply) {
  if (!(await requireAuth(request, reply))) {
    return false;
  }

  const normalizedEmail = String(request.user?.email || "").toLowerCase().trim();
  if (!(await adminAccess.isAdminEmail(normalizedEmail))) {
    await reply.code(403).send({ message: "Admin access required" });
    return false;
  }

  return true;
}

fastify.decorateRequest("user", null);

fastify.addHook("onRequest", async (request, reply) => {
  const pathName = getRequestPath(request.url);
  const isMutatingApiRequest = isBackendApiRoute(pathName) && mutatingMethods.has(request.method);

  if (isMutatingApiRequest) {
    if (enforceOriginCheck) {
      const requestOrigin = getRequestOrigin(request);
      if (!requestOrigin && !allowNullOriginOnMutations) {
        await reply.code(403).send({ message: "Missing origin" });
        return;
      }
      if (requestOrigin && !isOriginAllowed(requestOrigin)) {
        await reply.code(403).send({ message: "Forbidden origin" });
        return;
      }
    }

    await mutationRateLimitGuard(request, reply);
    if (reply.sent) {
      return;
    }
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

  if (isBackendApiRoute(getRequestPath(request.url))) {
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

fastify.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error, route: request.url });

  if (reply.sent) {
    return;
  }

  const statusCode = Number(error.statusCode || 500);
  if (statusCode >= 400 && statusCode < 500) {
    reply.code(statusCode).send({ message: error.message || "Request error" });
    return;
  }

  reply.code(500).send({ message: "Internal server error" });
});

const routeDeps = {
  admin: firebaseAdmin,
  uuidv4: () => randomBytes(16).toString("hex"),
  createSessionToken,
  hashSessionToken,
  useSecureCookies,
  cookieSameSite,
  sessionDurationDays,
  adminAccess,
  requireAuth,
  requireAdmin,
  createRateLimitGuard,
  getSessionTokenFromRequest,
};

await registerRootRoutes(fastify);
await registerAuthRoutes(fastify, routeDeps);
await registerAdminRoutes(fastify, routeDeps);
await registerProductRoutes(fastify, routeDeps);
await registerCartRoutes(fastify, routeDeps);
await registerCheckoutRoutes(fastify, routeDeps);
await registerOrderRoutes(fastify, routeDeps);

const start = async () => {
  try {
    const port = parseIntegerEnv(process.env.PORT, 8000);
    await fastify.listen({ host: "0.0.0.0", port });
    const address = fastify.server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    console.log(`Server running on http://localhost:${resolvedPort}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
