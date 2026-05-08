import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import {
  getAuctionState,
  setAuctionState,
  resetAuctionState,
  buildPublicState,
} from "../data/auction-state.js";
import { runAiBidRound } from "../data/ai-bidder.js";
import { buildAllPlayers, slicePlayers } from "../data/players-seed.js";
import { IPL_TEAMS } from "../data/teams.js";
import {
  StartAuctionBody,
  PlaceBidBody,
} from "@workspace/api-zod";
import type { AuctionHistoryEntry } from "../data/auction-state.js";

const router = Router();

// Default timer values
const TIMER_DEFAULT = 5;  // seconds at auction start
const TIMER_ON_BID = 3;   // seconds reset when a new bid is placed

// GET /api/auction/state
router.get("/state", (req, res) => {
  res.json(buildPublicState());
});

// POST /api/auction/start
router.post("/start", async (req, res) => {
  try {
    const body = StartAuctionBody.parse(req.body);
    const { userTeamId, budget, difficulty, playerCount } = body as any;

    // WATCH_MODE: all 10 teams are AI, no user team
    const isWatchMode = userTeamId === "WATCH_MODE";
    const teamConfig = isWatchMode ? IPL_TEAMS[0] : IPL_TEAMS.find((t) => t.id === userTeamId);
    if (!isWatchMode && !teamConfig) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    resetAuctionState();

    // Build ordered player list (sorted by skillRating desc)
    const allSeed = buildAllPlayers(); // already sorted
    const count: number | "full" = playerCount && playerCount > 0 ? playerCount : "full";
    const seedData = slicePlayers(allSeed, count);

    // Always re-seed on start for fresh data with new stats
    await db.delete(playersTable);

    const batchSize = 100;
    for (let i = 0; i < seedData.length; i += batchSize) {
      const batch = seedData.slice(i, i + batchSize);
      await db.insert(playersTable).values(
        batch.map((p) => ({
          name: p.name,
          role: p.role,
          basePrice: p.basePrice,
          skillRating: p.skillRating,
          nationality: p.nationality,
          sold: false,
          soldTo: null,
          soldPrice: null,
          battingRating: p.battingRating,
          bowlingRating: p.bowlingRating,
          fieldingRating: p.fieldingRating,
          age: p.age,
          experience: p.experience,
          form: p.form,
          strikeRate: p.strikeRate,
          economy: p.economy,
          strengths: p.strengths,
          weaknesses: p.weaknesses,
        }))
      );
    }

    const players = await db.select().from(playersTable);

    // Players are already ordered by skillRating from seed, preserve that order
    const sortedPlayers = [...players].sort((a, b) => b.skillRating - a.skillRating);

    const teams = IPL_TEAMS.map((t) => ({
      ...t,
      budget: t.id === userTeamId ? budget : 100,
      initialBudget: t.id === userTeamId ? budget : 100,
      players: [],
    }));

    const firstPlayer = sortedPlayers[0] || null;
    setAuctionState({
      started: true,
      players: sortedPlayers,
      playerIndex: 0,
      currentPlayer: firstPlayer,
      currentBid: firstPlayer ? firstPlayer.basePrice : 0,
      currentBidder: null,
      timer: TIMER_DEFAULT,
      teams,
      soldAnimation: false,
      status: firstPlayer ? "bidding" : "finished",
      difficulty: difficulty as any,
      userTeamId,
      history: [],
      historyIdCounter: 1,
      timerInterval: null,
      playerCount: count,
    });

    res.json(buildPublicState());
  } catch (err) {
    req.log.error(err, "Failed to start auction");
    res.status(400).json({ error: String(err) });
  }
});

// POST /api/auction/bid
router.post("/bid", (req, res) => {
  try {
    const body = PlaceBidBody.parse(req.body);
    const { teamId, amount } = body;
    const state = getAuctionState();

    if (!state.started || !state.currentPlayer || state.status !== "bidding") {
      return res.status(400).json({ error: "Auction not active" });
    }

    if (amount <= state.currentBid) {
      return res.status(400).json({ error: "Bid must be higher than current bid" });
    }

    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return res.status(400).json({ error: "Invalid team" });
    if (amount > team.budget) return res.status(400).json({ error: "Insufficient budget" });
    if (team.players.length >= team.maxSquadSize) return res.status(400).json({ error: "Squad is full" });

    setAuctionState({
      currentBid: parseFloat(amount.toFixed(2)),
      currentBidder: teamId,
      timer: TIMER_ON_BID, // reset to 3s on new bid
    });

    res.json(buildPublicState());
  } catch (err) {
    req.log.error(err, "Failed to place bid");
    res.status(400).json({ error: String(err) });
  }
});

