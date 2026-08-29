// ── Point these at wherever your services are actually running ──────────
// Uses Vite env vars if provided (VITE_USERS_API, VITE_LISTINGS_API, VITE_CHAT_API),
// falling back to the docker-compose defaults from the original project.

export const API = {
  users: import.meta.env.VITE_USERS_API || 'http://localhost:3001/api/users',
  listings: import.meta.env.VITE_LISTINGS_API || 'http://localhost:3002/api/listings',
  chat: import.meta.env.VITE_CHAT_API || 'http://localhost:3003/api/chat',
};

// If you're running on Kubernetes instead (NodePort ports), set these in a
// .env file instead:
//   VITE_USERS_API=http://localhost:30001/api/users
//   VITE_LISTINGS_API=http://localhost:30002/api/listings
//   VITE_CHAT_API=http://localhost:30003/api/chat

export function getAuth() {
  try {
    const raw = localStorage.getItem('tagg_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(auth) {
  localStorage.setItem('tagg_auth', JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem('tagg_auth');
}

export function isLoggedIn() {
  return !!getAuth()?.token;
}

function authHeader() {
  const auth = getAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...authHeader(),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiError('Could not reach the server. Is the backend running?', 0);
  }

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message = (data && data.error) || (data && data.message) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data;
}
