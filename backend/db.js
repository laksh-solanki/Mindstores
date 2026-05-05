import { seedProducts } from "./data/seed-products.js";

const DEFAULT_DB_NAME = "mindstores";
const DEFAULT_DATA_SOURCE = "Cluster0";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeObjectIdLike(value) {
  if (typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value)) {
    return value.toLowerCase();
  }

  if (isPlainObject(value) && typeof value.$oid === "string" && /^[a-fA-F0-9]{24}$/.test(value.$oid)) {
    return value.$oid.toLowerCase();
  }

  if (value && typeof value === "object" && typeof value.toHexString === "function") {
    const hex = value.toHexString();
    if (/^[a-fA-F0-9]{24}$/.test(hex)) {
      return hex.toLowerCase();
    }
  }

  return null;
}

function valuesEqual(left, right) {
  const leftOid = normalizeObjectIdLike(left);
  const rightOid = normalizeObjectIdLike(right);
  if (leftOid && rightOid) {
    return leftOid === rightOid;
  }

  if (left instanceof Date || right instanceof Date) {
    const leftMs = new Date(left).getTime();
    const rightMs = new Date(right).getTime();
    return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
  }

  return left === right;
}

function getByPath(target, path) {
  const segments = String(path || "").split(".").filter(Boolean);
  let current = target;

  for (const segment of segments) {
    if (current == null || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function setByPath(target, path, value) {
  const segments = String(path || "").split(".").filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let current = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!isPlainObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function deleteByPath(target, path) {
  const segments = String(path || "").split(".").filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let current = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!isPlainObject(current[segment])) {
      return;
    }
    current = current[segment];
  }

  delete current[segments[segments.length - 1]];
}

function toComparable(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const objectId = normalizeObjectIdLike(value);
  if (objectId) {
    return objectId;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return value;
}

function matchesOperator(fieldValue, operator, expectedValue) {
  switch (operator) {
    case "$in": {
      if (!Array.isArray(expectedValue)) {
        return false;
      }
      return expectedValue.some((candidate) => valuesEqual(fieldValue, candidate));
    }
    case "$gte":
      return toComparable(fieldValue) >= toComparable(expectedValue);
    case "$lte":
      return toComparable(fieldValue) <= toComparable(expectedValue);
    case "$gt":
      return toComparable(fieldValue) > toComparable(expectedValue);
    case "$lt":
      return toComparable(fieldValue) < toComparable(expectedValue);
    case "$ne":
      return !valuesEqual(fieldValue, expectedValue);
    case "$exists": {
      const exists = fieldValue !== undefined;
      return Boolean(expectedValue) ? exists : !exists;
    }
    case "$regex": {
      const pattern = expectedValue;
      const flags = typeof this?.$options === "string" ? this.$options : "";
      const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern || ""), flags);
      return regex.test(String(fieldValue || ""));
    }
    default:
      return false;
  }
}

function matchesCondition(fieldValue, condition) {
  if (isPlainObject(condition)) {
    const operatorKeys = Object.keys(condition).filter((key) => key.startsWith("$"));
    if (operatorKeys.length > 0) {
      return operatorKeys.every((operatorKey) => {
        if (operatorKey === "$options") {
          return true;
        }

        if (operatorKey === "$regex") {
          const flags = typeof condition.$options === "string" ? condition.$options : "";
          const regex =
            condition.$regex instanceof RegExp
              ? condition.$regex
              : new RegExp(String(condition.$regex || ""), flags);
          return regex.test(String(fieldValue || ""));
        }

        return matchesOperator(fieldValue, operatorKey, condition[operatorKey]);
      });
    }
  }

  return valuesEqual(fieldValue, condition);
}

function matchesFilter(document, filter) {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") {
      return Array.isArray(value) && value.some((subFilter) => matchesFilter(document, subFilter));
    }

    if (key === "$and") {
      return Array.isArray(value) && value.every((subFilter) => matchesFilter(document, subFilter));
    }

    const fieldValue = getByPath(document, key);
    return matchesCondition(fieldValue, value);
  });
}

function applyProjection(document, projection = {}) {
  if (!projection || Object.keys(projection).length === 0) {
    return deepClone(document);
  }

  const entries = Object.entries(projection);
  const includeMode = entries.some(([, value]) => value === 1 || value === true);

  if (includeMode) {
    const projected = {};
    for (const [path, flag] of entries) {
      if (!(flag === 1 || flag === true) || path === "_id") {
        continue;
      }
      const value = getByPath(document, path);
      if (value !== undefined) {
        setByPath(projected, path, deepClone(value));
      }
    }

    const includeId = projection._id !== 0 && projection._id !== false;
    if (includeId && document._id !== undefined) {
      projected._id = deepClone(document._id);
    }

    return projected;
  }

  const projected = deepClone(document);
  for (const [path, flag] of entries) {
    if (flag === 0 || flag === false) {
      deleteByPath(projected, path);
    }
  }
  return projected;
}

