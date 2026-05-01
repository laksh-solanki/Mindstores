/**
 * Database Adapter for Cloudflare Workers
 * Uses MongoDB Atlas Data API for cloud deployment
 */

import { seedProducts } from "./data/seed-products.js";

class AtlasDataAPIClient {
  constructor(baseUrl, apiKey, database) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.database = database;
  }

  async request(endpoint, body = null) {
    const url = `${this.baseUrl}/action/${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Request-Headers": "*",
      "api-key": this.apiKey,
    };

    const payload = body ? { ...body, database: this.database } : { database: this.database };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Atlas Data API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result;
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

  async findOne(query, options = {}) {
    const result = await this.client.request("findOne", {
      collection: this.name,
      filter: query,
      projection: options.projection || {},
    });
    return result.document;
  }

  find(query, options = {}) {
    return new AtlasCursor(this.client, this.name, query, options);
  }

  async insertOne(document) {
    const result = await this.client.request("insertOne", {
      collection: this.name,
      document,
    });
    return { insertedId: result.insertedId };
  }

  async insertMany(documents) {
    const result = await this.client.request("insertMany", {
      collection: this.name,
      documents,
    });
    return { insertedIds: result.insertedIds };
  }

  async updateOne(filter, update, options = {}) {
    const result = await this.client.request("updateOne", {
      collection: this.name,
      filter,
      update: update,
      upsert: options.upsert || false,
    });
    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      upsertedId: result.upsertedId,
    };
  }

  async updateMany(filter, update) {
    const result = await this.client.request("updateMany", {
      collection: this.name,
      filter,
      update: update,
    });
    return { modifiedCount: result.modifiedCount };
  }

  async deleteOne(filter) {
    const result = await this.client.request("deleteOne", {
      collection: this.name,
      filter,
    });
    return { deletedCount: result.deletedCount };
  }

  async deleteMany(filter) {
    const result = await this.client.request("deleteMany", {
      collection: this.name,
      filter,
    });
    return { deletedCount: result.deletedCount };
  }

  async countDocuments(filter = {}) {
    const result = await this.client.request("count", {
      collection: this.name,
      filter,
    });
    return result.count;
  }

  async aggregate(pipeline) {
    const result = await this.client.request("aggregate", {
      collection: this.name,
      pipeline,
    });
    return result.documents || [];
  }

}

class AtlasCursor {
  constructor(client, collectionName, query = {}, options = {}) {
    this.client = client;
    this.collectionName = collectionName;
    this.query = query || {};
    this.options = {
      projection: options.projection || {},
      limit: options.limit || 0,
      skip: options.skip || 0,
      sort: options.sort || {},
    };
  }

  sort(sortClause = {}) {
    this.options.sort = sortClause || {};
    return this;
  }

  skip(skipCount = 0) {
    this.options.skip = Math.max(0, Number.parseInt(skipCount, 10) || 0);
    return this;
  }

  limit(limitCount = 0) {
    this.options.limit = Math.max(0, Number.parseInt(limitCount, 10) || 0);
    return this;
  }

  async toArray() {
    const result = await this.client.request("find", {
      collection: this.collectionName,
      filter: this.query,
      projection: this.options.projection,
      limit: this.options.limit,
      skip: this.options.skip,
      sort: this.options.sort,
    });
    return result.documents || [];
  }
}

/**
 * Creates a database client based on environment variables
 * @param {Record<string, string>} env - The environment variables (from Cloudflare or process.env)
 * @returns {AtlasDataAPIClient}
 */
export function createDbClient(env = {}) {
  const url = env.MONGO_ATLAS_DATA_API_URL || (typeof process !== "undefined" ? process.env.MONGO_ATLAS_DATA_API_URL : null);
  const key = env.MONGO_ATLAS_DATA_API_KEY || (typeof process !== "undefined" ? process.env.MONGO_ATLAS_DATA_API_KEY : null);
  const dbName = env.DB_NAME || (typeof process !== "undefined" ? process.env.DB_NAME : "mindstores");

  if (url && key) {
    return new AtlasDataAPIClient(url, key, dbName);
  }

  console.warn("Warning: No database configuration found. Using in-memory fallback.");
  return createMemoryStore();
}

function createMemoryStore() {
  const collections = new Map();
  const cloneDocument = (document) => JSON.parse(JSON.stringify(document));
  const getCollectionStore = (name) => {
    if (!collections.has(name)) {
      collections.set(name, new Map());
      if (name === "products") {
        seedProducts.forEach((product, index) => {
          const key = product.product_id || `seed_product_${index}`;
          collections.get(name).set(key, cloneDocument(product));
        });
      }
    }
    return collections.get(name);
  };

  return {
    collection(name) {
      const store = getCollectionStore(name);
      return {
        async findOne(query) { return Array.from(store.values()).find(d => matches(d, query)); },
        find(query) { 
          const results = Array.from(store.values()).filter(d => matches(d, query));
          return createMemoryCursor(results);
        },
        async insertOne(doc) {
          const id = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `mem_${Date.now()}`;
          store.set(id, { ...doc, _id: id });
          return { insertedId: id };
        },
        async updateOne(filter, update) { return { modifiedCount: 1 }; },
        async deleteOne(filter) { return { deletedCount: 1 }; },
        async countDocuments(filter = {}) {
          return Array.from(store.values()).filter((document) => matches(document, filter)).length;
        }
      };
    }
  };
}

function createMemoryCursor(sourceResults) {
  const state = {
    results: [...sourceResults],
    skip: 0,
    limit: 0,
  };

  return {
    sort(sortClause = {}) {
      const entries = Object.entries(sortClause || {});
      if (entries.length > 0) {
        state.results.sort((a, b) => {
          for (const [field, direction] of entries) {
            const modifier = Number(direction) < 0 ? -1 : 1;
            if (a?.[field] < b?.[field]) return -1 * modifier;
            if (a?.[field] > b?.[field]) return 1 * modifier;
          }
          return 0;
        });
      }
      return this;
    },
    skip(value = 0) {
      state.skip = Math.max(0, Number.parseInt(value, 10) || 0);
      return this;
    },
    limit(value = 0) {
      state.limit = Math.max(0, Number.parseInt(value, 10) || 0);
      return this;
    },
    async toArray() {
      const skipped = state.results.slice(state.skip);
      return state.limit > 0 ? skipped.slice(0, state.limit) : skipped;
    },
  };
}

function matches(doc, query) {
  if (!query || Object.keys(query).length === 0) return true;
  return Object.entries(query).every(([key, value]) => {
    if (key === "$or") {
      return Array.isArray(value) && value.some((condition) => matches(doc, condition));
    }
    if (key === "$and") {
      return Array.isArray(value) && value.every((condition) => matches(doc, condition));
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("$gte" in value && !(doc[key] >= value.$gte)) return false;
      if ("$lte" in value && !(doc[key] <= value.$lte)) return false;
      if ("$gt" in value && !(doc[key] > value.$gt)) return false;
      if ("$lt" in value && !(doc[key] < value.$lt)) return false;
      if ("$in" in value && (!Array.isArray(value.$in) || !value.$in.includes(doc[key]))) return false;
      if ("$regex" in value) {
        const flags = typeof value.$options === "string" ? value.$options : "";
        return new RegExp(value.$regex, flags).test(String(doc[key] || ""));
      }
      return true;
    }
    return doc[key] === value;
  });
}

// Default export for backward compatibility if needed, but using createDbClient is preferred
const defaultDb = createDbClient(typeof process !== "undefined" ? process.env : {});
export default defaultDb;

