import { Router } from "express";
import type { Response } from "express";
import { authenticate } from "../../middleware/auth.ts";
import type { AuthRequest } from "../../middleware/auth.ts";
import { ChatHistory } from "../../db/mongo.ts";

const router = Router();

// GET all chat history for the logged-in user
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user?.username;
        if (!username) {
             res.status(401).json({ error: "Unauthorized" });
             return;
        }

        // Find all histories where participants include the username
        const histories = await ChatHistory.find({ participants: username }).sort({ _id: -1 });
        res.json(histories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST to save a new chat history session
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user?.username;
        if (!username) {
             res.status(401).json({ error: "Unauthorized" });
             return;
        }

        const { participants, messages } = req.body;

        if (!participants || !Array.isArray(participants) || !messages || !Array.isArray(messages)) {
             res.status(400).json({ error: "Invalid body" });
             return;
        }
        
        // Ensure the logged in user is actually one of the participants
        if (!participants.includes(username)) {
            res.status(403).json({ error: "Cannot save history for others" });
            return;
        }

        const newHistory = new ChatHistory({
            participants,
            messages
        });

        await newHistory.save();
        res.status(201).json({ success: true, historyId: newHistory._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
