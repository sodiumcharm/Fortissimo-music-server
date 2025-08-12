import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyAccessToken = asyncHandler(async function (req, res, next) {
  try {
    const token =
      req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(
        new ApiError(401, "Unauthorized request denied! Access token missing.")
      );
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken -__v"
    );

    if (!user) {
      return next(
        new ApiError(
          401,
          "The user belongs to this token does no longer exist!"
        )
      );
    }

    if (user.isPasswordChangedAfter(decoded.iat)) {
      return next(
        new ApiError(
          401,
          "User changed password after issuing this token! Please login again."
        )
      );
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(405, "Access token expired!"));
    }

    return next(new ApiError(401, "Invalid access token!"));
  }
});

export const softTokenCheck = asyncHandler(async function (req, res, next) {
  try {
    const token =
      req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken -__v"
    );

    if (!user) {
      req.user = null;
      return next();
    }

    if (user.isPasswordChangedAfter(decoded.iat)) {
      req.user = null;
      return next();
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      req.user = null;
      return next();
    }

    req.user = null;
    return next();
  }
});
