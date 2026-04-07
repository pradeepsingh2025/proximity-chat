import { Server, Socket } from "socket.io";
import { PROXIMITY_RADIUS, ACTIVE_PAIRS_KEY, PLAYER_KEY } from "../config/config.ts";
import { redis } from "../redis/index.ts";
import { pairKey, getSocketId } from "./data.ts";

export async function checkProximity(socket: Socket, io: Server) {
    const username = socket.data.username;
    if (!username) return;

    const mePositions = await redis.geopos(PLAYER_KEY, username);
    if (!mePositions || !mePositions[0]) return;
    
    // geosearch returns members within the radius (which are usernames)
    const nearbyMembersString = await redis.geosearch(
        PLAYER_KEY,
        "FROMMEMBER", username,
        "BYRADIUS", PROXIMITY_RADIUS, "m"
    ) as string[];

    const currentlyNear = new Set(nearbyMembersString);
    currentlyNear.delete(username); // remove self

    // Get all active pairs from redis to see who was near
    const ACTIVE_NEAR_KEY = `${ACTIVE_PAIRS_KEY}:${username}`;
    const previouslyNearArr = await redis.smembers(ACTIVE_NEAR_KEY);
    const previouslyNear = new Set(previouslyNearArr);

    let userEngagementCount = previouslyNear.size;

    // 1. For anyone currently near but NOT previously near -> Connect
    for (const otherUsername of currentlyNear) {
        if (!previouslyNear.has(otherUsername) && otherUsername) {
            // Check if current user is already in a room
            if (userEngagementCount >= 1) continue;
            
            // Check if the other user we are trying to connect to is already in a room
            const otherEngagementCount = await redis.scard(`${ACTIVE_PAIRS_KEY}:${otherUsername}`);
            if (otherEngagementCount >= 1) continue;

            const key = pairKey(username, otherUsername);
            const roomId = `room:${key}`;
            
            // update both players' sets
            await Promise.all([
                redis.sadd(ACTIVE_NEAR_KEY, otherUsername),
                redis.sadd(`${ACTIVE_PAIRS_KEY}:${otherUsername}`, username)
            ]);
            
            // Update engagement count so this user doesn't connect to another person in the same loop
            userEngagementCount++;

            console.log(`Player ${username} and ${otherUsername} are now in range`);

            // I need to emit to BOTH sockets and have BOTH sockets join the room
            // Join myself
            socket.join(roomId);
            
            // Look up other player's socketId
            const otherSocketId = await getSocketId(otherUsername);
            if (otherSocketId) {
                const otherSocket = io.sockets.sockets.get(otherSocketId);
                if (otherSocket) {
                    otherSocket.join(roomId);
                }
            }

            // Emit to both
            io.to(socket.id).emit('proximity:connect', { userId: otherUsername, roomId });
            if (otherSocketId) {
                io.to(otherSocketId).emit('proximity:connect', { userId: username, roomId });
            }
        }
    }

    // 2. For anyone previously near but NOT currently near -> Disconnect
    for (const otherUsername of previouslyNear) {
        if (!currentlyNear.has(otherUsername) && otherUsername) {
            const key = pairKey(username, otherUsername);
            const roomId = `room:${key}`;

            await Promise.all([
                redis.srem(ACTIVE_NEAR_KEY, otherUsername),
                redis.srem(`${ACTIVE_PAIRS_KEY}:${otherUsername}`, username)
            ]);

            console.log(`Player ${username} and ${otherUsername} are no longer in range`);

            socket.leave(roomId);
            const otherSocketId = await getSocketId(otherUsername);
            if (otherSocketId) {
                const otherSocket = io.sockets.sockets.get(otherSocketId);
                if (otherSocket) {
                    otherSocket.leave(roomId);
                }
            }

            io.to(socket.id).emit('proximity:disconnect', { userId: otherUsername, roomId });
            if (otherSocketId) {
                io.to(otherSocketId).emit('proximity:disconnect', { userId: username, roomId });
            }
        }
    }
}

export async function deletePlayerFromProximity(socket: Socket, io: Server) {
    const username = socket.data.username;
    if (!username) return;
    const ACTIVE_NEAR_KEY = `${ACTIVE_PAIRS_KEY}:${username}`;
    const previouslyNearArr = await redis.smembers(ACTIVE_NEAR_KEY);
    
    for (const otherUsername of previouslyNearArr) {
        if (!otherUsername) continue;
        const key = pairKey(username, otherUsername);
        const roomId = `room:${key}`;
        
        // Clean up Redis pair state on both sides
        await redis.srem(`${ACTIVE_PAIRS_KEY}:${otherUsername}`, username);

        // Disconnecting socket must leave the room explicitly so
        // io.in(roomId).sockets is accurate for any subsequent checks
        socket.leave(roomId);

        const otherSocketId = await getSocketId(otherUsername);
        if (otherSocketId) {
            const otherSocket = io.sockets.sockets.get(otherSocketId);
            if (otherSocket) {
                otherSocket.leave(roomId);
            }
            io.to(otherSocketId).emit('proximity:disconnect', {
                userId: username,
                roomId,
            });
        }
    }
    
    // Wipe this user's entire active-pairs set in one DEL
    await redis.del(ACTIVE_NEAR_KEY);
}
