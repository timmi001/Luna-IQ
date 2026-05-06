import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini/index.js";
import lunaRouter from "./luna/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/gemini", geminiRouter);
router.use("/luna", lunaRouter);

export default router;
