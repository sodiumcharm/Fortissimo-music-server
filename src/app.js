import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/apiError.js";
import { globalErrorHandler } from "./controllers/error.controllers.js";

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

app.use("/api/v1/users", userRouter);

app.use("/api/v1/audios", audioRouter);

// ERROR HANDLING
app.use(globalErrorHandler);

export { app };
