import mongoose from "mongoose";

const equalizerSchema = new mongoose.Schema(
  {
    settingsName: {
      type: String,
      trim: true,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    subBass: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    bass: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    lowMid: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    mid: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    highMid: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    treble: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    brilliance: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
    air: {
      type: Number,
      required: true,
      max: 15,
      min: -15,
    },
  },
  { timestamps: true }
);

export const Equalizer = mongoose.model("Equalizer", equalizerSchema);
