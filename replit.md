# IPL Auction Game

## Overview

Full-stack IPL Cricket Auction Simulator — a real-time bidding game with 600+ players, 10 IPL teams, and AI-powered rival bidders.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (dark theme, gold accent)
- **Backend**: Express 5 + Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

- **`artifacts/ipl-auction/`** — React + Vite frontend (served at `/`)
- **`artifacts/api-server/`** — Express API server (served at `/api`)
- **`lib/api-spec/`** — OpenAPI spec (single source of truth)
- **`lib/api-client-react/`** — Generated React Query hooks
- **`lib/api-zod/`** — Generated Zod validation schemas
- **`lib/db/`** — PostgreSQL schema (Drizzle ORM)

## Key Features

1. **600+ Players** — Real IPL stars (Virat Kohli, Jasprit Bumrah, etc.) + generated players seeded on auction start
2. **10 IPL Teams** — CSK, MI, RCB, KKR, DC, RR, SRH, PBKS, LSG, GT with real brand colors
3. **AI Bidding** — 3 difficulty levels (Easy/Medium/Hard) affecting bid frequency, max multiplier, and decision intelligence
4. **Real-time Auction** — Timer countdown, live bid updates (polling every 2s), SOLD animation
5. **Pages**: Setup (`/`), Auction (`/auction`), My Squad (`/squad`), History (`/history`)

## Backend Data

- **`artifacts/api-server/src/data/teams.ts`** — IPL team configs
- **`artifacts/api-server/src/data/players-seed.ts`** — Player dataset generator (real + generated)
- **`artifacts/api-server/src/data/auction-state.ts`** — In-memory singleton auction state
- **`artifacts/api-server/src/data/ai-bidder.ts`** — AI bidding logic
- **`artifacts/api-server/src/routes/auction.ts`** — Auction mechanics

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/ipl-auction run dev` — run frontend locally

## API Endpoints

- `GET /api/players` — List players (filterable by role, nationality, search, sold)
- `GET /api/teams` — All 10 teams with budgets and squads
- `GET /api/auction/state` — Current auction state (poll every 2s)
- `POST /api/auction/start` — Start auction with userTeamId, budget, difficulty
- `POST /api/auction/bid` — Place user bid
- `POST /api/auction/ai-bid` — Trigger AI bidding round (called every 3s)
- `POST /api/auction/next` — Advance to next player
- `POST /api/auction/pass` — Mark current player unsold
- `POST /api/auction/reset` — Reset everything
- `GET /api/auction/history` — Auction log
