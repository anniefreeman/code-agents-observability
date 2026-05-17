# code-agents-observability

A hobby-trial booking platform — users discover and book sessions across heterogeneous activities (tennis, pilates, dance, hiking, etc.). Built as a serious-engineering demo for code-agents observability.

## Commands

- `npm start` — run the server (default port 3000; override with `PORT=...`)
- `npm test` — run all tests under `test/**/*.test.ts` (uses the in-memory adapter)
- `npm run check` — type-check the whole project with `tsc --noEmit` (CI gate, not a dev-loop step)
- `docker compose up -d` — start the local Postgres
- `npm run db:generate` — generate a new migration from schema changes in `src/db/schema/`
- `npm run db:migrate` — apply pending migrations (requires `DATABASE_URL`)
- Swagger UI: `http://localhost:3000/docs` once the server is running

## TypeScript toolchain

- **Language**: TypeScript with `strict: true`. All source and tests are `.ts`.
- **Runner**: `tsx` runs `.ts` files directly with no build step in dev. `npm start` uses `tsx -r ./tracing.ts src/server.ts`; `npm test` uses `tsx --test`.
- **Type-checking**: `tsc --noEmit` via `npm run check`. We do not build to `dist/` — tsx handles execution.
- **Module style**: ES `import` / `export` syntax, transpiled to CommonJS via `tsconfig.json` (`module: commonjs`).
- **No `any` without a written-in-line reason.** Prefer `unknown` and narrow.

## Project structure

```
src/
  app.ts                Express app: mounts feature routers + Swagger UI + error middleware
  server.ts             Boots the app (imports telemetry first)
  swagger.ts            OpenAPI spec generator + UI middleware
  errors.ts             Shared DomainError hierarchy (NotFoundError, ...)
  asyncHandler.ts       Wraps async route handlers so rejections forward to error middleware
  telemetry/
    instrumentation.ts  OTel SDK bootstrap — traces + metrics + logs + auto-instrumentations
    logger.ts           Shared pino instance (auto-bridged to OTel logs)
  db/
    index.ts            pg Pool + drizzle client; getDb() returns null if DATABASE_URL unset
    schema/             Drizzle table definitions, one file per resource
  features/
    <feature>/
      routes.ts             URL → controller wiring + @openapi JSDoc
      controller.ts         HTTP-aware handlers (req/res)
      service.ts            Business logic — createXService(repo, ports) factory + singleton
      repository.ts         Async repository port + in-memory adapter
      repository.postgres.ts Postgres adapter (drizzle queries) satisfying the same port
      schemas/              One file per model layer (input/stored/response/index)
      mappers.ts            Pure transforms between layers + domain helpers
migrations/             drizzle-kit generated SQL; committed to the repo
scripts/
  migrate.ts            One-shot migration runner (npm run db:migrate)
test/
  <feature>.test.ts          supertest-based integration tests for the feature
  <feature>.service.test.ts  unit tests for the service layer (factory + isolated repo)
docker-compose.yml      Local Postgres (and eventually the app + other services)
drizzle.config.ts       drizzle-kit config (only used by tooling, not the runtime)
```

Each feature is self-contained. Routes, controller, service, and repository live together so future service extraction is a `git mv`.

## Per-feature layering

Three runtime layers — controller → service → repository — plus pure-function helpers (schemas, mappers).

- **`routes.ts`** — declarative wiring only. Reading this file should tell you the API surface at a glance. Includes `@openapi` JSDoc above each route.
- **`controller.ts`** — knows about HTTP. Validates `req.body` against the input schema (the boundary), calls the service singleton, shapes the response via `mappers.toResponse`. No business logic, no persistence, no null-checks for missing entities — domain errors thrown by the service flow to the error middleware in `app.ts`, which maps them to status codes (`NotFoundError` → 404).
- **`service.ts`** — business logic. Exposes a `createXService(repo)` factory that closes over its repository dependency, plus a default `xService` singleton wired to the in-memory adapter. Trusts already-validated input. Throws typed domain errors (`NotFoundError`, etc.) instead of returning `null`. Knows nothing about HTTP.
- **`repository.ts`** — persistence port + in-memory adapter. Exports an async `XRepository` type (all methods return `Promise<...>`) and `createInMemoryX()` factory. Sibling `repository.postgres.ts` provides the SQL-backed adapter via drizzle; both satisfy the same port. Typed against the Stored shape, returns plain data. No `req` / `res`, no validation, no business rules.
- **`schemas/`** — zod schemas + inferred types for the three model layers, split one file per layer (`input.ts`, `stored.ts`, `response.ts`) plus an `index.ts` that re-exports. Single source of truth: validation, TypeScript types, AND OpenAPI components are all derived from these definitions.
- **`mappers.ts`** — pure functions translating between layers (`toStored`, `applyUpdate`, `toResponse`) plus domain helpers (e.g. `availableSpots`, `isFull`) shared between service and `toResponse`. Easy to unit-test in isolation.

