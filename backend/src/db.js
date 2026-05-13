/**
 * MongoDB Atlas Data API client.
 * Uses fetch() — 100% compatible with Cloudflare Workers.
 */

const DEFAULT_DB_NAME = "mindstores";
const DEFAULT_DATA_SOURCE = "Cluster0";

function readEnv(env, key) {
  if (env && Object.prototype.hasOwnProperty.call(env, key)) return env[key];
  if (typeof process !== "undefined" && process.env) return process.env[key];
  return undefined;
}

// ─── Atlas Data API ────────────────────────────────────────────────────────

class AtlasCollection {
  constructor(client, name) {
    this._c = client;
    this._n = name;
  }

  async _req(action, body) {
    return this._c._req(action, { collection: this._n, ...body });
  }

  async findOne(filter, options = {}) {
    const r = await this._req("findOne", { filter: filter ?? {}, projection: options.projection ?? {} });
    return r.document ?? null;
  }

  find(filter = {}, options = {}) {
    return new AtlasCursor(this._c, this._n, filter, options);
  }

  async insertOne(doc) {
    const r = await this._req("insertOne", { document: doc });
    return { insertedId: r.insertedId };
  }

  async insertMany(docs) {
    const r = await this._req("insertMany", { documents: docs });
    return { insertedIds: r.insertedIds ?? [] };
  }

  async updateOne(filter, update, options = {}) {
    const r = await this._req("updateOne", { filter, update, upsert: Boolean(options.upsert) });
    return { matchedCount: r.matchedCount ?? 0, modifiedCount: r.modifiedCount ?? 0, upsertedId: r.upsertedId ?? null };
  }

  async updateMany(filter, update, options = {}) {
    const r = await this._req("updateMany", { filter, update, upsert: Boolean(options.upsert) });
    return { matchedCount: r.matchedCount ?? 0, modifiedCount: r.modifiedCount ?? 0, upsertedId: r.upsertedId ?? null };
  }

  async deleteOne(filter) {
    const r = await this._req("deleteOne", { filter });
    return { deletedCount: r.deletedCount ?? 0 };
  }

  async deleteMany(filter) {
    const r = await this._req("deleteMany", { filter });
    return { deletedCount: r.deletedCount ?? 0 };
  }

  async countDocuments(filter = {}) {
    const r = await this._req("countDocuments", { filter });
    return typeof r.count === "number" ? r.count : (r.totalCount ?? 0);
  }

  async aggregate(pipeline = []) {
    const r = await this._req("aggregate", { pipeline });
    return Array.isArray(r.documents) ? r.documents : [];
  }
}

class AtlasCursor {
  constructor(client, collName, filter, options) {
    this._c = client;
    this._n = collName;
    this._filter = filter ?? {};
    this._sort = options.sort ?? {};
    this._projection = options.projection ?? {};
    this._skip = options.skip ?? 0;
    this._limit = options.limit ?? 0;
  }

  sort(s) { this._sort = s; return this; }
  skip(n) { this._skip = Math.max(0, Number(n) || 0); return this; }
  limit(n) { this._limit = Math.max(0, Number(n) || 0); return this; }

  async toArray() {
    const payload = {
      collection: this._n,
      filter: this._filter,
      projection: this._projection,
      sort: this._sort,
    };
    if (this._skip > 0) payload.skip = this._skip;
    if (this._limit > 0) payload.limit = this._limit;
    const r = await this._c._req("find", payload);
    return Array.isArray(r.documents) ? r.documents : [];
  }
}

class AtlasClient {
  constructor({ baseUrl, apiKey, database, dataSource }) {
    this._baseUrl = String(baseUrl ?? "").replace(/\/+$/, "");
    this._apiKey = apiKey;
    this._database = database;
    this._dataSource = dataSource ?? DEFAULT_DATA_SOURCE;
  }

