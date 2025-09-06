import { Router } from "express";
import { uploadAudio } from "../middlewares/multer.middleware.js";
import {
  verifyAccessToken,
  softTokenCheck,
} from "../middlewares/verifyToken.middleware.js";
import { checkEmailVerification } from "../middlewares/checkEmailVerified.middleware.js";
import {
  deleteAudio,
  editAudio,
  getAudios,
  handleAudioUpload,
  likeAudio,
  recordHistory,
  removeCoverImage,
  removeLyrics,
  reportAudio,
} from "../controllers/audio.controllers.js";

const router = Router();

router.route("/all-audios").get(softTokenCheck, getAudios);

router.route("/upload-music").post(
  verifyAccessToken,
  checkEmailVerification,
  uploadAudio.fields([
    { name: "audio", maxCount: 1 },
    { name: "lyrics", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  handleAudioUpload
);

router.route("/like/:id").patch(verifyAccessToken, likeAudio);

router.route("/delete/:id").delete(verifyAccessToken, deleteAudio);

router.route("/remove-lyrics/:id").delete(verifyAccessToken, removeLyrics);

router.route("/remove-cover/:id").delete(verifyAccessToken, removeCoverImage);

router.route("/edit").patch(
  verifyAccessToken,
  uploadAudio.fields([
    { name: "lyrics", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  editAudio
);

router.route("/record-history").post(verifyAccessToken, recordHistory);

router.route("/report/:id").patch(verifyAccessToken, reportAudio);

export default router;
