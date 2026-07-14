import os
from fastapi import APIRouter
from app.models.schemas import AuthenticityRequest, AuthenticityResponse

router = APIRouter()

ENABLE_C2PA = os.getenv("ENABLE_C2PA_CHECK", "true").lower() == "true"
ENABLE_SYNTHID = os.getenv("ENABLE_SYNTHID_CHECK", "true").lower() == "true"


@router.post("/check-authenticity", response_model=AuthenticityResponse)
async def check_authenticity(payload: AuthenticityRequest):
    """
    Checks an uploaded photo for AI-generation / provenance signals before it's
    treated as "real evidence" of a civic issue.

    This is a PLUGGABLE STUB. Wire it up to real provenance services, e.g.:
      - C2PA manifest verification (contentcredentials.org / c2pa-python)
      - SynthID watermark detection (Google DeepMind's detector API/SDK)
      - Provider-specific "verify image" endpoints as they become available

    The stub below only checks for the presence/absence of standard provenance
    metadata blocks and never claims high confidence — real deployments should
    replace `_inspect_metadata` with actual signature verification.
    """
    signals: list[str] = []
    is_ai_generated = None
    confidence = 0.0

    if ENABLE_C2PA:
        has_c2pa = await _inspect_metadata(payload.image_url, kind="c2pa")
        signals.append("c2pa_manifest_present" if has_c2pa else "c2pa_manifest_absent")

    if ENABLE_SYNTHID:
        has_synthid = await _inspect_metadata(payload.image_url, kind="synthid")
        signals.append("synthid_watermark_present" if has_synthid else "synthid_watermark_absent")

    # Absence of provenance metadata is NOT proof of authenticity — most camera
    # photos simply lack these markers. We only raise a flag (not a rejection)
    # when a *positive* AI-provenance signal is actually found.
    if "c2pa_manifest_present" in signals or "synthid_watermark_present" in signals:
        is_ai_generated = True
        confidence = 0.7
    else:
        is_ai_generated = False
        confidence = 0.3  # low confidence — this stub is not a real detector

    return AuthenticityResponse(is_ai_generated=is_ai_generated, confidence=confidence, signals=signals)


async def _inspect_metadata(image_url: str, kind: str) -> bool:
    """
    Placeholder for real metadata inspection. Replace with an actual C2PA
    manifest reader or SynthID detector call. Always returns False here so the
    stub never produces false positives against real citizen photos.
    """
    return False
