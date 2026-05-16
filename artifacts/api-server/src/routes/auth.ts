import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "@workspace/db";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, email, password, favoriteTeam } = req.body as {
    username?: string; email?: string; password?: string; favoriteTeam?: string;
  };
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required" });
  }
  if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) return res.status(400).json({ error: "Invalid email format" });

  try {
    const exists = await pool.query(
      "SELECT id FROM ipl_users WHERE email=$1 OR username=$2 LIMIT 1",
      [email.toLowerCase(), username]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Username or email already taken" });
    }
    const hash = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `INSERT INTO ipl_users (username, email, password_hash, favorite_team)
       VALUES ($1,$2,$3,$4) RETURNING id, username, email, favorite_team, coins, created_at`,
      [username, email.toLowerCase(), hash, favoriteTeam ?? "CSK"]
    );
    const user = insert.rows[0];
    await pool.query(
      `INSERT INTO ipl_leaderboard (user_id, username, favorite_team) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [user.id, user.username, favoriteTeam ?? "CSK"]
    );
    const token = signToken({ userId: user.id, username: user.username, email: user.email });
    return res.status(201).json({ token, user: { ...user, password_hash: undefined } });
  } catch (err: unknown) {
    req.log.error({ err }, "Register error");
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const result = await pool.query(
      "SELECT * FROM ipl_users WHERE email=$1 LIMIT 1",
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken({ userId: user.id, username: user.username, email: user.email });
    return res.json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        favoriteTeam: user.favorite_team, coins: user.coins,
        careerData: user.career_data, settings: user.settings,
        createdAt: user.created_at,
      }
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Login error");
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, favorite_team, coins, career_data, settings, created_at FROM ipl_users WHERE id=$1",
      [req.user!.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const u = result.rows[0];
    return res.json({
      id: u.id, username: u.username, email: u.email,
      favoriteTeam: u.favorite_team, coins: u.coins,
      careerData: u.career_data, settings: u.settings,
      createdAt: u.created_at,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Me error");
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  const { username, favoriteTeam, settings } = req.body as {
    username?: string; favoriteTeam?: string; settings?: Record<string, unknown>;
  };
  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (username) { updates.push(`username=$${idx++}`); values.push(username); }
    if (favoriteTeam) { updates.push(`favorite_team=$${idx++}`); values.push(favoriteTeam); }
    if (settings) { updates.push(`settings=$${idx++}`); values.push(JSON.stringify(settings)); }
    updates.push(`updated_at=$${idx++}`); values.push(new Date());
    values.push(req.user!.userId);
    await pool.query(
      `UPDATE ipl_users SET ${updates.join(",")} WHERE id=$${idx}`,
      values
    );
    return res.json({ success: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Profile update error");
    return res.status(500).json({ error: "Update failed" });
  }
});

router.post("/achievements", requireAuth, async (req: AuthRequest, res) => {
  const { type, data } = req.body as { type?: string; data?: Record<string, unknown> };
  if (!type) return res.status(400).json({ error: "type required" });
  try {
    const existing = await pool.query(
      "SELECT id FROM ipl_achievements WHERE user_id=$1 AND type=$2 LIMIT 1",
      [req.user!.userId, type]
    );
    if (existing.rows.length > 0) return res.json({ already: true });
    await pool.query(
      "INSERT INTO ipl_achievements (user_id, type, data) VALUES ($1,$2,$3)",
      [req.user!.userId, type, JSON.stringify(data ?? {})]
    );
    return res.json({ earned: true, type });
  } catch (err: unknown) {
    req.log.error({ err }, "Achievement error");
    return res.status(500).json({ error: "Failed to save achievement" });
  }
});

router.get("/achievements", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT type, data, earned_at FROM ipl_achievements WHERE user_id=$1 ORDER BY earned_at DESC",
      [req.user!.userId]
    );
    return res.json(result.rows);
  } catch (err: unknown) {
    req.log.error({ err }, "Achievements fetch error");
    return res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

export default router;
