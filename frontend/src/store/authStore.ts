import { create } from 'zustand';
import { setAccessToken } from '../lib/api.ts';

interface AuthState {
  username: string | null;
  isCheckingAuth: boolean;
  login: (username: string, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  username: null,
  isCheckingAuth: true, // Initially checking
  login: (username, token) => {
    setAccessToken(token);
    set({ username, isCheckingAuth: false });
  },
  logout: () => {
    setAccessToken('');
    set({ username: null, isCheckingAuth: false });
  },
  checkAuth: async () => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        set({ username: data.username, isCheckingAuth: false });
      } else {
        set({ username: null, isCheckingAuth: false });
      }
    } catch {
      set({ username: null, isCheckingAuth: false });
    }
  }
}));
