import { createDb } from "./src/db.js";
import { resolveCurrentUser, getAuthConfig } from "./src/auth.js";
import { createAdminAccessService } from "./src/adminAccess.js";
import {
  parseCookies, parseBody, jsonResponse, applySecurityHeaders,
  getOriginFromRequest, getAllowedOrigins, isOriginAllowed,
  getRequestIp, getMiddlewareConfig, createRateLimiter,
  MUTATING_METHODS, API_PREFIXES,
} from "./src/middleware.js";

// ─── Route handlers ────────────────────────────────────────────────────────

import { handleRoot } from "./src/routes/root.js";
import {
  handleFirebaseLogin, handleAuthMe, handleUpdateProfile, handleLogout,
} from "./src/routes/auth.js";
import {
  handleGetProducts, handleGetProduct,
  handleCreateProduct, handleUpdateProduct, handleDeleteProduct,
} from "./src/routes/products.js";
import {
  handleGetCart, handleCartAdd, handleCartRemove, handleCartUpdate,
} from "./src/routes/cart.js";
import { handlePlaceOrder } from "./src/routes/checkout.js";
import { handleGetOrders } from "./src/routes/orders.js";
import {
  handleGetAdminAccess, handleAddAdminAccess,
  handleUpdateAdminAccess, handleDeleteAdminAccess,
  handleGetAdminUsers,
} from "./src/routes/admin.js";

// ─── Router ────────────────────────────────────────────────────────────────

/**
 * Minimal pattern-matching router.
 * Patterns support :param segments. Returns { handler, params } or null.
 */
const ROUTES = [
  // Root
  { method: "GET",    pattern: "/",                          handler: handleRoot },

  // Auth
  { method: "POST",   pattern: "/auth/firebase-login",       handler: handleFirebaseLogin },
  { method: "GET",    pattern: "/auth/me",                   handler: handleAuthMe },
  { method: "PUT",    pattern: "/auth/profile",              handler: handleUpdateProfile },
  { method: "POST",   pattern: "/auth/logout",               handler: handleLogout },

  // Products (public reads)
  { method: "GET",    pattern: "/products",                  handler: handleGetProducts },
  { method: "GET",    pattern: "/products/:id",              handler: handleGetProduct },

  // Products (admin writes)
  { method: "POST",   pattern: "/products",                  handler: handleCreateProduct },
  { method: "PUT",    pattern: "/products/:id",              handler: handleUpdateProduct },
  { method: "DELETE", pattern: "/products/:id",              handler: handleDeleteProduct },

  // Cart
  { method: "GET",    pattern: "/cart",                      handler: handleGetCart },
  { method: "POST",   pattern: "/cart/add",                  handler: handleCartAdd },
  { method: "POST",   pattern: "/cart/remove",               handler: handleCartRemove },
  { method: "POST",   pattern: "/cart/update",               handler: handleCartUpdate },

  // Checkout
  { method: "POST",   pattern: "/checkout/place-order",      handler: handlePlaceOrder },

  // Orders
  { method: "GET",    pattern: "/orders",                    handler: handleGetOrders },

  // Admin
  { method: "GET",    pattern: "/admin/access",              handler: handleGetAdminAccess },
  { method: "POST",   pattern: "/admin/access",              handler: handleAddAdminAccess },
  { method: "PUT",    pattern: "/admin/access/:email",       handler: handleUpdateAdminAccess },
  { method: "DELETE", pattern: "/admin/access/:email",       handler: handleDeleteAdminAccess },
  { method: "GET",    pattern: "/admin/users",               handler: handleGetAdminUsers },
];

function matchRoute(method, pathname) {
  for (const route of ROUTES) {
    if (route.method !== method && !(method === "HEAD" && route.method === "GET")) continue;

    const patternParts = route.pattern.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let matched = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) return { handler: route.handler, params };
  }
  return null;
}

// ─── Per-instance singleton state ──────────────────────────────────────────

const instanceState = new WeakMap();

function getInstanceState(env) {
  const key = env && typeof env === "object" ? env : {};
  if (instanceState.has(key)) return instanceState.get(key);

  const state = (async () => {
    const cfg = getMiddlewareConfig(env);
    const db = createDb(env);
    const adminAccess = createAdminAccessService(db, { bootstrapEmails: cfg.adminEmails });
    await adminAccess.ensureSeeded();

    // Global mutation rate limiter (last line of defence)
    const globalMutationLimiter = createRateLimiter({
      keyPrefix: "global:mutation",
      windowMs: 60_000,
      maxRequests: cfg.mutationRateLimitMax ?? 120,
    });

    return { cfg, db, adminAccess, globalMutationLimiter };
  })();

  instanceState.set(key, state);
  return state;
}

