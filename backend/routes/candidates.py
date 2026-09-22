"""
Ruta pública para listar candidatos activos (usada en la página de votación).
"""
from fastapi import APIRouter

from backend.database import candidates_collection
from backend.models.schemas import CandidateOut

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateOut])
async def list_candidates():
    cursor = candidates_collection.find({"active": True})
    candidates = []
    async for c in cursor:
        candidates.append(CandidateOut(
            id=str(c["_id"]),
            name=c["name"],
            category=c["category"],
            group=c["group"],
            description=c.get("description", ""),
            photo_url=c.get("photo_url", ""),
            active=c.get("active", True),
        ))
    return candidates
