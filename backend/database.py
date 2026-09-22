"""
Conexión a MongoDB usando Motor (driver asíncrono oficial para FastAPI).
"""
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client[settings.DATABASE_NAME]

# Colecciones
voters_collection = db["voters"]
candidates_collection = db["candidates"]
votes_collection = db["votes"]
election_settings_collection = db["election_settings"]
admin_users_collection = db["admin_users"]


async def create_indexes():
    """
    Crea los índices necesarios para garantizar integridad de datos
    y evitar duplicados. Se ejecuta al iniciar la aplicación.
    """
    # Un alumno no puede repetirse ni por correo ni por número de control
    await voters_collection.create_index("control_number", unique=True)
    await voters_collection.create_index("institutional_email", unique=True)

    # Un usuario admin no puede repetirse
    await admin_users_collection.create_index("username", unique=True)

    # Índices para consultas rápidas de candidatos y resultados
    await candidates_collection.create_index("category")
    await candidates_collection.create_index("active")


async def ensure_election_settings():
    """
    Garantiza que exista un único documento de configuración de la elección.
    """
    existing = await election_settings_collection.find_one({})
    if not existing:
        await election_settings_collection.insert_one({
            "is_open": True,
            "show_public_results": False,
            "election_name": settings.DEFAULT_ELECTION_NAME,
            "year": settings.DEFAULT_ELECTION_YEAR,
        })
