import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";
import { ApiError } from "../utils/apiError.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);

    const fileName = `${uuid()}-${Date.now()}${ext}`;

    cb(null, fileName);
  },
});

const imageFilter = function (req, file, cb) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new ApiError(400, "Unsupported image file format!"), false);
};

const audioFilter = function (req, file, cb) {
  if (file.fieldname === "audio") {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Invalid audio file format!"), false);
    }
  } else if (file.fieldname === "lyrics") {
    if (
      file.mimetype === "application/octet-stream" ||
      file.originalname.endsWith(".lrc")
    ) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Invalid lyrics file format!"), false);
    }
  } else if (file.fieldname === "coverImage") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Invalid image file format!"), false);
    }
  }
};

const uploadProfileImage = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: imageFilter,
});

const uploadCoverImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFilter,
});

const uploadAudio = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 3,
  },
  fileFilter: audioFilter,
});

export { uploadProfileImage, uploadCoverImage, uploadAudio };
