from __future__ import annotations

from fastapi import APIRouter

from ..context import json_response
from ..utils import now_iso

router = APIRouter()


@router.get("/")
async def root():
    return json_response({"status": "ok", "service": "mindstores-backend", "timestamp": now_iso()})
