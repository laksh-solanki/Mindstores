import axios from 'axios'
import { API_URL, buildAuthenticatedRequestConfig } from '@/utils/api'

export const MOBILE_COUNTRY_OPTIONS = [
  { code: '+1', label: 'United States +1' },
  { code: '+91', label: 'India +91' },
  { code: '+44', label: 'United Kingdom +44' },
  { code: '+61', label: 'Australia +61' },
  { code: '+971', label: 'United Arab Emirates +971' },
  { code: '+65', label: 'Singapore +65' },
  { code: '+49', label: 'Germany +49' },
  { code: '+33', label: 'France +33' },
  { code: '+81', label: 'Japan +81' }
]

export function normalizeMobileCountryCode(value) {
  const text = String(value || '').trim().replace(/\s+/g, '')
  if (!text) {
    return ''
  }
  const normalized = text.startsWith('+') ? text : `+${text}`
  return /^\+[1-9]\d{0,3}$/.test(normalized) ? normalized : ''
}

export function normalizeMobileNumber(value) {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits.length >= 6 && digits.length <= 15 ? digits : ''
}

export function formatMobileNumber(countryCode, mobileNumber) {
  return [normalizeMobileCountryCode(countryCode), normalizeMobileNumber(mobileNumber)]
    .filter(Boolean)
    .join(' ')
}

export function parseMobileNumber(fullNumber) {
  const text = String(fullNumber || '').trim()
  
  // Sort country codes by length descending to match more specific ones first (+971 before +91)
  const sortedCodes = [...MOBILE_COUNTRY_OPTIONS]
    .map(opt => opt.code)
    .sort((a, b) => b.length - a.length)

  for (const code of sortedCodes) {
    if (text.startsWith(code)) {
      const rest = text.slice(code.length).trim()
      return {
        countryCode: code,
        mobileNumber: normalizeMobileNumber(rest)
      }
    }
  }

  // Fallback split if it starts with + but has a space (e.g. +91 9876543210)
  if (text.startsWith('+')) {
    const spaceIndex = text.indexOf(' ')
    if (spaceIndex !== -1) {
      const code = text.slice(0, spaceIndex)
      const rest = text.slice(spaceIndex + 1)
      return {
        countryCode: normalizeMobileCountryCode(code),
        mobileNumber: normalizeMobileNumber(rest)
      }
    }
    
    // Check lengths 4 down to 2
    for (let len = 4; len >= 2; len--) {
      if (text.length > len) {
        const code = text.slice(0, len)
        if (normalizeMobileCountryCode(code)) {
          const rest = text.slice(len)
          return {
            countryCode: normalizeMobileCountryCode(code),
            mobileNumber: normalizeMobileNumber(rest)
          }
        }
      }
    }
  }

  return {
    countryCode: '',
    mobileNumber: normalizeMobileNumber(text)
  }
}

export async function fetchUserAdminProfile() {
  const response = await axios.get(
    `${API_URL}/user-admin/profile`,
    await buildAuthenticatedRequestConfig()
  )
  return response.data
}

export async function fetchUserAdminProducts() {
  const response = await axios.get(
    `${API_URL}/user-admin/products`,
    await buildAuthenticatedRequestConfig()
  )
  return Array.isArray(response.data?.items) ? response.data.items : []
}

export async function fetchUserAdminReviews() {
  const response = await axios.get(
    `${API_URL}/user-admin/reviews`,
    await buildAuthenticatedRequestConfig()
  )
  return Array.isArray(response.data?.items) ? response.data.items : []
}

export async function createUserAdminProduct(payload) {
  const response = await axios.post(
    `${API_URL}/user-admin/products`,
    payload,
    await buildAuthenticatedRequestConfig()
  )
  return response.data
}

export async function updateUserAdminProduct(productId, payload) {
  const response = await axios.put(
    `${API_URL}/user-admin/products/${encodeURIComponent(productId)}`,
    payload,
    await buildAuthenticatedRequestConfig()
  )
  return response.data
}

export async function deleteUserAdminProduct(productId) {
  const response = await axios.delete(
    `${API_URL}/user-admin/products/${encodeURIComponent(productId)}`,
    await buildAuthenticatedRequestConfig()
  )
  return response.data
}

export async function fetchUserAdminMessages() {
  const response = await axios.get(
    `${API_URL}/user-admin/messages`,
    await buildAuthenticatedRequestConfig()
  )
  return Array.isArray(response.data?.items) ? response.data.items : []
}

export async function markUserAdminMessageRead(messageId) {
  const response = await axios.post(
    `${API_URL}/user-admin/messages/${encodeURIComponent(messageId)}/read`,
    {},
    await buildAuthenticatedRequestConfig()
  )
  return response.data
}

export async function fetchUserAdminDeliveries() {
  const response = await axios.get(
    `${API_URL}/user-admin/deliveries`,
    await buildAuthenticatedRequestConfig()
  )
  return Array.isArray(response.data?.items) ? response.data.items : []
}