function applyPull(arrayValue, pullCondition) {
  if (!Array.isArray(arrayValue)) {
    return arrayValue;
  }

  return arrayValue.filter((item) => {
    if (isPlainObject(pullCondition)) {
      return !matchesFilter(item, pullCondition);
    }

    return !valuesEqual(item, pullCondition);
  });
}

function applyUpdateDocument(document, update, { isInsert = false } = {}) {
  if (!isPlainObject(update)) {
    return document;
  }

  const operatorKeys = Object.keys(update).filter((key) => key.startsWith("$"));
  if (operatorKeys.length === 0) {
    return deepClone(update);
  }

  const next = deepClone(document || {});

  if (isPlainObject(update.$set)) {
    for (const [path, value] of Object.entries(update.$set)) {
      setByPath(next, path, deepClone(value));
    }
  }

  if (isInsert && isPlainObject(update.$setOnInsert)) {
    for (const [path, value] of Object.entries(update.$setOnInsert)) {
      const existingValue = getByPath(next, path);
      if (existingValue === undefined) {
        setByPath(next, path, deepClone(value));
      }
    }
  }

  if (isPlainObject(update.$inc)) {
    for (const [path, value] of Object.entries(update.$inc)) {
      const incBy = Number(value);
      if (!Number.isFinite(incBy)) {
        continue;
      }
      const currentValue = Number(getByPath(next, path) || 0);
      setByPath(next, path, currentValue + incBy);
    }
  }

  if (isPlainObject(update.$pull)) {
    for (const [path, condition] of Object.entries(update.$pull)) {
      const currentArray = getByPath(next, path);
      setByPath(next, path, applyPull(currentArray, condition));
    }
  }

  return next;
}

function extractUpsertSeed(filter = {}) {
  const seed = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$")) {
      continue;
    }

    if (isPlainObject(value) && Object.keys(value).some((candidate) => candidate.startsWith("$"))) {
      continue;
    }

    setByPath(seed, key, deepClone(value));
  }

  return seed;
}

function compareBySort(a, b, sort = {}) {
  const sortEntries = Object.entries(sort || {});
  for (const [path, direction] of sortEntries) {
    const modifier = Number(direction) < 0 ? -1 : 1;
    const left = toComparable(getByPath(a, path));
    const right = toComparable(getByPath(b, path));

    if (left == null && right == null) {
      continue;
    }
    if (left == null) {
      return -1 * modifier;
    }
    if (right == null) {
      return 1 * modifier;
    }
    if (left < right) {
      return -1 * modifier;
    }
    if (left > right) {
      return 1 * modifier;
    }
  }
  return 0;
}

class AtlasDataAPIClient {
  constructor({ baseUrl, apiKey, database, dataSource }) {
    this.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.database = database;
    this.dataSource = dataSource || DEFAULT_DATA_SOURCE;
  }

