<template>
  <div class="product-detail">
    <v-container v-if="loading" class="py-12">
      <v-row>
        <v-col cols="12" md="6">
          <v-skeleton-loader type="image" />
        </v-col>
        <v-col cols="12" md="6">
          <v-skeleton-loader type="article" />
        </v-col>
      </v-row>
    </v-container>

    <v-container v-else-if="product" class="py-12">
      <v-row>
        <v-col cols="12" md="7">
          <div class="product-image-container">
            <img
              :alt="product.name"
              class="product-detail-image"
              :src="product.image_url"
            >
          </div>
        </v-col>

        <v-col cols="12" md="5">
          <div class="product-info-sticky">
            <p class="product-category">{{ product.category }}</p>
            <h1 class="product-title">{{ product.name }}</h1>
            <p class="product-price">${{ product.price.toFixed(2) }}</p>

            <p class="product-description">{{ product.description }}</p>

            <div class="stock-info">
              <v-icon :color="product.stock > 0 ? 'success' : 'error'" size="small">
                mdi-circle
              </v-icon>
              <span :class="product.stock > 0 ? 'text-success' : 'text-error'">
                {{ product.stock > 0 ? `${product.stock} in stock` : 'Out of stock' }}
              </span>
            </div>

            <div class="quantity-selector mt-6">
              <label class="quantity-label">Quantity</label>
              <div class="d-flex align-center">
                <v-btn
                  :disabled="quantity <= 1"
                  icon
                  size="small"
                  variant="outlined"
                  @click="decreaseQuantity"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <span class="quantity-value">{{ quantity }}</span>
                <v-btn
                  :disabled="quantity >= product.stock"
                  icon
                  size="small"
                  variant="outlined"
                  @click="increaseQuantity"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </div>

            <v-btn
              block
              class="mt-8 add-to-cart-btn"
              color="primary"
              :disabled="product.stock === 0"
              rounded="lg"
              size="x-large"
              @click="addToCart"
            >
              <v-icon left>mdi-cart</v-icon>
              Add to Cart
            </v-btn>

            <v-btn
              block
              class="mt-4"
              rounded="lg"
              size="large"
              variant="outlined"
              @click="$router.push('/')"
            >
              Continue Shopping
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <div v-else class="text-center py-12">
      <p class="text-h6">Product not found</p>
    </div>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="2000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
  import axios from 'axios'
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'

  export default {
    name: 'ProductDetail',
    setup() {
      const route = useRoute()
      const router = useRouter()
      const cartStore = useCartStore()
      const appStore = useAppStore()
      const product = ref(null)
      const loading = ref(false)
      const quantity = ref(1)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')

      // REFIX: Vite compatible env var
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const fetchProduct = async () => {
        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/api/products/${route.params.id}`)
          product.value = response.data
        } catch (error) {
          console.error('Failed to fetch product:', error)
        } finally {
          loading.value = false
        }
      }

      const increaseQuantity = () => {
        if (quantity.value < product.value.stock) {
          quantity.value++
        }
      }

      const decreaseQuantity = () => {
        if (quantity.value > 1) {
          quantity.value--
        }
      }

      const addToCart = async () => {
        if (!appStore.isAuthenticated) {
          router.push('/login')
          return
        }

        try {
          await cartStore.addToCart(product.value.product_id, quantity.value)
          snackbarText.value = 'Added to cart successfully!'
          snackbarColor.value = 'success'
          snackbar.value = true
        } catch {
          snackbarText.value = 'Failed to add to cart'
          snackbarColor.value = 'error'
          snackbar.value = true
        }
      }

      onMounted(() => {
        fetchProduct()
      })

      return {
        product,
        loading,
        quantity,
        increaseQuantity,
        decreaseQuantity,
        addToCart,
        snackbar,
        snackbarText,
        snackbarColor
      }
    }
  }
</script>

<style scoped>
.product-image-container {
  width: 100%;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  background-color: #F8F9FA;
}

.product-detail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info-sticky {
  position: sticky;
  top: 100px;
}

.product-category {
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  color: #78909C;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 1rem;
}

.product-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #2F4F4F;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.product-price {
  font-family: 'Manrope', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #D4AF37;
  margin-bottom: 2rem;
}

.product-description {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  color: #5A6A85;
  line-height: 1.8;
  margin-bottom: 2rem;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
}

.quantity-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1A202C;
  display: block;
  margin-bottom: 0.5rem;
}

.quantity-value {
  font-family: 'Manrope', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 1.5rem;
  min-width: 30px;
  text-align: center;
}

.add-to-cart-btn {
  font-weight: 600;
  letter-spacing: 0.5px;
}

@media (max-width: 960px) {
  .product-title {
    font-size: 2rem;
  }

  .product-price {
    font-size: 1.5rem;
  }

  .product-image-container {
    height: 400px;
  }

  .product-info-sticky {
    position: static;
  }
}
</style>
