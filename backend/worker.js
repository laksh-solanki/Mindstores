import { parse as parseCookie, serialize as serializeCookie } from "cookie";

import { createDbClient } from "./db.js";

import registerAuthRoutes from "./routes/auth.js";
import registerCartRoutes from "./routes/cart.js";
import registerCheckoutRoutes from "./routes/checkout.js";
import registerOrderRoutes from "./routes/orders.js";
import registerProductRoutes from "./routes/products.js";
import registerRootRoutes from "./routes/root.js";

const API_PATH_PREFIXES = ["/auth", "/cart", "/checkout", "/orders", "/products"];
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

class FastifyLikeWorker {
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

  async handle(request, reply) {
    for (const [name, value] of Object.entries(this.requestDecorations)) {
      if (!(name in request)) {
        request[name] = value;
      }
    }

    for (const hook of this.hooks.onRequest) {
      await hook(request, reply);
      if (reply.sent) {
        return reply;
      }
    }

    const pathname = getPathname(request.url);
    const route = this.routes.find((candidate) => {
      if (candidate.method !== request.method) {
        return false;
      }
      return this.matchRoute(candidate.pattern, pathname);
    });

    if (!route) {
      await reply.code(404).send({ message: "Not found" });
      return reply;
    }

    request.params = this.extractParams(route.pattern, pathname);
    request.query = this.parseQuery(request.url);

    for (const hook of this.hooks.preHandler) {
      await hook(request, reply);
      if (reply.sent) {
        return reply;
      }
    }

    for (const preHandler of route.preHandlers) {
      await preHandler(request, reply);
      if (reply.sent) {
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

    for (const hook of this.hooks.onSend) {
      await hook(request, reply, reply.payload);
    }

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

  toResponse() {
    const statusCode = this.statusCode;
    const mustNotHaveBody = [204, 205, 304].includes(statusCode);

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

let appPromise = null;

async function getWorkerApp(env) {
  if (appPromise) {
    return appPromise;
  }

  appPromise = (async () => {
    const db = createDbClient(env);
    const fastify = new FastifyLikeWorker(db);

    const isProductionEnv = String(env.ENVIRONMENT || "").toLowerCase() === "production";
    const useSecureCookies =
      env.COOKIE_SECURE != null
        ? parseBooleanEnv(env.COOKIE_SECURE, true)
        : isProductionEnv;

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

    const configuredCorsOrigins =
      env.CORS_ORIGIN ||
      env.CORS_ORIGINS ||
      "http://localhost:3000,http://localhost:5173,https://mindstores.vercel.app,https://mindstores.onrender.com";

    const allowedOrigins = configuredCorsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    const allowedOriginSet = new Set(allowedOrigins);
    const isOriginAllowed = (origin) => !origin || allowedOriginSet.has("*") || allowedOriginSet.has(origin);

    const adminEmails = new Set(
      String(env.ADMIN_EMAILS || "lakshsolanki848@gmail.com")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );

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

    const getCurrentUser = async (request) => {
      const token = getSessionTokenFromRequest(request);
      if (!token) {
        return null;
      }

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

      const normalizedEmail = String(user.email || "").toLowerCase().trim();
      return {
        ...user,
        is_admin: adminEmails.has(normalizedEmail),
      };
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
      if (!adminEmails.has(normalizedEmail)) {
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
        reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token");
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
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("X-Frame-Options", "DENY");
      reply.header("Referrer-Policy", "no-referrer");
      reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      reply.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      reply.header("X-Permitted-Cross-Domain-Policies", "none");

      if (isBackendApiRoute(getPathname(request.url))) {
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
      admin: createWorkerFirebaseAdmin(env),
      uuidv4: () => crypto.randomUUID(),
      createSessionToken,
      hashSessionToken,
      useSecureCookies,
      cookieSameSite,
      sessionDurationDays,
      ADMIN_EMAILS: adminEmails,
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

    return fastify;
  })();

  return appPromise;
}

async function parseRequestBody(request) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType) {
    return null;
  }

  if (contentType.includes("application/json")) {
    const rawText = await request.text();
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
    const params = new URLSearchParams(rawText);
    const output = {};
    for (const [key, value] of params.entries()) {
      output[key] = value;
    }
    return output;
  }

  return await request.text();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const fastify = await getWorkerApp(env);

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
      nodeLikeRequest.body = await parseRequestBody(request);
    } catch (error) {
      if (String(error?.message || "") === "INVALID_JSON") {
        return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }

      return new Response(JSON.stringify({ message: "Unable to parse request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    try {
      await fastify.handle(nodeLikeRequest, reply);
      return reply.toResponse();
    } catch (error) {
      console.error("Worker runtime error", error);
      return new Response(JSON.stringify({ message: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  },
};
