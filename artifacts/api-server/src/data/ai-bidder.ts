import type { Player } from "@workspace/db";
import type { AuctionState, TeamState, Difficulty } from "./auction-state.js";

// AI bidding logic — determines if and how much an AI team bids
// Difficulty affects: bid frequency, max bid multiplier, decision intelligence

interface BidDecision {
  shouldBid: boolean;
  amount: number;
}

// Role needs scoring — each team evaluates if they need this role
function roleNeedScore(team: TeamState): Record<string, number> {
  const counts = { Batsman: 0, Bowler: 0, "All-rounder": 0, Wicketkeeper: 0 };
  team.players.forEach((p) => {
    counts[p.role as keyof typeof counts]++;
  });

  const squadSize = team.players.length;

  // Target composition for a 25-player squad
  const targets = { Batsman: 7, Bowler: 7, "All-rounder": 6, Wicketkeeper: 2 };

  return {
    Batsman: Math.max(0, targets.Batsman - counts.Batsman),
    Bowler: Math.max(0, targets.Bowler - counts.Bowler),
    "All-rounder": Math.max(0, targets["All-rounder"] - counts["All-rounder"]),
    Wicketkeeper: Math.max(0, targets.Wicketkeeper - counts.Wicketkeeper),
    overall: Math.max(0, 15 - squadSize), // need more players overall
  };
}

// Bid increment based on difficulty
function bidIncrement(currentBid: number, difficulty: Difficulty): number {
  const base = currentBid * 0.05; // 5% increment
  const minIncrement = 0.1;

  switch (difficulty) {
    case "easy":
      return Math.max(minIncrement, base * 0.5);
    case "medium":
      return Math.max(minIncrement, base * 0.8);
    case "hard":
      return Math.max(minIncrement, base * 1.2);
  }
}

// Max bid multiplier over base price based on difficulty
function maxBidMultiplier(difficulty: Difficulty, skillRating: number): number {
  const skillBonus = (skillRating - 50) / 50; // 0 to 1 for ratings 50-100

  switch (difficulty) {
    case "easy":
      return 1.5 + skillBonus * 0.5; // 1.5x to 2x base price
    case "medium":
      return 2.0 + skillBonus * 1.0; // 2x to 3x base price
    case "hard":
      return 3.0 + skillBonus * 2.0; // 3x to 5x base price
  }
}

// Probability of bidding based on difficulty
function bidProbability(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy": return 0.25;   // 25% chance to bid each round
    case "medium": return 0.45; // 45% chance
    case "hard": return 0.70;   // 70% chance
  }
}

export function decideAiBid(
  team: TeamState,
  player: Player,
  currentBid: number,
  currentBidder: string | null,
  difficulty: Difficulty,
  userTeamId: string | null
): BidDecision {
  // Don't bid on your own bid
  if (currentBidder === team.id) {
    return { shouldBid: false, amount: currentBid };
  }

  // Don't bid if squad is full
  if (team.players.length >= team.maxSquadSize) {
    return { shouldBid: false, amount: currentBid };
  }

  // Check budget — need at least some budget left for future players
  const remainingPlayers = 1; // simplified check
  const minReserveBudget = 0.2 * remainingPlayers;
  if (team.budget - currentBid < minReserveBudget + 0.1) {
    return { shouldBid: false, amount: currentBid };
  }

  // Calculate max willing to pay for this player
  const maxMultiplier = maxBidMultiplier(difficulty, player.skillRating);
  const maxWillingToPay = Math.min(
    player.basePrice * maxMultiplier,
    team.budget * 0.6 // never spend more than 60% of budget on one player
  );

  // If current bid already exceeds max willing to pay, don't bid
  if (currentBid >= maxWillingToPay) {
    return { shouldBid: false, amount: currentBid };
  }

  // Role need affects bid eagerness
  const needs = roleNeedScore(team);
  const roleNeed = needs[player.role as keyof typeof needs] || 0;
  const needBonus = roleNeed > 0 ? 0.15 : -0.1;

  // Skill rating affects interest — higher rated players attract more bids
  const skillInterest = (player.skillRating - 50) / 100; // 0 to 0.5

  // Base probability modified by need and skill
  const prob = Math.min(0.95, bidProbability(difficulty) + needBonus + skillInterest);

  // Random check
  if (Math.random() > prob) {
    return { shouldBid: false, amount: currentBid };
  }

  // Calculate bid amount
  const increment = bidIncrement(currentBid, difficulty);
  const newBid = parseFloat((currentBid + increment).toFixed(2));

  // Final check: don't exceed max or budget
  if (newBid > maxWillingToPay || newBid > team.budget) {
    return { shouldBid: false, amount: currentBid };
  }

  return { shouldBid: true, amount: newBid };
}

// Run AI bidding for all non-user teams
export function runAiBidRound(state: AuctionState): { newBid: number; newBidder: string | null } {
  if (!state.currentPlayer || state.status !== "bidding") {
    return { newBid: state.currentBid, newBidder: state.currentBidder };
  }

  let currentBid = state.currentBid;
  let currentBidder = state.currentBidder;

  // Shuffle teams so bidding order is random each round
  const aiTeams = state.teams
    .filter((t) => t.id !== state.userTeamId)
    .sort(() => Math.random() - 0.5);

  for (const team of aiTeams) {
    const decision = decideAiBid(
      team,
      state.currentPlayer,
      currentBid,
      currentBidder,
      state.difficulty,
      state.userTeamId
    );

    if (decision.shouldBid) {
      currentBid = decision.amount;
      currentBidder = team.id;
    }
  }

  return { newBid: currentBid, newBidder: currentBidder };
}
