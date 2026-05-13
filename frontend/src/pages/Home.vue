<template>
  <v-container class="home-page" fluid>
    <section class="home-hero-shell">
      <v-row align="center" class="home-hero-grid">
        <v-col cols="12" md="6">
          <div class="hero-copy">
            <div class="hero-kicker">
              <v-icon icon="mdi-storefront-outline" size="18" />
              Mindstore
            </div>

            <h1 class="hero-title">Premium products, kept simple.</h1>

            <p class="hero-subtitle">
              Browse curated essentials with live stock, secure checkout, and fast access to every category.
            </p>

            <div class="hero-actions">
              <v-btn
                class="hero-action"
                color="teal-darken-1"
                rounded="lg"
                size="large"
                to="/products"
                variant="flat"
              >
                Browse all
              </v-btn>
              <v-btn
                class="hero-action"
                rounded="lg"
                size="large"
                variant="outlined"
                @click="scrollToProducts"
              >
                <v-icon start>mdi-arrow-down</v-icon>
                Latest products
              </v-btn>
            </div>

            <div aria-label="Store highlights" class="hero-metrics">
              <div class="hero-metric">
                <strong>{{ products.length > 0 ? products.length : 'Live' }}</strong>
                <span>Products synced</span>
              </div>
              <div class="hero-metric">
                <strong>Secure</strong>
                <span>Checkout flow</span>
              </div>
              <div class="hero-metric">
                <strong>Fast</strong>
                <span>Category access</span>
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="hero-feature-card" rounded="lg" variant="outlined" @click="goToProduct(curatedProduct?.product_id)">
            <div class="hero-image-wrap">
              <v-img
                :alt="curatedProduct?.name || 'Mindstore product'"
                aspect-ratio="1.45"
                class="hero-product-image"
                cover
                :src="heroImageUrl"
              />
              <div class="hero-floating-badge">
                <v-icon icon="mdi-star-four-points-outline" size="16" />
                Featured pick
              </div>
            </div>

            <v-card-text class="hero-product-details">
              <div class="hero-product-copy">
                <p class="hero-product-category">
                  {{ curatedProduct ? normalizeCategory(curatedProduct.category) : 'Featured' }}
                </p>
                <p class="hero-product-name">
                  {{ curatedProduct?.name || 'Curated product' }}
                </p>
              </div>
              <div class="hero-price-wrap">
                <strong>{{ curatedProduct ? formatAmount(curatedProduct.price) : formatAmount(0) }}</strong>
                <span>
                  {{ curatedProduct ? (isProductSoldOut(curatedProduct) ? 'Sold out' : `${Number(curatedProduct.stock || 0)} left`) : 'Loading' }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <div ref="productsSection" class="products-anchor" />

    <v-row v-if="loading" class="mt-8">
      <v-col
        v-for="n in 8"
        :key="n"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <v-skeleton-loader type="image, article" />
      </v-col>
    </v-row>

    <v-row v-else-if="products.length > 0" class="mt-8" dense>
      <v-col
        v-for="product in products"
        :key="product.product_id"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <v-card class="h-100 border" rounded="lg" variant="elevated" @click="goToProduct(product.product_id)">
          <v-img
            v-if="productImageUrl(product)"
            :alt="product.name"
            aspect-ratio="1"
            contain
            :src="productImageUrl(product)"
          />
          <v-sheet v-else class="d-flex align-center justify-center" height="220">
            <v-icon color="primary" size="44">mdi-image-off-outline</v-icon>
          </v-sheet>

          <v-card-text>
            <div class="d-flex align-center justify-space-between ga-2 mb-2">
              <p class="text-caption text-medium-emphasis text-uppercase">{{ normalizeCategory(product.category) }}</p>
              <v-chip
                :color="isProductSoldOut(product) ? 'error' : 'success'"
                size="small"
                variant="flat"
              >
                {{ isProductSoldOut(product) ? 'Sold out' : `${Number(product.stock || 0)} left` }}
              </v-chip>
            </div>

            <p class="text-subtitle-1 font-weight-bold text-truncate">{{ product.name }}</p>
            <div class="d-flex align-center justify-space-between mt-3 ga-2">
              <strong>{{ formatAmount(product.price) }}</strong>
              <v-btn
                :aria-label="`Add ${product.name} to cart`"
                class="product-cart-btn"
                color="teal-darken-1"
                :disabled="isProductSoldOut(product)"
                icon
                size="small"
                variant="flat"
                @click.stop="quickAddToCart(product)"
              >
                <v-icon icon="mdi-cart-plus" size="20" />
                <v-tooltip activator="parent" location="top">
                  {{ isProductSoldOut(product) ? 'Sold out' : 'Add to cart' }}
                </v-tooltip>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else class="mt-4" rounded="lg" variant="outlined">
      <v-card-text class="text-center py-10">
        <v-icon color="primary" size="44">mdi-package-search-outline</v-icon>
        <p class="text-h6 font-weight-bold mt-3">No products found</p>
        <p class="text-body-2 text-medium-emphasis">Refresh the catalog or check back later.</p>
      </v-card-text>
    </v-card>

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

  const productImageUrl = (product) => safeDisplayImageUrl(product?.image_url)
  const productStock = (product) => Number(product?.stock || 0)
  const isProductSoldOut = (product) => productStock(product) <= 0

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
.home-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f7fbfa 0%, #ffffff 46%, #f8faf9 100%);
}

