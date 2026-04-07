import type { PlayerData } from "../types/player.ts";
import { redis } from "../redis/index.ts";
import { PLAYER_KEY, GEO_SCALE, SOCKET_TTL, ACTIVE_PAIRS_KEY } from "../config/config.ts";

export function pairKey(a: string, b: string): string {
    return [a, b].sort().join(':');
}

// ─── Socket Map (username ↔ socketId) — per-user TTL keys ────────────────────
// Using individual keys instead of a shared HASH so we can set a TTL
// per user. This auto-expires ghost entries when the server crashes.

function socketKey(username: string): string {
    return `socket:${username}`;
}

export async function setSocketMapping(username: string, socketId: string) {
    await redis.set(socketKey(username), socketId, 'EX', SOCKET_TTL);
}

export async function getSocketId(username: string): Promise<string | null> {
    return redis.get(socketKey(username));
}

/**
 * Atomically removes the socket key only if its value still matches `socketId`.
 * Prevents a reconnecting user's fresh key from being wiped by their old
 * socket's disconnect handler arriving late (race condition).
 *
 * Lua script: read-compare-delete is atomic on the Redis side.
 */
const luaCompareAndDelete = `
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

export async function removeSocketMapping(username: string, socketId: string) {
    await redis.eval(luaCompareAndDelete, 1, socketKey(username), socketId);
}

// ─── Player CRUD ─────────────────────────────────────────────────────────────

export async function addPlayer(player: PlayerData) {
    await redis.geoadd(PLAYER_KEY, player.x / GEO_SCALE, player.y / GEO_SCALE, player.username);
}

export async function removePlayer(username: string) {
    await redis.zrem(PLAYER_KEY, username);
}

export async function updatePlayerPosition(username: string, x: number, y: number) {
    await redis.geoadd(PLAYER_KEY, x / GEO_SCALE, y / GEO_SCALE, username);
}

export async function getPlayerPosition(username: string): Promise<{ x: number, y: number } | null> {
    const positions = await redis.geopos(PLAYER_KEY, username);
    if (!positions || !positions[0]) return null;
    return {
        x: parseFloat(positions[0][0]) * GEO_SCALE,
        y: parseFloat(positions[0][1]) * GEO_SCALE,
    };
}

export async function getAllPlayers(): Promise<PlayerData[]> {
    const members = await redis.zrange(PLAYER_KEY, 0, -1);
    if (!members || members.length === 0) return [];

    const positions = await redis.geopos(PLAYER_KEY, ...members);
    
    return members.map((member, i) => {
        const pos = positions[i];
        return {
            id: member,
            username: member,
            x: pos ? parseFloat(pos[0]) * GEO_SCALE : 0,
            y: pos ? parseFloat(pos[1]) * GEO_SCALE : 0
        } as PlayerData;
    });
}

// ─── Stale Pair Validation ────────────────────────────────────────────────────
// Called at player:join. Clears any ACTIVE_PAIRS_KEY entries whose partner
// is no longer in the geo set (i.e. they crashed without cleanup).

export async function validatePairs(username: string): Promise<void> {
    const ACTIVE_NEAR_KEY = `${ACTIVE_PAIRS_KEY}:${username}`;
    const partners = await redis.smembers(ACTIVE_NEAR_KEY);
    if (!partners || partners.length === 0) return;

    const stale: string[] = [];
    for (const partner of partners) {
        const position = await redis.geopos(PLAYER_KEY, partner);
        const isPresent = position && position[0];
        if (!isPresent) {
            stale.push(partner);
        }
    }

    if (stale.length > 0) {
        // Remove stale partners from this user's set
        await redis.srem(ACTIVE_NEAR_KEY, ...stale);
        // Also remove this user from each stale partner's set (defensive)
        await Promise.all(
            stale.map(p => redis.srem(`${ACTIVE_PAIRS_KEY}:${p}`, username))
        );
        console.log(`[validatePairs] Cleared ${stale.length} stale partner(s) for ${username}: [${stale.join(', ')}]`);
    }
}
