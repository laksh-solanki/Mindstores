import openSansRegularUrl from '@fontsource/open-sans/files/open-sans-latin-400-normal.woff2?url'
import openSansBoldUrl from '@fontsource/open-sans/files/open-sans-latin-700-normal.woff2?url'
import { PDFDocument } from 'pdf-lib'
import invoiceTemplateSvg from '@/assets/invoice-template.svg?raw'
import brandLogoSvg from '@/assets/logo.svg?raw'

const PAGE_WIDTH = 595.5
const PAGE_HEIGHT = 842.25
const ITEMS_PER_PAGE = 6
const RENDER_SCALE = 3
const FONT_FAMILY = 'Invoice Open Sans'
const BRAND_LOGO_MARKUP = brandLogoSvg
  .replace(/^<svg[^>]*>/, '<svg x="58" y="56" width="60" height="60" viewBox="0 0 100 100">')
  .replace(/<\/svg>\s*$/, '</svg>')

let invoiceFontAssetsPromise

function sanitizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\u0020-\u007E]/g, '')
    .trim()
}

function escapeXml(value) {
  return sanitizeText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function chunkItems(items) {
  const chunks = []
  for (let index = 0; index < items.length; index += ITEMS_PER_PAGE) {
    chunks.push(items.slice(index, index + ITEMS_PER_PAGE))
  }
  return chunks.length > 0 ? chunks : [[{ name: 'Order total', quantity: 1, price: 0 }]]
}

function arrayBufferToDataUrl(buffer, mimeType) {
  const bytes = new Uint8Array(buffer)
  const chunks = []
  const chunkSize = 32_768

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCodePoint(...bytes.subarray(index, index + chunkSize)))
  }

  return `data:${mimeType};base64,${window.btoa(chunks.join(''))}`
}

async function ensureInvoiceFontAssets() {
  if (!invoiceFontAssetsPromise) {
    invoiceFontAssetsPromise = (async () => {
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(openSansRegularUrl),
        fetch(openSansBoldUrl)
      ])

      if (!regularResponse.ok || !boldResponse.ok) {
        throw new Error('Invoice font assets failed to load')
      }

      const [regularBuffer, boldBuffer] = await Promise.all([
        regularResponse.arrayBuffer(),
        boldResponse.arrayBuffer()
      ])

      if (typeof FontFace !== 'undefined' && document?.fonts) {
        const regularFace = new FontFace(FONT_FAMILY, regularBuffer.slice(0), { weight: '400' })
        const boldFace = new FontFace(FONT_FAMILY, boldBuffer.slice(0), { weight: '700' })
        await Promise.all([regularFace.load(), boldFace.load()])
        document.fonts.add(regularFace)
        document.fonts.add(boldFace)
      }

      return {
        regularDataUrl: arrayBufferToDataUrl(regularBuffer, 'font/woff2'),
        boldDataUrl: arrayBufferToDataUrl(boldBuffer, 'font/woff2')
      }
    })()
  }

  return invoiceFontAssetsPromise
}

function createMeasureContext() {
  return document.createElement('canvas').getContext('2d')
}

function fitText(value, { context, fontSize, fontWeight = 400, maxWidth }) {
  const normalized = sanitizeText(value)
  if (!normalized) {
    return ''
  }

  context.font = `${fontWeight} ${fontSize}px "${FONT_FAMILY}"`
  if (context.measureText(normalized).width <= maxWidth) {
    return normalized
  }

  let candidate = normalized
  while (candidate.length > 1 && context.measureText(`${candidate}...`).width > maxWidth) {
    candidate = candidate.slice(0, -1)
  }

  return `${candidate}...`
}

function buildAddressLine(profile) {
  const locality = [profile.city, profile.state, profile.postalCode].filter(Boolean).join(', ')
  return [profile.address, locality].filter(Boolean).join(', ')
}

function uniqueLines(lines) {
  const seen = new Set()
  return lines.filter((line) => {
    const normalized = sanitizeText(line)
    if (!normalized || seen.has(normalized.toLowerCase())) {
      return false
    }
    seen.add(normalized.toLowerCase())
    return true
  })
}

function buildBilledToLines(profile) {
  return uniqueLines([
    profile.name || 'Customer',
    profile.email,
    profile.phone,
    buildAddressLine(profile)
  ]).slice(0, 4)
}

