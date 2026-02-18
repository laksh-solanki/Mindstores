<template>
  <div class="cart-page">
    <v-container class="cart-shell">
      <section class="cart-hero">
        <p class="cart-kicker">Checkout</p>
        <h1 class="page-title">Your Curated Cart</h1>
        <p class="cart-subtitle">Review your selected pieces and complete your order in one step.</p>
      </section>

      <v-row v-if="cartStore.items.length === 0" class="empty-row">
        <v-col cols="12">
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <v-icon size="58">mdi-cart-outline</v-icon>
            </div>
            <p class="empty-title">Your cart is currently empty</p>
            <p class="empty-copy">Explore our latest collection and add products you love.</p>
            <v-btn
              class="empty-cta"
              color="primary"
              rounded="pill"
              size="large"
              @click="$router.push('/')"
            >
              Continue Shopping
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <v-row v-else class="content-row">
        <v-col cols="12" md="8">
          <div class="cart-list-head">
            <p>Products in cart</p>
            <span>{{ cartStore.items.length }} items</span>
          </div>

          <v-card
            v-for="item in cartStore.items"
            :key="item.product_id"
            class="cart-item-card"
            variant="flat"
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
                <v-card-text class="item-content">
                  <div class="item-main-row">
                    <div class="item-check-wrap">
                      <v-checkbox
                        v-model="selectedProductIds"
                        class="item-check"
                        color="primary"
                        density="compact"
                        hide-details
                        :value="item.product_id"
                      />
                      <div>
                        <h3 class="cart-item-name">
                          {{ cartStore.products[item.product_id]?.name }}
                        </h3>
                        <p class="cart-item-price">
                          {{ formatAmount(cartStore.products[item.product_id]?.price) }}
                        </p>
                        <p class="cart-item-quantity">
                          Quantity: {{ item.quantity }}
                        </p>
                      </div>
                    </div>
                    <v-btn
                      class="remove-btn"
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
          <v-card class="order-summary-card" variant="flat">
            <v-card-title class="summary-title">Order Summary</v-card-title>
            <v-card-text class="summary-body">
              <div class="summary-row">
                <span>Selected Items</span>
                <span>{{ selectedProductIds.length }} / {{ cartStore.items.length }}</span>
              </div>
              <div class="summary-row select-all-row">
                <v-checkbox
                  v-model="selectAllChecked"
                  color="primary"
                  density="compact"
                  hide-details
                  label="Select all products"
                />
              </div>
              <div class="summary-row">
                <span>Subtotal</span>
                <span>{{ formatAmount(selectedTotalAmount) }}</span>
              </div>
              <div class="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <v-divider class="my-4" />
              <div class="summary-row summary-total">
                <span>Total</span>
                <span>{{ formatAmount(selectedTotalAmount) }}</span>
              </div>
            </v-card-text>
            <v-card-actions class="summary-actions">
              <v-btn
                block
                class="checkout-btn"
                color="primary"
                :disabled="selectedProductIds.length === 0"
                :loading="checkoutLoading"
                rounded="pill"
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
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useCartStore } from '@/stores/cart'
  import { loadUserSettings } from '@/utils/userSettings'

  export default {
    name: 'Cart',
    setup() {
      const router = useRouter()
      const cartStore = useCartStore()
      const checkoutLoading = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const selectedProductIds = ref([])
      const userSettings = ref(loadUserSettings())

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const selectedTotalAmount = computed(() => {
        return cartStore.items.reduce((total, item) => {
          if (!selectedProductIds.value.includes(item.product_id)) {
            return total
          }
          const product = cartStore.products[item.product_id]
          return total + (product ? product.price * item.quantity : 0)
        }, 0)
      })

      const selectAllChecked = computed({
        get: () => cartStore.items.length > 0 && selectedProductIds.value.length === cartStore.items.length,
        set: (checked) => {
          if (checked) {
            selectedProductIds.value = cartStore.items.map((item) => item.product_id)
            return
          }
          selectedProductIds.value = []
        }
      })

      const removeItem = async (productId) => {
        try {
          await cartStore.removeFromCart(productId)
          selectedProductIds.value = selectedProductIds.value.filter((id) => id !== productId)
          snackbarText.value = 'Item removed from cart'
          snackbarColor.value = 'success'
          snackbar.value = true
        } catch {
          snackbarText.value = 'Failed to remove item'
          snackbarColor.value = 'error'
          snackbar.value = true
        }
      }

      const formatAmount = (amount) => {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: userSettings.value.currency || 'USD',
            maximumFractionDigits: 2
          }).format(Number(amount || 0))
        } catch {
          return `$${Number(amount || 0).toFixed(2)}`
        }
      }

      const checkout = async () => {
        checkoutLoading.value = true
        try {
          const response = await axios.post(
            `${API_URL}/api/checkout/place-order`,
            { selected_product_ids: selectedProductIds.value },
            { withCredentials: true }
          )

          if (response.data.success) {
            await cartStore.fetchCart()
            selectedProductIds.value = cartStore.items.map((item) => item.product_id)
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

      watch(
        () => cartStore.items.map((item) => item.product_id),
        (productIds) => {
          const productIdSet = new Set(productIds)
          selectedProductIds.value = selectedProductIds.value.filter((id) => productIdSet.has(id))
          if (userSettings.value.quickCheckout && selectedProductIds.value.length === 0 && productIds.length > 0) {
            selectedProductIds.value = [...productIds]
          }
        },
        { immediate: true }
      )

      onMounted(async () => {
        await cartStore.fetchCart()
        userSettings.value = loadUserSettings()
        selectedProductIds.value = userSettings.value.quickCheckout
          ? cartStore.items.map((item) => item.product_id)
          : []
      })

      return {
        cartStore,
        removeItem,
        checkout,
        checkoutLoading,
        selectedProductIds,
        selectedTotalAmount,
        selectAllChecked,
        formatAmount,
        snackbar,
        snackbarText,
        snackbarColor
      }
    }
  }
</script>

<style scoped>
.cart-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 8% 12%, rgba(207, 127, 49, 0.2) 0%, rgba(207, 127, 49, 0) 34%),
    radial-gradient(circle at 92% 78%, rgba(39, 65, 63, 0.14) 0%, rgba(39, 65, 63, 0) 38%),
    linear-gradient(160deg, #f2f6f3 0%, #ecf2ee 45%, #eef3f0 100%);
}

