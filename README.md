# ClassPass but for every hobby
## Demo app for observing context engineering techniques

A small backend powering a hobby-trial booking platform — users discover and book sessions across heterogeneous activities (tennis, pilates, dance, hiking, pottery, climbing). Built as a demo for observing AI code agents at work.

## Stack

TypeScript · Express · zod · node:test + supertest · OpenTelemetry (traces + metrics + logs over OTLP, exported to Coralogix) · in-memory persistence (swap-in port for SQL later).

## Architecture

```mermaid
flowchart LR
    Client[HTTP client]

    subgraph Sessions[Sessions feature]
        direction TB
        S_route[routes]
        S_ctrl[controller]
        S_svc[service]
        S_repo[(repository<br/>in-memory)]
        S_route --> S_ctrl --> S_svc --> S_repo
    end

    subgraph Bookings[Bookings feature]
        direction TB
        B_route[routes]
        B_ctrl[controller]
        B_svc[service]
        B_repo[(repository<br/>in-memory)]
        B_route --> B_ctrl --> B_svc --> B_repo
    end

    Client --> S_route
    Client --> B_route

    B_svc -.->|SessionsPort:<br/>getSession| S_svc
    S_svc -.->|BookingsPort:<br/>countConfirmed| B_svc
```

Each feature is self-contained (`src/features/<name>/`):

- **routes** — declarative URL → handler wiring with `@openapi` JSDoc
- **controller** — HTTP only: validates input, calls service, shapes response (most response shaping is now done in the service for sessions; controllers are thin)
- **service** — business logic, factory-injected repository + cross-feature ports, throws typed domain errors (`NotFoundError`, `CapacityFullError`, `DuplicateBookingError`)
- **repository** — persistence port + in-memory adapter; one file changes when SQL lands
- **schemas/** — zod-defined `Input` / `Stored` / `Response` model layers (single source of truth for validation, types, and OpenAPI components)
- **mappers** — pure transforms between layers

Cross-feature talk happens over typed ports (the dotted arrows above). Today they're satisfied by in-process adapters; when sessions or bookings extracts into its own service, only the adapter changes — feature code stays put. Ports are async-shaped from day one so the eventual HTTP migration doesn't require a sync→async refactor.

Domain errors thrown anywhere flow through `asyncHandler` to a single `DomainError` middleware in `app.ts`, which reads `err.statusCode` to render the response.

## Endpoints

### Health

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | uptime + timestamp |

### Sessions

A session is a bookable activity created by a host (capacity, location, time, etc.).

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/sessions`     | list all sessions |
| `GET`    | `/sessions/:id` | get a session (`bookedCount` / `availableSpots` / `isFull` are derived from real bookings) |
| `POST`   | `/sessions`     | create a session |
| `PUT`    | `/sessions/:id` | update a session |
| `DELETE` | `/sessions/:id` | delete a session |

### Bookings

A booking is a user's claim on a session. References `sessionId`. Bookings have **no PUT** — they are cancelled and recreated, not edited.

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/bookings`         | list all bookings |
| `GET`    | `/bookings?attendeeName=X` | list bookings for a specific attendee (includes cancelled) |
| `GET`    | `/bookings/:id`     | get a booking |
| `POST`   | `/bookings`         | create a booking — `404` if session unknown, `409` if session full or attendee already has a confirmed booking |
| `DELETE` | `/bookings/:id`     | cancel a booking (soft delete: row stays with `status='cancelled'`) |

### Docs

| Method | Path | Notes |
|---|---|---|
| `GET` | `/docs` | Swagger UI (zod schemas → OpenAPI) |

## Quick start

```bash
npm install
cp .env.example .env   # fill in Coralogix creds (or leave blank for local-only)
npm start              # http://localhost:3000
```

```bash
npm test          # run all tests (node:test + supertest)
npm run check     # type-check (tsc --noEmit)
```

## Out of scope for now

- **Auth.** Endpoints are open; bookings identify users by `attendeeName` until auth lands.
- **Persistence.** In-memory `Map`s — state is lost on restart.
