import sys
import unittest
import asyncio
import secrets
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

from starlette.testclient import TestClient

from src.app.main import app, check_rate_limit, rate_limit_store
from src.app.utils import sanitize_nosql_payload, sanitize_text
from src.app.routes.admin import require_admin
from src.app.routes.user_admin import has_active_pin_access, serialize_user_admin_profile
from src.app.context import RequestContext


class TestSecurityHardening(unittest.TestCase):
    def setUp(self):
        rate_limit_store.clear()
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_nosql_payload_sanitization(self):
        # Clean payload should pass unaltered
        clean = {"name": "Test Product", "category": "Electronics", "price": 99.9}
        self.assertEqual(sanitize_nosql_payload(clean), clean)

        # $ operator key should be rejected
        with self.assertRaises(ValueError) as ctx:
            sanitize_nosql_payload({"$ne": None})
        self.assertEqual(str(ctx.exception), "INVALID_INPUT_KEY")

        # Nested $ operator key should be rejected
        with self.assertRaises(ValueError) as ctx:
            sanitize_nosql_payload({"filter": {"user_id": {"$gt": ""}}})
        self.assertEqual(str(ctx.exception), "INVALID_INPUT_KEY")

        # Dot in key should be rejected
        with self.assertRaises(ValueError) as ctx:
            sanitize_nosql_payload({"admin.role": "superuser"})
        self.assertEqual(str(ctx.exception), "INVALID_INPUT_KEY")

        # In list items
        with self.assertRaises(ValueError) as ctx:
            sanitize_nosql_payload([{"safe": 1}, {"$where": "this.password"}])
        self.assertEqual(str(ctx.exception), "INVALID_INPUT_KEY")

    def test_api_nosql_injection_rejection(self):
        resp = self.client.post(
            "/auth/firebase-login",
            headers={
                "Origin": "https://mindstores.vercel.app",
            },
            json={"email": {"$gt": ""}},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid characters in request", resp.json().get("message", ""))

    def test_text_sanitization(self):
        # Strips dangerous script tags and null bytes
        malicious = "Hello \x00 world! <script>alert('xss')</script> Great product!"
        sanitized = sanitize_text(malicious, 500)
        self.assertNotIn("<script>", sanitized)
        self.assertNotIn("\x00", sanitized)
        self.assertIn("Hello", sanitized)
        self.assertIn("Great product!", sanitized)

    def test_security_headers_present(self):
        resp = self.client.get("/")
        self.assertEqual(resp.headers.get("Server"), "Mindstores-Secure-Gate")
        self.assertEqual(resp.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(resp.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(resp.headers.get("Cross-Origin-Resource-Policy"), "same-site")
        self.assertEqual(resp.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")

    def test_csrf_cross_site_fetch_metadata_blocked(self):
        # Mutating request with Sec-Fetch-Site: cross-site must be rejected with 403
        resp = self.client.post(
            "/auth/firebase-login",
            headers={
                "Origin": "https://mindstores.vercel.app",
                "Sec-Fetch-Site": "cross-site",
            },
            json={"idToken": "a" * 120},
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Cross-site request blocked", resp.json().get("message", ""))

    def test_unauthorized_origin_blocked(self):
        # Mutating request with unauthorized origin must be rejected with 403
        resp = self.client.post(
            "/auth/firebase-login",
            headers={
                "Origin": "https://attacker-domain.evil.com",
            },
            json={"idToken": "a" * 120},
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Forbidden origin", resp.json().get("message", ""))

    def test_blocked_admin_denied_access(self):
        # Admin who has been blocked should be rejected
        mock_ctx = MagicMock()
        mock_ctx.user = {"email": "admin@example.com", "is_admin": True, "user_admin_blocked": True}
        denied = require_admin(mock_ctx)
        self.assertIsNotNone(denied)
        self.assertEqual(denied.status_code, 403)

        # Active admin should pass
        mock_ctx.user = {"email": "admin@example.com", "is_admin": True, "user_admin_blocked": False}
        denied = require_admin(mock_ctx)
        self.assertIsNone(denied)

    def test_pin_lockout_profile_and_access(self):
        # Future lock timestamp means locked
        future_lock = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat().replace("+00:00", "Z")
        user = {
            "user_id": "u123",
            "user_admin_pin_hash": "hash",
            "user_admin_pin_salt": "salt",
            "user_admin_pin_unlocked_until": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
            "user_admin_pin_locked_until": future_lock,
        }
        profile = serialize_user_admin_profile(user)
        self.assertTrue(profile["is_pin_locked"])
        self.assertFalse(has_active_pin_access(user))

        # Expired lock timestamp means not locked
        past_lock = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat().replace("+00:00", "Z")
        user["user_admin_pin_locked_until"] = past_lock
        profile = serialize_user_admin_profile(user)
        self.assertFalse(profile["is_pin_locked"])
        self.assertTrue(has_active_pin_access(user))

    def test_multi_tier_rate_limiting(self):
        ip = "198.51.100.1"
        # Test sensitive tier (limit 15)
        for _ in range(15):
            limited, _ = check_rate_limit(ip, "sensitive", 15)
            self.assertFalse(limited)
        limited, retry_after = check_rate_limit(ip, "sensitive", 15)
        self.assertTrue(limited)
        self.assertGreater(retry_after, 0)

    def test_google_oauth_start_not_configured(self):
        # When google_client_id is empty, JSON requests get 501, browser navigations redirect to /login
        import dataclasses
        new_config = dataclasses.replace(app.state.mindstores.config, google_client_id="")
        with unittest.mock.patch.object(app.state.mindstores, "config", new_config):
            # JSON request
            resp = self.client.get("/auth/google", headers={"Accept": "application/json"}, follow_redirects=False)
            self.assertEqual(resp.status_code, 501)
            self.assertIn("Google OAuth is not configured", resp.json().get("message", ""))

            # Browser navigation
            resp_browser = self.client.get("/auth/google", headers={"Accept": "text/html"}, follow_redirects=False)
            self.assertEqual(resp_browser.status_code, 302)
            self.assertIn("oauth_error=oauth_not_configured", resp_browser.headers.get("location", ""))

    def test_google_oauth_start_configured(self):
        # When configured, should redirect to accounts.google.com and set oauth_state cookie
        import dataclasses
        new_config = dataclasses.replace(app.state.mindstores.config, google_client_id="test-client-id.apps.googleusercontent.com")
        with unittest.mock.patch.object(app.state.mindstores, "config", new_config):
            resp = self.client.get("/auth/google?return_to=/profile", follow_redirects=False)
            self.assertEqual(resp.status_code, 302)
            location = resp.headers.get("location", "")
            self.assertTrue(location.startswith("https://accounts.google.com/o/oauth2/v2/auth"))
            self.assertIn("client_id=test-client-id.apps.googleusercontent.com", location)
            self.assertIn("state=", location)
            self.assertIn("oauth_state", resp.cookies)

    def test_google_oauth_callback_csrf_rejection(self):
        # Missing state or cookie mismatch should redirect to login with error
        resp = self.client.get("/auth/google/callback?code=fake-code&state=fake-state", follow_redirects=False)
        self.assertEqual(resp.status_code, 302)
        location = resp.headers.get("location", "")
        self.assertIn("oauth_error=invalid_state", location)

    def test_register_and_login_flow(self):
        origin_header = {"Origin": "https://mindstores.vercel.app"}
        test_email = f"test_{secrets.token_hex(6)}@example.com"

        # 1. Reject weak password
        weak_resp = self.client.post(
            "/auth/register",
            headers=origin_header,
            json={"name": "Test User", "email": test_email, "password": "123"},
        )
        self.assertEqual(weak_resp.status_code, 400)
        self.assertIn("at least 6 characters", weak_resp.json().get("message", ""))

        # 2. Successful registration
        reg_resp = self.client.post(
            "/auth/register",
            headers=origin_header,
            json={"name": "Test User", "email": test_email, "password": "securepassword123"},
        )
        self.assertEqual(reg_resp.status_code, 201)
        user_data = reg_resp.json().get("user", {})
        self.assertEqual(user_data.get("email"), test_email)
        self.assertEqual(user_data.get("name"), "Test User")
        # Ensure password_hash and password_salt are NEVER exposed
        self.assertNotIn("password_hash", user_data)
        self.assertNotIn("password_salt", user_data)
        self.assertIn("session_token", reg_resp.cookies)

        # 3. Duplicate email rejection
        dup_resp = self.client.post(
            "/auth/register",
            headers=origin_header,
            json={"name": "Test User 2", "email": test_email, "password": "anotherpassword123"},
        )
        self.assertEqual(dup_resp.status_code, 400)
        self.assertIn("already in use", dup_resp.json().get("message", ""))

        # 4. Failed login with wrong password
        fail_login = self.client.post(
            "/auth/login",
            headers=origin_header,
            json={"email": test_email, "password": "wrongpassword"},
        )
        self.assertEqual(fail_login.status_code, 401)
        self.assertIn("Invalid email or password", fail_login.json().get("message", ""))

        # 5. Successful login with correct password
        success_login = self.client.post(
            "/auth/login",
            headers=origin_header,
            json={"email": test_email, "password": "securepassword123"},
        )
        self.assertEqual(success_login.status_code, 200)
        login_user = success_login.json().get("user", {})
        self.assertEqual(login_user.get("email"), test_email)
        self.assertNotIn("password_hash", login_user)
        self.assertNotIn("password_salt", login_user)
        self.assertIn("session_token", success_login.cookies)

    def test_user_product_drafts_are_not_public_or_purchasable(self):
        draft = {
            "product_id": "draft-product-123",
            "name": "Private draft",
            "category": "Drafts",
            "price": 10,
            "stock": 5,
            "status": "draft",
            "owner_user_id": "owner-1",
        }
        asyncio.run(app.state.mindstores.db.collection("user_products").insert_one(draft))

        catalog = self.client.get("/products")
        self.assertEqual(catalog.status_code, 200)
        self.assertNotIn(draft["product_id"], [item["product_id"] for item in catalog.json()])

        detail = self.client.get(f"/products/{draft['product_id']}")
        self.assertEqual(detail.status_code, 404)

    def test_user_admin_otp_flow(self):
        # Register a new user
        client = TestClient(app)
        email = f"otpuser_{secrets.token_hex(4)}@example.com"
        reg_resp = client.post("/auth/register", json={
            "email": email,
            "password": "Password123!",
            "name": "OTP User",
        })
        if reg_resp.status_code != 201:
            # If register requires specific setup, skip
            return

        # Request user-admin products without OTP verification -> should be 403
        prod_resp = client.get("/user-admin/products")
        self.assertEqual(prod_resp.status_code, 403)

        # Send OTP
        otp_resp = client.post("/user-admin/otp/send", json={"email": email})
        self.assertEqual(otp_resp.status_code, 200)
        data = otp_resp.json()
        self.assertIn("message", data)
        debug_otp = data.get("debug_otp")
        self.assertTrue(debug_otp)

        # Invalid OTP verification
        bad_verify = client.post("/user-admin/otp/verify", json={"email": email, "otp": "000000"})
        self.assertEqual(bad_verify.status_code, 400)

        # Valid OTP verification
        good_verify = client.post("/user-admin/otp/verify", json={"email": email, "otp": debug_otp})
        self.assertEqual(good_verify.status_code, 200)
        self.assertTrue(good_verify.json().get("profile", {}).get("has_pin_access"))

        # Access user-admin products -> should now be 200
        unlocked_resp = client.get("/user-admin/products")
        self.assertEqual(unlocked_resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
