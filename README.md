# 🌌 Proximity Chat — Virtual Cosmos

A real-time, multiplayer 2D world where players move around a shared canvas and **automatically start chatting when they walk near each other**. Built with a WebSocket-first architecture, Redis geospatial indexing, and a PixiJS game renderer.

> Walk up to someone → a chat room opens.  
> Walk away → it closes.  
> No buttons, no lobbies — just proximity.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Backend](#backend)
  - [Directory Structure](#backend-directory-structure)
  - [Entry Point](#entry-point)
  - [Authentication System](#authentication-system)
  - [Database Layer](#database-layer)
  - [Redis — Geospatial Player Storage](#redis--geospatial-player-storage)
  - [Socket.IO Event Protocol](#socketio-event-protocol)
  - [Proximity Detection Engine](#proximity-detection-engine)
  - [Environment Variables](#environment-variables)
- [Frontend](#frontend)
  - [Directory Structure](#frontend-directory-structure)
  - [App Shell & Auth Flow](#app-shell--auth-flow)
  - [API Client & Token Management](#api-client--token-management)
  - [Game Engine — CosmosGame](#game-engine--cosmosgame)
  - [Components](#components)
  - [Socket Integration](#socket-integration)
- [Getting Started](#getting-started)
- [Socket Event Reference](#socket-event-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Vite + React)            │
│                                                         │
│  LoginScreen / SignupScreen                             │
│         │  POST /api/auth/*                             │
│         ▼                                               │
│  GameCanvas ← PixiJS (CosmosGame)                       │
│         │  socket.emit('player:move')                   │
│         │  socket.on('proximity:connect')               │
│         ▼                                               │
│  ChatRoom (appears on proximity)                        │
└────────────────┬────────────────────────────────────────┘
                 │  WebSocket (Socket.IO)
                 │  HTTP REST (Express)
┌────────────────▼────────────────────────────────────────┐
│                      Backend (Node + Express)           │
│                                                         │
│  REST API ── /api/auth/login                            │
│           ── /api/auth/signup                           │
│           ── /api/auth/refresh                          │
│                                                         │
│  Socket.IO ── player:join / move / disconnect           │
│            ── proximity:connect / disconnect            │
│            ── chat:message                              │
│                                                         │
│  ┌──────────┐    ┌───────────────────────────┐          │
│  │ MongoDB  │    │ Redis (Geospatial Index)   │          │
│  │ (Users)  │    │  GEOADD / GEOSEARCH        │          │
│  └──────────┘    │  Active proximity pairs    │          │
│                  └───────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| **Runtime**        | Node.js (ESM)                                   |
| **HTTP Server**    | Express 5                                       |
| **WebSocket**      | Socket.IO 4                                     |
| **Database**       | MongoDB (Mongoose 9)                            |
| **Cache / Geo**    | Redis (ioredis) — `GEOADD`, `GEOSEARCH`         |
| **Auth**           | JWT (access + refresh tokens), bcrypt            |
| **Frontend**       | React 19, Vite 8, TypeScript                    |
| **Game Renderer**  | PixiJS 8                                        |
| **Socket Client**  | socket.io-client 4                              |

---

## Backend

### Backend Directory Structure

```
backend/
├── .env                          # Environment variables
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                  # Express + Socket.IO bootstrap
    ├── api/
    │   ├── index.ts              # Route registration
    │   └── auth/
    │       ├── login.ts          # POST /api/auth/login
    │       ├── signup.ts         # POST /api/auth/signup
    │       └── refresh.ts        # POST /api/auth/refresh
    ├── controller/
    │   ├── login.ts              # Login business logic
    │   └── signup.ts             # Signup business logic
    ├── config/
    │   ├── config.ts             # Env vars + game constants
    │   └── jwt.ts                # Token generation & verification
    ├── db/
    │   ├── connection.ts         # Mongoose connect
    │   └── mongo.ts              # User schema/model
    ├── redis/
    │   └── index.ts              # ioredis client
    ├── data/
    │   ├── data.ts               # Player CRUD (Redis geo)
    │   └── proximity.ts          # Proximity detection engine
    ├── socket/
    │   └── socket.ts             # Socket.IO event handlers
    └── types/
        └── player.ts             # TypeScript interfaces
```

---

### Entry Point

**`src/index.ts`** boots the server in three steps:

1. **MongoDB connection** — imported as a side-effect (`import "./db/connection.ts"`)
2. **Express middleware** — CORS (origin: `http://localhost:5173`), JSON body parser, cookie-parser
3. **Socket.IO server** — attached to the same HTTP server, CORS-enabled

The server listens on **port 3000**.

---

### Authentication System

A **two-token JWT architecture** secures the API:

| Token           | Storage           | Lifetime | Purpose                        |
| --------------- | ----------------- | -------- | ------------------------------ |
| **Access**      | In-memory (JS)    | 15 min   | Sent in `Authorization` header |
| **Refresh**     | HttpOnly cookie   | 7 days   | Used only to mint new access tokens |

#### Endpoints

##### `POST /api/auth/signup`

Creates a new user account.

```json
// Request
{
  "userId": "uuid-v4",
  "username": "nova",
  "password": "s3cret"
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "user": { "userId": "...", "username": "nova" }
}
// + Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict
```

- Password is hashed with **bcrypt** (10 salt rounds) before storage.
- Both `userId` and `username` must be unique.

##### `POST /api/auth/login`

Authenticates an existing user.

```json
// Request
{ "username": "nova", "password": "s3cret" }

// Response 200
{
  "accessToken": "eyJhbG...",
  "user": { "userId": "...", "username": "nova" }
}
```

##### `POST /api/auth/refresh`

Reads the `refreshToken` cookie, verifies it, and returns a fresh access token.

```json
// Response 200
{ "accessToken": "eyJhbG..." }
```

---

### Database Layer

#### MongoDB — User Model

| Field      | Type     | Constraints           |
| ---------- | -------- | --------------------- |
| `userId`   | String   | required, unique      |
| `username` | String   | required, unique      |
| `password` | String   | required (hashed)     |
| `socketId` | String   | unique                |
| `x`        | Number   | default: 0            |
| `y`        | Number   | default: 0            |

Connection string is read from `MONGO_URI` in `.env`.

---

### Redis — Geospatial Player Storage

Instead of tracking player positions in-memory, the server uses **Redis geospatial commands** for O(log N) proximity queries:

| Operation          | Redis Command | Description                                   |
| ------------------ | ------------- | --------------------------------------------- |
| Add / update player | `GEOADD`     | Stores `(lon, lat)` mapped from game `(x, y)` |
| Remove player      | `ZREM`        | Removes member from the sorted set             |
| Get all positions  | `ZRANGE` + `GEOPOS` | Fetches every player's coordinates       |
| Proximity search   | `GEOSEARCH`   | Finds all players within a radius              |

**Coordinate mapping:** Game pixel coordinates are divided by `GEO_SCALE` (111,320 — roughly meters-per-degree at the equator) to convert to valid longitude/latitude values that Redis geo commands expect.

**Member format:** Each player is stored as `socketId:username` to allow position lookups and ID extraction.

**Active pairs** are tracked in Redis Sets (`proximity:active-pairs:<socketId>`) so the server knows which connections to tear down on disconnect.

---

### Socket.IO Event Protocol

All real-time game communication flows through Socket.IO. See the full [Event Reference](#socket-event-reference) below.

**Connection lifecycle:**

1. Client authenticates via REST → receives username
2. Client connects to Socket.IO → emits `player:join`
3. Server adds player to Redis, broadcasts to others, sends world state back
4. On each movement frame → `player:move` → server updates Redis, runs proximity check, broadcasts
5. On disconnect → cleanup from Redis, notify peers, tear down proximity pairs

---

### Proximity Detection Engine

**`src/data/proximity.ts`** runs on every `player:move` event:

```
                  player:move
                      │
            ┌─────────▼──────────┐
            │   GEOSEARCH 130m   │  ← find everyone within PROXIMITY_RADIUS
            └─────────┬──────────┘
                      │
          ┌───────────▼───────────┐
          │  Compare with active  │  ← Redis Set of previous neighbors
          │  pairs from Redis     │
          └───┬────────────┬──────┘
              │            │
     ┌────────▼──┐   ┌────▼────────┐
     │  NEW pair │   │  LOST pair  │
     │  (enter)  │   │  (exit)     │
     └────┬──────┘   └────┬────────┘
          │               │
  proximity:connect  proximity:disconnect
  + join Socket room  + leave Socket room
```

**Key behavior:**
- When two players enter each other's radius → both receive `proximity:connect` with a shared `roomId`
- When they move apart → both receive `proximity:disconnect`
- The `roomId` is deterministic: `room:<sortedId1>:<sortedId2>`
- Chat messages are scoped to this room via `socket.to(roomId).emit(...)`

---

### Environment Variables

Create a `backend/.env` file:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<dbname>
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<your-refresh-secret-key>
ACCESS_TOKEN_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=72000
```

---

## Frontend

### Frontend Directory Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── constants/
│   └── gameConstants.ts          # World size, speed, proximity radius, zones
├── game/
│   ├── CosmosGame.ts             # PixiJS game engine class
│   └── gameHelper.ts             # Color picker utility
├── lib/
│   └── socket.ts                 # Socket.IO client instance
├── types/
│   ├── gameTypes.ts              # Avatar, Position, Zone interfaces
│   ├── player.ts                 # PlayerData, MoveData, UserData
│   └── chat.ts                   # ChatMessage, ChatRoomProps
├── styles/
│   ├── style.ts                  # Auth screen styles
│   └── chatStyle.ts              # Chat panel styles
└── src/
    ├── main.tsx                  # React entry point
    ├── App.tsx                   # Root component — auth + game + chat
    ├── App.css
    ├── index.css
    ├── lib/
    │   └── api.ts                # fetchWithAuth + token management
    └── components/
        ├── LoginScreen.tsx       # Login form
        ├── SignupScreen.tsx       # Signup form
        ├── GameCanvas.tsx        # PixiJS mount + lifecycle
        └── ChatRoom.tsx          # Proximity chat panel
```

---

### App Shell & Auth Flow

**`App.tsx`** manages three states:

```
                 ┌───────────────┐
                 │  authScreen?  │
                 └───┬───────┬───┘
                     │       │
              'login'│       │'signup'
                     ▼       ▼
            ┌────────────┐ ┌──────────────┐
            │LoginScreen │ │ SignupScreen  │
            └─────┬──────┘ └──────┬───────┘
                  │  onLogin       │  onSignup
                  │  (username)    │  (username)
                  └───────┬───────┘
                          ▼
              ┌───────────────────────┐
              │  GameCanvas + HUD     │
              │  + ChatRoom (if near) │
              └───────────────────────┘
```

1. **No username?** → Show `LoginScreen` or `SignupScreen` (toggle between them)
2. **Username set?** → Render `GameCanvas`, emit `player:join`, wire all socket listeners
3. **Proximity detected?** → Overlay `ChatRoom` component

---

### API Client & Token Management

**`src/lib/api.ts`** provides `fetchWithAuth()` — a wrapper around `fetch` that:

1. Attaches the **access token** as a `Bearer` header
2. On **401 response**, automatically calls `POST /api/auth/refresh` to get a new access token
3. **Retries** the original request with the new token
4. If refresh fails → clears token and throws `"Session expired"`

```ts
const res = await fetchWithAuth('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});
```

---

### Game Engine — CosmosGame

**`game/CosmosGame.ts`** is the core PixiJS game engine class. It manages:

| Responsibility            | Details                                                |
| ------------------------- | ------------------------------------------------------ |
| **Canvas init**           | Creates a PixiJS `Application`, attaches to the DOM    |
| **World rendering**       | Draws an infinite-feel grid with dot intersections      |
| **Room zones**            | Renders labeled rectangular zones (Lounge, War Room, Cafeteria) |
| **Player avatar**         | Circle + halo + username label + proximity ring (local player) |
| **Keyboard input**        | WASD / Arrow keys, diagonal normalization (×0.7071)    |
| **Game loop**             | 60fps tick — moves player, lerps remote players, fires callbacks |
| **Camera**                | Follows local player (centered on screen)              |
| **Remote players**        | Smooth interpolation via `lerp(0.14)` toward target positions |
| **Proximity ring**        | Dashed circle around the local player showing detection range |

#### Game Constants

| Constant           | Value  | Description                             |
| ------------------ | ------ | --------------------------------------- |
| `WORLD_SIZE`       | 4000   | Grid extends ±4000 pixels               |
| `WORLD_BOUND`      | 1900   | Player movement clamped to ±1900        |
| `GRID_STEP`        | 64     | Grid line spacing in pixels             |
| `PLAYER_SPEED`     | 3.2    | Pixels/frame base speed                 |
| `PROXIMITY_RADIUS` | 130    | Pixel radius for proximity detection    |

#### Public API

```ts
game.addPlayer(id, x, y, username)    // Add a remote player to the world
game.movePlayer(id, x, y)             // Update a remote player's target position
game.removePlayer(id)                 // Remove a remote player
game.getNearbyPlayerIds()             // Get IDs of players within proximity radius
game.destroy()                        // Cleanup — removes listeners, destroys PixiJS app
```

#### Callbacks

```ts
game.onMove = (x, y) => { ... }           // Fires each frame the local player moves
game.onProximity = (nearbyIds) => { ... }  // Fires each tick with nearby player IDs
```

---

### Components

#### `LoginScreen`

- Form with **username** and **password** fields
- Calls `POST /api/auth/login` via `fetchWithAuth`
- Stores access token in memory, triggers `onLogin(username)`
- Animated **shake** effect on validation error
- Link to switch to signup

#### `SignupScreen`

- Same structure as login
- Generates a `userId` via `crypto.randomUUID()`
- Calls `POST /api/auth/signup` (password hashed server-side)

#### `GameCanvas`

- Mounts a `<div>` and initializes `CosmosGame` inside it
- Uses `useRef` for stable game instance across re-renders
- Calls `onReady(game)` once PixiJS is initialized
- Cleans up on unmount (`game.destroy()`)

#### `ChatRoom`

- **Appears** when `proximityState` is set (i.e., `proximity:connect` received)
- **Disappears** when `proximity:disconnect` fires
- Real-time messaging via `chat:message` socket event
- Optimistic message rendering (shows immediately, emits to server)
- Auto-scrolls to the latest message
- Styled as a floating panel overlaying the game

---

### Socket Integration

Socket events are wired in `App.tsx` inside the `handleGameReady` callback:

| Event                  | Direction  | Payload                                  | Action                     |
| ---------------------- | ---------- | ---------------------------------------- | -------------------------- |
| `player:join`          | Client → Server  | `{ username, x, y }`              | Register in Redis          |
| `players:init`         | Server → Client  | `PlayerData[]`                     | Render existing players    |
| `player:joined`        | Server → Client  | `{ id, x, y, username }`          | Add remote avatar          |
| `player:move`          | Client → Server  | `{ x, y }`                        | Update position in Redis   |
| `player:moved`         | Server → Client  | `{ id, x, y }`                    | Lerp remote avatar         |
| `player:left`          | Server → Client  | `{ id }`                          | Remove avatar              |
| `proximity:connect`    | Server → Client  | `{ userId, roomId }`              | Open ChatRoom              |
| `proximity:disconnect` | Server → Client  | `{ userId, roomId }`              | Close ChatRoom             |
| `chat:message`         | Bidirectional     | `{ roomId, message }` / `{ senderId, message }` | Send/receive chat |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Redis** server running on `localhost:6379`
- **MongoDB** instance (local or Atlas)

### 1. Clone & Install

```bash
git clone https://github.com/pradeepsingh2025/proximity-chat.git
cd proximity-chat
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (see [Environment Variables](#environment-variables)).

Start the server:

```bash
node src/index.ts
```

The backend starts on **http://localhost:3000**.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**.

### 4. Play

1. Open **two browser tabs** at `http://localhost:5173`
2. Sign up / log in with different usernames in each tab
3. Move your avatars toward each other using **WASD** or **Arrow keys**
4. When the avatars are within 130px — a **chat panel** appears automatically
5. Send messages back and forth in real time
6. Walk away — the chat closes

---

## Socket Event Reference

### Client → Server

| Event           | Payload                           | Description                                |
| --------------- | --------------------------------- | ------------------------------------------ |
| `player:join`   | `{ username, x, y }`             | Register player in the world               |
| `player:move`   | `{ x, y }`                       | Report new position (every movement frame) |
| `chat:message`  | `{ roomId, message }`            | Send a chat message to a proximity room    |

### Server → Client

| Event                  | Payload                           | Description                                 |
| ---------------------- | --------------------------------- | ------------------------------------------- |
| `players:init`         | `PlayerData[]`                    | Full world state sent to a newly joined player |
| `player:joined`        | `{ id, x, y, username }`         | A new player entered the world              |
| `player:moved`         | `{ id, x, y }`                   | A player changed position                   |
| `player:left`          | `{ id }`                         | A player disconnected                       |
| `proximity:connect`    | `{ userId, roomId }`             | You entered another player's proximity      |
| `proximity:disconnect` | `{ userId, roomId }`             | You left another player's proximity         |
| `chat:message`         | `{ senderId, message }`          | Incoming chat message in a proximity room   |

---

## License

This project is open source and available under the [ISC License](https://opensource.org/licenses/ISC).
