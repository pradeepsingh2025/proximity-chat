import { PLAYER_COLORS } from "../constants/gameConstants"

export function pickColor(id: string): number {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length]
}
