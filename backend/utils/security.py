"""
Utilidades de seguridad: hashing de contraseñas y manejo de tokens JWT.

Se usan DOS tipos de token JWT, cada uno con su propio "purpose" (propósito)
para que no puedan usarse indistintamente:

- "voter": token de corta duración que se entrega a un alumno después de
  verificar su identidad. Le permite emitir su voto SIN volver a enviar
  su correo/número de control. No se guarda en la base de datos.
- "admin": token de sesión para el panel de administración.
"""
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from backend.config import settings


# ---------- Contraseñas ----------

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------- Tokens JWT ----------

def _create_token(data: dict, expires_minutes: int) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_voter_token(control_number: str) -> str:
    """Token de corta duración (15 min) que autoriza a un alumno a votar una sola vez."""
    return _create_token(
        {"sub": control_number, "purpose": "voter"},
        expires_minutes=15,
    )


def create_admin_token(username: str) -> str:
    return _create_token(
        {"sub": username, "purpose": "admin"},
        expires_minutes=settings.JWT_EXPIRE_MINUTES,
    )


def decode_token(token: str, expected_purpose: str) -> str | None:
    """
    Decodifica un token y valida que su 'purpose' coincida con el esperado.
    Devuelve el 'sub' (identificador) si es válido, o None si no lo es.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None

    if payload.get("purpose") != expected_purpose:
        return None

    return payload.get("sub")
