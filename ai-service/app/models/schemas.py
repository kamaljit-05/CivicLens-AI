from pydantic import BaseModel, Field
from typing import Optional, List


class SummarizeRequest(BaseModel):
    image_url: str
    title: str
    description: str


class SummarizeResponse(BaseModel):
    summary: str = Field(..., description="100-150 word plain-language summary of the issue")
    suggestion: str = Field(..., description="A short, actionable suggested fix")


class AuthenticityRequest(BaseModel):
    image_url: str


class AuthenticityResponse(BaseModel):
    is_ai_generated: Optional[bool]
    confidence: float
    signals: List[str]


class SimilarityRequest(BaseModel):
    text_a: str
    text_b: str


class SimilarityResponse(BaseModel):
    score: float
    method: str
