import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import {
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidUsername,
} from "../utils/validators.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import bcrypt from "bcrypt";

const accessTokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 1000 * 60 * 60 * 24 * 15,
};

const refreshTokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 1000 * 60 * 60 * 24 * 30,
};

// *************************************************************
// GET USER DETAIL AT APP LOAD CONTROLLER
// *************************************************************

export const getUserDetails = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const user = await User.findById(verifiedUser._id)
    .populate({
      path: "watchHistory.audio",
      select: "audio title coverImage artist",
    })
    .select("-password -refreshToken -__v");

  if (!user) {
    return next(new ApiError(401, "User does not exist!"));
  }

  res.status(200).json(new ApiResponse({ user }));
});

// *************************************************************
// GET OTHER USER DETAIL AT APP LOAD CONTROLLER
// *************************************************************

export const getOtherUser = asyncHandler(async function (req, res, next) {
  const userId = req.params?.id;

  const user = await User.findById(userId).select(
    "fullname username profileImage uploads createdPlaylists"
  );

  if (!user) {
    return next(new ApiError(404, "Invalid user ID or user does not exist!"));
  }

  res.status(200).json(new ApiResponse({ user }));
});

// *************************************************************
// SIGN UP CONTROLLER
// *************************************************************

export const registerUser = asyncHandler(async function (req, res, next) {
  // Extraction of necessary user info from body
  const userInfo = {
    fullname: String(req.body?.fullname),
    username: String(req.body?.username),
    email: String(req.body?.email),
    password: String(req.body?.password),
  };

  // Check for empty field values
  if (userInfo.fullname.trim() === "") {
    return next(new ApiError(400, "Full name is required for sign up!"));
  } else if (userInfo.username.trim() === "") {
    return next(new ApiError(400, "A new username is required for sign up!"));
  } else if (userInfo.email.trim() === "") {
    return next(new ApiError(400, "Email address is required for sign up!"));
  } else if (userInfo.password.trim() === "") {
    return next(new ApiError(400, "A new password is required for sign up!"));
  }

  // Check whether the full name is valid or not
  if (!isValidName(userInfo.fullname)) {
    return next(
      new ApiError(
        400,
        "This name is not accepted! Full names must contain at least two letters and should not contain digits or special characters."
      )
    );
  }

  // Check whether the username is valid or not
  if (!isValidUsername(userInfo.username)) {
    return next(
      new ApiError(
        400,
        "This username is not accepted! Usernames must have length between 3-20 and special characters are not allowed."
      )
    );
  }

  // Check whether the email is valid or not
  if (!isValidEmail(userInfo.email)) {
    return next(new ApiError(400, "Invalid Email Address!"));
  }

  // Check whether the password is valid or not
  if (!isValidPassword(userInfo.password)) {
    return next(
      new ApiError(
        400,
        "Password must have at least 8 characters, one uppercase letter, one lowercase letter, a number and a special character!"
      )
    );
  }

  // Check for existing user
  const existingUsername = await User.findOne({ username: userInfo.username });
  if (existingUsername) {
    return next(new ApiError(409, "This username is already taken!"));
  }

  const existingEmail = await User.findOne({ email: userInfo.email });
  if (existingEmail) {
    return next(new ApiError(409, "This email address is already registered!"));
  }

  // Get file path from multer middleware if user uploaded profile photo
  let profileImagePath;
  if (req.file) {
    profileImagePath = req.file.path;
  }

  // Upload to cloudinary
  let uploadResult;

  if (profileImagePath) {
    uploadResult = await uploadToCloudinary(profileImagePath, "profiles");

    if (!uploadResult) {
      return next(
        new ApiError(
          500,
          "Failed to upload the profile image! Please try again."
        )
      );
    }
  }

  // Getting Cloudinary image url if uploaded successfully
  const imageUrl = uploadResult?.url || "";
  const imageId = uploadResult?.public_id || "";

  userInfo.profileImage = imageUrl;
  userInfo.profileImageId = imageId;

  // Creating user document and store at MongoDB Atlas
  const newUser = await User.create(userInfo);

  if (!newUser) {
    return next(new ApiError(500, "Sign up failed! Please try again."));
  }

  // Filter only necessary info for a response
  const createdUser = await User.findById(newUser._id).select(
    "fullname username email profileImage"
  );

  if (!createdUser) {
    return next(new ApiError(500, "Error during registration!"));
  }

  res.status(200).json(new ApiResponse({ user: createdUser }));
});

