const DEFAULT_WORKER_API_URL = 'https://mindstores-backend.audit29122006.workers.dev'

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

function getWorkerApiUrl(env = {}) {
  return normalizeApiBaseUrl(env.BACKEND_API_URL || DEFAULT_WORKER_API_URL)
}

function buildTargetUrl(request, workerApiUrl) {
  const requestUrl = new URL(request.url)
  const pathWithoutApiPrefix = requestUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/'
  return `${workerApiUrl}${pathWithoutApiPrefix}${requestUrl.search}`
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

function copyResponseHeaders(response, workerApiUrl) {
  const headers = new Headers()
  for (const [key, value] of response.headers) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue
    }
    headers.set(key, value)
  }
  headers.set('X-Proxy-Target', workerApiUrl)
  return headers
}

export async function onRequest({ request, env }) {
  const workerApiUrl = getWorkerApiUrl(env)
  const targetUrl = buildTargetUrl(request, workerApiUrl)
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
      headers: copyResponseHeaders(response, workerApiUrl),
    })
  } catch (error) {
    console.error('Cloudflare Pages API proxy failed', error)
    return Response.json(
      { message: 'Backend proxy unavailable' },
      {
        status: 502,
        headers: {
          'X-Proxy-Target': workerApiUrl,
        },
      },
    )
  }
}
