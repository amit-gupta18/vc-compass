# The VC Brain — Production Architecture

Stack: Next.js (App Router) + Zustand + TanStack Query + Tailwind · Express + TypeScript · MongoDB (Atlas, replica set) · Neo4j (knowledge graph) · Redis + BullMQ (queues) · LangGraph (agents) · JWT access/refresh auth · Docker + docker-compose → ECS/K8s later.

---

## 1. System Overview

Five deployable units, each independently scalable:

1. **web** — Next.js frontend (investor dashboard, apply flow, memo viewer)
2. **api** — Express/TS REST+SSE gateway (auth, CRUD, enqueue jobs, stream agent progress)
3. **workers** — BullMQ consumers running LangGraph agent graphs (sourcing, screening, diligence, memo)
4. **scheduler** — cron-style producer (BullMQ repeatable jobs) for outbound scanning (GitHub, Product Hunt, arXiv, etc.)
5. **infra** — MongoDB, Neo4j, Redis, object storage (S3-compatible), reverse proxy

```
                         ┌─────────────┐
                         │   Next.js   │  (Vercel/ECS)
                         │  web (SSR)  │
                         └──────┬──────┘
                                │ REST + SSE
                         ┌──────▼──────┐
                         │  Express    │  api (stateless, horizontally scaled)
                         │  api-gw     │
                         └──┬───────┬──┘
                 enqueue    │       │  read/write
                 ┌──────────▼──┐    ▼
                 │  Redis /    │  ┌────────────┐   ┌─────────┐
                 │  BullMQ     │  │  MongoDB   │   │  Neo4j  │
                 └──────┬──────┘  │ (documents,│   │ (graph) │
                        │         │ vector idx)│   └─────────┘
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌───────────┐  ┌─────────────┐  ┌─────────────┐
  │ sourcing  │  │ screening   │  │ diligence / │
  │ worker    │  │ worker      │  │ memo worker │
  │(LangGraph)│  │ (LangGraph) │  │ (LangGraph) │
  └───────────┘  └─────────────┘  └─────────────┘
        ▲
        │ repeatable jobs
  ┌───────────┐
  │ scheduler │  (GitHub/PH/arXiv/accelerator pollers)
  └───────────┘
```

---

## 2. Why this stack, mapped to the brief

| Brief requirement | Architecture answer |
|---|---|
| Sourcing (outbound scanning, continuous) | `scheduler` service + BullMQ repeatable jobs per source connector, results enqueued into `sourcing.identify` queue |
| Screening (3-axis, not averaged) | `screening` worker runs a LangGraph graph with 3 parallel branch nodes (Founder / Market / Idea-vs-Market), each writes an independent score+trend doc |
| Diligence (truth-gap check) | `diligence` worker: claim-extraction node → external-verification node (search/API tools) → contradiction-flagging node, writes Trust Score per claim |
| Memory (never discarded, deduped, timestamped, tagged) | MongoDB as system of record (append-only event log collection + current-state collections), Neo4j for entity relationships (founder↔company↔program↔signal) |
| Founder Score (persists across applications) | Separate `founder_scores` collection keyed by a stable `founder_id` (resolved via identity resolution, not per-application) — never rewritten by an application, only appended-to |
| Multi-Attribute natural-language query | MongoDB Atlas Vector Search (embeddings) + Mongo query filters + Neo4j graph traversal for relationship constraints, combined by a query-planning LangGraph agent |
| Trust Score per claim, evidence-traced | Every claim document stores `sourceRefs[]` pointing to raw evidence docs (deck slide, URL, transcript span) — this doubles as the Agentic Traceability stretch goal |
| Investor-grade UX, configurable Thesis Engine | Next.js dashboard; Thesis config is just a Mongo document read by every scoring agent as a system-prompt/filter input, editable via UI without redeploy |
| Fund that scales / production distributed system | Stateless API + horizontally scalable BullMQ workers + Mongo replica set + Neo4j; everything talks over Redis queues, nothing blocks |

---

## 3. Data layer

### 3.1 MongoDB — source of truth (documents, semi-structured, vectors)
Collections (indicative, not final schema):
- `founders` — identity-resolved person record, stable `founder_id`
- `founder_scores` — append-only score history (time series), current + trend
- `companies`
- `applications` — inbound submissions (deck ref, company, minimal fields)
- `signals` — raw ingested events from any source (GitHub commit, PH launch, arXiv paper, accelerator cohort membership) — **append-only, never mutated**
- `evidence` — atomic evidence units (deck slide image/text, transcript span, web page snapshot) with `sourceType`, `sourceUrl`, `capturedAt`, `hash` (for dedup)
- `claims` — extracted assertions, each with `evidenceRefs[]`, `confidence`, `verificationStatus`
- `axis_scores` — one doc per (opportunity, axis, timestamp): Founder / Market / IdeaVsMarket, each with `score`, `trend`, `rationale`, `evidenceRefs[]`
- `memos` — generated investment memos (versioned, immutable per version)
- `theses` — investor/fund configuration (sectors, stage, geo, check size, ownership target, risk appetite)
- `jobs_audit` — record of every agent run: inputs, outputs, model, tokens, duration (chain-of-thought log for Agentic Traceability)

