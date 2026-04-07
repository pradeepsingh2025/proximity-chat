import { Server, Socket } from "socket.io";
import { addPlayer, removePlayer, updatePlayerPosition, getAllPlayers, setSocketMapping, getSocketId, removeSocketMapping, getPlayerPosition, validatePairs } from "../data/data.ts";
import type { PlayerData, MoveData } from "../types/player.ts";
import { checkProximity, deletePlayerFromProximity } from "../data/proximity.ts";

export default function setupSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('A user connected:', socket.id);

        socket.on('player:join', async ({ username, x, y }: Omit<PlayerData, 'id'>) => {
            socket.data.username = username;

            // Check if there is an existing socket for this username (ghost player on refresh)
            const existingSocketId = await getSocketId(username);
            if (existingSocketId && existingSocketId !== socket.id) {
                console.log(`User ${username} reconnecting. Cleaning up old socket ${existingSocketId}`);
                const oldSocket = io.sockets.sockets.get(existingSocketId);
                if (oldSocket) {
                    oldSocket.disconnect(true);
                }
            }

            // Map the new socket
            await setSocketMapping(username, socket.id);

            // Resume position or use the one provided
            const lastKnownPosition = await getPlayerPosition(username);
            const finalX = lastKnownPosition ? lastKnownPosition.x : x;
            const finalY = lastKnownPosition ? lastKnownPosition.y : y;

            const newPlayer: PlayerData = {
                id: username,
                username,
                x: finalX,
                y: finalY
            };

            // 1. store this player in redis
            await addPlayer(newPlayer);

            // 2. clear any stale ACTIVE_PAIRS entries whose partners have gone
            //    (handles the case where a partner crashed without cleanup)
            await validatePairs(username);

            // Tell the client about their resumed position
            if (lastKnownPosition) {
                socket.emit('player:sync_position', { x: finalX, y: finalY });
            }

            // 2. send the new player the current world state
            const allPlayers = await getAllPlayers();
            // Filter out self
            const currentPlayers = allPlayers.filter(p => p.username !== username);
            socket.emit('players:init', currentPlayers);

            // 3. tell everyone else a new player arrived
            socket.broadcast.emit('player:joined', newPlayer);
            
            // Check proximity immediately after joining in case they spawn near someone
            await checkProximity(socket, io);
        });

        socket.on('player:move', async ({ x, y }: Omit<MoveData, 'id'>) => {
            const username = socket.data.username;
            if (username) {
                // update position in redis
                await updatePlayerPosition(username, x, y);

                // check proximity
                await checkProximity(socket, io);

                // broadcast to others
                socket.broadcast.emit('player:moved', { id: username, x, y });
            }
        });

        socket.on('chat:message', ({ roomId, message }: { roomId: string, message: string }) => {
            const username = socket.data.username;
            if (username) {
                socket.to(roomId).emit('chat:message', { senderUsername: username, message });
            }
        });

        socket.on('disconnect', async () => {
            console.log('A user disconnected:', socket.id);
            const username = socket.data.username;
            if (username) {
                // Atomically remove socket key only if it still points to THIS socket.
                // If the user reconnected, removeSocketMapping is a no-op (Lua guard).
                const currentSocketId = await getSocketId(username);
                if (currentSocketId === socket.id) {
                    await deletePlayerFromProximity(socket, io);
                    await removePlayer(username);
                    await removeSocketMapping(username, socket.id);
                    socket.broadcast.emit('player:left', { id: username });
                }
            }
        });
    });
}