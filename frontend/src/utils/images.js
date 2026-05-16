const MAX_DATA_IMAGE_URL_LENGTH = 700_000
const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/]+={0,2}$/i

export function safeDisplayImageUrl(value) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    return ''
  }

  if (normalized.startsWith('data:image/')) {
    return normalized.length <= MAX_DATA_IMAGE_URL_LENGTH && DATA_IMAGE_URL_PATTERN.test(normalized)
      ? normalized
      : ''
  }

  try {
    const parsedUrl = new URL(normalized)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? normalized : ''
  } catch {
    return ''
  }
}

export function safeDisplayImageUrls(value, fallback = '') {
  let candidates = []
  if (Array.isArray(value)) {
    candidates = value
  } else if (typeof value === 'string') {
    candidates = [value]
  }
  const safeImages = candidates
    .map((candidate) => safeDisplayImageUrl(candidate))
    .filter(Boolean)

  const fallbackImage = safeDisplayImageUrl(fallback)
  if (fallbackImage) {
    safeImages.push(fallbackImage)
  }

  return [...new Set(safeImages)]
}
