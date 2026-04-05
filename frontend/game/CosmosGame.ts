import { Application, Graphics, Container, Text, Ticker } from 'pixi.js'
import type { Position, AvatarObject, MoveCallback, ProximityCallback } from '../types/gameTypes'
import { WORLD_BOUND, WORLD_SIZE, GRID_STEP, PLAYER_SPEED, ROOM_ZONES } from '../constants/gameConstants'
import { pickColor } from './gameHelper'

export class CosmosGame {
  private app!:          Application
  private world!:        Container
  private myAvatar!:     AvatarObject
  private proximityRing!: Graphics

  private otherPlayers = new Map<string, AvatarObject>()
  private keys:         Record<string, boolean> = {}

  private _isDestroyed = false;
  private _isInitialized = false;

  position:         Position = { x: 0, y: 0 }
  PROXIMITY_RADIUS: number   = 100
  SPEED:            number   = PLAYER_SPEED

  /** Fires every frame the local player moves — wire to socket.emit */
  onMove?:      MoveCallback
  /** Fires each tick with the array of nearby player IDs */
  onProximity?: ProximityCallback

  private readonly _keydown: (e: KeyboardEvent) => void
  private readonly _keyup:   (e: KeyboardEvent) => void

  constructor() {
    this._keydown = this._onKeyDown.bind(this)
    this._keyup   = this._onKeyUp.bind(this)
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init(mountEl: HTMLElement, username: string): Promise<void> {
    this.app = new Application()

    await this.app.init({
      resizeTo:    mountEl,
      background:  0x0c1117,
      antialias:   true,
      resolution:  window.devicePixelRatio || 1,
      autoDensity: true,
    })

    if (this._isDestroyed) {
      if (this.app) {
        this.app.destroy({ removeView: true } as any);
      }
      return;
    }

    this._isInitialized = true;

    mountEl.appendChild(this.app.canvas as HTMLCanvasElement)
    ;(this.app.canvas as HTMLCanvasElement).style.display = 'block'

    this.world = new Container()
    this.app.stage.addChild(this.world)

    this._buildGrid()
    this._buildRoomZones()
    this.myAvatar = this._buildAvatar(username, 0x4f9cf9, true)
    this.world.addChild(this.myAvatar.container)

    window.addEventListener('keydown', this._keydown)
    window.addEventListener('keyup',   this._keyup)
    this.app.ticker.add(this._tick.bind(this))
  }

  // ─── World ─────────────────────────────────────────────────────────────────

  private _buildGrid(): void {
    const g = new Graphics()

    for (let x = -WORLD_SIZE; x <= WORLD_SIZE; x += GRID_STEP) {
      g.moveTo(x, -WORLD_SIZE).lineTo(x, WORLD_SIZE)
    }
    for (let y = -WORLD_SIZE; y <= WORLD_SIZE; y += GRID_STEP) {
      g.moveTo(-WORLD_SIZE, y).lineTo(WORLD_SIZE, y)
    }
    g.stroke({ color: 0x161d27, width: 1 })

    for (let x = -WORLD_SIZE; x <= WORLD_SIZE; x += GRID_STEP) {
      for (let y = -WORLD_SIZE; y <= WORLD_SIZE; y += GRID_STEP) {
        g.circle(x, y, 1.2)
      }
    }
    g.fill({ color: 0x1e2d3d })

    this.world.addChildAt(g, 0)
  }

  private _buildRoomZones(): void {
    for (const z of ROOM_ZONES) {
      const g = new Graphics()
      g.rect(z.x, z.y, z.w, z.h)
      g.fill({ color: z.color, alpha: 0.04 })
      g.rect(z.x, z.y, z.w, z.h)
      g.stroke({ color: z.color, width: 1, alpha: 0.25 })

      const label = new Text({
        text:  z.label,
        style: {
          fontFamily:    '"SF Mono", "Fira Code", monospace',
          fontSize:      11,
          fill:          z.color,
          letterSpacing: 2,
        },
      })
      label.x = z.x + 10
      label.y = z.y + 8
      label.alpha = 0.5

      this.world.addChild(g)
      this.world.addChild(label)
    }
  }

  // ─── Avatar ────────────────────────────────────────────────────────────────

  private _buildAvatar(
    username: string,
    color:    number,
    isMe:     boolean = false,
  ): AvatarObject {
    const container = new Container()

    if (isMe) {
      const ring = new Graphics()
      const R    = this.PROXIMITY_RADIUS
      const SEG  = 28
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI * 2
        const a1 = ((i + 0.68) / SEG) * Math.PI * 2
        ring.arc(0, 0, R, a0, a1)
        ring.stroke({ color: 0x4f9cf9, width: 1, alpha: 0.18 })
      }
      this.proximityRing = ring
      container.addChild(ring)
    }

    const halo = new Graphics()
    halo.circle(0, 0, 26)
    halo.fill({ color, alpha: 0.15 })
    container.addChild(halo)

    const circle = new Graphics()
    circle.circle(0, 0, 18)
    circle.fill({ color })
    circle.circle(-5, -5, 6)
    circle.fill({ color: 0xffffff, alpha: 0.18 })
    container.addChild(circle)

    if (isMe) {
      const dot = new Graphics()
      dot.circle(0, -26, 4)
      dot.fill({ color: 0x4f9cf9 })
      container.addChild(dot)
    }

    const label = new Text({
      text:  username,
      style: {
        fontFamily:    '"SF Mono", "Fira Code", monospace',
        fontSize:      11,
        fill:          0xdde3ea,
        letterSpacing: 0.5,
      },
    })
    label.anchor.set(0.5, 0)
    label.y = 26
    container.addChild(label)

    return { container, circle, halo, label, color }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private _onKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
  }