.cart-shell {
  padding-top: 52px;
  padding-bottom: 64px;
}

.cart-hero {
  text-align: center;
}

.cart-kicker {
  font-size: 0.78rem;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #b46a22;
  font-weight: 700;
}

.page-title {
  margin-top: 10px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3.3rem);
  color: #1b292d;
}

.cart-subtitle {
  margin: 10px auto 0;
  max-width: 620px;
  color: #5e7076;
  line-height: 1.75;
}

.empty-row,
.content-row {
  margin-top: 36px;
}

.empty-state {
  border: 1px solid #dbe4df;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px);
  box-shadow: 0 24px 58px rgba(19, 33, 31, 0.08);
  padding: clamp(30px, 6vw, 64px);
  text-align: center;
}

.empty-icon-wrap {
  width: 86px;
  height: 86px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(140deg, #f4dfc7, #f0cfac);
  color: #7b4918;
  display: grid;
  place-items: center;
}

.empty-title {
  margin-top: 20px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  color: #1c2d30;
}

.empty-copy {
  margin: 10px auto 0;
  max-width: 500px;
  color: #5e6f75;
}

.empty-cta {
  margin-top: 24px;
  text-transform: none;
  font-weight: 700;
  padding-inline: 28px;
}

.cart-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cart-list-head p {
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  color: #1f2e32;
}

.cart-list-head span {
  font-size: 0.82rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #697b82;
  font-weight: 700;
}

.cart-item-card {
  border: 1px solid #d8e2dd;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  box-shadow: 0 16px 34px rgba(20, 36, 34, 0.06);
}

.cart-item-card + .cart-item-card {
  margin-top: 12px;
}

.cart-item-image-wrapper {
  width: 100%;
  height: 170px;
  background: #eef3ef;
  overflow: hidden;
}

.cart-item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.cart-item-card:hover .cart-item-image {
  transform: scale(1.04);
}

.item-content {
  padding: 20px !important;
}

.item-main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-check-wrap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.item-check {
  margin-top: 0;
}

.cart-item-name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.08rem;
  font-weight: 700;
  color: #1a282c;
  line-height: 1.35;
}

.cart-item-price {
  margin-top: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  color: #b1601f;
}

.cart-item-quantity {
  margin-top: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.86rem;
  color: #6c7f86;
  letter-spacing: 0.2px;
}

.remove-btn {
  color: #6f8086;
}

.order-summary-card {
  border: 1px solid #d8e2dd;
  border-radius: 20px;
  position: sticky;
  top: 98px;
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.94), rgba(244, 248, 245, 0.92));
  box-shadow: 0 20px 42px rgba(20, 35, 33, 0.08);
}

.summary-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2e32;
  padding: 22px 22px 4px;
}

.summary-body {
  padding: 16px 22px 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-family: 'Manrope', sans-serif;
  color: #55696f;
}

.select-all-row {
  padding: 2px 0 6px;
}

.summary-total {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1f3034;
}

.summary-actions {
  padding: 4px 22px 22px;
}

.checkout-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 12px 24px rgba(198, 115, 42, 0.25);
}

@media (max-width: 960px) {
  .cart-shell {
    padding-top: 42px;
  }

  .order-summary-card {
    position: static;
    margin-top: 10px;
  }
}

@media (max-width: 600px) {
  .cart-shell {
    padding-top: 34px;
    padding-bottom: 44px;
  }

  .cart-item-image-wrapper {
    height: 135px;
  }

  .summary-title {
    font-size: 1.25rem;
  }
}
</style>