Vector search: embeddings stored alongside `evidence`/`signals` docs, indexed via Atlas Vector Search index for semantic retrieval feeding the multi-attribute query agent.

### 3.2 Neo4j — relationship / sourcing graph
Nodes: `Founder`, `Company`, `Program` (accelerator/hackathon), `Institution`, `Investor`, `Signal`.
Edges: `FOUNDED`, `ATTENDED`, `MENTORED_BY`, `CO_FOUNDED_WITH`, `REFERRED_BY`, `SOURCED_VIA`, `INVESTED_IN`.
Used for:
- Sourcing & Network Intelligence stretch goal (which channels historically convert)
- Cold-start founder resolution (find weak signals through 2nd-degree connections)
- "no prior VC backing, top-tier accelerator" style relational query constraints

Mongo is system of record; Neo4j is a derived/synced projection (kept in sync via an outbox pattern — a worker consumes a `graph_sync` queue populated on every Mongo write that affects relationships).

### 3.3 Redis
- BullMQ queues/backing store
- Rate limiting, session/refresh-token blocklist, short-lived caches (thesis config, hot founder scores)

---

## 4. Queues (BullMQ) — one queue family per pipeline stage

| Queue | Producer | Consumer | Purpose |
|---|---|---|---|
| `sourcing.scan` | scheduler (repeatable) | sourcing worker | poll GitHub/PH/arXiv/accelerators |
| `sourcing.identify` | sourcing worker | screening worker | candidate found → score like inbound |
| `screening.score` | api (on application submit) or sourcing worker | screening worker | run 3-axis LangGraph graph |
| `diligence.verify` | screening worker (on pass threshold) | diligence worker | truth-gap check, evidence verification |
| `memo.generate` | diligence worker | memo worker | compile memo + Trust Score |
| `graph.sync` | any Mongo write via change-stream listener | graph-sync worker | project into Neo4j |
| `outreach.activate` | screening worker (score > threshold, outbound origin) | outreach worker | trigger cold outreach |

Each queue: dedicated concurrency setting, retry/backoff policy, DLQ (`*.failed`) for manual replay, and a BullMQ Flow (parent/child jobs) where stages must be sequential (screening → diligence → memo) so progress is trackable as one flow in the UI.

MongoDB **change streams** are the trigger mechanism between "state changed" and "queue job enqueued" — this keeps the queue layer decoupled from direct API code paths and makes the system reactive/event-driven, not just request-driven.

---

## 5. Agents (LangGraph), one graph per worker type

- **Sourcing agent**: connector-normalize → dedup-against-Mongo → identity-resolve → founder_score seed/update → enqueue `sourcing.identify`
- **Screening agent**: fan-out to 3 parallel subgraphs (Founder axis, Market axis, Idea-vs-Market axis) → each writes independent `axis_scores` doc with trend vs. previous → Thesis Engine filter node applied last (fund-specific reweighting, not baked into the raw scores)
- **Diligence agent**: claim extraction → per-claim verification tool calls (web search, cross-reference APIs) → contradiction detector → Trust Score assignment
- **Memo agent**: pulls axis scores + claims + evidence → drafts required sections first (Company snapshot, Investment hypotheses, SWOT, Problem & product, Traction & KPIs) → optional sections only if data exists, else explicit "not disclosed" flag → adversarial-view node (stretch: self-correction/validator agent) critiques the draft before finalizing

Every node run is logged to `jobs_audit` with inputs/outputs/evidenceRefs — this is what makes Agentic Traceability free instead of bolted on.

---

## 6. Auth

- Access token (JWT, short-lived ~15min) + Refresh token (opaque, stored hashed in Mongo `sessions` collection, rotated on use, revocable via Redis blocklist)
- httpOnly, Secure, SameSite cookies for refresh; access token in memory (Zustand) on the frontend, attached via TanStack Query's request layer
- Role-based access (investor/admin vs. founder-applicant portal) — same API, scoped routes

---

## 7. Frontend (Next.js)

- **App Router**, server components for read-heavy dashboard pages, client components for interactive scoring/memo views
- **TanStack Query** for all server state (applications list, scores, memo, job/flow progress via polling or SSE-backed query invalidation)
- **Zustand** for local/UI state only (thesis-editor draft, filters, active application in review) — never duplicate server state here
- **Tailwind** for styling; component structure: `dashboard/`, `apply/`, `memo/`, `thesis-config/`, `sourcing-feed/`

Key screens: Investor dashboard (ranked list + momentum trend), Application intake, Live agent progress (flow status), Memo viewer (with evidence drill-down = Agentic Traceability UI), Thesis Engine config, Sourcing feed (outbound candidates + activate button).

