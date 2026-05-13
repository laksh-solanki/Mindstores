import { parse as parseCookie } from "cookie";

import { createJsonResponse, createMindstoresApp, getRequestBodyLimitBytes } from "./app.js";
import { createDbClient } from "./db.js";
import { parseRequestBody, WorkerReply, WorkerRouter } from "./workerAdapter.js";

const EMPTY_ENV = Object.freeze({});
const appPromisesByEnv = new WeakMap();

async function getWorkerApp(env) {
  const workerEnv = env && typeof env === "object" ? env : EMPTY_ENV;
  const cachedAppPromise = appPromisesByEnv.get(workerEnv);
  if (cachedAppPromise) {
    return cachedAppPromise;
  }

  const appPromise = (async () => {
    const db = createDbClient(workerEnv);
    const app = new WorkerRouter(db);
    await createMindstoresApp(app, {
      env: workerEnv,
      db,
    });
    return app;
  })();

  appPromisesByEnv.set(workerEnv, appPromise);
  return appPromise;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const app = await getWorkerApp(env);
    const requestBodyLimitBytes = getRequestBodyLimitBytes(env);

    const cookieHeader = request.headers.get("cookie") || "";
    const nodeLikeRequest = {
      method: request.method.toUpperCase(),
      url: `${url.pathname}${url.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: parseCookie(cookieHeader),
      ip: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
      protocol: url.protocol,
      host: url.host,
      body: null,
    };

    const reply = new WorkerReply();

    try {
      nodeLikeRequest.body = await parseRequestBody(request, requestBodyLimitBytes);
    } catch (error) {
      if (String(error?.message || "") === "INVALID_JSON") {
        return createJsonResponse(request, env, 400, { message: "Invalid JSON body" });
      }
      if (String(error?.message || "") === "BODY_TOO_LARGE") {
        return createJsonResponse(request, env, 413, { message: "Request body too large" });
      }

      return createJsonResponse(request, env, 400, { message: "Unable to parse request body" });
    }

    try {
      await app.handle(nodeLikeRequest, reply);
      return reply.toResponse(nodeLikeRequest.method);
    } catch (error) {
      console.error("Worker runtime error", error);
      return createJsonResponse(request, env, 500, { message: "Internal server error" });
    }
  },
};
