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
