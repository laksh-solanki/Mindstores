import { serialize as serializeCookie } from "cookie";

function getPathname(url) {
  return String(url || "").split("?")[0] || "/";
}

export class WorkerRouter {
  constructor(db = null) {
    this.routes = [];
    this.hooks = {
      onRequest: [],
      preHandler: [],
      onSend: [],
    };
    this.requestDecorations = {};
    this.mongo = { db };
    this.log = console;
  }

  addRoute(method, pattern, optionsOrHandler, maybeHandler) {
    const options = typeof optionsOrHandler === "function" ? {} : optionsOrHandler || {};
    const handler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler;

    const routePreHandlers = Array.isArray(options.preHandler)
      ? options.preHandler
      : options.preHandler
        ? [options.preHandler]
        : [];

    this.routes.push({
      method,
      pattern,
      handler,
      preHandlers: routePreHandlers,
    });

    return this;
  }

  get(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("GET", pattern, optionsOrHandler, maybeHandler);
  }

  post(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("POST", pattern, optionsOrHandler, maybeHandler);
  }

  put(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("PUT", pattern, optionsOrHandler, maybeHandler);
  }

  patch(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("PATCH", pattern, optionsOrHandler, maybeHandler);
  }

  delete(pattern, optionsOrHandler, maybeHandler) {
    return this.addRoute("DELETE", pattern, optionsOrHandler, maybeHandler);
  }

  addHook(name, handler) {
    if (!this.hooks[name]) {
      this.hooks[name] = [];
    }
    this.hooks[name].push(handler);
    return this;
  }

  decorateRequest(name, value) {
    this.requestDecorations[name] = value;
    return this;
  }

  async runOnSendHooks(request, reply) {
    for (const hook of this.hooks.onSend) {
      await hook(request, reply, reply.payload);
    }
  }

  async handle(request, reply) {
    for (const [name, value] of Object.entries(this.requestDecorations)) {
      if (!(name in request)) {
        request[name] = value;
      }
    }

    for (const hook of this.hooks.onRequest) {
      await hook(request, reply);
      if (reply.sent) {
        await this.runOnSendHooks(request, reply);
        return reply;
      }
    }

    const pathname = getPathname(request.url);
    const route = this.routes.find((candidate) => {
      const methodMatches =
        candidate.method === request.method || (request.method === "HEAD" && candidate.method === "GET");
      return methodMatches && this.matchRoute(candidate.pattern, pathname);
    });

    if (!route) {
      await reply.code(404).send({ message: "Not found" });
      await this.runOnSendHooks(request, reply);
      return reply;
    }

    request.params = this.extractParams(route.pattern, pathname);
    request.query = this.parseQuery(request.url);

    for (const hook of this.hooks.preHandler) {
      await hook(request, reply);
      if (reply.sent) {
        await this.runOnSendHooks(request, reply);
        return reply;
      }
    }

    for (const preHandler of route.preHandlers) {
      await preHandler(request, reply);
      if (reply.sent) {
        await this.runOnSendHooks(request, reply);
        return reply;
      }
    }

    if (typeof route.handler !== "function") {
      throw new Error(`Route handler missing for ${route.method} ${route.pattern}`);
    }

    const result = await route.handler(request, reply);
    if (!reply.sent) {
      reply.send(result === undefined ? null : result);
    }

    await this.runOnSendHooks(request, reply);
    return reply;
  }

  matchRoute(pattern, pathname) {
    const patternParts = String(pattern || "").split("/").filter(Boolean);
    const pathParts = String(pathname || "").split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i += 1) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      if (patternPart.startsWith(":")) {
        continue;
      }
      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  extractParams(pattern, pathname) {
    const params = {};
    const patternParts = String(pattern || "").split("/").filter(Boolean);
    const pathParts = String(pathname || "").split("/").filter(Boolean);

    for (let i = 0; i < patternParts.length; i += 1) {
      const patternPart = patternParts[i];
      if (patternPart.startsWith(":")) {
        params[patternPart.slice(1)] = pathParts[i];
      }
    }

    return params;
  }

  parseQuery(url) {
    const queryString = String(url || "").split("?")[1] || "";
    const parsed = new URLSearchParams(queryString);
    const output = {};

    for (const [key, value] of parsed.entries()) {
      output[key] = value;
    }

    return output;
  }
}

export class WorkerReply {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.payload = null;
    this.sent = false;
  }

  code(statusCode) {
    this.statusCode = Number(statusCode) || 200;
    return this;
  }

  header(name, value) {
    this.headers.set(name, String(value));
    return this;
  }

  setCookie(name, value, options = {}) {
    this.headers.append("Set-Cookie", serializeCookie(name, String(value), options));
    return this;
  }

  clearCookie(name, options = {}) {
    this.headers.append(
      "Set-Cookie",
      serializeCookie(name, "", {
        ...options,
        expires: new Date(0),
        maxAge: 0,
      }),
    );
    return this;
  }

  send(payload) {
    this.payload = payload;
    this.sent = true;
    return this;
  }

  toResponse(requestMethod = "GET") {
    const statusCode = this.statusCode;
    const mustNotHaveBody = requestMethod === "HEAD" || [204, 205, 304].includes(statusCode);

    if (!mustNotHaveBody && !this.headers.has("Content-Type")) {
      if (typeof this.payload === "string") {
        this.headers.set("Content-Type", "text/plain; charset=utf-8");
      } else {
        this.headers.set("Content-Type", "application/json; charset=utf-8");
      }
    }

    let body = mustNotHaveBody ? null : this.payload;
    if (body === undefined) {
      body = null;
    }
    if (body !== null && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    return new Response(body, {
      status: statusCode,
      headers: this.headers,
    });
  }
}

function getContentLength(headers) {
  const contentLength = Number.parseInt(headers.get("content-length") || "", 10);
  return Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null;
}

function assertBodyWithinLimit(rawText, maxBytes) {
  const byteLength = new TextEncoder().encode(rawText).byteLength;
  if (byteLength > maxBytes) {
    throw new Error("BODY_TOO_LARGE");
  }
}

export async function parseRequestBody(request, maxBytes) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType) {
    return null;
  }

  const contentLength = getContentLength(request.headers);
  if (contentLength != null && contentLength > maxBytes) {
    throw new Error("BODY_TOO_LARGE");
  }

  if (contentType.includes("application/json")) {
    const rawText = await request.text();
    assertBodyWithinLimit(rawText, maxBytes);
    if (!rawText.trim()) {
      return {};
    }
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error("INVALID_JSON");
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const rawText = await request.text();
    assertBodyWithinLimit(rawText, maxBytes);
    const params = new URLSearchParams(rawText);
    const output = {};
    for (const [key, value] of params.entries()) {
      output[key] = value;
    }
    return output;
  }

  const rawText = await request.text();
  assertBodyWithinLimit(rawText, maxBytes);
  return rawText;
}