  private _onKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false
  }

  // ─── Game loop ─────────────────────────────────────────────────────────────

  private _tick(ticker: Ticker): void {
    const dt = ticker.deltaTime
    let dx = 0
    let dy = 0

    if (this.keys['ArrowLeft']  || this.keys['KeyA']) dx -= 1
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1
    if (this.keys['ArrowUp']    || this.keys['KeyW']) dy -= 1
    if (this.keys['ArrowDown']  || this.keys['KeyS']) dy += 1

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071 }

    const speed = this.SPEED * dt
    this.position.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, this.position.x + dx * speed))
    this.position.y = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, this.position.y + dy * speed))

    this.myAvatar.container.x = this.position.x
    this.myAvatar.container.y = this.position.y

    // camera
    const hw = this.app.screen.width  / 2
    const hh = this.app.screen.height / 2
    this.world.x = hw - this.position.x
    this.world.y = hh - this.position.y

    // lerp other players toward last known position
    for (const data of this.otherPlayers.values()) {
      if (data.targetX !== undefined && data.targetY !== undefined) {
        data.container.x += (data.targetX - data.container.x) * 0.14
        data.container.y += (data.targetY - data.container.y) * 0.14
      }
    }

    if (dx !== 0 || dy !== 0) {
      this.onMove?.(Math.round(this.position.x), Math.round(this.position.y))
    }

    this.onProximity?.(this.getNearbyPlayerIds())
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  addPlayer(id: string, x: number, y: number, username: string): void {
    if (this.otherPlayers.has(id)) return
    const color  = pickColor(id)
    const avatar = this._buildAvatar(username, color, false)
    avatar.container.x = x
    avatar.container.y = y
    avatar.targetX     = x
    avatar.targetY     = y
    this.world.addChild(avatar.container)
    this.otherPlayers.set(id, avatar)
  }

  movePlayer(id: string, x: number, y: number): void {
    const p = this.otherPlayers.get(id)
    if (!p) return
    p.targetX = x
    p.targetY = y
  }

  removePlayer(id: string): void {
    const p = this.otherPlayers.get(id)
    if (!p) return
    this.world.removeChild(p.container)
    p.container.destroy({ children: true })
    this.otherPlayers.delete(id)
  }

  getNearbyPlayerIds(): string[] {
    const { x, y } = this.position
    const nearby:   string[] = []
    for (const [id, data] of this.otherPlayers) {
      const dx = data.container.x - x
      const dy = data.container.y - y
      if (Math.sqrt(dx * dx + dy * dy) < this.PROXIMITY_RADIUS) {
        nearby.push(id)
      }
    }
    return nearby
  }

  destroy(): void {
    this._isDestroyed = true;
    window.removeEventListener('keydown', this._keydown)
    window.removeEventListener('keyup',   this._keyup)
    
    if (this._isInitialized) {
      this.app?.destroy({ removeView: true, children: true } as any)
    }
  }
}