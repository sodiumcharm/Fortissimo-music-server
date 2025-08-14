import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Audio } from "../models/audio.model.js";
import { Playlist } from "../models/playlist.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";

// *************************************************************
// GET ALL AUDIOS CONTROLLER
// *************************************************************

export const getAudios = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  let filter = { public: "true" };

  if (verifiedUser) {
    filter = {
      $or: [{ public: "true" }, { uploader: verifiedUser._id }],
    };
  }

  const audios = await Audio.find(filter, {
    __v: 0,
    audioUploadId: 0,
    lyricsUploadId: 0,
    coverImageId: 0,
  }).populate("uploader", "fullname profileImage");

  if (!audios) {
    return next(new ApiError(500, "Failed to load songs!"));
  }

  res.status(200).json(new ApiResponse({ audios }));
});

// *************************************************************
// CREATE NEW AUDIO CONTROLLER
// *************************************************************

export const handleAudioUpload = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const uploadedFiles = req.files;

  if (!uploadedFiles) {
    return next(new ApiError(400, "No files were uploaded!"));
  }

  if (!uploadedFiles.audio || req.files.audio.length === 0) {
    return next(new ApiError(400, "No audio file was uploaded!"));
  }

  const audioInfo = {
    title: req.body?.title,
    artist: req.body?.artist,
    public: req.body?.public,
  };

  if (
    typeof audioInfo.title !== "string" ||
    typeof audioInfo.artist !== "string" ||
    typeof audioInfo.public !== "string"
  ) {
    return next(new ApiError(400, "Invalid data type provided!"));
  }

  if (audioInfo.title.trim() === "") {
    return next(new ApiError(400, "Audio title is required!"));
  }

  if (audioInfo.artist.trim() === "") {
    return next(new ApiError(400, "Audio artist is required!"));
  }

  if (audioInfo.public.trim() === "") {
    return next(new ApiError(400, "Public field is required!"));
  }

  const audioPath = uploadedFiles.audio[0].path;

  let lyricsPath;
  if (uploadedFiles.lyrics && uploadedFiles.lyrics.length !== 0) {
    lyricsPath = uploadedFiles.lyrics[0].path;
  }

  let imagePath;
  if (uploadedFiles.coverImage && uploadedFiles.coverImage.length !== 0) {
    imagePath = uploadedFiles.coverImage[0].path;
  }

  const audioUploadResult = await uploadToCloudinary(audioPath, "songs");

  if (!audioUploadResult) {
    return next(new ApiError(500, "Audio upload failed!"));
  }

  let lyricsUploadResult;
  if (lyricsPath) {
    lyricsUploadResult = await uploadToCloudinary(lyricsPath, "lyrics");

    if (!lyricsUploadResult) {
      return next(new ApiError(500, "Lyrics upload failed!"));
    }
  }

  let imageUploadResult;
  if (imagePath) {
    imageUploadResult = await uploadToCloudinary(imagePath, "coverImages");

    if (!imageUploadResult) {
      return next(new ApiError(500, "Cover image upload failed!"));
    }
  }

  audioInfo.uploader = verifiedUser._id;

  audioInfo.audio = audioUploadResult.url;
  audioInfo.audioUploadId = audioUploadResult.public_id;
  audioInfo.duration = audioUploadResult.duration;

  audioInfo.lyrics = lyricsUploadResult?.url || "";
  audioInfo.lyricsUploadId = lyricsUploadResult?.public_id || "";

  audioInfo.coverImage = imageUploadResult?.url || "";
  audioInfo.coverImageId = imageUploadResult?.public_id || "";

  const audio = await Audio.create(audioInfo);

  if (!audio) {
    return next(
      new ApiError(500, "Audio upload failed due to internal error!")
    );
  }

  const [createdAudio, updatedUser] = await Promise.all([
    Audio.findById(audio._id).populate("uploader", "fullname profileImage"),
    User.findByIdAndUpdate(
      verifiedUser._id,
      { $push: { uploads: audio._id } },
      { new: true }
    ),
  ]);

  if (!createdAudio || !updatedUser) {
    return next(new ApiError(500, "Error during updating user!"));
  }

  res.status(200).json(new ApiResponse({ audio: createdAudio }));
});

// *************************************************************
// LIKE CONTROLLER
// *************************************************************

