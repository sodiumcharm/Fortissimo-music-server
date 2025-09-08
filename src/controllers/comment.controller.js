import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Audio } from "../models/audio.model.js";
import { Comment } from "../models/comment.model.js";

export const getComments = asyncHandler(async function (req, res, next) {
  const audioId = req.params?.id;

  const audio = await Audio.findById(audioId).populate({
    path: "comments",
    populate: { path: "user", select: "fullname profileImage" },
  });

  if (!audio) {
    return next(new ApiError(404, "The audio does no longer exist!"));
  }

  res.status(200).json(new ApiResponse({ comments: audio.comments }));
});

export const postComment = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  const { audioId, text } = req.body;

  if (text.trim() === "") {
    return next(new ApiError(400, "Comment text is required!"));
  }

  const audio = await Audio.findById(audioId);

  if (!audio) {
    return next(new ApiError(404, "The audio does no longer exist!"));
  }

  const comment = await Comment.create({
    user: verifiedUser._id,
    audio: audio._id,
    comment: text,
  });

  if (!comment) {
    return next(new ApiError(500, "Failed to post the comment!"));
  }

  await Audio.findByIdAndUpdate(audio._id, {
    $addToSet: { comments: comment._id },
  });

  const createdComment = await Comment.findById(comment._id).populate(
    "user",
    "fullname profileImage"
  );

  res.status(200).json(new ApiResponse({ comment: createdComment }));
});

export const likeComment = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  const commentId = req.params?.id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return next(new ApiError(404, "Comment does not exist!"));
  }

  let liked;

  try {
    if (comment.likeIds.includes(verifiedUser._id)) {
      await Comment.findByIdAndUpdate(comment._id, {
        $inc: { likes: -1 },
        $pull: { likeIds: verifiedUser._id },
      });

      liked = false;
    } else if (!comment.likeIds.includes(verifiedUser._id)) {
      await Comment.findByIdAndUpdate(comment._id, {
        $inc: { likes: 1 },
        $addToSet: { likeIds: verifiedUser._id },
      });

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
        `Comment ID ${comment._id} is ${liked ? "liked" : "unliked"}.`
      )
    );
});

export const deleteComment = asyncHandler(async function (req, res, next) {
  const verifiedUser = req.user;

  const commentId = req.params?.id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return next(new ApiError(404, "Comment does not exist!"));
  }

  if (comment.user.toString() !== verifiedUser._id.toString()) {
    return next(
      new ApiError(
        403,
        "Unauthorised request denied! It is not allowed to delete comment which belongs to other user."
      )
    );
  }

  const [deletedDoc, _] = await Promise.all([
    Comment.findByIdAndDelete(comment._id),
    Audio.findByIdAndUpdate(comment.audio, { $pull: { comments: commentId } }),
  ]);

  if (!deletedDoc) {
    return next(
      new ApiError(500, "Failed to delete the comment due to internal error!")
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(null, `Comment ID ${commentId} is successfully deleted.`)
    );
});