function wrapText(value, {
  context,
  fontSize,
  fontWeight = 400,
  maxWidth,
  maxLines = 2
}) {
  const normalized = sanitizeText(value)
  if (!normalized) {
    return []
  }

  context.font = `${fontWeight} ${fontSize}px "${FONT_FAMILY}"`
  if (context.measureText(normalized).width <= maxWidth) {
    return [normalized]
  }

  const lines = []
  let current = ''
  for (const character of normalized) {
    const candidate = `${current}${character}`
    if (context.measureText(candidate).width <= maxWidth || current.length === 0) {
      current = candidate
      continue
    }
    lines.push(current)
    current = character
    if (lines.length === maxLines - 1) {
      break
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current)
  }

  const consumedLength = lines.join('').length
  if (consumedLength < normalized.length && lines.length > 0) {
    const lastLine = lines.at(-1)
    lines[lines.length - 1] = fitText(`${lastLine}${normalized.slice(consumedLength)}`, {
      context,
      fontSize,
      fontWeight,
      maxWidth
    })
  }

  return lines
}

function fitFontSize(value, {
  context,
  fontWeight = 400,
  maxWidth,
  startSize,
  minSize
}) {
  const normalized = sanitizeText(value)
  let size = startSize
  while (size > minSize) {
    context.font = `${fontWeight} ${size}px "${FONT_FAMILY}"`
    if (context.measureText(normalized).width <= maxWidth) {
      return size
    }
    size -= 0.5
  }
  return minSize
}

function textNode({
  x,
  y,
  value,
  size = 12.005,
  weight = 400,
  fill = '#1D1D1B',
  anchor = 'start'
}) {
  return `<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(value)}</text>`
}

function buildOverlay({
  pageItems,
  pageIndex,
  pageCount,
  order,
  profile,
  formatAmount,
  formatDate,
  measureContext,
  regularDataUrl,
  boldDataUrl
}) {
  const sourceItems = Array.isArray(order.items) ? order.items : pageItems
  const subtotal = Number(order.subtotal_amount || sourceItems.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1)
  }, 0))
  const discount = Number(order.discount_amount || 0)
  const total = Number(order.total_amount || Math.max(0, subtotal - discount))
  const ink = '#1D1D1B'
  const white = '#FFFFFF'
  const rowBaselines = [326, 362, 398, 434, 470, 506]
  const rowSeparators = rowBaselines.slice(0, pageItems.length).map((baseline) => baseline + 14)

  const billedToLines = buildBilledToLines(profile).map((line) => fitText(line, {
    context: measureContext,
    fontSize: 12.005,
    maxWidth: 240
  }))
  const orderIdLines = wrapText(order.order_id, {
    context: measureContext,
    fontSize: 10,
    maxWidth: 126,
    maxLines: 2
  })
  const safeStoreEmail = fitText(profile.email || 'Digital storefront', {
    context: measureContext,
    fontSize: 12.005,
    maxWidth: 204
  })

  const dynamicItems = pageItems.map((item, index) => {
    const quantity = Number(item.quantity || 1)
    const price = Number(item.price || 0)
    const safeItemName = fitText(item.name || item.product_id || 'Product', {
      context: measureContext,
      fontSize: 12.005,
      maxWidth: 210
    })

    return [
      textNode({ x: 59.55, y: rowBaselines[index], value: safeItemName }),
      textNode({ x: 279.507, y: rowBaselines[index], value: String(quantity) }),
      textNode({ x: 362.438, y: rowBaselines[index], value: formatAmount(price) }),
      textNode({ x: 487.737, y: rowBaselines[index], value: formatAmount(price * quantity) })
    ].join('')
  }).join('')

  const rowLines = rowSeparators.map((y) => {
    return `<line x1="59.55" y1="${y}" x2="536.2" y2="${y}" stroke="${ink}" stroke-width="0.75" />`
  }).join('')

  const lastSeparatorY = rowSeparators.at(-1) || 340
  const subtotalY = Math.max(lastSeparatorY + 28, 497)
  const discountY = subtotalY + 25
  const totalBarY = discountY + 11.28
  const totalTextY = totalBarY + 31.72
  const continuationY = Math.max(lastSeparatorY + 28, 497)
  const totalAmountText = formatAmount(total)
  const totalAmountSize = fitFontSize(totalAmountText, {
    context: measureContext,
    fontWeight: 700,
    maxWidth: 148,
    startSize: 18.007,
    minSize: 14
  })
  const totalBlock = pageIndex === pageCount - 1
    ? [
        textNode({ x: 362.438, y: subtotalY, value: 'Subtotal', weight: 700 }),
        textNode({ x: 570, y: subtotalY, value: formatAmount(subtotal), anchor: 'end' }),
        textNode({ x: 361.273, y: discountY, value: 'Discount', weight: 700 }),
        textNode({ x: 570, y: discountY, value: formatAmount(discount), anchor: 'end' }),
        `<rect x="330" y="${totalBarY}" width="250" height="40.08" fill="${ink}" />`,
        textNode({ x: 362.438, y: totalTextY, value: 'Total', size: 18.007, weight: 700, fill: white }),
        textNode({ x: 570, y: totalTextY, value: totalAmountText, size: totalAmountSize, weight: 700, fill: white, anchor: 'end' })
      ].join('')
    : textNode({ x: 362.438, y: continuationY, value: 'Continued on next page', weight: 700 })

  const invoiceDateY = orderIdLines.length > 1 ? 229 : 216
  const invoicePageY = invoiceDateY + 16

  return `
    <style>
      @font-face {
        font-family: "${FONT_FAMILY}";
        src: url("${regularDataUrl}") format("woff2");
        font-weight: 400;
      }
      @font-face {
        font-family: "${FONT_FAMILY}";
        src: url("${boldDataUrl}") format("woff2");
        font-weight: 700;
      }
    </style>
    <g id="invoice-dynamic-layer">
      <rect x="56" y="54" width="64" height="64" fill="${white}" />
      ${BRAND_LOGO_MARKUP}
      <rect x="56" y="158" width="255" height="104" fill="${white}" />
      <rect x="420" y="157" width="126" height="96" fill="${white}" />
      <rect x="56" y="300" width="480" height="250" fill="${white}" />
      <rect x="330" y="475" width="266" height="190" fill="${white}" />
      ${pageIndex === pageCount - 1
        ? ''
        : `<rect x="56" y="580" width="280" height="100" fill="${white}" />`
      }
      <rect x="56" y="696" width="260" height="96" fill="${white}" />
      <rect x="320" y="715" width="240" height="82" fill="${white}" />

      ${textNode({ x: 59.925, y: 183, value: 'Billed to:', weight: 700 })}
      ${billedToLines.map((line, index) => textNode({
        x: 59.925,
        y: 204 + (index * 16),
        value: line
      })).join('')}

      ${textNode({ x: 536.2, y: 183, value: 'Invoice No.', anchor: 'end' })}
      ${orderIdLines.map((line, index) => textNode({
        x: 536.2,
        y: 200 + (index * 13),
        value: line,
        size: 10,
        anchor: 'end'
      })).join('')}
      ${textNode({ x: 536.2, y: invoiceDateY, value: formatDate(order.created_at), anchor: 'end' })}
      ${pageCount > 1 ? textNode({ x: 536.2, y: invoicePageY, value: `Page ${pageIndex + 1} of ${pageCount}`, size: 10, anchor: 'end' }) : ''}

      ${rowLines}
      ${dynamicItems}
      ${totalBlock}

      ${textNode({ x: 59.925, y: 714, value: 'Payment Information', weight: 700 })}
      ${textNode({ x: 59.925, y: 734, value: `Status: ${sanitizeText(order.status || 'completed')}` })}
      ${textNode({ x: 59.925, y: 751, value: `Promo code: ${sanitizeText(order.promo_code || 'None')}` })}
      ${textNode({ x: 59.925, y: 768, value: `Discount: ${formatAmount(discount)}` })}

      ${textNode({ x: 536.2, y: 760, value: 'Mindstores', size: 18.007, weight: 700, anchor: 'end' })}
      ${textNode({ x: 536.2, y: 783, value: safeStoreEmail, anchor: 'end' })}
    </g>
  `
}

