import { parseBooleanEnv, parseIntegerEnv } from "./utils.js";

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://mindstores.vercel.app",
  "https://mindstores.onrender.com",
];

const API_PREFIXES = ["/admin", "/auth", "/cart", "/checkout", "/orders", "/products"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ─── CORS ──────────────────────────────────────────────────────────────────

export function getAllowedOrigins(env = {}) {
  const raw = env.CORS_ORIGINS ?? env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGINS.join(",");
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

function getOriginFromRequest(request) {
  const origin = request.headers.get("origin");
  if (origin?.trim()) return origin.trim();
  const referer = request.headers.get("referer");
  if (referer?.trim()) {
    try { return new URL(referer).origin; } catch { return null; }
  }
  return null;
}

// ─── Security headers ──────────────────────────────────────────────────────

export function applySecurityHeaders(headers, pathname, useSecureCookies) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  const isApiRoute = API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isApiRoute) {
    headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  }

  if (useSecureCookies) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

// ─── Rate limiting ─────────────────────────────────────────────────────────

const rateLimitStore = new Map();

export function createRateLimiter({ keyPrefix, windowMs, maxRequests }) {
  return function checkRateLimit(ip) {
    const now = Date.now();
    const key = `${keyPrefix}:${ip}`;
    let state = rateLimitStore.get(key);

    if (!state || state.resetAt <= now) {
      state = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, state);
    }

    state.count += 1;

    // Periodic cleanup
    if (rateLimitStore.size > 10_000) {
      for (const [k, s] of rateLimitStore) {
        if (s.resetAt <= now) rateLimitStore.delete(k);
      }
    }

    if (state.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
      return { limited: true, retryAfter };
    }

    return { limited: false };
  };
}

// ─── Response factories ────────────────────────────────────────────────────

export function jsonResponse(body, status, extraHeaders, origin, allowedOrigins, useSecureCookies, pathname) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, String(v));
  }

  applySecurityHeaders(headers, pathname ?? "/", useSecureCookies ?? false);

  return new Response(JSON.stringify(body), { status, headers });
}

// ─── Cookie parsing ────────────────────────────────────────────────────────

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of String(cookieHeader).split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value.replace(/\+/g, " "));
  }
  return cookies;
}

export function serializeCookie(name, value, options = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.path) str += `; Path=${options.path}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) str += "; HttpOnly";
  if (options.secure) str += "; Secure";
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}

// ─── Request body parsing ──────────────────────────────────────────────────

export async function parseBody(request, maxBytes) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const ct = request.headers.get("content-type") ?? "";
  if (!ct) return null;

  const cl = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(cl) && cl > maxBytes) throw new Error("BODY_TOO_LARGE");

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("BODY_TOO_LARGE");

  if (ct.includes("application/json")) {
    if (!text.trim()) return {};
    try { return JSON.parse(text); }
    catch { throw new Error("INVALID_JSON"); }
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(text);
    const out = {};
    for (const [k, v] of params) out[k] = v;
    return out;
  }

  return text;
}

// ─── Middleware pipeline context ───────────────────────────────────────────

export function getRequestIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function getMiddlewareConfig(env = {}) {
  const isProduction = String(env.ENVIRONMENT ?? "").toLowerCase() === "production";
  const useSecureCookies = env.COOKIE_SECURE != null
    ? parseBooleanEnv(env.COOKIE_SECURE, true)
    : isProduction;
  const enforceOriginCheck = parseBooleanEnv(env.ENFORCE_ORIGIN_CHECK, isProduction);
  const allowNullOriginOnMutations = parseBooleanEnv(env.ALLOW_NULL_ORIGIN_ON_MUTATIONS, false);
  const maxBodyBytes = parseIntegerEnv(env.REQUEST_BODY_LIMIT_BYTES, 1_048_576);
  const allowedOrigins = getAllowedOrigins(env);
  const requestedSameSite = String(env.COOKIE_SAMESITE ?? (useSecureCookies ? "none" : "lax")).trim().toLowerCase();
  const cookieSameSite = requestedSameSite === "none" && !useSecureCookies ? "lax" : requestedSameSite;

  return {
    isProduction,
    useSecureCookies,
    enforceOriginCheck,
    allowNullOriginOnMutations,
    maxBodyBytes,
    allowedOrigins,
    cookieSameSite,
    sessionDurationDays: parseIntegerEnv(env.SESSION_DURATION_DAYS, 7),
    adminEmails: String(env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean),
  };
}

export { getOriginFromRequest, API_PREFIXES, MUTATING_METHODS };
