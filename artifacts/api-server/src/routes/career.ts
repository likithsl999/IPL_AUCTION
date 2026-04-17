// ─── Career / Season Routes ───────────────────────────────────────────────────
import { Router } from "express";
import { getAuctionState } from "../data/auction-state.js";
import { simulateSeason } from "../data/match-engine.js";
import {
  getCareerState,
  setCareerResult,
  advanceSeason,
  resetCareerState,
} from "../data/career-state.js";

const router = Router();

// GET /api/career/state
router.get("/state", (_req, res) => {
  const career = getCareerState();
  res.json(career);
});

// POST /api/career/simulate
// Simulates the current IPL season using the current auction squads
router.post("/simulate", (req, res) => {
  const auctionState = getAuctionState();

  if (!auctionState.started) {
    return res.status(400).json({ error: "No auction has been started yet. Run an auction first." });
  }

  const teams = auctionState.teams;
  if (!teams || teams.length === 0) {
    return res.status(400).json({ error: "No teams found in auction state." });
  }

  const result = simulateSeason(teams);
  setCareerResult(result);

  res.json({ success: true, seasonNumber: getCareerState().seasonNumber, result });
});

// POST /api/career/next-season
// Advance to the next season (clears simulation, increments season number)
router.post("/next-season", (_req, res) => {
  advanceSeason();
  res.json({ success: true, seasonNumber: getCareerState().seasonNumber });
});

// POST /api/career/reset
router.post("/reset", (_req, res) => {
  resetCareerState();
  res.json({ success: true });
});

export default router;
