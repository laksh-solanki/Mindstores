export default async function registerOrderRoutes(fastify, deps) {
  const { requireAuth } = deps;

  fastify.get("/api/orders", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    return await fastify.mongo.db
      .collection("orders")
      .find({ user_id: request.user.user_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();
  });
}

