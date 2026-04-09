import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import teamsRouter from "./teams";
import auctionRouter from "./auction";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/players", playersRouter);
router.use("/teams", teamsRouter);
router.use("/auction", auctionRouter);

export default router;
