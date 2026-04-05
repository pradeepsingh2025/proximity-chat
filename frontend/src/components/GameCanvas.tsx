import { useEffect, useRef } from 'react'
import { CosmosGame } from '../../game/CosmosGame'

interface GameCanvasProps {
  username: string
  onReady?: (game: CosmosGame) => void
}

export default function GameCanvas({ username, onReady }: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const gameRef  = useRef<CosmosGame | null>(null)

  // stable ref so the effect doesn't re-run if parent re-renders
  const onReadyRef = useRef(onReady)
  useEffect(() => { onReadyRef.current = onReady }, [onReady])

  useEffect(() => {
    let ignore = false
    if (!mountRef.current || gameRef.current) return

    const game = new CosmosGame()
    gameRef.current = game

    game.init(mountRef.current, username).then(() => {
      if (!ignore) {
        onReadyRef.current?.(game)
      }
    })

    return () => {
      ignore = true
      game.destroy()
      gameRef.current = null
    }
  }, [username])   // only re-init if username changes

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', lineHeight: 0 }}
    />
  )
}