import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    socketId: { type: String, unique: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
});


export const User = mongoose.model("User", userSchema);