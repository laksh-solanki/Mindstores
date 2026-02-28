<template>
  <div class="home-premium">
    <section class="hero-shell">
      <div class="hero-glow hero-glow--one" />
      <div class="hero-glow hero-glow--two" />
      <v-container class="hero-container">
        <v-row class="hero-row" no-gutters>
          <v-col cols="12" lg="6" md="6">
            <div class="hero-copy reveal reveal--one">
              <p class="hero-kicker">Spring 2026 Atelier Edit</p>
              <h1>Premium essentials for homes built with intention.</h1>
              <p class="hero-subtitle">
                Discover limited-batch products across decor, furniture, and tech.
                Every piece is selected for longevity, utility, and visual calm.
              </p>
              <div class="hero-actions">
                <v-btn class="hero-btn hero-btn--primary" rounded="pill" size="x-large" @click="scrollToProducts">
                  Shop Collection
                </v-btn>
                <v-btn
                  class="hero-btn hero-btn--ghost"
                  rounded="pill"
                  size="x-large"
                  variant="outlined"
                  @click="scrollToStories"
                >
                  View Stories
                </v-btn>
              </div>
              <div class="hero-signals">
                <v-chip
                  v-for="signal in trustSignals"
                  :key="signal"
                  class="signal-chip"
                  size="small"
                  variant="outlined"
                >
                  {{ signal }}
                </v-chip>
              </div>
            </div>
          </v-col>
          <v-col cols="12" lg="6" md="6">
            <div class="hero-stage reveal reveal--two">
              <img
                :alt="curatedProduct?.name || 'Mindstore curated collection'"
                class="hero-image"
                decoding="async"
                fetchpriority="high"
                loading="eager"
                :src="heroImageUrl"
              >
              <div class="hero-badge hero-badge--top">
                <p>Signature Pick</p>
                <h3>{{ curatedProduct?.name || 'Handcrafted Utility Set' }}</h3>
              </div>
              <div class="hero-badge hero-badge--bottom">
                <p>Starting at</p>
                <h4>{{ curatedProduct ? formatAmount(curatedProduct.price) : formatAmount(149) }}</h4>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="value-section">
      <v-container>
        <v-row>
          <v-col
            v-for="(feature, index) in valueCards"
            :key="feature.title"
            cols="12"
            md="4"
          >
            <v-card
              class="value-card reveal"
              elevation="0"
              :style="{ animationDelay: `${index * 120}ms` }"
            >
              <div class="value-icon">
                <v-icon size="20">{{ feature.icon }}</v-icon>
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.copy }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section ref="productsSection" class="collection-section">
      <v-container>
        <div class="section-head">
          <p class="section-kicker">Curated Collection</p>
          <h2>Browse by category</h2>
          <p>Filter our premium catalog and add pieces to your cart instantly.</p>
        </div>

        <div class="category-filter">
          <v-chip
            v-for="category in categoryOptions"
            :key="category"
            class="category-chip"
            :class="{ 'is-active': selectedCategory === category }"
            :variant="selectedCategory === category ? 'flat' : 'outlined'"
            @click="selectedCategory = category"
          >
            {{ category }}
          </v-chip>
        </div>

        <v-row v-if="loading" class="mt-8">
          <v-col
            v-for="n in 6"
            :key="n"
            cols="12"
            md="4"
            sm="6"
          >
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>

        <v-row v-else-if="filteredProducts.length > 0" class="mt-6">
          <v-col
            v-for="(product, index) in filteredProducts"
            :key="product.product_id"
            cols="12"
            md="4"
            sm="6"
          >
            <v-card
              class="collection-card reveal"
              :style="{ animationDelay: `${index * 90}ms` }"
              @click="goToProduct(product.product_id)"
            >
              <div class="collection-media">
                <img
                  :alt="product.name"
                  class="collection-image"
                  decoding="async"
                  loading="lazy"
                  :src="product.image_url"
                >
              </div>
              <v-card-text class="collection-content">
                <p class="collection-category">{{ normalizeCategory(product.category) }}</p>
                <h3>{{ product.name }}</h3>
                <div class="collection-meta">
                  <span class="collection-price">{{ formatAmount(product.price) }}</span>
                  <v-btn
                    class="collection-add"
                    rounded="pill"
                    size="small"
                    @click.stop="quickAddToCart(product.product_id)"
                  >
                    <v-icon size="16" start>mdi-cart-plus</v-icon>
                    Add
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <div v-else class="collection-empty">
          <h3>No products in this category right now.</h3>
          <p>Try another category or check back shortly for new arrivals.</p>
        </div>
      </v-container>
    </section>

    <section ref="storiesSection" class="stories-section">
      <v-container>
        <div class="section-head section-head--left">
          <p class="section-kicker">Design Journal</p>
          <h2>Editorial moments from the collection</h2>
          <p>Inspiration cards that blend practical use with premium design language.</p>
        </div>

        <v-row class="mt-4">
          <v-col v-for="(story, index) in storyCards" :key="story.title" cols="12" md="4">
            <v-card class="story-card reveal" elevation="0" :style="{ animationDelay: `${index * 130}ms` }">
              <img :alt="story.title" class="story-image" loading="lazy" :src="story.image">
              <div class="story-overlay" />
              <div class="story-content">
                <p>{{ story.tag }}</p>
                <h3>{{ story.title }}</h3>
                <span>{{ story.copy }}</span>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="membership-section">
      <v-container>
        <v-card class="membership-card reveal" elevation="0">
          <p>Member Concierge</p>
          <h2>Unlock early drops, curated bundles, and priority support.</h2>
          <div class="membership-actions">
            <v-btn class="membership-btn membership-btn--primary" rounded="pill" size="large" to="/create-account">
              Create Account
            </v-btn>
            <v-btn
              class="membership-btn membership-btn--ghost"
              rounded="pill"
              size="large"
              to="/cart"
              variant="outlined"
            >
              Review Cart
            </v-btn>
          </div>
        </v-card>
      </v-container>
    </section>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="2200"
      :type="snackbarColor"
    />
  </div>
