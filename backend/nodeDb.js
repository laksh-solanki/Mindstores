import { MongoClient, ObjectId } from "mongodb";

import { createDbClient } from "./db.js";

const DEFAULT_DB_NAME = "mindstores";

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

function convertExtendedJson(value) {
  if (Array.isArray(value)) {
    return value.map(convertExtendedJson);
  }

  if (value instanceof ObjectId) {
    return value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const keys = Object.keys(value);
  if (keys.length === 1 && typeof value.$oid === "string" && ObjectId.isValid(value.$oid)) {
    return new ObjectId(value.$oid);
  }

  const converted = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    converted[key] = convertExtendedJson(nestedValue);
  }
  return converted;
}

class NativeMongoCollection {
  constructor(collection) {
    this.collection = collection;
  }

  async findOne(filter = {}, options = {}) {
    return await this.collection.findOne(convertExtendedJson(filter), options);
  }

  find(filter = {}, options = {}) {
    return this.collection.find(convertExtendedJson(filter), options);
  }

  async insertOne(document) {
    return await this.collection.insertOne(document);
  }

  async insertMany(documents = []) {
    return await this.collection.insertMany(documents);
  }

  async updateOne(filter, update, options = {}) {
    return await this.collection.updateOne(convertExtendedJson(filter), convertExtendedJson(update), options);
  }

  async updateMany(filter, update, options = {}) {
    return await this.collection.updateMany(convertExtendedJson(filter), convertExtendedJson(update), options);
  }

  async deleteOne(filter) {
    return await this.collection.deleteOne(convertExtendedJson(filter));
  }

  async deleteMany(filter) {
    return await this.collection.deleteMany(convertExtendedJson(filter));
  }

  async countDocuments(filter = {}) {
    return await this.collection.countDocuments(convertExtendedJson(filter));
  }

  async aggregate(pipeline = []) {
    return await this.collection.aggregate(convertExtendedJson(pipeline)).toArray();
  }
}

class NativeMongoDb {
  constructor(db) {
    this.db = db;
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new NativeMongoCollection(this.db.collection(name)));
    }
    return this.collections.get(name);
  }
}

export async function createNodeDbConnection(env = {}) {
  const mongoUrl = readEnvValue(env, "MONGO_URL") || readEnvValue(env, "MONGODB_URI");
  const dbName = readEnvValue(env, "DB_NAME") || DEFAULT_DB_NAME;

  if (!mongoUrl) {
    return {
      db: createDbClient(env),
      close: async () => {},
      mode: "atlas-data-api-or-memory",
    };
  }

  const client = new MongoClient(mongoUrl, {
    maxPoolSize: Number.parseInt(readEnvValue(env, "MONGO_MAX_POOL_SIZE") || "10", 10) || 10,
    serverSelectionTimeoutMS:
      Number.parseInt(readEnvValue(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS") || "10000", 10) || 10000,
  });

  await client.connect();

  return {
    db: new NativeMongoDb(client.db(dbName)),
    close: async () => {
      await client.close();
    },
    mode: "mongodb-native",
  };
}
