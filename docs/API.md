# eWARP API contract

The front end is finished against demo data. This document says what the backend needs to provide so the UI can switch to real data. It covers the routes, what each request looks like, and the exact JSON each one must return. How you build it (language, database, AI pipeline) is up to you.

## Start here

| What | Where | Use it to |
|---|---|---|
| **The contract** | [`docs/openapi.yaml`](openapi.yaml) | Every route, parameter and response schema. Open it in [Swagger Editor](https://editor.swagger.io) or import it into Postman. Most frameworks can generate server stubs or validators from it. |
| **Live examples** | `npm run dev`, then `http://localhost:3000/api/v1/...` | Call any route and see the exact response the UI expects, using the demo data. For example: `curl http://localhost:3000/api/v1/projects/prj_1/summary` |
| **Your test** | `npm run check:api -- https://your-api/api/v1` | Calls every route on your server, validates every response against the contract, and checks 404s. It exits non-zero on failure, so it can run in CI. |
| **This guide** | below | What each number means and how it's calculated, plus examples. |

When your API passes `check:api`, point the front end at it:

```bash
FEEDBACK_API_URL=https://your-api/api/v1     # required
FEEDBACK_API_TOKEN=...                       # optional: sent as "Authorization: Bearer <token>"
```

The front end calls the API **from its server**, never from the browser. You don't need CORS, and the token is never exposed to users. Per-user authentication isn't decided yet. For now, a shared server-to-server token is enough.

## Route index

There are 27 routes: 23 reads (`GET`) and 4 writes. The writes are create project (New project page) and create, edit and delete vendor (Settings → Vendors). Paths are relative to the base URL (e.g. `https://your-api/api/v1`). "Filters" means the route accepts `from`, `to` and `group` (see Conventions).

| Route | Query params | Returns | Used by |
|---|---|---|---|
| `/me` | | `CurrentUser` | Sidebar user badge |
| `/projects` | | `{ items: ProjectListItem[], total }` | Project switcher, All projects |
| **`POST`** `/projects` | body `{ name, description?, vendors: [{ name, form? }] }` | `201` `ProjectCreated` | New project page |
| `/projects/:projectId` | | `Project` | Every project page |
| `/projects/:projectId/summary` | filters | `ProjectSummary` | Dashboard KPIs |
| `/projects/:projectId/analytics/responses-by-week` | `weeks`, filters | `{ weeks: [...] }` | Dashboard chart |
| `/projects/:projectId/analytics/coverage` | | `{ all, some, none, total }` | Dashboard donut |
| `/projects/:projectId/features` | `view`, `q`, `sort`, `limit`, filters | `{ items, total, facets }` | Dashboard, Features page |
| `/projects/:projectId/features/:featureId` | | `Feature` | Feature page |
| `/projects/:projectId/features/:featureId/summary` | | `AiSummary` | Feature page |
| `/projects/:projectId/features/:featureId/responses` | `kind`, `limit`, filters | `{ items: FeatureResponse[], total }` | Feature page, Responses tab |
| `/projects/:projectId/features/:featureId/vendors` | | `{ items: FeatureVendor[], total }` | Feature page |
| `/projects/:projectId/features/:featureId/related` | `limit` | `{ items: RelatedFeature[], total }` | Feature page |
| `/projects/:projectId/vendors` | `sort`, `limit`, filters | `{ items: VendorListItem[], total }` | Dashboard, Vendors page, filters |
| `/projects/:projectId/vendors/:vendorId` | | `Vendor` | Vendor page |
| **`POST`** `/projects/:projectId/vendors` | body `{ name }` | `201` `Vendor` | Settings → Vendors |
| **`PATCH`** `/projects/:projectId/vendors/:vendorId` | body `{ name?, featureIds? }` | `200` `Vendor` | Settings → Vendors |
| **`DELETE`** `/projects/:projectId/vendors/:vendorId` | | `204` | Settings → Vendors |
| `/projects/:projectId/vendors/:vendorId/summary` | | `AiSummary` | Vendor page |
| `/projects/:projectId/vendors/:vendorId/requests` | filters | `{ items: VendorRequest[], total }` | Vendor page |
| `/projects/:projectId/vendors/:vendorId/features` | filters | `{ items: VendorFeature[], total }` | Vendor page |
| `/projects/:projectId/vendors/:vendorId/responses` | `limit`, filters | `{ items: ResponseWithMentions[], total }` | Vendor page, Responses tab |
| `/projects/:projectId/responses` | `vendorId`, `surveyId`, `status`, `q`, `sort`, `limit`, `offset`, filters | `{ items, total, facets }` | Responses page |
| `/projects/:projectId/responses/:responseId` | | `ResponseDetail` | Response page |
| `/projects/:projectId/surveys` | | `{ items: Survey[], total }` | Surveys page |
| `/projects/:projectId/graph` | filters | `{ responses, features, vendors, links }` | Relationship map |
| `/projects/:projectId/activity` | `limit` | `{ items: ActivityEvent[], total }` | Dashboard activity |

Sources for the exact shapes: the schema names refer to `components.schemas` in [`openapi.yaml`](openapi.yaml), and the same shapes appear as TypeScript in [`src/lib/api/types.ts`](../src/lib/api/types.ts). The demo implementation is [`src/lib/api/demo/handlers.ts`](../src/lib/api/demo/handlers.ts). It's the clearest reference for how each number is calculated.

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1`. Every path below is relative to it. |
| Method | Everything is `GET` except the four writes: `POST /projects` and the vendor `POST`, `PATCH` and `DELETE`. Writes take JSON bodies (`Content-Type: application/json`). |
| IDs | Opaque strings. The front end never parses them, so UUIDs, numeric strings or prefixed IDs (`ftr_5`) all work. |
| Scoping | Child IDs are always looked up inside their project. `/projects/A/features/X` returns **404** if feature X belongs to project B. |
| Dates | ISO 8601 in UTC (`2026-10-14T12:00:00.000Z`). Week starts are dates only (`2026-10-12`). |
| Lists | `{ "items": [...], "total": 17 }`. `total` counts all matches before `limit` is applied. |
| Errors | Non-2xx status with `{ "error": { "code": "not_found", "message": "Feature ftr_99 not found" } }`. Use `404` for unknown IDs and `400` (`bad_request`) for invalid query params. The front end shows its 404 page on `404` and a retryable error everywhere else. |
| Extra fields | Fine. The UI ignores fields it doesn't know. Missing or mistyped fields break it. |
| Empty values | Return empty lists, `0` counts and `null` where a schema allows it (e.g. `lastResponseAt`, summary `text`). Never omit a field. |
| Filters | `from`, `to` (inclusive ISO dates) and `group` (`pm`, `sponsor` or `other`) where an endpoint lists "Filters: yes". The UI doesn't send them yet, but it will once the date-range and group controls ship. |

## Data model

These are the tables the demo data is built from ([`demo/db.ts`](../src/lib/api/demo/db.ts)). The backend can store them however it likes, as long as the endpoints return the shapes below.

| Entity | Fields |
|---|---|
| `project` | `id, name, description, createdAt` |
| `survey` | `id, projectId, name, source, status, createdAt` (`source`: `google_forms`; `status`: `collecting` or `closed`) |
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

### `POST /projects`
Used by: the **New project** page (Projects → New project, or the project switcher).

In one transaction, this creates:
- the project
- its vendors
- **one Google Forms survey per vendor**, named `<vendor> feedback`, with `source: google_forms` and `status: collecting`
- the form routing (`form_configurations`) that `POST /webhook/google-form` uses to file each submission under the right project, vendor and survey

Already-stored raw submissions whose `form` matches a new vendor's form are imported as responses, each with a `response.submitted` activity event. If any step fails, nothing is created.

Request (`description` and each `form` are optional; a vendor's `form` defaults to its name):
```json
{
  "name": "DIU platform feedback",
  "description": "Feedback from platform users",
  "vendors": [{ "name": "GovSignals" }, { "name": "Pryzm", "form": "Pryzm" }]
}
```
Response `201`:
```json
{
  "id": "prj_…",
  "name": "DIU platform feedback",
  "description": "Feedback from platform users",
  "createdAt": "2026-10-22T…",
  "vendors": [
    { "id": "vnd_…", "name": "GovSignals", "form": "GovSignals", "surveyId": "srv_…" },
    { "id": "vnd_…", "name": "Pryzm", "form": "Pryzm", "surveyId": "srv_…" }
  ]
}
```
Rules:
- **Project name:** required, max 200 characters. **Description:** optional, max 2,000.
- **Vendors:** at least 1 and at most 100.
- **Vendor names:** required, and unique within the request ignoring case (`400`).
- **Form names:** unique within the request ignoring case (`400`). A form can be configured only once across the whole database, so an existing mapping returns `409`.

The UI shows `error.message` under the form, so keep it readable.

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
- The Vendors page

Params:
- `sort` is `fit` (default: `requestsMet` descending, then `responseCount` descending, then name) or `name`.
- `limit` is optional.
- Filters: yes.
Each item also includes:
- `featureCount`: how many features the vendor offers
- `exclusiveCount`: how many of those no other vendor offers
- `sentiment`: likes, dislikes and wants from **its own users**
- `form`: the Google Form name routed to this vendor, or `null` if none is configured. Settings → Vendors shows it, and flags vendors without a form, since no responses can reach them.

The Vendors page shows all three. The dashboard ignores them.
```json
{
  "items": [
    {
      "id": "vnd_3",
      "name": "Vendor 3",
      "responseCount": 3,
      "requestsMet": 2,
      "requestsTotal": 8,
      "featureCount": 8,
      "exclusiveCount": 4,
      "sentiment": { "like": 2, "dislike": 1, "want": 3 }
    }
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

### Vendor writes: `POST`, `PATCH`, `DELETE`
Used by: **Settings → Vendors**, where people add vendors, rename them and tick the features each one offers.

Vendors added here work exactly like the vendors in `POST /projects`: **creating a vendor also creates its survey and its form routing**, so Google Form submissions start reaching it right away. It also **imports raw submissions already stored for that form** (with their `response.submitted` events), just as project creation does. This is how a project that started with only GovSignals picks up the Pryzm submissions already received. `form` is optional and defaults to the vendor name. A form can be configured only once across the whole database (`409`).

| Route | Body | Success | Errors |
|---|---|---|---|
| `POST /projects/:projectId/vendors` | `{ "name": "Pryzm", "form"?: "Pryzm" }` | `201` with the new `Vendor` (no features yet) | `400` blank or over 80 characters · `409` name already used in this project, or form already configured |
| `PATCH /projects/:projectId/vendors/:vendorId` | `{ "name"?: "…", "form"?: "…", "featureIds"?: ["ftr_2", …] }` (at least one) | `200` with the updated `Vendor` | `400` empty body, bad name, or a feature ID not in this project · `404` · `409` duplicate name or form already configured |
| `DELETE /projects/:projectId/vendors/:vendorId` | none | `204`, no body. Also frees its form, and removes its survey if nothing else uses it | `404` · `409` the vendor still has responses |

Rules:
- **Names:** trim them and collapse repeated spaces before saving and comparing.
- **`featureIds` replaces the whole list** of features the vendor offers, and `[]` clears it. Changing it immediately changes coverage, gaps and vendor fit on every page.
- **Never delete a vendor that has responses.** Refuse with `409`. Feedback must always keep its vendor.
- **Error messages are shown to people** as-is under the form, so write them plainly, e.g. `A vendor named "Prism" already exists in this project.`
- **Testing:** `npm run check:api -- <url> --writes` tests all of this using a temporary "Contract check …" vendor, which it deletes afterwards.

### `GET /projects/:projectId/responses`
Used by: the Responses page, where every param comes from its toolbar, chips and pagination, kept in the page URL.

| Param | Values |
|---|---|
| `group` | `pm`, `sponsor` or `other` (the group chips) |
| `vendorId` | One vendor (the Vendor dropdown) |
| `surveyId` | One survey (from a survey card's "View responses" link) |
| `status` | `analyzed` (read by AI) or `pending` (waiting for AI) |
| `q` | Case-insensitive search across the three answers |
| `sort` | `newest` (default) or `oldest` |
| `limit`, `offset` | Paging. The UI asks for 10 at a time (`offset = (page - 1) * 10`). |
| `from`, `to` | Date filters, as elsewhere |

Each item is the response shape with `mentions` (same as the vendor responses endpoint). `total` counts every match, ignoring `limit` and `offset`, so the UI can show "11–20 of 34". `facets` gives the counts for the chips: each one is calculated with all the other filters applied, but not its own. For example, group counts ignore `group` but respect `status`.
```json
{
  "items": [ { "id": "rsp_8", "…": "…", "mentions": [{ "feature": { "id": "ftr_13", "name": "Bulk edit" }, "kind": "want" }] } ],
  "total": 8,
  "facets": {
    "group": { "pm": 4, "sponsor": 2, "other": 2 },
    "status": { "analyzed": 8, "pending": 0 }
  }
}
```

### `GET /projects/:projectId/responses/:responseId`
Used by: the response page `/projects/:projectId/responses/:responseId`. It's opened from any response card's group name, or from the map's "Open response" button.

The shape is the same as a list item, plus:
- `survey: { id, name }`
- each mention's `coverage`, so the page can mark gaps

Returns 404 if the response isn't in the project.

### `GET /projects/:projectId/surveys`
Used by: the Surveys page (one card per survey) and the Responses page (the survey filter's label).
```json
{
  "items": [
    {
      "id": "srv_1",
      "name": "Platform feedback",
      "source": "google_forms",
      "status": "collecting",
      "createdAt": "2026-09-20T12:00:00.000Z",
      "responseCount": 8,
      "analyzedCount": 8,
      "vendorCount": 3,
      "lastResponseAt": "2026-10-14T12:00:00.000Z",
      "groups": { "pm": 4, "sponsor": 2, "other": 2 }
    }
  ],
  "total": 1
}
```
- `source` is `google_forms` for now. Add values as more survey tools are connected.
- `status` is `collecting` or `closed`.
- `vendorCount` is how many distinct vendors the survey's responses are about.

### `GET /projects/:projectId/graph`
Used by: the Relationship map, where `group` comes from its chips.

This is the one view that draws every response, feature and vendor at once, so it gets them all in a single request instead of many small ones.
- `responses` use the same shape as elsewhere, including the answer text, which the map's detail drawer shows.
- `links` has one entry per mention.
- Features with no links and no vendors aren't drawn.
- Filters: yes. They filter responses and therefore links. Features and vendors are always the whole project.
```json
{
  "responses": [
    {
      "id": "rsp_2", "surveyId": "srv_1", "group": "pm",
      "vendor": { "id": "vnd_2", "name": "Vendor 2" },
      "submittedAt": "2026-09-26T12:00:00.000Z",
      "likes": "Search finds old documents quickly.",
      "dislikes": "Notifications are noisy.",
      "wants": "Shared comments on documents.",
      "analyzed": true
    }
  ],
  "features": [{ "id": "ftr_5", "name": "Notifications", "coverage": "all", "vendorIds": ["vnd_1", "vnd_2", "vnd_3"] }],
  "vendors": [{ "id": "vnd_2", "name": "Vendor 2" }],
  "links": [{ "responseId": "rsp_2", "featureId": "ftr_5", "kind": "dislike" }]
}
```
If projects grow to thousands of responses, this endpoint is the one to paginate or pre-aggregate. The rest of the app doesn't depend on it.

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

- `GET /projects/:projectId/insights`: ranked AI findings for the Insights section
- `GET /projects/:projectId/surveys/:surveyId`: if surveys get their own detail page
