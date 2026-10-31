import axios from 'axios'
import { API_URL, buildAuthenticatedRequestConfig } from '@/utils/api'

const DEFAULT_PRODUCTS_FALLBACK_API_URL = 'https://backend-omega-fawn-91.vercel.app'

function normalizeApiBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

const PRODUCTS_FALLBACK_API_URL = import.meta.env.DEV
  ? normalizeApiBaseUrl(import.meta.env.VITE_PRODUCTS_FALLBACK_API_URL || DEFAULT_PRODUCTS_FALLBACK_API_URL)
  : ''

function buildProductApiUrl(baseUrl, path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${normalizeApiBaseUrl(baseUrl)}${normalizedPath}`
}

function canUseProductsFallback() {
  return Boolean(
    PRODUCTS_FALLBACK_API_URL &&
    normalizeApiBaseUrl(API_URL) !== PRODUCTS_FALLBACK_API_URL,
  )
}

function isFallbackEligibleError(error) {
  const status = error?.response?.status
  return !status || status === 404 || status === 429 || status >= 500
}

function buildFallbackRequestConfig(config = {}) {
  return {
    ...config,
    headers: config.headers ? { ...config.headers } : {},
    withCredentials: false,
  }
}

function isFallbackUrl(url) {
  return Boolean(
    canUseProductsFallback() &&
    normalizeApiBaseUrl(url).startsWith(`${PRODUCTS_FALLBACK_API_URL}/products`),
  )
}

export function extractProductItems(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  return []
}

export function extractProductsMeta(payload) {
  const meta = payload?.meta
  if (!meta || typeof meta !== 'object') {
    return null
  }
  return meta
}

export async function fetchProductList(config = {}) {
  let primaryResponse

  try {
    primaryResponse = await requestProductApi('/products', config)
  } catch (error) {
    if (!canUseProductsFallback() || !isFallbackEligibleError(error)) {
      throw error
    }

    return await requestProductApi('/products', config, { preferFallback: true })
  }

  if (!canUseProductsFallback() || extractProductItems(primaryResponse.data).length > 0) {
    return primaryResponse
  }

  try {
    return await requestProductApi('/products', config, { preferFallback: true })
  } catch (error) {
    console.warn('Product fallback API unavailable. Using primary product response.', error)
    return primaryResponse
  }
}

export async function fetchProductDetail(productId, config = {}) {
  const normalizedProductId = String(productId || '').trim()
  if (!normalizedProductId) {
    throw new Error('Product id is required')
  }

  const productPath = `/products/${encodeURIComponent(normalizedProductId)}`

  try {
    return await requestProductApi(productPath, config)
  } catch (error) {
    if (!canUseProductsFallback() || !isFallbackEligibleError(error)) {
      throw error
    }

    return await requestProductApi(productPath, config, { preferFallback: true })
  }
}

export async function fetchProductReviews(productId, config = {}) {
  const normalizedProductId = String(productId || '').trim()
  if (!normalizedProductId) {
    throw new Error('Product id is required')
  }

  return await requestProductApi(`/products/${encodeURIComponent(normalizedProductId)}/reviews`, config)
}

export async function createProductReview(productId, payload) {
  const normalizedProductId = String(productId || '').trim()
  if (!normalizedProductId) {
    throw new Error('Product id is required')
  }

  return await requestProductApi(
    `/products/${encodeURIComponent(normalizedProductId)}/reviews`,
    await buildAuthenticatedRequestConfig({
      data: payload,
      method: 'post',
    })
  )
}

export function isProductsFallbackResponse(response) {
  return isFallbackUrl(response?.config?.url)
}

export async function requestProductApi(path, config = {}, options = {}) {
  const useFallback = Boolean(options.preferFallback && canUseProductsFallback())
  const requestConfig = useFallback ? buildFallbackRequestConfig(config) : config

  return await axios({
    ...requestConfig,
    method: requestConfig.method || 'get',
    url: buildProductApiUrl(useFallback ? PRODUCTS_FALLBACK_API_URL : API_URL, path),
  })
}
