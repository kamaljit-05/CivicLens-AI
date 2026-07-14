import os
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from app.models.schemas import SummarizeRequest, SummarizeResponse

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
VISION_MODEL = os.getenv("VISION_MODEL", "gpt-4o")
MIN_WORDS = os.getenv("SUMMARY_MIN_WORDS", "100")
MAX_WORDS = os.getenv("SUMMARY_MAX_WORDS", "150")

SYSTEM_PROMPT = (
    "You are a civic-issue analyst for a city reporting app. You are shown a "
    "photo of a public infrastructure problem plus the citizen's own title and "
    "description. Respond ONLY with strict JSON of the form "
    '{"summary": "...", "suggestion": "..."}. '
    f"`summary` must be {MIN_WORDS}-{MAX_WORDS} words, plain language, describing "
    "what the image and text show and why it matters. `suggestion` must be one or "
    "two sentences proposing a practical fix or next step for the responsible "
    "municipal department. Do not include markdown or any text outside the JSON object."
)


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(payload: SummarizeRequest):
    """
    Multimodal summarization: sends the issue photo + citizen-authored text to a
    vision-capable LLM and returns a concise summary plus a suggested fix.
    This is the core of the "AI Assistance" panel described in the product spec.
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="AI provider not configured")

    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Title: {payload.title}\nDescription: {payload.description}",
                        },
                        {"type": "image_url", "image_url": {"url": payload.image_url}},
                    ],
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=500,
        )

        import json

        parsed = json.loads(response.choices[0].message.content)
        return SummarizeResponse(summary=parsed["summary"], suggestion=parsed["suggestion"])

    except Exception as exc:  # noqa: BLE001 — surface as a clean 502 to the caller
        raise HTTPException(status_code=502, detail=f"AI summarization failed: {exc}") from exc
