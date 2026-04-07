import { useState } from 'react'
import type { FormEvent } from 'react'
import { styles } from '../../styles/style.ts'
import { fetchWithAuth } from '../lib/api.ts'
import { useAuthStore } from '../store/authStore.ts'

interface LoginScreenProps {
  onSwitchToSignup: () => void
}

export default function LoginScreen({ onSwitchToSignup }: LoginScreenProps) {
  const login = useAuthStore(state => state.login);
  const [name, setName] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [shake, setShake] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const trimmed = name.trim()
    const trimmedPass = password.trim()
    if (!trimmed || !trimmedPass) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    
    try {
        const res = await fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: trimmed, password: trimmedPass })
        });
        
        const data = await res.json()
        if (!res.ok) {
            setError(data.error || 'Login failed')
            setShake(true)
            setTimeout(() => setShake(false), 500)
            return
        }
        
        login(data.user.username, data.accessToken)
    } catch(err: any) {
        setError(err.message || 'An error occurred')
    }
  }

  return (
    <div style={styles.overlay} >
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
          {error && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}
          <input
            autoFocus
            maxLength={20}
            placeholder="username"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...styles.input, ...(shake && !name.trim() ? styles.inputShake : {}) }}
          />
          <input
            type="password"
            maxLength={50}
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...styles.input, ...(shake && !password.trim() ? styles.inputShake : {}) }}
          />
          <button type="submit" style={styles.btn}>
            Enter cosmos →
          </button>
        </form>

        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#3a4a5c', cursor: 'pointer', textDecoration: 'underline' }} onClick={onSwitchToSignup}>
           Don't have an account? Sign up
        </p>
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