export const likeAudio = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const audioId = req.params?.id;

  const audio = await Audio.findById(audioId);

  if (!audio) {
    return next(new ApiError(404, "Audio does not exist!"));
  }

  let liked;

  try {
    if (verifiedUser.likedSongs.includes(audioId)) {
      await Promise.all([
        Audio.findByIdAndUpdate(audio._id, { $inc: { likes: -1 } }),
        User.findByIdAndUpdate(verifiedUser._id, {
          $pull: { likedSongs: audioId },
        }),
      ]);

      liked = false;
    } else if (!verifiedUser.likedSongs.includes(audioId)) {
      await Promise.all([
        Audio.findByIdAndUpdate(audio._id, { $inc: { likes: 1 } }),
        User.findByIdAndUpdate(verifiedUser._id, {
          $addToSet: { likedSongs: audioId },
        }),
      ]);

      liked = true;
    }
  } catch (error) {
    return next(
      new ApiError(500, "Unable to register like due to internal server error!")
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        { liked },
        `Audio ID ${audio._id} is ${liked ? "liked" : "unliked"}.`
      )
    );
});

// *************************************************************
// DELETE AUDIO CONTROLLER
// *************************************************************

export const deleteAudio = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const audioId = req.params?.id;

  const audio = await Audio.findById(audioId).select(
    "+audioUploadId +lyricsUploadId +coverImageId"
  );

  if (!audio) {
    return next(
      new ApiError(
        404,
        "Failed to delete the audio because it does no longer exist!"
      )
    );
  }

  if (audio.uploader.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(
        403,
        "Unauthorised request denied! It is not allowed to delete audio which belongs to other user."
      )
    );
  }

  const audioDeleteResult = await deleteFromCloudinary(
    audio.audioUploadId,
    "video"
  );

  if (!audioDeleteResult || audioDeleteResult.result !== "ok") {
    return next(
      new ApiError(500, "Failed to delete the audio due to internal error!")
    );
  }

  if (audio.lyricsUploadId) {
    const lyricsDeleteResult = await deleteFromCloudinary(
      audio.lyricsUploadId,
      "raw"
    );

    if (!lyricsDeleteResult || lyricsDeleteResult.result !== "ok") {
      return next(
        new ApiError(
          500,
          "Failed to delete the audio lyrics due to internal error!"
        )
      );
    }
  }

  if (audio.coverImageId) {
    const imageDeleteResult = await deleteFromCloudinary(
      audio.coverImageId,
      "image"
    );

    if (!imageDeleteResult || imageDeleteResult.result !== "ok") {
      return next(
        new ApiError(
          500,
          "Failed to delete the audio cover image due to internal error!"
        )
      );
    }
  }

  const deletedDoc = await Audio.findByIdAndDelete(audioId);

  if (!deletedDoc) {
    return next(
      new ApiError(500, "Failed to delete the audio due to internal error!")
    );
  }

  try {
    await Promise.all([
      User.updateOne(
        { _id: verifiedUser._id },
        { $pull: { uploads: audioId } }
      ),
      User.updateMany(
        { likedSongs: audioId },
        { $pull: { likedSongs: audioId } }
      ),
      User.updateMany({}, { $pull: { watchHistory: { audio: audioId } } }),
      Playlist.updateMany(
        { songs: audioId },
        { $pull: { songs: audioId }, $inc: { totalDuration: -audio.duration } }
      ),
    ]);
  } catch (error) {
    return next(
      new ApiError(500, "Audio was deleted but failed to update the user!")
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(null, `Audio ID ${audioId} is successfully deleted.`)
    );
});

// *************************************************************
// AUDIO EDIT CONTROLLER
// *************************************************************

