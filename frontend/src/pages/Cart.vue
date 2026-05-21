<template>
  <v-container class="bespoke-cart-container" fluid>
    <!-- Back Button Header -->
    <div class="cart-header-bar">
      <button class="back-btn" @click="$router.push('/')">
        <v-icon start>mdi-arrow-left</v-icon>
        Back to Catalog
        <span class="underline-hover" />
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="cartStore.items.length === 0" class="cart-empty-wrapper">
      <div class="gallery-frame empty-cart-frame">
        <div class="frame-header">
          <div class="frame-dots">
            <span class="dot-red" />
            <span class="dot-yellow" />
            <span class="dot-green" />
          </div>
          <div class="frame-title-display">cart_session.json</div>
        </div>
        <div class="empty-cart-body text-center">
          <div class="brand-tagline">
            <span class="tag-label">SHOPPING CART</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">EMPTY STATE</span>
          </div>
          <h1 class="empty-cart-title">Your cart is <span class="highlight-serif">empty</span></h1>
          <p class="empty-cart-subtitle">Explore our latest collection and add products you love.</p>
          <div class="mt-6">
            <v-btn class="action-btn-flat" rounded="0" size="large" @click="$router.push('/')">
              Continue Shopping
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Active State -->
    <v-row v-else class="cart-active-grid">
      <!-- Cart Items List -->
      <v-col cols="12" md="8">
        <div class="cart-section-header">
          <h2 class="section-title">Products in <span class="highlight-serif">cart</span></h2>
          <span class="cart-badge">{{ cartStore.items.length }} items</span>
        </div>

        <div class="cart-items-list mt-4">
          <div
            v-for="item in cartStore.items"
            :key="item.product_id"
            class="flat-cart-item-card"
          >
            <!-- Product Image Frame -->
            <div class="cart-item-image-wrapper">
              <div
                class="cart-item-image-inner"
                role="button"
                tabindex="0"
                @click="goToProduct(item.product_id)"
                @keyup.enter="goToProduct(item.product_id)"
              >
                <img
                  v-if="cartProductImageUrl(item.product_id)"
                  :alt="cartProductName(item.product_id)"
                  class="cart-item-img"
                  :src="cartProductImageUrl(item.product_id)"
                >
                <div v-else class="no-image-placeholder">
                  <v-icon color="primary" size="36">mdi-image-off-outline</v-icon>
                </div>
              </div>
              <button
                aria-label="Remove item"
                class="remove-item-btn"
                @click.stop="removeItem(item.product_id)"
              >
                <v-icon size="16">mdi-close</v-icon>
              </button>
            </div>

            <!-- Product Details -->
            <div class="cart-item-details">
              <div class="d-flex align-start ga-2">
                <v-checkbox
                  v-model="selectedProductIds"
                  class="cart-item-checkbox"
                  color="teal-darken-1"
                  density="compact"
                  :disabled="isItemUnavailable(item)"
                  hide-details
                  :value="item.product_id"
                />
                <div class="flex-grow-1 min-width-0">
                  <h3
                    class="product-name-link"
                    role="button"
                    tabindex="0"
                    @click="goToProduct(item.product_id)"
                    @keyup.enter="goToProduct(item.product_id)"
                  >
                    {{ cartProductName(item.product_id) }}
                  </h3>
                  <div class="product-price-display mt-1">
                    {{ formatAmount(cartStore.products[item.product_id]?.price) }}
                  </div>
                </div>
              </div>

              <div class="cart-item-footer mt-4">
                <!-- Stock Status -->
                <span
                  class="stock-status-tag"
                  :class="isItemUnavailable(item) ? 'status-error' : 'status-' + getStockStatusColor(item)"
                >
                  {{ getStockMessage(item) }}
                </span>

                <!-- Quantity Control -->
                <div class="quantity-control-group">
                  <button
                    class="qty-btn"
                    :disabled="item.quantity <= 1 || isItemUnavailable(item) || isQuantityUpdating(item.product_id)"
                    @click="changeQuantity(item, -1)"
                  >
                    <v-icon size="14">mdi-minus</v-icon>
                  </button>
                  <span class="qty-display">Qty {{ item.quantity }}</span>
                  <button
                    class="qty-btn"
                    :disabled="isItemUnavailable(item) || item.quantity >= getMaxQuantity(item.product_id) || isQuantityUpdating(item.product_id)"
                    @click="changeQuantity(item, 1)"
                  >
                    <v-icon size="14">mdi-plus</v-icon>
                  </button>
                </div>
              </div>
              <p class="max-qty-caption mt-2">
                {{ getMaxQuantity(item.product_id) > 0 ? `Max ${getMaxQuantity(item.product_id)} available` : 'Not available' }}
              </p>
            </div>
          </div>
        </div>
      </v-col>

      <!-- Order Summary Card -->
      <v-col cols="12" md="4">
        <div class="gallery-frame summary-frame">
          <div class="frame-header">
            <div class="frame-dots">
              <span class="dot-red" />
              <span class="dot-yellow" />
              <span class="dot-green" />
            </div>
            <div class="frame-title-display">order_summary.json</div>
          </div>
          <div class="summary-card-body">
            <h2 class="summary-title">Order <span class="highlight-serif">Summary</span></h2>
            
            <div class="summary-selection-info mt-2">
              <span>Selected Items</span>
              <span class="font-weight-bold">{{ selectedProductIds.length }} / {{ cartStore.items.length }}</span>
            </div>

            <div class="select-all-row mt-3">
              <v-checkbox
                v-model="selectAllChecked"
                class="summary-checkbox"
                color="teal-darken-1"
                density="compact"
                hide-details
                label="Select available products"
              />
            </div>

            <!-- Custom Flat Warning Alert -->
            <div v-if="selectedStockIssues.length > 0" class="custom-flat-alert warning-alert mt-3">
              <v-icon class="alert-icon" size="18">mdi-alert-outline</v-icon>
              <div class="alert-content">
                Review sold out or low-stock items before checkout.
              </div>
            </div>

            <!-- Promo Code Section -->
            <div class="promo-box-flat mt-4">
              <div class="d-flex justify-space-between align-center">
                <span class="promo-label">Promo Code</span>
                <button v-if="appliedPromoCode" class="clear-promo-btn" @click="clearPromoCode">Clear</button>
              </div>
              <p class="promo-hint mt-1">Select a code below or type one manually, then click Apply.</p>

              <div class="promo-input-group mt-3">
                <v-text-field
                  v-model="promoInput"
                  class="promo-text-field"
                  density="comfortable"
                  hide-details
                  persistent-placeholder
                  placeholder="Enter code"
                  variant="outlined"
                  @keydown.enter.prevent="applyPromoCode"
                />
                <button
                  class="promo-apply-btn"
                  :disabled="!normalizedPromoInput"
                  @click="applyPromoCode"
                >
                  Apply
                </button>
              </div>

              <!-- Promo Swatches -->
              <div class="promo-swatches mt-3">
                <button
                  v-for="promo in PROMO_CODES"
                  :key="promo.code"
                  class="promo-swatch-btn"
                  :class="{ active: appliedPromoCode === promo.code }"
                  @click="selectPromoCode(promo.code)"
                >
                  {{ promo.code }}
                </button>
              </div>
            </div>

            <!-- Summary Prices -->
            <div class="summary-prices-list mt-4">
              <div class="price-row">
                <span>Subtotal</span>
                <span>{{ formatAmount(selectedTotalAmount) }}</span>
              </div>
              <div v-if="promoDiscount > 0" class="price-row promo-row-text">
                <span>Promo ({{ appliedPromoCode }})</span>
                <span>-{{ formatAmount(promoDiscount) }}</span>
              </div>
              <div class="price-row">
                <span>Shipping</span>
                <span class="free-badge">Free</span>
              </div>
              <div class="price-divider my-3" />
              <div class="price-row total-row">
                <span>Total</span>
                <span class="total-amount">{{ formatAmount(finalTotalAmount) }}</span>
              </div>
            </div>

            <!-- Checkout CTA -->
            <v-btn
              block
              class="action-btn-flat mt-5"
              :disabled="checkoutDisabled"
              :loading="checkoutLoading"
              rounded="0"
              size="large"
              @click="checkout"
            >
              Place Order
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Custom SnackBar/Alert -->
    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="3000"
      :type="snackbarColor"
    />
  </v-container>
