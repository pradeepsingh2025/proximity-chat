import type { Request, Response } from "express";
import loginController from "../../controller/login.ts";
import { generateAccessToken, generateRefreshToken } from "../../config/jwt.ts";

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password, userId } = req.body;

        if(!username) { res.status(403).json({error: 'Username not found'}); return; }
        if(!password) { res.status(403).json({error: 'Password required'}); return; }
        if(!userId) { res.status(403).json({error: 'User ID required'}); return; }

        const result = await loginController({username, password, userId});
        
        const payload = { userId: result.userId, username: result.username };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ accessToken, user: payload });
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
}