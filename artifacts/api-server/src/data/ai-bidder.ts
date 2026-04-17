import type { Player } from "@workspace/db";
import type { AuctionState, TeamState, Difficulty } from "./auction-state.js";

// AI bidding logic — realistic franchise-style bidding
// Difficulty levels: easy, medium, hard, extreme

interface BidDecision {
  shouldBid: boolean;
  amount: number;
}

// IPL franchise-style role priorities (which roles each team archetype values most)
// Gives each AI team a unique bidding personality
const TEAM_PRIORITIES: Record<string, { primary: string; secondary: string; budget_reserve: number }> = {
  CSK:  { primary: "All-rounder", secondary: "Bowler",      budget_reserve: 0.20 },
  MI:   { primary: "Bowler",      secondary: "Batsman",      budget_reserve: 0.22 },
  RCB:  { primary: "Batsman",     secondary: "All-rounder",  budget_reserve: 0.15 },
  KKR:  { primary: "All-rounder", secondary: "Batsman",      budget_reserve: 0.18 },
  DC:   { primary: "Bowler",      secondary: "Batsman",      budget_reserve: 0.20 },
  SRH:  { primary: "Batsman",     secondary: "Bowler",       budget_reserve: 0.18 },
  PBKS: { primary: "Batsman",     secondary: "Bowler",       budget_reserve: 0.15 },
  RR:   { primary: "All-rounder", secondary: "Wicketkeeper", budget_reserve: 0.20 },
  GT:   { primary: "Bowler",      secondary: "All-rounder",  budget_reserve: 0.22 },
  LSG:  { primary: "Batsman",     secondary: "Bowler",       budget_reserve: 0.18 },
};

// Role need scoring — each team evaluates if they need this role
function roleNeedScore(team: TeamState): Record<string, number> {
  const counts = { Batsman: 0, Bowler: 0, "All-rounder": 0, Wicketkeeper: 0 };
  team.players.forEach((p) => {
    counts[p.role as keyof typeof counts]++;
  });

  const squadSize = team.players.length;

  // Realistic IPL squad targets
  const targets = { Batsman: 7, Bowler: 7, "All-rounder": 6, Wicketkeeper: 2 };

  return {
    Batsman:        Math.max(0, targets.Batsman        - counts.Batsman),
    Bowler:         Math.max(0, targets.Bowler         - counts.Bowler),
    "All-rounder":  Math.max(0, targets["All-rounder"] - counts["All-rounder"]),
    Wicketkeeper:   Math.max(0, targets.Wicketkeeper   - counts.Wicketkeeper),
    overall:        Math.max(0, 15 - squadSize),
  };
}

// Check if team is at the maximum for a given role (prevents overbidding unwanted roles)
function roleOverflow(team: TeamState, role: string): boolean {
  const counts = { Batsman: 0, Bowler: 0, "All-rounder": 0, Wicketkeeper: 0 };
  team.players.forEach((p) => {
    counts[p.role as keyof typeof counts]++;
  });

  const caps = { Batsman: 9, Bowler: 9, "All-rounder": 8, Wicketkeeper: 3 };
  return (counts[role as keyof typeof counts] ?? 0) >= (caps[role as keyof typeof caps] ?? 99);
}

// Bid increment based on difficulty
function bidIncrement(currentBid: number, difficulty: Difficulty): number {
  const base = currentBid * 0.05;
  const minIncrement = 0.1;

  switch (difficulty) {
    case "easy":    return Math.max(minIncrement, base * 0.4);
    case "medium":  return Math.max(minIncrement, base * 0.75);
    case "hard":    return Math.max(minIncrement, base * 1.1);
    case "extreme": return Math.max(minIncrement, base * 1.3);
  }
}

// Max bid multiplier — how much over base price AI is willing to go
function maxBidMultiplier(difficulty: Difficulty, skillRating: number): number {
  const skillBonus = (skillRating - 50) / 50; // 0 to 1

  switch (difficulty) {
    case "easy":    return 1.4 + skillBonus * 0.4;  // 1.4x - 1.8x
    case "medium":  return 1.8 + skillBonus * 1.0;  // 1.8x - 2.8x
    case "hard":    return 2.5 + skillBonus * 1.8;  // 2.5x - 4.3x
    case "extreme": return 3.5 + skillBonus * 2.5;  // 3.5x - 6.0x
  }
}

// Base bid probability
function baseBidProbability(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy":    return 0.22;
    case "medium":  return 0.42;
    case "hard":    return 0.65;
    case "extreme": return 0.82;
  }
}

