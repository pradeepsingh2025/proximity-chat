import type { Request, Response } from "express";
import { verifyRefreshToken } from "../../config/jwt.ts";
import { getPlayerPosition, removePlayer, getSocketId, removeSocketMapping, pairKey } from "../../data/data.ts";
import { User } from "../../db/mongo.ts";
import { redis } from "../../redis/index.ts";
import { ACTIVE_PAIRS_KEY } from "../../config/config.ts";
import type { Server } from "socket.io";

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = verifyRefreshToken(token) as { username: string };
                const username = decoded.username;
                const io = req.app.get('io') as Server;

                // 1. Get position from Redis
                const position = await getPlayerPosition(username);

                // 2. Update DB if position found
                if (position) {
                    await User.findOneAndUpdate(
                        { username },
                        { x: position.x, y: position.y }
                    );
                }

                // 3. Delete player's related data from Redis
                // Remove player from geo set
                await removePlayer(username);

                // Remove socket mapping and forcefully disconnect
                const currentSocketId = await getSocketId(username);
                if (currentSocketId) {
                     await removeSocketMapping(username, currentSocketId);
                     if (io) {
                         const userSocket = io.sockets.sockets.get(currentSocketId);
                         if (userSocket) {
                             userSocket.disconnect(true);
                         }
                     }
                }

                // Broadcast player exit to others to remove from canvas
                if (io) {
                    io.emit('player:left', { id: username });
                }

                // Clean up proximity active pairs
                const ACTIVE_NEAR_KEY = `${ACTIVE_PAIRS_KEY}:${username}`;
                const previouslyNearArr = await redis.smembers(ACTIVE_NEAR_KEY);
                for (const otherUsername of previouslyNearArr) {
                    if (!otherUsername) continue;
                    await redis.srem(`${ACTIVE_PAIRS_KEY}:${otherUsername}`, username);
                    
                    if (io) {
                        const otherSocketId = await getSocketId(otherUsername);
                        if (otherSocketId) {
                            const otherSocket = io.sockets.sockets.get(otherSocketId);
                            const key = pairKey(username, otherUsername);
                            const roomId = `room:${key}`;
                            
                            if (otherSocket) {
                                otherSocket.leave(roomId);
                            }
                            io.to(otherSocketId).emit('proximity:disconnect', { userId: username, roomId });
                        }
                    }
                }
                await redis.del(ACTIVE_NEAR_KEY);

            } catch (err) {
                console.error("Error processing logout data save:", err);
            }
        }
    } catch (err) {
        console.error("Logout error:", err);
    }

    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
};
