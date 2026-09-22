"""
Rutas administrativas. TODAS (excepto /login) requieren un token válido
de administrador mediante la dependencia require_admin.
"""
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from backend.database import (
    admin_users_collection,
    candidates_collection,
    voters_collection,
    votes_collection,
    election_settings_collection,
)
from backend.models.schemas import (
    AdminLoginRequest, AdminLoginResponse, CandidateCreate, CandidateUpdate,
    CandidateOut, DashboardResponse, VoterOut, VoterImportResult,
    ElectionSettingsUpdate,
)
from backend.routes.deps import require_admin
from backend.utils.security import verify_password, create_admin_token

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------- Login ----------

@router.post("/login", response_model=AdminLoginResponse)
async def login(payload: AdminLoginRequest):
    admin = await admin_users_collection.find_one({"username": payload.username.strip()})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos.",
        )
    token = create_admin_token(admin["username"])
    return AdminLoginResponse(access_token=token)


# ---------- Dashboard ----------

@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(_: str = Depends(require_admin)):
    total_voters = await voters_collection.count_documents({"active": True})
    voted_count = await voters_collection.count_documents({"active": True, "has_voted": True})
    pending_count = total_voters - voted_count
    total_votes = await votes_collection.count_documents({})
    participation = round((voted_count / total_voters * 100), 1) if total_voters > 0 else 0.0

    settings_doc = await election_settings_collection.find_one({})
    is_open = bool(settings_doc and settings_doc.get("is_open", False))

    return DashboardResponse(
        total_voters=total_voters,
        voted_count=voted_count,
        pending_count=pending_count,
        total_votes=total_votes,
        participation=participation,
        election_is_open=is_open,
    )


# ---------- Candidatos (CRUD completo, incluye inactivos) ----------

@router.get("/candidates", response_model=list[CandidateOut])
async def list_all_candidates(_: str = Depends(require_admin)):
    candidates = []
    async for c in candidates_collection.find({}):
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


@router.post("/candidates", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
async def create_candidate(payload: CandidateCreate, _: str = Depends(require_admin)):
    doc = payload.model_dump()
    result = await candidates_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return CandidateOut(id=str(doc["_id"]), **payload.model_dump())


@router.put("/candidates/{candidate_id}", response_model=CandidateOut)
async def update_candidate(candidate_id: str, payload: CandidateUpdate, _: str = Depends(require_admin)):
    try:
        oid = ObjectId(candidate_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Candidato no encontrado.")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await candidates_collection.update_one({"_id": oid}, {"$set": updates})

    updated = await candidates_collection.find_one({"_id": oid})
    if not updated:
        raise HTTPException(status_code=404, detail="Candidato no encontrado.")

    return CandidateOut(
        id=str(updated["_id"]),
        name=updated["name"],
        category=updated["category"],
        group=updated["group"],
        description=updated.get("description", ""),
        photo_url=updated.get("photo_url", ""),
        active=updated.get("active", True),
    )


@router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, _: str = Depends(require_admin)):
    try:
        oid = ObjectId(candidate_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Candidato no encontrado.")

    # Si ya existen votos relacionados, NO se elimina físicamente: se desactiva.
    has_votes = await votes_collection.count_documents(
        {"$or": [{"king_candidate_id": oid}, {"queen_candidate_id": oid}]}
    ) > 0

    if has_votes:
        await candidates_collection.update_one({"_id": oid}, {"$set": {"active": False}})
        return {"message": "El candidato tiene votos registrados; se desactivó en lugar de eliminarse."}

    result = await candidates_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidato no encontrado.")
    return {"message": "Candidato eliminado."}


# ---------- Votantes ----------

@router.get("/voters", response_model=list[VoterOut])
async def list_voters(_: str = Depends(require_admin)):
    voters = []
    async for v in voters_collection.find({}, {"control_number": 1, "has_voted": 1, "active": 1}):
        voters.append(VoterOut(
            control_number=v["control_number"],
            has_voted=v.get("has_voted", False),
            active=v.get("active", True),
        ))
    return voters


@router.post("/import-voters", response_model=VoterImportResult)
async def import_voters(file: UploadFile = File(...), _: str = Depends(require_admin)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV.")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo. Usa codificación UTF-8.")

    reader = csv.DictReader(io.StringIO(text))
    required_columns = {"control_number", "institutional_email"}
    if not reader.fieldnames or not required_columns.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail="El CSV debe tener las columnas: control_number, institutional_email",
        )

    inserted = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):  # fila 1 es el encabezado
        control_number = (row.get("control_number") or "").strip()
        email = (row.get("institutional_email") or "").strip().lower()

        if not control_number or not email or "@" not in email:
            skipped += 1
            errors.append(f"Fila {i}: datos incompletos o inválidos.")
            continue

        try:
            await voters_collection.insert_one({
                "control_number": control_number,
                "institutional_email": email,
                "active": True,
                "has_voted": False,
            })
            inserted += 1
        except DuplicateKeyError:
            skipped += 1
            errors.append(f"Fila {i}: {control_number} o {email} ya existe.")

    return VoterImportResult(inserted=inserted, skipped=skipped, errors=errors[:50])


# ---------- Configuración de la elección ----------

@router.put("/election-settings")
async def update_election_settings(payload: ElectionSettingsUpdate, _: str = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No se enviaron cambios.")

    await election_settings_collection.update_one({}, {"$set": updates}, upsert=True)
    settings_doc = await election_settings_collection.find_one({})
    settings_doc["_id"] = str(settings_doc["_id"])
    return settings_doc


@router.get("/election-settings")
async def get_election_settings(_: str = Depends(require_admin)):
    settings_doc = await election_settings_collection.find_one({})
    if settings_doc:
        settings_doc["_id"] = str(settings_doc["_id"])
    return settings_doc
