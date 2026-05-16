<template>
  <v-container class="home-page" fluid>
    <v-card border class="mb-8 overflow-hidden" rounded="lg" variant="flat">
      <v-row align="center" class="ma-0">
        <v-col class="pa-5 pa-md-7" cols="12" md="5">
          <div class="d-flex h-100 flex-column justify-center">
            <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
              Premium products, kept simple.
            </h1>

            <p class="text-body-2 text-medium-emphasis mb-5">
              Browse curated essentials with live stock, secure checkout, and fast access to every category.
            </p>

            <div class="d-flex flex-wrap ga-2 mb-5">
              <v-btn
                color="teal-darken-1"
                density="comfortable"
                rounded="lg"
                size="small"
                to="/products"
                variant="flat"
              >
                Browse all
              </v-btn>
              <v-btn
                density="comfortable"
                rounded="lg"
                size="small"
                variant="outlined"
                @click="scrollToProducts"
              >
                <v-icon start>mdi-arrow-down</v-icon>
                Latest products
              </v-btn>
            </div>

            <v-divider class="mb-4" />

            <div aria-label="Store highlights" class="d-flex flex-wrap ga-5">
              <div>
                <p class="text-subtitle-2 font-weight-bold mb-1">{{ products.length > 0 ? products.length : 'Live' }}</p>
                <p class="text-caption text-medium-emphasis mb-0">Products synced</p>
              </div>
              <div>
                <p class="text-subtitle-2 font-weight-bold mb-1">Secure</p>
                <p class="text-caption text-medium-emphasis mb-0">Checkout flow</p>
              </div>
              <div>
                <p class="text-subtitle-2 font-weight-bold mb-1">Fast</p>
                <p class="text-caption text-medium-emphasis mb-0">Category access</p>
              </div>
            </div>
          </div>
        </v-col>

        <v-col class="pa-4 pa-md-5" cols="12" md="7">
          <v-card border rounded="lg" variant="flat" @click="goToProduct(curatedProduct?.product_id)">
            <v-sheet class="pa-4 pa-md-6" color="grey-lighten-5">
              <v-img
                :alt="curatedProduct?.name || 'Mindstore product'"
                aspect-ratio="1.55"
                contain
                height="340"
                :src="heroImageUrl"
              />
            </v-sheet>

            <v-divider />

            <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-3 pa-4">
              <div class="flex-grow-1">
                <p class="text-caption text-teal-darken-2 text-uppercase mb-1">
                  {{ curatedProduct ? normalizeCategory(curatedProduct.category) : 'Featured product' }}
                </p>
                <p class="text-body-2 font-weight-medium mb-0">
                  {{ curatedProduct?.name || 'Curated product' }}
                </p>
              </div>

              <div class="text-right">
                <p class="text-subtitle-2 font-weight-bold mb-1">
                  {{ curatedProduct ? formatAmount(curatedProduct.price) : formatAmount(0) }}
                </p>
                <p class="text-caption text-medium-emphasis mb-0">
                  {{ curatedProduct ? (isProductSoldOut(curatedProduct) ? 'Sold out' : `${Number(curatedProduct.stock || 0)} left`) : 'Loading' }}
                </p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card>

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

    <v-row v-else-if="products.length > 0" class="mt-8" no-gutters>
      <v-col
        v-for="product in products"
        :key="product.product_id"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <v-card class="h-100 border" rounded="0" variant="flat" @click="goToProduct(product.product_id)">
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
                :color="isProductSoldOut(product) ? 'error' : 'teal-darken-1'"
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

</style>
