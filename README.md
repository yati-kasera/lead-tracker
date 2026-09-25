# Lead Tracker

A small, production-minded lead tracker: capture leads, search and filter them, and move them through a sales pipeline.

Built for the Stylework Junior Full Stack Engineer assignment with **React + TypeScript**, **Node.js (Express) + TypeScript** and **MongoDB**.

| | |
| --- | --- |
| **Live app** | _to be added after deployment_ |
| **Live API** | _to be added after deployment_ (health check: `/api/health`) |

## Features

**Required by the assignment**

- **Create lead** with name, email, phone and an optional starting status (default `New`). Validation runs in the browser for instant feedback and again on the server, which is the source of truth.
- **List leads**, newest first, with the created-at date plus relative time ("5 minutes ago").
- **Search** by name, email or phone (partial, case-insensitive, debounced by 300 ms).
- **Update status** inline from the table. The change is applied optimistically, the row is locked while saving, and it rolls back with an error message if the request fails.

**Additions**

- **Status filter** and **pagination** (10 per page), combinable with search.
- **Summary cards** with the total and per-status counts. Clicking a card filters the list by that status.
- **Delete lead** behind an accessible confirmation dialog.
- Loading skeletons, empty states ("No leads yet" vs "No leads match your search") and a retryable error state.

Lead statuses: `NEW` → `CONTACTED` → `QUALIFIED` → `CONVERTED`, or `LOST`.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 | Fast dev loop, typed components, utility CSS keeps styling close to markup |
| Backend | Express 5, TypeScript | Minimal and well known; Express 5 forwards async errors to the error handler natively |
| Validation | Zod 4 | One schema gives runtime validation, field-level error messages and inferred TypeScript types |
| Database | MongoDB with Mongoose 9 | Simple document model for a single entity; free managed hosting on Atlas |
| Testing | Vitest, Supertest, mongodb-memory-server, React Testing Library | Same runner on both sides; API tests hit a real (in-memory) MongoDB instead of mocks |
| Linting | oxlint | Fast, zero-config. `typescript-eslint` did not yet support the TypeScript version used |
| CI / Hosting | GitHub Actions, Render (API), Vercel (frontend), MongoDB Atlas | Free tiers, deploy on push |

## Architecture

```mermaid
flowchart LR
    Browser["React SPA (Vercel)"] -->|"REST / JSON"| Api["Express API (Render)"]
    Api -->|Mongoose| Db["MongoDB Atlas"]
```

The repository is a small monorepo with two independent packages:

```
lead_tracker/
├── client/                  React + TypeScript SPA
│   └── src/
│       ├── App.tsx          Page composition and state (filters, pagination, dialogs)
│       ├── components/      LeadForm, LeadsTable, LeadFilters, StatsCards, ConfirmDialog, ...
│       ├── hooks/           useLeads (fetching + optimistic updates), useLeadStats, useDebouncedValue
│       ├── lib/             api.ts (typed fetch client), validation.ts, format.ts
│       └── types/           Shared lead types and status constants
├── server/                  Express + TypeScript API
│   ├── src/
│   │   ├── app.ts           App factory (middleware, routes, error handling)
│   │   ├── index.ts         Entry point: env, DB connection, graceful shutdown
│   │   ├── config/env.ts    Zod-validated environment variables
│   │   ├── routes/ → controllers/ → services/ → models/
│   │   ├── schemas/         Zod request schemas
│   │   └── middleware/      Central error handler and 404
│   └── tests/               Integration tests (Supertest + in-memory MongoDB)
├── .github/workflows/ci.yml
└── render.yaml              Render blueprint for the API
```

**Backend layering.** Routes only map URLs to controllers. Controllers parse and validate input with Zod and shape the HTTP response. Services hold the business logic and database access, and return plain DTOs (`id` instead of `_id`, ISO date strings). All errors flow to one error handler, which returns a consistent shape:

```json
{ "error": { "message": "Validation failed", "details": [{ "path": "email", "message": "Enter a valid email address" }] } }
```

The frontend maps `details` onto the matching form fields.

**Frontend data flow.** `useLeads` fetches the current page whenever search, status or page changes, and cancels stale requests with `AbortController`. Status changes are optimistic, with rollback. `useLeadStats` refreshes the summary cards after every create, status change and delete. In development, Vite proxies `/api` to the local API, so no CORS setup is needed. In production, `VITE_API_URL` points to the deployed API.

### Data model

`Lead`: `name`, `email` (stored lowercase), `phone`, `status` (enum, default `NEW`), and `createdAt` / `updatedAt` (Mongoose timestamps).

Indexes: `{ createdAt: -1 }` for the default listing, and `{ status: 1, createdAt: -1 }` for filtered listing and the stats aggregation.

### API

