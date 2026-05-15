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

function getBackendApiUrl(env = {}) {
  return normalizeApiBaseUrl(env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL)
}

function buildTargetUrl(request, backendApiUrl) {
  const requestUrl = new URL(request.url)
  const pathWithoutApiPrefix = requestUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/'
  return `${backendApiUrl}${pathWithoutApiPrefix}${requestUrl.search}`
}

function copyRequestHeaders(headers) {
  const nextHeaders = new Headers()
  for (const [key, value] of headers) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue
    }
    nextHeaders.set(key, value)
  }
  return nextHeaders
}

function copyResponseHeaders(response, backendApiUrl) {
  const headers = new Headers()
  for (const [key, value] of response.headers) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue
    }
    headers.set(key, value)
  }
  headers.set('X-Proxy-Target', backendApiUrl)
  return headers
}

export async function onRequest({ request, env }) {
  const backendApiUrl = getBackendApiUrl(env)
  const targetUrl = buildTargetUrl(request, backendApiUrl)
  const method = request.method.toUpperCase()

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: copyRequestHeaders(request.headers),
      body: method === 'GET' || method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(response, backendApiUrl),
    })
  } catch (error) {
    console.error('Cloudflare Pages API proxy failed', error)
    return Response.json(
      { message: 'Backend proxy unavailable' },
      {
        status: 502,
        headers: {
          'X-Proxy-Target': backendApiUrl,
        },
      },
    )
  }
}
