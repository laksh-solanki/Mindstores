from __future__ import annotations

import re
from typing import Any

from .db import Collection
from .utils import normalize_text, now_iso

DEFAULT_ADMIN_EMAIL = "lakshsolanki848@gmail.com"
COLLECTION = "admin_access"


def normalize_admin_email(value: Any) -> str:
    text = normalize_text(value, 320).lower()
    return text if text and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", text) else ""


def serialize(entry: dict[str, Any] | None, current_user_email: str = "") -> dict[str, Any] | None:
    if not entry:
        return None
    email = normalize_admin_email(entry.get("email"))
    actor = normalize_admin_email(current_user_email)
    is_default = email == DEFAULT_ADMIN_EMAIL
    is_self = bool(email and email == actor)
    return {
        "email": email,
        "created_at": entry.get("created_at"),
        "updated_at": entry.get("updated_at"),
        "created_by": entry.get("created_by"),
        "updated_by": entry.get("updated_by"),
        "is_default": is_default,
        "is_current_user": is_self,
        "can_edit": bool(email and not is_default and not is_self),
        "can_delete": bool(email and not is_default and not is_self),
    }


class AdminAccessService:
    def __init__(self, db: Any, bootstrap_emails: list[str] | None = None):
        self.collection: Collection = db.collection(COLLECTION)
        self.seed_emails = [DEFAULT_ADMIN_EMAIL]
        for email in bootstrap_emails or []:
            normalized = normalize_admin_email(email)
            if normalized and normalized not in self.seed_emails:
                self.seed_emails.append(normalized)
        self.seeded = False

    async def ensure_seeded(self) -> None:
        if self.seeded:
            return
        self.seeded = True
        now = now_iso()
        for email in self.seed_emails:
            await self.collection.update_one(
                {"email": email},
                {
                    "$set": {"email": email, "is_default": email == DEFAULT_ADMIN_EMAIL, "updated_at": now},
                    "$setOnInsert": {"created_at": now, "created_by": "system"},
                },
                upsert=True,
            )

    async def is_admin_email(self, email: Any) -> bool:
        normalized = normalize_admin_email(email)
        if not normalized:
            return False
        if normalized == DEFAULT_ADMIN_EMAIL:
            return True
        await self.ensure_seeded()
        entry = await self.collection.find_one({"email": normalized}, {"projection": {"_id": 0, "email": 1}})
        return bool(entry)

    async def list(self, current_user_email: str = "") -> list[dict[str, Any]]:
        await self.ensure_seeded()
        entries = await self.collection.find({}, {"projection": {"_id": 0}}).sort({"email": 1}).to_array()
        by_email: dict[str, dict[str, Any]] = {}
        for entry in entries:
            item = serialize(entry, current_user_email)
            if item and item["email"]:
                by_email[item["email"]] = item
        if DEFAULT_ADMIN_EMAIL not in by_email:
            by_email[DEFAULT_ADMIN_EMAIL] = serialize(
                {"email": DEFAULT_ADMIN_EMAIL, "created_by": "system", "is_default": True},
                current_user_email,
            )
        return sorted(by_email.values(), key=lambda item: item["email"])

    async def add(self, email: Any, actor_email: str = "") -> dict[str, Any]:
        await self.ensure_seeded()
        normalized = normalize_admin_email(email)
        if not normalized:
            return {"error": "Valid email is required", "statusCode": 400}
        existing = await self.collection.find_one({"email": normalized}, {"projection": {"_id": 0, "email": 1}})
        if existing:
            return {"error": "This email already has admin access", "statusCode": 409}
        now = now_iso()
        actor = normalize_admin_email(actor_email) or None
        entry = {
            "email": normalized,
            "is_default": normalized == DEFAULT_ADMIN_EMAIL,
            "created_at": now,
            "updated_at": now,
            "created_by": actor,
            "updated_by": actor,
        }
        await self.collection.insert_one(entry)
        return {"entry": serialize(entry, actor_email)}

    async def update(self, current_email: Any, next_email: Any, actor_email: str = "") -> dict[str, Any]:
        await self.ensure_seeded()
        current = normalize_admin_email(current_email)
        next_normalized = normalize_admin_email(next_email)
        actor = normalize_admin_email(actor_email)
        if not current or not next_normalized:
            return {"error": "Valid email is required", "statusCode": 400}
        if current == DEFAULT_ADMIN_EMAIL:
            return {"error": "Default admin email cannot be edited", "statusCode": 403}
        if current == actor:
            return {"error": "You cannot edit your own admin access entry", "statusCode": 403}
        if next_normalized == DEFAULT_ADMIN_EMAIL:
            return {"error": "Default admin email is already protected", "statusCode": 409}

        existing = await self.collection.find_one({"email": current}, {"projection": {"_id": 0}})
        if not existing:
            return {"error": "Admin email not found", "statusCode": 404}
        if current != next_normalized:
            duplicate = await self.collection.find_one({"email": next_normalized}, {"projection": {"_id": 0, "email": 1}})
            if duplicate:
                return {"error": "This email already has admin access", "statusCode": 409}

        now = now_iso()
        updated = {
            **existing,
            "email": next_normalized,
            "is_default": False,
            "updated_at": now,
            "updated_by": actor or None,
        }
        await self.collection.update_one(
            {"email": current},
            {"$set": {"email": next_normalized, "is_default": False, "updated_at": now, "updated_by": actor or None}},
        )
        return {"entry": serialize(updated, actor_email)}

    async def remove(self, email: Any, actor_email: str = "") -> dict[str, Any]:
        await self.ensure_seeded()
        normalized = normalize_admin_email(email)
        actor = normalize_admin_email(actor_email)
        if not normalized:
            return {"error": "Valid email is required", "statusCode": 400}
        if normalized == DEFAULT_ADMIN_EMAIL:
            return {"error": "Default admin email cannot be deleted", "statusCode": 403}
        if normalized == actor:
            return {"error": "You cannot delete your own admin access entry", "statusCode": 403}
        result = await self.collection.delete_one({"email": normalized})
        if result.deletedCount == 0:
            return {"error": "Admin email not found", "statusCode": 404}
        return {"deleted": True}
