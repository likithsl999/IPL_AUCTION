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
import { buildAllPlayers } from "../data/players-seed.js";
import { IPL_TEAMS } from "../data/teams.js";
import {
  StartAuctionBody,
  PlaceBidBody,
} from "@workspace/api-zod";
import type { AuctionHistoryEntry } from "../data/auction-state.js";

const router = Router();

// GET /api/auction/state
router.get("/state", (req, res) => {
  res.json(buildPublicState());
});

// POST /api/auction/start
router.post("/start", async (req, res) => {
  try {
    const body = StartAuctionBody.parse(req.body);
    const { userTeamId, budget, difficulty } = body;

    // Validate team
    const teamConfig = IPL_TEAMS.find((t) => t.id === userTeamId);
    if (!teamConfig) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    // Reset and seed players into DB
    resetAuctionState();

    // Seed players if not already seeded
    const existingCount = await db.select().from(playersTable);
    let players = existingCount;

    if (existingCount.length < 600) {
      // Generate and seed 600+ players
      const seedData = buildAllPlayers();

      // Clear existing
      await db.delete(playersTable);

      // Insert in batches
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
          }))
        );
      }

      players = await db.select().from(playersTable);
    } else {
      // Reset all players to unsold
      await db.update(playersTable).set({
        sold: false,
        soldTo: null,
        soldPrice: null,
      });
      players = await db.select().from(playersTable);
    }

    // Set up teams with budget
    const teams = IPL_TEAMS.map((t) => ({
      ...t,
      budget: t.id === userTeamId ? budget : 100, // other teams get 100 Cr
      initialBudget: t.id === userTeamId ? budget : 100,
      players: [],
    }));

    // Set auction state
    const firstPlayer = players[0] || null;
    setAuctionState({
      started: true,
      players,
      playerIndex: 0,
      currentPlayer: firstPlayer,
      currentBid: firstPlayer ? firstPlayer.basePrice : 0,
      currentBidder: null,
      timer: 15,
      teams,
      soldAnimation: false,
      status: firstPlayer ? "bidding" : "finished",
      difficulty: difficulty as any,
      userTeamId,
      history: [],
      historyIdCounter: 1,
      timerInterval: null,
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
    if (!team) {
      return res.status(400).json({ error: "Invalid team" });
    }
    if (amount > team.budget) {
      return res.status(400).json({ error: "Insufficient budget" });
    }
    if (team.players.length >= team.maxSquadSize) {
      return res.status(400).json({ error: "Squad is full" });
    }

    setAuctionState({
      currentBid: parseFloat(amount.toFixed(2)),
      currentBidder: teamId,
      timer: 15, // reset timer on bid
    });

    res.json(buildPublicState());
  } catch (err) {
    req.log.error(err, "Failed to place bid");
    res.status(400).json({ error: String(err) });
  }
});

// POST /api/auction/next - advance to next player
router.post("/next", async (req, res) => {
  try {
    const state = getAuctionState();

    if (!state.started) {
      return res.status(400).json({ error: "Auction not started" });
    }

    // Finalize current player if there is one
    if (state.currentPlayer) {
      const sold = state.currentBidder !== null;

      if (sold) {
        // Mark as sold in DB
        await db.update(playersTable)
          .set({ sold: true, soldTo: state.currentBidder, soldPrice: state.currentBid })
          .where((row: any) => row.id === state.currentPlayer!.id);

        // Update team squad and budget
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

        // Clear sold animation after 2 seconds
        setTimeout(() => {
          const s = getAuctionState();
          setAuctionState({ soldAnimation: false });
          advanceToNextPlayer(s.playerIndex);
        }, 2000);
      } else {
        // Unsold
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

// POST /api/auction/pass - mark current player as unsold immediately
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

// POST /api/auction/ai-bid - trigger AI bidding round
router.post("/ai-bid", (req, res) => {
  try {
    const state = getAuctionState();

    if (!state.started || !state.currentPlayer || state.status !== "bidding") {
      return res.json(buildPublicState());
    }

    const { newBid, newBidder } = runAiBidRound(state);

    if (newBidder && (newBid > state.currentBid || newBidder !== state.currentBidder)) {
      setAuctionState({
        currentBid: parseFloat(newBid.toFixed(2)),
        currentBidder: newBidder,
        timer: Math.min(state.timer + 3, 15), // give a bit more time on AI bid
      });
    }

    // Decrement timer
    const currentState = getAuctionState();
    if (currentState.timer > 0) {
      const newTimer = Math.max(0, currentState.timer - 1);
      setAuctionState({ timer: newTimer });

      // Auto-sell when timer hits 0
      if (newTimer === 0) {
        // Trigger next player process
        const s = getAuctionState();
        if (s.currentBidder) {
          // Sold
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

          // Update in DB async
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
          // Unsold
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

// Advance to the next player in the list
function advanceToNextPlayer(currentIndex: number): void {
  const state = getAuctionState();
  const nextIndex = currentIndex + 1;

  if (nextIndex >= state.players.length) {
    // Auction complete
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
    timer: 15,
    status: "bidding",
    soldAnimation: false,
  });
}

export default router;
