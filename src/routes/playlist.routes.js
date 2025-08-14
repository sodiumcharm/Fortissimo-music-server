import { Router } from "express";
import { uploadCoverImage } from "../middlewares/multer.middleware.js";
import {
  verifyAccessToken,
  softTokenCheck,
} from "../middlewares/verifyToken.middleware.js";
import { checkEmailVerification } from "../middlewares/checkEmailVerified.middleware.js";
import { addAudio, createPlaylist, removeAudio } from "../controllers/playlist.controllers.js";

const router = Router();

router
  .route("/create")
  .post(
    verifyAccessToken,
    checkEmailVerification,
    uploadCoverImage.single("coverImage"),
    createPlaylist
  );

router.route("/add").patch(verifyAccessToken, addAudio);

router.route("/remove").patch(verifyAccessToken, removeAudio);

export default router;