.home-hero-shell {
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  border: 1px solid rgba(13, 116, 106, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(232, 247, 242, 0.96) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(255, 246, 225, 0.96) 100%);
  box-shadow: 0 18px 48px rgba(15, 82, 79, 0.12);
}

.home-hero-shell::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background:
    linear-gradient(90deg, rgba(13, 148, 136, 0.1), transparent 45%),
    linear-gradient(180deg, transparent 62%, rgba(245, 158, 11, 0.12));
}

.home-hero-grid {
  position: relative;
  padding: 28px;
  row-gap: 28px;
}

.hero-copy {
  display: flex;
  max-width: 560px;
  flex-direction: column;
  gap: 16px;
}

.hero-kicker {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(13, 116, 106, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.hero-title {
  max-width: 11ch;
  margin: 0;
  color: #10231f;
  font-size: 3.35rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.04;
}

.hero-subtitle {
  max-width: 54ch;
  margin: 0;
  color: #47615c;
  font-size: 1.08rem;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-action {
  min-height: 48px;
  font-weight: 800;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 4px;
}

.hero-metric {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(15, 35, 31, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.68);
}

.hero-metric strong,
.hero-metric span {
  display: block;
  min-width: 0;
}

.hero-metric strong {
  color: #10231f;
  font-size: 1rem;
  line-height: 1.3;
}

.hero-metric span {
  color: #60736f;
  font-size: 0.78rem;
  line-height: 1.35;
}

.hero-feature-card {
  overflow: hidden;
  border-color: rgba(15, 35, 31, 0.12) !important;
  background: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 16px 34px rgba(15, 82, 79, 0.14);
  cursor: pointer;
}

.hero-image-wrap {
  position: relative;
  background: #e8f0ec;
}

.hero-product-image {
  min-height: 300px;
}

.hero-floating-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 24px);
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 8px;
  background: rgba(16, 35, 31, 0.78);
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.2;
}

.hero-product-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px !important;
}

.hero-product-copy {
  min-width: 0;
}

.hero-product-category {
  margin: 0 0 4px;
  color: #0f766e;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.3;
  text-transform: uppercase;
}

.hero-product-name {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #10231f;
  font-size: 1.08rem;
  font-weight: 850;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

.hero-price-wrap {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.hero-price-wrap strong {
  color: #10231f;
  font-size: 1.12rem;
}

.hero-price-wrap span {
  color: #60736f;
  font-size: 0.82rem;
  font-weight: 700;
}

.products-anchor {
  height: 1px;
  scroll-margin-top: 84px;
}

.product-cart-btn {
  color: #ffffff !important;
}

.product-cart-btn :deep(.v-icon) {
  opacity: 1;
}

@media (max-width: 959px) {
  .home-page {
    padding: 14px 12px 30px;
  }

  .home-hero-grid {
    padding: 24px;
  }

  .hero-copy {
    max-width: none;
  }

  .hero-title {
    max-width: 13ch;
    font-size: 2.55rem;
  }

  .hero-product-image {
    min-height: 260px;
  }

}

@media (max-width: 599px) {
  .home-page {
    padding: 10px 8px 24px;
  }

  .home-hero-grid {
    padding: 18px;
    row-gap: 20px;
  }

  .hero-kicker {
    font-size: 0.72rem;
  }

  .hero-title {
    max-width: 100%;
    font-size: 2rem;
    line-height: 1.1;
  }

  .hero-subtitle {
    font-size: 0.98rem;
    line-height: 1.6;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-action {
    width: 100%;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .hero-product-image {
    min-height: 220px;
  }

  .hero-product-details {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-price-wrap {
    align-items: flex-start;
    text-align: left;
  }

}
</style>
