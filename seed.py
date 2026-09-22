"""
Script para llenar la base de datos con información de PRUEBA:
- 10 alumnos ficticios (votantes)
- 5 candidatos a Rey
- 5 candidatas a Reina
- Configuración inicial de la elección

Ningún dato aquí corresponde a personas reales.

Ejecutar con:
    python seed.py
"""
import asyncio

from backend.database import (
    voters_collection,
    candidates_collection,
    election_settings_collection,
)


FAKE_VOTERS = [
    {"control_number": f"2024{str(i).zfill(4)}", "institutional_email": f"alumno.prueba{i}@escuela.edu.mx",
     "active": True, "has_voted": False}
    for i in range(1, 11)
]

KING_CANDIDATES = [
    {"name": "Ángel Ramírez", "category": "king", "group": "4A", "description": "Entusiasta de Python y robótica.", "photo_url": "", "active": True},
    {"name": "Bruno Castillo", "category": "king", "group": "4B", "description": "Desarrollador de videojuegos aficionado.", "photo_url": "", "active": True},
    {"name": "Diego Fernández", "category": "king", "group": "5A", "description": "Le apasiona el desarrollo web.", "photo_url": "", "active": True},
    {"name": "Emilio Torres", "category": "king", "group": "5B", "description": "Fan de la inteligencia artificial.", "photo_url": "", "active": True},
    {"name": "Iván Morales", "category": "king", "group": "6A", "description": "Futuro ingeniero en sistemas.", "photo_url": "", "active": True},
]

QUEEN_CANDIDATES = [
    {"name": "Camila Herrera", "category": "queen", "group": "4A", "description": "Apasionada por el diseño UX/UI.", "photo_url": "", "active": True},
    {"name": "Daniela Ríos", "category": "queen", "group": "4B", "description": "Le encanta programar en Python.", "photo_url": "", "active": True},
    {"name": "Fernanda Ortiz", "category": "queen", "group": "5A", "description": "Aspirante a desarrolladora full-stack.", "photo_url": "", "active": True},
    {"name": "Mariana Luna", "category": "queen", "group": "5B", "description": "Entusiasta de la ciberseguridad.", "photo_url": "", "active": True},
    {"name": "Valeria Campos", "category": "queen", "group": "6A", "description": "Le gusta el desarrollo de apps móviles.", "photo_url": "", "active": True},
]


async def seed():
    print("Insertando alumnos de prueba...")
    for voter in FAKE_VOTERS:
        await voters_collection.update_one(
            {"control_number": voter["control_number"]},
            {"$setOnInsert": voter},
            upsert=True,
        )

    print("Insertando candidatos a Rey...")
    for c in KING_CANDIDATES:
        exists = await candidates_collection.find_one({"name": c["name"], "category": "king"})
        if not exists:
            await candidates_collection.insert_one(c)

    print("Insertando candidatas a Reina...")
    for c in QUEEN_CANDIDATES:
        exists = await candidates_collection.find_one({"name": c["name"], "category": "queen"})
        if not exists:
            await candidates_collection.insert_one(c)

    print("Configurando la elección...")
    await election_settings_collection.update_one(
        {},
        {"$setOnInsert": {
            "is_open": True,
            "show_public_results": False,
            "election_name": "Elección de Rey y Reina",
            "year": 2026,
        }},
        upsert=True,
    )

    print("\n✅ Datos de prueba insertados correctamente.")
    print(f"   Alumnos: {len(FAKE_VOTERS)}")
    print(f"   Candidatos a Rey: {len(KING_CANDIDATES)}")
    print(f"   Candidatas a Reina: {len(QUEEN_CANDIDATES)}")
    print("\nCorreo de ejemplo para probar el login: alumno.prueba1@escuela.edu.mx")
    print("Número de control de ejemplo: 20240001")


if __name__ == "__main__":
    asyncio.run(seed())
