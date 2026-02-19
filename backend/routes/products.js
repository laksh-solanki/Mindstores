import { ObjectId } from "mongodb";

export default async function registerProductRoutes(fastify, deps) {
  const { uuidv4, requireAdmin } = deps;

  const serializeProduct = (product) => {
    if (!product) return null;
    const { _id, ...rest } = product;
    return {
      ...rest,
      product_id: rest.product_id || String(_id),
    };
  };

  const buildProductFilter = (id) => {
    const normalizedId = (id || "").toString().trim();
    if (!normalizedId) return null;

    if (ObjectId.isValid(normalizedId)) {
      return {
        $or: [{ product_id: normalizedId }, { _id: new ObjectId(normalizedId) }],
      };
    }
    return { product_id: normalizedId };
  };

  fastify.get("/api/products", async (request, reply) => {
    const { category } = request.query;
    const query = category ? { category } : {};
    const products = await fastify.mongo.db
      .collection("products")
      .find(query)
      .toArray();
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return products.map(serializeProduct);
  });

  fastify.get("/api/products/:id", async (request, reply) => {
    const filter = buildProductFilter(request.params.id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const product = await fastify.mongo.db
      .collection("products")
      .findOne(filter);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return serializeProduct(product);
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

    if (!product.product_id || !product.product_id.toString().trim()) {
      product.product_id = `prod_${uuidv4().substring(0, 12)}`;
    }

    product.created_at = new Date();

    await fastify.mongo.db.collection("products").insertOne(product);
    return product;
  });

  fastify.put("/api/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const { id } = request.params;
    const filter = buildProductFilter(id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const updates = { ...(request.body || {}) };
    if (!updates || typeof updates !== "object") {
      return reply.code(400).send({ message: "Invalid update payload" });
    }
    delete updates._id;
    delete updates.product_id;

    if (updates.price != null && (typeof updates.price !== "number" || updates.price < 0)) {
      return reply.code(400).send({ message: "Invalid price" });
    }
    if (updates.stock != null && (!Number.isInteger(updates.stock) || updates.stock < 0)) {
      return reply.code(400).send({ message: "Invalid stock" });
    }
    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ message: "No valid fields provided for update" });
    }

    const result = await fastify.mongo.db
      .collection("products")
      .updateOne(filter, { $set: updates });

    if (result.matchedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }

    const updatedProduct = await fastify.mongo.db
      .collection("products")
      .findOne(filter);

    return serializeProduct(updatedProduct);
  });

  fastify.delete("/api/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const filter = buildProductFilter(request.params.id);
    if (!filter) return reply.code(400).send({ message: "Invalid product id" });

    const result = await fastify.mongo.db
      .collection("products")
      .deleteOne(filter);

    if (result.deletedCount === 0) {
      return reply.code(404).send({ message: "Product not found" });
    }
    return { message: "Product deleted successfully" };
  });
}
