"""
Esquemas Pydantic para validar entradas y dar forma a las salidas de la API.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ---------- Autenticación de alumnos ----------

class VerifyRequest(BaseModel):
    institutional_email: EmailStr
    control_number: str = Field(..., min_length=3, max_length=20)


class VerifyResponse(BaseModel):
    valid: bool
    voter_token: Optional[str] = None
    message: str


# ---------- Candidatos ----------

class CandidateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., pattern="^(king|queen)$")
    group: str = Field(..., min_length=1, max_length=20)
    description: str = Field("", max_length=500)
    photo_url: str = ""
    active: bool = True


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = Field(None, pattern="^(king|queen)$")
    group: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    active: Optional[bool] = None


class CandidateOut(BaseModel):
    id: str
    name: str
    category: str
    group: str
    description: str
    photo_url: str
    active: bool


# ---------- Votos ----------

class VoteRequest(BaseModel):
    voter_token: str
    king_candidate_id: str
    queen_candidate_id: str


class VoteResponse(BaseModel):
    success: bool
    message: str


# ---------- Resultados ----------

class ResultItem(BaseModel):
    id: str
    name: str
    group: str
    photo_url: str
    votes: int
    percentage: float


class ResultsResponse(BaseModel):
    public_visible: bool
    king_results: list[ResultItem] = []
    queen_results: list[ResultItem] = []
    total_votes: int = 0
    total_voters: int = 0
    participation: float = 0.0


# ---------- Admin ----------

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ElectionSettingsUpdate(BaseModel):
    is_open: Optional[bool] = None
    show_public_results: Optional[bool] = None
    election_name: Optional[str] = None
    year: Optional[int] = None


class DashboardResponse(BaseModel):
    total_voters: int
    voted_count: int
    pending_count: int
    total_votes: int
    participation: float
    election_is_open: bool


class VoterOut(BaseModel):
    control_number: str
    has_voted: bool
    active: bool


class VoterImportResult(BaseModel):
    inserted: int
    skipped: int
    errors: list[str] = []
