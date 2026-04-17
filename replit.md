# IPL Auction Simulator 2026

## Overview

Premium full-stack IPL Cricket Auction Simulator 2026 — real-time bidding with 252+ real players (full stats), 10 IPL teams, advanced AI with panic/rivalry system, career mode with match simulation, live commentary feed, circular timer, and a professional black glassmorphism UI. Developed by Likith.

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

### 1. Real Player Database (252+ Unique Players)
- Tiers: TIER_95 (legends), TIER_90 (elite), TIER_85 (stars), TIER_80 (good), TIER_DOMESTIC, TIER_2026, TIER_GLOBAL
- Full stats: name, role, nationality, age, experience, form, skillRating, battingRating, bowlingRating, fieldingRating, strikeRate, economy, strengths[], weaknesses[]
- International coverage: India, Australia, England, SA, WI, NZ, Afghanistan, Sri Lanka, Bangladesh
- Players sorted by skillRating descending (95+ → 90+ → 85+ → ...)
- Pool options: 100 / 200 / 300 / FULL

### 2. Premium Auction UI (3-Column Layout)
- **Top bar**: Logo + progress + all 10 team budget chips (scrollable, live, color-coded)
- **Left panel**: Team list with squad counts, role breakdowns (BAT/BWL/AR/WK), budget bars
- **Center**: Enhanced player card + current bid display + live commentary feed
- **Right panel**: Circular SVG timer (green→yellow→red), large glowing BID button, increment buttons, Pass/Sell
- **Color-coded rating badges**: 95+ LEGEND (red), 90+ ELITE (orange), 85+ STAR (yellow), 80+ GREAT (green), 75+ GOOD (blue)
- **Strength/weakness tags** on every player card
- Footer: "Developed by Likith" on all pages

### 3. Live Commentary System
- Tracks all bid events in real-time on the frontend
- Shows: "RCB enters at ₹X Cr!", "YOU raise to ₹X Cr!", "SOLD! Player → Team for ₹X Cr!"
- Fades older entries, max 14 entries visible

### 4. Advanced AI System (4 Difficulty Levels)
- **Easy**: Weak, random, gives up early
- **Medium**: Balanced, role-aware
- **Hard**: Franchise-style priorities, squad composition analysis, rivalry-aware
- **Extreme**: Real IPL strategy — saves budget for elite players, actively outbids user, panic mode
- **Panic Mode**: When timer ≤ 2 and a strong player is up, AI makes desperate final bids
- **Rivalry System**: CSK vs MI, KKR vs SRH, etc. — rival teams outbid each other more aggressively
- **Need-based bidding**: Extreme mode prioritizes teams with highest squad role deficit

### 5. Fast Auction Timer
- Default: 5 seconds per player
- Resets to 3 seconds on each new bid
- "Going Once… Going Twice… SOLD!" countdown messages
- Sound effects: bid ping, sold fanfare, timer warnings (at 2s and 1s)
- 🔊/🔇 mute toggle in top bar

### 6. Career / Season Mode
- Multi-season system — simulate after auction finishes
- 45 round-robin IPL league matches with scorecards (runs, wickets, NRR)
- 4 playoffs: Qualifier 1 → Eliminator → Qualifier 2 → Final
- Full standings table: W/L/NRR/points
- Top run-scorer and wicket-taker per season (aggregated from squad stats + match fallbacks)
- Champion banner + Next Season flow
- Career API: `/api/career/state`, `/api/career/simulate`, `/api/career/next-season`, `/api/career/reset`

### 7. Loading Screen (2026 Splash)
- Animated cricket bat/ball icon with golden glow
- "IPL AUCTION SIMULATOR" + giant "2026" in gold-to-red gradient
- "Developed by Likith" credit
- Auto-dismisses after 3.2 seconds

### 8. User Setup Screen
- Select any of 10 official IPL teams
- Set budget: ₹50 Cr – ₹200 Cr
- Choose difficulty: EASY / MEDIUM / HARD / EXTREME
- Choose player pool: 100 / 200 / 300 / FULL
- FAST MODE default (5s timer)

### 9. Full Team Visibility
- Teams page: all 10 franchises with full squad lists, remaining budget, role breakdown
- Squad page: user's own squad with stats cards
- History page: full auction log (sold/unsold events)
- All Teams Dashboard accessible during auction

## Key Files

| File | Purpose |
|------|---------|
| `artifacts/ipl-auction/src/pages/Auction.tsx` | Main auction UI (3-column premium layout) |
| `artifacts/ipl-auction/src/pages/Home.tsx` | Setup screen with 2026 branding |
| `artifacts/ipl-auction/src/pages/Season.tsx` | Career/season results page |
| `artifacts/ipl-auction/src/components/LoadingScreen.tsx` | 2026 animated splash screen |
| `artifacts/api-server/src/data/players-seed.ts` | 252+ real players (7 tiers) |
| `artifacts/api-server/src/data/ai-bidder.ts` | AI logic (panic mode, rivalry, squad analysis) |
| `artifacts/api-server/src/data/match-engine.ts` | Season simulation (45 matches + 4 playoffs) |
| `artifacts/api-server/src/data/career-state.ts` | Career singleton state |
| `artifacts/api-server/src/routes/career.ts` | Career API endpoints |
| `artifacts/api-server/src/routes/auction.ts` | Auction engine (timer, bid, AI-bid, next) |

## User Preferences

- Never break existing features — only enhance and upgrade
- "Developed by Likith" must appear on all pages (footer + loading screen)
- Black glassmorphism (#0a0a0a) is the base theme
- FAST MODE is the default (5s timer)
