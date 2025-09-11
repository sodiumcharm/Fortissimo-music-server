import { Router } from "express";
import { uploadProfileImage } from "../middlewares/multer.middleware.js";
import {
  getUserDetails,
  getOtherUser,
  loginUser,
  registerUser,
  refreshAccess,
  passwordReset,
  logoutUser,
  changePassword,
  changeName,
  changeProfilePhoto,
  removeProfilePhoto,
} from "../controllers/user.controllers.js";
import {
  generateEmailOtp,
  verifyEmail,
  generatePasswordOtp,
  verifyPasswordOtp,
} from "../controllers/otpVerification.controllers.js";
import { verifyAccessToken } from "../middlewares/verifyToken.middleware.js";
import { checkEmailVerification } from "../middlewares/checkEmailVerified.middleware.js";
import { imageCheckerAI } from "../middlewares/imageModerationAI.middleware.js";

const router = Router();

router.route("/me").get(verifyAccessToken, getUserDetails);

router.route("/:id").get(getOtherUser);

router
  .route("/signup")
  .post(uploadProfileImage.single("profileImage"), imageCheckerAI, registerUser);

router.route("/login").post(loginUser);

router.route("/refresh-access").post(refreshAccess);

router.route("/request-email-otp").post(verifyAccessToken, generateEmailOtp);

router.route("/verify-email").post(verifyAccessToken, verifyEmail);

router.route("/logout").post(verifyAccessToken, logoutUser);

router.route("/forgot-password").post(generatePasswordOtp);

router.route("/verify-password-otp").post(verifyPasswordOtp);

router.route("/password-reset").patch(passwordReset);

router
  .route("/change-password")
  .patch(verifyAccessToken, checkEmailVerification, changePassword);

router.route("/change-name").patch(verifyAccessToken, changeName);

router
  .route("/change-profile-photo")
  .patch(
    verifyAccessToken,
    checkEmailVerification,
    uploadProfileImage.single("profileImage"),
    imageCheckerAI,
    changeProfilePhoto
  );

router
  .route("/remove-profile-photo")
  .delete(verifyAccessToken, checkEmailVerification, removeProfilePhoto);

export default router;
