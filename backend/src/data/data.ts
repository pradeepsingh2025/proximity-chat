import type { PlayerData } from "../types/player.ts";
import { redis } from "../redis/index.ts";
import { PLAYER_KEY, GEO_SCALE } from "../config/config.ts";

export function pairKey(a: string, b: string): string {
    return [a, b].sort().join(':');
}

export function buildMemberString(id: string, username: string): string {
    return `${id}:${username}`;
}

export async function addPlayer(player: PlayerData) {
    const member = buildMemberString(player.id, player.username);
    await redis.geoadd(PLAYER_KEY, player.x / GEO_SCALE, player.y / GEO_SCALE, member);
}

export async function removePlayer(id: string, username: string) {
    const member = buildMemberString(id, username);
    await redis.zrem(PLAYER_KEY, member);
}

export async function updatePlayerPosition(id: string, username: string, x: number, y: number) {
    const member = buildMemberString(id, username);
    await redis.geoadd(PLAYER_KEY, x / GEO_SCALE, y / GEO_SCALE, member);
}

export async function getAllPlayers(): Promise<PlayerData[]> {
    const members = await redis.zrange(PLAYER_KEY, 0, -1);
    if (!members || members.length === 0) return [];

    const positions = await redis.geopos(PLAYER_KEY, ...members);
    
    return members.map((member, i) => {
        const pos = positions[i];
        const [id, ...rest] = member.split(':');
        const username = rest.join(':');
        return {
            id,
            username,
            x: pos ? parseFloat(pos[0]) * GEO_SCALE : 0,
            y: pos ? parseFloat(pos[1]) * GEO_SCALE : 0
        } as PlayerData;
    });
}
