"""
Configuración global de la aplicación.
Carga variables de entorno desde .env usando python-dotenv.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "eleccion_rey_reina")

    # Administrador
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 120

    # CORS - dominios permitidos (separados por coma) para producción
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")

    # Nombre y año de la elección por defecto (se puede sobreescribir desde el admin)
    DEFAULT_ELECTION_NAME: str = "Elección de Rey y Reina"
    DEFAULT_ELECTION_YEAR: int = 2026


settings = Settings()
