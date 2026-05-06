const COOKIE_CONSENT_NAME = 'mindstore_cookie_preferences'
const COOKIE_CONSENT_EVENT = 'mindstore:cookie-preferences'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

const DEFAULT_COOKIE_PREFERENCES = Object.freeze({
  essential: true,
  analytics: false,
  marketing: false,
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function buildCookieAttributes(maxAge = COOKIE_MAX_AGE_SECONDS) {
  const attributes = [
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
  ]

  if (window.location.protocol === 'https:') {
    attributes.push('Secure')
  }

  return attributes.join('; ')
}

function normalizePreferences(preferences = {}) {
  return {
    essential: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
  }
}

function readCookieConsent() {
  if (!isBrowser()) {
    return null
  }

  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_CONSENT_NAME}=`))

  if (!cookie) {
    return null
  }

  try {
    const rawValue = cookie.slice(COOKIE_CONSENT_NAME.length + 1)
    return normalizePreferences(JSON.parse(decodeURIComponent(rawValue)))
  } catch {
    return null
  }
}

function writeCookieConsent(preferences) {
  if (!isBrowser()) {
    return null
  }

  const normalized = normalizePreferences(preferences)
  const payload = encodeURIComponent(JSON.stringify(normalized))
  // eslint-disable-next-line unicorn/no-document-cookie
  document.cookie = `${COOKIE_CONSENT_NAME}=${payload}; ${buildCookieAttributes()}`
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: normalized }))
  return normalized
}

function clearCookieConsent() {
  if (!isBrowser()) {
    return
  }

  // eslint-disable-next-line unicorn/no-document-cookie
  document.cookie = `${COOKIE_CONSENT_NAME}=; ${buildCookieAttributes(0)}`
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: null }))
}

export {
  clearCookieConsent,
  COOKIE_CONSENT_EVENT,
  DEFAULT_COOKIE_PREFERENCES,
  readCookieConsent,
  writeCookieConsent,
}
