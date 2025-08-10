import "dotenv/config";

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

import { app } from "./app.js";
import { connectToDB, initDBEventHandlers } from "./db/database.js";

const port = process.env.PORT || 8000;

let server;

connectToDB()
  .then(() => {
    server = app.listen(port, () => {
      console.log(`Server is running at: http://localhost:${port}`);
    });
  })
  .catch((error) => console.log("MongoDB Connection Failed!", error));

initDBEventHandlers();

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
