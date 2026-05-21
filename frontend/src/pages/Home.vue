<template>
  <v-container class="home-page" fluid>
    <!-- ░░ HANDCRAFTED GALLERY HERO ░░ -->
    <div class="bespoke-hero">
      <div class="bespoke-hero-inner">
        <!-- LEFT PANEL: Brand Statement & Catalog CTA -->
        <div class="hero-left-panel">
          <div class="brand-tagline">
            <span class="tag-label">EST. 2026</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">COLLECTION 01</span>
          </div>

          <h1 class="hero-title">
            Objects of <span class="highlight-serif">utility</span> <br class="d-none d-sm-inline">
            and lasting beauty.
          </h1>

          <p class="hero-subtitle">
            A minimalist online store curating premium essentials. Hand-selected for exceptional craft, clean lines, and absolute functionality.
          </p>

          <div class="hero-button-group">
            <v-btn
              class="action-btn-primary"
              elevation="0"
              rounded="0"
              size="large"
              to="/products"
              variant="flat"
            >
              Explore Collection
              <v-icon end size="16">mdi-arrow-right</v-icon>
            </v-btn>

            <v-btn
              class="action-btn-text"
              rounded="0"
              size="large"
              variant="text"
              @click="scrollToProducts"
            >
              Browse Catalog
              <span class="underline-hover" />
            </v-btn>
          </div>

          <!-- True Value Props Strip -->
          <div class="value-props">
            <div class="prop-item">
              <v-icon class="prop-icon" size="14">mdi-check-circle-outline</v-icon>
              <span class="prop-text">Authentic Design</span>
            </div>
            <div class="prop-item">
              <v-icon class="prop-icon" size="14">mdi-truck-fast-outline</v-icon>
              <span class="prop-text">Carbon-Neutral Delivery</span>
            </div>
            <div class="prop-item">
              <v-icon class="prop-icon" size="14">mdi-reload</v-icon>
              <span class="prop-text">30-Day Trial</span>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL: Human-Developed Showcase Stage -->
        <div class="hero-right-panel">
          <div class="gallery-frame">
            <!-- macOS-style frame header -->
            <div class="frame-header">
              <div class="frame-dots">
                <span class="dot-red" />
                <span class="dot-yellow" />
                <span class="dot-green" />
              </div>
              <div class="frame-title-display">featured_item.json</div>
            </div>

            <!-- Spotlight Showcase Stage -->
            <div
              :aria-label="curatedProduct ? `View ${curatedProduct.name}` : 'Featured premium product'"
              class="showcase-card"
              :class="{ 'showcase-card--active': !!curatedProduct?.product_id }"
              role="button"
              tabindex="0"
              @click="goToProduct(curatedProduct?.product_id)"
              @keydown.enter="goToProduct(curatedProduct?.product_id)"
            >
              <div class="spotlight-tag">CURATOR'S CHOICE</div>
              
              <div class="product-image-container">
                <v-img
                  :alt="curatedProduct?.name || 'Mindstores featured item'"
                  aspect-ratio="1.3"
                  class="product-main-image"
                  contain
                  height="260"
                  :src="heroImageUrl"
                  :style="colorHueStyle"
                />
              </div>

              <!-- Color Dot Selector (Working custom developer interaction) -->
              <div class="interactive-selectors">
                <span class="selector-label">Preview Finish:</span>
                <div class="color-options">
                  <button 
                    v-for="(color, index) in availableColors" 
                    :key="index"
                    class="color-btn"
                    :class="{ active: activeColorIndex === index }"
                    :style="{ backgroundColor: color.hex }"
                    :title="color.name"
                    @click.stop="selectColor(index)"
                  />
                </div>
              </div>

              <!-- Showcase Details -->
              <div class="showcase-details">
                <div class="details-top">
                  <span class="prod-cat">
                    {{ curatedProduct ? normalizeCategory(curatedProduct.category) : 'EXCLUSIVES' }}
                  </span>
                  <h3 class="prod-name">
                    {{ curatedProduct?.name || 'Curating pieces...' }}
                  </h3>
                </div>
                <div class="details-bottom">
                  <span class="prod-price">
                    {{ curatedProduct ? formatAmount(curatedProduct.price) : '—' }}
                  </span>
                  <v-btn
                    class="quick-buy-btn"
                    color="teal-darken-2"
                    :disabled="!curatedProduct || isProductSoldOut(curatedProduct)"
                    rounded="0"
                    size="small"
                    variant="flat"
                    @click.stop="quickAddToCart(curatedProduct)"
                  >
                    Quick Add +
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="productsSection" class="products-anchor" />

    <!-- ░░ QUICK CATEGORY FILTER STRIP ░░ -->
    <div v-if="quickCategories.length > 0" class="flat-cat-strip mt-6">
      <div class="flat-cat-tags">
        <button
          v-for="cat in quickCategories"
          :key="cat.key"
          class="flat-cat-tag"
          @click="router.push(`/${cat.key}`)"
        >
          <span class="cat-tag-emoji">{{ cat.emoji }}</span>
          <span class="cat-tag-label">{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <v-row v-slot:default v-if="loading" class="mt-8" no-gutters>
      <v-col
        v-for="n in 8"
        :key="n"
        cols="12"
        lg="3"
        md="4"
        sm="6"
        class="pa-0"
      >
        <v-skeleton-loader class="border rounded-0" style="margin-right: -1px; margin-bottom: -1px;" type="image, article" />
      </v-col>
    </v-row>

    <v-row v-else-if="products.length > 0" class="mt-8" no-gutters>
      <v-col
        v-for="product in products"
        :key="product.product_id"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <div
          class="product-joint-card"
          role="button"
          tabindex="0"
          @click="goToProduct(product.product_id)"
          @keydown.enter="goToProduct(product.product_id)"
        >
          <div class="product-image-wrap">
            <v-img
              v-if="productImageUrl(product)"
              :alt="product.name"
              aspect-ratio="1"
              contain
              class="product-grid-image"
              :src="productImageUrl(product)"
            />
            <div v-else class="no-image-grid-placeholder">
              <v-icon color="grey-lighten-1" size="36">mdi-image-off-outline</v-icon>
            </div>
          </div>

          <div class="product-card-body">
            <div class="product-card-meta">
              <span class="product-grid-category">{{ normalizeCategory(product.category) }}</span>
              <span class="grid-badge-stock" :class="{ 'grid-badge-stock--out': isProductSoldOut(product) }">
                <span class="status-dot"></span>
                {{ isProductSoldOut(product) ? 'Sold out' : `${Number(product.stock || 0)} left` }}
              </span>
            </div>

            <h3 class="product-grid-name" :title="product.name">{{ product.name }}</h3>

            <div class="product-grid-footer">
              <span class="product-grid-price">{{ formatAmount(product.price) }}</span>
              <button
                :aria-label="`Add ${product.name} to cart`"
                class="product-grid-cart-btn"
                :disabled="isProductSoldOut(product)"
                @click.stop="quickAddToCart(product)"
              >
                <v-icon icon="mdi-cart-plus" size="18" />
              </button>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <div v-else class="flat-empty-products mt-8">
      <v-icon color="grey-lighten-1" size="48" class="mb-3">mdi-package-search-outline</v-icon>
      <h3 class="empty-title">No products found</h3>
      <p class="empty-text">Refresh the catalog or check back later.</p>
    </div>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="2200"
      :type="snackbarColor"
    />
  </v-container>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import heroFallbackImage from '@/assets/DeskImg.jpg'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { useCurrency } from '@/utils/currency'
  import { safeDisplayImageUrl } from '@/utils/images'
  import {
    PRODUCTS_CACHE_INVALIDATED_EVENT,
    readProductsCache,
    writeProductsCache,
  } from '@/utils/productCache'
  import { extractProductItems, fetchProductList } from '@/utils/products'

  const CACHE_TTL_MS = 60 * 1000
  const PRODUCT_REQUEST_TIMEOUT_MS = 20_000
  const PRODUCT_FETCH_RETRIES = 2

  let cachedProducts = null
  let cacheExpiresAt = 0

  const router = useRouter()
  const cartStore = useCartStore()
  const appStore = useAppStore()
  const { formatAmount } = useCurrency()

  const products = ref([])
  const loading = ref(false)
  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')
  const productsSection = ref(null)

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function normalizeCategory (category) {
    const value = String(category || '').trim()
    if (!value) return 'Other'
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  }

  const curatedProduct = computed(() => products.value[0] || null)
  const heroImageUrl = computed(() => safeDisplayImageUrl(curatedProduct.value?.image_url) || heroFallbackImage)

  const activeColorIndex = ref(0)
  const availableColors = [
    { name: 'Warm Amber', hex: '#d97706', filter: 'hue-rotate(30deg) saturate(1.1)' },
    { name: 'Default Finish', hex: '#0f172a', filter: 'none' },
    { name: 'Sage Teal', hex: '#0d9488', filter: 'hue-rotate(130deg) saturate(0.8)' },
    { name: 'Ocean Cobalt', hex: '#2563eb', filter: 'hue-rotate(200deg) brightness(0.9)' }
  ]
  function selectColor (index) {
    activeColorIndex.value = index
  }
  const colorHueStyle = computed(() => {
    return {
      filter: availableColors[activeColorIndex.value].filter
    }
  })

  const productImageUrl = (product) => safeDisplayImageUrl(product?.image_url)
  const productStock = (product) => Number(product?.stock || 0)
  const isProductSoldOut = (product) => productStock(product) <= 0

  // Quick-category strip built from live products
  const quickCategories = computed(() => {
    const emojiMap = {
      electronics: '⚡', clothing: '👕', footwear: '👟', shoes: '👟',
      books: '📚', furniture: '🛋️', beauty: '✨', sports: '🏃',
      toys: '🎮', food: '🍎', jewelry: '💍', watches: '⌚',
      bags: '👜', health: '💊', automotive: '🚗', home: '🏠',
      garden: '🌿', music: '🎵', art: '🎨', office: '💼',
    }
    const seen = new Set()
    const cats = []
    for (const p of products.value) {
      const key = String(p.category || '').trim().toLowerCase().replace(/\s+/g, '-')
      if (key && !seen.has(key) && cats.length < 8) {
        seen.add(key)
        const label = normalizeCategory(p.category)
        const emoji = emojiMap[key] || emojiMap[label.toLowerCase()] || '🛒'
        cats.push({ key, label, emoji })
      }
    }
    return cats
  })

  // Particle positions — seeded per index so they are stable
  function particleStyle(n) {
    const seed = n * 137.508
    const left = ((seed * 1.618) % 100).toFixed(1)
    const top = ((seed * 2.414) % 100).toFixed(1)
    const size = (4 + (n % 5)).toFixed(0)
    const delay = ((n * 0.37) % 4).toFixed(2)
    const dur = (3 + (n % 4)).toFixed(1)
    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${size}px`,
      height: `${size}px`,
      animationDelay: `${delay}s`,
      animationDuration: `${dur}s`,
    }
  }

  function isRetryableProductsError(error) {
    const status = error?.response?.status
    if (status && status < 500 && status !== 429) {
      return false
    }
    return error?.code === 'ECONNABORTED' || !error?.response || status >= 500 || status === 429
  }

  async function fetchProducts(force = false) {
    const now = Date.now()
    if (force) {
      cachedProducts = null
      cacheExpiresAt = 0
    }

    if (cachedProducts && cacheExpiresAt > now) {
      products.value = cachedProducts
      return
    }

    if (!cachedProducts) {
      const persistedCache = readProductsCache()
      if (persistedCache) {
        cachedProducts = persistedCache.products
        cacheExpiresAt = persistedCache.expiresAt
        products.value = persistedCache.products
        if (cacheExpiresAt > now) {
          return
        }
      }
    }

    loading.value = products.value.length === 0
    let lastError = null

    try {
      for (let attempt = 0; attempt <= PRODUCT_FETCH_RETRIES; attempt++) {
        try {
          const response = await fetchProductList({
            params: { limit: 250 },
            timeout: PRODUCT_REQUEST_TIMEOUT_MS,
          })
          const fetchedProducts = extractProductItems(response.data)
          products.value = fetchedProducts
          cachedProducts = fetchedProducts
          cacheExpiresAt = Date.now() + CACHE_TTL_MS
          if (fetchedProducts.length > 0) {
            writeProductsCache(fetchedProducts, cacheExpiresAt)
          }
          return
        } catch (error) {
          lastError = error
          const shouldRetry = attempt < PRODUCT_FETCH_RETRIES && isRetryableProductsError(error)
          if (!shouldRetry) break
          await wait((attempt + 1) * 600)
        }
      }
    } finally {
      if (lastError) {
        if (products.value.length > 0) {
          console.warn('Failed to refresh products. Showing cached products.', lastError)
        } else {
          console.error('Failed to fetch products:', lastError)
        }
      }
      loading.value = false
    }
  }

  function goToProduct(productId) {
    if (!productId) return
    router.push(`/product/${productId}`)
  }

  async function quickAddToCart(product) {
    if (!appStore.isAuthenticated) {
      router.push('/login')
      return
    }

    if (isProductSoldOut(product)) {
      snackbarText.value = 'This product is sold out'
      snackbarColor.value = 'warning'
      snackbar.value = true
      return
    }

    try {
      await cartStore.addToCart(product.product_id, 1)
      snackbarText.value = 'Added to cart'
      snackbarColor.value = 'success'
      snackbar.value = true
    } catch (error) {
      snackbarText.value = error?.response?.data?.message || 'Unable to add item'
      snackbarColor.value = 'warning'
      snackbar.value = true
    }
  }

  function scrollToProducts() {
    const sectionNode = productsSection.value?.$el || productsSection.value
    sectionNode?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleProductsInvalidated() {
    fetchProducts(true)
  }

  onMounted(() => {
    window.addEventListener(PRODUCTS_CACHE_INVALIDATED_EVENT, handleProductsInvalidated)
    fetchProducts()
  })

  onUnmounted(() => {
    window.removeEventListener(PRODUCTS_CACHE_INVALIDATED_EVENT, handleProductsInvalidated)
  })
</script>

<style scoped>
/* ════════════════════════════════ PAGE BASE ═══ */
.home-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 0;
}

/* ════════════════════════════════════ HERO ═══ */
.bespoke-hero {
  position: relative;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding: 100px max(24px, 6vw) 100px;
}

.bespoke-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 80px;
  align-items: center;
}

/* ── LEFT PANEL: Copy & Statement ── */
.hero-left-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 580px;
}

.brand-tagline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
}
.tag-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #64748b;
}
.tag-dot {
  font-size: 10px;
  color: #cbd5e1;
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 3.8rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #0f172a;
  margin: 0 0 24px;
}

/* Developer human touch: signature serif highlight */
.highlight-serif {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}

.hero-subtitle {
  font-size: clamp(15px, 1.5vw, 17px);
  line-height: 1.65;
  color: #475569;
  margin-bottom: 36px;
  font-weight: 400;
}

.hero-button-group {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 48px;
  width: 100%;
}

.action-btn-primary {
  padding: 0 28px !important;
  height: 52px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  background: #0f172a !important;
  transition: background-color 0.2s ease, transform 0.15s ease !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
}
.action-btn-primary:hover {
  background: #1e293b !important;
  transform: translateY(-1px);
}

.action-btn-text {
  position: relative;
  padding: 0 !important;
  height: auto !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  background: transparent !important;
}
.action-btn-text:hover {
  color: #0d9488 !important;
}
.underline-hover {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transition: transform 0.25s ease;
  transform-origin: right;
  transform: scaleX(0);
}
.action-btn-text:hover .underline-hover {
  transform: scaleX(1);
  transform-origin: left;
}

.value-props {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}
.prop-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
}
.prop-icon {
  color: #0d9488;
}
.prop-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ── RIGHT PANEL: Showcase Card & Frame ── */
.hero-right-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.gallery-frame {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 8px 8px 0px #0f172a;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.gallery-frame:hover {
  transform: translate(-2px, -2px);
  box-shadow: 10px 10px 0px #0f172a;
}

.frame-header {
  height: 36px;
  background: #f8fafc;
  border-bottom: 1px solid #0f172a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  position: relative;
}
.frame-dots {
  display: flex;
  gap: 6px;
}
.frame-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #0f172a;
  display: inline-block;
}
.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }

.frame-title-display {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.showcase-card {
  padding: 24px;
  position: relative;
}

.spotlight-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  background: #f1f5f9;
  border: 1px solid #0f172a;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #0f172a;
  padding: 3px 8px;
}

.product-image-container {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  background: #fafafa;
  border: 1px dashed #cbd5e1;
}

.product-main-image {
  max-width: 90%;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease;
}
.showcase-card:hover .product-main-image {
  transform: scale(1.02);
}

.interactive-selectors {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 16px;
}
.selector-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.color-options {
  display: flex;
  gap: 8px;
}
.color-btn {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s, border-color 0.2s;
  position: relative;
  outline: none;
}
.color-btn.active {
  transform: scale(1.3);
  border-color: #0f172a;
  box-shadow: 0 0 0 1px #0f172a;
}

.showcase-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.details-top {
  display: flex;
  flex-direction: column;
}
.prod-cat {
  font-size: 10px;
  font-weight: 700;
  color: #0d9488;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.prod-name {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 2px 0 0;
}

.details-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.prod-price {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
}

.quick-buy-btn {
  font-size: 12px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  background: #0f172a !important;
  height: 36px !important;
  padding: 0 16px !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  transition: background-color 0.15s ease !important;
}
.quick-buy-btn:hover:not(:disabled) {
  background: #0d9488 !important;
}

/* ════════════════════════════ PRODUCT JOINT GRID ══ */
.product-joint-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border: 1px solid #0f172a;
  margin-right: -1px;
  margin-bottom: -1px;
  cursor: pointer;
  position: relative;
  z-index: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, z-index 0s;
}

.product-joint-card:hover {
  background: #fafafa;
  border-color: #0d9488;
  z-index: 2;
}

.product-image-wrap {
  position: relative;
  width: 100%;
  background: #fafafa;
  border-bottom: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.product-grid-image {
  max-width: 100%;
  transition: transform 0.3s ease;
}

.product-joint-card:hover .product-grid-image {
  transform: scale(1.03);
}

.no-image-grid-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  width: 100%;
}

.product-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.product-grid-category {
  font-size: 10px;
  font-weight: 800;
  color: #0d9488;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Flat Grid Stock Badge */
.grid-badge-stock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #166534;
  background: rgba(22, 163, 74, 0.06);
  padding: 3px 8px;
  border: 1px solid rgba(22, 163, 74, 0.12);
}

.grid-badge-stock--out {
  color: #991b1b;
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.12);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.product-grid-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px;
  line-height: 1.4;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.product-grid-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed #f1f5f9;
}

.product-grid-price {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.product-grid-cart-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s ease;
}

.product-grid-cart-btn:hover:not(:disabled) {
  background: #0d9488;
}

.product-grid-cart-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

/* ════════════════════════════ CATEGORY STRIP ═══ */
.flat-cat-strip {
  padding: 24px max(24px, 4vw) 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flat-cat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.flat-cat-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #0f172a;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
}

.flat-cat-tag:hover {
  background: #f0fdf9;
  border-color: #0d9488;
  color: #0d9488;
  transform: translateY(-1px);
}

.flat-cat-tag:active {
  transform: translateY(0);
}

.cat-tag-emoji {
  font-size: 15px;
}

/* ════════════════════════════ EMPTY STATE ═════ */
.flat-empty-products {
  width: 100%;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
}

.empty-text {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* ════════════════════════════ PRODUCTS ANCHOR ═══ */
.products-anchor {
  height: 1px;
  scroll-margin-top: 84px;
}

/* ════════════════════════════ RESPONSIVE ════════ */
@media (max-width: 959px) {
  .bespoke-hero {
    padding: 60px 24px;
  }
  .bespoke-hero-inner {
    grid-template-columns: 1fr;
    gap: 50px;
  }
  .hero-left-panel {
    max-width: 100%;
    align-items: center;
    text-align: center;
  }
  .hero-button-group {
    justify-content: center;
  }
  .value-props {
    justify-content: center;
  }
  .hero-right-panel {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 599px) {
  .bespoke-hero {
    padding: 40px 16px 60px;
  }
  .hero-title {
    font-size: 2rem;
  }
  .hero-button-group {
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }
  .action-btn-primary {
    width: 100%;
    justify-content: center;
  }
  .value-props {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding-top: 20px;
  }
  .prop-item {
    width: 100%;
    justify-content: flex-start;
  }
}
@media (max-width: 599px) {
  .flat-cat-strip { padding: 24px 16px 0; }
}
</style>
