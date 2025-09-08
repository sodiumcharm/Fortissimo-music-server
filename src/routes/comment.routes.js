import { Router } from "express";
import { verifyAccessToken } from "../middlewares/verifyToken.middleware.js";
import {
  deleteComment,
  getComments,
  likeComment,
  postComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/all/:id").get(getComments);

router.route("/post").post(verifyAccessToken, postComment);

router.route("/like/:id").patch(verifyAccessToken, likeComment);

router.route("/delete/:id").delete(verifyAccessToken, deleteComment);

export default router;
