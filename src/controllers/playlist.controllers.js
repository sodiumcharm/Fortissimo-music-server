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

export const getPlaylists = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  let filter = { public: "true" };

  if (verifiedUser) {
    filter = {
      $or: [{ public: "true" }, { creator: verifiedUser._id }],
    };
  }

  const playlists = await Playlist.find(filter, {
    __v: 0,
    coverImageId: 0,
  }).populate("creator", "fullname profileImage");

  if (!playlists) {
    return next(new ApiError(500, "Failed to load playlists!"));
  }

  res.status(200).json(new ApiResponse({ playlists }));
});

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

  playlistInfo.coverImage = uploadResult?.secure_url || "";
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

  await User.updateMany({}, { $pull: { watchHistory: { audio: audioId, playedFromPlaylist: playlistId } } });

  if (!updatedPlaylist) {
    return next(
      new ApiError(500, "Failed to remove the audio from the playlist!")
    );
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

export const savePlaylist = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const playlistId = req.params?.id;

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    return next(new ApiError(404, "Playlist does not exist!"));
  }

  let saved;

  try {
    if (verifiedUser.savedPlaylists.includes(playlistId)) {
      await Promise.all([
        Playlist.findByIdAndUpdate(playlist._id, { $inc: { saves: -1 } }),
        User.findByIdAndUpdate(verifiedUser._id, {
          $pull: { savedPlaylists: playlistId },
        }),
      ]);

      saved = false;
    } else if (!verifiedUser.savedPlaylists.includes(playlistId)) {
      await Promise.all([
        Playlist.findByIdAndUpdate(playlist._id, { $inc: { saves: 1 } }),
        User.findByIdAndUpdate(verifiedUser._id, {
          $addToSet: { savedPlaylists: playlistId },
        }),
      ]);

      saved = true;
    }
  } catch (error) {
    return next(
      new ApiError(500, "Unable to save due to internal server error!")
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        { saved },
        `Playlist ID ${playlist._id} is ${saved ? "saved" : "unsaved"}.`
      )
    );
});

export const deletePlaylist = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const playlistId = req.params?.id;

  const playlist = await Playlist.findById(playlistId).select("+coverImageId");

  if (!playlist) {
    return next(
      new ApiError(
        404,
        "Failed to delete the playlist because it does no longer exist!"
      )
    );
  }

  if (playlist.creator.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(
        403,
        "Unauthorised request denied! It is not allowed to delete playlist which belongs to other user."
      )
    );
  }

  if (playlist.coverImageId) {
    const imageDeleteResult = await deleteFromCloudinary(
      playlist.coverImageId,
      "image"
    );

    if (!imageDeleteResult || imageDeleteResult.result !== "ok") {
      return next(
        new ApiError(
          500,
          "Failed to delete the playlist due to internal error!"
        )
      );
    }
  }

  const deletedDoc = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedDoc) {
    return next(
      new ApiError(500, "Failed to delete the audio due to internal error!")
    );
  }

  try {
    await Promise.all([
      User.updateOne(
        { _id: verifiedUser._id },
        { $pull: { createdPlaylists: playlistId } }
      ),
      User.updateMany(
        { savedPlaylists: playlistId },
        { $pull: { savedPlaylists: playlistId } }
      ),
      User.updateMany(
        {},
        { $pull: { watchHistory: { playedFromPlaylist: playlistId } } }
      ),
    ]);
  } catch (error) {
    return next(
      new ApiError(500, "Playlist was deleted but failed to update the user!")
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        null,
        `Playlist ID ${playlistId} is successfully deleted.`
      )
    );
});

export const removeCoverImage = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const playlistId = req.params?.id;

  const playlist = await Playlist.findById(playlistId).select("+coverImageId");

  if (!playlist) {
    return next(new ApiError(404, "Playlist does no longer exist!"));
  }

  if (!playlist.coverImage) {
    return next(
      new ApiError(400, "Playlist does not has cover image to remove!")
    );
  }

  if (playlist.coverImageId) {
    const deleteResult = await deleteFromCloudinary(
      playlist.coverImageId,
      "image"
    );

    if (!deleteResult || deleteResult.result !== "ok") {
      return next(new ApiError(500, "Failed to remove the cover image!"));
    }
  }

  playlist.coverImage = "";
  playlist.coverImageId = "";

  try {
    await playlist.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Failed to update the user!"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(null, "The playlist cover image is successfully removed.")
    );
});

export const editPlaylist = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  if (!verifiedUser) {
    return next(
      new ApiError(401, "Unauthorized request denied! Please login first.")
    );
  }

  const { id, title, genre, description, access } = req.body;

  if (!id || id.trim() === "") {
    return next(new ApiError(400, "Playlist id is required!"));
  }

  const playlist = await Playlist.findById(id).select("+coverImageId");

  if (!playlist) {
    return next(new ApiError(404, "This playlist does no longer exist!"));
  }

  if (playlist.creator.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(
        400,
        "It is not allowed to edit playlist uploaded by others!"
      )
    );
  }

  const uploadedFile = req.file;

  let imagePath;

  if (uploadedFile) {
    imagePath = uploadedFile.path;
  }

  let imageUploadResult;

  if (imagePath) {
    if (playlist.coverImageId) {
      const deleteResult = await deleteFromCloudinary(
        playlist.coverImageId,
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
    playlist.title = title;
  }

  if (description && description.trim() !== "") {
    playlist.description = description;
  }

  if (genre && genre.trim() !== "") {
    playlist.genre = genre;
  }

  if (access && access.trim() !== "") {
    playlist.public = access;
  }

  if (imageUploadResult) {
    playlist.coverImage = imageUploadResult.secure_url;
    playlist.coverImageId = imageUploadResult.public_id;
  }

  try {
    if (playlist.public === "false") {
      await User.updateMany(
        {},
        {
          $pull: {
            savedPlaylists: playlist._id,
            watchHistory: { playedFromPlaylist: playlist._id },
          },
        }
      );
    }

    await playlist.save({ validateBeforeSave: false });
  } catch (error) {
    return next(new ApiError(500, "Failed to update the playlist!"));
  }

  const updatedPlaylist = await Playlist.findById(playlist._id);

  if (!updatedPlaylist) {
    return next(new ApiError(500, "Failed to retrieve the updated playlist!"));
  }

  res.status(200).json(new ApiResponse({ playlist: updatedPlaylist }));
});