  async request(action, payload = {}) {
    const requestBody = {
      ...payload,
      database: this.database,
      dataSource: this.dataSource,
    };

    const response = await fetch(`${this.baseUrl}/action/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Atlas Data API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  collection(name) {
    return new AtlasCollection(this, name);
  }
}

class AtlasCollection {
  constructor(client, name) {
    this.client = client;
    this.name = name;
  }

  async findOne(filter, options = {}) {
    const result = await this.client.request("findOne", {
      collection: this.name,
      filter: filter || {},
      projection: options.projection || {},
    });

    return result.document || null;
  }

  find(filter = {}, options = {}) {
    return new AtlasCursor(this.client, this.name, filter, options);
  }

  async insertOne(document) {
    const result = await this.client.request("insertOne", {
      collection: this.name,
      document,
    });

    return {
      insertedId: result.insertedId,
    };
  }

  async insertMany(documents) {
    const result = await this.client.request("insertMany", {
      collection: this.name,
      documents,
    });

    return {
      insertedIds: result.insertedIds || [],
    };
  }

  async updateOne(filter, update, options = {}) {
    const result = await this.client.request("updateOne", {
      collection: this.name,
      filter,
      update,
      upsert: Boolean(options.upsert),
    });

    return {
      matchedCount: Number(result.matchedCount || 0),
      modifiedCount: Number(result.modifiedCount || 0),
      upsertedId: result.upsertedId || null,
    };
  }

  async updateMany(filter, update, options = {}) {
    const result = await this.client.request("updateMany", {
      collection: this.name,
      filter,
      update,
      upsert: Boolean(options.upsert),
    });

    return {
      matchedCount: Number(result.matchedCount || 0),
      modifiedCount: Number(result.modifiedCount || 0),
      upsertedId: result.upsertedId || null,
    };
  }

  async deleteOne(filter) {
    const result = await this.client.request("deleteOne", {
      collection: this.name,
      filter,
    });

    return {
      deletedCount: Number(result.deletedCount || 0),
    };
  }

  async deleteMany(filter) {
    const result = await this.client.request("deleteMany", {
      collection: this.name,
      filter,
    });

    return {
      deletedCount: Number(result.deletedCount || 0),
    };
  }

  async countDocuments(filter = {}) {
    const result = await this.client.request("countDocuments", {
      collection: this.name,
      filter,
    });

    if (typeof result.count === "number") {
      return result.count;
    }

    if (typeof result.totalCount === "number") {
      return result.totalCount;
    }

    return 0;
  }

  async aggregate(pipeline = []) {
    const result = await this.client.request("aggregate", {
      collection: this.name,
      pipeline,
    });

    return Array.isArray(result.documents) ? result.documents : [];
  }
}

class AtlasCursor {
  constructor(client, collectionName, filter = {}, options = {}) {
    this.client = client;
    this.collectionName = collectionName;
    this.filter = filter || {};
    this.options = {
      projection: options.projection || {},
      sort: options.sort || {},
      skip: Number(options.skip || 0),
      limit: Number(options.limit || 0),
    };
  }

  sort(sort) {
    this.options.sort = sort || {};
    return this;
  }

  skip(value) {
    this.options.skip = Math.max(0, Number.parseInt(value, 10) || 0);
    return this;
  }

  limit(value) {
    this.options.limit = Math.max(0, Number.parseInt(value, 10) || 0);
    return this;
  }

  async toArray() {
    const result = await this.client.request("find", {
      collection: this.collectionName,
      filter: this.filter,
      projection: this.options.projection,
      sort: this.options.sort,
      skip: this.options.skip,
      limit: this.options.limit,
    });

    return Array.isArray(result.documents) ? result.documents : [];
  }
}

class MemoryCursor {
  constructor(items = []) {
    this.items = Array.isArray(items) ? items : [];
    this.sortClause = {};
    this.skipCount = 0;
    this.limitCount = 0;
  }

  sort(sortClause = {}) {
    this.sortClause = sortClause || {};
    return this;
  }

  skip(skipCount = 0) {
    this.skipCount = Math.max(0, Number.parseInt(skipCount, 10) || 0);
    return this;
  }

  limit(limitCount = 0) {
    this.limitCount = Math.max(0, Number.parseInt(limitCount, 10) || 0);
    return this;
  }

  async toArray() {
    const sorted = [...this.items].sort((a, b) => compareBySort(a, b, this.sortClause));
    const skipped = sorted.slice(this.skipCount);
    const limited = this.limitCount > 0 ? skipped.slice(0, this.limitCount) : skipped;
    return deepClone(limited);
  }
}

class MemoryCollection {
  constructor(store) {
    this.store = store;
  }

  getDocuments() {
    return [...this.store.values()];
  }

  findMatchingEntries(filter = {}) {
    return [...this.store.entries()].filter(([, document]) => matchesFilter(document, filter));
  }

  async findOne(filter = {}, options = {}) {
    const document = this.getDocuments().find((candidate) => matchesFilter(candidate, filter));
    if (!document) {
      return null;
    }
    return applyProjection(document, options.projection || {});
  }

  find(filter = {}, options = {}) {
    const documents = this.getDocuments()
      .filter((candidate) => matchesFilter(candidate, filter))
      .map((candidate) => applyProjection(candidate, options.projection || {}));

    return new MemoryCursor(documents);
  }

  async insertOne(document) {
    const candidate = deepClone(document || {});
    if (candidate._id === undefined || candidate._id === null) {
      const generatedId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `mem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
      candidate._id = generatedId;
    }

    const key = normalizeObjectIdLike(candidate._id) || String(candidate._id);
    this.store.set(key, candidate);
    return { insertedId: candidate._id };
  }

  async insertMany(documents = []) {
    const insertedIds = [];
    for (const document of documents) {
      const result = await this.insertOne(document);
      insertedIds.push(result.insertedId);
    }
    return { insertedIds };
  }

  async updateOne(filter, update, options = {}) {
    const existingEntry = this.findMatchingEntries(filter)[0];

    if (!existingEntry) {
      if (!options.upsert) {
        return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
      }

      const seed = extractUpsertSeed(filter);
      const inserted = applyUpdateDocument(seed, update, { isInsert: true });
      const result = await this.insertOne(inserted);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: result.insertedId };
    }

