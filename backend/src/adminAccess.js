import { normalizeText } from "./utils.js";

export const DEFAULT_ADMIN_EMAIL = "lakshsolanki848@gmail.com";
const COLLECTION = "admin_access";

export function normalizeAdminEmail(value) {
  const s = normalizeText(value, 320).toLowerCase();
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
}

function serialize(entry, currentUserEmail = "") {
  if (!entry) return null;
  const email = normalizeAdminEmail(entry.email);
  const actor = normalizeAdminEmail(currentUserEmail);
  const isDefault = email === DEFAULT_ADMIN_EMAIL;
  const isSelf = Boolean(email && email === actor);
  return {
    email,
    created_at: entry.created_at ?? null,
    updated_at: entry.updated_at ?? null,
    created_by: entry.created_by ?? null,
    updated_by: entry.updated_by ?? null,
    is_default: isDefault,
    is_current_user: isSelf,
    can_edit: Boolean(email && !isDefault && !isSelf),
    can_delete: Boolean(email && !isDefault && !isSelf),
  };
}

export function createAdminAccessService(db, { bootstrapEmails = [] } = {}) {
  const col = db.collection(COLLECTION);

  const seedEmails = [DEFAULT_ADMIN_EMAIL];
  for (const e of bootstrapEmails) {
    const n = normalizeAdminEmail(e);
    if (n && !seedEmails.includes(n)) seedEmails.push(n);
  }

  let _seeded = false;

  async function ensureSeeded() {
    if (_seeded) return;
    _seeded = true;
    const now = new Date();
    for (const email of seedEmails) {
      await col.updateOne(
        { email },
        {
          $set: { email, is_default: email === DEFAULT_ADMIN_EMAIL, updated_at: now },
          $setOnInsert: { created_at: now, created_by: "system" },
        },
        { upsert: true },
      );
    }
  }

  async function isAdminEmail(email) {
    const n = normalizeAdminEmail(email);
    if (!n) return false;
    if (n === DEFAULT_ADMIN_EMAIL) return true;
    await ensureSeeded();
    const entry = await col.findOne({ email: n }, { projection: { _id: 0, email: 1 } });
    return Boolean(entry);
  }

  async function list(currentUserEmail = "") {
    await ensureSeeded();
    const entries = await col.find({}, { projection: { _id: 0 } }).sort({ email: 1 }).toArray();
    const map = new Map();

    for (const e of entries) {
      const s = serialize(e, currentUserEmail);
      if (s?.email) map.set(s.email, s);
    }

    if (!map.has(DEFAULT_ADMIN_EMAIL)) {
      map.set(DEFAULT_ADMIN_EMAIL, serialize({ email: DEFAULT_ADMIN_EMAIL, created_by: "system", is_default: true }, currentUserEmail));
    }

    return [...map.values()].sort((a, b) => a.email.localeCompare(b.email));
  }

  async function add(email, actorEmail = "") {
    await ensureSeeded();
    const n = normalizeAdminEmail(email);
    if (!n) return { error: "Valid email is required", statusCode: 400 };

    const existing = await col.findOne({ email: n }, { projection: { _id: 0, email: 1 } });
    if (existing) return { error: "This email already has admin access", statusCode: 409 };

    const now = new Date();
    const actor = normalizeAdminEmail(actorEmail) || null;
    const entry = { email: n, is_default: n === DEFAULT_ADMIN_EMAIL, created_at: now, updated_at: now, created_by: actor, updated_by: actor };

    await col.insertOne(entry);
    return { entry: serialize(entry, actorEmail) };
  }

  async function update(currentEmail, nextEmail, actorEmail = "") {
    await ensureSeeded();
    const cur = normalizeAdminEmail(currentEmail);
    const next = normalizeAdminEmail(nextEmail);
    const actor = normalizeAdminEmail(actorEmail);

    if (!cur || !next) return { error: "Valid email is required", statusCode: 400 };
    if (cur === DEFAULT_ADMIN_EMAIL) return { error: "Default admin email cannot be edited", statusCode: 403 };
    if (cur === actor) return { error: "You cannot edit your own admin access entry", statusCode: 403 };
    if (next === DEFAULT_ADMIN_EMAIL) return { error: "Default admin email is already protected", statusCode: 409 };

    const existing = await col.findOne({ email: cur }, { projection: { _id: 0 } });
    if (!existing) return { error: "Admin email not found", statusCode: 404 };

    if (cur !== next) {
      const dup = await col.findOne({ email: next }, { projection: { _id: 0, email: 1 } });
      if (dup) return { error: "This email already has admin access", statusCode: 409 };
    }

    const now = new Date();
    const updated = { ...existing, email: next, is_default: false, updated_at: now, updated_by: actor || null };
    await col.updateOne({ email: cur }, { $set: { email: next, is_default: false, updated_at: now, updated_by: actor || null } });
    return { entry: serialize(updated, actorEmail) };
  }

  async function remove(email, actorEmail = "") {
    await ensureSeeded();
    const n = normalizeAdminEmail(email);
    const actor = normalizeAdminEmail(actorEmail);

    if (!n) return { error: "Valid email is required", statusCode: 400 };
    if (n === DEFAULT_ADMIN_EMAIL) return { error: "Default admin email cannot be deleted", statusCode: 403 };
    if (n === actor) return { error: "You cannot delete your own admin access entry", statusCode: 403 };

    const result = await col.deleteOne({ email: n });
    if (result.deletedCount === 0) return { error: "Admin email not found", statusCode: 404 };
    return { deleted: true };
  }

  return { ensureSeeded, isAdminEmail, list, add, update, remove };
}
