"""
Lógica de negocio para verificación de identidad y emisión de votos.

El punto más delicado del sistema es evitar que un mismo alumno vote dos
veces, incluso si envía dos solicitudes al mismo tiempo (condición de
carrera). Para resolverlo usamos una operación ATÓMICA de MongoDB:
find_one_and_update con el filtro has_voted=False. Si dos solicitudes
llegan simultáneamente, solo UNA de ellas encontrará el documento con
has_voted=False y logrará actualizarlo; la otra no encontrará coincidencia
y será rechazada. Esto ocurre a nivel de base de datos, no de Python, así
que es seguro ante concurrencia real.
"""
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId

from backend.database import voters_collection, votes_collection, candidates_collection, election_settings_collection
from backend.utils.security import create_voter_token, decode_token


async def verify_voter(institutional_email: str, control_number: str) -> tuple[bool, str, str | None]:
    """
    Verifica que el alumno exista, esté activo y no haya votado.
    Devuelve (es_valido, mensaje, voter_token)
    """
    voter = await voters_collection.find_one({
        "institutional_email": institutional_email.lower().strip(),
        "control_number": control_number.strip(),
    })

    # Mensaje genérico: no revelamos si el correo existe pero el número no,
    # o viceversa, para no facilitar ataques de enumeración de datos.
    if not voter:
        return False, "Los datos ingresados no son correctos.", None

    if not voter.get("active", True):
        return False, "Este alumno no está autorizado para participar.", None

    if voter.get("has_voted", False):
        return False, "Este alumno ya ha emitido su voto.", None

    settings_doc = await election_settings_collection.find_one({})
    if not settings_doc or not settings_doc.get("is_open", False):
        return False, "Las votaciones han finalizado.", None

    token = create_voter_token(voter["control_number"])
    return True, "Verificación exitosa.", token


async def cast_vote(voter_token: str, king_candidate_id: str, queen_candidate_id: str) -> tuple[bool, str]:
    """
    Registra un voto de forma anónima y marca al alumno como que ya votó,
    todo mediante una operación atómica que impide votos duplicados.
    """
    control_number = decode_token(voter_token, expected_purpose="voter")
    if not control_number:
        return False, "Tu sesión de verificación expiró o no es válida. Verifica tu identidad nuevamente."

    settings_doc = await election_settings_collection.find_one({})
    if not settings_doc or not settings_doc.get("is_open", False):
        return False, "Las votaciones han finalizado."

    # Validar que los candidatos existan, estén activos y sean de la categoría correcta
    try:
        king_oid = ObjectId(king_candidate_id)
        queen_oid = ObjectId(queen_candidate_id)
    except InvalidId:
        return False, "Candidato inválido."

    king = await candidates_collection.find_one({"_id": king_oid, "category": "king", "active": True})
    queen = await candidates_collection.find_one({"_id": queen_oid, "category": "queen", "active": True})

    if not king or not queen:
        return False, "Uno de los candidatos seleccionados ya no está disponible."

    # Operación atómica: solo tiene éxito si has_voted seguía siendo False.
    result = await voters_collection.find_one_and_update(
        {"control_number": control_number, "has_voted": False, "active": True},
        {"$set": {"has_voted": True}},
    )

    if not result:
        # Ya había votado (o fue desactivado) entre la verificación y el envío del voto.
        return False, "Este alumno ya ha emitido su voto."

    # El voto se guarda COMPLETAMENTE separado de la identidad del alumno.
    await votes_collection.insert_one({
        "king_candidate_id": king_oid,
        "queen_candidate_id": queen_oid,
        "created_at": datetime.now(timezone.utc),
    })

    return True, "Voto registrado correctamente."
