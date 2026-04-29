/**
 * Cloudflare Workers Entry Point
 * Adapts Fastify-like routing to work with Cloudflare Workers environment
 */

import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import { createDbClient } from "./db.js";

import registerRootRoutes from "./routes/root.js";
import registerAuthRoutes from "./routes/auth.js";
import registerProductRoutes from "./routes/products.js";
import registerCartRoutes from "./routes/cart.js";
import registerCheckoutRoutes from "./routes/checkout.js";
import registerOrderRoutes from "./routes/orders.js";

class FastifyWorker {
  constructor(db) {
    this.routes = [];
    this.hooks = { onRequest: [], onSend: [], preHandler: [] };
    this.mongo = { db };
    this.decorations = {};
    this.logger = console;
  }

  addRoute(method, url, optionsOrHandler, maybeHandler) {
    const options = typeof optionsOrHandler === "function" ? {} : optionsOrHandler || {};
    const handler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler;
    const preHandlers = Array.isArray(options.preHandler)
      ? options.preHandler
      : options.preHandler
        ? [options.preHandler]
        : [];

    this.routes.push({ method, url, handler, preHandlers });
    return this;
  }

  get(url, optionsOrHandler, maybeHandler) { return this.addRoute("GET", url, optionsOrHandler, maybeHandler); }
  post(url, optionsOrHandler, maybeHandler) { return this.addRoute("POST", url, optionsOrHandler, maybeHandler); }
  put(url, optionsOrHandler, maybeHandler) { return this.addRoute("PUT", url, optionsOrHandler, maybeHandler); }
  delete(url, optionsOrHandler, maybeHandler) { return this.addRoute("DELETE", url, optionsOrHandler, maybeHandler); }
  patch(url, optionsOrHandler, maybeHandler) { return this.addRoute("PATCH", url, optionsOrHandler, maybeHandler); }

  register(plugin, options) { plugin(this, options); return this; }
  decorateRequest(property, value) { this.decorations[property] = value; }
  addHook(event, handler) { if (this.hooks[event]) this.hooks[event].push(handler); return this; }

  async handle(request, reply) {
    for (const hook of this.hooks.onRequest) { await hook(request, reply); if (reply.sent) return reply; }
    const route = this.routes.find(r => r.method === request.method && this.matchRoute(r.url, request.url));
    if (!route) { await reply.code(404).send({ message: "Not found" }); return reply; }
    request.params = this.extractParams(route.url, request.url);
    request.query = this.parseQuery(request.url);
    for (const hook of this.hooks.preHandler) { await hook(request, reply); if (reply.sent) return reply; }
    for (const hook of route.preHandlers) { await hook(request, reply); if (reply.sent) return reply; }

    if (typeof route.handler !== "function") {
      throw new Error(`Route handler missing for ${route.method} ${route.url}`);
    }

    const result = await route.handler(request, reply);
    if (!reply.sent) {
      reply.send(result === undefined ? null : result);
    }
    for (const hook of this.hooks.onSend) { await hook(request, reply, reply._payload); }
    return reply;
  }

  matchRoute(pattern, url) {
    const patternParts = pattern.split("/").filter(Boolean);
    const urlParts = url.split("?").shift().split("/").filter(Boolean);
    if (patternParts.length !== urlParts.length) return pattern.includes("*");
    return patternParts.every((part, i) => part.startsWith(":") || part === urlParts[i]);
  }

  extractParams(pattern, url) {
    const params = {};
    const patternParts = pattern.split("/").filter(Boolean);
    const urlParts = url.split("?").shift().split("/").filter(Boolean);
    patternParts.forEach((part, i) => { if (part.startsWith(":")) params[part.slice(1)] = urlParts[i]; });
    return params;
  }

  parseQuery(url) {
    const queryString = url.split("?")[1] || "";
    const params = new URLSearchParams(queryString);
    const query = {};
    for (const [key, value] of params) query[key] = value;
    return query;
  }
}

class Reply {
  constructor() { this._statusCode = 200; this._headers = new Headers(); this._payload = null; this.sent = false; }
  code(statusCode) { this._statusCode = statusCode; return this; }
  header(name, value) { this._headers.set(name, String(value)); return this; }
  setCookie(name, value, options = {}) {
    this._headers.append("Set-Cookie", serializeCookie(name, value, options));
    return this;
  }
  clearCookie(name, options = {}) {
    this._headers.append(
      "Set-Cookie",
      serializeCookie(name, "", {
        ...options,
        expires: new Date(0),
        maxAge: 0,
      }),
    );
    return this;
  }
  send(payload) { this._payload = payload; this.sent = true; return this; }
}

