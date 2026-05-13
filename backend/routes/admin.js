import { normalizeAdminEmail } from "../adminAccess.js";

function readEmailParam(value) {
  const rawValue = String(value || "");
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function normalizeText(value, maxLength = 0) {
  const normalized = value == null ? "" : String(value).trim();
  if (!normalized) {
    return "";
  }
  return maxLength > 0 && normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseIntegerQueryParam(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function serializeUser(user, adminAccessEntries = []) {
  if (!user) {
    return null;
  }

  const normalizedEmail = normalizeAdminEmail(user.email);
  const adminEmails = new Set(adminAccessEntries.map((entry) => entry.email));

  return {
    user_id: user.user_id || null,
    name: user.name || "User",
    email: normalizedEmail || user.email || null,
    country_code: user.country_code || null,
    locale: user.locale || null,
    picture: user.picture || null,
    is_admin: Boolean(normalizedEmail && adminEmails.has(normalizedEmail)),
    created_at: user.created_at || null,
    updated_at: user.updated_at || null,
  };
}

export default async function registerAdminRoutes(fastify, deps) {
  const { adminAccess, requireAdmin, createRateLimitGuard } = deps;

  const adminReadRateLimit = createRateLimitGuard({
    keyPrefix: "admin:read",
    windowMs: 60_000,
    maxRequests: 80,
  });
  const adminWriteRateLimit = createRateLimitGuard({
    keyPrefix: "admin:write",
    windowMs: 60_000,
    maxRequests: 30,
  });

  fastify.get("/admin/access", { preHandler: [adminReadRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    return {
      items: await adminAccess.list(request.user?.email),
    };
  });

  fastify.post("/admin/access", { preHandler: [adminWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const result = await adminAccess.add(body.email, request.user?.email);
    if (result.error) {
      return reply.code(result.statusCode || 400).send({ message: result.error });
    }

    return reply.code(201).send(result.entry);
  });

  fastify.put("/admin/access/:email", { preHandler: [adminWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    const result = await adminAccess.update(
      readEmailParam(request.params?.email),
      body.email,
      request.user?.email,
    );
    if (result.error) {
      return reply.code(result.statusCode || 400).send({ message: result.error });
    }

    return result.entry;
  });

  fastify.delete("/admin/access/:email", { preHandler: [adminWriteRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const result = await adminAccess.remove(readEmailParam(request.params?.email), request.user?.email);
    if (result.error) {
      return reply.code(result.statusCode || 400).send({ message: result.error });
    }

    return { message: "Admin email deleted successfully" };
  });

  fastify.get("/admin/users", { preHandler: [adminReadRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const queryParams = request.query || {};
    const normalizedSearch = normalizeText(queryParams.search, 80);
    const normalizedRole = normalizeText(queryParams.role, 20).toLowerCase();
    const page = Math.max(1, parseIntegerQueryParam(queryParams.page, 1));
    const pageSize = Math.min(Math.max(parseIntegerQueryParam(queryParams.page_size ?? queryParams.pageSize, 25), 1), 100);
    const skip = (page - 1) * pageSize;

    const filters = [];
    if (normalizedSearch) {
      const escapedSearch = escapeRegex(normalizedSearch);
      filters.push({
        $or: [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
          { user_id: { $regex: escapedSearch, $options: "i" } },
        ],
      });
    }

    const query =
      filters.length === 0
        ? {}
        : filters.length === 1
          ? filters[0]
          : { $and: filters };

    if (normalizedRole === "admin") {
      query.is_admin = true;
    } else if (normalizedRole === "customer") {
      query.is_admin = { $ne: true };
    }

    const adminEntries = await adminAccess.list(request.user?.email);
    const usersCollection = fastify.mongo.db.collection("users");
    const [users, total] = await Promise.all([
      usersCollection.find(query, { projection: { _id: 0 } }).sort({ updated_at: -1 }).skip(skip).limit(pageSize).toArray(),
      usersCollection.countDocuments(query),
    ]);

    const serializedUsers = users
      .map((user) => serializeUser(user, adminEntries))
      .filter(Boolean);

    return {
      items: serializedUsers,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  });
}
