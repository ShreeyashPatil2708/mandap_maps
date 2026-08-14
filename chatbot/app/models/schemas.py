from pydantic import BaseModel, Field
from typing import Optional, Literal


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128, description="Unique chat session / device id")
    query: str = Field(..., min_length=1, max_length=2000)
    language: Literal["en", "mr", "hi", "auto"] = "auto"


class SourceChunk(BaseModel):
    text: str
    source: str
    score: float


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    sources: list[SourceChunk]
    detected_language: str
    cached: bool = False


class IngestDocument(BaseModel):
    doc_id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=256)
    text: str = Field(..., min_length=1, max_length=50000)
    category: str = Field("general", max_length=64)   # mandal_info | timings | transport | emergency | faq ...


class IngestResponse(BaseModel):
    ingested_chunks: int
    doc_id: str
