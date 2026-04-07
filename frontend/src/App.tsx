import { useState, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'
import LoginScreen from './components/LoginScreen'
import SignupScreen from './components/SignupScreen'
import GameCanvas from './components/GameCanvas'
import ChatRoom from './components/ChatRoom'
import ChatHistoryPanel from './components/ChatHistoryPanel'
import { CosmosGame } from '../game/CosmosGame'
import { socket } from '../lib/socket'
import type { PlayerData, MoveData } from '../types/player'
import { useAuthStore } from './store/authStore'

export default function App() {
  const { username, isCheckingAuth, checkAuth, logout } = useAuthStore()
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login')
  const [proximityState, setProximityState] = useState<{ roomId: string, otherUsername: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    logout()
  }

  const handleGameReady = useCallback((game: CosmosGame): void => {

    socket.emit('player:join', {
      username,
      x: game.position.x,   // starts at 0, 0
      y: game.position.y,
    })

    socket.on('player:sync_position', ({ x, y }: { x: number, y: number }) => {
      game.position.x = x;
      game.position.y = y;
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

    socket.on('proximity:connect', (data: { userId: string, roomId: string }) => {
      setProximityState({ roomId: data.roomId, otherUsername: data.userId })
    })

    socket.on('proximity:disconnect', () => {
      setProximityState(null)
    })

  }, [username])

  if (isCheckingAuth) {
    return <div style={{width: '100vw', height: '100vh', background: '#0c1117', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4f9cf9', fontFamily: 'monospace'}}>Loading cosmos...</div>
  }

  if (!username) {
    if (authScreen === 'login') {
      return <LoginScreen onSwitchToSignup={() => setAuthScreen('signup')} />
    }
    return <SignupScreen onSwitchToLogin={() => setAuthScreen('login')} />
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameCanvas username={username} onReady={handleGameReady} />

      {proximityState && (
        <ChatRoom roomId={proximityState.roomId} otherUsername={proximityState.otherUsername} currentUsername={username} />
      )}

      {showHistory && (
        <ChatHistoryPanel currentUsername={username} onClose={() => setShowHistory(false)} />
      )}

      <div style={hudStyle}>
        <span style={nameStyle}>{username}</span>
        <span style={hintStyle}>WASD / ↑↓←→ to move</span>
        <button onClick={() => setShowHistory(!showHistory)} style={historyBtnStyle}>Chat History</button>
        <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
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

const logoutBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid #ff4d4f',
  color: '#ff4d4f',
  borderRadius: '4px',
  padding: '0.2rem 0.5rem',
  fontSize: '0.7rem',
  cursor: 'pointer',
  marginLeft: '1rem',
  fontFamily: 'inherit',
}

const historyBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid #10b981',
  color: '#10b981',
  borderRadius: '4px',
  padding: '0.2rem 0.5rem',
  fontSize: '0.7rem',
  cursor: 'pointer',
  marginLeft: '1rem',
  fontFamily: 'inherit',
}