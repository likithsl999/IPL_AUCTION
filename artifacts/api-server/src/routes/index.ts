import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import teamsRouter from "./teams";
import auctionRouter from "./auction";
import careerRouter from "./career";
import authRouter from "./auth";
import savesRouter from "./saves";
import leaderboardRouter from "./leaderboard";
import multiplayerRouter from "./multiplayer";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/players", playersRouter);
router.use("/teams", teamsRouter);
router.use("/auction", auctionRouter);
router.use("/career", careerRouter);
router.use("/auth", authRouter);
router.use("/saves", savesRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/multiplayer", multiplayerRouter);

export default router;