Base path: `/api`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/leads?search=&status=&page=&limit=` | Paginated list, newest first. `limit` is at most 100 |
| `POST` | `/leads` | Create a lead: `{ name, email, phone, status? }` returns `201 { data: Lead }` |
| `PATCH` | `/leads/:id/status` | Update only the status: `{ status }` returns `200 { data: Lead }` |
| `DELETE` | `/leads/:id` | Delete a lead and return `204` |
| `GET` | `/leads/stats` | `{ data: { total, byStatus: { NEW, CONTACTED, QUALIFIED, CONVERTED, LOST } } }` |

List response:

```json
{
  "data": [{ "id": "…", "name": "Priya Sharma", "email": "priya@example.com", "phone": "+91 98765 43210", "status": "NEW", "createdAt": "…", "updatedAt": "…" }],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Error codes: `400` for validation errors, an invalid id or malformed JSON; `404` for an unknown lead or route; `500` for unexpected errors (logged server-side, with a generic message to the client).

## Local setup

**Prerequisites:** Node.js 20+ (22 recommended), and Docker (or any MongoDB 6+).

```bash
# 1. Start MongoDB
docker run -d --name lead-tracker-mongo -p 27017:27017 mongo:7

# 2. Install dependencies for both packages
npm run install:all

# 3. Configure the API
cp server/.env.example server/.env        # defaults work with the Docker command above

# 4. Run the API (http://localhost:4000) and the frontend (http://localhost:5173) in two terminals
npm run dev:server
npm run dev:client
```

Environment variables:

| Package | Variable | Default | Purpose |
| --- | --- | --- | --- |
| server | `MONGODB_URI` | _required_ | MongoDB connection string |
| server | `PORT` | `4000` | HTTP port (Render sets this automatically) |
| server | `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins, or `*` |
| server | `NODE_ENV` | `development` | `development`, `test` or `production` |
| client | `VITE_API_URL` | empty | API base URL for production builds. Leave empty locally to use the dev proxy |

## Testing

```bash
npm test          # both packages
npm run lint      # oxlint, both packages
npm run typecheck # tsc, both packages
```

- **Server (29 tests):** integration tests through the real Express app with Supertest against an in-memory MongoDB. They cover creation and normalisation, validation errors, malformed JSON, duplicate emails being allowed, search (including regex characters treated literally), status filter, pagination, status updates, delete, stats and 404s.
- **Client (33 tests):**
  - Unit tests for validation, date formatting and the API client.
  - Component tests for the form: validation, server field errors and reset.
  - App-level tests with a mocked API: debounced search, filters, stats cards, pagination, optimistic status updates with rollback, the delete confirmation flow, error retry and refresh after create.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build for both packages on every push to `main` and on every pull request.

## Deployment

The API goes to Render, the frontend to Vercel and the database to MongoDB Atlas, all on free tiers.

1. **MongoDB Atlas**
   - Create a free M0 cluster and a database user.
   - Under Network Access, allow `0.0.0.0/0`. Render's free tier has no static outbound IPs.
   - Copy the connection string and add the database name: `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/lead_tracker?retryWrites=true&w=majority`.
2. **Render (API)**
   - Choose New → Blueprint, select this repository, and Render reads `render.yaml`.
   - Set `MONGODB_URI` to the Atlas string. Set `CORS_ORIGIN` to the Vercel URL, or temporarily to `*` until the frontend exists.
   - Once live, `https://<service>.onrender.com/api/health` returns `{"status":"ok"}`.
3. **Vercel (frontend)**
   - Import the repository and set **Root Directory** to `client`. Vite is detected automatically.
   - Add the env var `VITE_API_URL=https://<service>.onrender.com`, then deploy.
4. Update `CORS_ORIGIN` on Render to the final Vercel URL (for example `https://lead-tracker.vercel.app`) and let Render redeploy.

Note: free Render services sleep after about 15 minutes idle, so the first request after a pause can take 30 to 60 seconds.

## Trade-offs and decisions

- **No authentication, by choice.** The assignment asks for a lead tracker, not a multi-user CRM. An auth and roles layer (JWT, rep and admin roles, lead ownership) was prototyped and then deliberately removed, to keep the submission focused and reliable within the deadline. As a result, anyone with the URL can read and change the data. Protecting the app is the first item under future improvements.
- **Duplicate emails are allowed.** The spec doesn't require uniqueness, and the same person can legitimately appear in more than one sales record. A real CRM would add duplicate detection or merging instead of a hard unique constraint.
- **Regex search instead of a text index.** Case-insensitive partial matching over three fields is simple and correct at this scale. User input is escaped, so `.*` is matched literally. It can't use an index efficiently, so large datasets would need Atlas Search or a text index.
- **Offset pagination.** Easy to reason about and gives "page X of Y". Cursor-based pagination would be more stable and faster for large, frequently changing collections.
- **Optimistic status updates.** The UI feels instant. The trade-off is a brief inconsistency and a rollback if the request fails. With a status filter active, an updated row stays visible until the next fetch, so it doesn't jump away under the cursor.
- **Stats ignore search and filters.** The cards describe the whole pipeline and act as filters themselves.
- **Hard delete.** Simple, but not recoverable. Soft delete with undo is listed below.
- **Status constants are duplicated** in the client and server instead of living in a shared package. That's acceptable for five values; a shared workspace package would remove the duplication.

## Future improvements

- Authentication and authorization: user accounts, rep and admin roles, lead ownership and assignment
- Edit lead details, plus notes and an activity history per lead
- Soft delete with undo
- CSV export and import
- Cursor-based pagination and Atlas Search for large datasets
- End-to-end tests with Playwright against a deployed preview
- Rate limiting, request logging and error monitoring (for example Sentry)
