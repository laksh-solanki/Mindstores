export default async function registerOrderRoutes(fastify, deps) {
  const { requireAuth, createRateLimitGuard } = deps;

  const ordersReadRateLimit = createRateLimitGuard({
    keyPrefix: "orders:read",
    windowMs: 60_000,
    maxRequests: 80,
  });

  fastify.get("/orders", { preHandler: [ordersReadRateLimit] }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");

    if (!(await requireAuth(request, reply))) {
      return;
    }

    const orders = await fastify.mongo.db
      .collection("orders")
      .find({ user_id: request.user.user_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    return Array.isArray(orders) ? orders : [];
  });
}
