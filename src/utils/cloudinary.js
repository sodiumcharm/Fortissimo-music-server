import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const safelyDeleteFile = async function (path) {
  try {
    await fs.unlink(path);
  } catch (error) {
    console.log("Failed to delete local file!", error.message);
  }
};

const uploadToCloudinary = async function (localPath, cloudinaryFilePath) {
  try {
    if (!localPath) return null;

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto",
      folder: `Fortissimo/${cloudinaryFilePath}`,
    });

    await safelyDeleteFile(localPath);

    return result;
  } catch (error) {
    console.log("Cloudinary File Upload Failure!", error);

    await safelyDeleteFile(localPath);

    return null;
  }
};

const deleteFromCloudinary = async function (publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    return null;
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
