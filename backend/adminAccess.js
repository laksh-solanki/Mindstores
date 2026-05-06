export const DEFAULT_ADMIN_EMAIL = "lakshsolanki848@gmail.com";
export const ADMIN_ACCESS_COLLECTION = "admin_access";

function normalizeEmail(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

export function normalizeAdminEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized || normalized.length > 320) {
    return "";
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function buildBootstrapEmails(values = []) {
  const emails = new Set([DEFAULT_ADMIN_EMAIL]);
  for (const value of values) {
    const normalized = normalizeAdminEmail(value);
    if (normalized) {
      emails.add(normalized);
    }
  }
  return [...emails];
}

function serializeAdminAccess(entry, currentUserEmail = "") {
  if (!entry) {
    return null;
  }

  const email = normalizeAdminEmail(entry.email);
  const normalizedCurrentUserEmail = normalizeAdminEmail(currentUserEmail);
  const isDefault = email === DEFAULT_ADMIN_EMAIL;
  const isCurrentUser = email && email === normalizedCurrentUserEmail;

  return {
    email,
    created_at: entry.created_at || null,
    updated_at: entry.updated_at || null,
    created_by: entry.created_by || null,
    updated_by: entry.updated_by || null,
    is_default: isDefault,
    is_current_user: Boolean(isCurrentUser),
    can_edit: Boolean(email && !isDefault && !isCurrentUser),
    can_delete: Boolean(email && !isDefault && !isCurrentUser),
  };
}

export function createAdminAccessService(db, { bootstrapEmails = [] } = {}) {
  const collection = db.collection(ADMIN_ACCESS_COLLECTION);
  const seededEmails = buildBootstrapEmails(bootstrapEmails);

  async function ensureSeeded() {
    const now = new Date();
    for (const email of seededEmails) {
      await collection.updateOne(
        { email },
        {
          $set: {
            email,
            is_default: email === DEFAULT_ADMIN_EMAIL,
            updated_at: now,
          },
          $setOnInsert: {
            created_at: now,
            created_by: "system",
          },
        },
        { upsert: true },
      );
    }
  }

  async function isAdminEmail(email) {
    const normalizedEmail = normalizeAdminEmail(email);
    if (!normalizedEmail) {
      return false;
    }
    if (normalizedEmail === DEFAULT_ADMIN_EMAIL) {
      return true;
    }

    await ensureSeeded();
    const entry = await collection.findOne({ email: normalizedEmail }, { projection: { _id: 0, email: 1 } });
    return Boolean(entry);
  }

  async function list(currentUserEmail = "") {
    await ensureSeeded();
    const entries = await collection.find({}, { projection: { _id: 0 } }).sort({ email: 1 }).toArray();
    const byEmail = new Map();

    for (const entry of entries) {
      const serialized = serializeAdminAccess(entry, currentUserEmail);
      if (serialized?.email) {
        byEmail.set(serialized.email, serialized);
      }
    }

    if (!byEmail.has(DEFAULT_ADMIN_EMAIL)) {
      byEmail.set(
        DEFAULT_ADMIN_EMAIL,
        serializeAdminAccess(
          {
            email: DEFAULT_ADMIN_EMAIL,
            created_by: "system",
            is_default: true,
          },
          currentUserEmail,
        ),
      );
    }

    return [...byEmail.values()].sort((left, right) => left.email.localeCompare(right.email));
  }

  async function add(email, actorEmail = "") {
    await ensureSeeded();
    const normalizedEmail = normalizeAdminEmail(email);
    if (!normalizedEmail) {
      return { error: "Valid email is required", statusCode: 400 };
    }

    const existing = await collection.findOne({ email: normalizedEmail }, { projection: { _id: 0, email: 1 } });
    if (existing) {
      return { error: "This email already has admin access", statusCode: 409 };
    }

    const now = new Date();
    const entry = {
      email: normalizedEmail,
      is_default: normalizedEmail === DEFAULT_ADMIN_EMAIL,
      created_at: now,
      updated_at: now,
      created_by: normalizeAdminEmail(actorEmail) || null,
      updated_by: normalizeAdminEmail(actorEmail) || null,
    };

    await collection.insertOne(entry);
    return { entry: serializeAdminAccess(entry, actorEmail) };
  }

  async function update(currentEmail, nextEmail, actorEmail = "") {
    await ensureSeeded();
    const normalizedCurrentEmail = normalizeAdminEmail(currentEmail);
    const normalizedNextEmail = normalizeAdminEmail(nextEmail);
    const normalizedActorEmail = normalizeAdminEmail(actorEmail);

    if (!normalizedCurrentEmail || !normalizedNextEmail) {
      return { error: "Valid email is required", statusCode: 400 };
    }
    if (normalizedCurrentEmail === DEFAULT_ADMIN_EMAIL) {
      return { error: "Default admin email cannot be edited", statusCode: 403 };
    }
    if (normalizedCurrentEmail === normalizedActorEmail) {
      return { error: "You cannot edit your own admin access entry", statusCode: 403 };
    }
    if (normalizedNextEmail === DEFAULT_ADMIN_EMAIL) {
      return { error: "Default admin email is already protected", statusCode: 409 };
    }

    const existing = await collection.findOne({ email: normalizedCurrentEmail }, { projection: { _id: 0 } });
    if (!existing) {
      return { error: "Admin email not found", statusCode: 404 };
    }

    if (normalizedCurrentEmail !== normalizedNextEmail) {
      const duplicate = await collection.findOne({ email: normalizedNextEmail }, { projection: { _id: 0, email: 1 } });
      if (duplicate) {
        return { error: "This email already has admin access", statusCode: 409 };
      }
    }

    const now = new Date();
    const updatedEntry = {
      ...existing,
      email: normalizedNextEmail,
      is_default: false,
      updated_at: now,
      updated_by: normalizedActorEmail || null,
    };

    await collection.updateOne(
      { email: normalizedCurrentEmail },
      {
        $set: {
          email: normalizedNextEmail,
          is_default: false,
          updated_at: now,
          updated_by: normalizedActorEmail || null,
        },
      },
    );

    return { entry: serializeAdminAccess(updatedEntry, actorEmail) };
  }

  async function remove(email, actorEmail = "") {
    await ensureSeeded();
    const normalizedEmail = normalizeAdminEmail(email);
    const normalizedActorEmail = normalizeAdminEmail(actorEmail);

    if (!normalizedEmail) {
      return { error: "Valid email is required", statusCode: 400 };
    }
    if (normalizedEmail === DEFAULT_ADMIN_EMAIL) {
      return { error: "Default admin email cannot be deleted", statusCode: 403 };
    }
    if (normalizedEmail === normalizedActorEmail) {
      return { error: "You cannot delete your own admin access entry", statusCode: 403 };
    }

    const result = await collection.deleteOne({ email: normalizedEmail });
    if (result.deletedCount === 0) {
      return { error: "Admin email not found", statusCode: 404 };
    }

    return { deleted: true };
  }

  return {
    ensureSeeded,
    isAdminEmail,
    list,
    add,
    update,
    remove,
  };
}
