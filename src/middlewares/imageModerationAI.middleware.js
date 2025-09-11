import fs from "fs/promises";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import genAI from "../utils/gemini.js";
import { imageModerationPrompt } from "../utils/prompts.js";

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const imageCheckerAI = asyncHandler(async function (req, res, next) {
  let files = [];

  // collect files
  if (req.file) files.push(req.file);

  if (req.files && Array.isArray(req.files)) files.push(...req.files);
  
  if (req.files && typeof req.files === "object") {
    Object.values(req.files).forEach((arr) => files.push(...arr));
  }

  // filter only images
  const imageFiles = files.filter((file) => file.mimetype.startsWith("image/"));
  if (imageFiles.length === 0) return next();

  try {
    for (const file of imageFiles) {
      const buffer = await fs.readFile(file.path);
      const base64Image = buffer.toString("base64");

      const result = await model.generateContent([
        { text: imageModerationPrompt },
        {
          inlineData: {
            data: base64Image,
            mimeType: file.mimetype,
          },
        },
      ]);

      const response = result.response.text().trim().toLowerCase();

      if (response !== "safe") {
        return next(
          new ApiError(
            400,
            "Your uploaded image contains sensitive or controversial elements! Please choose a different one."
          )
        );
      }
    }
  } catch (error) {
    console.error("Image moderation error:", error);
    return next(new ApiError(500, "Image moderation error! Please try again."));
  }

  next();
});
