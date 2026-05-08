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
- **Top bar**: Logo + progress + all 10 team budget chips (scrollable, live, color-coded) + Stats nav link
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

### 6. 🏟️ Stadium System (NEW)
- 10 real IPL venues: Wankhede, Chinnaswamy, Chepauk, Eden Gardens, Kotla, Uppal, Mohali, SMS, NM Stadium, Ekana
- Each stadium: pitch type (Batting/Pace/Spin/Balanced), boundary size, capacity, dew factor
- Home team stadium used during league phase; neutral venues for playoffs
- Stadium highlights shown in Season analytics
- File: `artifacts/api-server/src/data/stadiums.ts`

### 7. 🌦️ Weather Engine (NEW)
- Conditions: Sunny, Cloudy, Humid, Overcast, Heavy Dew
- Weather modifiers: batting bonus/penalty, swing bonus, spin bonus, chasing advantage
- Heavy Dew gives chasing team +12 run advantage; Overcast boosts swing +25%
- Injury risk varies by conditions
- Weather shown on every match card in Season page

### 8. 🧬 Player Growth System (NEW)
- Age-based progression applied after each season via `/api/career/next-season`
- Under 22: +1 to +3 rating growth; 23–27: ±1-2 form fluctuation; 28–32: slight decline; 33+: faster decline
- Growth events logged and shown in career state
- File: `artifacts/api-server/src/routes/career.ts`

### 9. 🏆 Records & Hall of Fame (NEW)
- Multi-season records tracked: Orange Cap, Purple Cap, Most Sixes, Best Bowling, Man of Series, Champions
- `/api/career/records` returns full history across all seasons
- Records tab in Analytics dashboard shows all-time leaders
- File: `artifacts/api-server/src/data/career-state.ts`

### 10. 🌟 Youth Academy (NEW)
- 6 prospects generated after each season with: name, age (17–22), role, nationality, potential, current rating, trait
- Potential ceiling 72–94; current rating 55–80% of potential
- `/api/career/youth` returns current prospects
- Youth tab in Analytics dashboard shows all prospects with potential bars
- File: `artifacts/api-server/src/data/career-state.ts`

### 11. 💰 Finance System (NEW)
- Champion earns ₹50Cr prize; playoff teams ₹20–30Cr; others ₹10Cr
- Sponsor income scales with standings points
- Operating expenses (salaries, staff) deducted
- Multi-season profit/loss tracking via `/api/career/finance`
- Finance tab in Analytics dashboard

### 12. 🤝 Team Chemistry System (NEW)
- Calculated from national grouping ratios and star player counts
- Chemistry bonus: +3% performance for 75+ chemistry, +1% for 60+
- Chemistry rankings shown in Season Awards tab
- All 10 teams ranked in Season page

### 13. 🎙️ Dynamic Commentary Engine (NEW)
- 6-7 lines of commentary per match: venue, pitch report, batting highlight, bowling highlight, crowd, situation, weather note
- Commentary shows on match cards in Season page (click to expand)
- Commentary highlights shown in Season "Venues" tab
- Templates: 10 batting lines, 9 bowling lines, 7 crowd lines, 8 situation lines

### 14. 🏥 Injury System (NEW)
- Random injury events during matches (risk varies by weather)
- Injury types: hamstring, knee, shoulder, back, side strain, ankle, calf
- Injury report shown in Season "Venues" tab
- Dew/sunny conditions = lowest risk; Humid = higher risk

### 15. 📊 Analytics Dashboard (NEW)
- New `/analytics` page with 4 tabs: Auction, Records, Youth, Finance
- **Auction tab**: team avg rating ranking, spend by role, best value picks, biggest bids
- **Records tab**: Hall of Fame, Orange/Purple Cap history, Most Sixes, Champion history
- **Youth tab**: all 6 prospects with potential bars and growth ceiling labels
- **Finance tab**: season-by-season income/expenses with net profit
- File: `artifacts/ipl-auction/src/pages/Analytics.tsx`

### 16. 🕹️ Game Modes (NEW)
- **Standard Auction**: Pick your team, set budget, bid against AI
- **AI Watch Mode**: All 10 teams are AI — observe the full auction
- **Challenge Mode**: 3 variants — Low Budget (₹60Cr), Youth Focus (₹80Cr), Underdog (₹70Cr + Extreme AI)
- Mode selector on Home screen

### 17. 💾 Save System (NEW)
- 3 localStorage save slots on Home screen
- Save stores: team choice, budget, difficulty, player pool, timestamp
- Load any saved config instantly; overwrite slots freely
- Persist your favorite setup across browser sessions

### 18. Career / Season Mode (Enhanced)
- 5 tabs: Standings, Playoffs, Matches, Awards, Venues
- **Awards tab**: Orange Cap, Purple Cap, Six Machine, MoTS, Best Bowling, Chemistry Rankings
- **Venues tab**: Stadium highlights, injury report, match commentary samples
- Match cards show venue name + weather condition
- Navigate to Analytics from Season page directly

### 19. Loading Screen (2026 Splash)
- Animated cricket bat/ball icon with golden glow
- "IPL AUCTION SIMULATOR" + giant "2026" in gold-to-red gradient
- "Developed by Likith" credit
- Auto-dismisses after 3.2 seconds

## New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/career/records` | GET | Multi-season hall of fame records |
| `/api/career/youth` | GET | Youth academy prospects |
| `/api/career/finance` | GET | Season-by-season franchise finances |
| `/api/career/next-season` | POST | Advance season + apply player growth + generate youth |

## Key Files

| File | Purpose |
|------|---------|
| `artifacts/ipl-auction/src/pages/Auction.tsx` | Main auction UI (3-column premium layout) |
| `artifacts/ipl-auction/src/pages/Home.tsx` | Setup screen — game modes, save/load, AI watch |
| `artifacts/ipl-auction/src/pages/Season.tsx` | Career/season results — 5 tabs including Awards + Venues |
| `artifacts/ipl-auction/src/pages/Analytics.tsx` | Analytics dashboard — 4 tabs |
| `artifacts/ipl-auction/src/components/LoadingScreen.tsx` | 2026 animated splash screen |
| `artifacts/api-server/src/data/stadiums.ts` | 10 IPL stadiums + weather system |
| `artifacts/api-server/src/data/players-seed.ts` | 252+ real players (7 tiers) |
| `artifacts/api-server/src/data/ai-bidder.ts` | AI logic (panic mode, rivalry, squad analysis) |
| `artifacts/api-server/src/data/match-engine.ts` | Season simulation + stadiums + weather + chemistry + commentary |
| `artifacts/api-server/src/data/match-engine.ts` | Season simulation (45 matches + 4 playoffs) |
| `artifacts/api-server/src/data/career-state.ts` | Career singleton: records, youth, finance, growth |
| `artifacts/api-server/src/routes/career.ts` | Career API endpoints (all 6) |
| `artifacts/api-server/src/routes/auction.ts` | Auction engine + Watch Mode support |

## User Preferences

- Never break existing features — only enhance and upgrade
- "Developed by Likith" must appear on all pages (footer + loading screen)
- Black glassmorphism (#0a0a0a) is the base theme
- FAST MODE is the default (5s timer)
