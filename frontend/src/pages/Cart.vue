<template>
  <v-container fluid>
    <v-row v-if="cartStore.items.length === 0" justify="center">
      <v-col cols="12" md="8">
        <v-card class="pa-8 text-center" rounded="lg" variant="outlined">
          <v-icon color="primary" size="58">mdi-cart-outline</v-icon>
          <p class="text-h5 font-weight-bold mt-4">Your cart is currently empty</p>
          <p class="text-body-2 text-medium-emphasis mt-2">Explore our latest collection and add products you love.</p>
          <div class="mt-5">
            <v-btn color="primary" rounded="lg" size="large" @click="$router.push('/')">
              Continue Shopping
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12" md="8">
        <v-sheet class="d-flex align-center justify-space-between mb-4 ga-2 rounded-lg border pa-3">
          <p class="text-h6 font-weight-bold">Products in cart</p>
          <v-chip size="small" variant="outlined">{{ cartStore.items.length }} items</v-chip>
        </v-sheet>

        <v-row dense>
          <v-col v-for="item in cartStore.items" :key="item.product_id" cols="12" sm="6" lg="4">
            <v-card class="h-100 d-flex flex-column pa-2 border" rounded="lg" variant="flat">
              <v-sheet class="position-relative d-flex align-center justify-center rounded-lg overflow-hidden"
                color="grey-lighten-4" height="220" role="button" tabindex="0" @click="goToProduct(item.product_id)"
                @keyup.enter="goToProduct(item.product_id)">
                <v-img v-if="cartProductImageUrl(item.product_id)" :alt="cartProductName(item.product_id)" height="196"
                  max-width="100%" :src="cartProductImageUrl(item.product_id)" width="100%" />
                <v-icon v-else color="primary" size="48">mdi-image-off-outline</v-icon>

                <v-btn aria-label="Remove item" class="position-absolute top-0 right-0 ma-2" density="comfortable"
                  icon="mdi-close" size="small" variant="flat" @click.stop="removeItem(item.product_id)" />
              </v-sheet>

              <v-card-text class="d-flex flex-column flex-grow-1 pa-3">
                <div class="d-flex align-start ga-2">
                  <v-checkbox v-model="selectedProductIds" class="flex-shrink-0 mt-n1" color="primary" density="compact"
                    :disabled="isItemUnavailable(item)" hide-details :value="item.product_id" />

                  <div class="overflow-hidden w-100">
                    <p class="text-subtitle-1 font-weight-medium text-break" role="button" tabindex="0"
                      @click="goToProduct(item.product_id)" @keyup.enter="goToProduct(item.product_id)">
                      {{ cartProductName(item.product_id) }}
                    </p>
                    <p class="text-h6 font-weight-bold mt-2">
                      {{ formatAmount(cartStore.products[item.product_id]?.price) }}
                    </p>
                  </div>
                </div>

                <v-chip class="mt-2 align-self-start"
                  :color="isItemUnavailable(item) ? 'error' : getStockStatusColor(item)" size="small" variant="tonal">
                  {{ getStockMessage(item) }}
                </v-chip>

                <div class="d-flex align-center flex-wrap ga-2 mt-3">
                  <v-btn
                    :disabled="item.quantity <= 1 || isItemUnavailable(item) || isQuantityUpdating(item.product_id)"
                    density="comfortable" icon="mdi-minus" size="small" variant="outlined"
                    @click="changeQuantity(item, -1)" />
                  <v-chip class="px-5" variant="outlined">Qty {{ item.quantity }}</v-chip>
                  <v-btn
                    :disabled="isItemUnavailable(item) || item.quantity >= getMaxQuantity(item.product_id) || isQuantityUpdating(item.product_id)"
                    density="comfortable" icon="mdi-plus" size="small" variant="outlined"
                    @click="changeQuantity(item, 1)" />
                </div>

                <p class="text-caption text-medium-emphasis mt-2">
                  {{ getMaxQuantity(item.product_id) > 0 ? `Max ${getMaxQuantity(item.product_id)}` : 'Not available' }}
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12" md="4">
        <v-card rounded="lg" variant="flat" class="border">
          <v-card-title>Order Summary</v-card-title>
          <v-card-subtitle>
            <div class="d-flex justify-space-between mb-2">
              <span>Selected Items</span>
              <span>{{ selectedProductIds.length }} / {{ cartStore.items.length }}</span>
            </div>
          </v-card-subtitle>
          <v-divider />
          <v-card-text>
            <v-checkbox v-model="selectAllChecked" color="primary" density="compact" hide-details
              label="Select available products" />

            <v-alert v-if="selectedStockIssues.length > 0" class="my-3" density="compact" type="warning"
              variant="tonal">
              Review sold out or low-stock items before checkout.
            </v-alert>

            <v-sheet class="pa-3 my-3" border rounded="lg">
              <div class="d-flex justify-space-between align-center ga-2">
                <p class="text-body-2 font-weight-medium">Promo Code</p>
                <v-btn v-if="appliedPromoCode" size="x-small" variant="text" @click="clearPromoCode">Clear</v-btn>
              </div>
              <p class="text-caption text-medium-emphasis mt-1">Select a code below or type one manually, then click
                Apply.</p>

              <div class="d-flex flex-wrap ga-2 mt-3">
                <v-text-field v-model="promoInput" class="flex-grow-1" density="comfortable" hide-details
                  persistent-placeholder placeholder="Enter code" rounded="lg" variant="outlined"
                  @keydown.enter.prevent="applyPromoCode" />
                <v-btn color="teal-darken-1" size="large" :disabled="!normalizedPromoInput" text="Apply" rounded="lg"
                  @click="applyPromoCode" />
              </div>

              <div class="d-flex flex-wrap ga-2 mt-3">
                <v-chip v-for="promo in PROMO_CODES" :key="promo.code"
                  :color="appliedPromoCode === promo.code ? 'primary' : undefined" size="small"
                  :variant="appliedPromoCode === promo.code ? 'flat' : 'outlined'" @click="selectPromoCode(promo.code)">
                  {{ promo.code }}
                </v-chip>
              </div>
            </v-sheet>

            <div class="d-flex justify-space-between mb-2">
              <span>Subtotal</span>
              <span>{{ formatAmount(selectedTotalAmount) }}</span>
            </div>
            <div v-if="promoDiscount > 0" class="d-flex justify-space-between mb-2 text-success">
              <span>Promo ({{ appliedPromoCode }})</span>
              <span>-{{ formatAmount(promoDiscount) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <v-divider class="my-3" />
            <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold">
              <span>Total</span>
              <span>{{ formatAmount(finalTotalAmount) }}</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn block color="teal-darken-1" :disabled="checkoutDisabled" :loading="checkoutLoading" rounded="lg"
              size="large" text="Place Order" variant="flat" @click="checkout" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <BaseAlert v-model="snackbar" floating :message="snackbarText" :timeout="3000" :type="snackbarColor" />
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
