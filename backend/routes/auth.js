function extractCountryCodeFromLocale(locale = "") {
  if (typeof locale !== "string") {
    return null;
  }

  const match = locale.trim().match(/^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$/i);
  return match ? match[1].toUpperCase() : null;
}

function normalizeCountryCode(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (!/^[a-z]{2}$/i.test(normalized)) {
    return null;
  }
  return normalized.toUpperCase();
}

function normalizeLocale(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 48) {
    return null;
  }
  return normalized;
}

function normalizeProfileName(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 120);
}

function normalizeImageUrl(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(normalized);
  if (isDataImage) {
    if (normalized.length > 700_000) {
      return null;
    }
    return normalized;
  }

  if (normalized.length > 2048) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalized);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return normalized;
}

export default async function registerAuthRoutes(fastify, deps) {
  const {
    admin,
    createSessionToken,
    hashSessionToken,
    useSecureCookies,
    cookieSameSite,
    sessionDurationDays,
    ADMIN_EMAILS,
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

  fastify.post("/auth/firebase-login", { preHandler: [authWriteRateLimit, authLoginRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");

    const idToken = typeof request.body?.idToken === "string" ? request.body.idToken.trim() : "";
    if (!idToken || idToken.length < 100 || idToken.length > 5000) {
      return reply.code(400).send({ message: "Valid ID Token required" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, name, picture, uid } = decodedToken;
      if (!uid || !email) {
        return reply.code(401).send({ message: "Invalid Token" });
      }

      const normalizedEmail = (email || "").toLowerCase().trim();
      const isAdminUser = ADMIN_EMAILS.has(normalizedEmail);

      const db = fastify.mongo.db;
      const userId = `user_${uid}`;
      const existingUser = await db
        .collection("users")
        .findOne({ user_id: userId }, { projection: { _id: 0 } });

      const tokenLocale = normalizeLocale(decodedToken.locale);
      const requestLocale = normalizeLocale(request.body?.locale);
      const locale = tokenLocale || requestLocale || normalizeLocale(existingUser?.locale) || null;

      const tokenCountryCode =
        normalizeCountryCode(decodedToken.country_code) ||
        normalizeCountryCode(decodedToken.country);
      const requestCountryCode =
        normalizeCountryCode(request.body?.country_code) ||
        normalizeCountryCode(request.body?.countryCode);
      const localeCountryCode = extractCountryCodeFromLocale(locale || "");
      const countryCode =
        tokenCountryCode ||
        normalizeCountryCode(localeCountryCode) ||
        requestCountryCode ||
        normalizeCountryCode(existingUser?.country_code) ||
        null;

      const normalizedName =
        normalizeProfileName(name) ||
        normalizeProfileName(existingUser?.name) ||
        "User";
      const normalizedPicture =
        normalizeImageUrl(picture) ||
        normalizeImageUrl(existingUser?.picture) ||
        null;

      const userPatch = {
        email: normalizedEmail,
        name: normalizedName,
        picture: normalizedPicture,
        locale,
        country_code: countryCode,
        is_admin: isAdminUser,
        updated_at: new Date(),
      };

      await db.collection("users").updateOne(
        { user_id: userId },
        {
          $set: userPatch,
          $setOnInsert: {
            user_id: userId,
            created_at: new Date(),
          },
        },
        { upsert: true },
      );

      const sessionToken = createSessionToken();
      const expiresAt = new Date(Date.now() + sessionDurationDays * 24 * 60 * 60 * 1000);

      await db.collection("user_sessions").insertOne({
        user_id: userId,
        session_token_hash: await hashSessionToken(sessionToken),
        expires_at: expiresAt,
        created_at: new Date(),
        user_agent: request.headers["user-agent"] || null,
        ip_address: request.ip || null,
      });

      const oldSessionIds = await db
        .collection("user_sessions")
        .find({ user_id: userId }, { projection: { _id: 1 } })
        .sort({ created_at: -1 })
        .skip(5)
        .toArray();
      if (oldSessionIds.length > 0) {
        await db.collection("user_sessions").deleteMany({
          _id: { $in: oldSessionIds.map((session) => session._id) },
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
      return { user };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(401).send({ message: "Invalid Token" });
    }
  });

  fastify.get("/auth/me", { preHandler: [authReadRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAuth(request, reply))) return;
    return request.user;
  });

  fastify.put("/auth/profile", { preHandler: [authWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAuth(request, reply))) return;

    const updates = {};
    const hasOwn = (field) => Object.prototype.hasOwnProperty.call(request.body || {}, field);

    if (hasOwn("name")) {
      const normalizedName = normalizeProfileName(request.body?.name);
      if (!normalizedName) {
        return reply.code(400).send({ message: "Valid name is required" });
      }
      updates.name = normalizedName;
    }

    if (hasOwn("picture")) {
      const rawPicture = request.body?.picture;
      if (rawPicture == null || (typeof rawPicture === "string" && !rawPicture.trim())) {
        updates.picture = null;
      } else {
        const normalizedPicture = normalizeImageUrl(rawPicture);
        if (!normalizedPicture) {
          return reply.code(400).send({ message: "Profile image must be a valid http/https URL" });
        }
        updates.picture = normalizedPicture;
      }
    }

    if (hasOwn("country_code")) {
      const rawCountryCode = request.body?.country_code;
      if (rawCountryCode == null || (typeof rawCountryCode === "string" && !rawCountryCode.trim())) {
        updates.country_code = null;
      } else {
        const normalizedCountryCode = normalizeCountryCode(rawCountryCode);
        if (!normalizedCountryCode) {
          return reply.code(400).send({ message: "country_code must be a 2-letter code" });
        }
        updates.country_code = normalizedCountryCode;
      }
    }

    if (Object.keys(updates).length === 0) {
      return request.user;
    }

    updates.updated_at = new Date();

    await fastify.mongo.db
      .collection("users")
      .updateOne({ user_id: request.user.user_id }, { $set: updates });

    const user = await fastify.mongo.db
      .collection("users")
      .findOne({ user_id: request.user.user_id }, { projection: { _id: 0 } });
    return user;
  });

  fastify.post("/auth/logout", { preHandler: [authWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");

    const token = getSessionTokenFromRequest(request);
    if (token) {
      const sessionTokenHash = await hashSessionToken(token);
      await fastify.mongo.db
        .collection("user_sessions")
        .deleteMany({
          $or: [{ session_token_hash: sessionTokenHash }, { session_token: token }],
        });
    }
    reply.clearCookie("session_token", {
      path: "/",
      secure: useSecureCookies,
      sameSite: cookieSameSite,
      httpOnly: true,
    });
    return { message: "Logged out successfully" };
  });
}

