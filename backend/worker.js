import { parse as parseCookie, serialize as serializeCookie } from "cookie";

import { createAdminAccessService } from "./adminAccess.js";
import { createDbClient } from "./db.js";

import registerAdminRoutes from "./routes/admin.js";
import registerAuthRoutes from "./routes/auth.js";
import registerCartRoutes from "./routes/cart.js";
import registerCheckoutRoutes from "./routes/checkout.js";
import registerOrderRoutes from "./routes/orders.js";
import registerProductRoutes from "./routes/products.js";
import registerRootRoutes from "./routes/root.js";

const API_PATH_PREFIXES = ["/admin", "/auth", "/cart", "/checkout", "/orders", "/products"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

function getPathname(url) {
  return String(url || "").split("?")[0] || "/";
}

function isBackendApiRoute(pathname) {
  return API_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getRequestOrigin(request) {
  const origin = request.headers?.origin;
  if (typeof origin === "string" && origin.trim()) {
    return origin.trim();
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

function getConfiguredCorsOrigins(env = {}) {
  return String(
    env.CORS_ORIGIN ||
      env.CORS_ORIGINS ||
      "http://localhost:3000,http://localhost:5173,https://mindstores.vercel.app,https://mindstores.onrender.com",
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isOriginAllowedForEnv(env, origin) {
  if (!origin) {
    return true;
  }
  const allowedOrigins = getConfiguredCorsOrigins(env);
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

function shouldUseSecureCookies(env = {}) {
  const isProductionEnv = String(env.ENVIRONMENT || "").toLowerCase() === "production";
  return env.COOKIE_SECURE != null ? parseBooleanEnv(env.COOKIE_SECURE, true) : isProductionEnv;
}

function appendSecurityHeaders(headers, pathname, useSecureCookies) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  if (isBackendApiRoute(pathname)) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  }

  if (useSecureCookies) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

function createJsonResponse(request, env, status, payload) {
  const url = new URL(request.url);
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  const origin = getFetchRequestOrigin(request);

  if (origin && isOriginAllowedForEnv(env, origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  appendSecurityHeaders(headers, url.pathname, shouldUseSecureCookies(env));

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

class WorkerRouter {
  constructor(db) {
    this.routes = [];
    this.hooks = {
      onRequest: [],
      preHandler: [],
      onSend: [],
    };
    this.requestDecorations = {};
    this.mongo = { db };
    this.log = console;
  }

  addRoute(method, pattern, optionsOrHandler, maybeHandler) {
    const options = typeof optionsOrHandler === "function" ? {} : optionsOrHandler || {};
    const handler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler;

    const routePreHandlers = Array.isArray(options.preHandler)
      ? options.preHandler
      : options.preHandler
        ? [options.preHandler]
        : [];

    this.routes.push({
      method,
      pattern,
      handler,
      preHandlers: routePreHandlers,
    });

    return this;
  }

  get(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("GET", pattern, optionsOrHandler, maybeHandler);
  }

  post(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("POST", pattern, optionsOrHandler, maybeHandler);
  }

  put(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("PUT", pattern, optionsOrHandler, maybeHandler);
  }

  patch(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("PATCH", pattern, optionsOrHandler, maybeHandler);
  }

  delete(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("DELETE", pattern, optionsOrHandler, maybeHandler);
  }

  addHook(name, handler) {
    if (!this.hooks[name]) {
      this.hooks[name] = [];
    }
    this.hooks[name].push(handler);
    return this;
  }

  decorateRequest(name, value) {
    this.requestDecorations[name] = value;
    return this;
  }

  async runOnSendHooks(request, reply) {
    for (const hook of this.hooks.onSend) {
      await hook(request, reply, reply.payload);
    }
  }

  async handle(request, reply) {
    for (const [name, value] of Object.entries(this.requestDecorations)) {
      if (!(name in request)) {
        request[name] = value;
      }
    }

    for (const hook of this.hooks.onRequest) {
      await hook(request, reply);
      if (reply.sent) {
        await this.runOnSendHooks(request, reply);
        return reply;
      }
    }

    const pathname = getPathname(request.url);
    const route = this.routes.find((candidate) => {
      const methodMatches =
        candidate.method === request.method || (request.method === "HEAD" && candidate.method === "GET");
      if (!methodMatches) {
        return false;
      }
      return this.matchRoute(candidate.pattern, pathname);
    });

    if (!route) {
      await reply.code(404).send({ message: "Not found" });
      await this.runOnSendHooks(request, reply);
      return reply;
    }

    request.params = this.extractParams(route.pattern, pathname);
    request.query = this.parseQuery(request.url);

    for (const hook of this.hooks.preHandler) {
      await hook(request, reply);
      if (reply.sent) {
        await this.runOnSendHooks(request, reply);
        return reply;
      }
    }

    for (const preHandler of route.preHandlers) {
      await preHandler(request, reply);
      if (reply.sent) {
        await this.runOnSendHooks(request, reply);
        return reply;
      }
    }

    if (typeof route.handler !== "function") {
      throw new Error(`Route handler missing for ${route.method} ${route.pattern}`);
    }

    const result = await route.handler(request, reply);
    if (!reply.sent) {
      reply.send(result === undefined ? null : result);
    }

    await this.runOnSendHooks(request, reply);

    return reply;
  }

  matchRoute(pattern, pathname) {
    const patternParts = String(pattern || "").split("/").filter(Boolean);
    const pathParts = String(pathname || "").split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i += 1) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      if (patternPart.startsWith(":")) {
        continue;
      }
      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  extractParams(pattern, pathname) {
    const params = {};
    const patternParts = String(pattern || "").split("/").filter(Boolean);
    const pathParts = String(pathname || "").split("/").filter(Boolean);

    for (let i = 0; i < patternParts.length; i += 1) {
      const patternPart = patternParts[i];
      if (patternPart.startsWith(":")) {
        params[patternPart.slice(1)] = pathParts[i];
      }
    }

    return params;
  }

  parseQuery(url) {
    const queryString = String(url || "").split("?")[1] || "";
    const parsed = new URLSearchParams(queryString);
    const output = {};

    for (const [key, value] of parsed.entries()) {
      output[key] = value;
    }

    return output;
  }
}

class Reply {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.payload = null;
    this.sent = false;
  }

  code(statusCode) {
    this.statusCode = Number(statusCode) || 200;
    return this;
  }

  header(name, value) {
    this.headers.set(name, String(value));
    return this;
  }

  setCookie(name, value, options = {}) {
    this.headers.append("Set-Cookie", serializeCookie(name, String(value), options));
    return this;
  }

  clearCookie(name, options = {}) {
    this.headers.append(
      "Set-Cookie",
      serializeCookie(name, "", {
        ...options,
        expires: new Date(0),
        maxAge: 0,
      }),
    );
    return this;
  }

  send(payload) {
    this.payload = payload;
    this.sent = true;
    return this;
  }

  toResponse(requestMethod = "GET") {
    const statusCode = this.statusCode;
    const mustNotHaveBody = requestMethod === "HEAD" || [204, 205, 304].includes(statusCode);

    if (!mustNotHaveBody && !this.headers.has("Content-Type")) {
      if (typeof this.payload === "string") {
        this.headers.set("Content-Type", "text/plain; charset=utf-8");
      } else {
        this.headers.set("Content-Type", "application/json; charset=utf-8");
      }
    }

    let body = mustNotHaveBody ? null : this.payload;
    if (body === undefined) {
      body = null;
    }
    if (body !== null && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    return new Response(body, {
      status: statusCode,
      headers: this.headers,
    });
  }
}

let firebaseJwksPromise = null;
let firebaseJwksExpiresAt = 0;

function base64UrlDecode(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
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

function createWorkerFirebaseAdmin(env) {
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

          const cryptoKey = await crypto.subtle.importKey(
            "jwk",
            signingKey,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"],
          );

          const signedContent = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
          const verified = await crypto.subtle.verify(
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

const EMPTY_ENV = Object.freeze({});
const appPromisesByEnv = new WeakMap();

async function getWorkerApp(env) {
  const workerEnv = env && typeof env === "object" ? env : EMPTY_ENV;
  const cachedAppPromise = appPromisesByEnv.get(workerEnv);
  if (cachedAppPromise) {
    return cachedAppPromise;
  }

  const appPromise = (async () => {
    const db = createDbClient(workerEnv);
    const fastify = new WorkerRouter(db);

    const isProductionEnv = String(workerEnv.ENVIRONMENT || "").toLowerCase() === "production";
    const useSecureCookies =
      workerEnv.COOKIE_SECURE != null
        ? parseBooleanEnv(workerEnv.COOKIE_SECURE, true)
        : isProductionEnv;

    const requestedCookieSameSite = String(workerEnv.COOKIE_SAMESITE || (useSecureCookies ? "none" : "lax"))
      .trim()
      .toLowerCase();

    const cookieSameSite =
      requestedCookieSameSite === "none" && !useSecureCookies ? "lax" : requestedCookieSameSite;

    const sessionDurationDays = parseIntegerEnv(workerEnv.SESSION_DURATION_DAYS, 7);
    const mutationRateLimitMax = parseIntegerEnv(workerEnv.MUTATION_RATE_LIMIT_MAX, 120);
    const enforceOriginCheck = parseBooleanEnv(workerEnv.ENFORCE_ORIGIN_CHECK, isProductionEnv);
    const allowNullOriginOnMutations = parseBooleanEnv(workerEnv.ALLOW_NULL_ORIGIN_ON_MUTATIONS, false);
    const allowHeaderSessionToken = parseBooleanEnv(workerEnv.ALLOW_HEADER_SESSION_TOKEN, false);

    const configuredCorsOrigins =
      workerEnv.CORS_ORIGIN ||
      workerEnv.CORS_ORIGINS ||
      "http://localhost:3000,http://localhost:5173,https://mindstores.vercel.app,https://mindstores.onrender.com";

    const allowedOrigins = configuredCorsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    const allowedOriginSet = new Set(allowedOrigins);
    const isOriginAllowed = (origin) => !origin || allowedOriginSet.has("*") || allowedOriginSet.has(origin);

    const adminAccess = createAdminAccessService(db, {
      bootstrapEmails: String(workerEnv.ADMIN_EMAILS || "")
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
        const headerToken = request.headers?.["x-session-token"];
        if (typeof headerToken === "string" && headerToken.trim()) {
          return headerToken.trim();
        }
      }

      return null;
    };

    const hashSessionToken = async (token) => {
      const data = new TextEncoder().encode(String(token));
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    };

    const createSessionToken = () => {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    };

    const firebaseAdmin = createWorkerFirebaseAdmin(workerEnv);

    const getBearerTokenFromRequest = (request) => {
      const authorization = request.headers?.authorization || request.headers?.Authorization;
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
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
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

    fastify.decorateRequest("user", null);

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
      const isMutatingApiRequest = isBackendApiRoute(pathName) && MUTATING_METHODS.has(request.method);

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
      appendSecurityHeaders(reply.headers, getPathname(request.url), useSecureCookies);

      return payload;
    });

    const routeDeps = {
      admin: firebaseAdmin,
      uuidv4: () => crypto.randomUUID(),
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
  })();

  appPromisesByEnv.set(workerEnv, appPromise);
  return appPromise;
}

function getRequestBodyLimitBytes(env = {}) {
  return parseIntegerEnv(env.REQUEST_BODY_LIMIT_BYTES, 1_048_576);
}

function getContentLength(headers) {
  const contentLength = Number.parseInt(headers.get("content-length") || "", 10);
  return Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null;
}

function assertBodyWithinLimit(rawText, maxBytes) {
  const byteLength = new TextEncoder().encode(rawText).byteLength;
  if (byteLength > maxBytes) {
    throw new Error("BODY_TOO_LARGE");
  }
}

async function parseRequestBody(request, maxBytes) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType) {
    return null;
  }

  const contentLength = getContentLength(request.headers);
  if (contentLength != null && contentLength > maxBytes) {
    throw new Error("BODY_TOO_LARGE");
  }

  if (contentType.includes("application/json")) {
    const rawText = await request.text();
    assertBodyWithinLimit(rawText, maxBytes);
    if (!rawText.trim()) {
      return {};
    }
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error("INVALID_JSON");
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const rawText = await request.text();
    assertBodyWithinLimit(rawText, maxBytes);
    const params = new URLSearchParams(rawText);
    const output = {};
    for (const [key, value] of params.entries()) {
      output[key] = value;
    }
    return output;
  }

  const rawText = await request.text();
  assertBodyWithinLimit(rawText, maxBytes);
  return rawText;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const fastify = await getWorkerApp(env);
    const requestBodyLimitBytes = getRequestBodyLimitBytes(env);

    const cookieHeader = request.headers.get("cookie") || "";
    const nodeLikeRequest = {
      method: request.method.toUpperCase(),
      url: `${url.pathname}${url.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: parseCookie(cookieHeader),
      ip: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
      protocol: url.protocol,
      host: url.host,
      body: null,
    };

    const reply = new Reply();

    try {
      nodeLikeRequest.body = await parseRequestBody(request, requestBodyLimitBytes);
    } catch (error) {
      if (String(error?.message || "") === "INVALID_JSON") {
        return createJsonResponse(request, env, 400, { message: "Invalid JSON body" });
      }
      if (String(error?.message || "") === "BODY_TOO_LARGE") {
        return createJsonResponse(request, env, 413, { message: "Request body too large" });
      }

      return createJsonResponse(request, env, 400, { message: "Unable to parse request body" });
    }

    try {
      await fastify.handle(nodeLikeRequest, reply);
      return reply.toResponse(nodeLikeRequest.method);
    } catch (error) {
      console.error("Worker runtime error", error);
      return createJsonResponse(request, env, 500, { message: "Internal server error" });
    }
  },
};
