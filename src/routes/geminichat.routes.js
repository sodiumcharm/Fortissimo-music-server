import { Router } from "express";
import { verifyAccessToken } from "../middlewares/verifyToken.middleware.js";
import { geminiAI } from "../controllers/gemini.controllers.js";

const router = Router();

router.route("/chat").post(verifyAccessToken, geminiAI);

export default router;