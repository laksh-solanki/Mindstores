const BACKEND_BASE_URL = (
  process.env.BACKEND_API_URL || 'https://mindstores-backloges.onrender.com'
).replace(/\/+$/, '')

function getTargetUrl(req) {
  const incomingUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const requestedPath = incomingUrl.pathname.replace(/^\/api\/?/, '')
  const rewrittenPath =
    incomingUrl.searchParams.get('path') || incomingUrl.searchParams.get('...path') || ''
  const normalizedPath = (requestedPath || rewrittenPath)
    .replace(/^\/+/, '')
    .replace(/^index(?:\.js)?\/?/, '')

  incomingUrl.searchParams.delete('path')
  incomingUrl.searchParams.delete('...path')

  const targetPath = normalizedPath ? `/api/${normalizedPath}` : '/api'
  const targetUrl = new URL(targetPath, BACKEND_BASE_URL)
  targetUrl.search = incomingUrl.searchParams.toString()
  return targetUrl
}

function buildForwardHeaders(req) {
  const headers = new Headers()
  const blockedHeaders = new Set([
    'host',
    'origin',
    'referer',
    'connection',
    'content-length',
  ])

  for (const [key, value] of Object.entries(req.headers || {})) {
    const normalizedKey = String(key || '').toLowerCase()
    if (
      blockedHeaders.has(normalizedKey) ||
      normalizedKey.startsWith('x-forwarded-') ||
      normalizedKey.startsWith('x-vercel-')
    ) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) {headers.append(key, String(item))}
      }
      continue
    }

    if (value != null) {
      headers.set(key, String(value))
    }
  }

  return headers
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined
  }

  if (req.body == null) {return undefined}
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {return req.body}
  if (req.body instanceof Uint8Array) {return Buffer.from(req.body)}
  return JSON.stringify(req.body)
}

export default async function handler(req, res) {
  try {
    const targetUrl = getTargetUrl(req)
    const requestHeaders = buildForwardHeaders(req)
    const requestBody = await readBody(req)
    const fetchOptions = {
      method: req.method,
      headers: requestHeaders,
    }

    if (requestBody !== undefined) {
      fetchOptions.body = requestBody
    }

    const upstreamResponse = await fetch(targetUrl, fetchOptions)
    res.status(upstreamResponse.status)
    res.setHeader('x-proxy-target', targetUrl.toString())

    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') {continue}
      res.setHeader(key, value)
    }

    const setCookieValues =
      typeof upstreamResponse.headers.getSetCookie === 'function'
        ? upstreamResponse.headers.getSetCookie()
        : []
    if (setCookieValues.length > 0) {
      res.setHeader('set-cookie', setCookieValues)
    }

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer())
    res.send(responseBuffer)
  } catch (error) {
    res.status(502).json({
      message: 'API proxy request failed',
      error: error?.message || 'Unknown proxy error',
    })
  }
}
