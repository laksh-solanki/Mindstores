<template>
  <div class="home">
    <section class="hero-section">
      <v-container>
        <v-row class="align-center hero-row" no-gutters>
          <v-col class="hero-copy" cols="12" md="6">
            <p class="kicker">Limited drop: Spring 2026</p>
            <h1>Design-led pieces for grounded, modern homes.</h1>
            <p class="subtitle">
              Build a space that feels calm, useful, and distinctly yours with small-batch picks across decor,
              storage, and daily tools.
            </p>
            <div class="hero-actions">
              <v-btn
                class="cta-btn"
                color="primary"
                rounded="pill"
                size="x-large"
                @click="scrollToProducts"
              >
                Shop Collection
              </v-btn>
              <span class="secondary-note">Free shipping over $60</span>
            </div>
            <div class="metrics">
              <div class="metric">
                <h3>300+</h3>
                <p>Products curated</p>
              </div>
              <div class="metric">
                <h3>4.8/5</h3>
                <p>Average rating</p>
              </div>
              <div class="metric">
                <h3>24h</h3>
                <p>Order dispatch</p>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="hero-image-shell">
              <img alt="Hero product scene" class="hero-image" :src="heroImage">
              <div class="floating-card">
                <p>Editor's Pick</p>
                <h4>Handcrafted Utility Set</h4>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="featured-strip">
      <v-container>
        <v-row>
          <v-col cols="12" md="4">
            <div class="feature-box">
              <h3>Intentional Curation</h3>
              <p>Every item is selected for function-first design and long-term use.</p>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="feature-box">
              <h3>Independent Makers</h3>
              <p>We partner with small studios and trusted producers around the world.</p>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="feature-box">
              <h3>Transparent Quality</h3>
              <p>Material details, durability data, and fair pricing on every listing.</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section ref="productsSection" class="products-section">
      <v-container>
        <div class="section-head">
          <h2>Shop the collection</h2>
          <p>Fresh arrivals and everyday staples, ready to ship.</p>
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

        <div v-else class="mt-8">
          <div
            v-for="group in categorizedProducts"
            :key="group.name"
            class="category-group"
          >
            <h3 class="category-title">{{ group.name }}</h3>
            <v-row v-if="group.items.length > 0">
              <v-col
                v-for="product in group.items"
                :key="product.product_id"
                cols="12"
                md="4"
                sm="6"
              >
                <v-card class="product-card" @click="goToProduct(product.product_id)">
                  <div class="product-image-wrapper">
                    <img :alt="product.name" class="product-image" :src="product.image_url">
                  </div>
                  <v-card-text class="product-content">
                    <p class="product-category">{{ product.category }}</p>
                    <h3 class="product-name">{{ product.name }}</h3>
                    <div class="product-row">
                      <span class="product-price">${{ Number(product.price || 0).toFixed(2) }}</span>
                      <v-btn color="primary" icon size="small" @click.stop="quickAddToCart(product.product_id)">
                        <v-icon>mdi-cart-plus</v-icon>
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <p v-else class="empty-category">No items available in this category right now.</p>
          </div>
        </div>

        <div v-if="!loading && products.length === 0" class="text-center mt-12">
          <p class="text-h6">No products available right now.</p>
        </div>
      </v-container>
    </section>

    <v-snackbar v-model="snackbar" color="success" :timeout="2200">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
  import axios from 'axios'
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'

  const CATEGORY_PRIORITY = ['Electronics', 'Furniture', 'Clothing']
  const CACHE_TTL_MS = 60 * 1000
  let cachedProducts = null
  let cacheExpiresAt = 0

  export default {
    name: 'Home',
    setup() {
      const router = useRouter()
      const cartStore = useCartStore()
      const appStore = useAppStore()
      const products = ref([])
      const loading = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const productsSection = ref(null)

      const heroImage = 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000'
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const normalizeCategory = (category) => {
        const value = (category || '').toString().trim()
        if (!value) return 'Other'
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      }

      const categorizedProducts = computed(() => {
        const grouped = products.value.reduce((acc, product) => {
          const categoryName = normalizeCategory(product.category)
          if (!acc[categoryName]) acc[categoryName] = []
          acc[categoryName].push(product)
          return acc
        }, {})

        for (const category of CATEGORY_PRIORITY) {
          if (!grouped[category]) grouped[category] = []
        }

        const categories = Object.keys(grouped)
        categories.sort((a, b) => {
          const aPriority = CATEGORY_PRIORITY.indexOf(a)
          const bPriority = CATEGORY_PRIORITY.indexOf(b)
          if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority
          if (aPriority !== -1) return -1
          if (bPriority !== -1) return 1
          return a.localeCompare(b)
        })

        return categories.map((name) => ({ name, items: grouped[name] }))
      })

      const fetchProducts = async () => {
        const now = Date.now()
        if (cachedProducts && cacheExpiresAt > now) {
          products.value = cachedProducts
          return
        }

        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/api/products`, { timeout: 8000 })
          products.value = response.data
          cachedProducts = response.data
          cacheExpiresAt = now + CACHE_TTL_MS
        } catch (error) {
          console.error('Failed to fetch products:', error)
        } finally {
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
          snackbar.value = true
        } catch {
          snackbarText.value = 'Please login to add items'
          snackbar.value = true
        }
      }

      const scrollToProducts = () => {
        productsSection.value?.scrollIntoView({ behavior: 'smooth' })
      }

      onMounted(() => {
        fetchProducts()
      })

      return {
        products,
        categorizedProducts,
        loading,
        heroImage,
        goToProduct,
        quickAddToCart,
        snackbar,
        snackbarText,
        productsSection,
        scrollToProducts
      }
    }
  }
</script>

<style scoped>
.home {
  position: relative;
}

.hero-section {
  padding: 84px 0 54px;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(210, 122, 45, 0.18) 0%, rgba(210, 122, 45, 0) 70%);
  top: -280px;
  left: -220px;
}

.hero-row {
  min-height: 620px;
}

.hero-copy h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1.08;
  color: #132024;
  max-width: 620px;
}

.kicker {
  color: #b7671f;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 18px;
}

.subtitle {
  margin-top: 20px;
  max-width: 560px;
  color: #4f5f66;
  line-height: 1.8;
  font-size: 1.05rem;
}

.hero-actions {
  margin-top: 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cta-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.secondary-note {
  color: #607178;
  font-weight: 600;
}

.metrics {
  margin-top: 30px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.metric {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #d9e2de;
  border-radius: 14px;
  padding: 14px 16px;
  min-width: 120px;
}

.metric h3 {
  font-size: 1.28rem;
  color: #152326;
}

.metric p {
  font-size: 0.86rem;
  color: #67797f;
}

.hero-image-shell {
  position: relative;
  margin-top: 26px;
}

.hero-image {
  width: 100%;
  height: 560px;
  border-radius: 24px;
  object-fit: cover;
  box-shadow: 0 20px 60px rgba(21, 35, 38, 0.18);
}

.floating-card {
  position: absolute;
  right: 16px;
  bottom: 18px;
  background: rgba(16, 26, 28, 0.88);
  color: #fff;
  padding: 14px 16px;
  border-radius: 12px;
  max-width: 240px;
}

.floating-card p {
  font-size: 0.78rem;
  color: #d8c8b7;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.floating-card h4 {
  font-size: 1rem;
  margin-top: 6px;
}

.featured-strip {
  padding: 8px 0 24px;
}

.feature-box {
  background: #ffffff;
  border: 1px solid #d8e0dc;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
}

.feature-box h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem;
  color: #192528;
}

.feature-box p {
  margin-top: 10px;
  color: #5b6b70;
  line-height: 1.65;
}

.products-section {
  padding: 48px 0 70px;
}

.category-group + .category-group {
  margin-top: 30px;
}

.category-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  color: #192528;
  margin-bottom: 12px;
}

.empty-category {
  color: #607178;
  margin-bottom: 8px;
}

.section-head {
  text-align: center;
}

.section-head h2 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.9rem, 4vw, 3rem);
  color: #142023;
}

.section-head p {
  margin-top: 8px;
  color: #607178;
}

.product-card {
  border: 1px solid #d8e0dc;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.product-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 14px 32px rgba(21, 35, 38, 0.12);
}

.product-image-wrapper {
  width: 100%;
  height: 280px;
  background: #ecf1ee;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.06);
}

.product-content {
  padding: 18px !important;
}

.product-category {
  font-size: 0.74rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #7c8c92;
}

.product-name {
  margin-top: 8px;
  font-size: 1.08rem;
  color: #1a272a;
  min-height: 44px;
}

.product-row {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 1.2rem;
  color: #b8621a;
  font-weight: 700;
}

@media (max-width: 960px) {
  .hero-row {
    min-height: auto;
  }

  .hero-image {
    height: 430px;
  }
}

@media (max-width: 600px) {
  .hero-section {
    padding-top: 74px;
  }

  .hero-image {
    height: 340px;
  }

  .floating-card {
    left: 12px;
    right: 12px;
    max-width: none;
  }

  .metric {
    width: 100%;
  }
}
</style>
