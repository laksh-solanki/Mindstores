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
              <v-col cols="12" md="3" sm="4">
                <div class="cart-item-image-wrapper">
                  <img
                    v-if="cartStore.products[item.product_id]"
                    :alt="cartStore.products[item.product_id].name"
                    class="cart-item-image"
                    :src="cartStore.products[item.product_id].image_url"
                  >
                </div>
              </v-col>
              <v-col cols="12" md="9" sm="8">
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
                        <div class="cart-item-quantity">
                          <span class="quantity-label">Quantity</span>
                          <div class="quantity-controls">
                            <v-btn
                              class="quantity-btn"
                              :disabled="item.quantity <= 1 || isQuantityUpdating(item.product_id)"
                              icon
                              size="x-small"
                              variant="outlined"
                              @click="changeQuantity(item, -1)"
                            >
                              <v-icon size="16">mdi-minus</v-icon>
                            </v-btn>
                            <span class="quantity-value">{{ item.quantity }}</span>
                            <v-btn
                              class="quantity-btn"
                              :disabled="item.quantity >= getMaxQuantity(item.product_id) || isQuantityUpdating(item.product_id)"
                              icon
                              size="x-small"
                              variant="outlined"
                              @click="changeQuantity(item, 1)"
                            >
                              <v-icon size="16">mdi-plus</v-icon>
                            </v-btn>
                          </div>
                          <span class="stock-hint">Max {{ getMaxQuantity(item.product_id) }}</span>
                        </div>
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
              <div class="promo-section">
                <p class="promo-label">Promo Code</p>
                <div class="promo-input-row">
                  <v-text-field
                    v-model="promoInput"
                    class="promo-input"
                    density="comfortable"
                    hide-details
                    placeholder="Enter code"
                    rounded="lg"
                    variant="outlined"
                  />
                  <v-btn
                    class="promo-apply-btn"
                    color="primary"
                    :disabled="selectedProductIds.length === 0 || !promoInput.trim()"
                    height="48"
                    rounded="lg"
                    @click="applyPromoCode"
                  >
                    Apply
                  </v-btn>
                </div>
                <div class="promo-chip-row">
                  <v-chip
                    v-for="promo in PROMO_CODES"
                    :key="promo.code"
                    class="promo-chip"
                    :color="appliedPromoCode === promo.code ? 'primary' : undefined"
                    size="small"
                    :variant="appliedPromoCode === promo.code ? 'flat' : 'outlined'"
                    @click="selectPromoCode(promo.code)"
                  >
                    {{ promo.code }}
                  </v-chip>
                </div>
                <p class="promo-note">{{ promoHelperText }}</p>
              </div>
              <div class="summary-row">
                <span>Subtotal</span>
                <span>{{ formatAmount(selectedTotalAmount) }}</span>
              </div>
              <div v-if="promoDiscount > 0" class="summary-row promo-row">
                <span>Promo ({{ appliedPromoCode }})</span>
                <span>-{{ formatAmount(promoDiscount) }}</span>
              </div>
              <div class="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <v-divider class="my-4" />
              <div class="summary-row summary-total">
                <span>Total</span>
                <span>{{ formatAmount(finalTotalAmount) }}</span>
              </div>
            </v-card-text>
            <v-card-actions class="summary-actions">
              <v-btn
                block
                class="checkout-btn border"
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
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useCartStore } from '@/stores/cart'
  import { loadUserSettings } from '@/utils/userSettings'

  const PROMO_CODES = [
    {
      code: 'SAVE10',
      type: 'percent',
      value: 10,
      minSubtotal: 60,
      description: '10% off selected items above $60'
    },
    {
      code: 'FLAT20',
      type: 'flat',
      value: 20,
      minSubtotal: 120,
      description: '$20 off selected items above $120'
    },
    {
      code: 'SAVE20',
      type: 'percent',
      value: 20,
      minSubtotal: 180,
      description: '20% off selected items above $180'
    }
  ]

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
      const quantityUpdatingById = ref({})
      const promoInput = ref('')
      const appliedPromoCode = ref('')

      const selectedTotalAmount = computed(() => {
        return cartStore.items.reduce((total, item) => {
          if (!selectedProductIds.value.includes(item.product_id)) {
            return total
          }
          const product = cartStore.products[item.product_id]
          return total + (product ? product.price * item.quantity : 0)
        }, 0)
      })

      const activePromo = computed(() => {
        return PROMO_CODES.find((promo) => promo.code === appliedPromoCode.value) || null
      })

      const promoDiscount = computed(() => {
        const promo = activePromo.value
        const subtotal = selectedTotalAmount.value
        if (!promo || subtotal <= 0 || subtotal < promo.minSubtotal) {
          return 0
        }

        if (promo.type === 'percent') {
          return Number(((subtotal * promo.value) / 100).toFixed(2))
        }

        return Math.min(subtotal, promo.value)
      })

      const finalTotalAmount = computed(() => {
        return Math.max(0, selectedTotalAmount.value - promoDiscount.value)
      })

      const promoHelperText = computed(() => {
        if (appliedPromoCode.value && activePromo.value && promoDiscount.value > 0) {
          return `Applied ${appliedPromoCode.value}: ${activePromo.value.description}`
        }
        return `Valid codes: ${PROMO_CODES.map((promo) => promo.code).join(', ')}`
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

      const getMaxQuantity = (productId) => {
        const product = cartStore.products[productId]
        const stock = Number(product?.stock)

        if (!Number.isFinite(stock) || stock <= 0) {
          const fallbackItem = cartStore.items.find((item) => item.product_id === productId)
          return Math.max(1, Number(fallbackItem?.quantity || 1))
        }

        return Math.max(1, Math.floor(stock))
      }

      const isQuantityUpdating = (productId) => Boolean(quantityUpdatingById.value[productId])

      const changeQuantity = async (item, step) => {
        const currentQuantity = Number(item.quantity || 0)
        const nextQuantity = currentQuantity + step
        const maxQuantity = getMaxQuantity(item.product_id)

        if (nextQuantity < 1) {
          return
        }

        if (nextQuantity > maxQuantity) {
          snackbarText.value = `Only ${maxQuantity} items available for this product`
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        if (isQuantityUpdating(item.product_id)) {
          return
        }

        quantityUpdatingById.value = {
          ...quantityUpdatingById.value,
          [item.product_id]: true
        }

        try {
          await cartStore.updateCartQuantity(item.product_id, nextQuantity)
        } catch (error) {
          snackbarText.value = error?.response?.data?.message || 'Failed to update quantity'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          const nextState = { ...quantityUpdatingById.value }
          delete nextState[item.product_id]
          quantityUpdatingById.value = nextState
        }
      }

      const normalizePromoCode = (value) => String(value || '').trim().toUpperCase()

      const applyPromoCode = () => {
        if (selectedProductIds.value.length === 0) {
          snackbarText.value = 'Select products before applying promo code'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        const normalizedCode = normalizePromoCode(promoInput.value)
        const promo = PROMO_CODES.find((item) => item.code === normalizedCode)

        if (!promo) {
          appliedPromoCode.value = ''
          snackbarText.value = 'Invalid promo code. Please use a valid code.'
          snackbarColor.value = 'error'
          snackbar.value = true
          return
        }

        if (selectedTotalAmount.value < promo.minSubtotal) {
          appliedPromoCode.value = ''
          snackbarText.value = `Promo ${promo.code} requires at least ${formatAmount(promo.minSubtotal)} selected subtotal`
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        appliedPromoCode.value = promo.code
        promoInput.value = promo.code
        snackbarText.value = `Promo ${promo.code} applied successfully`
        snackbarColor.value = 'success'
        snackbar.value = true
      }

      const selectPromoCode = (code) => {
        promoInput.value = code
        applyPromoCode()
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
        if (selectedProductIds.value.length === 0) {
          return
        }

        checkoutLoading.value = true
        try {
          const selectedParam = selectedProductIds.value
            .map((productId) => encodeURIComponent(productId))
            .join(',')
          const queryParts = [`selected=${selectedParam}`]
          if (appliedPromoCode.value && promoDiscount.value > 0) {
            queryParts.push(`promo=${encodeURIComponent(appliedPromoCode.value)}`)
          }
          await router.push(`/payment?${queryParts.join('&')}`)
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

      watch(
        () => `${selectedProductIds.value.join(',')}|${selectedTotalAmount.value}`,
        () => {
          if (!activePromo.value) return

          if (selectedProductIds.value.length === 0 || selectedTotalAmount.value < activePromo.value.minSubtotal) {
            appliedPromoCode.value = ''
          }
        }
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
        changeQuantity,
        getMaxQuantity,
        isQuantityUpdating,
        applyPromoCode,
        selectPromoCode,
        PROMO_CODES,
        promoInput,
        appliedPromoCode,
        promoDiscount,
        finalTotalAmount,
        promoHelperText,
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

.content-row {
  row-gap: 12px;
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
  gap: 10px;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.quantity-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.84rem;
  color: #6c7f86;
  letter-spacing: 0.2px;
}

.quantity-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #d8e2dd;
  border-radius: 999px;
  padding: 3px 8px;
  background: rgba(249, 252, 250, 0.9);
}

.quantity-btn {
  color: #2c3e42;
}

.quantity-value {
  min-width: 22px;
  text-align: center;
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #243437;
}

.stock-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  color: #72848b;
}

.remove-btn {
  color: #6f8086;
  margin-top: -4px;
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

.promo-section {
  border: 1px solid #d8e2dd;
  border-radius: 14px;
  background: #f9fcfa;
  padding: 12px;
  margin-bottom: 12px;
}

.promo-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #35494f;
}

.promo-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.promo-input {
  flex: 1;
}

.promo-apply-btn {
  text-transform: none;
  font-weight: 700;
}

.promo-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.promo-chip {
  cursor: pointer;
}

.promo-note {
  margin-top: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  color: #6a7d84;
}

.promo-row {
  color: #246a57;
  font-weight: 700;
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

  .cart-list-head {
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .cart-list-head p {
    font-size: 1.15rem;
  }

  .cart-item-card {
    border-radius: 16px;
  }

  .cart-item-image-wrapper {
    height: 180px;
  }

  .item-content {
    padding: 14px !important;
  }

  .item-main-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .item-check-wrap {
    gap: 6px;
  }

  .item-check {
    margin-left: -6px;
    margin-right: -2px;
  }

  .cart-item-name {
    font-size: 1rem;
  }

  .cart-item-price {
    margin-top: 4px;
  }

  .cart-item-quantity {
    margin-top: 4px;
    gap: 6px;
  }

  .promo-input-row {
    flex-direction: column;
    align-items: stretch;
  }

  .remove-btn {
    justify-self: end;
    margin-top: 0;
  }

  .summary-title {
    font-size: 1.25rem;
  }

  .summary-body,
  .summary-actions {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
