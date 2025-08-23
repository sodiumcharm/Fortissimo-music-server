import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Audio } from "../models/audio.model.js";
import { Playlist } from "../models/playlist.model.js";
import genAI from "../utils/gemini.js";
import { personality, appFeatures, appInfo } from "../utils/prompts.js";

export const geminiAI = asyncHandler(async function (req, res, next) {
  const fullname = req.user?.fullname;

  const message = req.body?.message;

  if (message.trim() === "") {
    return next(new ApiError(400, "You sent a blank prompt."));
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent([
      personality,
      appFeatures,
      appInfo,
      `Fullname of User: ${fullname}`,
      `User asked this now: ${message}`,
    ]);

    const reply = result.response.text();

    res.status(200).json(new ApiResponse(null, reply));
  } catch (error) {
    if (error.message.includes("Quota") || error.status === 429) {
      return next(
        new ApiError(429, "AI quota exceeded. Please try again later.")
      );
    }

    return next(new ApiError(500, "Something went wrong with AI."));
  }
});
