import fastifyCookie from "@fastify/cookie";
import dotenv from "dotenv";
import Fastify from "fastify";

import { createMindstoresApp, getRequestBodyLimitBytes, parseBooleanEnv, parseIntegerEnv } from "./app.js";
import { createNodeDbConnection } from "./nodeDb.js";

dotenv.config();

const env = process.env;
const port = parseIntegerEnv(env.PORT, 8000);
const host = env.HOST || "0.0.0.0";

const app = Fastify({
  logger: true,
  trustProxy: parseBooleanEnv(env.TRUST_PROXY, true),
  bodyLimit: getRequestBodyLimitBytes(env),
});

let dbConnection = null;

async function start() {
  await app.register(fastifyCookie, {
    hook: "onRequest",
  });

  dbConnection = await createNodeDbConnection(env);
  await createMindstoresApp(app, {
    env,
    db: dbConnection.db,
  });

  await app.listen({ port, host });
  app.log.info({ mode: dbConnection.mode, port, host }, "Mindstores Fastify API ready");
}

async function shutdown(signal) {
  app.log.info({ signal }, "Shutting down Mindstores Fastify API");
  try {
    await app.close();
    await dbConnection?.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "Fastify shutdown failed");
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

start().catch(async (error) => {
  app.log.error({ err: error }, "Unable to start Mindstores Fastify API");
  await dbConnection?.close();
  process.exit(1);
});
