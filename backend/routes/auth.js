function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizeText(value, { maxLength = 0, trim = true } = {}) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = trim ? value.trim() : value;
  if (!normalized) {
    return "";
  }
  if (maxLength > 0 && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }
  return normalized;
}

function normalizeLocale(value) {
  const locale = normalizeText(value, { maxLength: 48 });
  return locale || null;
}

function extractCountryCodeFromLocale(locale = "") {
  if (typeof locale !== "string") {
    return null;
  }
  const match = locale.trim().match(/^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$/i);
  return match ? match[1].toUpperCase() : null;
}

function normalizeCountryCode(value) {
  const normalized = normalizeText(value, { maxLength: 8 }).toUpperCase();
  if (!normalized) {
    return null;
  }
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normalizeProfileName(value) {
  const normalized = normalizeText(value, { maxLength: 120 });
  return normalized || null;
}

function normalizeImageUrl(value) {
  if (value == null) {
    return null;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("data:image/")) {
    const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(normalized);
    return isDataImage && normalized.length <= 700_000 ? normalized : null;
  }

  if (normalized.length > 2048) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return normalized;
}

function resolveCountryCode({ decodedToken, requestBody, locale, existingUser }) {
  const tokenCountry =
    normalizeCountryCode(decodedToken?.country_code) ||
    normalizeCountryCode(decodedToken?.country);

  const requestCountry =
    normalizeCountryCode(requestBody?.country_code) ||
    normalizeCountryCode(requestBody?.countryCode);

  const localeCountry = normalizeCountryCode(extractCountryCodeFromLocale(locale || ""));
  const existingCountry = normalizeCountryCode(existingUser?.country_code);

  return tokenCountry || requestCountry || localeCountry || existingCountry || null;
}

async function buildUserProjection(user, adminAccess) {
  if (!user) {
    return null;
  }
  const normalizedEmail = String(user.email || "").toLowerCase().trim();
  return {
    ...user,
    is_admin: await adminAccess.isAdminEmail(normalizedEmail),
  };
}

export default async function registerAuthRoutes(fastify, deps) {
  const {
    admin,
    createSessionToken,
    hashSessionToken,
    useSecureCookies,
    cookieSameSite,
    sessionDurationDays,
    adminAccess,
    requireAuth,
    createRateLimitGuard,
    getSessionTokenFromRequest,
  } = deps;

  const authReadRateLimit = createRateLimitGuard({
    keyPrefix: "auth:read",
    windowMs: 60_000,
    maxRequests: 60,
  });
  const authWriteRateLimit = createRateLimitGuard({
    keyPrefix: "auth:write",
    windowMs: 60_000,
    maxRequests: 20,
  });
  const authLoginRateLimit = createRateLimitGuard({
    keyPrefix: "auth:login",
    windowMs: 10 * 60_000,
    maxRequests: 10,
  });

  fastify.post(
    "/auth/firebase-login",
    { preHandler: [authWriteRateLimit, authLoginRateLimit] },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      const body = request.body && typeof request.body === "object" ? request.body : {};
      const idToken = normalizeText(body.idToken, { maxLength: 8_000, trim: true });

      if (!idToken || idToken.length < 100) {
        return reply.code(400).send({ message: "Valid ID Token required" });
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = normalizeText(decodedToken?.uid || decodedToken?.user_id, { maxLength: 200 });
        const normalizedEmail = normalizeText(decodedToken?.email, { maxLength: 320 }).toLowerCase();

        if (!uid || !normalizedEmail) {
          return reply.code(401).send({ message: "Invalid Token" });
        }

        const db = fastify.mongo.db;
        const userId = `user_${uid}`;
        const now = new Date();
        const existingUser = await db
          .collection("users")
          .findOne({ user_id: userId }, { projection: { _id: 0 } });

        const locale =
          normalizeLocale(decodedToken?.locale) ||
          normalizeLocale(body.locale) ||
          normalizeLocale(existingUser?.locale) ||
          null;

        const countryCode = resolveCountryCode({
          decodedToken,
          requestBody: body,
          locale,
          existingUser,
        });

        const profileName =
          normalizeProfileName(decodedToken?.name) ||
          normalizeProfileName(existingUser?.name) ||
          "User";

        const profilePicture =
          normalizeImageUrl(decodedToken?.picture) ||
          normalizeImageUrl(existingUser?.picture) ||
          null;

        const isAdminUser = await adminAccess.isAdminEmail(normalizedEmail);

        await db.collection("users").updateOne(
          { user_id: userId },
          {
            $set: {
              email: normalizedEmail,
              name: profileName,
              picture: profilePicture,
              locale,
              country_code: countryCode,
              is_admin: isAdminUser,
              updated_at: now,
            },
            $setOnInsert: {
              user_id: userId,
              created_at: now,
            },
          },
          { upsert: true },
        );

        const sessionToken = createSessionToken();
        const sessionTokenHash = await hashSessionToken(sessionToken);
        const expiresAt = new Date(now.getTime() + sessionDurationDays * 24 * 60 * 60 * 1000);

        await db.collection("user_sessions").insertOne({
          user_id: userId,
          session_token_hash: sessionTokenHash,
          expires_at: expiresAt,
          created_at: now,
          user_agent: request.headers?.["user-agent"] || null,
          ip_address: request.ip || null,
        });

        const existingSessions = await db
          .collection("user_sessions")
          .find({ user_id: userId }, { projection: { _id: 1, expires_at: 1, created_at: 1 } })
          .sort({ created_at: -1 })
          .toArray();

        const sessionIdsToDelete = existingSessions
          .filter((session, index) => {
            const isExpired = new Date(session.expires_at || 0).getTime() <= Date.now();
            return isExpired || index >= 5;
          })
          .map((session) => session._id)
          .filter(Boolean);

        if (sessionIdsToDelete.length > 0) {
          await db.collection("user_sessions").deleteMany({
            _id: { $in: sessionIdsToDelete },
          });
        }

        reply.setCookie("session_token", sessionToken, {
          httpOnly: true,
          secure: useSecureCookies,
          sameSite: cookieSameSite,
          path: "/",
          maxAge: sessionDurationDays * 24 * 60 * 60,
        });

        const user = await db
          .collection("users")
          .findOne({ user_id: userId }, { projection: { _id: 0 } });

        return { user: await buildUserProjection(user, adminAccess) };
      } catch (error) {
        fastify.log.error({ err: error, route: "/auth/firebase-login" });
        return reply.code(401).send({ message: "Invalid Token" });
      }
    },
  );

  fastify.get("/auth/me", { preHandler: [authReadRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAuth(request, reply))) {
      return;
    }

    return await buildUserProjection(request.user, adminAccess);
  });

  fastify.put("/auth/profile", { preHandler: [authWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAuth(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const updates = {};

    if (hasOwn(body, "name")) {
      const normalizedName = normalizeProfileName(body.name);
      if (!normalizedName) {
        return reply.code(400).send({ message: "Valid name is required" });
      }
      updates.name = normalizedName;
    }

    if (hasOwn(body, "picture")) {
      const pictureValue = body.picture;
      if (pictureValue == null || (typeof pictureValue === "string" && !pictureValue.trim())) {
        updates.picture = null;
      } else {
        const normalizedPicture = normalizeImageUrl(pictureValue);
        if (!normalizedPicture) {
          return reply.code(400).send({ message: "Profile image must be a valid image upload or http/https URL" });
        }
        updates.picture = normalizedPicture;
      }
    }

    if (hasOwn(body, "country_code") || hasOwn(body, "countryCode")) {
      const rawCountry = hasOwn(body, "country_code") ? body.country_code : body.countryCode;
      if (rawCountry == null || (typeof rawCountry === "string" && !rawCountry.trim())) {
        updates.country_code = null;
      } else {
        const normalizedCountry = normalizeCountryCode(rawCountry);
        if (!normalizedCountry) {
          return reply.code(400).send({ message: "country_code must be a 2-letter code" });
        }
        updates.country_code = normalizedCountry;
      }
    }

    if (Object.keys(updates).length === 0) {
      return await buildUserProjection(request.user, adminAccess);
    }

    updates.updated_at = new Date();

    await fastify.mongo.db
      .collection("users")
      .updateOne({ user_id: request.user.user_id }, { $set: updates });

    const updatedUser = await fastify.mongo.db
      .collection("users")
      .findOne({ user_id: request.user.user_id }, { projection: { _id: 0 } });

    return await buildUserProjection(updatedUser, adminAccess);
  });

  fastify.post("/auth/logout", { preHandler: [authWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");

    try {
      const token = getSessionTokenFromRequest(request);
      if (token) {
        const tokenHash = await hashSessionToken(token);
        await fastify.mongo.db.collection("user_sessions").deleteMany({
          $or: [{ session_token_hash: tokenHash }, { session_token: token }],
        });
      }
    } catch (error) {
      fastify.log.error({ err: error, route: "/auth/logout" });
    }

    reply.clearCookie("session_token", {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: cookieSameSite,
      path: "/",
    });

    return { message: "Logged out successfully" };
  });
}
