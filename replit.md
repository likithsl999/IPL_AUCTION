# IPL Auction Game

## Overview

Full-stack IPL Cricket Auction Simulator — a real-time bidding game with 200+ real cricket players with full stats, 10 IPL teams, franchise-style AI bidders, and a premium black glassmorphism UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (black glassmorphism, neon accents)
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

### 1. Real Players with Full Stats (200+ players)
- All real IPL/international cricketers (Kohli, Bumrah, Russell, etc.)
- Extended stats: battingRating, bowlingRating, fieldingRating, age, experience, form, strikeRate, economy, strengths, weaknesses
- Players sorted by skillRating: 95+ first, then 90-94, 85-89, etc.
- Choose pool size: 50 / 100 / Full players

### 2. Smart Auction Order
- Players appear in order: 95+ rated first, then descending tiers
- Configurable pool size at auction start

### 3. Advanced AI (4 difficulty levels)
- **Rookie (Easy)**: Slow decisions, gives up early
- **Pro (Medium)**: Balanced realistic bidding
- **Veteran (Hard)**: Smart targeting, franchise priorities, squad-aware
- **Extreme**: Real IPL-style — saves budget for key players, franchise personalities per team, actively outbids user on priority roles

### 4. Fast Auction Timer
- Timer: 5 seconds (down from 15)
- Resets to 3 seconds on each new bid
- "Going Once... Going Twice..." text effects as timer drops
- AI bids triggered every 1.2 seconds for responsive feel

### 5. Premium Black UI (Glassmorphism)
- Black background with neon accents
- Player cards with stat bars (Batting/Bowling/Fielding)
- Strengths (green tags) and Weaknesses (red tags)
- SOLD! animation with team color glow
- Dynamic budget bars per team

### 6. Full Team Visibility
- All Teams page (`/teams`) shows all 10 squads
- Expand/collapse each team to see roster
- Sort by players / budget / avg rating / name
- Role breakdown per team

## Pages

- `/` — Setup: franchise select, difficulty, budget, player pool
- `/auction` — Live auction room with player card, stats, timer, bid controls
- `/squad` — Your squad with enhanced player cards and stats
- `/teams` — All 10 teams' rosters and budgets
- `/history` — Full auction log with filters

## Backend Data

- **`artifacts/api-server/src/data/teams.ts`** — IPL team configs
- **`artifacts/api-server/src/data/players-seed.ts`** — 200+ real players with full stats
- **`artifacts/api-server/src/data/auction-state.ts`** — In-memory singleton auction state
- **`artifacts/api-server/src/data/ai-bidder.ts`** — AI engine (4 difficulty levels, franchise personalities)
- **`artifacts/api-server/src/routes/auction.ts`** — Auction mechanics

## Database Schema (players table)

Core: id, name, role, basePrice, skillRating, nationality, sold, soldTo, soldPrice
Extended: battingRating, bowlingRating, fieldingRating, age, experience, form, strikeRate, economy, strengths, weaknesses

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
- `GET /api/auction/state` — Current auction state (poll every 800ms)
- `POST /api/auction/start` — Start auction (userTeamId, budget, difficulty, playerCount)
- `POST /api/auction/bid` — Place user bid (resets timer to 3s)
- `POST /api/auction/ai-bid` — Trigger AI bidding round (called every 1.2s)
- `POST /api/auction/next` — Advance to next player / sell
- `POST /api/auction/pass` — Mark current player unsold
- `POST /api/auction/reset` — Reset everything
- `GET /api/auction/history` — Auction log
