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
# fill in GOOGLE_CLIENT_ID, JWT_SECRET, OPENAI_API_KEY in the files above -- no NEWS_API_KEY needed, news is powered by Google News' free RSS feed

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

The **Admin Dashboard** lives inside the frontend app as a route group
(`/admin/*`) gated on the `ADMIN_EMAILS` allow-list — not a role a user can
set on themselves. Every `/api/admin/*` endpoint re-checks that live
allow-list server-side on every request (`backend/src/middleware/auth.js`),
so the frontend guard is a UX nicety, not the actual boundary. Nothing a
citizen submits reaches the public feed without an admin approving it
there first. See `docs/ARCHITECTURE.md` for more.

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

## Deploying without the classic 404 / 504 on Google sign-in

These two symptoms almost always trace back to one of the same handful of
causes, all fixed in this codebase but worth understanding if you redeploy
somewhere new:

1. **`NEXT_PUBLIC_API_URL` wasn't set in the hosting provider's dashboard.**
   `NEXT_PUBLIC_*` vars are baked in at *build* time — a `.env.local` file
   does nothing for a deployed build. If it's unset, the deployed frontend
   tries to call the API at `http://localhost:4000` from the visitor's own
   browser, which fails immediately. `frontend/lib/api.ts` now throws a
   specific error naming this instead of a silent/cryptic failure.
2. **Backend unreachable from the frontend's own origin (CORS).**
   `FRONTEND_ORIGIN` on the backend must exactly match every origin the
   frontend is actually served from (prod domain, preview URLs, localhost)
   — it now accepts a comma-separated list (`backend/src/server.js`).
3. **Free-tier backend cold starts.** Render/Railway free tiers sleep after
   inactivity and can take 20–50s to wake, which the browser reports as a
   timeout or 504 on the very first request. `api.ts` now fails fast (15s)
   with a message that explains this instead of hanging with a generic
   network error.
4. **Google Cloud Console origin misconfigured.** This app uses Google
   Identity Services' button flow (`frontend/app/login/page.tsx`), not the
   OAuth redirect flow — so there's no `redirect_uri` to mismatch. Add your
   domain(s) under **Authorized JavaScript origins**, not *Authorized
   redirect URIs* (a very common mix-up, since most OAuth tutorials show the
   redirect flow).
5. There is intentionally **no Next.js `rewrites()` proxy** in
   `next.config.js` anymore — the frontend calls the backend directly and
   relies on CORS. A rewrite proxy adds a second hop through the frontend
   host's own serverless/edge runtime, which is a common source of both
   symptoms on static/edge hosts.

## Admin access, the map, and location-aware news

- **Admin allow-list** — set `ADMIN_EMAILS` (comma-separated Gmail
  addresses) on the backend. It's synced into a user's `role` on every
  login and re-checked live on every `/api/admin/*` request, so removing an
  address takes effect immediately rather than waiting for an old session
  token to expire. Non-admins hitting `/admin` in the browser are redirected
  to `/access-denied`; the API itself returns a plain 403.
- **Map** — `frontend/components/LocationPicker.tsx` (click-to-pin or
  "use current location," with reverse-geocoded address hints) is used in
  the Report Issue flow and profile setup; `frontend/components/IssueMap.tsx`
  renders approved/pending/resolved reports as pins on `/issues` (List/Map
  toggle). Both use OpenStreetMap tiles — no API key required, no billing.
- **Location-aware news** — `/api/geo/reverse` proxies OpenStreetMap's
  Nominatim (with proper caching + a User-Agent, per their usage policy) to
  resolve a visitor's coordinates to area/city/state, which drive the My
  Area / My City / My State / India / World tabs in `NewsFeed.tsx`. Backed
  by Google News' free RSS feed (`backend/src/services/news.service.js`),
  filtered to `NEWS_TRUSTED_DOMAINS` via Google's `site:` search operator —
  no API key, no quota, and safe for production (NewsAPI.org's free tier,
  by contrast, is restricted to development use only by its own terms).

## License

MIT — see `LICENSE`.
