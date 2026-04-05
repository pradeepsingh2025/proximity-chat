import { Server, Socket } from "socket.io";
import { addPlayer, removePlayer, updatePlayerPosition, getAllPlayers } from "../data/data.ts";
import type { PlayerData, MoveData } from "../types/player.ts";
import { checkProximity, deletePlayerFromProximity } from "../data/proximity.ts";

export default function setupSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('A user connected:', socket.id);

        socket.on('player:join', async ({ username, x, y }: Omit<PlayerData, 'id'>) => {
            socket.data.username = username;

            const newPlayer: PlayerData = {
                id: socket.id,
                username,
                x,
                y
            };

            // 1. store this player in redis
            await addPlayer(newPlayer);

            // 2. send the new player the current world state
            const allPlayers = await getAllPlayers();
            const currentPlayers = allPlayers.filter(p => p.id !== socket.id);
            socket.emit('players:init', currentPlayers);

            // 3. tell everyone else a new player arrived
            socket.broadcast.emit('player:joined', newPlayer);
        });

        socket.on('player:move', async ({ x, y }: Omit<MoveData, 'id'>) => {
            if (socket.data.username) {
                // update position in redis
                await updatePlayerPosition(socket.id, socket.data.username, x, y);

                // check proximity
                await checkProximity(socket, io);

                // broadcast to others
                socket.broadcast.emit('player:moved', { id: socket.id, x, y });
            }
        });

        socket.on('chat:message', ({ roomId, message }: { roomId: string, message: string }) => {
            socket.to(roomId).emit('chat:message', { senderId: socket.id, message });
        });

        socket.on('disconnect', async () => {
            console.log('A user disconnected:', socket.id);
            if (socket.data.username) {
                await deletePlayerFromProximity(socket, io);
                await removePlayer(socket.id, socket.data.username);
                socket.broadcast.emit('player:left', { id: socket.id });
            }
        });
    });
}