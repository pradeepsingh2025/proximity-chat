import { io, Socket } from 'socket.io-client'

export const socket: Socket = io('http://localhost:3000')

export function joinGame(username: string) {
    socket.emit('player:join', { username, x: 0, y: 0 })
}

export function movePlayer(x: number, y: number) {
    socket.emit('player:move', { x, y })
}