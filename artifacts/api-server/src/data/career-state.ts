// ─── Career / Season State ────────────────────────────────────────────────────
// Extended singleton: multi-season records, youth academy, finance, player growth

import type { SeasonResult } from "./match-engine.js";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeasonHistoryEntry {
  season: number;
  champion: string;
  championColor: string;
  orangeCap: { name: string; runs: number; team: string };
  purpleCap: { name: string; wickets: number; team: string };
  mostSixes: { name: string; sixes: number; team: string };
  bestBowling: { name: string; figures: string; economy: number; team: string };
  manOfTheSeries: { name: string; team: string; contribution: string };
  userTeamRank: number;
  userTeamPoints: number;
}

export type PlayerRole = "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";

export interface YouthPlayer {
  id: string;
  name: string;
  age: number;
  role: PlayerRole;
  nationality: string;
  potential: number;    // 0–100 ceiling rating
  currentRating: number;
  trait: string;        // flavour description
  season: number;       // when generated
}

export interface PlayerGrowthEvent {
  playerName: string;
  team: string;
  change: number;       // rating delta (+/-)
  reason: string;
}

export interface FinanceEntry {
  season: number;
  prizeMoneyEarned: number;  // from standings finish
  sponsorIncome: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface CareerState {
  seasonNumber: number;
  simulated: boolean;
  result: SeasonResult | null;
  history: SeasonHistoryEntry[];
  youthPlayers: YouthPlayer[];
  growthLog: PlayerGrowthEvent[];
  finance: FinanceEntry[];
  totalChampionships: number;
  userTeamId: string | null;
}

// ─── Youth Player Generation ──────────────────────────────────────────────────
const YOUTH_NAMES = [
  "Aryan Kapoor", "Dev Sharma", "Rohan Nair", "Karan Mehta", "Aditya Singh",
  "Yash Patel", "Vivaan Joshi", "Siddharth Rao", "Rahul Bose", "Nikhil Verma",
  "Sam Anderson", "Jake Morrison", "Liam Fraser", "Tom Hayes", "Ben Murray",
  "Carlos Rivera", "Marco Silva", "Luca Ferrari", "Andile Mthembu", "Kyle Jacobs",
  "Raza Khan", "Bilal Ahmad", "Hamza Sheikh", "Rashid Yousuf", "Zain Abbas",
  "Tariq Hassan", "Asif Mahmood", "Faizan Ali", "Shoaib Durrani", "Imran Tahir Jr.",
];

const YOUTH_TRAITS = {
  Batsman: [
    "Explosive T20 opener", "Classical technique, high ceiling",
    "Aggressive middle-order finisher", "Gifted stroke-maker with timing",
    "Power hitter with massive six-hitting potential",
  ],
  Bowler: [
    "Express pace, needs control", "Crafty spinner with variations",
    "Seam movement specialist", "Death-over yorker expert",
    "Left-arm unorthodox — hard to read",
  ],
  "All-rounder": [
    "Pinch-hitting all-rounder", "Bowling all-rounder who can bat",
    "Captaincy material — reads the game well",
    "Versatile player who fills any gap",
  ],
  Wicketkeeper: [
    "Lightning-quick behind the stumps", "Keeper-batsman with explosive intent",
    "Sharp stumping, calm under pressure",
  ],
};

const NATIONALITIES = [
  "India", "India", "India", "India", "India", // heavier India weighting
  "Australia", "England", "South Africa", "West Indies", "New Zealand",
  "Afghanistan", "Sri Lanka", "Bangladesh", "Pakistan",
];

const ROLES: PlayerRole[] = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

let usedYouthNames = new Set<string>();

function pickYouthName(): string {
  const available = YOUTH_NAMES.filter(n => !usedYouthNames.has(n));
  if (!available.length) usedYouthNames.clear();
  const name = available[Math.floor(Math.random() * available.length)];
  usedYouthNames.add(name);
  return name;
}

export function generateYouthPlayers(season: number, count = 6): YouthPlayer[] {
  const players: YouthPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const role = ROLES[Math.floor(Math.random() * ROLES.length)];
    const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
    const potential = 72 + Math.floor(Math.random() * 23); // 72–94
    const currentRating = Math.floor(potential * (0.55 + Math.random() * 0.25)); // 55–80% of potential
    const age = 17 + Math.floor(Math.random() * 6); // 17–22
    const traitList = YOUTH_TRAITS[role];
    const trait = traitList[Math.floor(Math.random() * traitList.length)];

    players.push({
      id: `youth_s${season}_${i}`,
      name: pickYouthName(),
      age,
      role,
      nationality,
      potential,
      currentRating,
      trait,
      season,
    });
  }
  return players;
}

