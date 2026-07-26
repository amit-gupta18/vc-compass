# VC Brain Setup

## What is in the repo right now

This repo is a runnable monorepo scaffold for the architecture in `architecture.md`.

Included now:
- `apps/web` - Next.js frontend scaffold
- `apps/api` - Express + TypeScript API scaffold
- `apps/workers` - worker bootstrap scaffold
- `apps/scheduler` - repeatable-job bootstrap scaffold
- `packages/shared-types` - shared Zod schemas and TypeScript types
- `packages/config` - env parsing helpers
- `packages/logger` - shared `pino` logger factory
- `packages/db-mongo` - Mongo connection helpers
- `packages/db-neo4j` - Neo4j driver helper
- `infra/docker-compose.yml` - local container stack scaffold
- `infra/docker/*.Dockerfile` - Docker build files for the apps

This is still a scaffold, not the full VC platform implementation.

## Prerequisites

Install these before running the project:
- Node.js 24+
- pnpm 9+
- Docker Desktop if you want the container workflow

Current versions used during scaffold verification:
- Node.js `v24.16.0`
- pnpm `9.12.3`

## Project layout

```text
apps/
  web/
  api/
  workers/
  scheduler/
packages/
  shared-types/
  config/
  logger/
  db-mongo/
  db-neo4j/
infra/
  docker-compose.yml
  docker/
```

## Install dependencies

From the repo root:

```bash
pnpm install
```

## Environment variables

Copy `.env.example` to `.env` if you want a local reference set of values.

Important variables:
- `NEXT_PUBLIC_API_BASE_URL` - frontend target for the API
- `MONGODB_URL` - Mongo connection string
- `REDIS_URL` - Redis connection string
- `NEO4J_URI` - Neo4j connection string
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

The current scaffold does not depend on every variable yet, but these are the expected defaults for the planned architecture.

## Run locally without Docker

Start all app processes:

```bash
pnpm dev
```

Run services individually:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:workers
pnpm dev:scheduler
```

## Run local infra only

Start Mongo, Redis, and Neo4j containers:

```bash
pnpm dev:infra
```

This uses `infra/docker-compose.yml` and starts:
- MongoDB on `27017`
- Redis on `6379`
- Neo4j HTTP on `7474`
- Neo4j Bolt on `7687`

## Run the full Docker stack

```bash
pnpm docker:up
```

Stop and remove containers and volumes:

```bash
pnpm docker:down
```

The compose stack includes:
- `mongo`
- `redis`
- `neo4j`
- `api`
- `workers`
- `scheduler`
- `web`

## Default app URLs

- Web: `http://127.0.0.1:3000`
- API health: `http://127.0.0.1:4000/health`
- API SSE: `http://127.0.0.1:4000/events/jobs`
- Neo4j browser: `http://127.0.0.1:7474`

## Verification commands

Run type checks:

```bash
pnpm typecheck
```

Run builds:

```bash
pnpm build
```

Run both:

```bash
pnpm check
```

## What has already been verified

The current scaffold has been checked with:
- `pnpm install`
- `pnpm typecheck`
- `pnpm build`
- web startup on port `3000`
- API startup and `GET /health` on port `4000`
- workers startup
- scheduler startup

## Notes about Docker and Mongo replica set

The Docker scaffold includes a Mongo replica set bootstrap script so the local stack matches the architecture requirement for Mongo change streams.

If you remove Docker volumes and recreate the stack, Mongo will reinitialize from the mounted script.

## Next implementation steps

Suggested order from here:
1. Wire `apps/api` to `packages/config`, `packages/logger`, and `packages/db-mongo`.
2. Add real API modules under `apps/api/src/modules`.
3. Add BullMQ queue producers and consumers.
4. Connect `workers` and `scheduler` to Redis.
5. Add Mongo schemas and Neo4j sync logic.
6. Replace placeholder web pages with real dashboard flows.
