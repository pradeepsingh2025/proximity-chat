import type { ZoneConfig } from "../types/gameTypes"

export const PLAYER_COLORS: readonly number[] = [
  0x4f9cf9, 0xff6b6b, 0x51cf66, 0xfcc419,
  0xcc5de8, 0xff922b, 0x20c997, 0xf06595,
]

export const WORLD_BOUND  = 1900
export const WORLD_SIZE   = 4000
export const GRID_STEP    = 28
export const PLAYER_SPEED = 3.2
export const PROXIMITY_RADIUS: number   = 130



export const ROOM_ZONES: ZoneConfig[] = [
  { x: -1100, y: -700,  r: 220, label: 'Earth',    color: 0x4f9cf9 },
  { x:  1000, y: -1000, r: 380, label: 'Jupiter',  color: 0xcc5de8 },
  { x: -800,  y:  900,  r: 180, label: 'Mars',     color: 0xff6b6b },
  { x:  1100, y:  800,  r: 320, label: 'Neptune',  color: 0x20c997 },
]
