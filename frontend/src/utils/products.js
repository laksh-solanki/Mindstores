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
