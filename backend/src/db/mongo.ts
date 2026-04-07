import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
});

const chatHistorySchema = new Schema({
    participants: [{ type: String, ref: "User" }],
    messages: [
        {
            sender: { type: String, ref: "User" },
            content: String,
            timestamp: { type: Date, default: Date.now }
        }
    ]
});




export const User = mongoose.model("User", userSchema);
export const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);