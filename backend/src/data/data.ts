import type { PlayerData } from "../types/player.ts";
import { redis } from "../redis/index.ts";
import { PLAYER_KEY } from "../config/config.ts";

export const PLAYER_INFO_KEY = `${PLAYER_KEY}:info`;

export function pairKey(a: string, b: string): string {
    return [a, b].sort().join(':');
}

export async function addPlayer(player: PlayerData) {
    await Promise.all([
        redis.geoadd(PLAYER_KEY, player.x, player.y, player.id),
        redis.hset(PLAYER_INFO_KEY, player.id, JSON.stringify(player))
    ]);
}

export async function removePlayer(id: string) {
    await Promise.all([
        redis.zrem(PLAYER_KEY, id),
        redis.hdel(PLAYER_INFO_KEY, id)
    ]);
}

export async function updatePlayerPosition(id: string, x: number, y: number) {
    await redis.geoadd(PLAYER_KEY, x, y, id);
    const playerStr = await redis.hget(PLAYER_INFO_KEY, id);
    if (playerStr) {
        const player = JSON.parse(playerStr) as PlayerData;
        player.x = x;
        player.y = y;
        await redis.hset(PLAYER_INFO_KEY, id, JSON.stringify(player));
    }
}

export async function getAllPlayers(): Promise<PlayerData[]> {
    const playersMap = await redis.hgetall(PLAYER_INFO_KEY);
    return Object.values(playersMap).map(p => JSON.parse(p) as PlayerData);
}

export async function getPlayer(id: string): Promise<PlayerData | null> {
    const playerStr = await redis.hget(PLAYER_INFO_KEY, id);
    return playerStr ? (JSON.parse(playerStr) as PlayerData) : null;
}
