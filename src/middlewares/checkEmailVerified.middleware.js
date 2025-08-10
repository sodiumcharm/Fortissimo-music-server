import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkEmailVerification = asyncHandler(
  async function (req, res, next) {
    const verifiedUser = req.user;

    if (!verifiedUser) {
      return next(
        new ApiError(401, "Unauthorized request denied! Please login.")
      );
    }

    if (!verifiedUser.isEmailVerified) {
      return next(new ApiError(403, "Email verification is required!"));
    }

    next();
  }
);
