// ─── String / validation helpers ───────────────────────────────────────────

export function normalizeText(value, maxLength = 0) {
  const text = value == null ? "" : String(value).trim();
  if (!text) return "";
  return maxLength > 0 && text.length > maxLength ? text.slice(0, maxLength) : text;
}

export function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

export function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isObjectIdLike(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

export function parseIntParam(value, fallback = null) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function parseFloatParam(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseBoolParam(value) {
  const s = normalizeText(value, 10).toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}

export function parseIntegerEnv(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function parseBooleanEnv(value, fallback = false) {
  if (value == null) return fallback;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return fallback;
}

// ─── Crypto ────────────────────────────────────────────────────────────────

export function getCrypto() {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto API is required");
  return globalThis.crypto;
}

export function randomUUID() {
  return getCrypto().randomUUID();
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const digest = await getCrypto().subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createSessionToken() {
  const bytes = new Uint8Array(32);
  getCrypto().getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Base64 (for JWT) ──────────────────────────────────────────────────────

export function base64UrlDecode(value) {
  const normalized = String(value ?? "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(String(value ?? "").length / 4) * 4, "=");

  if (typeof atob === "function") {
    return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
  }
  throw new Error("No base64 decoder available");
}

export function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}