---

## 8. Deployment topology

- Local/dev: `docker-compose` — mongo (replica set for change streams), neo4j, redis, api, workers (one process, all queues, low concurrency), web
- Prod target: AWS — ECS/EKS for api + workers (separate task definitions, independent autoscaling by queue depth), Lambda optional for lightweight connectors, S3 for decks/evidence blobs, Bedrock optional as an alternate model provider behind the same LangGraph tool interface
- Observability: structured logs (pino), BullMQ Board/Arena for queue visibility, OpenTelemetry traces spanning api → queue → worker → LLM call

---

## 9. Build order (recommended)

1. Mongo schemas + auth (access/refresh) + base Express API skeleton
2. BullMQ queue scaffolding + one trivial worker end-to-end (prove the flow: enqueue → process → write result → frontend sees it)
3. Screening LangGraph agent (3-axis, real logic) — highest-weighted requirement
4. Sourcing scheduler + connectors (start with GitHub + Product Hunt, cheapest to integrate)
5. Diligence + Trust Score + evidence model
6. Neo4j sync (outbox from Mongo change streams) + relational queries
7. Memo generation + adversarial validator
8. Frontend wired to all of the above
9. Multi-attribute NL query agent over Mongo vector search + Neo4j
10. Polish: traceability UI, sourcing graph visualization, cold-start scoring path

---

## 10. Monorepo folder structure

```
vc-brain/
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx                # ranked list + momentum
│   │   │   │   ├── applications/[id]/
│   │   │   │   ├── memos/[id]/
│   │   │   │   ├── sourcing/
│   │   │   │   └── thesis/
│   │   │   ├── apply/                      # public founder-facing intake
│   │   │   └── api/                        # (only if BFF proxying needed)
│   │   ├── components/
│   │   │   ├── ui/                         # tailwind primitives
│   │   │   ├── dashboard/
│   │   │   ├── memo/
│   │   │   ├── sourcing/
│   │   │   └── thesis/
│   │   ├── lib/
│   │   │   ├── api-client.ts               # fetch wrapper w/ token refresh
│   │   │   ├── query-client.ts             # TanStack Query setup
│   │   │   └── stores/                     # zustand stores
│   │   ├── hooks/
│   │   └── styles/
│   │
│   ├── api/                        # Express + TS gateway
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # login, refresh, session mgmt
│   │   │   │   ├── applications/
│   │   │   │   ├── founders/
│   │   │   │   ├── scores/
│   │   │   │   ├── memos/
│   │   │   │   ├── thesis/
│   │   │   │   ├── sourcing/
│   │   │   │   └── query/          # multi-attribute NL query endpoint
│   │   │   ├── middleware/         # auth guard, rate-limit, error handler
│   │   │   ├── queues/             # BullMQ producers (enqueue helpers)
│   │   │   ├── changestreams/      # mongo change-stream → queue bridges
│   │   │   ├── db/
│   │   │   │   ├── mongo/          # connection, models (mongoose/zod schemas)
│   │   │   │   └── neo4j/          # driver, cypher query builders
│   │   │   ├── sse/                # live job/flow progress streaming
│   │   │   └── server.ts
│   │   └── test/
│   │
│   ├── workers/                    # BullMQ consumers running LangGraph agents
│   │   ├── src/
│   │   │   ├── graphs/
│   │   │   │   ├── sourcing.graph.ts
│   │   │   │   ├── screening.graph.ts
│   │   │   │   ├── diligence.graph.ts
│   │   │   │   └── memo.graph.ts
│   │   │   ├── tools/               # web search, github api, verification tools
│   │   │   ├── processors/          # one per BullMQ queue, wraps a graph
│   │   │   ├── connectors/          # github, product hunt, arxiv, accelerators
│   │   │   └── index.ts             # worker bootstrap (registers all processors)
│   │   └── test/
│   │
│   └── scheduler/                  # repeatable job definitions
│       └── src/
│           ├── repeatables/
│           └── index.ts
│
├── packages/                       # shared across apps
│   ├── shared-types/               # zod schemas + TS types (single source of truth)
│   ├── db-mongo/                   # shared mongoose models if not duplicating in api
│   ├── db-neo4j/                   # shared cypher helpers
│   ├── config/                     # env validation, constants
│   └── logger/                     # pino wrapper
│
├── infra/
│   ├── docker-compose.yml          # mongo(rs), neo4j, redis, api, workers, web
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── workers.Dockerfile
│   │   └── web.Dockerfile
│   └── k8s/ or ecs/                # prod manifests (later)
│
├── turbo.json / pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 11. Open decisions to revisit once code starts

- Model provider(s) behind LangGraph tool interface — Anthropic API vs. Bedrock, and whether to abstract now or hardcode one for speed
- Identity resolution strategy for `founder_id` across sources (fuzzy match now, dedicated service later)
- Whether `graph.sync` is real-time (change streams) or batched (simpler, slightly stale) for the first working version