If a feature is trivial (e.g. `health`), skip the controller, service, schemas, and mappers — inline the handler in `routes.ts`.

### Why factory + DI for the service

The service is constructed by a `createXService(repo)` factory that returns a plain object whose methods close over `repo`. The default singleton wires the in-memory repository; tests construct their own service+repo pair per test for trivial isolation. We avoid classes (and `this`-binding pitfalls / `private` not being real) — see `src/features/sessions/service.ts` for the canonical example.

### Three model layers (Input / Stored / Response)

Each non-trivial feature has three distinct shapes for its main resource:

- **Input** — what a client may send. `.strict()` rejects unknown fields, which gives mass-assignment protection for free (clients can't sneak in `id`, `status`, server timestamps, etc.).
- **Stored** — what lives in the store. Input plus server-set fields (`id` as UUID, status, timestamps, denormalised counts).
- **Response** — what clients see. Stored plus computed fields (`availableSpots`, `isFull`). Internal fields (e.g. soft-delete columns) would be omitted here.

Validation happens once at the boundary (controller). Everything downstream trusts its inputs.

### Cross-feature decoupling

**A feature must not import schemas from another feature.** Foreign-key relationships (a booking's `sessionId`, etc.) are represented as **UUID strings**, not as nested schemas — the consuming feature declares its own field as `z.string().uuid()` and that's it. The Booking schema does not need to know what a Session looks like; only that there is one with a UUID.

If you find yourself wanting to embed another feature's full response in your own (e.g. a booking response that includes the whole session object), prefer returning the foreign-key ID and letting the client compose. That keeps the API minimal, keeps the features independently extractable into separate services, and avoids changes in one feature rippling into another's schemas.

Truly shared utility schemas (a `Location` type used by both sessions and venues, say) would live in a future `src/schemas/shared/` folder *when an actual second consumer appears* — not pre-emptively.

## Naming conventions

- **Controller methods**: `list`, `get`, `create`, `update`, `remove`. No resource name in the method — the folder is the namespace.
- **Service methods**: `list`, `get`, `create`, `update`, `remove`. Mirror the controller. `get` / `update` / `remove` throw `NotFoundError` rather than returning a nullable.
- **Repository methods**: `all`, `get`, `save`, `remove`. (One write method covers create + update — the service decides which by calling `get` first.)
- **Factories**: `createXService`, `createInMemoryX`, `createPostgresX`.
- **Route paths**: feature-relative inside the router (`/`, `/:id`); prefixed in `app.ts` (`app.use('/sessions', sessionsRoutes)`).

## Contract functions

When a function does enough work to need multiple steps, structure it as a *contract*: the top-level body reads as a high-level specification, with each step delegated to a named sub-function. The contract carries the design; the sub-functions carry the implementation.

Apply this when a function would otherwise mix concerns (validation + I/O + persistence, or orchestrating several external calls). Skip it for genuinely linear, single-purpose code — extracting one-line helpers just to satisfy the pattern is worse than leaving it inline.

A reader should be able to learn what the function does without opening any sub-function.

## Resource model

Two distinct user-facing resources:

- **`/sessions`** — bookable activities. Created and managed by hosts. Full CRUD. Response `bookedCount` / `availableSpots` / `isFull` are derived live via the `BookingsPort` (not stored).
- **`/bookings`** — a user's claim on a session. References `sessionId`. **No PUT** — bookings are cancelled and recreated. DELETE is a soft delete (status flips to `'cancelled'`, row remains for audit). Uniqueness: an attendee may hold one *confirmed* booking per session — cancelling and rebooking is allowed.

Cross-feature talk happens over typed async ports (`SessionsPort`, `BookingsPort`) wired in each service's singleton. Lazy + namespace imports avoid the module-init circular issue. When either feature extracts into its own service, only the port adapter changes.

## Testing

- One test file per feature in `test/`. Hit HTTP through the app with `supertest`.
- Use `node:test` via `tsx --test` (no separate test runner library needed).
- Cover happy paths first; add error cases as behaviour solidifies.
- TDD workflow: write the failing test, run to confirm it fails, implement, run to confirm it passes.

## API documentation

- Swagger UI is mounted at `/docs`. The spec is hybrid: **paths come from `@openapi` JSDoc** above each route; **schemas come from zod** via `@asteasolutions/zod-to-openapi` (single source of truth).
- Each feature's `schemas.ts` decorates its zod schemas with `.openapi('Name')`. `src/swagger.ts` registers them in an `OpenAPIRegistry`, generates `components.schemas`, and merges the result into the `swagger-jsdoc` options. Route JSDoc references the names via `$ref: '#/components/schemas/Name'`.
- `src/swagger.ts` globs `./src/features/**/routes.ts` — adding a new feature folder is auto-picked-up. (You also need to import + register that feature's zod schemas in `src/swagger.ts`.)

## Observability

All three OpenTelemetry signals (traces, metrics, logs) are exported to Coralogix via OTLP/HTTP.

- **`src/telemetry/instrumentation.ts`** bootstraps the OTel SDK. It is imported as the **first line** of `src/server.ts` — auto-instrumentation patches modules at import time, so anything imported before it (including `./app`) won't be instrumented. Don't import it from anywhere else; once is enough and re-imports re-initialise the SDK.
- **`src/telemetry/logger.ts`** exports a shared `pino` instance. App code emits log records via `logger.info(...)` etc.; `pino-http` middleware in `src/app.ts` produces a structured log per HTTP request. The auto-instrumentation bundle's `instrumentation-pino` bridges every record to the OTel logger provider, which exports them via OTLP. Each record carries the active `trace_id` / `span_id`, so logs pivot to traces in Coralogix.
- **Auto-instrumentation only** for now (`@opentelemetry/auto-instrumentations-node`) — Express, HTTP, pino, fs, etc. produce spans/metrics/log-bridges automatically. Add manual spans, meters, or log calls only when something interesting falls outside auto-coverage.
- **Endpoints**: `https://ingress.<CX_DOMAIN>/v1/{traces,metrics,logs}` — Coralogix uses the standard OTLP HTTP paths.
- **Encoding**: protobuf (Coralogix's OTLP endpoint rejects JSON with HTTP 400). Uses the `-proto` exporters (`exporter-trace-otlp-proto`, `exporter-metrics-otlp-proto`, `exporter-logs-otlp-proto`), *not* `-otlp-http`.
- **Diagnostic logging**: `instrumentation.ts` wires `diag.setLogger(...)` so OTel internals (export failures, dropped spans) print to the server console. Default level is `WARN`; override with `OTEL_LOG_LEVEL=DEBUG` (or `INFO`/`ERROR`) when investigating something. Without this, OTel swallows export errors silently.
- **Auth headers**: `Authorization: Bearer <CX_PRIVATE_KEY>` plus `cx-application-name` and `cx-subsystem-name` so all signals are tagged correctly in Coralogix.
- **Config via `.env`** (loaded by `dotenv` inside `instrumentation.ts`). Required vars are documented in `.env.example`. The real `.env` is gitignored.

## Persistence

Postgres-backed via [Drizzle](https://orm.drizzle.team/). Two adapters live behind the repository port:

- **In-memory** (`repository.ts`) — used when `DATABASE_URL` is unset. Tests use this path by default.
- **Postgres** (`repository.postgres.ts`) — used when `DATABASE_URL` is set. Returns ISO 8601 timestamps (Postgres native format is normalised on the way out). Upserts via `INSERT ... ON CONFLICT (id) DO UPDATE` to match the in-memory adapter's `save` semantics.

`src/db/getDb()` returns the shared drizzle client (built lazily on first call) or `null` when `DATABASE_URL` is unset. Each feature's service singleton picks the adapter at module init based on this. The pg pool is auto-instrumented by OTel (via the `auto-instrumentations-node` bundle) — every query becomes a span on the request trace.

Migrations live in `migrations/` and are committed. Generate with `npm run db:generate` after editing `src/db/schema/`; apply with `npm run db:migrate` (locally; in EKS this runs as a Kubernetes Job before the app rolls).

`DATABASE_URL` is the single env-var contract — same shape for local docker-compose Postgres and (eventually) RDS.

## Out of scope for now

- **Auth** — endpoints are open. When auth lands, `/bookings` becomes user-scoped.
- **Deployment** — local Docker for Postgres only; containerising the app and producing k8s manifests for EKS are the next planned steps.
- **Future refactor**: once persistence diverges from the in-memory model (e.g. denormalised columns, soft-delete tombstones), split `Stored` into a `Domain` shape and a `Persisted` DB-row shape with a mapping in the Postgres adapter.
