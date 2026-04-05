import type { PlayerData } from "../types/player.js";

export const players = new Map<string, PlayerData>()

export function addPlayer(player: PlayerData) {
    players.set(player.id, player)
}

export function removePlayer(id: string) {
    players.delete(id)
}

export function getPlayer(id: string) { 
    return players.get(id)
}   

export function getAllPlayers() {
    return Array.from(players.values())
}