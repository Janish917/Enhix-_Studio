/**
 * API base URL for all backend requests.
 *
 * Local dev: leave VITE_API_BASE_URL empty → Vite proxies /api → localhost:4000
 * Production (Vercel): set VITE_API_BASE_URL to your Render URL, e.g.
 *   https://enhix-api.onrender.com  (no trailing slash)
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw && String(raw).trim()) {
    return String(raw).trim().replace(/\/$/, '')
  }
  if (import.meta.env.DEV) {
    return ''
  }
  return ''
}

export function isApiConfigured() {
  if (import.meta.env.DEV) return true
  return Boolean(getApiBaseUrl())
}

export function apiUrl(path) {
  const base = getApiBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
