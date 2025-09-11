import { Router } from "express";
import { uploadCoverImage } from "../middlewares/multer.middleware.js";
import {
  verifyAccessToken,
  softTokenCheck,
} from "../middlewares/verifyToken.middleware.js";
import { checkEmailVerification } from "../middlewares/checkEmailVerified.middleware.js";
import {
  addAudio,
  createPlaylist,
  deletePlaylist,
  editPlaylist,
  getPlaylists,
  removeAudio,
  removeCoverImage,
  savePlaylist,
} from "../controllers/playlist.controllers.js";
import { imageCheckerAI } from "../middlewares/imageModerationAI.middleware.js";

const router = Router();

router.route("/all").get(softTokenCheck, getPlaylists);

router
  .route("/create")
  .post(
    verifyAccessToken,
    checkEmailVerification,
    uploadCoverImage.single("coverImage"),
    imageCheckerAI,
    createPlaylist
  );

router.route("/add-audio").patch(verifyAccessToken, addAudio);

router.route("/remove-audio").patch(verifyAccessToken, removeAudio);

router.route("/save/:id").patch(verifyAccessToken, savePlaylist);

router.route("/remove-cover/:id").delete(verifyAccessToken, removeCoverImage);

router
  .route("/edit")
  .patch(
    verifyAccessToken,
    uploadCoverImage.single("coverImage"),
    imageCheckerAI,
    editPlaylist
  );

router.route("/delete/:id").delete(verifyAccessToken, deletePlaylist);

export default router;
