<template>
  <v-container class="site-container bespoke-payment-container" fluid>
    <!-- Secure Checkout Header -->
    <div class="payment-header-bar">
      <div>
        <div class="brand-tagline">
          <span class="tag-label">DEMO CHECKOUT</span>
          <span class="tag-dot">•</span>
          <span class="tag-label">ORDER REVIEW</span>
        </div>
        <h1 class="page-title">Demo <span class="highlight-serif">Checkout</span></h1>
        <p class="page-subtitle">Review sample billing details and confirm a portfolio-demo order.</p>
      </div>
    </div>

    <div class="custom-flat-alert info-alert mb-6">
      <v-icon class="alert-icon" size="18">mdi-information-outline</v-icon>
      <div class="alert-content">
        Use test details only. This page does not process a real payment, purchase, or delivery.
      </div>
    </div>

    <!-- Active State -->
    <v-row v-if="selectedItems.length > 0" class="payment-active-grid">
      <!-- Billing Address & Payment Method Forms -->
      <v-col cols="12" md="8">
        <!-- Billing Details Flat Card -->
        <div class="flat-card-container">
          <div class="panel-head">
            <h2 class="panel-title">Sample Contact & Billing</h2>
          </div>
          <div class="panel-body mt-4">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.firstName"
                  class="flat-text-field"
                  density="comfortable"
                  label="First Name"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.lastName"
                  class="flat-text-field"
                  density="comfortable"
                  label="Last Name"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.email"
                  class="flat-text-field"
                  density="comfortable"
                  label="Email"
                  type="email"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.phone"
                  class="flat-text-field"
                  density="comfortable"
                  label="Phone Number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.address"
                  class="flat-text-field"
                  density="comfortable"
                  label="Street Address"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.city"
                  class="flat-text-field"
                  density="comfortable"
                  label="City"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model="form.state"
                  class="flat-text-field"
                  density="comfortable"
                  label="State"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model="form.zip"
                  class="flat-text-field"
                  density="comfortable"
                  label="ZIP"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- Payment Method Flat Card -->
        <div class="flat-card-container mt-6">
          <div class="panel-head">
            <h2 class="panel-title">Demo Payment Method</h2>
          </div>
          <div class="panel-body mt-4">
            <div class="tabs-header-flat mb-5">
              <v-tabs
                v-model="tab"
                align-tabs="start"
                class="custom-editorial-tabs"
                color="teal-darken-1"
                density="comfortable"
                grow
                mandatory
              >
                <v-tab value="upi">
                  <v-icon size="18" start>mdi-cellphone-nfc</v-icon>
                  UPI ID
                </v-tab>
                <v-tab value="card">
                  <v-icon size="18" start>mdi-credit-card-outline</v-icon>
                  Credit / Debit Card
                </v-tab>
                <v-tab v-if="isCodEnabled" value="cod">
                  <v-icon size="18" start>mdi-cash</v-icon>
                  Cash on Delivery
                </v-tab>
              </v-tabs>
            </div>

            <v-tabs-window v-model="tab">
              <v-tabs-window-item value="upi">
                <div class="custom-flat-alert info-alert mb-4">
                  <v-icon class="alert-icon" size="18">mdi-information-outline</v-icon>
                  <div class="alert-content">
                    Demo only. Enter a test UPI ID such as demo@okaxis. Do not enter a real payment identifier.
                  </div>
                </div>
                <v-row dense>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.upiId"
                      class="flat-text-field"
                      density="comfortable"
                      hint="Example: name@okaxis"
                      label="UPI ID"
                      persistent-hint
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-tabs-window-item>

              <v-tabs-window-item value="card">
                <div class="custom-flat-alert info-alert mb-4">
                  <v-icon class="alert-icon" size="18">mdi-information-outline</v-icon>
                  <div class="alert-content">
                    Demo only. Use test card details and never enter a real card number or CVV.
                  </div>
                </div>
                <!-- High-contrast Credit Card Mockup -->
                <div class="editorial-card-preview mb-6">
                  <div class="card-inner-frame">
                    <div class="card-header-row">
                      <span class="card-brand-label">MINDSTORES CARD</span>
                      <div class="card-chip-icon" />
                    </div>
                    <div class="card-number-display mt-6">{{ maskedCardNumber }}</div>
                    <div class="card-footer-row mt-4">
                      <div class="card-holder-info">
                        <span class="card-label-tiny">CARD HOLDER</span>
                        <span class="card-value-small">{{ form.cardHolder || 'CARD HOLDER' }}</span>
                      </div>
                      <div class="card-expiry-info text-right">
                        <span class="card-label-tiny">EXPIRY</span>
                        <span class="card-value-small">{{ form.expiry || 'MM/YY' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <v-row dense>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.cardHolder"
                      class="flat-text-field"
                      density="comfortable"
                      label="Card Holder Name"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.cardNumber"
                      class="flat-text-field"
                      density="comfortable"
                      label="Card Number"
                      maxlength="19"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6" sm="6">
                    <v-text-field
                      v-model="form.expiry"
                      class="flat-text-field"
                      density="comfortable"
                      label="Expiry (MM/YY)"
                      maxlength="5"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6" sm="6">
                    <v-text-field
                      v-model="form.cvv"
                      class="flat-text-field"
                      density="comfortable"
                      label="CVV"
                      maxlength="4"
                      type="password"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-tabs-window-item>

              <v-tabs-window-item value="cod">
                <div class="custom-flat-alert info-alert mb-4">
                  <v-icon class="alert-icon" size="18">mdi-information-outline</v-icon>
                  <div class="alert-content">
                    Demo only. This option records a sample cash-on-delivery selection.
                  </div>
                </div>
              </v-tabs-window-item>
            </v-tabs-window>
          </div>
        </div>
      </v-col>

      <!-- Order Summary Card -->
      <v-col cols="12" md="4">
        <div class="gallery-frame summary-frame">
          <div class="summary-card-body">
            <h2 class="summary-title">Order <span class="highlight-serif">Summary</span></h2>

            <div class="summary-items-list mt-4">
              <div
                v-for="item in selectedItems"
                :key="item.product_id"
                class="flat-summary-item"
              >
                <div class="d-flex justify-space-between align-start ga-2">
                  <div class="min-width-0">
                    <h4 class="summary-item-name">{{ item.name }}</h4>
                    <p class="summary-item-qty">
                      Qty {{ item.quantity }} •
                      <span :class="item.stock > 0 ? 'text-success-dark' : 'text-error-dark'">
                        {{ item.stock > 0 ? 'Available' : 'Sold out' }}
                      </span>
                    </p>
                  </div>
                  <strong class="summary-item-price">{{ formatAmount(item.price * item.quantity) }}</strong>
                </div>
              </div>
            </div>

            <!-- Stock Warning Alert -->
            <div v-if="selectedStockIssues.length > 0" class="custom-flat-alert warning-alert mt-4">
              <v-icon class="alert-icon" size="18">mdi-alert-outline</v-icon>
              <div class="alert-content">
                {{ selectedStockIssues.length }} selected item needs stock review.
              </div>
            </div>

            <div class="price-summary-divider my-4" />

            <!-- Summary Prices List -->
            <div class="summary-prices-list">
              <div class="price-row">
                <span>Subtotal</span>
                <span>{{ formatAmount(totalAmount) }}</span>
              </div>
              <div v-if="promoDiscount > 0" class="price-row promo-row-text">
                <span>Promo ({{ selectedPromoCode }})</span>
                <span>-{{ formatAmount(promoDiscount) }}</span>
              </div>
              <div class="price-row">
                <span>Demo Shipping</span>
                <span class="free-badge">Sample: Free</span>
              </div>
              <div class="price-divider-thick my-3" />
              <div class="price-row total-row">
                <span>Total</span>
                <span class="total-amount">{{ formatAmount(payableAmount) }}</span>
              </div>
            </div>

            <!-- CTA Flat Buttons -->
            <v-btn
              block
              class="btn-store-primary mt-5"
              :disabled="selectedStockIssues.length > 0"
              elevation="0"
              :loading="submitting"
              rounded="0"
              @click="submitPayment"
            >
              Confirm Demo Order {{ formatAmount(payableAmount) }}
            </v-btn>

            <v-btn
              block
              class="btn-store-outline mt-3"
              elevation="0"
              rounded="0"
              @click="cancelPayment"
            >
              Cancel Checkout
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else>
      <v-col class="d-flex justify-center" cols="12">
        <div class="gallery-frame empty-payment-frame">
          <div class="empty-payment-body text-center pa-8">
            <v-icon color="teal-darken-1" size="48">mdi-cart-off-outline</v-icon>
            <h2 class="empty-title mt-4">No Selected Items</h2>
            <p class="empty-subtitle mt-2">Go back to your cart and select products before checkout review.</p>
            <div class="mt-6">
              <v-btn
                class="btn-store-primary"
                elevation="0"
                rounded="0"
                to="/cart"
              >
                Back to Cart
              </v-btn>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Base SnackBar Notification -->
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
  import axios from 'axios'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { API_URL, buildAuthenticatedRequestConfig } from '@/utils/api'
  import { useCurrency } from '@/utils/currency'
  import { clearProductsCache } from '@/utils/productCache'
  import { loadUserSettings } from '@/utils/userSettings'

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
    name: 'Payment',
    components: {
      BaseAlert
    },
    setup() {
      const route = useRoute()
      const router = useRouter()
      const appStore = useAppStore()
      const cartStore = useCartStore()
      const submitting = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const { formatAmount } = useCurrency()
      const selectedProductIds = ref([])
      const selectedPromoCode = ref('')
      const tab = ref('upi')
      const isCodEnabled = ref(true)

      const form = ref({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        cardHolder: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
        upiId: '',
      })

      const selectedItems = computed(() => {
        return cartStore.items
          .filter((item) => selectedProductIds.value.includes(item.product_id))
          .map((item) => {
            const product = cartStore.products[item.product_id] || {}
            return {
              product_id: item.product_id,
              quantity: item.quantity,
              name: product.name || 'Product',
              price: Number(product.price || 0),
              stock: Number(product.stock || 0),
            }
          })
      })

      const selectedStockIssues = computed(() => {
        return selectedItems.value.filter((item) => item.stock <= 0 || item.quantity > item.stock)
      })

      const totalAmount = computed(() => selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

      const activePromo = computed(() => {
        return PROMO_CODES.find((promo) => promo.code === selectedPromoCode.value) || null
      })

      const promoDiscount = computed(() => {
        const promo = activePromo.value
        if (!promo || totalAmount.value < promo.minSubtotal) {
          return 0
        }

        if (promo.type === 'percent') {
          return Number(((totalAmount.value * promo.value) / 100).toFixed(2))
        }

        return Math.min(totalAmount.value, promo.value)
      })

      const payableAmount = computed(() => {
        return Math.max(0, totalAmount.value - promoDiscount.value)
      })

      const maskedCardNumber = computed(() => {
        const digits = String(form.value.cardNumber || '').replace(/\D/g, '')
        const padded = digits.padEnd(16, '*').slice(0, 16)
        return padded.match(/.{1,4}/g)?.join(' ') || '**** **** **** ****'
      })

      const parseSelectedProductIds = () => {
        const rawIds = String(route.query.selected || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
        selectedProductIds.value = [...new Set(rawIds)]

        const rawPromo = String(route.query.promo || '').trim().toUpperCase()
        selectedPromoCode.value = PROMO_CODES.some((promo) => promo.code === rawPromo) ? rawPromo : ''
      }

      const splitName = (name) => {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
        if (parts.length <= 1) {
          return { firstName: parts[0] || '', lastName: '' }
        }

        return {
          firstName: parts[0],
          lastName: parts.slice(1).join(' ')
        }
      }

      const prefillFormFromProfile = () => {
        const settings = loadUserSettings()
        isCodEnabled.value = settings.cashOnDeliveryEnabled ?? true
        
        const userDelivery = appStore.user?.delivery_profile || {}
        const saveDeliveryDetails = appStore.user?.save_delivery_details === undefined
          ? settings.saveDeliveryDetails
          : appStore.user.save_delivery_details

        const phone = userDelivery.phone || settings.deliveryProfile?.phone || ''
        const address = userDelivery.address || settings.deliveryProfile?.address || ''
        const city = userDelivery.city || settings.deliveryProfile?.city || ''
        const state = userDelivery.state || settings.deliveryProfile?.state || ''
        const zip = userDelivery.postal_code || userDelivery.postalCode || settings.deliveryProfile?.postalCode || ''

        const { firstName, lastName } = splitName(appStore.user?.name || settings.displayName)

        form.value = {
          ...form.value,
          firstName: form.value.firstName || firstName,
          lastName: form.value.lastName || lastName,
          email: form.value.email || appStore.user?.email || '',
          phone: form.value.phone || (saveDeliveryDetails ? phone : ''),
          address: form.value.address || (saveDeliveryDetails ? address : ''),
          city: form.value.city || (saveDeliveryDetails ? city : ''),
          state: form.value.state || (saveDeliveryDetails ? state : ''),
          zip: form.value.zip || (saveDeliveryDetails ? zip : '')
        }
      }

      const validateForm = () => {
        const userDelivery = appStore.user?.delivery_profile || {}
        if (!userDelivery.address || !userDelivery.city || !userDelivery.state) {
          return 'Please add your delivery location in your profile first'
        }

        if (!form.value.firstName || !form.value.lastName) {
          return 'Enter your full name'
        }
        if (!form.value.email || !form.value.address || !form.value.city || !form.value.state || !form.value.zip) {
          return 'Fill all billing address fields'
        }
        if (tab.value === 'upi') {
          const upiPattern = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/
          if (!upiPattern.test(String(form.value.upiId || '').trim())) {
            return 'Enter a valid UPI ID'
          }
        } else if (tab.value === 'card') {
          const cardDigits = String(form.value.cardNumber || '').replace(/\D/g, '')
          if (cardDigits.length < 13) {
            return 'Enter a valid card number'
          }
          if (!form.value.expiry || !form.value.cvv) {
            return 'Enter card expiry and CVV'
          }
        }
        if (selectedProductIds.value.length === 0) {
          return 'No products selected for payment'
        }
        if (selectedStockIssues.value.length > 0) {
          return 'Some selected products are sold out or below the requested quantity'
        }
        return ''
      }

      const submitPayment = async () => {
        await cartStore.fetchCart({ forceProductRefresh: true })
        const validationError = validateForm()
        if (validationError) {
          snackbarText.value = validationError
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        submitting.value = true
        try {
          const response = await axios.post(
            `${API_URL}/checkout/place-order`,
            {
              selected_product_ids: selectedProductIds.value,
              promo_code: selectedPromoCode.value && promoDiscount.value > 0 ? selectedPromoCode.value : undefined,
              billing_profile: {
                name: `${form.value.firstName} ${form.value.lastName}`.trim(),
                email: form.value.email,
                phone: form.value.phone,
                address: form.value.address,
                city: form.value.city,
                state: form.value.state,
                postal_code: form.value.zip
              },
              payment_method: tab.value
            },
            await buildAuthenticatedRequestConfig()
          )

          if (response.data?.success) {
            cartStore.invalidateProducts(selectedProductIds.value)
            clearProductsCache()
            await cartStore.fetchCart({ forceProductRefresh: true })
            router.push(`/order-success?order_id=${response.data.order_id}`)
            return
          }

          throw new Error('Demo order confirmation failed')
        } catch (error) {
          console.error('Demo order confirmation failed:', error)
          snackbarText.value = error.response?.data?.message || 'Demo order confirmation failed. Please try again.'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          submitting.value = false
        }
      }

      const cancelPayment = () => {
        router.push('/cart')
      }

      onMounted(async () => {
        await Promise.allSettled([cartStore.fetchCart({ forceProductRefresh: true }), appStore.refreshCurrentUser()])
        prefillFormFromProfile()
        parseSelectedProductIds()
      })

      return {
        form,
        tab,
        isCodEnabled,
        submitting,
        selectedItems,
        totalAmount,
        selectedPromoCode,
        selectedStockIssues,
        promoDiscount,
        payableAmount,
        maskedCardNumber,
        formatAmount,
        submitPayment,
        cancelPayment,
        snackbar,
        snackbarText,
        snackbarColor,
      }
    }
  }
</script>

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.bespoke-payment-container {
  min-height: 100vh;
  background: #f8fafc;
  padding-top: 40px !important;
  padding-bottom: 80px !important;
}

/* ════════════════════════════════ HEADER BAR ══ */
.payment-header-bar {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #cbd5e1;
}

.brand-tagline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
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

.page-title {
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 800;
  color: #0f172a;
}
.highlight-serif {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

/* ════════════════════════════════ ACTIVE GRID ═ */
.payment-active-grid {
  align-items: start;
}

/* ════════════════════════════════ FLAT CARD ═══ */
.flat-card-container {
  background: #ffffff;
  border: 1px solid #0f172a;

  padding: 24px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.panel-head {
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 12px;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

/* ════════════════════════════════ FORM OVERRIDES ═ */
:deep(.flat-text-field .v-field) {
  border-radius: 0 !important;
  border: 1px solid #0f172a !important;
  background-color: #ffffff !important;

  transition: border-color 0.2s ease;
}

:deep(.flat-text-field .v-field--focused) {
  border-color: #0d9488 !important;
}

:deep(.flat-text-field .v-field__outline) {
  display: none !important;
}

:deep(.flat-text-field .v-label) {
  color: #64748b !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

:deep(.flat-text-field input) {
  color: #0f172a !important;
  font-weight: 500 !important;
}

/* ════════════════════════════════ PRINT TABS ══ */
.tabs-header-flat {
  border-bottom: 1px solid #0f172a;
}

.custom-editorial-tabs {
  background: transparent !important;
}

:deep(.custom-editorial-tabs .v-btn) {
  border-radius: 0 !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  font-size: 13px !important;
  color: #64748b !important;
  border: 1px solid transparent;
  border-bottom: none;
  margin-right: 4px;
}

:deep(.custom-editorial-tabs .v-tab--selected) {
  color: #0f172a !important;
  background: #ffffff !important;
  border-color: #0f172a #0f172a transparent #0f172a !important;
}

:deep(.custom-editorial-tabs .v-tabs-slider) {
  display: none !important;
}

/* ════════════════════════════════ CREDIT CARD PREVIEW ═ */
.editorial-card-preview {
  background: #0f172a;
  color: #ffffff;
  border: 1px solid #0f172a;
  padding: 24px;
  position: relative;
  overflow: hidden;

}

.card-inner-frame {
  display: flex;
  flex-direction: column;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-brand-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #0d9488;
}

.card-chip-icon {
  width: 36px;
  height: 26px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  position: relative;
}

.card-chip-icon::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 6px;
  width: 24px;
  height: 18px;
  border-right: 1px solid #94a3b8;
  border-bottom: 1px solid #94a3b8;
}

.card-number-display {
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(13px, 4.2vw, 19px);
  font-weight: 700;
  letter-spacing: clamp(0.04em, 1.2vw, 0.1em);
  color: #f1f5f9;
  word-spacing: clamp(0.04em, 1.2vw, 0.1em);
  white-space: nowrap;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.card-label-tiny {
  display: block;
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.1em;
  margin-bottom: 2px;
}

.card-value-small {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;
}

/* ════════════════════════════════ macOS FRAME ══ */
.gallery-frame {
  background: #ffffff;
  border: 1px solid #0f172a;

  display: flex;
  flex-direction: column;
}

.summary-card-body {
  padding: 24px;
}

.summary-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 12px;
}

/* ════════════════════════════════ SUMMARY ITEMS ═ */
.summary-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flat-summary-item {
  border-bottom: 1px dashed #cbd5e1;
  padding-bottom: 12px;
}
.flat-summary-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summary-item-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.summary-item-qty {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-top: 2px;
}

.text-success-dark {
  color: #0f766e;
  font-weight: 700;
}

.text-error-dark {
  color: #b91c1c;
  font-weight: 700;
}

.summary-item-price {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.price-summary-divider {
  border-top: 1px solid #0f172a;
}

/* ════════════════════════════════ SUMMARY PRICES ═ */
.summary-prices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #475569;
  font-weight: 600;
}

.promo-row-text {
  color: #0f766e;
}

.free-badge {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #0f766e;
  border: 1px solid #0f766e;
  padding: 1px 6px;
  background: #f0fdf4;
}

.price-divider-thick {
  border-top: 2px solid #0f172a;
}

.total-row {
  font-size: 18px;
  color: #0f172a;
  font-weight: 800;
}

.total-amount {
  font-size: 20px;
  color: #0f766e;
  text-decoration: underline;
  text-decoration-style: double;
}

/* ════════════════════════════════ FLAT BUTTONS ══ */
.action-btn-flat {
  background: #0f172a !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  font-size: 14px !important;
  letter-spacing: 0.05em !important;
  border: 1px solid #0f172a !important;
  transition: all 0.2s ease !important;
}

.action-btn-flat:hover {
  background: #0d9488 !important;
  border-color: #0d9488 !important;
}

.action-btn-flat-outline {
  background: transparent !important;
  color: #ef4444 !important;
  font-weight: 800 !important;
  font-size: 14px !important;
  letter-spacing: 0.05em !important;
  border: 1px solid #ef4444 !important;
  transition: all 0.2s ease !important;
}

.action-btn-flat-outline:hover {
  background: #fef2f2 !important;
}

/* ════════════════════════════════ EMPTY STATE ═ */
.empty-payment-frame {
  width: 100%;
  max-width: 520px;
  margin-top: 40px;
}

.empty-title {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

.empty-subtitle {
  font-size: 14px;
  color: #64748b;
  max-width: 360px;
  margin: 8px auto 0;
}

/* ════════════════════════════════ ALERTS ══════ */
.custom-flat-alert {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  font-weight: 600;
  align-items: center;
}

.info-alert {
  background: #f0fdfa;
  border-color: #0d9488;
  color: #0f766e;
}
.info-alert .alert-icon {
  color: #0d9488;
}

.warning-alert {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #b45309;
}
.warning-alert .alert-icon {
  color: #f59e0b;
}

.alert-content {
  flex-grow: 1;
}

/* ════════════════════════════════ RESPONSIVE ═════ */
@media (max-width: 959px) {
  .bespoke-payment-container {
    padding: 24px 16px 60px !important;
  }

  .gallery-frame {
    margin-top: 24px;
  }
}

@media (max-width: 599px) {
  .credit-card-mock {
    padding: 16px;
    border-radius: 0;
  }

  .card-chip-icon {
    width: 30px;
    height: 22px;
  }

  .summary-card-body {
    padding: 16px;
  }

  .page-title {
    font-size: clamp(1.8rem, 6vw, 2.4rem);
  }

  .total-row {
    font-size: 16px;
  }

  .total-amount {
    font-size: 18px;
  }
}
</style>