</template>

<script>
  import axios from 'axios'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import heroFallbackImage from '@/assets/DeskImg.jpg'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { useCurrency } from '@/utils/currency'

  const CATEGORY_PRIORITY = ['Electronics', 'Furniture', 'Clothing']
  const PRODUCTS_CACHE_KEY = 'mindstore_home_products_cache_v1'
  const CACHE_TTL_MS = 60 * 1000
  const PRODUCT_REQUEST_TIMEOUT_MS = 20_000
  const PRODUCT_FETCH_RETRIES = 2
  const VALUE_CARDS = [
    {
      icon: 'mdi-diamond-stone',
      title: 'Premium Curation',
      copy: 'Only high-quality pieces with timeless design and verified build standards.'
    },
    {
      icon: 'mdi-truck-fast-outline',
      title: 'Fast Dispatch',
      copy: 'Reliable shipping pipeline with order visibility and protected packaging.'
    },
    {
      icon: 'mdi-shield-check-outline',
      title: 'Trusted Checkout',
      copy: 'Secure purchase flow with transparent pricing, returns, and support.'
    }
  ]
  const TRUST_SIGNALS = ['Secure checkout', '24h dispatch', 'Independent makers', 'Curated premium']
  const DEFAULT_STORIES = [
    {
      tag: 'Living',
      title: 'Layered textures with functional accents',
      copy: 'Create calm spaces with warm tones and practical utility pieces.',
      image: heroFallbackImage
    },
    {
      tag: 'Workspace',
      title: 'Work zones that feel refined and focused',
      copy: 'Combine ergonomic utility and crafted finishes for daily performance.',
      image: heroFallbackImage
    },
    {
      tag: 'Everyday',
      title: 'Small objects, elevated routines',
      copy: 'Signature essentials that improve flow without visual noise.',
      image: heroFallbackImage
    }
  ]

  let cachedProducts = null
  let cacheExpiresAt = 0

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function isRetryableProductsError(error) {
    const status = error?.response?.status
    if (status && status < 500 && status !== 429) {
      return false
    }
    return error?.code === 'ECONNABORTED' || !error?.response || status >= 500 || status === 429
  }

  function readPersistedProductsCache() {
    if (typeof window === 'undefined') return null
    try {
      const rawCache = window.localStorage.getItem(PRODUCTS_CACHE_KEY)
      if (!rawCache) return null
      const parsed = JSON.parse(rawCache)
      if (!Array.isArray(parsed?.products)) return null
      return {
        products: parsed.products,
        expiresAt: Number(parsed.expiresAt) || 0
      }
    } catch {
      return null
    }
  }

  function writePersistedProductsCache(products, expiresAt) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        PRODUCTS_CACHE_KEY,
        JSON.stringify({ products, expiresAt })
      )
    } catch {
      // Ignore storage quota/privacy errors and continue with in-memory cache.
    }
  }

  export default {
    name: 'Home',
    components: {
      BaseAlert
    },
    setup() {
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
      const storiesSection = ref(null)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const normalizeCategory = (category) => {
        const value = (category || '').toString().trim()
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
        return sourceProducts.slice(0, 9)
      })

      const curatedProduct = computed(() => filteredProducts.value[0] || products.value[0] || null)
      const heroImageUrl = computed(() => curatedProduct.value?.image_url || heroFallbackImage)

      const storyCards = computed(() => {
        if (products.value.length === 0) return DEFAULT_STORIES
        const selected = products.value.slice(0, 3)
        return selected.map((item, index) => {
          const fallback = DEFAULT_STORIES[index] || DEFAULT_STORIES[0]
          return {
            tag: normalizeCategory(item.category),
            title: item.name,
            copy: fallback.copy,
            image: item.image_url || fallback.image
          }
        })
      })

      watch(categoryOptions, (options) => {
        if (!options.includes(selectedCategory.value)) {
          selectedCategory.value = 'All'
        }
      })

      const fetchProducts = async () => {
        const now = Date.now()
        if (cachedProducts && cacheExpiresAt > now) {
          products.value = cachedProducts
          return
        }

        if (!cachedProducts) {
          const persistedCache = readPersistedProductsCache()
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
              const response = await axios.get(`${API_URL}/api/products`, { timeout: PRODUCT_REQUEST_TIMEOUT_MS })
              const fetchedProducts = Array.isArray(response.data) ? response.data : []
              products.value = fetchedProducts
              cachedProducts = fetchedProducts
              cacheExpiresAt = Date.now() + CACHE_TTL_MS
              writePersistedProductsCache(fetchedProducts, cacheExpiresAt)
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

      const goToProduct = (productId) => {
        router.push(`/product/${productId}`)
      }

      const quickAddToCart = async (productId) => {
        if (!appStore.isAuthenticated) {
          router.push('/login')
          return
        }

        try {
          await cartStore.addToCart(productId, 1)
          snackbarText.value = 'Added to cart'
          snackbarColor.value = 'success'
          snackbar.value = true
        } catch {
          snackbarText.value = 'Please login to add items'
          snackbarColor.value = 'warning'
          snackbar.value = true
        }
      }

      const scrollToProducts = () => {
        productsSection.value?.scrollIntoView({ behavior: 'smooth' })
      }

      const scrollToStories = () => {
        storiesSection.value?.scrollIntoView({ behavior: 'smooth' })
      }

      onMounted(() => {
        fetchProducts()
      })

      return {
        categoryOptions,
        curatedProduct,
        filteredProducts,
        formatAmount,
        goToProduct,
        heroImageUrl,
        loading,
        normalizeCategory,
        productsSection,
        quickAddToCart,
        scrollToProducts,
        scrollToStories,
        selectedCategory,
        snackbar,
        snackbarColor,
        snackbarText,
        storiesSection,
        storyCards,
        trustSignals: TRUST_SIGNALS,
        valueCards: VALUE_CARDS
      }
    }
  }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Sora:wght@300;400;500;600;700&display=swap');

.home-premium {
  --premium-bg: #f5f2ee;
  --premium-surface: #ffffff;
  --premium-ink: #142127;
  --premium-muted: #5f6d75;
  --premium-accent: #c2732f;
  --premium-accent-deep: #995318;
  --premium-border: #d8d4cf;
  background: linear-gradient(180deg, #f9f5f1 0%, #f2f0ed 52%, #f7f4ef 100%);
  color: var(--premium-ink);
}

.hero-shell {
  position: relative;
  overflow: hidden;
  padding: 32px 0 48px;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(8px);
}

.hero-glow--one {
  width: 520px;
  height: 520px;
  top: -270px;
  left: -190px;
  background: radial-gradient(circle, rgba(194, 115, 47, 0.24) 0%, rgba(194, 115, 47, 0) 72%);
}

.hero-glow--two {
  width: 560px;
  height: 560px;
  right: -220px;
  bottom: -320px;
  background: radial-gradient(circle, rgba(28, 59, 70, 0.16) 0%, rgba(28, 59, 70, 0) 72%);
}

.hero-container {
  position: relative;
  z-index: 2;
}

.hero-row {
  min-height: 640px;
  align-items: center;
}

.hero-copy h1 {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 1.05;
  letter-spacing: 0.2px;
  max-width: 650px;
}

.hero-kicker {
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--premium-accent);
  margin-bottom: 14px;
}

.hero-subtitle {
  margin-top: 18px;
  max-width: 560px;
  font-family: 'Sora', sans-serif;
  color: var(--premium-muted);
  line-height: 1.8;
  font-size: 0.98rem;
}

.hero-actions {
  margin-top: 28px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-btn {
  text-transform: none;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.hero-btn--primary {
  color: #ffffff;
  background: linear-gradient(130deg, var(--premium-accent), var(--premium-accent-deep));
  box-shadow: 0 12px 28px rgba(161, 89, 28, 0.28);
}

.hero-btn--ghost {
  color: #21343d;
  border-color: #b9c2c8;
  background: rgba(255, 255, 255, 0.5);
}

.hero-signals {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.signal-chip {
  font-family: 'Sora', sans-serif;
  color: #33454d;
  border-color: #c4ccd2;
  background: rgba(255, 255, 255, 0.65);
}

.hero-stage {
  position: relative;
  padding: 14px;
  border-radius: 26px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(237, 239, 236, 0.82));
  border: 1px solid #d6d7d4;
  box-shadow: 0 24px 60px rgba(19, 35, 42, 0.16);
}

.hero-image {
  width: 100%;
  height: 560px;
  object-fit: cover;
  border-radius: 18px;
}

.hero-badge {
  position: absolute;
  max-width: 240px;
  border-radius: 14px;
  padding: 12px 14px;
  backdrop-filter: blur(8px);
}

.hero-badge p {
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 1.3px;
}

.hero-badge h3,
.hero-badge h4 {
  margin-top: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.92rem;
  line-height: 1.45;
}

.hero-badge--top {
  top: 28px;
  left: 26px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(218, 220, 223, 0.95);
}

.hero-badge--bottom {
  right: 26px;
  bottom: 26px;
  color: #eef3f6;
  background: rgba(19, 33, 41, 0.88);
  border: 1px solid rgba(241, 245, 247, 0.25);
}

.value-section {
  padding: 8px 0 28px;
}

.value-card {
  border-radius: 18px;
  border: 1px solid var(--premium-border);
  padding: 22px;
  height: 100%;
  background: rgba(255, 255, 255, 0.75);
}

.value-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(140deg, rgba(194, 115, 47, 0.18), rgba(26, 52, 61, 0.16));
  display: grid;
  place-items: center;
  color: #243840;
}

.value-card h3 {
  margin-top: 16px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.6rem;
}

.value-card p {
  margin-top: 8px;
  font-family: 'Sora', sans-serif;
  color: var(--premium-muted);
  line-height: 1.7;
  font-size: 0.9rem;
}

.collection-section {
  padding: 44px 0 56px;
}

.section-head {
  text-align: center;
}

.section-head--left {
  text-align: left;
}

.section-kicker {
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: 0.69rem;
  color: var(--premium-accent);
  font-weight: 700;
}

.section-head h2 {
  margin-top: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2rem, 4vw, 3.2rem);
}

.section-head p {
  margin-top: 8px;
  color: var(--premium-muted);
  font-family: 'Sora', sans-serif;
  line-height: 1.7;
}

.category-filter {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.category-chip {
  font-family: 'Sora', sans-serif;
  text-transform: none;
  color: #33454d;
  border-color: #c5ccd1;
  background: rgba(255, 255, 255, 0.65);
}

.category-chip.is-active {
  color: #ffffff;
  background: linear-gradient(120deg, #1f3740, #2e4e5a);
  box-shadow: 0 10px 24px rgba(23, 40, 47, 0.2);
}

.collection-card {
  cursor: pointer;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #d4d7da;
  background: #ffffff;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.collection-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 36px rgba(23, 39, 46, 0.15);
}

.collection-media {
  width: 100%;
  height: 270px;
  overflow: hidden;
  background: #e8ecef;
}

.collection-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.collection-card:hover .collection-image {
  transform: scale(1.06);
}

.collection-content {
  padding: 18px !important;
}

.collection-category {
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #75848d;
}

.collection-content h3 {
  margin-top: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 1.02rem;
  min-height: 44px;
  color: #1c2e35;
}

.collection-meta {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.collection-price {
  font-family: 'Sora', sans-serif;
  color: var(--premium-accent-deep);
  font-weight: 700;
  font-size: 1.12rem;
}

.collection-add {
  text-transform: none;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  color: #f4f8fa;
  background: linear-gradient(120deg, #243f4a, #345866);
}

.collection-empty {
  margin-top: 30px;
  text-align: center;
  padding: 34px 18px;
  border: 1px dashed #bec7cd;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
}

.collection-empty h3 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.8rem;
}

.collection-empty p {
  margin-top: 6px;
  font-family: 'Sora', sans-serif;
  color: var(--premium-muted);
}

.stories-section {
  padding: 10px 0 56px;
}

.story-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  min-height: 360px;
  border: 1px solid #d2d8dd;
}

.story-image {
  width: 100%;
  height: 360px;
  object-fit: cover;
}

.story-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 25, 31, 0.1) 0%, rgba(15, 24, 29, 0.82) 100%);
}

