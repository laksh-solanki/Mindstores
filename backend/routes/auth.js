function extractCountryCodeFromLocale(locale = "") {
  if (typeof locale !== "string") {
    return null;
  }

  const match = locale.trim().match(/^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$/i);
  return match ? match[1].toUpperCase() : null;
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

  fastify.post("/api/auth/firebase-login", { preHandler: [authWriteRateLimit, authLoginRateLimit] }, async (request, reply) => {
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

      const locale = typeof decodedToken.locale === "string" ? decodedToken.locale.trim() : "";
      const countryCode = extractCountryCodeFromLocale(locale);
      const normalizedEmail = (email || "").toLowerCase().trim();
      const isAdminUser = ADMIN_EMAILS.has(normalizedEmail);

      const db = fastify.mongo.db;
      const userId = `user_${uid}`;

      const userPatch = {
        email: normalizedEmail,
        name: name || "User",
        picture: picture || null,
        locale: locale || null,
        country_code: countryCode || null,
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
        session_token_hash: hashSessionToken(sessionToken),
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

  fastify.get("/api/auth/me", { preHandler: [authReadRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAuth(request, reply))) return;
    return request.user;
  });

  fastify.post("/api/auth/logout", { preHandler: [authWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");

    const token = getSessionTokenFromRequest(request);
    if (token) {
      const sessionTokenHash = hashSessionToken(token);
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

