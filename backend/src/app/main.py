from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from starlette.responses import JSONResponse, Response

from .config import get_config
from .context import build_state, error_response
from .routes import admin, auth, cart, checkout, orders, products, root, user_admin

API_PREFIXES = ["/admin", "/auth", "/cart", "/checkout", "/orders", "/products", "/user-admin"]
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
rate_limit_store: dict[str, dict[str, float]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = get_config()
    app.state.mindstores = await build_state(config)
    yield


app = FastAPI(title="Mindstores Backend", version="3.0.0", lifespan=lifespan)


def is_origin_allowed(origin: str | None, allowed_origins: list[str]) -> bool:
    if not origin:
        return True
    if "*" in allowed_origins or origin in allowed_origins:
        return True
    try:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        hostname = (parsed.hostname or "").lower()
        if hostname in ("localhost", "127.0.0.1"):
            return True
        if hostname.endswith(".vercel.app") or hostname.endswith(".onrender.com"):
            return True
    except Exception:
        pass
    return False


def get_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin and origin.strip():
        return origin.strip()
    referer = request.headers.get("referer")
    if referer:
        try:
            from urllib.parse import urlparse

            parsed = urlparse(referer)
            return f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else None
        except Exception:
            return None
    return None


SENSITIVE_PREFIXES = (
    "/user-admin/pin",
    "/auth/firebase-login",
    "/auth/login",
    "/auth/register",
    "/checkout/place-order",
)


def is_sensitive_route(pathname: str, method: str) -> bool:
    if method in MUTATING_METHODS:
        if any(pathname == prefix or pathname.startswith(f"{prefix}/") for prefix in SENSITIVE_PREFIXES):
            return True
        if "/reviews" in pathname:
            return True
    return False


def get_request_ip(request: Request) -> str:
    return (
        request.headers.get("cf-connecting-ip")
        or (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
        or "unknown"
    )


def apply_security_headers(response: Response, pathname: str, use_secure_cookies: bool) -> None:
    response.headers["Server"] = "Mindstores-Secure-Gate"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    if any(pathname == prefix or pathname.startswith(f"{prefix}/") for prefix in API_PREFIXES):
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    if use_secure_cookies:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"


def check_rate_limit(ip: str, tier: str, max_requests: int) -> tuple[bool, int]:
    now = time.time()
    key = f"{tier}:{ip}"
    state = rate_limit_store.get(key)
    if not state or state["reset_at"] <= now:
        state = {"count": 0, "reset_at": now + 60}
        rate_limit_store[key] = state
    state["count"] += 1
    if len(rate_limit_store) > 10_000:
        for item_key, item_state in list(rate_limit_store.items()):
            if item_state["reset_at"] <= now:
                del rate_limit_store[item_key]
    if state["count"] > max_requests:
        return True, max(1, int(state["reset_at"] - now + 0.999))
    return False, 0


@app.middleware("http")
async def security_and_contract_middleware(request: Request, call_next):
    if not hasattr(request.app.state, "mindstores"):
        request.app.state.mindstores = await build_state(get_config())
    state = request.app.state.mindstores
    config = state.config
    origin = get_origin(request)
    pathname = request.url.path
    method = request.method.upper()

    if method == "OPTIONS":
        if origin and not is_origin_allowed(origin, config.allowed_origins):
            response = error_response(403, "Forbidden origin")
        else:
            response = Response(status_code=204)
            if origin and is_origin_allowed(origin, config.allowed_origins):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Max-Age"] = "86400"
        apply_security_headers(response, pathname, config.use_secure_cookies)
        return response

    is_api_route = any(pathname == prefix or pathname.startswith(f"{prefix}/") for prefix in API_PREFIXES)
    is_mutating = is_api_route and method in MUTATING_METHODS

    # CSRF defense: Block cross-site fetch metadata on mutating requests
    sec_fetch_site = (request.headers.get("sec-fetch-site") or "").strip().lower()
    if is_mutating and sec_fetch_site == "cross-site":
        response = error_response(403, "Cross-site request blocked")
        apply_security_headers(response, pathname, config.use_secure_cookies)
        return response

    if is_mutating and config.enforce_origin_check:
        if not origin and not config.allow_null_origin_on_mutations:
            response = error_response(403, "Missing origin")
            apply_security_headers(response, pathname, config.use_secure_cookies)
            return response
        if origin and not is_origin_allowed(origin, config.allowed_origins):
            response = error_response(403, "Forbidden origin")
            apply_security_headers(response, pathname, config.use_secure_cookies)
            return response

    if is_api_route:
        client_ip = get_request_ip(request)
        if is_sensitive_route(pathname, method):
            limited, retry_after = check_rate_limit(client_ip, "sensitive", config.sensitive_rate_limit_max)
            if limited:
                response = JSONResponse(
                    {"message": "Too many requests to sensitive endpoint. Please try again later."},
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                )
                apply_security_headers(response, pathname, config.use_secure_cookies)
                return response
        elif is_mutating:
            limited, retry_after = check_rate_limit(client_ip, "mutation", config.mutation_rate_limit_max)
            if limited:
                response = JSONResponse(
                    {"message": "Too many requests. Please try again later."},
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                )
                apply_security_headers(response, pathname, config.use_secure_cookies)
                return response
        else:
            limited, retry_after = check_rate_limit(client_ip, "read", config.read_rate_limit_max)
            if limited:
                response = JSONResponse(
                    {"message": "Too many requests. Please slow down."},
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                )
                apply_security_headers(response, pathname, config.use_secure_cookies)
                return response

    response = await call_next(request)
    if origin and is_origin_allowed(origin, config.allowed_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    apply_security_headers(response, pathname, config.use_secure_cookies)
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    message = str(exc)
    if message == "BODY_TOO_LARGE":
        return error_response(413, "Request body too large")
    if message == "INVALID_JSON":
        return error_response(400, "Invalid JSON body")
    if message == "INVALID_INPUT_KEY":
        return error_response(400, "Invalid characters in request")
    return error_response(400, "Unable to parse request body")


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    print(f"[fastapi] unhandled error in {request.method} {request.url.path}", exc)
    return error_response(500, "Internal server error")


app.include_router(root.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(user_admin.router)
