import type { Player } from "@workspace/db";
import { IPL_TEAMS } from "./teams.js";

// In-memory auction state (single-server approach)
export interface TeamState {
  id: string;
  name: string;
  shortName: string;
  color: string;
  budget: number;
  initialBudget: number;
  players: Player[];
  maxSquadSize: number;
}

export interface AuctionHistoryEntry {
  id: number;
  playerId: number;
  playerName: string;
  playerRole: string;
  teamId: string | null;
  teamName: string | null;
  finalPrice: number;
  status: "sold" | "unsold";
  timestamp: string;
}

export type AuctionStatus = "idle" | "bidding" | "sold" | "unsold" | "finished";
export type Difficulty = "easy" | "medium" | "hard";

export interface AuctionState {
  started: boolean;
  players: Player[]; // all players in auction order
  playerIndex: number;
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: string | null;
  timer: number;
  teams: TeamState[];
  soldAnimation: boolean;
  status: AuctionStatus;
  difficulty: Difficulty;
  userTeamId: string | null;
  history: AuctionHistoryEntry[];
  historyIdCounter: number;
  timerInterval: ReturnType<typeof setInterval> | null;
}

// Singleton auction state
let auctionState: AuctionState = createInitialState();

function createInitialState(): AuctionState {
  return {
    started: false,
    players: [],
    playerIndex: 0,
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    timer: 15,
    teams: IPL_TEAMS.map((t) => ({
      ...t,
      budget: 100,
      initialBudget: 100,
      players: [],
    })),
    soldAnimation: false,
    status: "idle",
    difficulty: "medium",
    userTeamId: null,
    history: [],
    historyIdCounter: 1,
    timerInterval: null,
  };
}

export function getAuctionState(): AuctionState {
  return auctionState;
}

export function setAuctionState(updates: Partial<AuctionState>): void {
  auctionState = { ...auctionState, ...updates };
}

export function resetAuctionState(): void {
  // Clear any running timer
  if (auctionState.timerInterval) {
    clearInterval(auctionState.timerInterval);
  }
  auctionState = createInitialState();
}

// Build the public-facing auction state response (strips internal fields)
export function buildPublicState() {
  const state = auctionState;
  return {
    started: state.started,
    currentPlayer: state.currentPlayer,
    currentBid: state.currentBid,
    currentBidder: state.currentBidder,
    timer: state.timer,
    teams: state.teams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      color: t.color,
      budget: t.budget,
      initialBudget: t.initialBudget,
      players: t.players,
      maxSquadSize: t.maxSquadSize,
    })),
    soldAnimation: state.soldAnimation,
    status: state.status,
    difficulty: state.difficulty,
    userTeamId: state.userTeamId,
    playerIndex: state.playerIndex,
    totalPlayers: state.players.length,
  };
}
