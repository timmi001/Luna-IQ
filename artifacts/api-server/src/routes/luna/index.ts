import { Router } from "express";
import insightRouter from "./insight.js";
import chatRouter from "./chat.js";

const router = Router();

// Insight routes: /log, /logs/:userId, /today-insight/:userId,
//                 /today-updates/:userId, /generate-insight
// Daily caching is enforced only inside these routes.
router.use(insightRouter);

// Chat route: /chat
// Completely independent — its own Gemini client, its own model,
// no daily limits, no insight caching logic.
router.use(chatRouter);

export default router;
