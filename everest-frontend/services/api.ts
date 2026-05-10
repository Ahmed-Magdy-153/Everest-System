const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

const TOKEN_KEY = 'everest_token'

// ── Token helpers (localStorage, client-side only) ────────────────────────────
export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },
  set: (t: string): void => { localStorage.setItem(TOKEN_KEY, t) },
  clear: (): void => { localStorage.removeItem(TOKEN_KEY) },
}

// ── Core HTTP request ─────────────────────────────────────────────────────────
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tok = tokenStorage.get()

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  // Token expired / invalid → clear and redirect
  if (res.status === 401) {
    tokenStorage.clear()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as any).message ?? `Request failed (${res.status})`)
  }

  // Handle empty responses (204 No Content)
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ── Public API surface ────────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                 => request<T>(path),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                 => request<T>(path, { method: 'DELETE' }),
}
