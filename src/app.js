import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/apiError.js";
import { globalErrorHandler } from "./controllers/error.controllers.js";
import { MAIN_ROUTE } from "./constants.js";

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

// ROUTE HANDLING
import userRouter from "./routes/user.routes.js";
import audioRouter from "./routes/audio.routes.js";
import playlistRouter from "./routes/playlist.routes.js";

app.use(`${MAIN_ROUTE}/users`, userRouter);

app.use(`${MAIN_ROUTE}/audios`, audioRouter);

app.use(`${MAIN_ROUTE}/playlists`, playlistRouter);

// ERROR HANDLING
app.use(globalErrorHandler);

export { app };
