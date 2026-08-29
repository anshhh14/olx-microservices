import { createContext, useContext, useState, useCallback } from 'react';
import { API, apiFetch, getAuth, setAuth as persistAuth, clearAuth as wipeAuth } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(() => getAuth());

  const login = useCallback(async (email, password) => {
    const { token } = await apiFetch(`${API.users}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const me = await apiFetch(`${API.users}/me`, { headers: { Authorization: `Bearer ${token}` } });
    const nextAuth = { token, id: me.id, name: me.name, email: me.email, mode: null };
    persistAuth(nextAuth);
    setAuthState(nextAuth);
    return nextAuth;
  }, []);

  const register = useCallback(async (name, email, password) => {
    await apiFetch(`${API.users}/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    wipeAuth();
    setAuthState(null);
  }, []);

  const setMode = useCallback((mode) => {
    setAuthState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, mode };
      persistAuth(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ auth, isLoggedIn: !!auth?.token, mode: auth?.mode || null, login, register, logout, setMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
