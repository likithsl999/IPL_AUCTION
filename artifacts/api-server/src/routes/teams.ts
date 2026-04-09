import { Router } from "express";
import { getAuctionState, buildPublicState } from "../data/auction-state.js";
import { GetTeamParams } from "@workspace/api-zod";
import { IPL_TEAMS } from "../data/teams.js";

const router = Router();

// GET /api/teams - all teams with current budgets and squads
router.get("/", async (req, res) => {
  try {
    const state = getAuctionState();

    if (!state.started) {
      // Return default teams before auction starts
      const defaultTeams = IPL_TEAMS.map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        color: t.color,
        budget: 100,
        initialBudget: 100,
        players: [],
        maxSquadSize: t.maxSquadSize,
      }));
      return res.json(defaultTeams);
    }

    res.json(state.teams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      color: t.color,
      budget: t.budget,
      initialBudget: t.initialBudget,
      players: t.players,
      maxSquadSize: t.maxSquadSize,
    })));
  } catch (err) {
    req.log.error(err, "Failed to get teams");
    res.status(500).json({ error: "Failed to get teams" });
  }
});

// GET /api/teams/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = GetTeamParams.parse(req.params);
    const state = getAuctionState();
    const team = state.teams.find((t) => t.id === id);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      color: team.color,
      budget: team.budget,
      initialBudget: team.initialBudget,
      players: team.players,
      maxSquadSize: team.maxSquadSize,
    });
  } catch (err) {
    req.log.error(err, "Failed to get team");
    res.status(500).json({ error: "Failed to get team" });
  }
});

export default router;
