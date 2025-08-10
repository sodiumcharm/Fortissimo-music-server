import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";

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
  else cb(new Error("Multer Complaining: Unsupported image type."), false);
};

const uploadProfileImage = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: imageFilter,
});

export { uploadProfileImage };
