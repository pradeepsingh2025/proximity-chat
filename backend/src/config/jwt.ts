import jwt from 'jsonwebtoken';
import type { UserData } from '../types/player.ts';
import { JWT_SECRET, JWT_REFRESH_SECRET } from './config.ts';

if(!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
if(!JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not defined");

export function generateAccessToken(user: Omit<UserData, 'password'>) {
    return jwt.sign(user, JWT_SECRET!, { expiresIn: '15m' });
}

export function generateRefreshToken(user: Omit<UserData, 'password'>) {
    return jwt.sign(user, JWT_REFRESH_SECRET!, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, JWT_SECRET!);
}

export function verifyRefreshToken(token: string) {
    return jwt.verify(token, JWT_REFRESH_SECRET!);
}