export default async function registerAuthRoutes(fastify, deps) {
  const {
    admin,
    uuidv4,
    useSecureCookies,
    cookieSameSite,
    ADMIN_EMAILS,
    requireAuth,
    getSessionTokenFromRequest,
  } = deps;

  fastify.post("/api/auth/firebase-login", async (request, reply) => {
    const { idToken } = request.body;
    if (!idToken) return reply.code(400).send({ message: "ID Token required" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, name, picture, uid } = decodedToken;
      const normalizedEmail = (email || "").toLowerCase().trim();
      const isAdminUser = ADMIN_EMAILS.has(normalizedEmail);

      const db = fastify.mongo.db;
      const userId = `user_${uid}`;

      const existingUser = await db.collection("users").findOne({ email });
      if (!existingUser) {
        await db.collection("users").insertOne({
          user_id: userId,
          email,
          name: name || "User",
          picture,
          is_admin: isAdminUser,
          created_at: new Date(),
        });
      } else {
        await db
          .collection("users")
          .updateOne({ user_id: userId }, { $set: { name, picture, is_admin: isAdminUser } });
      }

      const sessionToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.collection("user_sessions").insertOne({
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      reply.setCookie("session_token", sessionToken, {
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: cookieSameSite,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      const user = await db
        .collection("users")
        .findOne({ user_id: userId }, { projection: { _id: 0 } });
      return { user, session_token: sessionToken };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(401).send({ message: "Invalid Token" });
    }
  });

  fastify.get("/api/auth/me", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    return request.user;
  });

  fastify.post("/api/auth/logout", async (request, reply) => {
    const token = getSessionTokenFromRequest(request);
    if (token) {
      await fastify.mongo.db
        .collection("user_sessions")
        .deleteOne({ session_token: token });
    }
    reply.clearCookie("session_token", {
      path: "/",
      secure: useSecureCookies,
      sameSite: cookieSameSite,
    });
    return { message: "Logged out successfully" };
  });
}

