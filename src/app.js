import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/apiError.js";
import { globalErrorHandler } from "./controllers/error.controller.js";

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

app.use("/api/v1/users", userRouter);

// ERROR HANDLING
app.use(globalErrorHandler);

export { app };
