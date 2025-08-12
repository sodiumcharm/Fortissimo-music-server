import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Audio } from "../models/audio.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

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
      new ApiError(500, "Audio upload failed due to failure of internal error!")
    );
  }

  await audio.populate("uploader", "fullname profileImage");

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "User does not exist! Upload failed."));
  }

  user.uploads.push(audio._id);

  try {
    await user.save();
  } catch (error) {
    return next(new ApiError(500, "Error during updating user!"));
  }

  const audioObj = audio.toObject();

  delete audioObj.audioUploadId;
  delete audioObj.lyricsUploadId;
  delete audioObj.coverImageId;

  res.status(200).json(new ApiResponse({ audio: audioObj }));
});

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

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(new ApiError(404, "User does not exist!"));
  }

  let liked;

  if (user.likedSongs.includes(audioId)) {
    audio.likes -= 1;

    user.likedSongs.splice(user.likedSongs.indexOf(audioId), 1);

    liked = false;
  } else if (!user.likedSongs.includes(audioId)) {
    audio.likes += 1;

    user.likedSongs.push(audioId);

    liked = true;
  }

  try {
    await audio.save({ validateBeforeSave: false });
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    return next(
      new ApiError(500, "Unable to like due to internal server error!")
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        { liked },
        `Audio ID ${audio._id} is ${liked ? "liked" : "de-liked"}.`
      )
    );
});

export const deleteAudio = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const audioId = req.params?.id;

  const audio = await Audio.findById(audioId);

  if (!audio) {
    return next(
      new ApiError(
        404,
        "Failed to delete the audio because it does no longer exist!"
      )
    );
  }

  if (audio.uploader !== verifiedUser._id) {
    return next(
      new ApiError(
        403,
        "Unauthorised request denied! It is not allowed to delete audio which belongs to other user."
      )
    );
  }

  const audioDeleteResult = await deleteFromCloudinary(audio.audioUploadId);

  if (!audioDeleteResult) {
    return next(
      new ApiError(500, "Failed to delete the audio due to internal error!")
    );
  }

  if (audio.lyricsUploadId) {
    const lyricsDeleteResult = await deleteFromCloudinary(audio.lyricsUploadId);

    if (!lyricsDeleteResult) {
      return next(
        new ApiError(
          500,
          "Failed to delete the audio lyrics due to internal error!"
        )
      );
    }
  }

  if (audio.profileImageId) {
    const imageDeleteResult = await deleteFromCloudinary(audio.profileImageId);

    if (!imageDeleteResult) {
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

  const user = await User.findById(verifiedUser._id);

  if (!user) {
    return next(
      new ApiError(500, "Audio was deleted but failed to update the user!")
    );
  }

  user.uploads.splice(user.uploads.indexOf(audioId), 1);

  if (user.likedSongs.includes(audioId)) {
    user.likedSongs.splice(user.likedSongs.indexOf(audioId), 1);
  }

  try {
    await user.save({ validateBeforeSave: false });
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
