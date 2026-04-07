import type { Request, Response } from "express";
import { generateAccessToken, verifyRefreshToken } from "../../config/jwt.ts";

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const cookies = req.cookies;
        if (!cookies?.refreshToken) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const decoded = verifyRefreshToken(cookies.refreshToken) as { username: string };
        const payload = { username: decoded.username };
        
        const accessToken = generateAccessToken(payload);
        res.json({ accessToken, username: payload.username });
    } catch (error: any) {
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
}