export const editAudio = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const { id, title, artist, access } = req.body;

  if (!id || id.trim() === "") {
    return next(new ApiError(400, "Audio id is required!"));
  }

  const audio = await Audio.findById(id).select(
    "+audioUploadId +lyricsUploadId +coverImageId"
  );

  if (!audio) {
    return next(new ApiError(404, "This audio does no longer exist!"));
  }

  const uploadedFiles = req.files;

  let lyricsPath, imagePath;

  if (uploadedFiles) {
    if (uploadedFiles.lyrics && uploadedFiles.lyrics.length !== 0) {
      lyricsPath = uploadedFiles.lyrics[0].path;
    }

    if (uploadedFiles.coverImage && uploadedFiles.coverImage.length !== 0) {
      imagePath = uploadedFiles.coverImage[0].path;
    }
  }

  let lyricsUploadResult;
  if (lyricsPath) {
    if (audio.lyricsUploadId) {
      const deleteResult = await deleteFromCloudinary(
        audio.lyricsUploadId,
        "raw"
      );

      if (!deleteResult || deleteResult.result !== "ok") {
        return next(new ApiError(500, "Failed to update lyrics!"));
      }
    }

    lyricsUploadResult = await uploadToCloudinary(lyricsPath, "lyrics");

    if (!lyricsUploadResult) {
      return next(new ApiError(500, "Failed to upload lyrics!"));
    }
  }

  let imageUploadResult;
  if (imagePath) {
    if (audio.coverImageId) {
      const deleteResult = await deleteFromCloudinary(
        audio.coverImageId,
        "image"
      );

      if (!deleteResult || deleteResult.result !== "ok") {
        return next(new ApiError(500, "Failed to update cover image!"));
      }
    }

    imageUploadResult = await uploadToCloudinary(imagePath, "coverImages");

    if (!imageUploadResult) {
      return next(new ApiError(500, "Failed to upload cover image!"));
    }
  }

  if (title && title.trim() !== "") {
    audio.title = title;
  }

  if (artist && artist.trim() !== "") {
    audio.artist = artist;
  }

  if (access && access.trim() !== "") {
    audio.public = access;
  }

  if (lyricsUploadResult) {
    audio.lyrics = lyricsUploadResult.url;
    audio.lyricsUploadId = lyricsUploadResult.public_id;
  }

  if (imageUploadResult) {
    audio.coverImage = imageUploadResult.url;
    audio.coverImageId = imageUploadResult.public_id;
  }

  try {
    await audio.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Failed to update the audio!"));
  }

  const updatedAudio = await Audio.findById(audio._id);

  if (!updatedAudio) {
    return next(new ApiError(500, "Failed to retrieve the updated audio!"));
  }

  res.status(200).json(new ApiResponse({ audio: updatedAudio }));
});

// *************************************************************
// REMOVE LYRICS CONTROLLER
// *************************************************************

export const removeLyrics = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const audioId = req.params?.id;

  const audio = await Audio.findById(audioId).select("+lyricsUploadId");

  if (!audio) {
    return next(new ApiError(404, "Audio does no longer exist!"));
  }

  if (!audio.lyrics) {
    return next(new ApiError(400, "Audio does not has lyrics to remove!"));
  }

  if (audio.lyricsUploadId) {
    const deleteResult = await deleteFromCloudinary(
      audio.lyricsUploadId,
      "raw"
    );

    if (!deleteResult || deleteResult.result !== "ok") {
      return next(new ApiError(500, "Failed to remove the lyrics!"));
    }
  }

  audio.lyrics = "";
  audio.lyricsUploadId = "";

  try {
    await audio.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Failed to update the user!"));
  }

  res
    .status(200)
    .json(new ApiResponse(null, "The audio lyrics is successfully removed."));
});

// *************************************************************
// REMOVE COVER IMAGE CONTROLLER
// *************************************************************

export const removeCoverImage = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const audioId = req.params?.id;

  const audio = await Audio.findById(audioId).select("+coverImageId");

  if (!audio) {
    return next(new ApiError(404, "Audio does no longer exist!"));
  }

  if (!audio.coverImage) {
    return next(new ApiError(400, "Audio does not has cover image to remove!"));
  }

  if (audio.coverImageId) {
    const deleteResult = await deleteFromCloudinary(
      audio.coverImageId,
      "image"
    );

    if (!deleteResult || deleteResult.result !== "ok") {
      return next(new ApiError(500, "Failed to remove the cover image!"));
    }
  }

  audio.coverImage = "";
  audio.coverImageId = "";

  try {
    await audio.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Failed to update the user!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(null, "The audio cover image is successfully removed.")
    );
});

// *************************************************************
// HISTORY RECORDING CONTROLLER
// *************************************************************

export const recordHistory = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return res.status(204).end();
  }

  const { audioId, context, playlistId } = req.body;

  const audio = await Audio.findById(audioId);

  if (!audio) {
    return next(new ApiError(404, "The following audio does not exist!"));
  }

  let playlist;

  if (playlistId) {
    playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return next(new ApiError(404, "The following playlist does not exist!"));
    }
  }

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "The user does no longer exist!"));
  }

  const history = {
    audio: audio._id,
    context,
    playedFromPlaylist: playlistId || null,
    playedAt: Date.now(),
  };

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $push: {
        watchHistory: {
          $each: [history],
          $position: 0,
          $slice: 50,
        },
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return next(new ApiError(500, "Failed to register it in history!"));
  }

  const newHistory = updatedUser.watchHistory[0];

  res.status(200).json(new ApiResponse({ history: newHistory }));
});
