import { createAdminAccessService } from "./adminAccess.js";

import registerAdminRoutes from "./routes/admin.js";
import registerAuthRoutes from "./routes/auth.js";
import registerCartRoutes from "./routes/cart.js";
import registerCheckoutRoutes from "./routes/checkout.js";
import registerOrderRoutes from "./routes/orders.js";
import registerProductRoutes from "./routes/products.js";
import registerRootRoutes from "./routes/root.js";

const API_PATH_PREFIXES = ["/admin", "/auth", "/cart", "/checkout", "/orders", "/products"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_CORS_ORIGINS =
  "http://localhost:3000,http://localhost:5173,https://mindstores.vercel.app,https://mindstores.onrender.com";

let firebaseJwksPromise = null;
let firebaseJwksExpiresAt = 0;

export function parseBooleanEnv(value, fallback = false) {
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

export function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getPathname(url) {
  return String(url || "").split("?")[0] || "/";
}

export function isBackendApiRoute(pathname) {
  return API_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getHeader(headers, name) {
  if (!headers) {
    return null;
  }
  if (typeof headers.get === "function") {
    return headers.get(name);
  }

  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || null;
}

function getRequestOrigin(request) {
  const origin = getHeader(request.headers, "origin");
  if (typeof origin === "string" && origin.trim()) {
    return origin.trim();
  }

  const referer = getHeader(request.headers, "referer");
  if (typeof referer === "string" && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function getFetchRequestOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin?.trim()) {
    return origin.trim();
  }

  const referer = request.headers.get("referer");
  if (referer?.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

export function getConfiguredCorsOrigins(env = {}) {
  return String(env.CORS_ORIGIN || env.CORS_ORIGINS || DEFAULT_CORS_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowedForEnv(env, origin) {
  if (!origin) {
    return true;
  }
  const allowedOrigins = getConfiguredCorsOrigins(env);
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

export function shouldUseSecureCookies(env = {}) {
  const isProductionEnv = String(env.ENVIRONMENT || "").toLowerCase() === "production";
  return env.COOKIE_SECURE != null ? parseBooleanEnv(env.COOKIE_SECURE, true) : isProductionEnv;
}

function setResponseHeader(target, name, value) {
  if (typeof target.header === "function") {
    target.header(name, value);
    return;
  }
  if (typeof target.set === "function") {
    target.set(name, String(value));
  }
}

export function applySecurityHeaders(target, pathname, useSecureCookies) {
  setResponseHeader(target, "X-Content-Type-Options", "nosniff");
  setResponseHeader(target, "X-Frame-Options", "DENY");
  setResponseHeader(target, "Referrer-Policy", "no-referrer");
  setResponseHeader(target, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  setResponseHeader(target, "Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  setResponseHeader(target, "X-Permitted-Cross-Domain-Policies", "none");

  if (isBackendApiRoute(pathname)) {
    setResponseHeader(
      target,
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  }

  if (useSecureCookies) {
    setResponseHeader(target, "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

export function createJsonResponse(request, env, status, payload) {
  const url = new URL(request.url);
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  const origin = getFetchRequestOrigin(request);

  if (origin && isOriginAllowedForEnv(env, origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  applySecurityHeaders(headers, url.pathname, shouldUseSecureCookies(env));

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

export function getRequestBodyLimitBytes(env = {}) {
  return parseIntegerEnv(env.REQUEST_BODY_LIMIT_BYTES, 1_048_576);
}

function getRuntimeCrypto() {
  if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new Error("Web Crypto is required for authentication");
  }
  return globalThis.crypto;
}

function base64UrlDecode(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  }

  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(padded, "base64"));
  }

  throw new Error("No base64 decoder available");
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

async function getFirebaseJwks() {
  const now = Date.now();
  if (firebaseJwksPromise && firebaseJwksExpiresAt > now) {
    return firebaseJwksPromise;
  }

  firebaseJwksPromise = fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load Firebase public keys: ${response.status}`);
    }

    const cacheControl = response.headers.get("cache-control") || "";
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
    firebaseJwksExpiresAt = Date.now() + Math.max(60, maxAgeSeconds - 60) * 1000;

    return await response.json();
  });

  return firebaseJwksPromise;
}

function createFirebaseAdmin(env) {
  const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;

  return {
    auth() {
      return {
        async verifyIdToken(idToken) {
          if (!projectId) {
            throw new Error("FIREBASE_PROJECT_ID is required to verify Firebase ID tokens");
          }

          const [encodedHeader, encodedPayload, encodedSignature] = String(idToken || "").split(".");
          if (!encodedHeader || !encodedPayload || !encodedSignature) {
            throw new Error("Invalid Firebase ID token");
          }

          const header = decodeJwtPart(encodedHeader);
          const payload = decodeJwtPart(encodedPayload);

          if (header.alg !== "RS256" || !header.kid) {
            throw new Error("Unsupported Firebase ID token header");
          }

          const jwks = await getFirebaseJwks();
          const signingKey = jwks.keys?.find((candidate) => candidate.kid === header.kid);
          if (!signingKey) {
            firebaseJwksExpiresAt = 0;
            throw new Error("Firebase signing key not found");
          }

          const runtimeCrypto = getRuntimeCrypto();
          const cryptoKey = await runtimeCrypto.subtle.importKey(
            "jwk",
            signingKey,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"],
          );

          const signedContent = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
          const verified = await runtimeCrypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            cryptoKey,
            base64UrlDecode(encodedSignature),
            signedContent,
          );

          const nowSeconds = Math.floor(Date.now() / 1000);
          const expectedIssuer = `https://securetoken.google.com/${projectId}`;

          if (
            !verified ||
            payload.aud !== projectId ||
            payload.iss !== expectedIssuer ||
            !payload.sub ||
            payload.sub.length > 128 ||
            Number(payload.exp || 0) <= nowSeconds ||
            Number(payload.iat || 0) > nowSeconds + 300
          ) {
            throw new Error("Invalid Firebase ID token");
          }

          return {
            ...payload,
            uid: payload.user_id || payload.sub,
            email: payload.email || null,
            name: payload.name || payload.displayName || null,
            picture: payload.picture || null,
          };
        },
      };
    },
  };
}

function attachMongoDb(fastify, db) {
  if (fastify.mongo) {
    fastify.mongo.db = db;
    return;
  }

  if (typeof fastify.decorate === "function") {
    fastify.decorate("mongo", { db });
    return;
  }

  fastify.mongo = { db };
}

function decorateRequestUser(fastify) {
  if (typeof fastify.decorateRequest !== "function") {
    return;
  }

  if (typeof fastify.hasRequestDecorator === "function" && fastify.hasRequestDecorator("user")) {
    return;
  }

  fastify.decorateRequest("user", null);
}

export async function createMindstoresApp(fastify, { env = {}, db, firebaseAdmin } = {}) {
  if (!db) {
    throw new Error("A database client is required");
  }

  attachMongoDb(fastify, db);

  const isProductionEnv = String(env.ENVIRONMENT || "").toLowerCase() === "production";
  const useSecureCookies = shouldUseSecureCookies(env);

  const requestedCookieSameSite = String(env.COOKIE_SAMESITE || (useSecureCookies ? "none" : "lax"))
    .trim()
    .toLowerCase();

  const cookieSameSite =
    requestedCookieSameSite === "none" && !useSecureCookies ? "lax" : requestedCookieSameSite;

  const sessionDurationDays = parseIntegerEnv(env.SESSION_DURATION_DAYS, 7);
  const mutationRateLimitMax = parseIntegerEnv(env.MUTATION_RATE_LIMIT_MAX, 120);
  const enforceOriginCheck = parseBooleanEnv(env.ENFORCE_ORIGIN_CHECK, isProductionEnv);
  const allowNullOriginOnMutations = parseBooleanEnv(env.ALLOW_NULL_ORIGIN_ON_MUTATIONS, false);
  const allowHeaderSessionToken = parseBooleanEnv(env.ALLOW_HEADER_SESSION_TOKEN, false);

  const allowedOrigins = getConfiguredCorsOrigins(env);
  const allowedOriginSet = new Set(allowedOrigins);
  const isOriginAllowed = (origin) => !origin || allowedOriginSet.has("*") || allowedOriginSet.has(origin);

  const adminAccess = createAdminAccessService(db, {
    bootstrapEmails: String(env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
  });
  await adminAccess.ensureSeeded();

  const rateLimitStore = new Map();
  const createRateLimitGuard = ({ keyPrefix, windowMs, maxRequests }) => async (request, reply) => {
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
      const retryAfter = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
      reply.header("Retry-After", String(retryAfter));
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

  const mutationRateLimitGuard = createRateLimitGuard({
    keyPrefix: "mutation",
    windowMs: 60_000,
    maxRequests: mutationRateLimitMax,
  });

  const getSessionTokenFromRequest = (request) => {
    const cookieToken = request.cookies?.session_token;
    if (typeof cookieToken === "string" && cookieToken.trim()) {
      return cookieToken.trim();
    }

    if (allowHeaderSessionToken) {
      const headerToken = getHeader(request.headers, "x-session-token");
      if (typeof headerToken === "string" && headerToken.trim()) {
        return headerToken.trim();
      }
    }

    return null;
  };

  const hashSessionToken = async (token) => {
    const data = new TextEncoder().encode(String(token));
    const digest = await getRuntimeCrypto().subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const createSessionToken = () => {
    const bytes = new Uint8Array(32);
    getRuntimeCrypto().getRandomValues(bytes);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const authClient = firebaseAdmin || createFirebaseAdmin(env);

  const getBearerTokenFromRequest = (request) => {
    const authorization = getHeader(request.headers, "authorization");
    if (typeof authorization !== "string") {
      return null;
    }

    const match = authorization.trim().match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1].trim() : "";
    return token && token.length <= 8_000 ? token : null;
  };

  const normalizeTokenText = (value, maxLength = 0) => {
    const normalized = value == null ? "" : String(value).trim();
    if (!normalized) {
      return "";
    }
    return maxLength > 0 && normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
  };

  const serializeAuthenticatedUser = async (user, fallbackEmail = "") => {
    if (!user) {
      return null;
    }

    const normalizedEmail = normalizeTokenText(fallbackEmail || user.email, 320).toLowerCase();
    return {
      ...user,
      email: normalizedEmail || user.email || null,
      is_admin: await adminAccess.isAdminEmail(normalizedEmail),
    };
  };

  const getCurrentUserFromSessionToken = async (token) => {
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

    const user = await db.collection("users").findOne({ user_id: session.user_id }, { projection: { _id: 0 } });
    if (!user) {
      return null;
    }

    return await serializeAuthenticatedUser(user);
  };

  const getCurrentUserFromFirebaseBearer = async (request) => {
    const idToken = getBearerTokenFromRequest(request);
    if (!idToken || idToken.length < 100) {
      return null;
    }

    try {
      const decodedToken = await authClient.auth().verifyIdToken(idToken);
      const uid = normalizeTokenText(decodedToken?.uid || decodedToken?.user_id || decodedToken?.sub, 200);
      const normalizedEmail = normalizeTokenText(decodedToken?.email, 320).toLowerCase();
      if (!uid || !normalizedEmail) {
        return null;
      }

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
  };

  const getCurrentUser = async (request) => {
    const sessionToken = getSessionTokenFromRequest(request);
    if (sessionToken) {
      const sessionUser = await getCurrentUserFromSessionToken(sessionToken);
      if (sessionUser) {
        return sessionUser;
      }
    }

    return await getCurrentUserFromFirebaseBearer(request);
  };

  const requireAuth = async (request, reply) => {
    if (!request.user) {
      await reply.code(401).send({ message: "Not authenticated" });
      return false;
    }
    return true;
  };

  const requireAdmin = async (request, reply) => {
    if (!(await requireAuth(request, reply))) {
      return false;
    }

    const normalizedEmail = String(request.user?.email || "").toLowerCase().trim();
    if (!(await adminAccess.isAdminEmail(normalizedEmail))) {
      await reply.code(403).send({ message: "Admin access required" });
      return false;
    }

    return true;
  };

  decorateRequestUser(fastify);

  fastify.addHook("onRequest", async (request, reply) => {
    const origin = getRequestOrigin(request);
    if (request.method === "OPTIONS") {
      if (origin && !isOriginAllowed(origin)) {
        await reply.code(403).send({ message: "Forbidden origin" });
        return;
      }

      if (origin && isOriginAllowed(origin)) {
        reply.header("Access-Control-Allow-Origin", origin);
        reply.header("Vary", "Origin");
      }

      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
      const allowedHeaders = ["Content-Type", "Authorization"];
      if (allowHeaderSessionToken) {
        allowedHeaders.push("X-Session-Token");
      }
      reply.header("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      await reply.code(204).send("");
      return;
    }

    if (origin && isOriginAllowed(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Vary", "Origin");
    }

    const pathName = getPathname(request.url);
    const requestMethod = String(request.method || "").toUpperCase();
    const isMutatingApiRequest = isBackendApiRoute(pathName) && MUTATING_METHODS.has(requestMethod);

    if (isMutatingApiRequest) {
      if (enforceOriginCheck) {
        if (!origin && !allowNullOriginOnMutations) {
          await reply.code(403).send({ message: "Missing origin" });
          return;
        }
        if (origin && !isOriginAllowed(origin)) {
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
    applySecurityHeaders(reply, getPathname(request.url), useSecureCookies);
    return payload;
  });

  const routeDeps = {
    admin: authClient,
    uuidv4: () => getRuntimeCrypto().randomUUID(),
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

  return fastify;
}