// ─── Worker entry point ────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    let cfg, db, adminAccess, globalMutationLimiter;
    try {
      ({ cfg, db, adminAccess, globalMutationLimiter } = await getInstanceState(env));
    } catch (initErr) {
      console.error("[worker] init error", initErr);
      return new Response(JSON.stringify({ message: "Service initialisation failed" }), {
        status: 503,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const origin = getOriginFromRequest(request);
    const ip = getRequestIp(request);

    // ── Helpers available to every route handler ──────────────────────────

    function makeResponse(body, status = 200, extraHeaders = {}) {
      return jsonResponse(body, status, extraHeaders, origin, cfg.allowedOrigins, cfg.useSecureCookies, pathname);
    }

    function errorResponse(status, message) {
      return makeResponse({ message }, status);
    }

    // ── CORS preflight ────────────────────────────────────────────────────

    if (method === "OPTIONS") {
      if (origin && !isOriginAllowed(origin, cfg.allowedOrigins)) {
        return errorResponse(403, "Forbidden origin");
      }

      const preflightHeaders = new Headers();
      if (origin && isOriginAllowed(origin, cfg.allowedOrigins)) {
        preflightHeaders.set("Access-Control-Allow-Origin", origin);
        preflightHeaders.set("Vary", "Origin");
      }
      preflightHeaders.set("Access-Control-Allow-Credentials", "true");
      preflightHeaders.set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
      preflightHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      preflightHeaders.set("Access-Control-Max-Age", "86400");
      applySecurityHeaders(preflightHeaders, pathname, cfg.useSecureCookies);
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    // ── Origin check for mutating API routes ──────────────────────────────

    const isApiRoute = API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const isMutating = isApiRoute && MUTATING_METHODS.has(method);

    if (isMutating && cfg.enforceOriginCheck) {
      if (!origin && !cfg.allowNullOriginOnMutations) {
        return errorResponse(403, "Missing origin");
      }
      if (origin && !isOriginAllowed(origin, cfg.allowedOrigins)) {
        return errorResponse(403, "Forbidden origin");
      }
    }

    // ── Global mutation rate limit ─────────────────────────────────────────

    if (isMutating) {
      const check = globalMutationLimiter(ip);
      if (check.limited) {
        return makeResponse({ message: "Too many requests. Please try again later." }, 429, {
          "Retry-After": String(check.retryAfter),
        });
      }
    }

    // ── Parse body ────────────────────────────────────────────────────────

    let body = null;
    try {
      body = await parseBody(request, cfg.maxBodyBytes);
    } catch (err) {
      if (err.message === "BODY_TOO_LARGE") return errorResponse(413, "Request body too large");
      if (err.message === "INVALID_JSON")   return errorResponse(400, "Invalid JSON body");
      return errorResponse(400, "Unable to parse request body");
    }

    // ── Resolve current user ──────────────────────────────────────────────

    const cookies = parseCookies(request.headers.get("cookie") ?? "");
    const enrichedRequest = { ...request, cookies, headers: request.headers };
    const user = await resolveCurrentUser(enrichedRequest, db, adminAccess, env).catch((err) => {
      console.error("[worker] user resolution error", err);
      return null;
    });

    // ── Route matching ────────────────────────────────────────────────────

    const match = matchRoute(method, pathname);
    if (!match) {
      return errorResponse(404, "Not found");
    }

    // ── Route context ─────────────────────────────────────────────────────

    const query = {};
    for (const [k, v] of url.searchParams) query[k] = v;

    const ctx = {
      request: enrichedRequest,
      db,
      adminAccess,
      cfg,
      user,
      body,
      params: match.params,
      query,
      ip,
      json: makeResponse,
      error: errorResponse,
    };

    // ── Execute handler ───────────────────────────────────────────────────

    try {
      const result = await match.handler(ctx);

      // If handler returned a raw Response, pass through
      if (result instanceof Response) return result;

      // Otherwise wrap the returned value
      return makeResponse(result ?? null);
    } catch (err) {
      console.error(`[worker] unhandled error in ${method} ${pathname}`, err);
      return errorResponse(500, "Internal server error");
    }
  },
};
