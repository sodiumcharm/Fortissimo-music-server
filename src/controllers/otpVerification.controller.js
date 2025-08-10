import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { randomOTPGenerator } from "../utils/otpGenerator.js";
import { sendEmail } from "../utils/nodeMailer.js";
import { mailHTML, mailText } from "../utils/emailTemplates.js";
import bcrypt from "bcrypt";

// *************************************************************
// GENERATE EMAIL VERIFICATION OTP CONTROLLER
// *************************************************************

export const generateEmailOtp = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  const email = verifiedUser.email;

  const otp = randomOTPGenerator();

  const hashedOTP = await bcrypt.hash(otp, 10);

  const otpExpiry = Date.now() + 5 * 60 * 1000;

  user.activeOtp = hashedOTP;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Error during generating OTP!"));
  }

  const text = mailText(verifiedUser.fullname, otp);

  const html = mailHTML(verifiedUser.fullname, otp);

  await sendEmail(email, "Email Verification OTP", text, html);

  res
    .status(200)
    .json(
      new ApiResponse(
        null,
        `An OTP was sent to ${email}. Check your mail inbox.`
      )
    );
});

// *************************************************************
// EMAIL VERIFICATION CONTROLLER
// *************************************************************

export const verifyEmail = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  let otp = req.body?.otp;

  if (typeof otp !== "string") {
    return next(new ApiError(400, "Invalid input data provided!"));
  }

  if (otp.trim() === "") {
    return next(new ApiError(400, "OTP is required!"));
  }

  otp = otp.trim();

  const user = await User.findById(verifiedUser._id).select(
    "+activeOtp +otpExpiry +otpAttempts"
  );

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  if (!user.activeOtp || !user.otpExpiry) {
    return next(new ApiError(404, "There is no registered OTP to match! Please generate a new OTP."));
  }

  if (user.otpExpiry < Date.now()) {
    return next(new ApiError(400, "OTP is expired! Request a new OTP."));
  }

  const isMatching = await bcrypt.compare(otp, user.activeOtp);

  if (!isMatching) {
    user.otpAttempts = user.otpAttempts + 1;

    if (user.otpAttempts <= 5) {
      await user.save({ validateBeforeSave: false });
      return next(
        new ApiError(400, "Incorrect OTP! Email verification failed.")
      );
    } else {
      return next(
        new ApiError(400, "Too many failed attempts! Generate a new OTP.")
      );
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        isEmailVerified: true,
      },
      $unset: {
        activeOtp: "",
        otpExpiry: "",
        otpAttempts: "",
      },
    },
    { new: true }
  ).select("-password -refreshToken -__v");

  if (!updatedUser) {
    return next(
      new ApiError(
        500,
        "Error occurred during verification! Email verification failed."
      )
    );
  }

  res.status(200).json(new ApiResponse({ user: updatedUser }));
});

// *************************************************************
// GENERATE OTP FOR PASSWORD RESET CONTROLLER
// *************************************************************

export const generatePasswordOtp = asyncHandler(
  async function (req, res, next) {
    let email = req.body?.email;

    if (typeof email !== "string") {
      return next(new ApiError(400, "Invalid input type!"));
    }

    email = email.trim();

    if (email.trim() === "") {
      return next(new ApiError(400, "Email address is required!"));
    }

    const user = await User.findOne({ email: email });

    if (!user) {
      return next(new ApiError(404, "This email address is not registered!"));
    }

    const otp = randomOTPGenerator();

    const hashedOTP = await bcrypt.hash(otp, 10);

    const otpExpiry = Date.now() + 5 * 60 * 1000;

    user.activeOtp = hashedOTP;
    user.otpExpiry = otpExpiry;
    user.otpAttempts = 0;

    try {
      await user.save({ validateBeforeSave: false });
    } catch (error) {
      return next(new ApiError(500, "Error during generating OTP!"));
    }

    const text = mailText(user.fullname, otp);

    const html = mailHTML(user.fullname, otp);

    await sendEmail(email, "Password Reset OTP", text, html);

    res
      .status(200)
      .json(
        new ApiResponse(
          null,
          `An OTP was sent to ${email}. Check your mail inbox.`
        )
      );
  }
);

// *************************************************************
// VERIFY OTP FOR PASSWORD RESET CONTROLLER
// *************************************************************

export const verifyPasswordOtp = asyncHandler(async function (req, res, next) {
  let otp = req.body?.otp;
  let email = req.body?.email;

  if (typeof otp !== "string" || typeof email !== "string") {
    return next(new ApiError(400, "Invalid input data provided!"));
  }

  if (otp.trim() === "") {
    return next(new ApiError(400, "OTP is required!"));
  }

  if (email.trim() === "") {
    return next(new ApiError(400, "Email address is required!"));
  }

  otp = otp.trim();
  email = email.trim();

  const user = await User.findOne({ email: email }).select(
    "+activeOtp +otpExpiry +otpAttempts"
  );

  if (!user) {
    return next(
      new ApiError(404, "User does not exist! OTP verification failed.")
    );
  }

  if (!user.activeOtp || !user.otpExpiry) {
    return next(new ApiError(404, "There is no registered OTP to match! Please generate a new OTP."));
  }

  if (user.otpExpiry < Date.now()) {
    return next(new ApiError(400, "OTP has expired! Request a new OTP."));
  }

  const isMatching = await bcrypt.compare(otp, user.activeOtp);

  if (!isMatching) {
    user.otpAttempts = user.otpAttempts + 1;

    if (user.otpAttempts <= 5) {
      await user.save({ validateBeforeSave: false });
      return next(new ApiError(400, "Incorrect OTP! OTP verification failed."));
    } else {
      return next(
        new ApiError(400, "Too many failed attempts! Generate a new OTP.")
      );
    }
  }

  try {
    await User.findByIdAndUpdate(user._id, {
      $unset: {
        activeOtp: "",
        otpExpiry: "",
        otpAttempts: "",
      },
    });
  } catch (error) {
    return next(
      new ApiError(
        500,
        "Error occurred during verification! OTP verification failed."
      )
    );
  }

  res
    .status(200)
    .json(new ApiResponse(null, "OTP verification completed successfully."));
});
