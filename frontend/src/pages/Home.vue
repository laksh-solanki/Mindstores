<template>
  <div class="home-page">
    <v-container class="py-6 py-md-8">
      <v-row align="center" class="home-hero" dense>
        <v-col cols="12" md="6">
          <p class="text-overline text-primary font-weight-bold mb-2">Mindstore Catalog</p>
          <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Premium products, kept simple.</h1>
          <p class="text-body-1 text-medium-emphasis mb-5">
            Browse curated essentials with live stock, secure checkout, and fast access to every category.
          </p>
          <div class="d-flex flex-column flex-sm-row ga-3">
            <v-btn
              color="primary"
              rounded="lg"
              size="large"
              to="/products"
              variant="flat"
            >
              <v-icon start>mdi-package-variant-closed</v-icon>
              Browse all
            </v-btn>
            <v-btn rounded="lg" size="large" variant="outlined" @click="scrollToProducts">
              <v-icon start>mdi-arrow-down</v-icon>
              Latest products
            </v-btn>
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="hero-product-card" rounded="lg" variant="outlined" @click="goToProduct(curatedProduct?.product_id)">
            <v-img
              :alt="curatedProduct?.name || 'Mindstore product'"
              aspect-ratio="1.45"
              cover
              :src="heroImageUrl"
            />
            <v-card-text class="d-flex align-center justify-space-between ga-4">
              <div class="overflow-hidden">
                <p class="text-caption text-medium-emphasis mb-1">Featured</p>
                <p class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ curatedProduct?.name || 'Curated product' }}
                </p>
              </div>
              <strong>{{ curatedProduct ? formatAmount(curatedProduct.price) : formatAmount(0) }}</strong>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card ref="productsSection" class="mt-6" rounded="lg" variant="outlined">
        <v-card-text class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-4">
          <div>
            <p class="text-h6 font-weight-bold mb-1">Shop products</p>
            <p class="text-body-2 text-medium-emphasis">Choose a category or open the full catalog.</p>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="category in categoryOptions"
              :key="category"
              :color="selectedCategory === category ? 'primary' : undefined"
              filter
              :variant="selectedCategory === category ? 'flat' : 'outlined'"
              @click="selectedCategory = category"
            >
              {{ category }}
            </v-chip>
          </div>
        </v-card-text>
      </v-card>

      <v-row v-if="loading" class="mt-4">
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

      <v-row v-else-if="filteredProducts.length > 0" class="mt-4">
        <v-col
          v-for="product in filteredProducts"
          :key="product.product_id"
          cols="12"
          lg="3"
          md="4"
          sm="6"
        >
          <v-card class="product-card" rounded="lg" variant="outlined" @click="goToProduct(product.product_id)">
            <div class="product-media">
              <v-img
                v-if="productImageUrl(product)"
                :alt="product.name"
                aspect-ratio="1"
                cover
                :src="productImageUrl(product)"
              />
              <v-icon v-else color="primary" size="44">mdi-image-off-outline</v-icon>
              <v-chip
                class="product-stock"
                :color="isProductSoldOut(product) ? 'error' : 'success'"
                size="small"
                variant="flat"
              >
                {{ isProductSoldOut(product) ? 'Sold out' : `${Number(product.stock || 0)} left` }}
              </v-chip>
            </div>

            <v-card-text>
              <p class="text-caption text-medium-emphasis text-uppercase mb-1">{{ normalizeCategory(product.category) }}</p>
              <p class="text-subtitle-1 font-weight-bold product-name">{{ product.name }}</p>
              <div class="d-flex align-center justify-space-between mt-3 ga-2">
                <strong>{{ formatAmount(product.price) }}</strong>
                <v-btn
                  color="primary"
                  :disabled="isProductSoldOut(product)"
                  icon="mdi-cart-plus"
                  size="small"
                  variant="tonal"
                  @click.stop="quickAddToCart(product)"
                >
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
          <p class="text-body-2 text-medium-emphasis">Try another category or refresh the catalog.</p>
        </v-card-text>
      </v-card>
    </v-container>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="2200"
      :type="snackbarColor"
    />
  </div>
</template>

<script setup>
  import axios from 'axios'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import heroFallbackImage from '@/assets/DeskImg.jpg'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { API_URL } from '@/utils/api'
  import { useCurrency } from '@/utils/currency'
  import { safeDisplayImageUrl } from '@/utils/images'
  import {
    PRODUCTS_CACHE_INVALIDATED_EVENT,
    readProductsCache,
    writeProductsCache,
  } from '@/utils/productCache'

  const CATEGORY_PRIORITY = ['Electronics', 'Furniture', 'Clothing']
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
  const selectedCategory = ref('All')
  const productsSection = ref(null)

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function normalizeCategory (category) {
    const value = String(category || '').trim()
    if (!value) return 'Other'
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  }

  const categoryOptions = computed(() => {
    const dynamicCategories = new Set(products.value.map((item) => normalizeCategory(item.category)))
    const sorted = Array.from(dynamicCategories).toSorted((a, b) => {
      const aPriority = CATEGORY_PRIORITY.indexOf(a)
      const bPriority = CATEGORY_PRIORITY.indexOf(b)
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority
      if (aPriority !== -1) return -1
      if (bPriority !== -1) return 1
      return a.localeCompare(b)
    })
    return ['All', ...sorted]
  })

  const filteredProducts = computed(() => {
    const targetCategory = selectedCategory.value
    const sourceProducts = targetCategory === 'All'
      ? products.value
      : products.value.filter((item) => normalizeCategory(item.category) === targetCategory)
    return sourceProducts.slice(0, 12)
  })

  const curatedProduct = computed(() => filteredProducts.value[0] || products.value[0] || null)
  const heroImageUrl = computed(() => safeDisplayImageUrl(curatedProduct.value?.image_url) || heroFallbackImage)

  const productImageUrl = (product) => safeDisplayImageUrl(product?.image_url)
  const isProductSoldOut = (product) => Number(product?.stock || 0) <= 0

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
          const response = await axios.get(`${API_URL}/products`, { timeout: PRODUCT_REQUEST_TIMEOUT_MS })
          const fetchedProducts = Array.isArray(response.data) ? response.data : response.data?.items || []
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
    productsSection.value?.$el?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleProductsInvalidated() {
    fetchProducts(true)
  }

  watch(categoryOptions, (options) => {
    if (!options.includes(selectedCategory.value)) {
      selectedCategory.value = 'All'
    }
  })

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
  background: var(--ms-bg);
}

.home-hero {
  min-height: 420px;
}

.hero-product-card,
.product-card {
  cursor: pointer;
  overflow: hidden;
}

.product-card {
  height: 100%;
}

.product-media {
  position: relative;
  min-height: 210px;
  display: grid;
  place-items: center;
  background: var(--ms-surface-strong);
}

.product-stock {
  position: absolute;
  top: 10px;
  left: 10px;
  font-weight: 700;
}

.product-name {
  min-height: 44px;
  line-height: 1.35;
}

@media (max-width: 600px) {
  .home-hero {
    min-height: auto;
  }
}
</style>