  async _req(action, payload = {}) {
    const body = JSON.stringify({ ...payload, database: this._database, dataSource: this._dataSource });
    const res = await fetch(`${this._baseUrl}/action/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": this._apiKey },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Atlas API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  collection(name) {
    return new AtlasCollection(this, name);
  }
}

// ─── In-memory fallback (for local dev without Atlas) ──────────────────────

class MemCollection {
  constructor(store) { this._s = store; }

  _match(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    return Object.entries(filter).every(([k, v]) => {
      if (k === "$or") return Array.isArray(v) && v.some((f) => this._match(doc, f));
      if (k === "$and") return Array.isArray(v) && v.every((f) => this._match(doc, f));
      const dv = k.split(".").reduce((o, p) => (o == null ? undefined : o[p]), doc);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return Object.entries(v).every(([op, ov]) => {
          if (op === "$gt") return dv > ov;
          if (op === "$gte") return dv >= ov;
          if (op === "$lt") return dv < ov;
          if (op === "$lte") return dv <= ov;
          if (op === "$ne") return dv !== ov;
          if (op === "$in") return Array.isArray(ov) && ov.includes(dv);
          if (op === "$exists") return ov ? dv !== undefined : dv === undefined;
          if (op === "$regex") {
            const flags = v.$options ?? "";
            return new RegExp(ov instanceof RegExp ? ov.source : String(ov), flags).test(String(dv ?? ""));
          }
          return true;
        });
      }
      return dv === v;
    });
  }

  _apply(doc, update) {
    const out = JSON.parse(JSON.stringify(doc));
    if (update.$set) Object.assign(out, update.$set);
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) out[k] = (out[k] ?? 0) + v;
    }
    if (update.$pull) {
      for (const [k, cond] of Object.entries(update.$pull)) {
        if (Array.isArray(out[k])) out[k] = out[k].filter((item) => !this._match(item, cond));
      }
    }
    return out;
  }

  _docs() { return [...this._s.values()]; }

  async findOne(filter = {}, opts = {}) {
    const doc = this._docs().find((d) => this._match(d, filter));
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  find(filter = {}, opts = {}) {
    let docs = this._docs().filter((d) => this._match(d, filter));
    return {
      sort: (s) => { docs.sort((a, b) => { for (const [k, dir] of Object.entries(s)) { if (a[k] < b[k]) return -dir; if (a[k] > b[k]) return dir; } return 0; }); return this.find.__cursorOf?.(docs) ?? { toArray: async () => JSON.parse(JSON.stringify(docs)) }; },
      skip: () => ({ limit: () => ({ toArray: async () => JSON.parse(JSON.stringify(docs)) }), toArray: async () => JSON.parse(JSON.stringify(docs)) }),
      limit: () => ({ toArray: async () => JSON.parse(JSON.stringify(docs)) }),
      toArray: async () => JSON.parse(JSON.stringify(docs)),
    };
  }

  async insertOne(doc) {
    const d = JSON.parse(JSON.stringify(doc));
    if (!d._id) d._id = crypto.randomUUID();
    this._s.set(d._id, d);
    return { insertedId: d._id };
  }

  async insertMany(docs) {
    const ids = [];
    for (const d of docs) { const r = await this.insertOne(d); ids.push(r.insertedId); }
    return { insertedIds: ids };
  }

  async updateOne(filter, update, opts = {}) {
    const entry = [...this._s.entries()].find(([, d]) => this._match(d, filter));
    if (!entry) {
      if (!opts.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
      const seed = {};
      for (const [k, v] of Object.entries(filter)) { if (!k.startsWith("$")) seed[k] = v; }
      const inserted = this._apply(seed, { ...update, $setOnInsert: update.$setOnInsert });
      const r = await this.insertOne(inserted);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: r.insertedId };
    }
    const [id, doc] = entry;
    this._s.set(id, this._apply(doc, update));
    return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
  }

  async updateMany(filter, update, opts = {}) {
    const entries = [...this._s.entries()].filter(([, d]) => this._match(d, filter));
    for (const [id, doc] of entries) this._s.set(id, this._apply(doc, update));
    return { matchedCount: entries.length, modifiedCount: entries.length, upsertedId: null };
  }

  async deleteOne(filter) {
    const entry = [...this._s.entries()].find(([, d]) => this._match(d, filter));
    if (!entry) return { deletedCount: 0 };
    this._s.delete(entry[0]);
    return { deletedCount: 1 };
  }

  async deleteMany(filter) {
    const entries = [...this._s.entries()].filter(([, d]) => this._match(d, filter));
    for (const [id] of entries) this._s.delete(id);
    return { deletedCount: entries.length };
  }

  async countDocuments(filter = {}) {
    return this._docs().filter((d) => this._match(d, filter)).length;
  }

  async aggregate(pipeline = []) {
    let docs = this._docs().map((d) => JSON.parse(JSON.stringify(d)));
    for (const stage of pipeline) {
      const [op, payload] = Object.entries(stage)[0];
      if (op === "$match") docs = docs.filter((d) => this._match(d, payload));
      else if (op === "$sort") docs.sort((a, b) => { for (const [k, dir] of Object.entries(payload)) { if (a[k] < b[k]) return -dir; if (a[k] > b[k]) return dir; } return 0; });
      else if (op === "$skip") docs = docs.slice(Number(payload) || 0);
      else if (op === "$limit") docs = docs.slice(0, Number(payload) || 0);
    }
    return docs;
  }
}

class MemDb {
  constructor() { this._cols = new Map(); }
  collection(name) {
    if (!this._cols.has(name)) this._cols.set(name, new MemCollection(new Map()));
    return this._cols.get(name);
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createDb(env = {}) {
  const apiUrl = readEnv(env, "MONGO_ATLAS_DATA_API_URL");
  const apiKey = readEnv(env, "MONGO_ATLAS_DATA_API_KEY");
  const dbName = readEnv(env, "DB_NAME") ?? DEFAULT_DB_NAME;
  const dataSource = readEnv(env, "MONGO_ATLAS_DATA_SOURCE") ?? DEFAULT_DATA_SOURCE;

  if (apiUrl && apiKey) {
    return new AtlasClient({ baseUrl: apiUrl, apiKey, database: dbName, dataSource });
  }

  console.warn("[db] No Atlas Data API config found — using in-memory store.");
  return new MemDb();
}