</template>

<script>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useCartStore } from '@/stores/cart'
  import { useCurrency } from '@/utils/currency'
  import { safeDisplayImageUrl } from '@/utils/images'

  const PROMO_CODES = [
    {
      code: 'SAVE10',
      type: 'percent',
      value: 10,
      minSubtotal: 60
    },
    {
      code: 'FLAT20',
      type: 'flat',
      value: 20,
      minSubtotal: 120
    },
    {
      code: 'SAVE20',
      type: 'percent',
      value: 20,
      minSubtotal: 180
    }
  ]

  export default {
    name: 'Cart',
    components: {
      BaseAlert
    },
    setup() {
      const router = useRouter()
      const cartStore = useCartStore()
      const checkoutLoading = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const selectedProductIds = ref([])
      const { formatAmount, userSettings } = useCurrency()
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
      const normalizedPromoInput = computed(() => normalizePromoCode(promoInput.value))
      const isPromoPending = computed(() => {
        return Boolean(normalizedPromoInput.value) && normalizedPromoInput.value !== appliedPromoCode.value
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

      const availableCartItems = computed(() => {
        return cartStore.items.filter((item) => !isItemUnavailable(item))
      })

      const selectedStockIssues = computed(() => {
        return cartStore.items.filter((item) => {
          return selectedProductIds.value.includes(item.product_id) && isItemUnavailable(item)
        })
      })

      const checkoutDisabled = computed(() => {
        return selectedProductIds.value.length === 0 || selectedStockIssues.value.length > 0
      })

      const describePromo = (promo) => {
        if (!promo) {
          return ''
        }
        if (promo.type === 'percent') {
          return `${promo.value}% off selected items above ${formatAmount(promo.minSubtotal)}`
        }
        return `${formatAmount(promo.value)} off selected items above ${formatAmount(promo.minSubtotal)}`
      }

      const selectAllChecked = computed({
        get: () => {
          return availableCartItems.value.length > 0 && selectedProductIds.value.length === availableCartItems.value.length
        },
        set: (checked) => {
          if (checked) {
            selectedProductIds.value = availableCartItems.value.map((item) => item.product_id)
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
          return 0
        }

        return Math.max(1, Math.floor(stock))
      }

      const isItemUnavailable = (item) => {
        const stock = getMaxQuantity(item.product_id)
        const quantity = Number(item.quantity || 0)
        return stock <= 0 || quantity > stock
      }

      const getStockMessage = (item) => {
        const stock = getMaxQuantity(item.product_id)
        const quantity = Number(item.quantity || 0)
        if (stock <= 0) return 'Sold out'
        if (quantity > stock) return `Only ${stock} left`
        if (stock <= 5) return `Low stock: ${stock}`
        return `${stock} in stock`
      }

      const getStockStatusColor = (item) => {
        const stock = getMaxQuantity(item.product_id)
        return stock <= 5 ? 'warning' : 'success'
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
      const simplifyProductName = (value) => {
        const normalized = String(value || '').replace(/\s+/g, ' ').trim()
        if (!normalized) {
          return 'Product'
        }

        const withoutSpecs = normalized.replace(/\s*\([^)]*\)\s*$/, '').trim()
        const [primaryName] = withoutSpecs.split(',')
        return primaryName?.trim() || withoutSpecs || normalized
      }
      const cartProductImageUrl = (productId) => safeDisplayImageUrl(cartStore.products[productId]?.image_url)
      const cartProductName = (productId) => simplifyProductName(cartStore.products[productId]?.name)

      const applyPromoCode = () => {
        const normalizedCode = normalizedPromoInput.value
        if (!normalizedCode) {
          snackbarText.value = 'Enter a promo code first'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        if (selectedProductIds.value.length === 0) {
          snackbarText.value = 'Select products before applying promo code'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

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
        const normalizedCode = normalizePromoCode(code)
        promoInput.value = normalizedCode
      }

      const clearPromoCode = () => {
        appliedPromoCode.value = ''
        promoInput.value = ''
      }

      const goToProduct = async (productId) => {
        if (!productId) {
          return
        }
        await router.push(`/product/${productId}`)
      }

      const checkout = async () => {
        if (selectedProductIds.value.length === 0) {
          return
        }

        if (selectedStockIssues.value.length > 0) {
          snackbarText.value = 'Remove sold out or low-stock selections before checkout'
          snackbarColor.value = 'warning'
          snackbar.value = true
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
        () => cartStore.items.map((item) => `${item.product_id}:${item.quantity}:${cartStore.products[item.product_id]?.stock ?? ''}`),
        () => {
          const availableIds = availableCartItems.value.map((item) => item.product_id)
          const productIdSet = new Set(availableIds)
          selectedProductIds.value = selectedProductIds.value.filter((id) => productIdSet.has(id))
          if (userSettings.value.quickCheckout && selectedProductIds.value.length === 0 && availableIds.length > 0) {
            selectedProductIds.value = [...availableIds]
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
        await cartStore.fetchCart({ forceProductRefresh: true })
        selectedProductIds.value = userSettings.value.quickCheckout
          ? availableCartItems.value.map((item) => item.product_id)
          : []
      })

      return {
        cartStore,
        removeItem,
        goToProduct,
        checkout,
        checkoutLoading,
        changeQuantity,
        checkoutDisabled,
        getMaxQuantity,
        getStockMessage,
        getStockStatusColor,
        isItemUnavailable,
        isQuantityUpdating,
        cartProductImageUrl,
        cartProductName,
        applyPromoCode,
        selectPromoCode,
        clearPromoCode,
        PROMO_CODES,
        promoInput,
        normalizedPromoInput,
        isPromoPending,
        appliedPromoCode,
        promoDiscount,
        finalTotalAmount,
        selectedProductIds,
        selectedStockIssues,
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
/* ════════════════════════════════ PAGE ROOT ═══ */
.bespoke-cart-container {
  min-height: 100vh;
  background: #f8fafc;
  padding: 40px max(16px, 4vw) 80px !important;
}

/* ════════════════════════════════ HEADER BAR ══ */
.cart-header-bar {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #cbd5e1;
}

.back-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: color 0.2s ease;
}
.back-btn:hover {
  color: #0d9488;
}
.underline-hover {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transition: transform 0.25s ease;
  transform-origin: right;
  transform: scaleX(0);
}
.back-btn:hover .underline-hover {
  transform: scaleX(1);
  transform-origin: left;
}

/* ════════════════════════════════ EMPTY STATE ═ */
.cart-empty-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.empty-cart-frame {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 6px 6px 0px #0f172a;
}

.empty-cart-body {
  padding: 48px 32px;
}

.brand-tagline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}
.tag-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #0f766e;
}
.tag-dot {
  font-size: 10px;
  color: #cbd5e1;
}

.empty-cart-title {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
}
.highlight-serif {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}

.empty-cart-subtitle {
  font-size: 14px;
  color: #64748b;
  max-width: 380px;
  margin: 8px auto 0;
}

/* ════════════════════════════════ ACTIVE GRID ═ */
.cart-active-grid {
  align-items: start;
}

.cart-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 12px;
  margin-bottom: 24px;
}

.section-title {
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 800;
  color: #0f172a;
}

.cart-badge {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f766e;
  border: 1px solid #cbd5e1;
  padding: 4px 10px;
  background: #ffffff;
}

/* ════════════════════════════════ ITEM CARDS ══ */
.cart-items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flat-cart-item-card {
  display: flex;
  gap: 24px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.flat-cart-item-card:hover {
  border-color: #0f172a;
  box-shadow: 4px 4px 0px #0f172a;
}

.cart-item-image-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  overflow: hidden;
}

.cart-item-image-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cart-item-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-item-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 0;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
}
.remove-item-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

.cart-item-details {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cart-item-checkbox {
  margin: 0 !important;
}

.product-name-link {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.product-name-link:hover {
  color: #0d9488;
}

.product-price-display {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.cart-item-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

/* Stock Status Tags */
.stock-status-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border: 1px solid currentColor;
}
.status-success {
  color: #0f766e;
  background: #f0fdfa;
}
.status-warning {
  color: #d97706;
  background: #fffbeb;
}
.status-error {
  color: #dc2626;
  background: #fef2f2;
}

/* Quantity Picker Group */
.quantity-control-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  background: #ffffff;
}

.qty-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #0f172a;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.qty-btn:hover:not(:disabled) {
  background: #f1f5f9;
}
.qty-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.qty-display {
  font-size: 12px;
  font-weight: 700;
  padding: 0 12px;
  border-left: 1px solid #cbd5e1;
  border-right: 1px solid #cbd5e1;
  height: 32px;
  display: flex;
  align-items: center;
  color: #0f172a;
}

.max-qty-caption {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

/* ════════════════════════════════ ORDER SUMMARY ══ */
.summary-frame {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 6px 6px 0px #0f172a;
  position: sticky;
  top: 88px;
}

.frame-header {
  height: 36px;
  background: #f8fafc;
  border-bottom: 1px solid #0f172a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  position: relative;
}
.frame-dots {
  display: flex;
  gap: 6px;
}
.frame-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #0f172a;
  display: inline-block;
}
.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }

.frame-title-display {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.summary-card-body {
  padding: 24px;
}

.summary-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.summary-selection-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #64748b;
}

.select-all-row {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.summary-checkbox :deep(.v-label) {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #0f172a !important;
}

/* Custom Alert */
.custom-flat-alert {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid currentColor;
}
.warning-alert {
  color: #d97706;
  background: #fffbeb;
}
.alert-icon {
  flex-shrink: 0;
}
.alert-content {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

/* Promo Code Box */
.promo-box-flat {
  border: 1px solid #cbd5e1;
  padding: 16px;
  background: #f8fafc;
}

.promo-label {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clear-promo-btn {
  font-size: 11px;
  font-weight: 700;
  color: #dc2626;
  background: transparent;
  border: none;
  cursor: pointer;
}

.promo-hint {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.promo-input-group {
  display: flex;
  gap: 8px;
}

.promo-text-field :deep(.v-field) {
  border-radius: 0 !important;
  border-color: #cbd5e1 !important;
}
.promo-text-field :deep(.v-field--focused) {
  border-color: #0f172a !important;
}

.promo-apply-btn {
  background: #0f172a;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #0f172a;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.promo-apply-btn:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}
.promo-apply-btn:disabled {
  background: #cbd5e1;
  border-color: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
}

.promo-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.promo-swatch-btn {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.promo-swatch-btn:hover {
  border-color: #0f172a;
  background: #f8fafc;
}
.promo-swatch-btn.active {
  background: #0d9488;
  color: #ffffff;
  border-color: #0d9488;
}

/* Summary Pricing Display */
.summary-prices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.promo-row-text {
  color: #16a34a;
  font-weight: 600;
}

.free-badge {
  color: #16a34a;
  font-weight: 700;
}

.price-divider {
  height: 1px;
  background: #e2e8f0;
}

.total-row {
  font-size: 16px;
  color: #0f172a;
  font-weight: 800;
}
.total-amount {
  font-size: 20px;
  color: #0f172a;
}

/* Action button flat */
.action-btn-flat {
  height: 50px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  background: #0f172a !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  border-radius: 0 !important;
  transition: background-color 0.2s ease !important;
}
.action-btn-flat:hover:not(:disabled) {
  background: #1e293b !important;
}

/* Deep inputs override for checkbox and general fields */
:deep(.v-checkbox .v-selection-control) {
  min-height: auto !important;
}
:deep(.v-field) {
  border-radius: 0 !important;
}

/* ════════════════════════════════ RESPONSIVE ═════ */
@media (max-width: 959px) {
  .bespoke-cart-container {
    padding: 24px 16px 60px !important;
  }
  .flat-cart-item-card {
    flex-direction: column;
    gap: 16px;
  }
  .product-name-link {
    white-space: normal;
  }
  .cart-item-image-wrapper {
    width: 100%;
    height: 180px;
  }
  .cart-item-img {
    max-height: 160px;
  }
  .summary-frame {
    position: static;
    margin-top: 32px;
  }
}
</style>
