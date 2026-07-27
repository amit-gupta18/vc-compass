# VC Brain Setup

## What is in the repo right now

This repo is a runnable monorepo scaffold for the architecture in `architecture.md`.

### Applications

| App | Path | Stack | Status |
|-----|------|-------|--------|
| `@vc-brain/web` | `apps/web/` | Next.js 15 (App Router) + TanStack Query + Zustand + Tailwind v4 | Scaffolded, builds, starts |
| `@vc-brain/api` | `apps/api/` | Express 4 + TypeScript + dotenv | Scaffolded, builds, starts, wired to shared packages |
| `@vc-brain/workers` | `apps/workers/` | TypeScript + dotenv | Scaffolded, builds, starts, wired to shared packages |
| `@vc-brain/scheduler` | `apps/scheduler/` | TypeScript + dotenv | Scaffolded, builds, starts, wired to shared packages |

### Shared packages

| Package | Path | Purpose | Status |
|---------|------|---------|--------|
| `@vc-brain/shared-types` | `packages/shared-types/` | Zod schemas + TS types (single source of truth) | Built and consumed by api, workers |
| `@vc-brain/config` | `packages/config/` | Env validation, constants, port defaults | Built and consumed by api, workers, scheduler |
| `@vc-brain/logger` | `packages/logger/` | `pino` logger factory | Built and consumed by api, workers, scheduler |
| `@vc-brain/db-mongo` | `packages/db-mongo/` | Mongoose connect/disconnect helpers | Built and consumed by api |
| `@vc-brain/db-neo4j` | `packages/db-neo4j/` | Neo4j driver factory | Built, ready for wiring |

### Infrastructure

| File | Purpose |
|------|---------|
| `infra/docker-compose.yml` | Local container stack (Mongo, Redis, Neo4j, api, workers, scheduler, web) |
| `infra/docker/api.Dockerfile` | API container build |
| `infra/docker/workers.Dockerfile` | Workers/scheduler container build |
| `infra/docker/web.Dockerfile` | Web container build |
| `infra/docker/mongo/init-replica.js` | Mongo replica set bootstrap for change streams |
| `.env.example` | Reference environment variables |
| `.dockerignore` | Docker build exclusions |

### Other root files

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo task pipeline (typecheck depends on `^build`) |
| `tsconfig.base.json` | Shared TypeScript compiler options |
| `pnpm-workspace.yaml` | Workspace package globs |
| `.gitignore` | Git exclusions |
| `setup.md` | This file |
| `architecture.md` | Full production architecture spec |

This is still a scaffold, not the full VC platform implementation.

---

## Prerequisites

Install these before running the project:
- **Node.js** 24+
- **pnpm** 9+
- **Docker Desktop** if you want the container workflow

Current versions used during scaffold verification:
- Node.js `v24.16.0`
- pnpm `9.12.3`

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start all services locally
pnpm dev
```

That's it. The API starts on `:4000`, the web frontend on `:3000`.

---

## Install dependencies

From the repo root:

```bash
pnpm install
```

This installs dependencies for all workspace packages and links them together.

---

## Environment variables

Copy `.env.example` to `.env` at the repo root:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Used by |
|----------|---------|---------|
| `NODE_ENV` | `development` | all |
| `WEB_PORT` | `3000` | web |
| `API_PORT` | `4000` | api |
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:4000` | web |
| `MONGODB_URL` | `mongodb://127.0.0.1:27017/vc_brain?replicaSet=rs0` | api |
| `REDIS_URL` | `redis://127.0.0.1:6379` | workers, scheduler |
| `NEO4J_URI` | `neo4j://127.0.0.1:7687` | api |
| `NEO4J_USERNAME` | `neo4j` | api |
| `NEO4J_PASSWORD` | `vc-brain-password` | api |
| `JWT_ACCESS_SECRET` | `change-me-access-secret` | api |
| `JWT_REFRESH_SECRET` | `change-me-refresh-secret` | api |
| `LOG_LEVEL` | `info` | api, workers, scheduler |

**Important:** The API, workers, and scheduler use `dotenv` to load `.env` files. The web app uses Next.js built-in env handling (`NEXT_PUBLIC_*` prefix for client-side).

If `MONGODB_URL` is not set, the API starts without Mongo in "scaffold mode" and logs a warning.

---

## Run locally without Docker

Start all app processes in parallel via Turborepo:

```bash
pnpm dev
```

Or run services individually:

