import "dotenv/config";
import { app } from "./app.js";
import { connectToDB, initDBEventHandlers } from "./db/database.js";
import { cleanTempFolder } from "./utils/cleanFailedUploads.js";

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const port = process.env.PORT || 8000;

let server;

initDBEventHandlers();

connectToDB()
  .then(() => {
    server = app.listen(port, () => {
      console.log(`Server is running at: http://localhost:${port}`);
    });
  })
  .catch((error) => console.log("MongoDB Connection Failed!", error));

await cleanTempFolder();

setInterval(async () => {
  await cleanTempFolder();
}, 15 * 60 * 1000);