// ─── Finance Calculator ────────────────────────────────────────────────────────
export function calculateFinance(
  season: number,
  userTeamRank: number,
  seasonPoints: number
): FinanceEntry {
  // Prize money based on finish
  const prizeTable: Record<number, number> = { 1: 50, 2: 30, 3: 20, 4: 15 };
  const prizeMoneyEarned = prizeTable[userTeamRank] ?? 10; // ₹Cr

  // Sponsor income scales with points (better season = more eyeballs)
  const sponsorIncome = Math.floor(20 + seasonPoints * 0.8 + Math.random() * 15);

  const totalIncome = prizeMoneyEarned + sponsorIncome;

  // Expenses: base operating costs
  const salaryExpenses = 25 + Math.floor(Math.random() * 15);
  const staffExpenses = 5 + Math.floor(Math.random() * 8);
  const totalExpenses = salaryExpenses + staffExpenses;

  return {
    season,
    prizeMoneyEarned,
    sponsorIncome,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
  };
}

// ─── Singleton State ──────────────────────────────────────────────────────────
let careerState: CareerState = {
  seasonNumber: 1,
  simulated: false,
  result: null,
  history: [],
  youthPlayers: [],
  growthLog: [],
  finance: [],
  totalChampionships: 0,
  userTeamId: null,
};

// ─── Accessors ────────────────────────────────────────────────────────────────
export function getCareerState(): CareerState {
  return careerState;
}

export function setCareerResult(result: SeasonResult, userTeamId?: string): void {
  careerState = {
    ...careerState,
    simulated: true,
    result,
    userTeamId: userTeamId ?? careerState.userTeamId,
  };
}

export function archiveSeasonToHistory(
  result: SeasonResult,
  userTeamId: string | null,
  standings: Array<{ teamId: string; shortName: string; points: number }>
): void {
  const userStanding = standings.find(s => s.teamId === userTeamId);
  const userRank = userStanding ? standings.indexOf(userStanding) + 1 : 10;
  const userPoints = userStanding?.points ?? 0;

  const entry: SeasonHistoryEntry = {
    season: careerState.seasonNumber,
    champion: result.champion,
    championColor: result.championColor,
    orangeCap: result.topRunScorer,
    purpleCap: result.topWicketTaker,
    mostSixes: result.mostSixes,
    bestBowling: result.bestBowling,
    manOfTheSeries: result.manOfTheSeries,
    userTeamRank: userRank,
    userTeamPoints: userPoints,
  };

  const newHistory = [...careerState.history, entry];
  const isChampion = result.champion === standings.find(s => s.teamId === userTeamId)?.shortName;
  const championships = isChampion ? careerState.totalChampionships + 1 : careerState.totalChampionships;

  const financeEntry = calculateFinance(careerState.seasonNumber, userRank, userPoints);
  const newYouth = generateYouthPlayers(careerState.seasonNumber + 1, 6);

  careerState = {
    ...careerState,
    history: newHistory,
    youthPlayers: newYouth,
    finance: [...careerState.finance, financeEntry],
    totalChampionships: championships,
  };
}

export function recordPlayerGrowth(events: PlayerGrowthEvent[]): void {
  careerState = {
    ...careerState,
    growthLog: [...careerState.growthLog, ...events].slice(-50), // keep last 50
  };
}

export function advanceSeason(): void {
  careerState = {
    ...careerState,
    seasonNumber: careerState.seasonNumber + 1,
    simulated: false,
    result: null,
  };
}

export function resetCareerState(): void {
  usedYouthNames.clear();
  careerState = {
    seasonNumber: 1,
    simulated: false,
    result: null,
    history: [],
    youthPlayers: [],
    growthLog: [],
    finance: [],
    totalChampionships: 0,
    userTeamId: null,
  };
}
