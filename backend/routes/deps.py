"""
Dependencias compartidas por las rutas, principalmente la protección
de rutas administrativas mediante JWT.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.utils.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    """
    Verifica que la solicitud incluya un token de administrador válido.
    Se usa como dependencia en todas las rutas de /api/admin/*.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado.",
        )

    username = decode_token(credentials.credentials, expected_purpose="admin")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión de administrador inválida o expirada.",
        )

    return username
