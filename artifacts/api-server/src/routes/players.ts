import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import { eq, like, and, SQL } from "drizzle-orm";
import { GetPlayersQueryParams, GetPlayerParams } from "@workspace/api-zod";

const router = Router();

// GET /api/players - list with optional filters
router.get("/", async (req, res) => {
  try {
    const query = GetPlayersQueryParams.parse(req.query);
    const conditions: SQL[] = [];

    if (query.role) {
      conditions.push(eq(playersTable.role, query.role));
    }
    if (query.nationality) {
      conditions.push(eq(playersTable.nationality, query.nationality));
    }
    if (query.search) {
      conditions.push(like(playersTable.name, `%${query.search}%`));
    }
    if (query.sold !== undefined) {
      conditions.push(eq(playersTable.sold, query.sold));
    }

    const players = conditions.length > 0
      ? await db.select().from(playersTable).where(and(...conditions))
      : await db.select().from(playersTable);

    res.json(players);
  } catch (err) {
    req.log.error(err, "Failed to get players");
    res.status(500).json({ error: "Failed to get players" });
  }
});

// GET /api/players/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = GetPlayerParams.parse(req.params);
    const players = await db.select().from(playersTable).where(eq(playersTable.id, id));

    if (players.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json(players[0]);
  } catch (err) {
    req.log.error(err, "Failed to get player");
    res.status(500).json({ error: "Failed to get player" });
  }
});

export default router;
