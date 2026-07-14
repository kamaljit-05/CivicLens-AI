# CivicLens AI

Report a civic issue — a pothole, a streetlight out, a blocked drain — with a
photo and a short note. An AI assistant drafts a summary and a suggested fix,
duplicate reports get caught automatically, and nothing goes public until a
human reviews it.

📊 **Product overview:** `presentation/CivicLens-AI-Overview.pptx`
📐 **Architecture, data model, and API reference:** `/docs`

## Repo layout

```
civiclens-ai/
├── frontend/        Next.js — public site + admin dashboard (App Router, Tailwind)
├── backend/          Node + Express — REST API, duplicate detection, auth
├── ai-service/        FastAPI — multimodal summarization, authenticity checks
├── database/          PostgreSQL schema + seed data
├── docs/               Architecture, data model, and API narrative docs
├── api-docs/            OpenAPI 3.0 spec (openapi.yaml)
├── assets/                Brand assets — logo, icon, design tokens
├── presentation/            Product overview slide deck
├── deployment/                 Kubernetes manifests (starting point)
├── docker-compose.yml            Local dev orchestration for all four services
└── LICENSE
```

## Quick start (local, via Docker)

```bash
git clone <this-repo> && cd civiclens-ai
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
cp frontend/.env.example frontend/.env
# fill in GOOGLE_CLIENT_ID, JWT_SECRET, OPENAI_API_KEY, NEWS_API_KEY in the files above

docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:4000/api (health check: `/health`)
- AI service → http://localhost:8000 (health check: `/health`)
- Postgres → localhost:5432 (schema + seed data load automatically on first boot)

## Quick start (without Docker)

Each service can run standalone during development:

```bash
# 1. Database
createdb civiclens
psql civiclens -f database/schema.sql
psql civiclens -f database/seed.sql

# 2. Backend
cd backend && cp .env.example .env && npm install && npm run dev

# 3. AI service
cd ai-service && cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

## How it fits together

```
Frontend (Next.js) ──▶ Backend (Express) ──▶ PostgreSQL
     incl. Admin              │
     Dashboard                ▼
                        AI Service (FastAPI)
                        └─ OpenAI Vision (multimodal summary)
```

The **Admin Dashboard** lives inside the frontend app as a role-gated route
group (`/admin/*`) rather than a separate project — see `docs/ARCHITECTURE.md`
for the reasoning. Nothing a citizen submits reaches the public feed without
an admin approving it there first.

## Key design decisions worth knowing before you dig in

- **Duplicate detection is a three-layer filter** (spatial → temporal →
  semantic) that flags candidates for human review — it never auto-merges.
  See `backend/src/services/duplicateDetection.service.js`.
- **AI enrichment is best-effort.** If the AI service is down, `POST /issues`
  still succeeds; the report just saves without a summary.
- **Image authenticity is a pluggable stub** (`ai-service/app/routers/authenticity.py`).
  Wire in a real C2PA/SynthID provenance check before production use.
- **Duplicate detection and geolocation run in-house**, not through a
  third-party API — location and photos are personal data under GDPR/India's
  DPDP Act, so this keeps that data from leaving your infrastructure
  unnecessarily. See `docs/ARCHITECTURE.md` §7.

## Documentation

| Doc | Covers |
|---|---|
| `docs/ARCHITECTURE.md` | System design, request flow, duplicate-detection algorithm, privacy notes |
| `docs/DATA_MODEL.md` | Entity-relationship summary, indexing notes |
| `docs/API.md` | Narrative endpoint-by-endpoint reference |
| `api-docs/openapi.yaml` | Machine-readable OpenAPI 3.0 spec |

## License

MIT — see `LICENSE`.
