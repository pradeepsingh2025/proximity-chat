import mongoose from "mongoose";
import { MONGO_URI } from "../config/config.ts";

if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is missing.");
}

export const db = await mongoose.connect(MONGO_URI)
    .then((mongooseInstance) => {
        console.log("MongoDB database connected");
        return mongooseInstance;
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    });