// EXTREME mode: budget save factor — how much the team reserves for marquee players
function extremeBudgetReserve(team: TeamState, player: Player): number {
  const prio = TEAM_PRIORITIES[team.id];
  if (!prio) return 0.25;

  // If this is a high-rated player that matches the team's priority role, spend more
  if (player.role === prio.primary && player.skillRating >= 90) {
    return 0.10; // willing to spend 90% of remaining budget on marquee
  }
  if (player.role === prio.secondary && player.skillRating >= 88) {
    return 0.15;
  }
  return prio.budget_reserve;
}

// EXTREME mode: calculate if AI should save budget for upcoming top players
function shouldSaveBudget(state: AuctionState, team: TeamState, player: Player): boolean {
  if (state.difficulty !== "extreme") return false;

  // Count how many high-value players remain
  const remaining = state.players.slice(state.playerIndex + 1);
  const upcomingElite = remaining.filter(p => p.skillRating >= 92).length;

  // If 3+ elite players remain and budget is tight, save
  if (upcomingElite >= 3 && team.budget < 30) return true;

  // If team already has a good squad, be more conservative
  const avgTeamRating = team.players.length > 0
    ? team.players.reduce((s, p) => s + p.skillRating, 0) / team.players.length
    : 0;

  // Conserve budget if squad is already decent and player is average
  if (avgTeamRating >= 82 && player.skillRating < 80) return true;

  return false;
}

// EXTREME mode: deliberately outbid user to compete
function extremeUserCompete(
  team: TeamState,
  player: Player,
  currentBid: number,
  currentBidder: string | null,
  userTeamId: string | null,
): boolean {
  if (!userTeamId || currentBidder !== userTeamId) return false;
  if (player.skillRating < 85) return false; // only compete for quality players

  const prio = TEAM_PRIORITIES[team.id];
  if (!prio) return false;

  // Compete if this is a priority role
  const isPriorityRole = player.role === prio.primary || player.role === prio.secondary;
  if (!isPriorityRole) return false;

  // 60% chance to counter-bid when user is leading on a target player
  return Math.random() < 0.6;
}

export function decideAiBid(
  team: TeamState,
  player: Player,
  currentBid: number,
  currentBidder: string | null,
  difficulty: Difficulty,
  userTeamId: string | null,
  state: AuctionState,
): BidDecision {
  const noBid = { shouldBid: false, amount: currentBid };

  // Don't bid on your own bid
  if (currentBidder === team.id) return noBid;

  // Don't bid if squad is full
  if (team.players.length >= team.maxSquadSize) return noBid;

  // Don't bid if role is already maxed out (extreme/hard mode awareness)
  if (difficulty !== "easy" && roleOverflow(team, player.role)) return noBid;

  // Budget reserve — keep some back for future players
  const reserveFactor = difficulty === "extreme"
    ? extremeBudgetReserve(team, player)
    : (difficulty === "hard" ? 0.20 : 0.25);

  const minReserve = team.budget * reserveFactor;
  if (team.budget - currentBid < minReserve + 0.1) return noBid;

  // EXTREME: check if should save budget for upcoming elite players
  if (shouldSaveBudget(state, team, player)) return noBid;

  // Calculate max willing to pay
  const maxMultiplier = maxBidMultiplier(difficulty, player.skillRating);
  const maxWillingToPay = Math.min(
    player.basePrice * maxMultiplier,
    team.budget * (difficulty === "extreme" ? 0.70 : 0.55)
  );

  if (currentBid >= maxWillingToPay) return noBid;

  // Role need scoring
  const needs = roleNeedScore(team);
  const roleNeed = needs[player.role as keyof typeof needs] || 0;
  const needBonus = roleNeed > 2 ? 0.20 : roleNeed > 0 ? 0.10 : -0.12;

  // Priority role bonus for hard/extreme
  let priorityBonus = 0;
  if (difficulty === "hard" || difficulty === "extreme") {
    const prio = TEAM_PRIORITIES[team.id];
    if (prio) {
      if (player.role === prio.primary) priorityBonus = 0.15;
      else if (player.role === prio.secondary) priorityBonus = 0.08;
    }
  }

  // Skill interest
  const skillInterest = (player.skillRating - 50) / 100; // 0 to 0.5

  // EXTREME mode: if user is leading, force compete
  const forceCompete = difficulty === "extreme"
    && extremeUserCompete(team, player, currentBid, currentBidder, userTeamId);

  const prob = forceCompete
    ? 0.90
    : Math.min(0.95, baseBidProbability(difficulty) + needBonus + skillInterest + priorityBonus);

  if (!forceCompete && Math.random() > prob) return noBid;

  // Calculate bid amount
  const increment = bidIncrement(currentBid, difficulty);
  const newBid = parseFloat((currentBid + increment).toFixed(2));

  if (newBid > maxWillingToPay || newBid > team.budget) return noBid;

  return { shouldBid: true, amount: newBid };
}

