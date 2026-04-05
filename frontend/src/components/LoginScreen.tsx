import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

interface LoginScreenProps {
  onEnter: (username: string) => void
}

export default function LoginScreen({ onEnter }: LoginScreenProps) {
  const [name,  setName]  = useState<string>('')
  const [shake, setShake] = useState<boolean>(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    onEnter(trimmed)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.dot} />
          <span style={styles.dot} />
          <span style={styles.dot} />
        </div>

        <h1 style={styles.title}>Virtual Cosmos</h1>

        <p style={styles.sub}>
          Move with <kbd style={styles.kbd}>WASD</kbd> or arrow keys.
          <br />
          Walk up to someone to start chatting.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            autoFocus
            maxLength={20}
            placeholder="your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...styles.input, ...(shake ? styles.inputShake : {}) }}
          />
          <button type="submit" style={styles.btn}>
            Enter cosmos →
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%,60%  { transform: translateX(-6px) }
          40%,80%  { transform: translateX(6px) }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        input::placeholder { color: #3a4a5c; }
        button:hover { background: #4f9cf9 !important; color: #0c1117 !important; }
      `}</style>
    </div>
  )
}

// Typed style object
const styles: Record<string, CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     '#0c1117',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontFamily:     '"SF Mono", "Fira Code", "Cascadia Code", monospace',
  },
  card: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '1.4rem',
    padding:        '2.8rem 3.2rem',
    border:         '1px solid #1e2d3d',
    borderRadius:   '12px',
    background:     '#0d141c',
    animation:      'fadeIn 0.4s ease both',
    maxWidth:       '380px',
    width:          '90%',
  },
  logoRow: {
    display: 'flex',
    gap:     '6px',
  },
  dot: {
    display:      'block',
    width:        '8px',
    height:       '8px',
    borderRadius: '50%',
    background:   '#4f9cf9',
    opacity:      0.7,
    boxShadow:    '0 0 8px #4f9cf9',
  },
  title: {
    margin:        0,
    fontSize:      '1.5rem',
    fontWeight:    600,
    color:         '#dde3ea',
    letterSpacing: '0.04em',
  },
  sub: {
    margin:     0,
    fontSize:   '0.78rem',
    color:      '#4a6070',
    textAlign:  'center',
    lineHeight: 1.7,
  },
  kbd: {
    display:      'inline-block',
    padding:      '1px 5px',
    fontSize:     '0.75rem',
    color:        '#8ba0b2',
    background:   '#131e28',
    border:       '1px solid #1e2d3d',
    borderRadius: '4px',
  },
  form: {
    display:        'flex',
    flexDirection:  'column',
    gap:            '0.75rem',
    width:          '100%',
  },
  input: {
    width:        '100%',
    padding:      '0.65rem 0.9rem',
    fontSize:     '0.9rem',
    fontFamily:   'inherit',
    color:        '#dde3ea',
    background:   '#0c1117',
    border:       '1px solid #1e2d3d',
    borderRadius: '6px',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   'border-color 0.2s',
  },
  inputShake: {
    animation:   'shake 0.4s ease',
    borderColor: '#ff6b6b',
  },
  btn: {
    padding:       '0.65rem 1rem',
    fontSize:      '0.85rem',
    fontFamily:    'inherit',
    letterSpacing: '0.06em',
    color:         '#4f9cf9',
    background:    'transparent',
    border:        '1px solid #4f9cf9',
    borderRadius:  '6px',
    cursor:        'pointer',
    transition:    'background 0.2s, color 0.2s',
  },
}