// POST /api/auction/next — advance to next player
router.post("/next", async (req, res) => {
  try {
    const state = getAuctionState();

    if (!state.started) {
      return res.status(400).json({ error: "Auction not started" });
    }

    if (state.currentPlayer) {
      const sold = state.currentBidder !== null;

      if (sold) {
        await db.update(playersTable)
          .set({ sold: true, soldTo: state.currentBidder, soldPrice: state.currentBid })
          .where((row: any) => row.id === state.currentPlayer!.id);

        const updatedTeams = state.teams.map((t) => {
          if (t.id === state.currentBidder) {
            return {
              ...t,
              budget: parseFloat((t.budget - state.currentBid).toFixed(2)),
              players: [...t.players, { ...state.currentPlayer!, sold: true, soldTo: state.currentBidder, soldPrice: state.currentBid }],
            };
          }
          return t;
        });

        const soldTeam = state.teams.find((t) => t.id === state.currentBidder);
        const historyEntry: AuctionHistoryEntry = {
          id: state.historyIdCounter,
          playerId: state.currentPlayer.id,
          playerName: state.currentPlayer.name,
          playerRole: state.currentPlayer.role,
          teamId: state.currentBidder,
          teamName: soldTeam?.name || null,
          finalPrice: state.currentBid,
          status: "sold",
          timestamp: new Date().toISOString(),
        };

        setAuctionState({
          teams: updatedTeams,
          history: [...state.history, historyEntry],
          historyIdCounter: state.historyIdCounter + 1,
          soldAnimation: true,
          status: "sold",
        });

        setTimeout(() => {
          const s = getAuctionState();
          setAuctionState({ soldAnimation: false });
          advanceToNextPlayer(s.playerIndex);
        }, 2500);
      } else {
        const historyEntry: AuctionHistoryEntry = {
          id: state.historyIdCounter,
          playerId: state.currentPlayer.id,
          playerName: state.currentPlayer.name,
          playerRole: state.currentPlayer.role,
          teamId: null,
          teamName: null,
          finalPrice: state.currentBid,
          status: "unsold",
          timestamp: new Date().toISOString(),
        };

        setAuctionState({
          history: [...state.history, historyEntry],
          historyIdCounter: state.historyIdCounter + 1,
          status: "unsold",
        });

        setTimeout(() => {
          const s = getAuctionState();
          advanceToNextPlayer(s.playerIndex);
        }, 1000);
      }
    }

    res.json(buildPublicState());
  } catch (err) {
    req.log.error(err, "Failed to advance player");
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auction/pass — mark current player unsold immediately
router.post("/pass", (req, res) => {
  try {
    const state = getAuctionState();

    if (!state.started || !state.currentPlayer) {
      return res.status(400).json({ error: "No active player" });
    }

    const historyEntry: AuctionHistoryEntry = {
      id: state.historyIdCounter,
      playerId: state.currentPlayer.id,
      playerName: state.currentPlayer.name,
      playerRole: state.currentPlayer.role,
      teamId: null,
      teamName: null,
      finalPrice: state.currentBid,
      status: "unsold",
      timestamp: new Date().toISOString(),
    };

    setAuctionState({
      history: [...state.history, historyEntry],
      historyIdCounter: state.historyIdCounter + 1,
      status: "unsold",
    });

    setTimeout(() => {
      const s = getAuctionState();
      advanceToNextPlayer(s.playerIndex);
    }, 800);

    res.json(buildPublicState());
  } catch (err) {
    req.log.error(err, "Failed to pass player");
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auction/reset
router.post("/reset", (req, res) => {
  resetAuctionState();
  res.json(buildPublicState());
});

// GET /api/auction/history
router.get("/history", (req, res) => {
  const state = getAuctionState();
  res.json(state.history);
});

// POST /api/auction/ai-bid — trigger AI bidding round
router.post("/ai-bid", (req, res) => {
  try {
    const state = getAuctionState();

    if (!state.started || !state.currentPlayer || state.status !== "bidding") {
      return res.json(buildPublicState());
    }

    const isPanicMode = state.timer <= 2 && state.currentBidder !== null;
    const { newBid, newBidder } = runAiBidRound(state, isPanicMode);

    if (newBidder && newBid > state.currentBid) {
      setAuctionState({
        currentBid: parseFloat(newBid.toFixed(2)),
        currentBidder: newBidder,
        timer: Math.min(state.timer + 2, TIMER_ON_BID), // add 2s on AI bid, cap at 3
      });
    }

    // Decrement timer
    const currentState = getAuctionState();
    if (currentState.timer > 0) {
      const newTimer = Math.max(0, currentState.timer - 1);
      setAuctionState({ timer: newTimer });

      if (newTimer === 0) {
        const s = getAuctionState();
        if (s.currentBidder) {
          // SOLD
          const soldTeam = s.teams.find((t) => t.id === s.currentBidder);
          const histEntry: AuctionHistoryEntry = {
            id: s.historyIdCounter,
            playerId: s.currentPlayer!.id,
            playerName: s.currentPlayer!.name,
            playerRole: s.currentPlayer!.role,
            teamId: s.currentBidder,
            teamName: soldTeam?.name || null,
            finalPrice: s.currentBid,
            status: "sold",
            timestamp: new Date().toISOString(),
          };

          const updatedTeams = s.teams.map((t) => {
            if (t.id === s.currentBidder) {
              return {
                ...t,
                budget: parseFloat((t.budget - s.currentBid).toFixed(2)),
                players: [...t.players, { ...s.currentPlayer!, sold: true, soldTo: s.currentBidder, soldPrice: s.currentBid }],
              };
            }
            return t;
          });

          setAuctionState({
            teams: updatedTeams,
            history: [...s.history, histEntry],
            historyIdCounter: s.historyIdCounter + 1,
            soldAnimation: true,
            status: "sold",
          });

          db.update(playersTable)
            .set({ sold: true, soldTo: s.currentBidder, soldPrice: s.currentBid })
            .where((row: any) => row.id === s.currentPlayer!.id)
            .catch(() => {});

          setTimeout(() => {
            const curr = getAuctionState();
            setAuctionState({ soldAnimation: false });
            advanceToNextPlayer(curr.playerIndex);
          }, 2500);
        } else {
          // UNSOLD
          const s2 = getAuctionState();
          const histEntry: AuctionHistoryEntry = {
            id: s2.historyIdCounter,
            playerId: s2.currentPlayer!.id,
            playerName: s2.currentPlayer!.name,
            playerRole: s2.currentPlayer!.role,
            teamId: null,
            teamName: null,
            finalPrice: s2.currentBid,
            status: "unsold",
            timestamp: new Date().toISOString(),
          };
          setAuctionState({
            history: [...s2.history, histEntry],
            historyIdCounter: s2.historyIdCounter + 1,
            status: "unsold",
          });

          setTimeout(() => {
            const curr = getAuctionState();
            advanceToNextPlayer(curr.playerIndex);
          }, 1000);
        }
      }
    }

    res.json(buildPublicState());
  } catch (err) {
    req.log.error(err, "AI bid failed");
    res.status(500).json({ error: String(err) });
  }
});

function advanceToNextPlayer(currentIndex: number): void {
  const state = getAuctionState();
  const nextIndex = currentIndex + 1;

  if (nextIndex >= state.players.length) {
    setAuctionState({
      status: "finished",
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null,
      timer: 0,
      soldAnimation: false,
    });
    return;
  }

  const nextPlayer = state.players[nextIndex];
  setAuctionState({
    playerIndex: nextIndex,
    currentPlayer: nextPlayer,
    currentBid: nextPlayer.basePrice,
    currentBidder: null,
    timer: TIMER_DEFAULT,
    status: "bidding",
    soldAnimation: false,
  });
}

export default router;
