# eWARP API contract

This is what the front end expects from the backend. Each screen section calls its own endpoint, so nothing loads the whole project at once.

- TypeScript types for every response body: [`src/lib/api/types.ts`](../src/lib/api/types.ts)
- Working reference implementation, using demo data: [`src/lib/api/demo/handlers.ts`](../src/lib/api/demo/handlers.ts)
- The front end switches to the real backend when `FEEDBACK_API_URL` is set (for example `https://api.example.com/api/v1`).

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1`. Every path below is relative to it. |
| Method | Every endpoint in this document is `GET`. |
| IDs | Opaque strings. The front end never parses them, so UUIDs, numeric strings or prefixed IDs (`ftr_5`) all work. |
| Scoping | Child IDs are always looked up inside their project. `/projects/A/features/X` returns **404** if feature X belongs to project B. |
| Dates | ISO 8601 in UTC (`2026-10-14T12:00:00.000Z`). Week starts are dates only (`2026-10-12`). |
| Lists | `{ "items": [...], "total": 17 }`. `total` counts all matches before `limit` is applied. |
| Errors | Non-2xx status with `{ "error": { "code": "not_found", "message": "Feature ftr_99 not found" } }`. The front end shows its 404 page on `404` and a retryable error everywhere else. |
| Filters | `from`, `to` (inclusive ISO dates) and `group` (`pm`, `sponsor` or `other`) where an endpoint lists "Filters: yes". The UI doesn't send them yet, but it will once the date-range and group controls ship. |

## Data model

These are the tables the demo data is built from ([`demo/db.ts`](../src/lib/api/demo/db.ts)). The backend can store them however it likes, as long as the endpoints return the shapes below.

| Entity | Fields |
|---|---|
| `project` | `id, name, description, createdAt` |
| `survey` | `id, projectId, name, createdAt` |
| `vendor` | `id, projectId, name` |
| `feature` | `id, projectId, name, createdAt` (created when AI first finds it in a response) |
| `offering` | `featureId, vendorId` (the vendor offers the feature) |
| `response` | `id, projectId, surveyId, vendorId, group, likes, dislikes, wants, submittedAt, analyzedAt` (`analyzedAt` stays null until AI has read it) |
| `mention` | `id, responseId, featureId, kind` (`like`, `dislike` or `want`; one row per feature AI links to a response) |

## Metric definitions

| Term | Definition |
|---|---|
| Mention | One `mention` row. |
| Request | A feature with at least one `want` mention. |
| Unmet request | A request that no vendor in the project offers. |
| Coverage | Per feature: `all` if every project vendor offers it, `none` if none do, otherwise `some`. |
| Requests met (vendor fit) | The number of the project's requests that this vendor offers. |
| This week | Responses submitted in the last 7 days. |

When filters are sent, responses (and therefore mentions, requests and counts) are filtered first. Feature and vendor totals are not filtered.

---

## Endpoints

### `GET /me`
Used by: the user badge in the sidebar.
```json
{ "id": "usr_1", "name": "Program office", "role": "Admin" }
```

### `GET /projects`
Used by: the project switcher and the All projects page.
```json
{
  "items": [
    { "id": "prj_1", "name": "Collaboration Platform Eval", "responseCount": 8, "lastResponseAt": "2026-10-14T12:00:00.000Z" },
    { "id": "prj_2", "name": "Field Data Capture", "responseCount": 0, "lastResponseAt": null }
  ],
  "total": 2
}
```

### `GET /projects/:projectId`
Used by: the sidebar counts, breadcrumbs and dashboard subtitle (on every project page). Returns 404 for an unknown project.
```json
{
  "id": "prj_1",
  "name": "Collaboration Platform Eval",
  "description": "Which collaboration platform best fits program teams.",
  "createdAt": "2026-09-15T12:00:00.000Z",
  "lastResponseAt": "2026-10-14T12:00:00.000Z",
  "counts": { "features": 17, "vendors": 3, "responses": 8, "surveys": 1 }
}
```

### `GET /projects/:projectId/summary`
Used by: Dashboard → the four KPI cards and the "AI analysis up to date" pill. Filters: yes.
```json
{
  "responses": { "total": 8, "thisWeek": 2 },
  "features": { "total": 17, "mentions": 19 },
  "requests": { "total": 8, "unmet": 5 },
  "sentiment": { "like": 8, "dislike": 3, "want": 8 },
  "analysis": { "processed": 8, "total": 8 }
}
```

### `GET /projects/:projectId/analytics/responses-by-week?weeks=6`
Used by: Dashboard → "Responses by week". Returns `weeks` buckets ending with the current week, oldest first, including empty weeks. Filters: yes.
```json
{
  "weeks": [
    { "weekStart": "2026-09-21", "counts": { "pm": 2, "sponsor": 1, "other": 0 } },
    { "weekStart": "2026-09-28", "counts": { "pm": 0, "sponsor": 1, "other": 1 } }
  ]
}
```

### `GET /projects/:projectId/analytics/coverage`
Used by: Dashboard → "Feature coverage".
```json
{ "all": 4, "some": 8, "none": 5, "total": 17 }
```

### `GET /projects/:projectId/features`
Used by:
- Dashboard → "Most discussed features" (`sort=mentions&limit=5`)
- The Features page (`view`, `q` and `sort` come from its tabs, search box and sort menu)

| Param | Values |
|---|---|
| `view` | `all` (default); `requested` = at least one want; `gap` = no vendor offers it; `pain` = at least one dislike |
| `q` | Case-insensitive search on the feature name |
| `sort` | `mentions` (default; ties go to the older feature first), `newest` (by `createdAt`), or `name` |
| `limit` | Optional |
| Filters | Yes. They change `mentions`, `sentiment`, and therefore which features count as requested or pain points. |

`total` counts matches in the requested `view`. `facets` gives the count for **every** view, after `q` and filters are applied. They become the numbers on the Features page tabs, so the page needs only one request.
```json
{
  "items": [
    {
      "id": "ftr_1",
      "name": "Dashboard",
      "coverage": "all",
      "vendorIds": ["vnd_1", "vnd_2", "vnd_3"],
      "mentions": 2,
      "sentiment": { "like": 2, "dislike": 0, "want": 0 }
    }
  ],
  "total": 17,
  "facets": { "all": 17, "requested": 8, "gap": 5, "pain": 3 }
}
```

### `GET /projects/:projectId/features/:featureId`
Used by: the feature page `/projects/:projectId/features/:featureId`. Same shape as a list item, plus `createdAt`. Returns 404 if the feature isn't in the project.

### `GET /projects/:projectId/vendors?sort=fit`
Used by:
- Dashboard → "Vendor fit"
- The Features page (`sort=name`), to label the per-vendor coverage dots
- The Vendors page, when it's built

Params:
- `sort` is `fit` (default: `requestsMet` descending, then `responseCount` descending, then name) or `name`.
- `limit` is optional.
- Filters: yes.
```json
{
  "items": [
    { "id": "vnd_3", "name": "Vendor 3", "responseCount": 3, "requestsMet": 2, "requestsTotal": 8 }
  ],
  "total": 3
}
```

### `GET /projects/:projectId/vendors/:vendorId`
Used by: the vendor page `/projects/:projectId/vendors/:vendorId`. Same shape as a list item, plus `featureIds` (the features it offers). Returns 404 if the vendor isn't in the project.

### `GET /projects/:projectId/activity?limit=3`
Used by: Dashboard → "Recent activity". Newest first. `limit` defaults to 10. Every event has `id`, `type` and `occurredAt`.
```json
{
  "items": [
    { "id": "evt_1", "type": "features.linked", "occurredAt": "…", "responseId": "rsp_8", "features": [{ "id": "ftr_16", "name": "Report sharing" }] },
    { "id": "evt_2", "type": "gap.detected", "occurredAt": "…", "feature": { "id": "ftr_13", "name": "Bulk edit" } },
    { "id": "evt_3", "type": "response.submitted", "occurredAt": "…", "response": { "id": "rsp_8", "group": "pm", "vendor": { "id": "vnd_1", "name": "Vendor 1" } } }
  ],
  "total": 21
}
```
Event types:
- `response.submitted`: a survey response arrived.
- `features.linked`: AI finished reading a response and linked features to it.
- `gap.detected`: AI found a new feature that no vendor offers.

---

## Coming next (not used yet)

These will follow the same conventions when their pages are built:

- `GET /projects/:projectId/responses`, with filters, pagination and `vendorId` / `featureId` filters
- `GET /projects/:projectId/responses/:responseId`
- `GET /projects/:projectId/surveys` and `GET /projects/:projectId/surveys/:surveyId`
- `GET /projects/:projectId/features/:featureId/responses`, the responses behind a feature
- `GET /projects/:projectId/graph`, the nodes and edges for the relationship map
