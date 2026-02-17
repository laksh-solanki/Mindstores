<template>
  <div class="home">
    <section class="hero-section">
      <v-container>
        <v-row class="align-center" style="min-height: 600px;">
          <v-col cols="12" md="6">
            <h1 class="hero-title">
              Curated Products<br>For Modern Living
            </h1>
            <p class="hero-subtitle">
              Discover thoughtfully selected items that elevate your everyday experience
            </p>
            <v-btn
              class="mt-6"
              color="primary"
              rounded="lg"
              size="large"
              @click="scrollToProducts"
            >
              Shop Now
            </v-btn>
          </v-col>
          <v-col cols="12" md="6">
            <img
              alt="Hero product"
              class="hero-image"
              :src="heroImage"
            >
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section ref="productsSection" class="products-section">
      <v-container>
        <h2 class="section-title">Our Collection</h2>

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

        <v-row v-else class="mt-8">
          <v-col
            v-for="product in products"
            :key="product.product_id"
            cols="12"
            md="4"
            sm="6"
          >
            <v-card
              class="product-card"
              @click="goToProduct(product.product_id)"
            >
              <div class="product-image-wrapper">
                <img
                  :alt="product.name"
                  class="product-image"
                  :src="product.image_url"
                >
              </div>
              <v-card-text>
                <h3 class="product-name">{{ product.name }}</h3>
                <p class="product-category">{{ product.category }}</p>
                <div class="d-flex align-center justify-space-between mt-4">
                  <span class="product-price">${{ product.price.toFixed(2) }}</span>
                  <v-btn
                    color="primary"
                    icon
                    size="small"
                    @click.stop="quickAddToCart(product.product_id)"
                  >
                    <v-icon>mdi-cart-plus</v-icon>
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading && products.length === 0" class="text-center mt-12">
          <p class="text-h6">No products available</p>
        </div>
      </v-container>
    </section>

    <v-snackbar v-model="snackbar" color="success" :timeout="2000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
  import axios from 'axios'
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app' // Switched to AppStore based on previous merge
  // REFIX: Using @ alias
  import { useCartStore } from '@/stores/cart'

  export default {
    name: 'Home',
    setup() {
      const router = useRouter()
      const cartStore = useCartStore()
      const appStore = useAppStore() // Use appStore for auth
      const products = ref([])
      const loading = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const productsSection = ref(null)

      const heroImage = 'https://images.unsplash.com/photo-1731705715985-f5a6c8f459e9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'

      // REFIX: Vite compatible env var
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const fetchProducts = async () => {
        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/api/products`)
          products.value = response.data
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
          snackbarText.value = 'Added to cart!'
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
.hero-section {
  background: linear-gradient(135deg, #F8F9FA 0%, #E8EFF5 100%);
  padding: 80px 0;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: #2F4F4F;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 1.2rem;
  color: #5A6A85;
  line-height: 1.6;
}

.hero-image {
  width: 100%;
  height: auto;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 20px 60px rgba(47, 79, 79, 0.15);
}

.products-section {
  padding: 100px 0;
}

.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 600;
  text-align: center;
  color: #2F4F4F;
  margin-bottom: 2rem;
}

.product-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  overflow: hidden;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(47, 79, 79, 0.1);
}

.product-image-wrapper {
  width: 100%;
  height: 300px;
  overflow: hidden;
  background-color: #F8F9FA;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.product-name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1A202C;
  margin-bottom: 0.5rem;
}

.product-category {
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  color: #78909C;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.product-price {
  font-family: 'Manrope', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #2F4F4F;
}

@media (max-width: 960px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .section-title {
    font-size: 2rem;
  }
}
</style>
