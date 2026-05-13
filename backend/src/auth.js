import { base64UrlDecode, decodeJwtPart, sha256Hex, createSessionToken, randomUUID, normalizeText, parseBooleanEnv, parseIntegerEnv } from "./utils.js";

// ─── Firebase JWT verification ─────────────────────────────────────────────

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let _jwksCache = null;
let _jwksExpiry = 0;

async function getFirebaseJwks() {
  const now = Date.now();
  if (_jwksCache && _jwksExpiry > now) return _jwksCache;

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Firebase JWKS: ${res.status}`);

  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = (maxAgeMatch ? Number(maxAgeMatch[1]) : 3600) * 1000;
  _jwksExpiry = now + Math.max(60_000, maxAgeMs - 60_000);

  _jwksCache = res.json();
  return _jwksCache;
}

export async function verifyFirebaseIdToken(idToken, projectId) {
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required");

  const [encodedHeader, encodedPayload, encodedSignature] = String(idToken ?? "").split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error("Invalid token structure");

  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported token header");

  const jwks = await getFirebaseJwks();
  const key = (jwks.keys ?? []).find((k) => k.kid === header.kid);
  if (!key) { _jwksExpiry = 0; throw new Error("Signing key not found"); }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlDecode(encodedSignature);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData);

  const nowSec = Math.floor(Date.now() / 1000);
  const issuer = `https://securetoken.google.com/${projectId}`;

  if (
    !valid ||
    payload.aud !== projectId ||
    payload.iss !== issuer ||
    !payload.sub ||
    payload.sub.length > 128 ||
    Number(payload.exp ?? 0) <= nowSec ||
    Number(payload.iat ?? 0) > nowSec + 300
  ) {
    throw new Error("Token validation failed");
  }

  return { ...payload, uid: payload.user_id ?? payload.sub };
}

// ─── Session helpers ───────────────────────────────────────────────────────

export { createSessionToken, sha256Hex as hashSessionToken };

export function getSessionTokenFromRequest(request) {
  const cookieToken = request.cookies?.session_token;
  if (typeof cookieToken === "string" && cookieToken.trim()) return cookieToken.trim();
  return null;
}

// ─── Auth config from env ──────────────────────────────────────────────────

export function getAuthConfig(env = {}) {
  const isProduction = String(env.ENVIRONMENT ?? "").toLowerCase() === "production";
  const useSecureCookies = env.COOKIE_SECURE != null
    ? parseBooleanEnv(env.COOKIE_SECURE, true)
    : isProduction;

  const requestedSameSite = String(env.COOKIE_SAMESITE ?? (useSecureCookies ? "none" : "lax")).trim().toLowerCase();
  const cookieSameSite = requestedSameSite === "none" && !useSecureCookies ? "lax" : requestedSameSite;

  return {
    projectId: env.FIREBASE_PROJECT_ID ?? "",
    useSecureCookies,
    cookieSameSite,
    sessionDurationDays: parseIntegerEnv(env.SESSION_DURATION_DAYS, 7),
  };
}

// ─── User resolution ───────────────────────────────────────────────────────

export async function resolveCurrentUser(request, db, adminAccess, env = {}) {
  const cfg = getAuthConfig(env);

  // 1. Try session cookie
  const sessionToken = getSessionTokenFromRequest(request);
  if (sessionToken) {
    const tokenHash = await sha256Hex(sessionToken);
    const session = await db.collection("user_sessions").findOne({
      $or: [{ session_token_hash: tokenHash }, { session_token: sessionToken }],
    });

    if (session) {
      const expiresAtMs = new Date(session.expires_at ?? 0).getTime();
      if (Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()) {
        const user = await db.collection("users").findOne({ user_id: session.user_id }, { projection: { _id: 0 } });
        if (user) {
          const email = String(user.email ?? "").toLowerCase().trim();
          return { ...user, is_admin: await adminAccess.isAdminEmail(email) };
        }
      } else {
        // expired session — clean up silently
        db.collection("user_sessions").deleteOne({ _id: session._id }).catch(() => {});
      }
    }
  }

  // 2. Try Bearer token (Firebase ID token)
  const authHeader = request.headers?.authorization ?? request.headers?.Authorization ?? "";
  const bearerMatch = String(authHeader).trim().match(/^Bearer\s+(.+)$/i);
  const idToken = bearerMatch ? bearerMatch[1].trim() : null;

  if (idToken && idToken.length >= 100 && idToken.length <= 8000) {
    try {
      const decoded = await verifyFirebaseIdToken(idToken, cfg.projectId);
      const uid = normalizeText(decoded.uid ?? decoded.user_id ?? decoded.sub, 200);
      const email = normalizeText(decoded.email ?? "", 320).toLowerCase();
      if (!uid || !email) return null;

      const userId = `user_${uid}`;
      const now = new Date();
      const name = normalizeText(decoded.name ?? decoded.displayName ?? "", 120) || "User";
      const picture = normalizeText(decoded.picture ?? "", 2048) || null;

      await db.collection("users").updateOne(
        { user_id: userId },
        {
          $set: { email, name, picture, is_admin: await adminAccess.isAdminEmail(email), updated_at: now },
          $setOnInsert: { user_id: userId, created_at: now },
        },
        { upsert: true },
      );

      const user = await db.collection("users").findOne({ user_id: userId }, { projection: { _id: 0 } });
      if (user) {
        return { ...user, is_admin: await adminAccess.isAdminEmail(email) };
      }
    } catch {
      /* invalid token — fall through */
    }
  }

  return null;
}
