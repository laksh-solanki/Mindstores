export default async function registerRootRoutes(fastify) {
  fastify.get("/", async () => {
    return { status: "ok", message: "Mindstore API is running!" };
  });
}

