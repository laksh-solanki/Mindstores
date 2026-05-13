import { normalizeText, escapeRegex, parseIntParam } from "../utils.js";
import { normalizeAdminEmail } from "../adminAccess.js";

// ─── Helpers ───────────────────────────────────────────────────────────────

function readEmailParam(v) {
  try { return decodeURIComponent(String(v ?? "")); } catch { return String(v ?? ""); }
}

function serializeUser(user, adminEntries = []) {
  if (!user) return null;
  const email = normalizeAdminEmail(user.email);
  const adminEmails = new Set(adminEntries.map((e) => e.email));
  return {
    user_id: user.user_id ?? null,
    name: user.name ?? "User",
    email: email || user.email || null,
    country_code: user.country_code ?? null,
    locale: user.locale ?? null,
    picture: user.picture ?? null,
    is_admin: Boolean(email && adminEmails.has(email)),
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
  };
}

// ─── Route handlers ────────────────────────────────────────────────────────

// GET /admin/access
export async function handleGetAdminAccess(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");
  return ctx.json({ items: await ctx.adminAccess.list(ctx.user.email) }, 200, { "Cache-Control": "no-store" });
}

// POST /admin/access
export async function handleAddAdminAccess(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const b = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
  const result = await ctx.adminAccess.add(b.email, ctx.user?.email);
  if (result.error) return ctx.error(result.statusCode ?? 400, result.error);
  return ctx.json(result.entry, 201, { "Cache-Control": "no-store" });
}

// PUT /admin/access/:email
export async function handleUpdateAdminAccess(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const b = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
  const result = await ctx.adminAccess.update(readEmailParam(ctx.params.email), b.email, ctx.user?.email);
  if (result.error) return ctx.error(result.statusCode ?? 400, result.error);
  return ctx.json(result.entry, 200, { "Cache-Control": "no-store" });
}

// DELETE /admin/access/:email
export async function handleDeleteAdminAccess(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const result = await ctx.adminAccess.remove(readEmailParam(ctx.params.email), ctx.user?.email);
  if (result.error) return ctx.error(result.statusCode ?? 400, result.error);
  return ctx.json({ message: "Admin email deleted successfully" }, 200, { "Cache-Control": "no-store" });
}

// GET /admin/users
export async function handleGetAdminUsers(ctx) {
  if (!ctx.user) return ctx.error(401, "Not authenticated");
  if (!ctx.user.is_admin) return ctx.error(403, "Admin access required");

  const { db, query } = ctx;
  const search = normalizeText(query.search, 80);
  const role = normalizeText(query.role, 20).toLowerCase();
  const page = Math.max(1, parseIntParam(query.page, 1));
  const pageSize = Math.min(Math.max(parseIntParam(query.page_size ?? query.pageSize, 25), 1), 100);
  const skip = (page - 1) * pageSize;

  const filters = [];
  if (search) {
    const esc = escapeRegex(search);
    filters.push({ $or: [
      { name:    { $regex: esc, $options: "i" } },
      { email:   { $regex: esc, $options: "i" } },
      { user_id: { $regex: esc, $options: "i" } },
    ]});
  }

  const dbQuery = filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { $and: filters };
  if (role === "admin")    dbQuery.is_admin = true;
  if (role === "customer") dbQuery.is_admin = { $ne: true };

  const adminEntries = await ctx.adminAccess.list(ctx.user.email);
  const col = db.collection("users");

  const [users, total] = await Promise.all([
    col.find(dbQuery, { projection: { _id: 0 } }).sort({ updated_at: -1 }).skip(skip).limit(pageSize).toArray(),
    col.countDocuments(dbQuery),
  ]);

  return ctx.json({
    items: users.map((u) => serializeUser(u, adminEntries)).filter(Boolean),
    meta: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) },
  }, 200, { "Cache-Control": "no-store" });
}
