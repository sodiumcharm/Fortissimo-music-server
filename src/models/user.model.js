import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required!"],
      unique: true,
      trim: true,
      index: true,
      minlength: 3,
    },
    fullname: {
      type: String,
      required: [true, "Fullname is required!"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required!"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email!"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, "Password is required!"],
      minlength: 8,
    },
    passwordChangedAt: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
    profileImageId: {
      type: String,
      select: false,
    },
    refreshToken: {
      type: String,
    },
    watchHistory: [
      {
        audio: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Audio",
          required: true,
        },
        context: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        playedFromPlaylist: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Playlist",
          default: null,
        },
        playedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    likedSongs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audio",
      },
    ],
    savedPlaylists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Playlist",
      },
    ],
    uploads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audio",
      },
    ],
    createdPlaylists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Playlist",
      },
    ],
    activeOtp: {
      type: String,
      trim: true,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.isPasswordChangedAfter = function (JWTIssueTime) {
  if (this.passwordChangedAt) {
    const passwordChangingTime = this.passwordChangedAt.getTime() / 1000;

    return JWTIssueTime < passwordChangingTime;
  }

  return false;
};

export const User = mongoose.model("User", userSchema);
