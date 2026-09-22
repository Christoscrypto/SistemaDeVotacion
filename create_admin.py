"""
Script interactivo para crear el usuario administrador.

Genera el hash de la contraseña (bcrypt) e inserta el usuario en la
colección 'admin_users'. La contraseña NUNCA se guarda en texto plano.

Ejecutar con:
    python create_admin.py
"""
import asyncio
import getpass

from backend.database import admin_users_collection
from backend.utils.security import hash_password


async def create_admin():
    print("=== Crear usuario administrador ===")
    username = input("Nombre de usuario: ").strip()
    password = getpass.getpass("Contraseña: ")
    password_confirm = getpass.getpass("Confirma la contraseña: ")

    if password != password_confirm:
        print("❌ Las contraseñas no coinciden.")
        return

    if len(password) < 8:
        print("❌ La contraseña debe tener al menos 8 caracteres.")
        return

    existing = await admin_users_collection.find_one({"username": username})
    if existing:
        print("❌ Ya existe un administrador con ese nombre de usuario.")
        return

    password_hash = hash_password(password)
    await admin_users_collection.insert_one({
        "username": username,
        "password_hash": password_hash,
    })

    print(f"\n✅ Administrador '{username}' creado correctamente.")
    print("Ya puedes iniciar sesión en /admin.html con estas credenciales.")


if __name__ == "__main__":
    asyncio.run(create_admin())
