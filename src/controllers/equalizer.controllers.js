import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Equalizer } from "../models/equalizer.model.js";

export const getPresets = asyncHandler(async function (req, res, next) {
  const presets = await Equalizer.find().populate(
    "creator",
    "fullname profileImage"
  );

  if (!presets) {
    return next(new ApiError(500, "Failed to load presets!"));
  }

  res.status(200).json(new ApiResponse({ presets }));
});

export const createPreset = asyncHandler(async function (req, res, next) {
  const min = -15;
  const max = 15;

  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const presetInfo = {
    presetName: String(req.body?.presetName),
    subBass: Number(req.body?.subBass),
    bass: Number(req.body?.bass),
    lowMid: Number(req.body?.lowMid),
    mid: Number(req.body?.mid),
    highMid: Number(req.body?.highMid),
    treble: Number(req.body?.treble),
    brilliance: Number(req.body?.brilliance),
    air: Number(req.body?.air),
  };

  if (
    presetInfo.subBass > max ||
    presetInfo.bass > max ||
    presetInfo.lowMid > max ||
    presetInfo.mid > max ||
    presetInfo.highMid > max ||
    presetInfo.treble > max ||
    presetInfo.brilliance > max ||
    presetInfo.air > max
  ) {
    return next(new ApiError(400, "Maximum allowed value is 15dB!"));
  }

  if (
    presetInfo.subBass < min ||
    presetInfo.bass < min ||
    presetInfo.lowMid < min ||
    presetInfo.mid < min ||
    presetInfo.highMid < min ||
    presetInfo.treble < min ||
    presetInfo.brilliance < min ||
    presetInfo.air < min
  ) {
    return next(new ApiError(400, "Minimum allowed value is -15dB!"));
  }

  presetInfo.creator = verifiedUser._id;

  const preset = await Equalizer.create(presetInfo);

  if (!preset) {
    return next(new ApiError(500, "Failed to create upload the preset!"));
  }

  const updatedUser = await User.findByIdAndUpdate(
    verifiedUser._id,
    { $push: { publishedPresets: preset._id } },
    { new: true }
  );

  await preset.populate("creator", "fullname");

  if (!updatedUser) {
    return next(new ApiError(500, "Failed to update the user!"));
  }

  res.status(200).json(new ApiResponse({ preset }));
});

export const importPreset = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const presetId = req.params?.id;

  const preset = await Equalizer.findById(presetId);

  if (!preset) {
    return next(new ApiError(404, "This preset does no longer exist!"));
  }

  const updatedUser = await User.findByIdAndUpdate(
    verifiedUser._id,
    {
      $push: { importedPresets: preset._id },
    },
    { new: true }
  );

  if (!updatedUser) {
    return next(new ApiError(500, "Failed to import the preset!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(null, `Preset Id: ${presetId} is successfully imported.`)
    );
});

export const removeImport = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const presetId = req.params?.id;

  const updatedUser = await User.findByIdAndUpdate(
    verifiedUser._id,
    {
      $pull: { importedPresets: presetId },
    },
    { new: true }
  );

  if (!updatedUser) {
    return next(new ApiError(500, "Failed to remove the imported preset!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        null,
        `Preset Id: ${presetId} is successfully removed from your imports.`
      )
    );
});

export const deletePreset = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const presetId = req.params?.id;

  const preset = await Equalizer.findById(presetId);

  if (!preset) {
    return next(new ApiError(404, "This preset does no longer exist!"));
  }

  if (preset.creator.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(400, "It is not allowed to delete presets of other user!")
    );
  }

  try {
    await Promise.all([
      Equalizer.findByIdAndDelete(preset._id),
      User.findByIdAndUpdate(verifiedUser._id, {
        $pull: { publishedPresets: preset._id },
      }),
      User.updateMany(
        { importedPresets: preset._id },
        { $pull: { importedPresets: preset._id } }
      ),
    ]);
  } catch (error) {
    return next(new ApiError(500, "Error while deleting the preset!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(null, `Preset Id: ${presetId} is successfully deleted.`)
    );
});
