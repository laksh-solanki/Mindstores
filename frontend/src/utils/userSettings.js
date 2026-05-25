const SETTINGS_KEY = 'mindstore_profile_settings'
const USER_SETTINGS_UPDATED_EVENT = 'mindstore:user-settings-updated'

const DEFAULT_SETTINGS = {
  displayName: '',
  currency: 'USD',
  orderUpdates: true,
  promotionalEmails: false,
  quickCheckout: true,
  lowStockAlerts: true,
  saveDeliveryDetails: true,
  cashOnDeliveryEnabled: true,
  deliveryProfile: {
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    instructions: ''
  }
}

const ALLOWED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR']
const EURO_COUNTRY_CODES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'
])
const COUNTRY_TO_CURRENCY = Object.freeze({
  US: 'USD',
  IN: 'INR',
  GB: 'GBP',
  UK: 'GBP'
})
const COUNTRY_NAME_TO_CODE = Object.freeze({
  'india': 'IN',
  'united states': 'US',
  'united states of america': 'US',
  'usa': 'US',
  'us': 'US',
  'united kingdom': 'GB',
  'great britain': 'GB',
  'england': 'GB',
  'uk': 'GB'
})

const isBrowser = typeof window !== 'undefined'

function normalizeTextField(value, maxLength = 160) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, maxLength)
}

function normalizeDeliveryProfile(raw = {}) {
  const deliveryProfile = raw && typeof raw === 'object' ? raw : {}

  return {
    phone: normalizeTextField(deliveryProfile.phone, 32),
    address: normalizeTextField(deliveryProfile.address, 220),
    city: normalizeTextField(deliveryProfile.city, 96),
    state: normalizeTextField(deliveryProfile.state, 96),
    postalCode: normalizeTextField(deliveryProfile.postalCode || deliveryProfile.zip, 32),
    instructions: normalizeTextField(deliveryProfile.instructions, 240)
  }
}

function normalizeSettings(raw = {}) {
  const rawCurrency = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : ''
  const currency = ALLOWED_CURRENCIES.includes(rawCurrency) ? rawCurrency : DEFAULT_SETTINGS.currency

  return {
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : DEFAULT_SETTINGS.displayName,
    currency,
    orderUpdates: typeof raw.orderUpdates === 'boolean' ? raw.orderUpdates : DEFAULT_SETTINGS.orderUpdates,
    promotionalEmails: typeof raw.promotionalEmails === 'boolean' ? raw.promotionalEmails : DEFAULT_SETTINGS.promotionalEmails,
    quickCheckout: typeof raw.quickCheckout === 'boolean' ? raw.quickCheckout : DEFAULT_SETTINGS.quickCheckout,
    lowStockAlerts: typeof raw.lowStockAlerts === 'boolean' ? raw.lowStockAlerts : DEFAULT_SETTINGS.lowStockAlerts,
    saveDeliveryDetails: typeof raw.saveDeliveryDetails === 'boolean' ? raw.saveDeliveryDetails : DEFAULT_SETTINGS.saveDeliveryDetails,
    cashOnDeliveryEnabled: typeof raw.cashOnDeliveryEnabled === 'boolean' ? raw.cashOnDeliveryEnabled : DEFAULT_SETTINGS.cashOnDeliveryEnabled,
    deliveryProfile: normalizeDeliveryProfile(raw.deliveryProfile)
  }
}

function extractCountryCodeFromLocale(locale = '') {
  if (typeof locale !== 'string') {
    return ''
  }
  const match = locale.trim().match(/^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$/i)
  return match ? match[1].toUpperCase() : ''
}

function normalizeCountryCode(value = '') {
  if (typeof value !== 'string') {
    return ''
  }

  const raw = value.trim()
  if (!raw) {
    return ''
  }

  if (/^[a-z]{2}$/i.test(raw)) {
    return raw.toUpperCase()
  }

  const normalizedName = raw.toLowerCase().replace(/\s+/g, ' ')
  if (COUNTRY_NAME_TO_CODE[normalizedName]) {
    return COUNTRY_NAME_TO_CODE[normalizedName]
  }

  return extractCountryCodeFromLocale(raw)
}

