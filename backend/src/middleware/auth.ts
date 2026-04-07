import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt.ts";

export interface AuthRequest extends Request {
    user?: { username: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: "Access token missing" });
        return;
    }

    try {
        const decoded = verifyAccessToken(token) as { username: string };
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid access token" });
    }
};
