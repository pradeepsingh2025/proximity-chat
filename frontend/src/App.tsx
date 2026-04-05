import { useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import LoginScreen from './components/LoginScreen'
import GameCanvas from './components/GameCanvas'
import { CosmosGame } from '../game/CosmosGame'
import { socket } from '../lib/socket'
import type { PlayerData, MoveData } from '../types/player'

export default function App() {
  const [username, setUsername] = useState<string | null>(null)

  const handleGameReady = useCallback((game: CosmosGame): void => {
    console.log('PixiJS ready — game instance:', game)

    socket.emit('player:join', {
      username,
      x: game.position.x,   // starts at 0, 0
      y: game.position.y,
    })

    // after that, every time the player moves → tell the server
    game.onMove = (x, y) => {
      socket.emit('player:move', { x, y })
    }

    socket.on('players:init', (players: PlayerData[]) => {
      players.forEach(p => game.addPlayer(p.id, p.x, p.y, p.username))
    })
    socket.on('player:joined', ({ id, x, y, username }: PlayerData) => {
      game.addPlayer(id, x, y, username)
    })
    socket.on('player:moved', ({ id, x, y }: MoveData) => {
      game.movePlayer(id, x, y)
    })
    socket.on('player:left', ({ id }: { id: string }) => {
      game.removePlayer(id)
    })


  }, [username])

  if (!username) {
    return <LoginScreen onEnter={setUsername} />
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameCanvas username={username} onReady={handleGameReady} />

      {/* HUD — extend with chat panel, online count, etc. */}
      <div style={hudStyle}>
        <span style={nameStyle}>{username}</span>
        <span style={hintStyle}>WASD / ↑↓←→ to move</span>
      </div>
    </div>
  )
}

const hudStyle: CSSProperties = {
  position: 'fixed',
  bottom: '1.2rem',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.45rem 1rem',
  background: 'rgba(13,20,28,0.85)',
  border: '1px solid #1e2d3d',
  borderRadius: '999px',
  fontFamily: '"SF Mono","Fira Code",monospace',
  backdropFilter: 'blur(8px)',
  userSelect: 'none',
}

const nameStyle: CSSProperties = {
  fontSize: '0.78rem',
  color: '#4f9cf9',
  fontWeight: 600,
  letterSpacing: '0.04em',
}

const hintStyle: CSSProperties = {
  fontSize: '0.72rem',
  color: '#3a4a5c',
  letterSpacing: '0.04em',
}