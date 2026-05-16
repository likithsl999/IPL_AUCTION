import { Router } from "express";
import { getPublicRooms, getRoom } from "../data/multiplayer";

const router = Router();

router.get("/rooms", (_req, res) => {
  return res.json(getPublicRooms());
});

router.get("/rooms/:id", (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const { password: _p, ...safe } = room;
  return res.json(safe);
});

export default router;
