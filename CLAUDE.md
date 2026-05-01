# code-agents-observability

A hobby-trial booking platform — users discover and book sessions across heterogeneous activities (tennis, pilates, dance, hiking, etc.). Built as a serious-engineering demo for code-agents observability.

## Commands

- `npm start` — run the server (default port 3000; override with `PORT=...`)
- `npm test` — run all tests under `test/**/*.test.js`
- Swagger UI: `http://localhost:3000/docs` once the server is running

## Project structure

```
src/
  app.js                Express app: mounts feature routers + Swagger UI
  server.js             Boots the app
  swagger.js            OpenAPI spec generator + UI middleware
  features/
    <feature>/
      routes.js         URL → controller wiring + @openapi JSDoc
      controller.js     HTTP-aware handlers (req/res)
      store.js          Persistence layer (no HTTP awareness)
test/
  <feature>.test.js     supertest-based integration tests for the feature
```

Each feature is self-contained. Routes, controller, and store live together so future service extraction is a `git mv`.

## Per-feature layering

Three concerns, three files. Do not blur them.

- **`routes.js`** — declarative wiring only. Reading this file should tell you the API surface at a glance. Includes `@openapi` JSDoc above each route.
- **`controller.js`** — knows about HTTP. Reads `req`, calls the store, translates results into status codes (`null` from store → 404, etc.). No persistence logic.
- **`store.js`** — knows about persistence. Returns plain data (or `null` / `true` / `false`). No `req` / `res`. This is the only file that changes when the in-memory `Map` is swapped for a real database.

If a feature is trivial (e.g. `health`), skip the controller — inline the handler in `routes.js`. Add a controller when a function would exceed ~5 lines.

## Naming conventions

- **Controller methods**: `list`, `get`, `create`, `update`, `remove`. No resource name in the method — the folder is the namespace.
- **Store methods**: `all`, `get`, `create`, `update`, `remove`.
- **Route paths**: feature-relative inside the router (`/`, `/:id`); prefixed in `app.js` (`app.use('/sessions', sessionsRoutes)`).

## Resource model

Two distinct user-facing resources:

- **`/sessions`** — bookable activities. Created and managed by hosts. Full CRUD including PUT (sessions can be edited).
- **`/bookings`** *(planned)* — a user's claim on a session. References `sessionId`. **No PUT** — bookings are cancelled and recreated, not edited.

A user has many bookings. A session has many bookings (capacity-limited). A booking belongs to exactly one user and one session.

## Testing

- One test file per feature in `test/`. Hit HTTP through the app with `supertest`.
- Use `node:test` (built-in, no extra runner).
- Cover happy paths first; add error cases as behaviour solidifies.
- TDD workflow: write the failing test, run to confirm it fails, implement, run to confirm it passes.

## API documentation

- Swagger UI is mounted at `/docs`, generated from `@openapi` JSDoc comments above each route.
- Reusable schemas live in `src/swagger.js` under `components.schemas`. Route-level JSDoc references them via `$ref`.
- `src/swagger.js` globs `./src/features/**/routes.js` — adding a new feature folder is auto-picked-up.

## Out of scope for now

- **Auth** — endpoints are open. When auth lands, `/bookings` becomes user-scoped.
- **Validation** — bodies are accepted as-is. Validation will live in controllers once session/booking shapes solidify.
- **Persistence** — in-memory `Map`s only. Swap by replacing the contents of `store.js` files; nothing else should need to change.
