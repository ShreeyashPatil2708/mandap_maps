from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128, description="Unique chat session / device id")
    query: str = Field(..., min_length=1, max_length=2000)
    language: Literal["en", "mr", "hi", "auto"] = "auto"


class SourceChunk(BaseModel):
    text: str
    source: str
    score: float


class LocationCard(BaseModel):
    """Structured location payload for the MandapMaps map integration
    (feature: 'Connect chatbot with your map'). The frontend renders this
    as a mini map/"View on Map" + "Get Directions" card next to the
    answer instead of the user having to parse an address out of text."""
    type: Literal["location"] = "location"
    doc_id: str
    name: str
    latitude: float | None
    longitude: float | None
    maps_url: str | None
    image_url: str | None = None


class SuggestedAction(BaseModel):
    """A contextual follow-up chip shown under an answer, e.g. 'Aarti
    Timings' / 'Directions' / 'Plan Darshan'. `query` is the canned
    natural-language question sent to the chatbot when tapped."""
    label: str
    emoji: str
    query: str


class PlanStop(BaseModel):
    order: int
    doc_id: str
    name: str
    lat: float | None
    lng: float | None
    leg_km: float | None


class DarshanPlan(BaseModel):
    start_name: str
    start_lat: float
    start_lng: float
    stops: list[PlanStop]
    estimated_minutes_low: int
    estimated_minutes_high: int
    fits_budget: bool


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    sources: list[SourceChunk]
    detected_language: str
    cached: bool = False
    location: LocationCard | None = None
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)
    plan: DarshanPlan | None = None


class IngestDocument(BaseModel):
    doc_id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=256)
    text: str = Field(..., min_length=1, max_length=50000)
    category: str = Field("general", max_length=64)   # mandal_info | timings | transport | emergency | faq ...


class IngestResponse(BaseModel):
    ingested_chunks: int
    doc_id: str
