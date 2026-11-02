const DEFAULT_BACKEND_API_URL = 'https://backend-omega-fawn-91.vercel.app'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function normalizeApiBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function getBackendApiUrl() {
  return normalizeApiBaseUrl(process.env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL)
}

function buildTargetUrl(req, backendApiUrl) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const pathWithoutApiPrefix = requestUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/'
  return `${backendApiUrl}${pathWithoutApiPrefix}${requestUrl.search}`
}

async function readRequestBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function copyRequestHeaders(req) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (!key || HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || value == null) {
      continue
    }

    if (Array.isArray(value)) {
      headers.set(key, value.join(', '))
    } else {
      headers.set(key, String(value))
    }
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (host) {
    headers.set('x-forwarded-host', host)
  }
  const proto = req.headers['x-forwarded-proto'] || (req.headers.host && req.headers.host.includes('localhost') ? 'http' : 'https')
  headers.set('x-forwarded-proto', proto)

  return headers
}

function copyResponseHeaders(response, res) {
  for (const [key, value] of response.headers) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || key.toLowerCase() === 'set-cookie') {
      continue
    }
    res.setHeader(key, value)
  }

  const setCookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []
  if (setCookies.length > 0) {
    res.setHeader('Set-Cookie', setCookies)
  } else {
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie)
    }
  }
}

export default async function handler(req, res) {
  const backendApiUrl = getBackendApiUrl()
  const targetUrl = buildTargetUrl(req, backendApiUrl)
  const method = String(req.method || 'GET').toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRequestBody(req)

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: copyRequestHeaders(req),
      body: body && body.length > 0 ? body : undefined,
      redirect: 'manual',
    })

    copyResponseHeaders(response, res)
    res.statusCode = response.status

    if ([204, 205, 304].includes(response.status) || method === 'HEAD') {
      res.end()
      return
    }

    const responseBody = Buffer.from(await response.arrayBuffer())
    res.end(responseBody)
  } catch (error) {
    console.error('Backend proxy failed', error)
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('X-Proxy-Target', backendApiUrl)
    res.end(JSON.stringify({ message: 'Backend proxy unavailable' }))
  }
}
