export default async function registerRootRoutes(fastify) {
  fastify.get("/", async () => {
    return {
      status: "ok",
      service: "mindstores-backend",
      timestamp: new Date().toISOString(),
    };
  });
}
