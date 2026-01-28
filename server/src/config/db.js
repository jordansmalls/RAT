import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
    try {
        await mongoose.connect(env.mongoUri);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection failed");
        process.exit(1);
    }
};
