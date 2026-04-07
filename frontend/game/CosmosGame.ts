import { Application, Graphics, Container, Text, Ticker } from 'pixi.js'
import type { Position, AvatarObject, MoveCallback, ProximityCallback } from '../types/gameTypes'
import { WORLD_BOUND, WORLD_SIZE, GRID_STEP, PLAYER_SPEED, ROOM_ZONES, PROXIMITY_RADIUS } from '../constants/gameConstants'
import { pickColor } from './gameHelper'

export class CosmosGame {
  private app!: Application
  private world!: Container
  private myAvatar!: AvatarObject

  private otherPlayers = new Map<string, AvatarObject>()
  private keys: Record<string, boolean> = {}

  private _isDestroyed = false;
  private _isInitialized = false;

  position: Position = { x: 0, y: 0 }
  PROXIMITY_RADIUS: number = PROXIMITY_RADIUS
  SPEED: number = PLAYER_SPEED

  /** Fires every frame the local player moves — wire to socket.emit */
  onMove?: MoveCallback
  /** Fires each tick with the array of nearby player IDs */
  onProximity?: ProximityCallback

  private readonly _keydown: (e: KeyboardEvent) => void
  private readonly _keyup: (e: KeyboardEvent) => void

  constructor() {
    this._keydown = this._onKeyDown.bind(this)
    this._keyup = this._onKeyUp.bind(this)
  }

  // Init 

  async init(mountEl: HTMLElement, username: string): Promise<void> {
    this.app = new Application()

    await this.app.init({
      resizeTo: mountEl,
      background: 0x0c1117,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
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
      ; (this.app.canvas as HTMLCanvasElement).style.display = 'block'

    this.world = new Container()
    this.app.stage.addChild(this.world)

    this._buildGrid()
    this._buildRoomZones()
    this.myAvatar = this._buildAvatar(username, 0x4f9cf9, true)
    this.world.addChild(this.myAvatar.container)

    window.addEventListener('keydown', this._keydown)
    window.addEventListener('keyup', this._keyup)
    this.app.ticker.add(this._tick.bind(this))
  }

  // World 

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
        text: z.label,
        style: {
          fontFamily: '"SF Mono", "Fira Code", monospace',
          fontSize: 11,
          fill: z.color,
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

  // Avatar ─────────────────────────────────────────

  private _buildAvatar(
    username: string,
    color: number,
    isMe: boolean = false,
  ): AvatarObject {
    const container = new Container()

    // ── soft glow under the character ──
    const halo = new Graphics()
    halo.circle(0, 8, 20)
    halo.fill({ color, alpha: 0.12 })
    container.addChild(halo)

    // ── human figure ──
    const figure = new Graphics()

    // Head (round)
    figure.circle(0, -18, 9)
    figure.fill({ color })
    // Head highlight
    figure.circle(-3, -21, 3.5)
    figure.fill({ color: 0xffffff, alpha: 0.22 })

    // Neck
    figure.rect(-2.5, -9, 5, 4)
    figure.fill({ color })

    // Body / torso (rounded rect)
    figure.roundRect(-9, -6, 18, 18, 4)
    figure.fill({ color })
    // Body shading
    figure.roundRect(-9, 2, 18, 10, 4)
    figure.fill({ color: 0x000000, alpha: 0.1 })

    // Left arm
    figure.roundRect(-14, -4, 5, 16, 2.5)
    figure.fill({ color })

    // Right arm
    figure.roundRect(9, -4, 5, 16, 2.5)
    figure.fill({ color })

    // Left leg
    figure.roundRect(-7, 12, 6, 14, 3)
    figure.fill({ color })

    // Right leg
    figure.roundRect(1, 12, 6, 14, 3)
    figure.fill({ color })

    // Shoes (slightly darker)
    figure.roundRect(-7, 23, 6, 4, 2)
    figure.fill({ color: 0x000000, alpha: 0.2 })
    figure.roundRect(1, 23, 6, 4, 2)
    figure.fill({ color: 0x000000, alpha: 0.2 })

    container.addChild(figure)

    // ── "me" indicator: glowing dot above head ──
    if (isMe) {
      const dot = new Graphics()
      dot.circle(0, -32, 3.5)
      dot.fill({ color: 0x4f9cf9 })
      // outer glow
      dot.circle(0, -32, 7)
      dot.fill({ color: 0x4f9cf9, alpha: 0.18 })
      container.addChild(dot)
    }

    // ── username label ──
    const label = new Text({
      text: username,
      style: {
        fontFamily: '"SF Mono", "Fira Code", monospace',
        fontSize: 11,
        fill: 0xdde3ea,
        letterSpacing: 0.5,
      },
    })
    label.anchor.set(0.5, 0)
    label.y = 30
    container.addChild(label)

    return { container, circle: figure, halo, label, color }
  }


  // Input 

  private _onKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
  }

  private _onKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false
  }

  // Game loop 

  private _tick(ticker: Ticker): void {
    const dt = ticker.deltaTime
    let dx = 0
    let dy = 0

    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1
    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071 }

    const speed = this.SPEED * dt
    this.position.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, this.position.x + dx * speed))
    this.position.y = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, this.position.y + dy * speed))

    this.myAvatar.container.x = this.position.x
    this.myAvatar.container.y = this.position.y

    // camera
    const hw = this.app.screen.width / 2
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

  // Public API 

  addPlayer(id: string, x: number, y: number, username: string): void {
    if (this.otherPlayers.has(id)) return
    const color = pickColor(id)
    const avatar = this._buildAvatar(username, color, false)
    avatar.container.x = x
    avatar.container.y = y
    avatar.targetX = x
    avatar.targetY = y
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
    const nearby: string[] = []
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
    window.removeEventListener('keyup', this._keyup)

    if (this._isInitialized) {
      this.app?.destroy({ removeView: true, children: true } as any)
    }
  }
}