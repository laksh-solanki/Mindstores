import { normalizeText, sha256Hex, createSessionToken } from "../utils.js";
import { verifyFirebaseIdToken, getAuthConfig } from "../auth.js";
import { normalizeAdminEmail } from "../adminAccess.js";
import { serializeCookie } from "../middleware.js";

// ─── Normalization helpers ─────────────────────────────────────────────────

function normalizeLocale(v) { return normalizeText(v, 48) || null; }
function normalizeProfileName(v) { return normalizeText(v, 120) || null; }

function normalizeCountryCode(v) {
  const s = normalizeText(v, 8).toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

function extractCountryFromLocale(locale = "") {
  const m = String(locale).match(/^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$/i);
  return m ? m[1].toUpperCase() : null;
}

function normalizeImageUrl(v) {
  if (v == null) return null;
  const s = normalizeText(v);
  if (!s) return null;

  if (s.startsWith("data:image/")) {
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(s) && s.length <= 700_000 ? s : null;
  }
  if (s.length > 2048) return null;
  try {
    const u = new URL(s);
    return (u.protocol === "http:" || u.protocol === "https:") ? s : null;
  } catch { return null; }
}

async function buildUserResponse(user, adminAccess) {
  if (!user) return null;
  const email = String(user.email ?? "").toLowerCase().trim();
  return { ...user, is_admin: await adminAccess.isAdminEmail(email) };
}

function resolveCountryCode({ decodedToken, body, locale, existingUser }) {
  return (
    normalizeCountryCode(decodedToken?.country_code) ||
    normalizeCountryCode(decodedToken?.country) ||
    normalizeCountryCode(body?.country_code) ||
    normalizeCountryCode(body?.countryCode) ||
    normalizeCountryCode(extractCountryFromLocale(locale ?? "")) ||
    normalizeCountryCode(existingUser?.country_code) ||
    null
  );
}

// ─── Route handlers ────────────────────────────────────────────────────────

// POST /auth/firebase-login
export async function handleFirebaseLogin(ctx) {
  const { db, body, request, adminAccess, cfg } = ctx;
  const idToken = normalizeText(body?.idToken, 8000);

  if (!idToken || idToken.length < 100) {
    return ctx.error(400, "Valid ID Token required");
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken, cfg.projectId);
    const uid = normalizeText(decoded.uid ?? decoded.user_id, 200);
    const email = normalizeText(decoded.email ?? "", 320).toLowerCase();

    if (!uid || !email) return ctx.error(401, "Invalid Token");

    const userId = `user_${uid}`;
    const now = new Date();
    const existingUser = await db.collection("users").findOne({ user_id: userId }, { projection: { _id: 0 } });

    const locale = normalizeLocale(decoded.locale) || normalizeLocale(body?.locale) || normalizeLocale(existingUser?.locale) || null;
    const countryCode = resolveCountryCode({ decodedToken: decoded, body, locale, existingUser });
    const profileName = normalizeProfileName(decoded.name) || normalizeProfileName(existingUser?.name) || "User";
    const profilePicture = normalizeImageUrl(decoded.picture) || normalizeImageUrl(existingUser?.picture) || null;
    const isAdmin = await adminAccess.isAdminEmail(email);

    await db.collection("users").updateOne(
      { user_id: userId },
      {
        $set: { email, name: profileName, picture: profilePicture, locale, country_code: countryCode, is_admin: isAdmin, updated_at: now },
        $setOnInsert: { user_id: userId, created_at: now },
      },
      { upsert: true },
    );

    // Create session
    const sessionToken = createSessionToken();
    const sessionHash = await sha256Hex(sessionToken);
    const expiresAt = new Date(now.getTime() + cfg.sessionDurationDays * 86_400_000);

    await db.collection("user_sessions").insertOne({
      user_id: userId,
      session_token_hash: sessionHash,
      expires_at: expiresAt,
      created_at: now,
      user_agent: request.headers.get("user-agent") ?? null,
      ip_address: ctx.ip ?? null,
    });

    // Prune old sessions (keep newest 5 valid ones)
    const sessions = await db.collection("user_sessions")
      .find({ user_id: userId }, { projection: { _id: 1, expires_at: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .toArray();

    const toDelete = sessions
      .filter((s, i) => new Date(s.expires_at ?? 0).getTime() <= Date.now() || i >= 5)
      .map((s) => s._id).filter(Boolean);

    if (toDelete.length > 0) {
      await db.collection("user_sessions").deleteMany({ _id: { $in: toDelete } });
    }

    const cookieStr = serializeCookie("session_token", sessionToken, {
      httpOnly: true,
      secure: cfg.useSecureCookies,
      sameSite: cfg.cookieSameSite,
      path: "/",
      maxAge: cfg.sessionDurationDays * 86_400,
    });

    const user = await db.collection("users").findOne({ user_id: userId }, { projection: { _id: 0 } });
    return ctx.json({ user: await buildUserResponse(user, adminAccess) }, 200, {
      "Set-Cookie": cookieStr,
      "Cache-Control": "no-store",
    });
  } catch (err) {
    console.error("[auth/firebase-login]", err);
    return ctx.error(401, "Invalid Token");
  }
}

// GET /auth/me
export async function handleAuthMe(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  return ctx.json(await buildUserResponse(ctx.user, ctx.adminAccess), 200, { "Cache-Control": "no-store" });
}

// PUT /auth/profile
export async function handleUpdateProfile(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");

  const { body, db, adminAccess } = ctx;
  const updates = {};

  if (body != null && Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = normalizeProfileName(body.name);
    if (!name) return ctx.error(400, "Valid name is required");
    updates.name = name;
  }

  if (body != null && Object.prototype.hasOwnProperty.call(body, "picture")) {
    const pic = body.picture;
    if (pic == null || (typeof pic === "string" && !pic.trim())) {
      updates.picture = null;
    } else {
      const normalized = normalizeImageUrl(pic);
      if (!normalized) return ctx.error(400, "Profile image must be a valid image upload or http/https URL");
      updates.picture = normalized;
    }
  }

  if (body != null && (Object.prototype.hasOwnProperty.call(body, "country_code") || Object.prototype.hasOwnProperty.call(body, "countryCode"))) {
    const raw = Object.prototype.hasOwnProperty.call(body, "country_code") ? body.country_code : body.countryCode;
    if (raw == null || (typeof raw === "string" && !raw.trim())) {
      updates.country_code = null;
    } else {
      const cc = normalizeCountryCode(raw);
      if (!cc) return ctx.error(400, "country_code must be a 2-letter code");
      updates.country_code = cc;
    }
  }

  if (Object.keys(updates).length === 0) {
    return ctx.json(await buildUserResponse(ctx.user, adminAccess), 200, { "Cache-Control": "no-store" });
  }

  updates.updated_at = new Date();
  await db.collection("users").updateOne({ user_id: ctx.user.user_id }, { $set: updates });
  const updated = await db.collection("users").findOne({ user_id: ctx.user.user_id }, { projection: { _id: 0 } });
  return ctx.json(await buildUserResponse(updated, adminAccess), 200, { "Cache-Control": "no-store" });
}

// POST /auth/logout
export async function handleLogout(ctx) {
  const { db, request, cfg } = ctx;

  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = {};
    for (const part of cookieHeader.split(";")) {
      const idx = part.indexOf("=");
      if (idx < 0) continue;
      cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    const token = cookies["session_token"];
    if (token) {
      const hash = await sha256Hex(token);
      await db.collection("user_sessions").deleteMany({ $or: [{ session_token_hash: hash }, { session_token: token }] });
    }
  } catch (err) {
    console.error("[auth/logout]", err);
  }

  const clearCookie = serializeCookie("session_token", "", {
    httpOnly: true,
    secure: cfg.useSecureCookies,
    sameSite: cfg.cookieSameSite,
    path: "/",
    maxAge: 0,
  });

  return ctx.json({ message: "Logged out successfully" }, 200, {
    "Set-Cookie": clearCookie,
    "Cache-Control": "no-store",
  });
}
