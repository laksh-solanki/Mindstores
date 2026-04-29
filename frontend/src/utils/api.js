const normalizeApiBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '')

// In production, use same-origin /api so Vercel can proxy requests and cookies reliably.
const defaultApiBaseUrl = import.meta.env.DEV ? 'http://localhost:8000' : '/api'

export const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || defaultApiBaseUrl)

export function buildApiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}
