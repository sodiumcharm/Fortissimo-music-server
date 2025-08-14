import fs from "fs/promises";
import path from "path";

const TEMP_DIR = path.join(process.cwd(), "public", "temp");

const MAX_AGE = 1000 * 60 * 10;

export const cleanTempFolder = async function () {
  try {
    const files = await fs.readdir(TEMP_DIR);

    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);

      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > MAX_AGE) {
        await fs.unlink(filePath);
        console.log(`Deleted old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning temp folder:", error);
  }
};
