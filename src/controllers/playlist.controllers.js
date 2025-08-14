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

export const createPlaylist = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const playlistInfo = {
    title: req.body?.title,
    description: req.body?.description || "",
    genre: req.body?.genre,
    public: req.body?.public,
  };

  if (!playlistInfo.title || playlistInfo.title.trim() === "") {
    return next(new ApiError(400, "Title is required field!"));
  } else if (!playlistInfo.genre || playlistInfo.genre.trim() === "") {
    return next(new ApiError(400, "Genre is required field!"));
  } else if (!playlistInfo.public || playlistInfo.public.trim() === "") {
    return next(new ApiError(400, "Public is required field!"));
  }

  if (playlistInfo.description.length > 200) {
    return next(
      new ApiError(400, "Maximum 200 characters are allowed in description!")
    );
  }

  let imagePath;

  if (req.file) {
    imagePath = req.file.path;
  }

  let uploadResult;

  if (imagePath) {
    uploadResult = await uploadToCloudinary(imagePath, "coverImages");

    if (!uploadResult) {
      return next(new ApiError(500, "Failed to upload the cover image!"));
    }
  }

  playlistInfo.coverImage = uploadResult?.url || "";
  playlistInfo.coverImageId = uploadResult?.public_id || "";
  playlistInfo.creator = verifiedUser._id;

  const playlist = await Playlist.create(playlistInfo);

  if (!playlist) {
    return next(new ApiError(500, "Failed to create the playlist!"));
  }

  let newPlaylist, _;

  try {
    [newPlaylist, _] = await Promise.all([
      Playlist.findById(playlist._id).populate(
        "creator",
        "fullname profileImage"
      ),
      User.findByIdAndUpdate(verifiedUser._id, {
        $push: { createdPlaylists: playlist._id },
      }),
    ]);
  } catch (error) {
    return next(new ApiError(500, "Failed to update the user!"));
  }

  res.status(200).json(new ApiResponse({ playlist: newPlaylist }));
});

export const addAudio = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const { audioId, playlistId } = req.body;

  if (typeof audioId !== "string" || typeof playlistId !== "string") {
    return next(new ApiError(400, "Invalid input type provided!"));
  }

  if (audioId.trim() === "") {
    return next(new ApiError(400, "Audio ID is required!"));
  }

  if (playlistId.trim() === "") {
    return next(new ApiError(400, "Playlist ID is required!"));
  }

  const [playlist, audio] = await Promise.all([
    Playlist.findById(playlistId),
    Audio.findById(audioId),
  ]);

  if (!playlist) {
    return next(new ApiError(404, "Playlist does no longer exist!"));
  }

  if (!audio) {
    return next(new ApiError(404, "This audio does no longer exist!"));
  }

  if (playlist.creator.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(
        400,
        "Adding audios to playlists which belongs to other user is not allowed!"
      )
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: { songs: audioId },
      $inc: { totalDuration: audio.duration },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    return next(new ApiError(500, "Failed to add the audio in the playlist!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        null,
        `Audio id: ${audioId} is successfully added to your playlist.`
      )
    );
});

export const removeAudio = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const { audioId, playlistId } = req.body;

  if (typeof audioId !== "string" || typeof playlistId !== "string") {
    return next(new ApiError(400, "Invalid input type provided!"));
  }

  if (audioId.trim() === "") {
    return next(new ApiError(400, "Audio ID is required!"));
  }

  if (playlistId.trim() === "") {
    return next(new ApiError(400, "Playlist ID is required!"));
  }

  const [playlist, audio] = await Promise.all([
    Playlist.findById(playlistId),
    Audio.findById(audioId),
  ]);

  if (!playlist) {
    return next(new ApiError(404, "Playlist does no longer exist!"));
  }

  if (!audio) {
    return next(new ApiError(404, "This audio does no longer exist!"));
  }

  if (playlist.creator.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(
        400,
        "Removing audios from playlists which belongs to other user is not allowed!"
      )
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { songs: audioId },
      $inc: { totalDuration: -audio.duration },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    return next(new ApiError(500, "Failed to remove the audio from the playlist!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        null,
        `Audio id: ${audioId} is successfully removed from your playlist.`
      )
    );
});