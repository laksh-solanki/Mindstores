<template>
  <div class="cart-page">
    <v-container class="py-12">
      <h1 class="page-title">Shopping Cart</h1>

      <v-row v-if="cartStore.items.length === 0" class="mt-8">
        <v-col class="text-center" cols="12">
          <v-icon color="grey" size="80">mdi-cart-outline</v-icon>
          <p class="text-h6 mt-4">Your cart is empty</p>
          <v-btn
            class="mt-4"
            color="primary"
            @click="$router.push('/')"
          >
            Continue Shopping
          </v-btn>
        </v-col>
      </v-row>

      <v-row v-else class="mt-8">
        <v-col cols="12" md="8">
          <v-card
            v-for="item in cartStore.items"
            :key="item.product_id"
            class="mb-4 cart-item-card"
          >
            <v-row no-gutters>
              <v-col cols="4" sm="3">
                <div class="cart-item-image-wrapper">
                  <img
                    v-if="cartStore.products[item.product_id]"
                    :alt="cartStore.products[item.product_id].name"
                    class="cart-item-image"
                    :src="cartStore.products[item.product_id].image_url"
                  >
                </div>
              </v-col>
              <v-col cols="8" sm="9">
                <v-card-text>
                  <div class="d-flex justify-space-between">
                    <div>
                      <h3 class="cart-item-name">
                        {{ cartStore.products[item.product_id]?.name }}
                      </h3>
                      <p class="cart-item-price">
                        ${{ cartStore.products[item.product_id]?.price.toFixed(2) }}
                      </p>
                      <p class="cart-item-quantity">
                        Quantity: {{ item.quantity }}
                      </p>
                    </div>
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="removeItem(item.product_id)"
                    >
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </div>
                </v-card-text>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="order-summary-card">
            <v-card-title class="summary-title">Order Summary</v-card-title>
            <v-card-text>
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${{ cartStore.totalAmount.toFixed(2) }}</span>
              </div>
              <div class="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <v-divider class="my-4" />
              <div class="summary-row summary-total">
                <span>Total</span>
                <span>${{ cartStore.totalAmount.toFixed(2) }}</span>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-btn
                block
                color="primary"
                :loading="checkoutLoading"
                rounded="lg"
                size="large"
                @click="checkout"
              >
                Place Order
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
  import axios from 'axios'
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useCartStore } from '@/stores/cart' // Updated import path

  export default {
    name: 'Cart',
    setup() {
      const router = useRouter()
      const cartStore = useCartStore()
      const checkoutLoading = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')

      // REFIX: Vite compatible env var
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const removeItem = async (productId) => {
        try {
          await cartStore.removeFromCart(productId)
          snackbarText.value = 'Item removed from cart'
          snackbarColor.value = 'success'
          snackbar.value = true
        } catch {
          snackbarText.value = 'Failed to remove item'
          snackbarColor.value = 'error'
          snackbar.value = true
        }
      }

      const checkout = async () => {
        checkoutLoading.value = true
        try {
          // REFIX: Call place-order instead of create-session
          const response = await axios.post(
            `${API_URL}/api/checkout/place-order`,
            {},
            { withCredentials: true }
          )

          if (response.data.success) {
            // Manually clear cart since backend cleared it
            cartStore.items = []
            // Redirect to success page
            router.push(`/order-success?order_id=${response.data.order_id}`)
          }
        } catch (error) {
          console.error('Checkout failed:', error)
          snackbarText.value = 'Order failed. Please try again.'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          checkoutLoading.value = false
        }
      }

      onMounted(() => {
        cartStore.fetchCart()
      })

      return {
        cartStore,
        removeItem,
        checkout,
        checkoutLoading,
        snackbar,
        snackbarText,
        snackbarColor
      }
    }
  }
</script>

<style scoped>
.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #2F4F4F;
  text-align: center;
}

.cart-item-card {
  border-radius: 12px;
}

.cart-item-image-wrapper {
  width: 100%;
  height: 150px;
  background-color: #F8F9FA;
  overflow: hidden;
}

.cart-item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1A202C;
  margin-bottom: 0.5rem;
}

.cart-item-price {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #2F4F4F;
  margin-bottom: 0.5rem;
}

.cart-item-quantity {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  color: #78909C;
}

.order-summary-card {
  border-radius: 12px;
  position: sticky;
  top: 100px;
}

.summary-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2F4F4F;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-family: 'Manrope', sans-serif;
  color: #5A6A85;
}

.summary-total {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2F4F4F;
}

@media (max-width: 960px) {
  .page-title {
    font-size: 2rem;
  }

  .order-summary-card {
    position: static;
  }
}
</style>