let fastifyInstance = null;
let firebaseKeysPromise = null;
let firebaseKeysExpiresAt = 0;

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
  if (firebaseKeysPromise && firebaseKeysExpiresAt > now) {
    return firebaseKeysPromise;
  }

  firebaseKeysPromise = fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load Firebase public keys: ${response.status}`);
    }
    const cacheControl = response.headers.get("cache-control") || "";
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
    firebaseKeysExpiresAt = Date.now() + Math.max(60, maxAgeSeconds - 60) * 1000;
    return await response.json();
  });

  return firebaseKeysPromise;
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
          const key = jwks.keys?.find((candidate) => candidate.kid === header.kid);
          if (!key) {
            firebaseKeysExpiresAt = 0;
            throw new Error("Firebase signing key not found");
          }

          const cryptoKey = await crypto.subtle.importKey(
            "jwk",
            key,
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

          const now = Math.floor(Date.now() / 1000);
          const expectedIssuer = `https://securetoken.google.com/${projectId}`;
          if (
            !verified ||
            payload.aud !== projectId ||
            payload.iss !== expectedIssuer ||
            !payload.sub ||
            payload.sub.length > 128 ||
            Number(payload.exp || 0) <= now ||
            Number(payload.iat || 0) > now + 300
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

async function getFastify(env) {
  if (fastifyInstance) return fastifyInstance;

  const db = createDbClient(env);
  const fastify = new FastifyWorker(db);
  const isProduction = env.ENVIRONMENT === "production";
  const configuredCorsOrigins =
    env.CORS_ORIGIN ||
    env.CORS_ORIGINS ||
    "http://localhost:3000,http://localhost:5173,https://mindstores.vercel.app,https://mindstores.onrender.com";
  const allowedOrigins = new Set(
    configuredCorsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const isOriginAllowed = (origin) =>
    !origin || allowedOrigins.has("*") || allowedOrigins.has(origin);

  const rateLimitStore = new Map();
  const createRateLimitGuard = ({ keyPrefix, windowMs, maxRequests }) => async (request, reply) => {
    const ipAddress = request.ip || "unknown";
    const key = `${keyPrefix}:${ipAddress}`;
    const now = Date.now();
    let state = rateLimitStore.get(key);
    if (!state || state.resetAt <= now) { state = { count: 0, resetAt: now + windowMs }; rateLimitStore.set(key, state); }
    state.count += 1;
    if (state.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
      reply.header("Retry-After", String(retryAfter));
      await reply.code(429).send({ message: "Too many requests. Please try again later." });
      return;
    }
  };

  const mutationRateLimitGuard = createRateLimitGuard({ keyPrefix: "mutation", windowMs: 60_000, maxRequests: 120 });

  fastify.addHook("onSend", async (request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    if (request.url.startsWith("/api/")) {
      reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    }
    if (isProduction) reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    return payload;
  });

  fastify.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin || request.headers.referer?.split("/").slice(0, 3).join("/");
    if (request.method === "OPTIONS") {
      if (isProduction && origin && !isOriginAllowed(origin)) {
        await reply.code(403).send({ message: "Forbidden origin" });
        return;
      }
      reply.header("Access-Control-Allow-Origin", origin && isOriginAllowed(origin) ? origin : "*");
      reply.header("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token");
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Vary", "Origin");
      await reply.code(204).send("");
      return;
    }

    if (origin && isOriginAllowed(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Vary", "Origin");
    }

    if (
      isProduction &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      origin &&
      !isOriginAllowed(origin)
    ) {
      await reply.code(403).send({ message: "Forbidden origin" });
    }
  });

  const routeDeps = {
    admin: createFirebaseAdmin(env),
    uuidv4: () => crypto.randomUUID(),
    createSessionToken: () => { const array = new Uint8Array(32); crypto.getRandomValues(array); return Array.from(array, b => b.toString(16).padStart(2, "0")).join(""); },
    hashSessionToken: async (token) => {
      const msgUint8 = new TextEncoder().encode(token);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    },
    useSecureCookies: isProduction,
    cookieSameSite: isProduction ? "none" : "lax",
    sessionDurationDays: 7,
    ADMIN_EMAILS: new Set(["lakshsolanki848@gmail.com"]),
    requireAuth: async (request, reply) => { if (!request.user) { await reply.code(401).send({ message: "Not authenticated" }); return false; } return true; },
    requireAdmin: async (request, reply) => { if (!(await routeDeps.requireAuth(request, reply))) return false; const normalizedEmail = (request.user.email || "").toLowerCase().trim(); if (!routeDeps.ADMIN_EMAILS.has(normalizedEmail)) { await reply.code(403).send({ message: "Admin access required" }); return false; } return true; },
    createRateLimitGuard,
    getSessionTokenFromRequest: (request) => { 
      const cookieHeader = request.headers.cookie; 
      if (cookieHeader) { 
        const cookies = parseCookie(cookieHeader); 
        if (cookies && cookies.session_token) return cookies.session_token; 
      } 
      return request.headers["x-session-token"] || null; 
    },
  };

  // Auth Middleware
  fastify.addHook("onRequest", async (request, reply) => {
    const token = routeDeps.getSessionTokenFromRequest(request);
    if (token) {
      const tokenHash = await routeDeps.hashSessionToken(token);
      const session = await db.collection("user_sessions").findOne({ 
        $or: [{ session_token_hash: tokenHash }, { session_token: token }] 
      });
      if (session && new Date(session.expires_at) > new Date()) {
        request.user = await db.collection("users").findOne({ user_id: session.user_id });
      }
    }
  });

  await registerRootRoutes(fastify, routeDeps);
  await registerAuthRoutes(fastify, routeDeps);
  await registerProductRoutes(fastify, routeDeps);
  await registerCartRoutes(fastify, routeDeps);
  await registerCheckoutRoutes(fastify, routeDeps);
  await registerOrderRoutes(fastify, routeDeps);

  fastifyInstance = fastify;
  return fastify;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const fastify = await getFastify(env);

    const req = {
      method: request.method,
      url: url.pathname + url.search,
      headers: Object.fromEntries(request.headers),
      body: null,
      ip: request.headers.get("cf-connecting-ip") || "unknown",
      protocol: url.protocol,
      host: url.host,
    };

    const reply = new Reply();

    try {
      if (["POST", "PUT", "PATCH"].includes(request.method)) {
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const text = await request.text();
          req.body = text ? JSON.parse(text) : null;
        } else {
          req.body = await request.text();
        }
      }

      await fastify.handle(req, reply);

      const headers = new Headers(reply._headers);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

      const body = typeof reply._payload === "string" ? reply._payload : JSON.stringify(reply._payload);
      return new Response(body, { status: reply._statusCode, headers });
    } catch (error) {
      console.error("Worker Error:", error);
      return new Response(JSON.stringify({ message: "Internal server error", error: error.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  },
};

