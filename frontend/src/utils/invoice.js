import dancingScriptUrl from '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff2?url'
import openSansRegularUrl from '@fontsource/open-sans/files/open-sans-latin-400-normal.woff2?url'
import openSansBoldUrl from '@fontsource/open-sans/files/open-sans-latin-700-normal.woff2?url'
import { PDFDocument } from 'pdf-lib'
import brandLogoSvg from '@/assets/logo.svg?raw'

const PAGE_WIDTH = 595.5
const PAGE_HEIGHT = 842.25
const ITEMS_PER_PAGE = 6
const RENDER_SCALE = 3
const FONT_FAMILY = 'Invoice Open Sans'
const BRAND_LOGO_MARKUP = brandLogoSvg
  .replace(
    /^<svg[^>]*>/,
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="6" y="4" width="200" height="80" viewBox="0 0 1500 599.999999" preserveAspectRatio="xMidYMid meet">',
  )
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
      const [regularResponse, boldResponse, cursiveResponse] = await Promise.all([
        fetch(openSansRegularUrl),
        fetch(openSansBoldUrl),
        fetch(dancingScriptUrl)
      ])

      if (!regularResponse.ok || !boldResponse.ok || !cursiveResponse.ok) {
        throw new Error('Invoice font assets failed to load')
      }

      const [regularBuffer, boldBuffer, cursiveBuffer] = await Promise.all([
        regularResponse.arrayBuffer(),
        boldResponse.arrayBuffer(),
        cursiveResponse.arrayBuffer()
      ])

      if (typeof FontFace !== 'undefined' && document?.fonts) {
        const regularFace = new FontFace(FONT_FAMILY, regularBuffer.slice(0), { weight: '400' })
        const boldFace = new FontFace(FONT_FAMILY, boldBuffer.slice(0), { weight: '700' })
        const cursiveFace = new FontFace('Invoice Cursive', cursiveBuffer.slice(0), { weight: '400' })
        await Promise.all([regularFace.load(), boldFace.load(), cursiveFace.load()])
        document.fonts.add(regularFace)
        document.fonts.add(boldFace)
        document.fonts.add(cursiveFace)
      }

      return {
        regularDataUrl: arrayBufferToDataUrl(regularBuffer, 'font/woff2'),
        boldDataUrl: arrayBufferToDataUrl(boldBuffer, 'font/woff2'),
        cursiveDataUrl: arrayBufferToDataUrl(cursiveBuffer, 'font/woff2')
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

function textNode({
  x,
  y,
  value,
  size = 10,
  weight = 400,
  fill = '#1E293B',
  anchor = 'start',
  family = FONT_FAMILY
}) {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(value)}</text>`
}

function renderStatusBadge(status, x, y) {
  const cleanStatus = String(status || 'Completed').toLowerCase()
  let bg = '#E6F4EA' // light green tint
  let text = '#137333' // dark green
  let label = 'PAID'

  switch (cleanStatus) {
    case 'completed':
    case 'paid':
    case 'delivered': {
      bg = '#E6F4EA'
      text = '#137333'
      label = 'PAID'

      break;
    }
    case 'pending':
    case 'processing':
    case 'ordered': {
      bg = '#FEF7E0' // light gold/yellow
      text = '#B06000'
      label = 'PENDING'

      break;
    }
    case 'cancelled':
    case 'failed': {
      bg = '#FCE8E6' // light red
      text = '#C5221F'
      label = 'CANCELLED'

      break;
    }
    default: {
      label = cleanStatus.toUpperCase()
    }
  }

  const badgeWidth = 65
  const badgeHeight = 18
  const rx = 4

  return `
    <g>
      <rect x="${x}" y="${y}" width="${badgeWidth}" height="${badgeHeight}" rx="${rx}" fill="${bg}" />
      <text x="${x + badgeWidth / 2}" y="${y + 12.5}" font-family="${FONT_FAMILY}" font-size="9" font-weight="700" fill="${text}" text-anchor="middle">${label}</text>
    </g>
  `
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
  boldDataUrl,
  cursiveDataUrl
}) {
  const sourceItems = Array.isArray(order.items) ? order.items : pageItems
  const subtotal = Number(order.subtotal_amount || sourceItems.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1)
  }, 0))
  const discount = Number(order.discount_amount || 0)
  const total = Number(order.total_amount || Math.max(0, subtotal - discount))

  const inkDark = '#0F172A' // Slate-900
  const inkMedium = '#475569' // Slate-600
  const inkLight = '#64748B' // Slate-500
  const borderLight = '#E2E8F0' // Slate-200
  const brandTeal = '#00897B' // Brand Teal

  // Address and meta columns configuration
  const billedToLines = buildBilledToLines(profile).map((line) => fitText(line, {
    context: measureContext,
    fontSize: 10,
    maxWidth: 240
  }))

  const safeOrderId = fitText(order.order_id, {
    context: measureContext,
    fontSize: 11,
    fontWeight: 700,
    maxWidth: 120
  })

  // Table row calculations
  // Header: y=270, height=26. Dynamic rows start at y=310. Row height is 36.
  const rowBaselines = pageItems.map((_, index) => 318 + (index * 36))
  const rowSeparators = pageItems.map((_, index) => 296 + ((index + 1) * 36))

  const dynamicItems = pageItems.map((item, index) => {
    const quantity = Number(item.quantity || 1)
    const price = Number(item.price || 0)
    const safeItemName = fitText(item.name || item.product_id || 'Product', {
      context: measureContext,
      fontSize: 11,
      maxWidth: 230
    })

    return [
      textNode({ x: 55, y: rowBaselines[index], value: safeItemName, size: 11 }),
      textNode({ x: 320, y: rowBaselines[index], value: String(quantity), size: 11, anchor: 'middle', fill: inkMedium }),
      textNode({ x: 430, y: rowBaselines[index], value: formatAmount(price), size: 11, anchor: 'end', fill: inkMedium }),
      textNode({ x: 540, y: rowBaselines[index], value: formatAmount(price * quantity), size: 11, anchor: 'end', weight: 700 })
    ].join('')
  }).join('')

  const separatorLines = rowSeparators.map((y) => {
    return `<line x1="45" y1="${y}" x2="550.5" y2="${y}" stroke="#F1F5F9" stroke-width="1" />`
  }).join('')

  // Totals Section placement (bottom of table area at y=512)
  const isLastPage = pageIndex === pageCount - 1
  const totalsBlock = isLastPage
    ? [
      textNode({ x: 360, y: 542, value: 'Subtotal', size: 10, fill: inkMedium }),
      textNode({ x: 540, y: 542, value: formatAmount(subtotal), size: 10, anchor: 'end', weight: 700 }),
      textNode({ x: 360, y: 560, value: 'Discount', size: 10, fill: inkMedium }),
      textNode({ x: 540, y: 560, value: formatAmount(discount), size: 10, anchor: 'end', weight: 700 }),
      `<rect x="340" y="575" width="210.5" height="34" rx="4" fill="${brandTeal}" />`,
      textNode({ x: 355, y: 596, value: 'Total Paid', size: 12, weight: 700, fill: '#FFFFFF' }),
      textNode({ x: 530, y: 596, value: formatAmount(total), size: 13, weight: 700, fill: '#FFFFFF', anchor: 'end' })
    ].join('')
    : [
      `<rect x="340" y="575" width="210.5" height="34" rx="4" fill="#F8FAFC" />`,
      textNode({ x: 445, y: 596, value: 'Continued on next page', size: 10, weight: 700, fill: inkMedium, anchor: 'middle' })
    ].join('')

  // Build customer and store info
  const billedToName = billedToLines[0] || 'Customer'
  const billedToDetails = billedToLines.slice(1)

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595.5 842.25" width="595.5" height="842.25">
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
        @font-face {
          font-family: "Invoice Cursive";
          src: url("${cursiveDataUrl}") format("woff2");
          font-weight: 400;
        }
      </style>

      <!-- Clean Background Page -->
      <rect width="595.5" height="842.25" fill="#FFFFFF" />

      <!-- Top and Bottom accent colors for premium branding representation -->
      <rect x="0" y="0" width="595.5" height="6" fill="${brandTeal}" />
      <rect x="0" y="836.25" width="595.5" height="6" fill="${brandTeal}" />

      <!-- Header -->
      ${BRAND_LOGO_MARKUP}
      ${textNode({ x: 45, y: 86, value: 'Digital Storefront', size: 10, fill: inkLight })}
      
      ${textNode({ x: 550.5, y: 64, value: 'DEMO SUMMARY', size: 30, weight: 400, fill: brandTeal, anchor: 'end', family: 'Invoice Cursive' })}
      ${pageCount > 1 ? textNode({ x: 550.5, y: 78, value: `Page ${pageIndex + 1} of ${pageCount}`, size: 9, fill: inkLight, anchor: 'end' }) : ''}

      <!-- Top Meta Info Divider -->
      <line x1="45" y1="105" x2="550.5" y2="105" stroke="${borderLight}" stroke-width="1" />

      <!-- Metadata Grid -->
      ${textNode({ x: 45, y: 124, value: 'DEMO ORDER NO.', size: 9, weight: 700, fill: inkLight })}
      ${textNode({ x: 45, y: 142, value: safeOrderId, size: 11, weight: 700, fill: inkDark })}

      ${textNode({ x: 185, y: 124, value: 'INVOICE DATE', size: 9, weight: 700, fill: inkLight })}
      ${textNode({ x: 185, y: 142, value: formatDate(order.created_at), size: 11, fill: inkDark })}

      ${textNode({ x: 325, y: 124, value: 'PAYMENT STATUS', size: 9, weight: 700, fill: inkLight })}
      ${renderStatusBadge(order.status, 325, 129)}

      ${textNode({ x: 550.5, y: 124, value: 'TOTAL DUE', size: 9, weight: 700, fill: inkLight, anchor: 'end' })}
      ${textNode({ x: 550.5, y: 142, value: formatAmount(total), size: 12, weight: 700, fill: brandTeal, anchor: 'end' })}

      <!-- Billing Info Divider -->
      <line x1="45" y1="158" x2="550.5" y2="158" stroke="${borderLight}" stroke-width="1" />

      <!-- Billing Details -->
      ${textNode({ x: 45, y: 178, value: 'BILLED TO', size: 9, weight: 700, fill: inkLight })}
      ${textNode({ x: 45, y: 196, value: billedToName, size: 11, weight: 700, fill: inkDark })}
      ${billedToDetails.map((line, index) => textNode({
    x: 45,
    y: 211 + (index * 15),
    value: line,
    size: 10,
    fill: inkMedium
  })).join('')}

      ${textNode({ x: 360, y: 178, value: 'FROM', size: 9, weight: 700, fill: inkLight })}
      ${textNode({ x: 360, y: 196, value: 'Mindstore Portfolio Demo', size: 11, weight: 700, fill: inkDark })}
      ${textNode({ x: 360, y: 211, value: 'lakshsolanki848@gmail.com', size: 10, fill: inkMedium })}
      ${textNode({ x: 360, y: 226, value: 'No real payment or delivery', size: 10, fill: inkMedium })}

      <!-- Table Area -->
      <!-- Table Header Backing -->
      <rect x="45" y="270" width="505.5" height="26" rx="4" fill="#F8FAFC" />
      ${textNode({ x: 55, y: 287, value: 'Item Description', size: 9, weight: 700, fill: inkMedium })}
      ${textNode({ x: 320, y: 287, value: 'Quantity', size: 9, weight: 700, fill: inkMedium, anchor: 'middle' })}
      ${textNode({ x: 430, y: 287, value: 'Unit Price', size: 9, weight: 700, fill: inkMedium, anchor: 'end' })}
      ${textNode({ x: 540, y: 287, value: 'Total', size: 9, weight: 700, fill: inkMedium, anchor: 'end' })}
      
      <!-- Horizontal lines framing the table content -->
      <line x1="45" y1="296" x2="550.5" y2="296" stroke="${borderLight}" stroke-width="1" />
      <line x1="45" y1="512" x2="550.5" y2="512" stroke="${borderLight}" stroke-width="1" />

      <!-- Row lines and content -->
      ${separatorLines}
      ${dynamicItems}

      <!-- Totals Block -->
      ${totalsBlock}

      <!-- Bottom Payment & Help Divider -->
      <line x1="45" y1="645" x2="550.5" y2="645" stroke="${borderLight}" stroke-width="1" />

      <!-- Footer Columns -->
      ${textNode({ x: 45, y: 665, value: 'PAYMENT DETAILS', size: 9, weight: 700, fill: inkLight })}
      ${textNode({ x: 45, y: 683, value: `Demo Method: ${sanitizeText(order.payment_method || 'Sample selection')}`, size: 10, fill: inkMedium })}
      ${textNode({ x: 45, y: 699, value: `Promo Code: ${sanitizeText(order.promo_code || 'None')}`, size: 10, fill: inkMedium })}
      ${textNode({ x: 45, y: 715, value: `Taxes (Included): ${formatAmount(0)}`, size: 10, fill: inkMedium })}

      ${textNode({ x: 360, y: 665, value: 'NEED HELP?', size: 9, weight: 700, fill: inkLight })}
      ${textNode({ x: 360, y: 683, value: 'Email: lakshsolanki848@gmail.com', size: 10, fill: inkMedium })}
      ${textNode({ x: 360, y: 699, value: 'Help Center: open /help in Mindstore', size: 10, fill: inkMedium })}

      ${textNode({ x: 45, y: 760, value: 'Mindstore portfolio demonstration', size: 10, weight: 700, fill: brandTeal })}
      ${textNode({ x: 45, y: 775, value: 'This summary does not represent a real purchase, payment, or delivery.', size: 9.5, fill: inkMedium })}
    </svg>
  `
}

function buildInvoiceSvg({ overlay }) {
  // Now our overlay is the complete dynamic SVG markup
  return overlay
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