// *************************************************************
// LOGIN CONTROLLER
// *************************************************************

export const loginUser = asyncHandler(async function (req, res, next) {
  const { identifier, password } = req.body;

  // Check the incoming data type
  if (typeof identifier !== "string" || typeof password !== "string") {
    return next(new ApiError(400, "Wrong input type detected!"));
  }

  // Check for empty field value
  if (identifier.trim() === "") {
    return next(
      new ApiError(400, "Username or email address is required for login!")
    );
  }

  // Check whether the incoming identifier and password are valid or not
  let email, username;

  if (!isValidUsername(identifier) && !isValidEmail(identifier)) {
    return next(
      new ApiError(400, "Invalid username or email address! Please try again.")
    );
  }

  if (!isValidPassword(password)) {
    return next(new ApiError(400, "Invalid Password! Please try again."));
  }

  // Classifying variables based on identifier type
  let usedField;

  if (isValidUsername(identifier)) {
    username = identifier.trim();
    usedField = "username";
  }

  if (isValidEmail(identifier)) {
    email = identifier.trim().toLowerCase();
    usedField = "email address";
  }

  // Find user based on either username or email
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  // Check whether user exists with following identifier or the password is correct
  if (!user || !(await user.isPasswordCorrect(password))) {
    return next(new ApiError(400, `Incorrect ${usedField} or password!`));
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Hashification
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

  // Check for token generation error
  if (!accessToken || !refreshToken) {
    return next(new ApiError(500, "Failed to generate authentication tokens!"));
  }

  // Update user by adding refresh token
  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { $set: { refreshToken: hashedRefreshToken } },
    { new: true }
  )
    .populate({
      path: "watchHistory.audio",
      select: "audio title coverImage artist",
    })
    .select("-password -refreshToken -__v");

  if (!updatedUser) {
    return next(new ApiError(500, "Failed to save refresh token! Try again."));
  }

  // Give response with cookies
  res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(new ApiResponse({ user: updatedUser }));
});

// *************************************************************
// REFRESH ACCESS TOKEN CONTROLLER
// *************************************************************

export const refreshAccess = asyncHandler(async function (req, res, next) {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    return next(new ApiError(401, "Refresh token is required!"));
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decoded) {
      return next(new ApiError(401, "Invalid or expired refresh token!"));
    }

    const user = await User.findById(decoded._id);

    if (!user) {
      return next(new ApiError(401, "User does no longer exist!"));
    }

    if (user.isPasswordChangedAfter(decoded.iat)) {
      return next(
        new ApiError(
          401,
          "User changed password after issuing this token! Please login again."
        )
      );
    }

    const isMatching = await bcrypt.compare(
      incomingRefreshToken,
      user.refreshToken
    );

    if (!isMatching) {
      return next(new ApiError(401, "Refresh token does not match!"));
    }

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    user.refreshToken = hashedRefreshToken;

    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .cookie("accessToken", newAccessToken, accessTokenOptions)
      .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
      .json(new ApiResponse(null, "Access token refreshed successfully."));
  } catch (error) {
    return next(new ApiError(401, "Invalid or expired refresh token!"));
  }
});

// *************************************************************
// LOGOUT CONTROLLER
// *************************************************************

export const logoutUser = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(new ApiError(401, "Unauthorized request denied!"));
  }

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  user.refreshToken = undefined;

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Error occurred during logout!"));
  }

  res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("refreshToken", refreshTokenOptions)
    .json(new ApiResponse(null, "User logged out successfully."));
});

// *************************************************************
// FORGOT PASSWORD RESET CONTROLLER
// *************************************************************

export const passwordReset = asyncHandler(async function (req, res, next) {
  let { newPassword, email } = req.body;

  if (typeof newPassword !== "string" || typeof email !== "string") {
    return next(new ApiError(400, "Invalid input type provided!"));
  }

  if (newPassword.trim() === "") {
    return next(new ApiError(400, "New password is required!"));
  }

  if (email.trim() === "") {
    return next(new ApiError(400, "Email address is required!"));
  }

  email = email.trim();

  if (!isValidPassword(newPassword)) {
    return next(
      new ApiError(
        400,
        "Password must have at least 8 characters, one uppercase letter, one lowercase letter, a number and a special character!"
      )
    );
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Failed to save new password!"));
  }

  res.status(200).json(new ApiResponse(null, "Password reset is successful."));
});

