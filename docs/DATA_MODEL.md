# CivicLens AI — Data Model

Full DDL lives in `/database/schema.sql`. This is the entity-relationship summary.

```
users ──< issues >── categories
  │           │
  │           ├──< issue_images
  │           ├──< duplicate_flags >── issues (self-referential: issue_id, matched_issue_id)
  │           └──< admin_actions
  │
  └──< admin_actions (as admin_id)

news_cache — independent table, keyed by (locale, category)
```

## Key tables

**`users`** — created on first Google Sign-In (`google_id`, `email`, `name` populated
immediately); `username`, `occupation`, `city`, `district`, `photo_url` filled
in during progressive profiling (`profile_completed` flips to `true` once
that's done, but nothing blocks core app usage before then). `role` gates
admin/moderator routes.

**`issues`** — one row per citizen report. `status` is the state machine:
`pending_review → approved | rejected | potential_duplicate → resolved`.
`ai_summary`/`ai_suggestion` are populated asynchronously-but-inline by the AI
service during creation; `reviewed_by`/`reviewed_at` are set when an admin
approves or rejects.

**`issue_images`** — one-to-many with `issues` (an issue can carry multiple
photos). Stores lightweight comparison signals (`exif_lat/lng`,
`dominant_color`) used as a secondary duplicate-detection signal, and the
result of the authenticity check (`is_ai_generated`).

**`duplicate_flags`** — one row per candidate match found by the three-layer
filter. `status` starts at `pending_review` and is only ever changed by an
admin via `POST /admin/duplicates/:flagId/resolve` — there is no code path
that writes `confirmed_merge` automatically.

**`admin_actions`** — append-only audit log of every approve/reject/merge
decision, for accountability on what a citizen's report went through.

**`news_cache`** — headlines pulled from a trusted-domain-only NewsAPI query,
keyed by `(locale, category)` so the home page reads from Postgres instead of
hitting the third-party API on every request.

## Indexing notes

- `issues(lat, lng)` — supports the bounding-box pre-filter in duplicate
  detection and the browse-page radius search; for production scale, consider
  replacing with PostGIS (`geography` column + `GIST` index) instead of the
  haversine-in-application-code approach used here.
- `issues(status)`, `issues(category_id)` — the two most common filter
  predicates on the public browse feed and the admin queue.