    const [key, existing] = existingEntry;
    const updated = applyUpdateDocument(existing, update, { isInsert: false });
    this.store.set(key, updated);
    return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
  }

  async updateMany(filter, update, options = {}) {
    const matchingEntries = this.findMatchingEntries(filter);

    if (matchingEntries.length === 0 && options.upsert) {
      const seed = extractUpsertSeed(filter);
      const inserted = applyUpdateDocument(seed, update, { isInsert: true });
      const result = await this.insertOne(inserted);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: result.insertedId };
    }

    for (const [key, existing] of matchingEntries) {
      const updated = applyUpdateDocument(existing, update, { isInsert: false });
      this.store.set(key, updated);
    }

    return {
      matchedCount: matchingEntries.length,
      modifiedCount: matchingEntries.length,
      upsertedId: null,
    };
  }

  async deleteOne(filter) {
    for (const [key, document] of this.store.entries()) {
      if (matchesFilter(document, filter)) {
        this.store.delete(key);
        return { deletedCount: 1 };
      }
    }

    return { deletedCount: 0 };
  }

  async deleteMany(filter) {
    let deletedCount = 0;

    for (const [key, document] of [...this.store.entries()]) {
      if (matchesFilter(document, filter)) {
        this.store.delete(key);
        deletedCount += 1;
      }
    }

    return { deletedCount };
  }

  async countDocuments(filter = {}) {
    return this.getDocuments().filter((candidate) => matchesFilter(candidate, filter)).length;
  }

  async aggregate(pipeline = []) {
    let docs = this.getDocuments().map((document) => deepClone(document));

    for (const stage of pipeline || []) {
      if (!isPlainObject(stage) || Object.keys(stage).length !== 1) {
        continue;
      }

      const [operator, payload] = Object.entries(stage)[0];

      if (operator === "$match") {
        docs = docs.filter((document) => matchesFilter(document, payload || {}));
        continue;
      }

      if (operator === "$sort") {
        docs.sort((a, b) => compareBySort(a, b, payload || {}));
        continue;
      }

      if (operator === "$skip") {
        docs = docs.slice(Math.max(0, Number(payload) || 0));
        continue;
      }

      if (operator === "$limit") {
        docs = docs.slice(0, Math.max(0, Number(payload) || 0));
        continue;
      }

      if (operator === "$project") {
        docs = docs.map((document) => applyProjection(document, payload || {}));
      }
    }

    return docs;
  }
}

function buildSeedProducts() {
  const seeded = [];
  for (const product of seedProducts || []) {
    const next = deepClone(product);
    if (next.created_at && typeof next.created_at === "string") {
      next.created_at = new Date(next.created_at);
    }
    if (next.updated_at && typeof next.updated_at === "string") {
      next.updated_at = new Date(next.updated_at);
    }
    seeded.push(next);
  }
  return seeded;
}

function createMemoryStore() {
  const collections = new Map();

  function getCollectionStore(name) {
    if (!collections.has(name)) {
      const store = new Map();
      if (name === "products") {
        for (const product of buildSeedProducts()) {
          const fallbackId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `seed_${Math.random().toString(16).slice(2, 10)}`;
          const key = normalizeObjectIdLike(product._id) || String(product.product_id || fallbackId);
          store.set(key, product);
        }
      }
      collections.set(name, store);
    }
    return collections.get(name);
  }

  return {
    collection(name) {
      return new MemoryCollection(getCollectionStore(name));
    },
  };
}

function readEnvValue(env, key) {
  if (env && Object.prototype.hasOwnProperty.call(env, key)) {
    return env[key];
  }
  if (typeof process !== "undefined" && process.env && Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key];
  }
  return undefined;
}

export function createDbClient(env = {}) {
  const dataApiUrl = readEnvValue(env, "MONGO_ATLAS_DATA_API_URL");
  const dataApiKey = readEnvValue(env, "MONGO_ATLAS_DATA_API_KEY");
  const dbName = readEnvValue(env, "DB_NAME") || DEFAULT_DB_NAME;
  const dataSource = readEnvValue(env, "MONGO_ATLAS_DATA_SOURCE") || DEFAULT_DATA_SOURCE;

  if (dataApiUrl && dataApiKey) {
    return new AtlasDataAPIClient({
      baseUrl: dataApiUrl,
      apiKey: dataApiKey,
      database: dbName,
      dataSource,
    });
  }

  console.warn("No Atlas Data API credentials detected. Falling back to in-memory database.");
  return createMemoryStore();
}

let defaultDbCache = null;

function getDefaultDb() {
  if (!defaultDbCache) {
    defaultDbCache = createDbClient(typeof process !== "undefined" ? process.env : {});
  }
  return defaultDbCache;
}

const defaultDb = {
  collection(name) {
    return getDefaultDb().collection(name);
  },
};

export default defaultDb;
