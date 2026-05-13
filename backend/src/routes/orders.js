// GET /orders
export async function handleGetOrders(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");

  const orders = await ctx.db.collection("orders")
    .find({ user_id: ctx.user.user_id }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return ctx.json(Array.isArray(orders) ? orders : [], 200, { "Cache-Control": "no-store" });
}