// *************************************************************
// PASSWORD CHANGE CONTROLLER
// *************************************************************

export const changePassword = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const { oldPassword, newPassword } = req.body;

  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    return next(new ApiError(400, "Invalid input type provided!"));
  }

  if (oldPassword.trim() === "") {
    return next(
      new ApiError(400, "Old password is required to set a new one!")
    );
  }

  if (newPassword.trim() === "") {
    return next(new ApiError(400, "New password is required!"));
  }

  if (!isValidPassword(oldPassword)) {
    return next(
      new ApiError(
        400,
        "Invalid password! Your old Passwords must have at least 8 characters, one uppercase letter, one lowercase letter, a number and a special character!"
      )
    );
  }

  if (!isValidPassword(newPassword)) {
    return next(
      new ApiError(
        400,
        "New password must have at least 8 characters, one uppercase letter, one lowercase letter, a number and a special character!"
      )
    );
  }

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  const oldIsMatching = await user.isPasswordCorrect(oldPassword);

  if (!oldIsMatching) {
    return next(new ApiError(400, "Incorrect old password!"));
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Password change failed!"));
  }

  res
    .status(200)
    .json(new ApiResponse(null, "Password is successfully changed."));
});

// *************************************************************
// NAME CHANGE CONTROLLER
// *************************************************************

export const changeName = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  let newFullname = req.body?.newFullname;

  if (typeof newFullname !== "string") {
    return next(new ApiError(400, "Invalid input type provided!"));
  }

  if (newFullname.trim() === "") {
    return next(new ApiError(400, "New full name is required!"));
  }

  if (!isValidName(newFullname)) {
    return next(
      new ApiError(
        400,
        "This name is not accepted! Full names must contain at least two letters and should not contain digits or special characters."
      )
    );
  }

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  user.fullname = newFullname;

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Name change failed!"));
  }

  res.status(200).json(new ApiResponse(null, "Name is successfully changed."));
});

// *************************************************************
// PROFILE IMAGE CHANGE CONTROLLER
// *************************************************************

export const changeProfilePhoto = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const imageFile = req.file;

  if (!imageFile) {
    return next(new ApiError(400, "New image is required!."));
  }

  const user = await User.findById(verifiedUser._id).select("+profileImageId");

  if (!user) {
    return next(new ApiError(404, "User does not exist! Image upload failed."));
  }

  if (user.profileImageId) {
    const deleteResult = await deleteFromCloudinary(
      user.profileImageId,
      "image"
    );

    if (!deleteResult) {
      return next(
        new ApiError(
          500,
          "Image upload failed because of internal server error!."
        )
      );
    }
  }

  const filePath = req.file.path;

  const uploadResult = await uploadToCloudinary(filePath, "profiles");

  if (!uploadResult) {
    return next(
      new ApiError(
        500,
        "Image upload failed because of internal server error!."
      )
    );
  }

  user.profileImage = uploadResult.url;
  user.profileImageId = uploadResult.public_id;

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(
      new ApiError(
        500,
        "Image upload failed because of internal server error!."
      )
    );
  }

  res
    .status(200)
    .json(new ApiResponse(null, "New profile image is uploaded successfully."));
});

// *************************************************************
// REMOVE PROFILE IMAGE CONTROLLER
// *************************************************************

export const removeProfilePhoto = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const user = await User.findById(verifiedUser._id).select("+profileImageId");

  if (!user) {
    return next(
      new ApiError(404, "User does not exist! Failed to remove image.")
    );
  }

  if (!user.profileImage) {
    return next(
      new ApiError(400, "User does not has profile image to remove!")
    );
  }

  if (user.profileImageId) {
    const deleteResult = await deleteFromCloudinary(
      user.profileImageId,
      "image"
    );

    if (!deleteResult || deleteResult.result !== "ok") {
      return next(
        new ApiError(
          500,
          "Failed to remove image because of internal server error!."
        )
      );
    }
  }

  user.profileImage = "";
  user.profileImageId = "";

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(
      new ApiError(
        500,
        "Failed to remove image because of internal server error!."
      )
    );
  }

  res
    .status(200)
    .json(new ApiResponse(null, "Profile image is successfully removed."));
});
