from __future__ import annotations

import copy
import re
from asyncio import to_thread
from dataclasses import dataclass
from typing import Any

import httpx

from .config import AppConfig
from .utils import deep_clone


def _get_path(doc: dict[str, Any], path: str) -> Any:
    value: Any = doc
    for part in path.split("."):
        if isinstance(value, list):
            value = [item[part] for item in value if isinstance(item, dict) and part in item]
            continue
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def _matches(doc: dict[str, Any], query: dict[str, Any] | None) -> bool:
    if not query:
        return True

    for key, expected in query.items():
        if key == "$or":
            if not isinstance(expected, list) or not any(_matches(doc, item) for item in expected):
                return False
            continue
        if key == "$and":
            if not isinstance(expected, list) or not all(_matches(doc, item) for item in expected):
                return False
            continue

        actual = _get_path(doc, key)
        if isinstance(expected, dict) and not isinstance(expected, list):
            for op, operand in expected.items():
                if op == "$gt" and not (actual is not None and actual > operand):
                    return False
                if op == "$gte" and not (actual is not None and actual >= operand):
                    return False
                if op == "$lt" and not (actual is not None and actual < operand):
                    return False
                if op == "$lte" and not (actual is not None and actual <= operand):
                    return False
                if op == "$ne" and actual == operand:
                    return False
                if op == "$in" and not (isinstance(operand, list) and actual in operand):
                    return False
                if op == "$exists" and ((actual is not None) != bool(operand)):
                    return False
                if op == "$regex":
                    flags = re.IGNORECASE if "i" in str(expected.get("$options", "")) else 0
                    if re.search(str(operand), str(actual or ""), flags) is None:
                        return False
                if op == "$oid" and str(actual) != str(operand):
                    return False
            continue

        if isinstance(actual, list):
            if expected not in actual:
                return False
            continue
        if actual != expected:
            return False

    return True


def _apply_update(doc: dict[str, Any], update: dict[str, Any], insert: bool = False) -> dict[str, Any]:
    out = deep_clone(doc)
    if insert and isinstance(update.get("$setOnInsert"), dict):
        out.update(update["$setOnInsert"])
    if isinstance(update.get("$set"), dict):
        out.update(update["$set"])
    if isinstance(update.get("$inc"), dict):
        for key, value in update["$inc"].items():
            out[key] = (out.get(key) or 0) + value
    if isinstance(update.get("$pull"), dict):
        for key, condition in update["$pull"].items():
            if isinstance(out.get(key), list):
                out[key] = [item for item in out[key] if not _matches(item, condition)]
    return out


def _project(doc: dict[str, Any], projection: dict[str, Any] | None) -> dict[str, Any]:
    if not projection:
        return deep_clone(doc)
    if all(value in (0, False) for value in projection.values()):
        clone = deep_clone(doc)
        for key, enabled in projection.items():
            if enabled in (0, False):
                clone.pop(key, None)
        return clone
    return {key: deep_clone(doc[key]) for key, enabled in projection.items() if enabled and key in doc}


def _native_query(value: Any) -> Any:
    if isinstance(value, list):
        return [_native_query(item) for item in value]
    if not isinstance(value, dict):
        return value
    if set(value.keys()) == {"$oid"}:
        try:
            from bson import ObjectId

            return ObjectId(str(value["$oid"]))
        except Exception:
            return str(value["$oid"])
    return {key: _native_query(item) for key, item in value.items()}


def _clean_doc(value: Any) -> Any:
    return deep_clone(value)


@dataclass
class UpdateResult:
    matchedCount: int = 0
    modifiedCount: int = 0
    upsertedId: str | None = None


@dataclass
class DeleteResult:
    deletedCount: int = 0


class Cursor:
    def __init__(self, collection: "Collection", query: dict[str, Any], options: dict[str, Any] | None = None):
        self.collection = collection
        self.query = query or {}
        self.projection = (options or {}).get("projection") or {}
        self.sort_clause = (options or {}).get("sort") or {}
        self.skip_count = int((options or {}).get("skip") or 0)
        self.limit_count = int((options or {}).get("limit") or 0)

    def sort(self, clause: dict[str, int]) -> "Cursor":
        self.sort_clause = clause or {}
        return self

    def skip(self, count: int) -> "Cursor":
        self.skip_count = max(0, int(count or 0))
        return self

    def limit(self, count: int) -> "Cursor":
        self.limit_count = max(0, int(count or 0))
        return self

    async def to_array(self) -> list[dict[str, Any]]:
        return await self.collection.find_array(
            self.query,
            {
                "projection": self.projection,
                "sort": self.sort_clause,
                "skip": self.skip_count,
                "limit": self.limit_count,
            },
        )


