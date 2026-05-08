// ─── Career / Season Routes ───────────────────────────────────────────────────
import { Router } from "express";
import { getAuctionState } from "../data/auction-state.js";
import { simulateSeason } from "../data/match-engine.js";
import {
  getCareerState,
  setCareerResult,
  advanceSeason,
  resetCareerState,
  archiveSeasonToHistory,
  recordPlayerGrowth,
  type PlayerGrowthEvent,
} from "../data/career-state.js";

const router = Router();

// ─── GET /api/career/state ────────────────────────────────────────────────────
router.get("/state", (_req, res) => {
  res.json(getCareerState());
});

// ─── POST /api/career/simulate ────────────────────────────────────────────────
// Runs the full season simulation using current auction squads
router.post("/simulate", (req, res) => {
  const auctionState = getAuctionState();

  if (!auctionState.started) {
    return res.status(400).json({ error: "No auction started. Run an auction first." });
  }

  const teams = auctionState.teams;
  if (!teams || teams.length === 0) {
    return res.status(400).json({ error: "No teams found in auction state." });
  }

  const result = simulateSeason(teams);
  setCareerResult(result, auctionState.userTeamId);

  // Archive to history for multi-season records
  archiveSeasonToHistory(
    result,
    auctionState.userTeamId,
    result.standings.map(s => ({ teamId: s.teamId, shortName: s.shortName, points: s.points }))
  );

  res.json({
    success: true,
    seasonNumber: getCareerState().seasonNumber,
    result,
  });
});

// ─── POST /api/career/next-season ─────────────────────────────────────────────
// Advances to the next season and applies player growth
router.post("/next-season", (_req, res) => {
  const career = getCareerState();
  const auctionState = getAuctionState();

  // Apply realistic player growth/decline to auction squads
  const growthEvents: PlayerGrowthEvent[] = [];

  if (auctionState.teams) {
    for (const team of auctionState.teams) {
      for (const player of team.players) {
        const age = player.age ?? 27;
        let delta = 0;
        let reason = "";

        if (age <= 22) {
          // Young players develop fast
          delta = 1 + Math.floor(Math.random() * 3);
          reason = "Young talent developing rapidly";
        } else if (age <= 27) {
          // Prime years — slight form fluctuation
          delta = Math.floor(Math.random() * 3) - 1; // -1 to +2
          reason = delta > 0 ? "In great form" : delta < 0 ? "Form dip" : "Consistent season";
        } else if (age <= 32) {
          // Gradual decline starts
          delta = Math.floor(Math.random() * 2) - 1; // -1 to +1
          reason = "Experienced veteran";
        } else {
          // Decline phase
          delta = -1 - Math.floor(Math.random() * 2);
          reason = "Age-related decline";
        }

        if (delta !== 0 && player.name) {
          growthEvents.push({
            playerName: player.name,
            team: team.shortName,
            change: delta,
            reason,
          });
        }
      }
    }
  }

  recordPlayerGrowth(growthEvents);
  advanceSeason();

  res.json({
    success: true,
    seasonNumber: getCareerState().seasonNumber,
    growthEvents: growthEvents.slice(0, 20), // return sample
    newYouthPlayers: getCareerState().youthPlayers,
  });
});

// ─── GET /api/career/records ──────────────────────────────────────────────────
// Returns multi-season records hall of fame
router.get("/records", (_req, res) => {
  const career = getCareerState();

  // All-time Orange Cap (most runs in a single season)
  const orangeCapHistory = career.history.map(h => ({
    season: h.season,
    name: h.orangeCap.name,
    runs: h.orangeCap.runs,
    team: h.orangeCap.team,
  })).sort((a, b) => b.runs - a.runs);

  // All-time Purple Cap
  const purpleCapHistory = career.history.map(h => ({
    season: h.season,
    name: h.purpleCap.name,
    wickets: h.purpleCap.wickets,
    team: h.purpleCap.team,
  })).sort((a, b) => b.wickets - a.wickets);

  // Championship history
  const championHistory = career.history.map(h => ({
    season: h.season,
    champion: h.champion,
    color: h.championColor,
    motm: h.manOfTheSeries.name,
  }));

  // Most sixes all-time
  const sixesHistory = career.history.map(h => ({
    season: h.season,
    name: h.mostSixes?.name ?? "—",
    sixes: h.mostSixes?.sixes ?? 0,
    team: h.mostSixes?.team ?? "—",
  })).sort((a, b) => b.sixes - a.sixes);

  res.json({
    totalSeasons: career.history.length,
    totalChampionships: career.totalChampionships,
    orangeCapHistory,
    purpleCapHistory,
    championHistory,
    sixesHistory,
    growthLog: career.growthLog.slice(-20),
    finance: career.finance,
  });
});

// ─── GET /api/career/youth ────────────────────────────────────────────────────
// Returns current youth academy prospects
router.get("/youth", (_req, res) => {
  const career = getCareerState();
  res.json({
    season: career.seasonNumber,
    prospects: career.youthPlayers,
    message: career.youthPlayers.length === 0
      ? "Complete a season to discover youth prospects for the next auction."
      : `${career.youthPlayers.length} prospects scouted for Season ${career.seasonNumber}.`,
  });
});

// ─── GET /api/career/finance ──────────────────────────────────────────────────
router.get("/finance", (_req, res) => {
  const career = getCareerState();
  const totalProfit = career.finance.reduce((s, f) => s + f.netProfit, 0);
  const totalIncome = career.finance.reduce((s, f) => s + f.totalIncome, 0);
  const totalExpenses = career.finance.reduce((s, f) => s + f.totalExpenses, 0);

  res.json({
    seasons: career.finance,
    totalProfit,
    totalIncome,
    totalExpenses,
    trend: career.finance.length >= 2
      ? career.finance[career.finance.length - 1].netProfit > career.finance[career.finance.length - 2].netProfit
        ? "improving" : "declining"
      : "stable",
  });
});

// ─── POST /api/career/reset ───────────────────────────────────────────────────
router.post("/reset", (_req, res) => {
  resetCareerState();
  res.json({ success: true });
});

export default router;