// PANIC MODE: when timer is very low, desperate teams may make a final push
function panicBid(
  team: TeamState,
  player: Player,
  currentBid: number,
  currentBidder: string | null,
  difficulty: Difficulty,
): BidDecision {
  const noBid = { shouldBid: false, amount: currentBid };

  if (currentBidder === team.id) return noBid;
  if (team.players.length >= team.maxSquadSize) return noBid;
  if (team.budget < currentBid + 0.1) return noBid;

  // Only panic for players worth competing for
  if (player.skillRating < 80) return noBid;

  const prio = TEAM_PRIORITIES[team.id];
  if (!prio) return noBid;

  const isPriority = player.role === prio.primary || player.role === prio.secondary;
  if (!isPriority) return noBid;

  // Panic probability: higher for better players and harder difficulty
  const panicChance =
    difficulty === "extreme" ? 0.75
    : difficulty === "hard"   ? 0.55
    : difficulty === "medium" ? 0.35
    : 0.15;

  if (Math.random() > panicChance) return noBid;

  const increment = bidIncrement(currentBid, difficulty) * 1.5; // slightly bigger panic bid
  const panicBidAmount = parseFloat((currentBid + increment).toFixed(2));

  const maxBudgetSpend = team.budget * (difficulty === "extreme" ? 0.65 : 0.50);
  if (panicBidAmount > maxBudgetSpend) return noBid;

  return { shouldBid: true, amount: panicBidAmount };
}

// RIVALRY SYSTEM: certain team pairs compete more aggressively against each other
const RIVALRIES: Record<string, string[]> = {
  CSK: ["MI", "KKR"],
  MI:  ["CSK", "RCB"],
  RCB: ["MI", "CSK"],
  KKR: ["CSK", "SRH"],
  DC:  ["RCB", "LSG"],
  SRH: ["KKR", "RR"],
  PBKS: ["GT", "RR"],
  RR:  ["SRH", "PBKS"],
  GT:  ["MI", "PBKS"],
  LSG: ["DC", "RR"],
};

function rivalryBonus(teamId: string, currentBidder: string | null, difficulty: Difficulty): number {
  if (difficulty === "easy" || difficulty === "medium") return 0;
  if (!currentBidder || currentBidder === teamId) return 0;
  const rivals = RIVALRIES[teamId] ?? [];
  return rivals.includes(currentBidder) ? (difficulty === "extreme" ? 0.20 : 0.10) : 0;
}

// Run AI bidding for all non-user teams
export function runAiBidRound(
  state: AuctionState,
  isPanicMode = false,
): { newBid: number; newBidder: string | null } {
  if (!state.currentPlayer || state.status !== "bidding") {
    return { newBid: state.currentBid, newBidder: state.currentBidder };
  }

  let currentBid = state.currentBid;
  let currentBidder = state.currentBidder;

  // Shuffle teams — extreme mode: slightly prioritize teams with high need
  let aiTeams = state.teams
    .filter((t) => t.id !== state.userTeamId)
    .sort(() => Math.random() - 0.5);

  if (state.difficulty === "extreme") {
    aiTeams = aiTeams.sort((a, b) => {
      const needA = roleNeedScore(a)[state.currentPlayer!.role as keyof ReturnType<typeof roleNeedScore>] || 0;
      const needB = roleNeedScore(b)[state.currentPlayer!.role as keyof ReturnType<typeof roleNeedScore>] || 0;
      return needB - needA;
    });
  }

  for (const team of aiTeams) {
    // In panic mode (timer ≤ 2) — try panic bid first
    if (isPanicMode) {
      const panic = panicBid(team, state.currentPlayer, currentBid, currentBidder, state.difficulty);
      if (panic.shouldBid) {
        currentBid = panic.amount;
        currentBidder = team.id;
        continue;
      }
    }

    // Normal bid decision with rivalry modifier
    const rivalBonus = rivalryBonus(team.id, currentBidder, state.difficulty);
    const decision = decideAiBid(
      team,
      state.currentPlayer,
      currentBid,
      currentBidder,
      state.difficulty,
      state.userTeamId,
      state,
    );

    if (!decision.shouldBid && rivalBonus > 0) {
      // Rivalry boost: re-roll with slightly higher probability
      const rollAgain = Math.random() < rivalBonus;
      if (rollAgain) {
        const inc = bidIncrement(currentBid, state.difficulty);
        const rivalBid = parseFloat((currentBid + inc).toFixed(2));
        const maxWilling = team.budget * 0.55;
        if (rivalBid <= maxWilling && rivalBid > currentBid) {
          currentBid = rivalBid;
          currentBidder = team.id;
        }
      }
    } else if (decision.shouldBid) {
      currentBid = decision.amount;
      currentBidder = team.id;
    }
  }

  return { newBid: currentBid, newBidder: currentBidder };
}
