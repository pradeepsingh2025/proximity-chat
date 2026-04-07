import type{ Request, Response } from "express";

export const logout = (req: Request, res: Response) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
};
