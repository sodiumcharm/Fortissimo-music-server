import mongoose from "mongoose";

const audioSchema = new mongoose.Schema(
  {
    audio: {
      type: String,
      required: [true, "Audio link is required!"],
    },
    title: {
      type: String,
      required: [true, "Audio title is required!"],
      trim: true,
    },
    artist: {
      type: String,
      required: [true, "Artist is required!"],
      trim: true,
    },
    lyrics: {
      type: String,
      default: null,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader info is required!"],
    },
    duration: {
      type: Number,
      required: [true, "Audio duration is required!"],
    },
    likes: {
      type: Number,
      default: 0,
    },
    coverImage: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Audio = mongoose.model("Audio", audioSchema);
