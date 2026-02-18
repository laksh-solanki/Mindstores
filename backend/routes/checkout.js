export default async function registerCheckoutRoutes(fastify, deps) {
  const { uuidv4, requireAuth } = deps;

  fastify.post("/api/checkout/place-order", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    const db = fastify.mongo.db;
    const cart = await db
      .collection("carts")
      .findOne({ user_id: request.user.user_id });
    const { selected_product_ids } = request.body || {};

    if (!cart || !cart.items || cart.items.length === 0) {
      return reply.code(400).send({ message: "Cart is empty" });
    }

    let itemsToCheckout = cart.items;
    if (selected_product_ids !== undefined) {
      if (
        !Array.isArray(selected_product_ids) ||
        selected_product_ids.length === 0 ||
        selected_product_ids.some((id) => typeof id !== "string")
      ) {
        return reply.code(400).send({ message: "selected_product_ids must be a non-empty string array" });
      }

      const selectedIds = new Set(selected_product_ids);
      itemsToCheckout = cart.items.filter((item) => selectedIds.has(item.product_id));
      if (itemsToCheckout.length === 0) {
        return reply.code(400).send({ message: "No selected items found in cart" });
      }
    }

    let total_amount = 0;
    const order_items = [];

    for (const item of itemsToCheckout) {
      const product = await db
        .collection("products")
        .findOne({ product_id: item.product_id });

      if (!product) {
        return reply.code(400).send({ message: `Product not found: ${item.product_id}` });
      }

      if ((product.stock ?? 0) < item.quantity) {
        return reply.code(400).send({ message: `Insufficient stock for ${product.name}` });
      }

      total_amount += product.price * item.quantity;
      order_items.push({
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const order_id = `order_${uuidv4().substring(0, 12)}`;

    await db.collection("orders").insertOne({
      order_id,
      user_id: request.user.user_id,
      items: order_items,
      total_amount,
      status: "completed",
      created_at: new Date(),
    });

    for (const item of itemsToCheckout) {
      await db.collection("products").updateOne(
        { product_id: item.product_id },
        { $inc: { stock: -item.quantity } },
      );
    }

    const purchasedIds = new Set(itemsToCheckout.map((item) => item.product_id));
    const remainingItems = cart.items.filter((item) => !purchasedIds.has(item.product_id));
    await db
      .collection("carts")
      .updateOne(
        { user_id: request.user.user_id },
        { $set: { items: remainingItems, updated_at: new Date() } },
      );

    return { success: true, order_id, message: "Order placed successfully" };
  });
}

