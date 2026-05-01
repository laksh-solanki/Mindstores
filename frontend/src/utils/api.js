const normalizeApiBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '')

const defaultApiBaseUrl = import.meta.env.DEV
  ? 'https://mindstores-backend-production.audit29122006.workers.dev'
  : 'https://mindstores-backend-production.audit29122006.workers.dev'

export const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || defaultApiBaseUrl)

export function buildApiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}