class Collection:
    async def find_one(self, query: dict[str, Any], options: dict[str, Any] | None = None) -> dict[str, Any] | None:
        raise NotImplementedError

    def find(self, query: dict[str, Any] | None = None, options: dict[str, Any] | None = None) -> Cursor:
        return Cursor(self, query or {}, options)

    async def find_array(self, query: dict[str, Any], options: dict[str, Any]) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def insert_one(self, doc: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    async def update_one(
        self,
        query: dict[str, Any],
        update: dict[str, Any],
        upsert: bool = False,
    ) -> UpdateResult:
        raise NotImplementedError

    async def delete_one(self, query: dict[str, Any]) -> DeleteResult:
        raise NotImplementedError

    async def delete_many(self, query: dict[str, Any]) -> DeleteResult:
        raise NotImplementedError

    async def count_documents(self, query: dict[str, Any] | None = None) -> int:
        raise NotImplementedError


class AtlasCollection(Collection):
    def __init__(self, db: "AtlasDb", name: str):
        self.db = db
        self.name = name

    async def _request(self, action: str, body: dict[str, Any]) -> dict[str, Any]:
        return await self.db.request(action, {"collection": self.name, **body})

    async def find_one(self, query: dict[str, Any], options: dict[str, Any] | None = None) -> dict[str, Any] | None:
        result = await self._request("findOne", {"filter": query or {}, "projection": (options or {}).get("projection") or {}})
        return result.get("document")

    async def find_array(self, query: dict[str, Any], options: dict[str, Any]) -> list[dict[str, Any]]:
        payload = {
            "filter": query or {},
            "projection": options.get("projection") or {},
            "sort": options.get("sort") or {},
        }
        if options.get("skip", 0) > 0:
            payload["skip"] = options["skip"]
        if options.get("limit", 0) > 0:
            payload["limit"] = options["limit"]
        result = await self._request("find", payload)
        return result.get("documents") if isinstance(result.get("documents"), list) else []

    async def insert_one(self, doc: dict[str, Any]) -> dict[str, Any]:
        result = await self._request("insertOne", {"document": doc})
        return {"insertedId": result.get("insertedId")}

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> UpdateResult:
        result = await self._request("updateOne", {"filter": query, "update": update, "upsert": bool(upsert)})
        return UpdateResult(result.get("matchedCount", 0), result.get("modifiedCount", 0), result.get("upsertedId"))

    async def update_many(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> UpdateResult:
        result = await self._request("updateMany", {"filter": query, "update": update, "upsert": bool(upsert)})
        return UpdateResult(result.get("matchedCount", 0), result.get("modifiedCount", 0), result.get("upsertedId"))

    async def delete_one(self, query: dict[str, Any]) -> DeleteResult:
        result = await self._request("deleteOne", {"filter": query})
        return DeleteResult(result.get("deletedCount", 0))

    async def delete_many(self, query: dict[str, Any]) -> DeleteResult:
        result = await self._request("deleteMany", {"filter": query})
        return DeleteResult(result.get("deletedCount", 0))

    async def count_documents(self, query: dict[str, Any] | None = None) -> int:
        result = await self._request("countDocuments", {"filter": query or {}})
        return int(result.get("count", result.get("totalCount", 0)) or 0)


class AtlasDb:
    def __init__(self, config: AppConfig):
        self.config = config

    def collection(self, name: str) -> Collection:
        return AtlasCollection(self, name)

    async def request(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = {
            **payload,
            "database": self.config.db_name,
            "dataSource": self.config.mongo_data_source,
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self.config.mongo_data_api_url}/action/{action}",
                headers={"Content-Type": "application/json", "api-key": self.config.mongo_data_api_key},
                json=body,
            )
        response.raise_for_status()
        return response.json()


class NativeMongoCollection(Collection):
    def __init__(self, db: "NativeMongoDb", name: str):
        self.db = db
        self.collection = db.database[name]

    async def find_one(self, query: dict[str, Any], options: dict[str, Any] | None = None) -> dict[str, Any] | None:
        document = await to_thread(
            self.collection.find_one,
            _native_query(query or {}),
            (options or {}).get("projection") or None,
        )
        return _clean_doc(document) if document else None

    async def find_array(self, query: dict[str, Any], options: dict[str, Any]) -> list[dict[str, Any]]:
        def run_find() -> list[dict[str, Any]]:
            cursor = self.collection.find(
                _native_query(query or {}),
                options.get("projection") or None,
            )
            if options.get("sort"):
                cursor = cursor.sort(list(options["sort"].items()))
            if options.get("skip", 0) > 0:
                cursor = cursor.skip(int(options["skip"]))
            if options.get("limit", 0) > 0:
                cursor = cursor.limit(int(options["limit"]))
            return list(cursor)

        return [_clean_doc(document) for document in await to_thread(run_find)]

    async def insert_one(self, doc: dict[str, Any]) -> dict[str, Any]:
        result = await to_thread(self.collection.insert_one, copy.deepcopy(doc))
        return {"insertedId": str(result.inserted_id)}

    async def update_one(
        self,
        query: dict[str, Any],
        update: dict[str, Any],
        upsert: bool = False,
    ) -> UpdateResult:
        result = await to_thread(
            self.collection.update_one,
            _native_query(query or {}),
            copy.deepcopy(update),
            upsert=bool(upsert),
        )
        return UpdateResult(
            result.matched_count,
            result.modified_count,
            str(result.upserted_id) if result.upserted_id else None,
        )

    async def update_many(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> UpdateResult:
        result = await to_thread(
            self.collection.update_many,
            _native_query(query or {}),
            copy.deepcopy(update),
            upsert=bool(upsert),
        )
        return UpdateResult(
            result.matched_count,
            result.modified_count,
            str(result.upserted_id) if result.upserted_id else None,
        )

    async def delete_one(self, query: dict[str, Any]) -> DeleteResult:
        result = await to_thread(self.collection.delete_one, _native_query(query or {}))
        return DeleteResult(result.deleted_count)

    async def delete_many(self, query: dict[str, Any]) -> DeleteResult:
        result = await to_thread(self.collection.delete_many, _native_query(query or {}))
        return DeleteResult(result.deleted_count)

    async def count_documents(self, query: dict[str, Any] | None = None) -> int:
        return int(await to_thread(self.collection.count_documents, _native_query(query or {})))


class NativeMongoDb:
    def __init__(self, config: AppConfig):
        from pymongo import MongoClient

        self.client = MongoClient(config.mongo_url, serverSelectionTimeoutMS=8000)
        self.client.admin.command("ping")
        self.database = self.client[config.db_name]

    def collection(self, name: str) -> Collection:
        return NativeMongoCollection(self, name)


class MemCollection(Collection):
    def __init__(self):
        self.docs: dict[str, dict[str, Any]] = {}

    def _all(self) -> list[dict[str, Any]]:
        return [copy.deepcopy(doc) for doc in self.docs.values()]

    async def find_one(self, query: dict[str, Any], options: dict[str, Any] | None = None) -> dict[str, Any] | None:
        for doc in self._all():
            if _matches(doc, query):
                return _project(doc, (options or {}).get("projection") or {})
        return None

    async def find_array(self, query: dict[str, Any], options: dict[str, Any]) -> list[dict[str, Any]]:
        docs = [doc for doc in self._all() if _matches(doc, query)]
        sort_clause = options.get("sort") or {}
        for key, direction in reversed(list(sort_clause.items())):
            docs.sort(key=lambda item: (_get_path(item, key) is None, _get_path(item, key)), reverse=int(direction) < 0)
        skip = int(options.get("skip") or 0)
        limit = int(options.get("limit") or 0)
        if skip > 0:
            docs = docs[skip:]
        if limit > 0:
            docs = docs[:limit]
        return [_project(doc, options.get("projection") or {}) for doc in docs]

    async def insert_one(self, doc: dict[str, Any]) -> dict[str, Any]:
        clone = deep_clone(doc)
        clone.setdefault("_id", str(uuid4_hex()))
        self.docs[str(clone["_id"])] = clone
        return {"insertedId": clone["_id"]}

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> UpdateResult:
        for key, doc in list(self.docs.items()):
            if _matches(doc, query):
                self.docs[key] = _apply_update(doc, update)
                return UpdateResult(1, 1, None)
        if not upsert:
            return UpdateResult()
        seed = {key: value for key, value in query.items() if not key.startswith("$") and not isinstance(value, dict)}
        inserted = _apply_update(seed, update, insert=True)
        result = await self.insert_one(inserted)
        return UpdateResult(0, 0, result["insertedId"])

    async def update_many(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> UpdateResult:
        matched = 0
        for key, doc in list(self.docs.items()):
            if _matches(doc, query):
                self.docs[key] = _apply_update(doc, update)
                matched += 1
        if matched == 0 and upsert:
            result = await self.update_one(query, update, True)
            return result
        return UpdateResult(matched, matched, None)

    async def delete_one(self, query: dict[str, Any]) -> DeleteResult:
        for key, doc in list(self.docs.items()):
            if _matches(doc, query):
                del self.docs[key]
                return DeleteResult(1)
        return DeleteResult()

    async def delete_many(self, query: dict[str, Any]) -> DeleteResult:
        deleted = 0
        for key, doc in list(self.docs.items()):
            if _matches(doc, query):
                del self.docs[key]
                deleted += 1
        return DeleteResult(deleted)

    async def count_documents(self, query: dict[str, Any] | None = None) -> int:
        return sum(1 for doc in self.docs.values() if _matches(doc, query or {}))


class MemDb:
    def __init__(self):
        self.collections: dict[str, MemCollection] = {}

    def collection(self, name: str) -> Collection:
        self.collections.setdefault(name, MemCollection())
        return self.collections[name]


def uuid4_hex() -> str:
    import uuid

    return uuid.uuid4().hex


def create_db(config: AppConfig) -> AtlasDb | NativeMongoDb | MemDb:
    if config.mongo_url:
        try:
            print(f"[db] Connecting to MongoDB database '{config.db_name}' with MONGO_URL.")
            return NativeMongoDb(config)
        except Exception as exc:
            print(f"[db] MongoDB connection failed - {exc}.")
    if config.mongo_data_api_url and config.mongo_data_api_key:
        return AtlasDb(config)
    print("[db] No MongoDB config found - using in-memory store.")
    return MemDb()
