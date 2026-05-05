const normalizeApiBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '')

const LOCAL_API_BASE_URL = 'http://localhost:8000'
const DEPLOYED_API_BASE_URL = '/api'

const defaultApiBaseUrl = import.meta.env.DEV
  ? LOCAL_API_BASE_URL
  : DEPLOYED_API_BASE_URL

export const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || defaultApiBaseUrl)

export function buildApiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}