function buildInvoiceSvg({ overlay }) {
  return invoiceTemplateSvg.replace('</svg>', `${overlay}</svg>`)
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = url
  })
}

async function renderSvgToPngBytes(svgMarkup) {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(PAGE_WIDTH * RENDER_SCALE)
    canvas.height = Math.round(PAGE_HEIGHT * RENDER_SCALE)
    const context = canvas.getContext('2d')
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value)
          return
        }
        reject(new Error('Failed to render invoice SVG'))
      }, 'image/png')
    })

    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export async function createInvoicePdfBlob({
  order,
  profile,
  formatAmount,
  formatDate
}) {
  const invoiceDocument = await PDFDocument.create()
  const fontAssets = await ensureInvoiceFontAssets()
  const measureContext = createMeasureContext()
  const pages = chunkItems(
    Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : [{ name: 'Order total', quantity: 1, price: order.total_amount || 0 }]
  )

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const overlay = buildOverlay({
      pageItems: pages[pageIndex],
      pageIndex,
      pageCount: pages.length,
      order,
      profile,
      formatAmount,
      formatDate,
      measureContext,
      ...fontAssets
    })
    const pngBytes = await renderSvgToPngBytes(buildInvoiceSvg({ overlay }))
    const png = await invoiceDocument.embedPng(pngBytes)
    const page = invoiceDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    page.drawImage(png, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT
    })
  }

  return new Blob([await invoiceDocument.save()], { type: 'application/pdf' })
}
