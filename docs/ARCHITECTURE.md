# CivicLens AI — System Architecture

## 1. Overview

CivicLens AI is a civic-issue reporting platform split into four independently
deployable services, sharing one PostgreSQL database:

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│  Frontend    │──────▶│   Backend     │──────▶│  PostgreSQL  │
│  (Next.js)   │◀──────│ (Node/Express)│◀──────│              │
│  incl. Admin │      └───────┬───────┘      └──────────────┘
│  Dashboard   │              │
└──────────────┘              ▼
                       ┌───────────────┐
                       │  AI Service   │
                       │  (FastAPI)    │
                       │ OpenAI Vision │
                       └───────────────┘
```

- **Frontend (Next.js, App Router)** — public site (home, report flow, browse/map)
  and the **Admin Dashboard**, implemented as a route group (`/admin/*`) inside
  the same app rather than a separate project, gated by role-based auth on
  every backend call it makes.
- **Backend (Node + Express)** — REST API, owns all writes to Postgres, runs
  the duplicate-detection pipeline, and proxies AI calls to the AI service.
- **AI Service (FastAPI)** — stateless microservice wrapping a vision-capable
  LLM (multimodal summarization), an image-authenticity check, and a TF-IDF
  text-similarity endpoint the backend can call for borderline duplicate cases.
- **Database (PostgreSQL)** — single source of truth; schema in `/database/schema.sql`.

Each service ships its own `Dockerfile`; `docker-compose.yml` at the repo root
wires them together for local development.

## 2. Why the AI service is separate from the backend

Keeping multimodal inference in its own FastAPI service means:
- Python's ML/vision ecosystem (scikit-learn, Pillow, the OpenAI SDK) stays
  out of the Node dependency tree.
- The AI service can be scaled independently — it's the most latency- and
  cost-sensitive part of the system.
- A failed or slow AI call never blocks issue creation: `createIssue` in the
  backend treats AI enrichment as best-effort (see §4).

## 3. Onboarding & progressive profiling

1. **Google Sign-In** on the frontend produces an `idToken`, posted to
   `POST /api/auth/google`. The backend verifies it against Google, creates
   the user on first sign-in (name/email pulled straight from the token — no
   retyping), and returns a session JWT.
2. New users (`isNewUser: true`) are routed to `/onboarding`, a short form for
   username, occupation, city/district, and photo. This step is skippable —
   `profile_completed` stays `false` until the user chooses to fill it in,
   consistent with a progressive-profiling approach that keeps signup friction low.

## 4. Issue reporting pipeline

`POST /api/issues` runs, in order:

1. **Validate** input (zod schema).
2. **Authenticity check** — the uploaded photo is sent to the AI service's
   `/check-authenticity` endpoint before it's trusted as evidence.
3. **Insert** the issue as `pending_review` — it is never auto-published.
4. **Duplicate detection** (see §5) — any matches are written to
   `duplicate_flags` and the issue's status becomes `potential_duplicate`.
5. **AI summarization** — photo + text sent to `/summarize`; the returned
   100–150 word summary and suggested fix are attached to the issue. This step
   is non-blocking: if the AI service is unreachable, the issue still saves
   successfully with `ai_summary = null`.
6. The issue sits in the **admin queue** (`GET /api/admin/queue`) until a
   human approves or rejects it. Nothing reaches the public map/list without
   that step.

## 5. Duplicate detection — three-layer filter

Implemented in `backend/src/services/duplicateDetection.service.js`,
run synchronously right after insert:

| Layer | What it checks | Default threshold |
|---|---|---|
| **Spatial** | Haversine distance to other open issues in the same category | 100m (point issues) / 500m (linear issues like water leaks, drainage) |
| **Temporal** | Excludes issues resolved more than N days ago | 60 days |
| **Semantic** | Category must match exactly; then a Jaccard keyword-overlap score over title+description+address | ≥ 0.7 |

A match on all three layers creates a `duplicate_flags` row and routes the new
report to the admin queue rather than merging it automatically — silent
auto-merge would hide a citizen's report without any notice. An admin
confirms the merge, rejects the flag, or marks the two reports as "related but
separate" via `POST /api/admin/duplicates/:flagId/resolve`.

The AI service's `/similarity` endpoint (TF-IDF cosine similarity) is
available as a stronger secondary signal for borderline cases near the
threshold — the Node implementation is intentionally lightweight so the
common case never leaves the backend process.

## 6. Local news feed

`backend/src/services/news.service.js` pulls headlines from NewsAPI,
restricted to a **trusted-domain allowlist** (`NEWS_TRUSTED_DOMAINS` env var),
and caches results in `news_cache` so the home page never calls the
third-party API on every request. Each card in the UI is labeled with its
source so trust is visible, not asserted.

## 7. Data privacy notes

- Issue `lat`/`lng` and photos are personal data under GDPR/India's DPDP Act —
  duplicate detection runs **in-house** against the local database rather than
  through a third-party geolocation API.
- Users can request account and data deletion (implement `DELETE /api/users/me`
  before production launch — stubbed out of this starter kit).
- All service-to-service calls happen over the internal Docker network in
  development; use TLS between services in production.

## 8. Deployment

See `docker-compose.yml` for local dev, and `deployment/k8s/` for a minimal
Kubernetes starting point. Each service is stateless except Postgres, so
horizontal scaling only requires scaling `backend` and `ai-service` pods.
