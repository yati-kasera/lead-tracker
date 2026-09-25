# AGENT.md: AI-assisted development log

This project was built with AI assistance, which the assignment explicitly allows. This file explains what the AI did, what I did, the prompts that drove the work, and the engineering decisions behind the result.

## AI tools used

| Tool | How it was used |
| --- | --- |
| **Cursor (Agent mode, Claude)** | Planning, code generation for both packages, tests, running commands (installs, tests, builds, git commits), in-browser verification of the UI, and documentation drafts |
| **Cursor's built-in browser** | The agent drove the running app to check forms, validation messages, search, status changes, stats cards and the delete dialog, and took screenshots to catch layout problems |

## Division of work

**AI-generated (then reviewed and verified):**

- Project scaffolding and configuration: Vite, Tailwind, TypeScript configs, oxlint, Vitest.
- Server code: env validation, the app factory, error handler, Mongoose model, Zod schemas, services, controllers and routes.
- Client code: the typed API client, hooks (`useLeads`, `useLeadStats`, `useDebouncedValue`) and all components.
- The test suites: 29 server integration tests and 33 client tests.
- The CI workflow, the Render blueprint, and first drafts of README.md and this file.

**Done by me (human):**

- Chose the stack (Node/Express + TypeScript, MongoDB) and the deployment targets.
- Set the scope: what to build and, just as important, what not to build. See the scope decision below.
- Made the product decisions: allowing duplicate emails, removing auth, which extras were worth including.
- Reviewed the plan and the generated code, and asked for explanations of the flow and trade-offs before approving each phase.
- Did manual testing in the browser, and checked the in-progress work locally before the frontend began.
- Created the accounts and ran the deployment (GitHub, MongoDB Atlas, Render, Vercel).

No application code was typed by hand. My role was closer to tech lead and reviewer: defining requirements, approving or rejecting plans, and checking behaviour.

## Key prompts

These are representative prompts, lightly condensed, in the order they were given:

1. *"I want to make this assignment task [full Stylework assignment brief pasted] and want to discuss with you how we can make it."* This produced a plan, and I answered the stack questions: Express + TypeScript, MongoDB, core features plus polish (validation, filter, pagination, CI).
2. *"What is a lead tracker actually?"* I wanted to understand the domain (leads, pipeline statuses) before building.
3. *"OK, start building."* This started the backend: scaffold, model, create/list/search, status update and integration tests.
4. *"Can you start it now, so I can check the work till now?"* The agent started MongoDB in Docker, ran the API, seeded sample data, and explained how to test each endpoint.
5. *"Start on the frontend."* This built the API client, form, table, search, filter, pagination and optimistic status updates, verified in the browser.
6. *"What about users, authentication and authorization, other functionality, and the overall working and flow?"*, then *"List all the functionalities and pages there will be after completion."* These were design discussions about scope.
7. *"Implement the status summary cards, roles, delete and CSV export."* The agent planned and started a JWT auth and roles layer.
8. A scope review: I got an outside review arguing that auth, roles, CSV export and reassignment went beyond the brief and added deployment risk with about 3 days left. I agreed and asked for the scope to be trimmed (see below).

## The scope decision (auth and roles were built, then removed)

Partway through, I asked for authentication (signup/login with JWT and bcrypt), rep and admin roles, lead ownership, admin reassignment and CSV export. The agent implemented and tested the auth layer: users, signup/login/me, `requireAuth`/`requireRole` middleware, admin seeding, and about 15 auth tests. It had started on role-scoped queries when I reviewed the direction.

I then decided to **remove all of it** and freeze the scope at:

- the required features (create, list, search, update status);
- plus status summary cards, delete, validation, tests, CI and deployment.

The reasoning:

- The brief asks for a lead tracker. Auth and roles weren't requested, and the grading weights a *working product* and *testing* highest.
- Auth adds a lot of deployment surface: secrets, CORS, token handling, protected routes and migrations for existing data. With about 3 days left, that risk outweighed the benefit.
- The core had to be solid and deployed before anything else.

The auth commit was dropped from history rather than reverted, so the git log reflects the shipped scope. Auth, roles and ownership are listed as the first future improvement in the README.

## Key engineering decisions

| Decision | Reasoning |
| --- | --- |
| Monorepo with independent `client/` and `server/` packages | Each deploys separately (Vercel and Render) with its own lockfile. No workspace tooling needed |
| Layered backend (routes, controllers, services, models) | Controllers handle HTTP and validation, services hold the logic, so the logic stays testable and readable |
| Zod for request and env validation | One source of truth for runtime checks, error messages and TypeScript types. The server refuses to start with invalid config |
| Consistent error shape `{ error: { message, details[] } }` | The frontend maps `details` straight onto form fields. Internal errors never leak |
| Integration tests against an in-memory MongoDB | Tests exercise real queries, indexes and validation instead of mocks, and need no external database |
| Escaped regex search over name, email and phone | Correct partial, case-insensitive matching. Escaping prevents regex injection. Documented as a scale trade-off |
| Optimistic status updates with rollback | Instant UI. Failure is handled explicitly and covered by tests |
| Duplicate emails allowed | Not required by the brief; the same contact can appear in several sales records |
| Stats via a single `$group` aggregation | One round trip, and zeros are filled for empty statuses so the UI always has every card |

## Problems found and fixed during AI-assisted development

AI output wasn't accepted blindly. These are issues caught by running, testing or looking at the result, and how each was fixed:

- **Tooling version conflict:** the latest TypeScript (7) isn't supported by `typescript-eslint`. Both packages were pinned to TypeScript 6.0, with oxlint as the linter.
- **Missing peer dependencies:** Vitest 5 needed `vite` installed in the server, and `@testing-library/jest-dom` needed `@testing-library/dom`. The test runs surfaced both.
- **Phone validation reported two errors at once** for one bad value. Fixed by stopping validation at the first failing rule (`abort: true`).
- **Malformed JSON leaked parser internals** in the error message. It's now mapped to "Malformed JSON in request body".
- **The header lead count said "matching" before the debounced search had run.** It now uses the debounced value.
- **Table layout in narrow windows:** browser screenshots showed emails breaking mid-word and the Name column scrolling out of view. Name and email were merged into one "Lead" column with a sensible minimum width.
- **React lint warning** about calling `setState` synchronously inside an effect. The `useLeads` hook was restructured so loading state is derived from whether the latest response matches the current query.
- **A test depended on jsdom's accessible-name whitespace** ("Total7" vs "Total 7"). The query was made whitespace-tolerant.
