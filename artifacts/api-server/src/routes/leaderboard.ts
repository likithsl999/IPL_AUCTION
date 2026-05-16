import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/global", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.user_id, l.username, l.favorite_team,
             l.titles, l.auction_wins, l.total_profit, l.match_wins, l.total_matches,
             CASE WHEN l.total_matches > 0 THEN ROUND(100.0 * l.match_wins / l.total_matches, 1) ELSE 0 END AS win_rate,
             l.updated_at
      FROM ipl_leaderboard l
      ORDER BY l.titles DESC, l.auction_wins DESC, l.total_profit DESC
      LIMIT 50
    `);
    return res.json(result.rows);
  } catch (err: unknown) {
    req.log.error({ err }, "Leaderboard global error");
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/weekly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.user_id, l.username, l.favorite_team,
             l.titles, l.auction_wins, l.total_profit, l.match_wins, l.total_matches,
             CASE WHEN l.total_matches > 0 THEN ROUND(100.0 * l.match_wins / l.total_matches, 1) ELSE 0 END AS win_rate
      FROM ipl_leaderboard l
      WHERE l.updated_at >= NOW() - INTERVAL '7 days'
      ORDER BY l.auction_wins DESC, l.titles DESC
      LIMIT 50
    `);
    return res.json(result.rows);
  } catch (err: unknown) {
    req.log.error({ err }, "Leaderboard weekly error");
    return res.status(500).json({ error: "Failed to fetch weekly leaderboard" });
  }
});

router.post("/update", requireAuth, async (req: AuthRequest, res) => {
  const { titles, auctionWin, matchResult } = req.body as {
    titles?: number;
    auctionWin?: boolean;
    matchResult?: { won: boolean };
  };
  try {
    const updates: string[] = ["updated_at=NOW()"];
    if (titles) updates.push(`titles = titles + ${Number(titles)}`);
    if (auctionWin) updates.push(`auction_wins = auction_wins + 1`);
    if (matchResult) {
      updates.push(`total_matches = total_matches + 1`);
      if (matchResult.won) updates.push(`match_wins = match_wins + 1`);
    }
    await pool.query(
      `INSERT INTO ipl_leaderboard (user_id, username)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET ${updates.join(",")}`,
      [req.user!.userId, req.user!.username]
    );
    return res.json({ success: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Leaderboard update error");
    return res.status(500).json({ error: "Update failed" });
  }
});

router.get("/my-rank", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rankResult = await pool.query(`
      SELECT rank FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY titles DESC, auction_wins DESC) AS rank
        FROM ipl_leaderboard
      ) ranked WHERE user_id=$1
    `, [req.user!.userId]);
    const myStats = await pool.query(
      "SELECT * FROM ipl_leaderboard WHERE user_id=$1",
      [req.user!.userId]
    );
    return res.json({
      rank: rankResult.rows[0]?.rank ?? null,
      stats: myStats.rows[0] ?? null,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "My rank error");
    return res.status(500).json({ error: "Failed to fetch rank" });
  }
});

export default router;
