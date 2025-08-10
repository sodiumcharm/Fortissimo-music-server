import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectToDB = async function () {
  try {
    const instance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    console.log(
      `MongoDB Connection Successful! Host: ${instance.connection.host}`
    );
  } catch (error) {
    console.log(`MongoDB Connection Failure! ${error}`);
  }
};

const initDBEventHandlers = function () {
  mongoose.connection.on("connected", () =>
    console.log("Connected to your MongoDB database!")
  );

  mongoose.connection.on("disconnected", () =>
    console.log("Disconnected from MongoDB database!")
  );
};

export { connectToDB, initDBEventHandlers };