.story-content {
  position: absolute;
  inset: auto 0 0 0;
  padding: 18px;
  z-index: 2;
}

.story-content p {
  color: #efd7b8;
  font-family: 'Sora', sans-serif;
  font-size: 0.66rem;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.story-content h3 {
  margin-top: 8px;
  color: #f7fbff;
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.8rem;
  line-height: 1.1;
}

.story-content span {
  display: block;
  margin-top: 8px;
  color: #d8e2ea;
  font-family: 'Sora', sans-serif;
  line-height: 1.6;
  font-size: 0.85rem;
}

.membership-section {
  padding: 10px 0 70px;
}

.membership-card {
  border-radius: 24px;
  padding: clamp(24px, 5vw, 44px);
  border: 1px solid #cfd5d8;
  background:
    radial-gradient(circle at 0% 0%, rgba(194, 115, 47, 0.2) 0%, rgba(194, 115, 47, 0) 42%),
    linear-gradient(140deg, #182a34, #223948 45%, #294653);
}

.membership-card p {
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: 0.7rem;
  color: #efc08d;
}

.membership-card h2 {
  margin-top: 10px;
  max-width: 760px;
  font-family: 'Cormorant Garamond', serif;
  color: #f4f9fd;
  font-size: clamp(2rem, 4.6vw, 3.2rem);
  line-height: 1.08;
}

.membership-actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.membership-btn {
  text-transform: none;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
}

.membership-btn--primary {
  color: #12232b;
  background: linear-gradient(120deg, #edc18f, #daa56c);
}

.membership-btn--ghost {
  color: #eef4f8;
  border-color: rgba(239, 246, 250, 0.58);
}

.reveal {
  animation: fade-up 0.75s ease both;
}

.reveal--one {
  animation-delay: 80ms;
}

.reveal--two {
  animation-delay: 180ms;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .hero-row {
    min-height: auto;
    gap: 22px;
  }

  .hero-image {
    height: 420px;
  }

  .hero-badge--top {
    top: 20px;
    left: 20px;
  }

  .hero-badge--bottom {
    right: 20px;
    bottom: 20px;
  }
}

@media (max-width: 600px) {
  .hero-shell {
    padding-top: 74px;
  }

  .hero-actions,
  .membership-actions {
    width: 100%;
  }

  .hero-btn,
  .membership-btn {
    flex: 1 1 100%;
  }

  .hero-image {
    height: 330px;
  }

  .hero-badge {
    max-width: none;
    left: 14px;
    right: 14px;
  }

  .hero-badge--bottom {
    bottom: 14px;
  }

  .story-card,
  .story-image {
    min-height: 320px;
    height: 320px;
    }
}
</style>
