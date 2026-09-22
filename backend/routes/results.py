"""
Ruta pública de resultados. Solo se muestran si el administrador habilitó
'show_public_results' en la configuración de la elección.
"""
from fastapi import APIRouter

from backend.database import candidates_collection, votes_collection, voters_collection, election_settings_collection
from backend.models.schemas import ResultsResponse, ResultItem

router = APIRouter(prefix="/api/results", tags=["results"])


async def _compute_results(category: str) -> tuple[list[ResultItem], int]:
    candidates = []
    async for c in candidates_collection.find({"category": category}):
        candidates.append(c)

    field = "king_candidate_id" if category == "king" else "queen_candidate_id"
    total_category_votes = 0
    counts = {}
    for c in candidates:
        count = await votes_collection.count_documents({field: c["_id"]})
        counts[str(c["_id"])] = count
        total_category_votes += count

    items = []
    for c in candidates:
        cid = str(c["_id"])
        votes = counts.get(cid, 0)
        pct = (votes / total_category_votes * 100) if total_category_votes > 0 else 0.0
        items.append(ResultItem(
            id=cid,
            name=c["name"],
            group=c.get("group", ""),
            photo_url=c.get("photo_url", ""),
            votes=votes,
            percentage=round(pct, 1),
        ))

    items.sort(key=lambda x: x.votes, reverse=True)
    return items, total_category_votes


@router.get("", response_model=ResultsResponse)
async def get_results():
    settings_doc = await election_settings_collection.find_one({})
    public_visible = bool(settings_doc and settings_doc.get("show_public_results", False))

    total_votes = await votes_collection.count_documents({})
    total_voters = await voters_collection.count_documents({"active": True})
    participation = round((total_votes / total_voters * 100), 1) if total_voters > 0 else 0.0

    if not public_visible:
        return ResultsResponse(
            public_visible=False,
            total_votes=total_votes,
            total_voters=total_voters,
            participation=participation,
        )

    king_results, _ = await _compute_results("king")
    queen_results, _ = await _compute_results("queen")

    return ResultsResponse(
        public_visible=True,
        king_results=king_results,
        queen_results=queen_results,
        total_votes=total_votes,
        total_voters=total_voters,
        participation=participation,
    )
