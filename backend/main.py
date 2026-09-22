"""
Punto de entrada de la aplicación FastAPI.

Ejecutar en desarrollo con:
    uvicorn backend.main:app --reload
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import settings
from backend.database import create_indexes, ensure_election_settings
from backend.routes import auth, votes, candidates, results, admin

app = FastAPI(
    title="Elección de Rey y Reina — Programación",
    description="API para la elección de Rey y Reina de la especialidad de Programación.",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de la API
app.include_router(auth.router)
app.include_router(votes.router)
app.include_router(candidates.router)
app.include_router(results.router)
app.include_router(admin.router)


@app.on_event("startup")
async def on_startup():
    await create_indexes()
    await ensure_election_settings()


# ---------- Archivos estáticos del frontend ----------
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


def _serve(filename: str, no_store: bool = False):
    response = FileResponse(str(FRONTEND_DIR / filename))
    if no_store:
        # Evita que el navegador (o su bfcache) reutilice una copia guardada
        # de páginas con datos sensibles o pasos que dependen de una sesión
        # (verificación de votante, boleta de voto, panel de admin). Así,
        # si alguien usa el botón "atrás", el navegador se ve forzado a
        # pedir la página de nuevo en vez de mostrar una versión cacheada.
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response


@app.get("/")
async def serve_index():
    return _serve("index.html")


@app.get("/verify.html")
async def serve_verify():
    return _serve("verify.html", no_store=True)


@app.get("/vote.html")
async def serve_vote():
    return _serve("vote.html", no_store=True)


@app.get("/success.html")
async def serve_success():
    return _serve("success.html", no_store=True)


@app.get("/results.html")
async def serve_results():
    return _serve("results.html")


@app.get("/admin.html")
async def serve_admin():
    return _serve("admin.html", no_store=True)
