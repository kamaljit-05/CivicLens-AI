from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import summarize, authenticity, similarity

app = FastAPI(
    title="CivicLens AI — AI Service",
    description="Multimodal issue summarization, image authenticity checks, and text similarity scoring.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the backend's origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summarize.router, tags=["summarize"])
app.include_router(authenticity.router, tags=["authenticity"])
app.include_router(similarity.router, tags=["similarity"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "civiclens-ai-service"}
