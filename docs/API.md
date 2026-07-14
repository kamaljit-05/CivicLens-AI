# CivicLens AI — API Reference

Base URL (dev): `http://localhost:4000/api`
Auth: `Authorization: Bearer <jwt>` header, obtained from `POST /auth/google`.

## Auth

### `POST /auth/google`
Exchanges a Google Sign-In `idToken` for a CivicLens session token.

```json
// Request
{ "idToken": "eyJhbGciOi..." }

// Response 200
{
  "token": "eyJhbGciOi...",
  "user": { "id": "...", "name": "...", "email": "...", "profile_completed": false },
  "isNewUser": true
}
```

## Users

### `GET /users/me` — auth required
Returns the current user's profile.

### `PATCH /users/me/profile` — auth required
Progressive-profiling step 2.

```json
{ "username": "rakesh_bbsr", "occupation": "Teacher", "city": "Bhubaneswar", "district": "Khordha" }
```

## Issues

### `POST /issues/upload` — auth required, `multipart/form-data`
Field: `image`. Returns `{ "imageUrl": "/uploads/xyz.jpg" }`.

### `POST /issues` — auth required
Creates a report. Runs authenticity check → insert → duplicate detection → AI summarization.

```json
// Request
{
  "categorySlug": "pothole",
  "title": "Deep pothole outside Kalinga Stadium gate",
  "description": "About 2 feet wide, been growing for two weeks, cars swerving into the bike lane.",
  "solutionIdea": "Fill with asphalt and repaint the lane marking",
  "lat": 20.2961,
  "lng": 85.8245,
  "addressHint": "Near the bus stop on Jaydev Vihar Road",
  "imageUrl": "/uploads/xyz.jpg"
}

// Response 201
{
  "issue": { "id": "...", "status": "pending_review", "ai_summary": "...", "ai_suggestion": "..." },
  "potentialDuplicates": [ { "matchedIssueId": "...", "score": 0.82 } ],
  "imageAuthenticity": { "isAiGenerated": false, "confidence": 0.3 }
}
```

### `POST /issues/preview-analysis` — auth required
Runs the AI summary + authenticity check without persisting anything, so the
reporter can preview results before submitting.

### `GET /issues`
Public browse feed — only `approved`/`resolved` issues.
Query params: `category`, `lat`, `lng`, `radiusKm` (default 5), `limit` (default 50).

### `GET /issues/:id`
Full issue detail, including AI summary/suggestion and attached images.

## Admin — all routes require `role: admin | moderator`

### `GET /admin/queue`
Returns `{ pendingIssues: [...], duplicateFlags: [...] }`.

### `POST /admin/issues/:id/approve`
Publishes the issue to the public feed. Body: `{ "notes": "optional" }`.

### `POST /admin/issues/:id/reject`
Declines the report. Body: `{ "notes": "optional" }`.

### `POST /admin/duplicates/:flagId/resolve`
Body: `{ "resolution": "confirmed_merge" | "rejected_as_duplicate" | "marked_related", "notes": "optional" }`.
Never merges automatically elsewhere in the system — this is the only path that resolves a flag.

## News

### `GET /news?locale=Bhubaneswar&category=local`
Returns cached, trusted-source headlines for the given locale; refreshes the
cache on a miss.

## AI Service (internal — called by the backend, not the frontend directly)

Base URL (dev): `http://localhost:8000`

| Endpoint | Purpose |
|---|---|
| `POST /summarize` | `{ image_url, title, description }` → `{ summary, suggestion }` |
| `POST /check-authenticity` | `{ image_url }` → `{ is_ai_generated, confidence, signals }` |
| `POST /similarity` | `{ text_a, text_b }` → `{ score, method }` |
| `GET /health` | Liveness check |
