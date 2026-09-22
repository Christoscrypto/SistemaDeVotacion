"""
Ruta pública para emitir un voto.
"""
from fastapi import APIRouter

from backend.models.schemas import VoteRequest, VoteResponse
from backend.services.voting_service import cast_vote

router = APIRouter(prefix="/api/votes", tags=["votes"])


@router.post("", response_model=VoteResponse)
async def create_vote(payload: VoteRequest):
    success, message = await cast_vote(
        payload.voter_token,
        payload.king_candidate_id,
        payload.queen_candidate_id,
    )
    return VoteResponse(success=success, message=message)
