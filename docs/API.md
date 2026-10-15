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
Used by: the feature page header (name, coverage, feedback pill) and the "What people said" counts. Same shape as a list item, plus `createdAt`. Returns 404 if the feature isn't in the project, and so do all of the feature sub-routes below.

### `GET /projects/:projectId/features/:featureId/summary`
Used by: Feature page → "Summary". Fields:
- `text` is the AI-written summary, or `null` if there isn't one yet. The UI shows a "not summarized yet" note in that case.
- `basedOn` is the number of responses the summary was written from.
```json
{
  "text": "Every vendor offers notifications, so the issue is control, not availability. …",
  "basedOn": 2,
  "generatedAt": "2026-10-07T12:06:00.000Z"
}
```

### `GET /projects/:projectId/features/:featureId/responses?kind=dislike`
Used by:
- Feature page → "What people said" quotes and the connections diagram
- The Responses tab, where `kind` comes from the All / Likes / Dislikes / Wants chips
- The Responses tab count

Responses come newest first. Each item is a full survey response plus `kinds`: how this response mentioned the feature, usually one kind. The UI quotes the answer field that matches each kind (`like` → `likes`, `dislike` → `dislikes`, `want` → `wants`). The future Responses section can reuse the same response shape.

Params:
- `kind` (`like`, `dislike` or `want`) and `limit` are optional.
- Filters: yes.
```json
{
  "items": [
    {
      "id": "rsp_2",
      "surveyId": "srv_1",
      "group": "pm",
      "vendor": { "id": "vnd_2", "name": "Vendor 2" },
      "submittedAt": "2026-09-26T12:00:00.000Z",
      "likes": "Search finds old documents quickly.",
      "dislikes": "Notifications are noisy.",
      "wants": "Shared comments on documents.",
      "analyzed": true,
      "kinds": ["dislike"]
    }
  ],
  "total": 1
}
```

### `GET /projects/:projectId/features/:featureId/vendors`
Used by: Feature page → "Vendor coverage" and the connections diagram. Returns every vendor in the project, offering vendors first. `sentiment` counts only feedback about this feature from **that vendor's own users**.
```json
{
  "items": [
    { "vendor": { "id": "vnd_2", "name": "Vendor 2" }, "offers": true, "sentiment": { "like": 0, "dislike": 1, "want": 0 } }
  ],
  "total": 3
}
```

### `GET /projects/:projectId/features/:featureId/related?limit=8`
Used by: Feature page → "Mentioned alongside". Returns other features mentioned in the same responses. `sharedResponses` is how many responses mention both, and items are sorted by it, highest first.
```json
{
  "items": [{ "id": "ftr_4", "name": "Search", "coverage": "all", "sharedResponses": 1 }],
  "total": 4
}
```

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
Used by: the vendor page header ("Meets X of Y requests", "Offers X of Y features") and the Responses tab count. Same shape as a list item, plus `featureIds` (the features it offers). Returns 404 if the vendor isn't in the project, and so do all of the vendor sub-routes below.

### `GET /projects/:projectId/vendors/:vendorId/summary`
Used by: Vendor page → "Summary". Same shape as the feature summary: `{ "text": "…" | null, "basedOn": 3, "generatedAt": "…" | null }`.

### `GET /projects/:projectId/vendors/:vendorId/requests`
Used by: Vendor page → "Requests". Returns every requested feature in the project (at least one want) and whether this vendor offers it. Met requests come first, then the most wanted. `wants` counts want mentions across the whole project. Filters: yes.
```json
{
  "items": [
    { "feature": { "id": "ftr_5", "name": "Notifications" }, "offers": true, "wants": 1 },
    { "feature": { "id": "ftr_2", "name": "PDF export" }, "offers": false, "wants": 1 }
  ],
  "total": 8
}
```

### `GET /projects/:projectId/vendors/:vendorId/features`
Used by: Vendor page → "Features offered". Returns the features this vendor offers.
- `exclusive` is true when no other vendor in the project offers the feature. The UI shows it as "Only here".
- `sentiment` counts only feedback from **this vendor's own users**.
- Items with the most feedback come first.
- Filters: yes.
```json
{
  "items": [{ "id": "ftr_11", "name": "File sync", "exclusive": true, "sentiment": { "like": 0, "dislike": 1, "want": 0 } }],
  "total": 8
}
```

### `GET /projects/:projectId/vendors/:vendorId/responses?group=pm`
Used by:
- Vendor page → "What its users said" quotes and the like/dislike/want tiles
- "Who responded"
- The Responses tab, where `group` comes from the group chips

Returns responses about this vendor, newest first. Each item is the survey response shape plus `mentions`: every feature AI linked to the response, and how. `mentions` is empty until AI has read the response (`analyzed: false`).

Params:
- `limit` is optional.
- Filters: yes.
```json
{
  "items": [
    {
      "id": "rsp_6",
      "surveyId": "srv_1",
      "group": "other",
      "vendor": { "id": "vnd_3", "name": "Vendor 3" },
      "submittedAt": "2026-10-07T12:00:00.000Z",
      "likes": "Works well offline.",
      "dislikes": "Syncing is slow on large files.",
      "wants": "Notifications only for things I own.",
      "analyzed": true,
      "mentions": [
        { "feature": { "id": "ftr_10", "name": "Offline mode" }, "kind": "like" },
        { "feature": { "id": "ftr_11", "name": "File sync" }, "kind": "dislike" },
        { "feature": { "id": "ftr_5", "name": "Notifications" }, "kind": "want" }
      ]
    }
  ],
  "total": 3
}
```

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
- `GET /projects/:projectId/graph`, the nodes and edges for the relationship map
