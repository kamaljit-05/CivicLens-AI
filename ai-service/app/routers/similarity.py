from fastapi import APIRouter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models.schemas import SimilarityRequest, SimilarityResponse

router = APIRouter()


@router.post("/similarity", response_model=SimilarityResponse)
async def similarity(payload: SimilarityRequest):
    """
    TF-IDF cosine similarity between two issue descriptions — an optional,
    stronger semantic-layer signal the backend's duplicate-detection service
    can call for borderline cases where the lightweight keyword-overlap score
    (computed in-process in the Node backend) sits near the threshold.
    """
    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        tfidf = vectorizer.fit_transform([payload.text_a, payload.text_b])
        score = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except ValueError:
        # Empty vocabulary (e.g. both strings were pure stopwords/punctuation)
        score = 0.0

    return SimilarityResponse(score=round(score, 3), method="tfidf_cosine")
