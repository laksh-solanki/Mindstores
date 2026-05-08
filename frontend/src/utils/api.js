const normalizeApiBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '')

const LOCAL_API_BASE_URL = 'http://localhost:8000'
const DEPLOYED_API_BASE_URL = '/api'
const configuredDevApiBaseUrl = import.meta.env.DEV
  ? normalizeApiBaseUrl(import.meta.env.VITE_API_URL)
  : ''

const defaultApiBaseUrl = import.meta.env.DEV
  ? LOCAL_API_BASE_URL
  : DEPLOYED_API_BASE_URL

// Production should stay same-origin so auth cookies are first-party through the Vercel proxy.
export const API_URL = configuredDevApiBaseUrl || defaultApiBaseUrl

export function buildApiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}
