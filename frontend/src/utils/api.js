const normalizeApiBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '')

const defaultApiBaseUrl = import.meta.env.DEV ? 'http://localhost:8000' : ''

export const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || defaultApiBaseUrl)

export function buildApiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}
