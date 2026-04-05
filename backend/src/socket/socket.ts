import { Server, Socket } from "socket.io";
import { players, addPlayer, removePlayer } from "../data/data.ts";
import type { PlayerData, MoveData } from "../types/player.ts";
import { checkProximity, deletePlayerFromProximity } from "../data/proximity.ts";

export default function setupSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('A user connected:', socket.id);

        socket.on('player:join', ({ username, x, y }: Omit<PlayerData, 'id'>) => {
            const newPlayer: PlayerData = {
                id: socket.id,
                username,
                x,
                y
            };

            // 1. store this player in memory
            addPlayer(newPlayer);

            // 2. send the new player the current world state
            const currentPlayers = Array.from(players.values()).filter(p => p.id !== socket.id);
            socket.emit('players:init', currentPlayers);

            // 3. tell everyone else a new player arrived
            socket.broadcast.emit('player:joined', newPlayer);
        });

        socket.on('player:move', ({ x, y }: Omit<MoveData, 'id'>) => {
            const player = players.get(socket.id);
            if (player) {
                player.x = x;
                player.y = y;

                // check proximity
                checkProximity(socket, io);

                // broadcast to others
                socket.broadcast.emit('player:moved', { id: socket.id, x, y });
            }
        });

        socket.on('chat:message', ({ roomId, message }: { roomId: string, message: string }) => {
            socket.to(roomId).emit('chat:message', { senderId: socket.id, message });
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
            if (players.has(socket.id)) {
                deletePlayerFromProximity(socket, io);
                removePlayer(socket.id);
                socket.broadcast.emit('player:left', { id: socket.id });
            }
        });
    });
}