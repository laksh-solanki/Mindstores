const BACKEND_BASE_URL = (
  process.env.BACKEND_API_URL || 'https://mindstores-backend.audit29122006.workers.dev'
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
    'referer',
    'connection',
    'content-length',
  ])

  // Preserve origin for CORS validation on backend
  const preservedHeaders = new Set([
    'origin',
    'x-forwarded-origin',
  ])

  for (const [key, value] of Object.entries(req.headers || {})) {
    const normalizedKey = String(key || '').toLowerCase()
    if (blockedHeaders.has(normalizedKey)) {
      continue
    }

    // Allow origin headers through for proper CORS validation
    if (preservedHeaders.has(normalizedKey)) {
      if (value != null) {
        headers.set(key, String(value))
      }
      continue
    }

    if (normalizedKey.startsWith('x-forwarded-') || normalizedKey.startsWith('x-vercel-')) {
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

    // Add CORS headers for browser requests
    const requestOrigin = req.headers.origin || req.headers.origin
    if (requestOrigin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    res.setHeader('x-proxy-target', targetUrl.toString())

    // Properly forward all response headers except hop-by-hop
    const hopByHopHeaders = new Set([
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
    ])

    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (hopByHopHeaders.has(key.toLowerCase())) {
        continue
      }
      // Handle set-cookie specially - forward each one
      if (key.toLowerCase() === 'set-cookie') {
        // set-cookie should already be handled via getSetCookie() below
        continue
      }
      res.setHeader(key, value)
    }

    // Properly handle set-cookie headers
    const setCookieValues =
      typeof upstreamResponse.headers.getSetCookie === 'function'
        ? upstreamResponse.headers.getSetCookie()
        : upstreamResponse.headers.get('set-cookie')
        ? [upstreamResponse.headers.get('set-cookie')]
        : []

    for (const cookie of setCookieValues) {
      if (cookie) {
        res.appendHeader('Set-Cookie', cookie)
      }
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
