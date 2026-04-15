const BASE = '/api'

async function request(url, options = {}) {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(BASE + url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

// Auth
export const register = (username, password) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })

export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })

export const getMe = () =>
  request('/auth/me')

// Tables
export const createTable = (body) =>
  request('/tables', { method: 'POST', body: JSON.stringify(body) })

export const getTable = (code) =>
  request(`/tables/${code}`)

export const joinTable = (code, name) =>
  request(`/tables/${code}/join`, { method: 'POST', body: JSON.stringify({ name }) })

export const lockTable = (code, adminSecret) =>
  request(`/tables/${code}/lock`, { method: 'POST', body: JSON.stringify({ admin_secret: adminSecret }) })

// Players
export const updatePlayer = (playerId, body) =>
  request(`/players/${playerId}`, { method: 'PUT', body: JSON.stringify(body) })

export const lockPlayer = (playerId, playerToken) =>
  request(`/players/${playerId}/lock`, { method: 'POST', body: JSON.stringify({ player_token: playerToken }) })

export const getSettlement = (code) =>
  request(`/tables/${code}/settlement`)