```bash
pnpm dev:web          # Next.js dev server on :3000
pnpm dev:api          # Express on :4000 (tsx watch)
pnpm dev:workers      # Worker bootstrap (tsx watch)
pnpm dev:scheduler    # Scheduler bootstrap (tsx watch)
```

Each `dev:*` task for api/workers/scheduler runs a `predev` script that builds the shared packages it depends on first.

---

## Run local infra only

Start Mongo, Redis, and Neo4j containers:

```bash
pnpm dev:infra
```

This uses `infra/docker-compose.yml` and starts:
- **MongoDB** on `27017` (with replica set `rs0`)
- **Redis** on `6379`
- **Neo4j HTTP** on `7474`
- **Neo4j Bolt** on `7687`

---

## Run the full Docker stack

Build and start everything in containers:

```bash
pnpm docker:up
```

Stop and remove containers and volumes:

```bash
pnpm docker:down
```

The compose stack includes: `mongo`, `redis`, `neo4j`, `api`, `workers`, `scheduler`, `web`.

---

## Default app URLs

| Service | URL |
|---------|-----|
| Web | `http://127.0.0.1:3000` |
| API health | `http://127.0.0.1:4000/health` |
| API applications | `POST http://127.0.0.1:4000/applications` |
| API SSE | `http://127.0.0.1:4000/events/jobs` |
| Neo4j browser | `http://127.0.0.1:7474` |

---

## API routes (current)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check with env info |
| `POST` | `/applications` | Submit an application (Zod-validated) |
| `GET` | `/events/jobs` | SSE stream for job progress events |

---

## Web routes (current)

| Path | Description |
|------|-------------|
| `/` | Dashboard with ranked opportunities + momentum |
| `/applications` | Applications list |
| `/applications/[id]` | Application detail |
| `/memos` | Memos list |
| `/memos/[id]` | Memo detail |
| `/sourcing` | Sourcing feed |
| `/thesis` | Thesis engine config |
| `/apply` | Public founder application intake |
| `/login` | Investor login |

---

## Verification commands

```bash
pnpm typecheck       # Type-check all packages and apps
pnpm build           # Build all packages and apps
pnpm check           # Both typecheck + build
```

---

## Package boundary

Apps consume shared packages via their built `dist/` output. Turbo handles the dependency graph:

- `pnpm typecheck` depends on `^build` (shared packages are built before app typecheck)
- `pnpm build` depends on `^build`
- `pnpm dev` uses `predev` scripts in each app to build its shared dependencies before starting

Shared packages export from `dist/` with proper `types`, `import`, and `default` fields.

---

## What has already been verified

- `pnpm install` -- all 10 workspace packages resolve
- `pnpm typecheck` -- all 9 packages pass
- `pnpm build` -- all 9 packages build (including Next.js)
- Web startup on port `3000` (HTTP 200)
- API startup on port `4000`, `GET /health` returns OK
- API `POST /applications` accepts and validates payloads
- Workers startup with shared config, logger, and types
- Scheduler startup with shared config and logger

---

## Architecture notes

### Mongo replica set
The Docker scaffold includes a Mongo replica set bootstrap script so the local stack matches the architecture requirement for Mongo change streams. If you remove Docker volumes and recreate the stack, Mongo will reinitialise from the mounted script.

### Mongo is optional at runtime
The API gracefully handles a missing `MONGODB_URL` by skipping Mongo bootstrap and logging a warning. This lets you develop the frontend and API routes without a running database.

### SSE for job progress
The `/events/jobs` endpoint streams `jobProgressEventSchema`-typed events. Workers will eventually push real flow progress here through BullMQ -> Redis -> SSE.

---

## Next implementation steps

Suggested order from `architecture.md` section 9:

1. Add real API modules under `apps/api/src/modules` (auth, applications, founders, scores, memos, thesis, sourcing, query)
2. Wire `@vc-brain/db-mongo` into API modules for CRUD
3. Add BullMQ queue producers in `apps/api/src/queues` and consumers in `apps/workers/src/processors`
4. Build the first LangGraph agent graph (`apps/workers/src/graphs/screening.graph.ts`)
5. Add Mongo schemas and Neo4j sync logic (`apps/api/src/changestreams/`)
6. Connect `workers` and `scheduler` to Redis
7. Wire `@vc-brain/db-neo4j` for graph queries
8. Replace placeholder web pages with real dashboard flows
9. Add multi-attribute NL query agent
10. Polish: traceability UI, sourcing graph visualisation, cold-start scoring
