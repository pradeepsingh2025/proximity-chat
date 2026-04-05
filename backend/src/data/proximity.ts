import { players, activePairs, pairKey } from "./data.ts";
import { Server, Socket } from "socket.io";
import { PROXIMITY_RADIUS } from "../config/config.ts";

export function checkProximity(socket: Socket, io: Server) {
    const me = players.get(socket.id)
    if (!me) return

    for (const [otherId, other] of players) {
        if (otherId === socket.id) continue

        const dx = me.x - other.x
        const dy = me.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const key = pairKey(socket.id, otherId)

        const wasNear = activePairs.has(key)
        const isNear = dist < PROXIMITY_RADIUS

        if (isNear && !wasNear) {
            // they just entered range — connect them
            console.log(`Player ${socket.id} and ${otherId} are now in range`);
            activePairs.add(key)

            const roomId = `room:${key}`
            
            socket.join(roomId)
            const otherSocket = io.sockets.sockets.get(otherId)
            if (otherSocket) {
                otherSocket.join(roomId)
            }

            // tell both players to open the chat panel
            io.to(socket.id).emit('proximity:connect', { userId: otherId, roomId })
            io.to(otherId).emit('proximity:connect', { userId: socket.id, roomId })

        } else if (!isNear && wasNear) {
            // they just left range — disconnect them
            console.log(`Player ${socket.id} and ${otherId} are no longer in range`);
            activePairs.delete(key)

            const roomId = `room:${key}`
            
            socket.leave(roomId)
            const otherSocket = io.sockets.sockets.get(otherId)
            if (otherSocket) {
                otherSocket.leave(roomId)
            }

            io.to(socket.id).emit('proximity:disconnect', { userId: otherId, roomId })
            io.to(otherId).emit('proximity:disconnect', { userId: socket.id, roomId })
        }
        // if nothing changed — emit nothing
    }
}

export function deletePlayerFromProximity(socket: Socket, io: Server) {
   for (const key of activePairs) {
    if (!key.includes(socket.id)) continue

    activePairs.delete(key)
    const [a, b] = key.split(':')
    const otherId = a === socket.id ? b : a
    const roomId  = `room:${key}`

    io.to(otherId!).emit('proximity:disconnect', {
      userId: socket.id,
      roomId,
    })
  }

}