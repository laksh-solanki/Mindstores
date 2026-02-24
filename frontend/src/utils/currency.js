import axios from 'axios'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ALLOWED_CURRENCIES, DEFAULT_SETTINGS, loadUserSettings, subscribeToUserSettings } from './userSettings'

const BASE_CURRENCY = 'USD'
const RATES_CACHE_KEY = 'mindstore_exchange_rates_v1'
const RATES_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD'

const FALLBACK_EXCHANGE_RATES = Object.freeze({
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83
})

const CURRENCY_LOCALES = Object.freeze({
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN'
})

const exchangeRates = ref({ ...FALLBACK_EXCHANGE_RATES })
const exchangeRatesUpdatedAt = ref(0)
let ratesFetchPromise = null
let hasHydratedRates = false

const isBrowser = typeof window !== 'undefined'

function normalizeCurrencyCode(currency) {
  const code = typeof currency === 'string' ? currency.trim().toUpperCase() : ''
  return ALLOWED_CURRENCIES.includes(code) ? code : DEFAULT_SETTINGS.currency
}

function normalizeExchangeRates(rawRates = {}) {
  const normalized = {}
  for (const currency of ALLOWED_CURRENCIES) {
    if (currency === BASE_CURRENCY) {
      normalized[currency] = 1
      continue
    }

    const rate = Number(rawRates[currency])
    if (Number.isFinite(rate) && rate > 0) {
      normalized[currency] = rate
      continue
    }

    normalized[currency] = FALLBACK_EXCHANGE_RATES[currency] || 1
  }

  return normalized
}

function readCachedExchangeRates() {
  if (!isBrowser) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(RATES_CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    const updatedAt = Number(parsed?.updatedAt || 0)
    const rates = normalizeExchangeRates(parsed?.rates || {})
    if (!updatedAt) {
      return null
    }

    return { rates, updatedAt }
  } catch {
    return null
  }
}

function writeCachedExchangeRates(rates, updatedAt) {
  if (!isBrowser) {
    return
  }

  try {
    window.localStorage.setItem(
      RATES_CACHE_KEY,
      JSON.stringify({
        rates,
        updatedAt
      })
    )
  } catch {}
}

function hydrateExchangeRatesFromCache() {
  if (hasHydratedRates) {
    return
  }

  hasHydratedRates = true
  const cached = readCachedExchangeRates()
  if (!cached) {
    return
  }

  exchangeRates.value = cached.rates
  exchangeRatesUpdatedAt.value = cached.updatedAt
}

async function fetchExchangeRates(force = false) {
  hydrateExchangeRatesFromCache()

  const now = Date.now()
  const isCacheFresh = exchangeRatesUpdatedAt.value > 0 && now - exchangeRatesUpdatedAt.value < RATES_CACHE_TTL_MS
  if (!force && isCacheFresh) {
    return exchangeRates.value
  }

  if (ratesFetchPromise) {
    return ratesFetchPromise
  }

  ratesFetchPromise = (async () => {
    try {
      const response = await axios.get(EXCHANGE_RATE_URL, { timeout: 8000 })
      const apiRates = response?.data?.rates || {}
      const normalizedRates = normalizeExchangeRates(apiRates)
      exchangeRates.value = normalizedRates
      exchangeRatesUpdatedAt.value = Date.now()
      writeCachedExchangeRates(normalizedRates, exchangeRatesUpdatedAt.value)
    } catch (error) {
      console.warn('Failed to refresh exchange rates, using cached/fallback rates.', error)
      if (exchangeRatesUpdatedAt.value === 0) {
        exchangeRates.value = normalizeExchangeRates(FALLBACK_EXCHANGE_RATES)
      }
    }

    return exchangeRates.value
  })()

  try {
    return await ratesFetchPromise
  } finally {
    ratesFetchPromise = null
  }
}

function convertUsdAmount(amount, currency = DEFAULT_SETTINGS.currency) {
  const sourceAmount = Number(amount || 0)
  if (!Number.isFinite(sourceAmount)) {
    return 0
  }

  const currencyCode = normalizeCurrencyCode(currency)
  const rate = Number(exchangeRates.value[currencyCode] || 1)
  return sourceAmount * rate
}

function formatCurrencyAmount(amount, currency = DEFAULT_SETTINGS.currency) {
  const currencyCode = normalizeCurrencyCode(currency)
  const locale = CURRENCY_LOCALES[currencyCode] || 'en-US'
  const convertedAmount = convertUsdAmount(amount, currencyCode)

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2
    }).format(convertedAmount)
  } catch {
    return `${currencyCode} ${convertedAmount.toFixed(2)}`
  }
}

function useCurrency() {
  const userSettings = ref(loadUserSettings())
  const currency = computed(() => normalizeCurrencyCode(userSettings.value?.currency))

  const syncSettings = () => {
    userSettings.value = loadUserSettings()
  }

  const formatAmount = (amount) => formatCurrencyAmount(amount, currency.value)
  const convertAmount = (amount) => convertUsdAmount(amount, currency.value)

  let unsubscribeSettings = () => {}

  onMounted(() => {
    syncSettings()
    unsubscribeSettings = subscribeToUserSettings((settings) => {
      userSettings.value = settings
    })
    void fetchExchangeRates()
  })

  onUnmounted(() => {
    unsubscribeSettings()
  })

  return {
    currency,
    userSettings,
    formatAmount,
    convertAmount,
    fetchExchangeRates
  }
}

export {
  convertUsdAmount,
  fetchExchangeRates,
  formatCurrencyAmount,
  useCurrency
}
