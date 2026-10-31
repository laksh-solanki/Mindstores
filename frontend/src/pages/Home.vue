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
            A portfolio storefront for exploring useful essentials, live catalog navigation, account-based shopping,
            and a clearly marked demo checkout experience.
          </p>

          <div class="hero-button-group">
            <v-btn
              class="btn-store-primary"
              elevation="0"
              rounded="0"
              to="/products"
            >
              Explore Collection
              <v-icon end size="16">mdi-arrow-right</v-icon>
            </v-btn>

            <v-btn
              class="btn-store-outline"
              elevation="0"
              rounded="0"
              @click="scrollToProducts"
            >
              Browse Catalog
            </v-btn>
          </div>

          <!-- True Value Props Strip -->
          <div class="value-props">
            <div class="prop-item">
              <v-icon class="prop-icon" size="14">mdi-check-circle-outline</v-icon>
              <span class="prop-text">Live Catalog</span>
            </div>
            <div class="prop-item">
              <v-icon class="prop-icon" size="14">mdi-account-check-outline</v-icon>
              <span class="prop-text">Account-Based Cart</span>
            </div>
            <div class="prop-item">
              <v-icon class="prop-icon" size="14">mdi-clipboard-check-outline</v-icon>
              <span class="prop-text">Demo Checkout</span>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL: Image Gallery -->
        <div class="hero-right-panel">
          <div class="image-gallery-collage">
            <template v-if="galleryProducts.length > 0">
              <div
                v-for="(product, idx) in galleryProducts"
                :key="product.product_id"
                class="gallery-collage-item"
                :class="`item-${idx + 1}`"
                role="button"
                tabindex="0"
                @click="goToProduct(product.product_id)"
                @keydown.enter="goToProduct(product.product_id)"
              >
                <v-img
                  :alt="product.name"
                  class="collage-img"
                  cover
                  height="100%"
                  :src="productImageUrl(product) || heroFallbackImage"
                />
                <div class="collage-overlay">
                  <span class="collage-prod-name">{{ product.name }}</span>
                </div>
              </div>
            </template>
            <template v-else>
              <div v-for="n in 3" :key="n" class="gallery-collage-item" :class="`item-${n}`">
                <v-skeleton-loader class="h-100" type="image" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ░░ THE LOOKBOOK GALLERY ░░ -->
    <div class="editorial-section">
      <div class="editorial-header">
        <h2 class="editorial-title">Curated Aesthetics</h2>
        <div class="editorial-line" />
        <p class="editorial-subtitle">Explore the intersection of form, function, and enduring design.</p>
      </div>

      <div class="editorial-gallery">
        <template v-if="lookbookProducts.length >= 3">
          <!-- Featured large image -->
          <div
            class="editorial-item featured"
            role="button"
            tabindex="0"
            @click="goToProduct(lookbookProducts[0].product_id)"
            @keydown.enter="goToProduct(lookbookProducts[0].product_id)"
          >
            <div class="ed-image-wrap">
              <v-img
                :alt="lookbookProducts[0].name"
                class="ed-img"
                contain
                :src="productImageUrl(lookbookProducts[0]) || heroFallbackImage"
              />
            </div>
            <div class="ed-meta">
              <span class="ed-cat">01 — {{ normalizeCategory(lookbookProducts[0].category) }}</span>
              <h3 class="ed-name">{{ lookbookProducts[0].name }}</h3>
              <span class="ed-price">{{ formatAmount(lookbookProducts[0].price) }}</span>
            </div>
          </div>

          <!-- Right column for 2 smaller images -->
          <div class="editorial-side">
            <div
              class="editorial-item secondary"
              role="button"
              tabindex="0"
              @click="goToProduct(lookbookProducts[1].product_id)"
              @keydown.enter="goToProduct(lookbookProducts[1].product_id)"
            >
              <div class="ed-image-wrap">
                <v-img
                  :alt="lookbookProducts[1].name"
                  class="ed-img"
                  contain
                  :src="productImageUrl(lookbookProducts[1]) || heroFallbackImage"
                />
              </div>
              <div class="ed-meta">
                <span class="ed-cat">02 — {{ normalizeCategory(lookbookProducts[1].category) }}</span>
                <h3 class="ed-name">{{ lookbookProducts[1].name }}</h3>
                <span class="ed-price">{{ formatAmount(lookbookProducts[1].price) }}</span>
              </div>
            </div>

            <div
              class="editorial-item tertiary"
              role="button"
              tabindex="0"
              @click="goToProduct(lookbookProducts[2].product_id)"
              @keydown.enter="goToProduct(lookbookProducts[2].product_id)"
            >
              <div class="ed-image-wrap">
                <v-img
                  :alt="lookbookProducts[2].name"
                  class="ed-img"
                  contain
                  :src="productImageUrl(lookbookProducts[2]) || heroFallbackImage"
                />
              </div>
              <div class="ed-meta">
                <span class="ed-cat">03 — {{ normalizeCategory(lookbookProducts[2].category) }}</span>
                <h3 class="ed-name">{{ lookbookProducts[2].name }}</h3>
                <span class="ed-price">{{ formatAmount(lookbookProducts[2].price) }}</span>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-for="n in 3" :key="`ed-skel-${n}`" class="editorial-item">
            <v-skeleton-loader class="h-100" type="image, article" />
          </div>
        </template>
      </div>
    </div>

    <section class="journey-section">
      <div class="journey-heading">
        <p class="journey-label">SHOP WITH CLARITY</p>
        <h2>Everything you need to explore the storefront.</h2>
        <p>
          Browse the catalog, manage a signed-in cart, and review the sample checkout flow with clear guidance at
          every step.
        </p>
      </div>
      <div class="journey-grid">
        <router-link v-for="guide in shoppingGuides" :key="guide.title" class="journey-card" :to="guide.to">
          <div class="journey-card-icon">
            <v-icon :icon="guide.icon" size="20" />
          </div>
          <h3>{{ guide.title }}</h3>
          <p>{{ guide.copy }}</p>
          <span class="journey-link">
            {{ guide.link }}
            <v-icon size="15">mdi-arrow-right</v-icon>
          </span>
        </router-link>
      </div>
      <div class="journey-notice">
        <v-icon color="teal-darken-1" size="20">mdi-information-outline</v-icon>
        <p>
          Mindstore is a portfolio demonstration. Use sample details only: no real payment, purchase, or delivery is
          created.
        </p>
      </div>
    </section>


    <div ref="productsSection" class="products-anchor" />

    <!-- ░░ QUICK CATEGORY FILTER STRIP ░░ -->
    <div v-if="quickCategories.length > 0" class="site-container my-8">
      <div class="flat-cat-tags">
        <button v-for="cat in quickCategories" :key="cat.key" class="flat-cat-tag" @click="router.push(`/${cat.key}`)">
          <span class="cat-tag-emoji">{{ cat.emoji }}</span>
          <span class="cat-tag-label">{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- ░░ UNIFIED PRODUCT GRID ░░ -->
    <div class="site-container mb-16">
      <v-row v-if="loading" no-gutters>
        <v-col
          v-for="n in 8"
          :key="n"
          class="pa-0"
          cols="6"
          lg="3"
          md="4"
          sm="6"
        >
          <v-skeleton-loader
            class="border rounded-0"
            style="margin-right: -1.5px; margin-bottom: -1.5px;"
            type="image, article"
          />
        </v-col>
      </v-row>

      <v-row v-else-if="products.length > 0" no-gutters>
        <v-col
          v-for="product in products"
          :key="product.product_id"
          cols="6"
          lg="3"
          md="4"
          sm="6"
        >
          <div
            class="product-card-unified"
            role="button"
            tabindex="0"
            @click="goToProduct(product.product_id)"
            @keydown.enter="goToProduct(product.product_id)"
          >
            <div class="product-card-img-box">
              <v-img
                v-if="productImageUrl(product)"
                :alt="product.name"
                class="product-card-img"
                :src="productImageUrl(product)"
              />
              <div v-else class="d-flex align-center justify-center fill-height">
                <v-icon color="grey-lighten-1" size="36">mdi-image-off-outline</v-icon>
              </div>
            </div>
            <div class="product-card-body">
              <div class="product-card-meta">
                <span class="product-card-category">{{ normalizeCategory(product.category) }}</span>
                <span class="grid-badge-stock" :class="{ 'grid-badge-stock--out': isProductSoldOut(product) }">
                  <span class="status-dot" />
                  {{ isProductSoldOut(product) ? 'Sold out' : `${Number(product.stock || 0)} left` }}
                </span>
              </div>

              <h3 class="product-card-title" :title="product.name">{{ product.name }}</h3>

              <div class="product-card-footer">
                <span class="product-card-price">{{ formatAmount(product.price) }}</span>
                <button
                  :aria-label="`Add ${product.name} to cart`"
                  class="btn-store-icon"
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

      <div v-else class="flat-empty-products">
        <v-icon class="mb-3" color="grey-lighten-1" size="48">mdi-package-search-outline</v-icon>
        <h3 class="empty-title">No products found</h3>
        <p class="empty-text">Refresh the catalog or check back later.</p>
      </div>
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
  const shoppingGuides = [
    {
      icon: 'mdi-view-grid-outline',
      title: 'Browse thoughtfully',
      copy: 'Use categories, filters, search, and product details to find the right catalog item.',
      link: 'View all products',
      to: '/products',
    },
    {
      icon: 'mdi-account-outline',
      title: 'Use your account',
      copy: 'Sign in to keep cart items, review profile settings, and access order history.',
      link: 'Open account',
      to: '/profile',
    },
    {
      icon: 'mdi-help-circle-outline',
      title: 'Get clear guidance',
      copy: 'Read practical answers about the demo checkout, sample values, and account workflow.',
      link: 'Visit Help Center',
      to: '/help',
    },
  ]

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function normalizeCategory(category) {
    const value = String(category || '').trim()
    if (!value) return 'Other'
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  }

  const galleryProducts = computed(() => products.value.slice(0, 3))
  const lookbookProducts = computed(() => products.value.slice(3, 7))

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

.journey-section {
  padding: 88px max(24px, 5vw);
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.journey-heading {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.journey-label {
  margin: 0 0 12px;
  color: #0d9488;
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.journey-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.08;
}

.journey-heading p,
.journey-card p,
.journey-notice p {
  color: #475569;
  line-height: 1.7;
}

.journey-heading p {
  margin: 16px 0 0;
  font-size: 15px;
}

.journey-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 1280px;
  margin: 36px auto 0;
  background: #0f172a;
  gap: 1px;
  border: 1px solid #0f172a;
}

.journey-card {
  display: flex;
  flex-direction: column;
  min-height: 252px;
  padding: 24px;
  background: #ffffff;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.journey-card:hover {
  background: #f0fdfa;
}

.journey-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: #0d9488;
  border: 1px solid #0f172a;
}

.journey-card h3 {
  margin: 24px 0 8px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 900;
  text-transform: uppercase;
}

.journey-card p {
  margin: 0;
  font-size: 14px;
}

.journey-link {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-top: auto;
  padding-top: 20px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.journey-notice {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  max-width: 1280px;
  padding: 16px;
  margin: 20px auto 0;
  background: #ffffff;
  border: 1px solid #cbd5e1;
}

.journey-notice p {
  margin: 0;
  font-size: 13px;
}


/* ════════════════════════════════ EDITORIAL SECTION ═══ */
.editorial-section {
  padding: 100px max(24px, 5vw);
  background: #fbfbfb;
  border-bottom: 1px solid #eaeaea;
}

@media (max-width: 959px) {
  .journey-grid {
    grid-template-columns: 1fr;
  }

  .journey-card {
    min-height: auto;
  }
}

.editorial-header {
  text-align: center;
  margin-bottom: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.editorial-title {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-style: italic;
  font-weight: 400;
  color: #111;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}

.editorial-line {
  width: 40px;
  height: 1px;
  background: #111;
  margin-bottom: 24px;
}

.editorial-subtitle {
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #666;
  max-width: 600px;
}

.editorial-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6vw;
  max-width: 1280px;
  margin: 0 auto;
}

.editorial-side {
  display: flex;
  flex-direction: column;
  gap: 6vw;
  justify-content: space-between;
}

.editorial-item {
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.ed-image-wrap {
  background: #ffffff;
  padding: 40px;
  margin-bottom: 24px;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}

.editorial-item:hover .ed-image-wrap {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
}

.ed-img {
  width: 100%;
  height: auto;
  aspect-ratio: 4/5;
  transition: transform 0.8s ease;
}

.editorial-item:hover .ed-img {
  transform: scale(1.03);
}

.secondary .ed-img {
  aspect-ratio: 1/1;
}

.tertiary .ed-img {
  aspect-ratio: 16/9;
}

.ed-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 10px;
}

.ed-cat {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #888;
  text-transform: uppercase;
}

.ed-name {
  font-size: 20px;
  font-weight: 700;
  color: #111;
  margin: 0;
  letter-spacing: -0.01em;
}

.ed-price {
  font-size: 15px;
  font-weight: 500;
  color: #444;
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
  max-width: 1280px;
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

.image-gallery-collage {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 520px;
  height: clamp(260px, 48vw, 400px);
}

.gallery-collage-item {
  position: relative;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
  background: #fafafa;
}

.gallery-collage-item:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 2;
}

.gallery-collage-item.item-1 {
  grid-column: 1 / 2;
  grid-row: 1 / 3;
}

.gallery-collage-item.item-2 {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
}

.gallery-collage-item.item-3 {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
}

.collage-img {
  transition: transform 0.5s ease;
}

.gallery-collage-item:hover .collage-img {
  transform: scale(1.05);
}

.collage-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 20px 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: flex-end;
}

.gallery-collage-item:hover .collage-overlay {
  opacity: 1;
}

.collage-prod-name {
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transform: translateY(10px);
  transition: transform 0.3s ease;
}

.gallery-collage-item:hover .collage-prod-name {
  transform: translateY(0);
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

  .editorial-gallery {
    grid-template-columns: 1fr;
    gap: 80px;
  }

  .editorial-side {
    gap: 80px;
  }
}

@media (max-width: 599px) {
  .bespoke-hero {
    padding: 36px 16px 48px;
  }

  .hero-title {
    font-size: clamp(1.8rem, 7vw, 2.4rem);
    margin-bottom: 16px;
  }

  .hero-subtitle {
    margin-bottom: 24px;
    font-size: 14px;
  }

  .hero-button-group {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    margin-bottom: 32px;
  }

  .action-btn-primary {
    width: 100%;
    justify-content: center;
  }

  .action-btn-text {
    width: 100%;
    text-align: center;
    padding: 8px 0 !important;
  }

  .value-props {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    padding-top: 16px;
    justify-content: center;
  }

  .prop-item {
    width: auto;
  }

  .product-image-wrap {
    padding: 12px;
  }

  .product-card-body {
    padding: 10px;
  }

  .product-grid-name {
    font-size: 13px;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .product-grid-category {
    font-size: 9px;
  }

  .grid-badge-stock {
    font-size: 9px;
    padding: 2px 5px;
    gap: 4px;
  }

  .product-grid-price {
    font-size: 14px;
  }

  .product-grid-cart-btn {
    width: 28px;
    height: 28px;
  }

  .editorial-section {
    padding: 48px 16px;
  }

  .editorial-header {
    margin-bottom: 32px;
  }

  .editorial-title {
    font-size: 1.8rem;
    margin-bottom: 16px;
  }

  .editorial-line {
    margin-bottom: 16px;
  }

  .ed-image-wrap {
    padding: 16px;
    margin-bottom: 16px;
  }

  .editorial-gallery {
    gap: 40px;
  }

  .editorial-side {
    gap: 40px;
  }

  .flat-cat-strip {
    padding: 20px 12px 0;
  }

  .flat-cat-tags {
    gap: 6px;
  }

  .flat-cat-tag {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
