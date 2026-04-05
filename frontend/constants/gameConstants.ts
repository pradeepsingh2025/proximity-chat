import type { ZoneConfig } from "../types/gameTypes"

export const PLAYER_COLORS: readonly number[] = [
  0x4f9cf9, 0xff6b6b, 0x51cf66, 0xfcc419,
  0xcc5de8, 0xff922b, 0x20c997, 0xf06595,
]

export const WORLD_BOUND  = 1900
export const WORLD_SIZE   = 4000
export const GRID_STEP    = 64
export const PLAYER_SPEED = 3.2
export const PROXIMITY_RADIUS: number   = 130



export const ROOM_ZONES: ZoneConfig[] = [
  { x: -300, y: -200, w: 220, h: 160, label: 'Lounge',    color: 0x4f9cf9 },
  { x:  120, y: -200, w: 200, h: 160, label: 'War Room',  color: 0xcc5de8 },
  { x: -100, y:  140, w: 240, h: 160, label: 'Cafeteria', color: 0x51cf66 },
]
