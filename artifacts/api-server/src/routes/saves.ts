import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

const VALID_SLOTS = ["slot_1", "slot_2", "slot_3"];

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT slot_name, save_data, updated_at FROM ipl_user_saves WHERE user_id=$1 ORDER BY slot_name",
      [req.user!.userId]
    );
    return res.json(result.rows);
  } catch (err: unknown) {
    req.log.error({ err }, "Get saves error");
    return res.status(500).json({ error: "Failed to fetch saves" });
  }
});

router.put("/:slot", requireAuth, async (req: AuthRequest, res) => {
  const { slot } = req.params;
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: "Invalid slot (slot_1, slot_2, slot_3)" });
  const saveData = req.body;
  if (!saveData || typeof saveData !== "object") return res.status(400).json({ error: "Save data required" });
  try {
    await pool.query(
      `INSERT INTO ipl_user_saves (user_id, slot_name, save_data, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id, slot_name) DO UPDATE SET save_data=$3, updated_at=NOW()`,
      [req.user!.userId, slot, JSON.stringify(saveData)]
    );
    await pool.query(
      `UPDATE ipl_users SET career_data=$1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(saveData.careerSnapshot ?? {}), req.user!.userId]
    );
    return res.json({ success: true, slot });
  } catch (err: unknown) {
    req.log.error({ err }, "Save error");
    return res.status(500).json({ error: "Save failed" });
  }
});

router.delete("/:slot", requireAuth, async (req: AuthRequest, res) => {
  const { slot } = req.params;
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: "Invalid slot" });
  try {
    await pool.query(
      "DELETE FROM ipl_user_saves WHERE user_id=$1 AND slot_name=$2",
      [req.user!.userId, slot]
    );
    return res.json({ success: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Delete save error");
    return res.status(500).json({ error: "Delete failed" });
  }
});

router.post("/career-sync", requireAuth, async (req: AuthRequest, res) => {
  const { careerData } = req.body as { careerData?: Record<string, unknown> };
  if (!careerData) return res.status(400).json({ error: "careerData required" });
  try {
    await pool.query(
      "UPDATE ipl_users SET career_data=$1, updated_at=NOW() WHERE id=$2",
      [JSON.stringify(careerData), req.user!.userId]
    );
    return res.json({ synced: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Career sync error");
    return res.status(500).json({ error: "Sync failed" });
  }
});

export default router;