function getCurrencyForCountry(countryOrLocale, fallbackCurrency = DEFAULT_SETTINGS.currency) {
  const countryCode = normalizeCountryCode(countryOrLocale)
  if (!countryCode) {
    return fallbackCurrency
  }

  const mappedCurrency = COUNTRY_TO_CURRENCY[countryCode] || (EURO_COUNTRY_CODES.has(countryCode) ? 'EUR' : '')
  if (!mappedCurrency) {
    return fallbackCurrency
  }

  return ALLOWED_CURRENCIES.includes(mappedCurrency) ? mappedCurrency : fallbackCurrency
}

function getBrowserCountryCode() {
  if (!isBrowser) {
    return ''
  }

  const localeCandidates = []
  if (Array.isArray(window.navigator?.languages)) {
    localeCandidates.push(...window.navigator.languages)
  }
  if (window.navigator?.language) {
    localeCandidates.push(window.navigator.language)
  }

  for (const locale of localeCandidates) {
    const countryCode = extractCountryCodeFromLocale(locale)
    if (countryCode) {
      return countryCode
    }
  }

  return ''
}

function resolveCurrencyFromUserCountry(user = {}, fallbackCurrency = DEFAULT_SETTINGS.currency) {
  const countryCandidates = [
    user?.country_code,
    user?.countryCode,
    user?.country,
    user?.locale,
    user?.language
  ]

  for (const candidate of countryCandidates) {
    const resolvedCurrency = getCurrencyForCountry(candidate, '')
    if (resolvedCurrency) {
      return resolvedCurrency
    }
  }

  return getCurrencyForCountry(getBrowserCountryCode(), fallbackCurrency)
}

function loadUserSettings() {
  if (!isBrowser) {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return { ...DEFAULT_SETTINGS }
    }
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function hasSavedCurrencyPreference() {
  if (!isBrowser) {
    return false
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return false
    }

    const parsed = JSON.parse(raw)
    const rawCurrency = typeof parsed?.currency === 'string' ? parsed.currency.trim().toUpperCase() : ''
    return ALLOWED_CURRENCIES.includes(rawCurrency)
  } catch {
    return false
  }
}

function saveUserSettings(settings) {
  if (!isBrowser) {
    return
  }
  const normalizedSettings = normalizeSettings(settings)
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings))
  window.dispatchEvent(
    new CustomEvent(USER_SETTINGS_UPDATED_EVENT, {
      detail: normalizedSettings
    })
  )
}

function subscribeToUserSettings(onChange) {
  if (!isBrowser || typeof onChange !== 'function') {
    return () => {}
  }

  const handleInternalSettingsUpdate = (event) => {
    onChange(normalizeSettings(event?.detail || loadUserSettings()))
  }

  const handleStorageUpdate = (event) => {
    if (event?.key === SETTINGS_KEY) {
      onChange(loadUserSettings())
    }
  }

  window.addEventListener(USER_SETTINGS_UPDATED_EVENT, handleInternalSettingsUpdate)
  window.addEventListener('storage', handleStorageUpdate)

  return () => {
    window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, handleInternalSettingsUpdate)
    window.removeEventListener('storage', handleStorageUpdate)
  }
}

function getCountryFromEmail(email) {
  if (typeof email !== 'string') {
    return ''
  }
  const trimmed = email.trim().toLowerCase()
  const domain = trimmed.split('@')[1]
  if (!domain) {
    return ''
  }

  const suffixMap = {
    '.in': 'IN',
    '.uk': 'GB',
    '.ca': 'CA',
    '.au': 'AU',
    '.de': 'DE',
    '.fr': 'FR',
    '.it': 'IT',
    '.es': 'ES',
    '.nl': 'NL',
    '.ae': 'AE',
    '.sg': 'SG',
    '.jp': 'JP',
    '.br': 'BR',
    '.mx': 'MX',
    '.us': 'US'
  }

  for (const [suffix, code] of Object.entries(suffixMap)) {
    if (domain.endsWith(suffix) || domain.includes(suffix + '.')) {
      return code
    }
  }

  return ''
}

export {
  ALLOWED_CURRENCIES,
  DEFAULT_SETTINGS,
  getCountryFromEmail,
  getCurrencyForCountry,
  hasSavedCurrencyPreference,
  loadUserSettings,
  normalizeCountryCode,
  normalizeDeliveryProfile,
  normalizeSettings,
  resolveCurrencyFromUserCountry,
  saveUserSettings,
  SETTINGS_KEY,
  subscribeToUserSettings
}
