// GET /
export function handleRoot() {
  return { status: "ok", service: "mindstores-backend", timestamp: new Date().toISOString() };
}
