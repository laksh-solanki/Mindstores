export default async function registerProductRoutes(fastify, deps) {
  const { uuidv4, requireAdmin } = deps;

  fastify.get("/api/products", async (request) => {
    const { category } = request.query;
    const query = category ? { category } : {};
    return await fastify.mongo.db
      .collection("products")
      .find(query, { projection: { _id: 0 } })
      .toArray();
  });

  fastify.get("/api/products/:id", async (request, reply) => {
    const product = await fastify.mongo.db
      .collection("products")
      .findOne({ product_id: request.params.id }, { projection: { _id: 0 } });
    if (!product) return reply.code(404).send({ message: "Product not found" });
    return product;
  });

  fastify.post("/api/products", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const product = request.body;
    if (!product.name || product.price == null) {
      return reply.code(400).send({ message: "Name and Price are required" });
    }
    if (typeof product.price !== "number" || product.price < 0) {
      return reply.code(400).send({ message: "Invalid price" });
    }

    if (!product.product_id) {
      product.product_id = `prod_${uuidv4().substring(0, 12)}`;
    }

    product.created_at = new Date();

    await fastify.mongo.db.collection("products").insertOne(product);
    return product;
  });

  fastify.put("/api/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const { id } = request.params;
    const updates = request.body;
    delete updates._id;

    const result = await fastify.mongo.db
      .collection("products")
      .findOneAndUpdate(
        { product_id: id },
        { $set: updates },
        { returnDocument: "after", projection: { _id: 0 } },
      );

    if (!result) return reply.code(404).send({ message: "Product not found" });
    return result;
  });

  fastify.delete("/api/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const result = await fastify.mongo.db
      .collection("products")
      .deleteOne({ product_id: request.params.id });

    if (result.deletedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }
    return { message: "Product deleted successfully" };
  });
}

