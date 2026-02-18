const SETTINGS_KEY = 'mindstore_profile_settings'

const DEFAULT_SETTINGS = {
  displayName: '',
  currency: 'USD',
  orderUpdates: true,
  promotionalEmails: false,
  quickCheckout: true
}

const ALLOWED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR']

const isBrowser = typeof window !== 'undefined'

function normalizeSettings(raw = {}) {
  const currency = ALLOWED_CURRENCIES.includes(raw.currency) ? raw.currency : DEFAULT_SETTINGS.currency

  return {
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : DEFAULT_SETTINGS.displayName,
    currency,
    orderUpdates: typeof raw.orderUpdates === 'boolean' ? raw.orderUpdates : DEFAULT_SETTINGS.orderUpdates,
    promotionalEmails: typeof raw.promotionalEmails === 'boolean' ? raw.promotionalEmails : DEFAULT_SETTINGS.promotionalEmails,
    quickCheckout: typeof raw.quickCheckout === 'boolean' ? raw.quickCheckout : DEFAULT_SETTINGS.quickCheckout
  }
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

function saveUserSettings(settings) {
  if (!isBrowser) {
    return
  }
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)))
}

export {
  ALLOWED_CURRENCIES,
  DEFAULT_SETTINGS,
  loadUserSettings,
  normalizeSettings,
  saveUserSettings,
  SETTINGS_KEY
}
