"""
Ruta pública de verificación de identidad del alumno.
"""
from fastapi import APIRouter

from backend.models.schemas import VerifyRequest, VerifyResponse
from backend.services.voting_service import verify_voter

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/verify", response_model=VerifyResponse)
async def verify(payload: VerifyRequest):
    valid, message, token = await verify_voter(payload.institutional_email, payload.control_number)
    return VerifyResponse(valid=valid, voter_token=token, message=message)
