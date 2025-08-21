import { Router } from "express";
import { verifyAccessToken } from "../middlewares/verifyToken.middleware.js";
import { checkEmailVerification } from "../middlewares/checkEmailVerified.middleware.js";
import {
  createPreset,
  deletePreset,
  getPresets,
  importPreset,
  removeImport,
} from "../controllers/equalizer.controllers.js";

const router = Router();

router.route("/all").get(getPresets);

router
  .route("/create")
  .post(verifyAccessToken, checkEmailVerification, createPreset);

router.route("/import/:id").patch(verifyAccessToken, importPreset);

router.route("/remove/:id").patch(verifyAccessToken, removeImport);

router.route("/delete/:id").delete(verifyAccessToken, deletePreset);

export default router;
