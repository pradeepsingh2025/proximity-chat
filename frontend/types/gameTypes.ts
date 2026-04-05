import { Graphics, Container, Text } from 'pixi.js'

export interface Position {
    x: number
    y: number
}

export interface AvatarObject {
    container: Container
    circle: Graphics
    halo: Graphics
    label: Text
    color: number
    targetX?: number
    targetY?: number
}

export interface ZoneConfig {
    x: number; y: number; w: number; h: number
    label: string; color: number
}

export type MoveCallback = (x: number, y: number) => void
export type ProximityCallback = (nearbyIds: string[]) => void