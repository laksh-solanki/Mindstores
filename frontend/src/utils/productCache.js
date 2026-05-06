const PRODUCTS_CACHE_KEY = 'mindstore_home_products_cache_v1'
const PRODUCTS_CACHE_INVALIDATED_EVENT = 'mindstore:products-cache-invalidated'

function isBrowser() {
  return typeof window !== 'undefined'
}

function readProductsCache() {
  if (!isBrowser()) {return null}

  try {
    const rawCache = window.localStorage.getItem(PRODUCTS_CACHE_KEY)
    if (!rawCache) {return null}

    const parsed = JSON.parse(rawCache)
    if (!Array.isArray(parsed?.products) || parsed.products.length === 0) {
      return null
    }

    return {
      products: parsed.products,
      expiresAt: Number(parsed.expiresAt) || 0,
    }
  } catch {
    return null
  }
}

function writeProductsCache(products, expiresAt) {
  if (!isBrowser()) {return}

  try {
    window.localStorage.setItem(
      PRODUCTS_CACHE_KEY,
      JSON.stringify({ products, expiresAt }),
    )
  } catch {
    // Storage can fail in private mode; the in-memory cache still keeps the page usable.
  }
}

function clearProductsCache() {
  if (!isBrowser()) {return}

  try {
    window.localStorage.removeItem(PRODUCTS_CACHE_KEY)
  } catch {
    // Ignore storage errors and still notify active pages.
  }

  window.dispatchEvent(new CustomEvent(PRODUCTS_CACHE_INVALIDATED_EVENT))
}

export {
  clearProductsCache,
  PRODUCTS_CACHE_INVALIDATED_EVENT,
  PRODUCTS_CACHE_KEY,
  readProductsCache,
  writeProductsCache,
}
