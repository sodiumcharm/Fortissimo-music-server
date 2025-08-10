import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Playlist title is required!"],
      trim: true,
    },
    coverImage: {
      type: String,
    },
    description: {
      type: String,
      trim: true,
    },
    genre: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Playlist Creator is required!"],
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audio",
      },
    ],
    totalDuration: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
    private: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
