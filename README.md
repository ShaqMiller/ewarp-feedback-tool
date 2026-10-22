# eWARP Feedback

Survey feedback, the features AI finds in it, and the vendors that offer them, across multiple projects. Next.js 16 front end.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no backend configured, the app runs on demo data (`src/lib/api/demo`).

## Backend team

Start with **[docs/API.md](docs/API.md)**. In short:

- **Contract:** [`docs/openapi.yaml`](docs/openapi.yaml) lists every route, request and response schema.
- **Live examples:** while `npm run dev` is running, `http://localhost:3000/api/v1/...` serves the demo data at the real paths.
- **Check your server:** `npm run check:api -- https://your-api/api/v1` (add `--writes` to also test the vendor write routes).
- **Switch the UI to your API:** set `FEEDBACK_API_URL` (and optionally `FEEDBACK_API_TOKEN`) in `.env.local` or in Vercel. See [`.env.example`](.env.example).

## Where things are

| Path | What |
|---|---|
| `src/app/projects/[projectId]/…` | Pages: dashboard, features, vendors, responses, surveys, map |
| `src/components/` | UI, grouped by section; shared pieces in `ui/` and `shell/` |
| `src/lib/api/` | The only data layer: `types.ts` (contract types), `http.ts` (real backend), `demo/` (demo data) |
| `src/app/api/v1/` | Reference API serving the demo data |
