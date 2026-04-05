import { Server, Socket } from "socket.io";
import { PROXIMITY_RADIUS, ACTIVE_PAIRS_KEY, PLAYER_KEY } from "../config/config.ts";
import { redis } from "../redis/index.ts";
import { pairKey, buildMemberString } from "./data.ts";

export async function checkProximity(socket: Socket, io: Server) {
    const username = socket.data.username;
    if (!username) return;

    const memberString = buildMemberString(socket.id, username);
    const mePositions = await redis.geopos(PLAYER_KEY, memberString);
    if (!mePositions || !mePositions[0]) return;
    
    // geosearch returns members within the radius.
    // Assuming PROXIMITY_RADIUS is mapped 1:1 roughly to meters due to geo scale.
    const nearbyMembersString = await redis.geosearch(
        PLAYER_KEY,
        "FROMMEMBER", memberString,
        "BYRADIUS", PROXIMITY_RADIUS, "m"
    ) as string[];

    const currentlyNear = new Set(nearbyMembersString.map(m => m.split(':')[0] as string));
    currentlyNear.delete(socket.id); // remove self

    // Get all active pairs from redis to see who was near
    const ACTIVE_NEAR_KEY = `${ACTIVE_PAIRS_KEY}:${socket.id}`;
    const previouslyNearArr = await redis.smembers(ACTIVE_NEAR_KEY);
    const previouslyNear = new Set(previouslyNearArr);

    // 1. For anyone currently near but NOT previously near -> Connect
    for (const otherId of currentlyNear) {
        if (!previouslyNear.has(otherId) && otherId) {
            const key = pairKey(socket.id, otherId);
            const roomId = `room:${key}`;
            
            // update both players' sets
            await Promise.all([
                redis.sadd(ACTIVE_NEAR_KEY, otherId),
                redis.sadd(`${ACTIVE_PAIRS_KEY}:${otherId}`, socket.id)
            ]);
            
            console.log(`Player ${socket.id} and ${otherId} are now in range`);

            socket.join(roomId);
            const otherSocket = io.sockets.sockets.get(otherId);
            if (otherSocket) {
                otherSocket.join(roomId);
            }

            io.to(socket.id).emit('proximity:connect', { userId: otherId, roomId });
            io.to(otherId).emit('proximity:connect', { userId: socket.id, roomId });
        }
    }

    // 2. For anyone previously near but NOT currently near -> Disconnect
    for (const otherId of previouslyNear) {
        if (!currentlyNear.has(otherId) && otherId) {
            const key = pairKey(socket.id, otherId);
            const roomId = `room:${key}`;

            await Promise.all([
                redis.srem(ACTIVE_NEAR_KEY, otherId),
                redis.srem(`${ACTIVE_PAIRS_KEY}:${otherId}`, socket.id)
            ]);

            console.log(`Player ${socket.id} and ${otherId} are no longer in range`);

            socket.leave(roomId);
            const otherSocket = io.sockets.sockets.get(otherId);
            if (otherSocket) {
                otherSocket.leave(roomId);
            }

            io.to(socket.id).emit('proximity:disconnect', { userId: otherId, roomId });
            io.to(otherId).emit('proximity:disconnect', { userId: socket.id, roomId });
        }
    }
}

export async function deletePlayerFromProximity(socket: Socket, io: Server) {
    const ACTIVE_NEAR_KEY = `${ACTIVE_PAIRS_KEY}:${socket.id}`;
    const previouslyNearArr = await redis.smembers(ACTIVE_NEAR_KEY);
    
    for (const otherId of previouslyNearArr) {
        if (!otherId) continue;
        const key = pairKey(socket.id, otherId);
        const roomId = `room:${key}`;
        
        await redis.srem(`${ACTIVE_PAIRS_KEY}:${otherId}`, socket.id);

        io.to(otherId).emit('proximity:disconnect', {
            userId: socket.id,
            roomId,
        });
    }
    
    await redis.del(ACTIVE_NEAR_KEY);
}
