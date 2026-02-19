<template>
  <div class="payment-page">
    <v-container class="payment-shell">
      <section class="payment-hero">
        <p class="payment-kicker">Secure Checkout</p>
        <h1 class="payment-title">Personal Payment</h1>
        <p class="payment-subtitle">Finalize your order with encrypted payment and curated delivery details.</p>
      </section>

      <v-row v-if="selectedItems.length > 0" class="payment-row">
        <v-col cols="12" md="8">
          <v-card class="payment-card" variant="flat">
            <v-card-title class="section-title">Contact & Billing</v-card-title>
            <v-card-text class="section-body">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.firstName" label="First Name" variant="outlined" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.lastName" label="Last Name" variant="outlined" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.phone" label="Phone Number" variant="outlined" />
                </v-col>
                <v-col cols="12">
                  <v-text-field v-model="form.address" label="Street Address" variant="outlined" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.city" label="City" variant="outlined" />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-text-field v-model="form.state" label="State" variant="outlined" />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-text-field v-model="form.zip" label="ZIP" variant="outlined" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card class="payment-card mt-4" variant="flat">
            <v-card-title class="section-title">Payment Method</v-card-title>
            <v-card-text class="section-body">
              <div class="payment-mode-switch">
                <v-btn-toggle
                  v-model="paymentMode"
                  class="mode-toggle"
                  color="primary"
                  density="comfortable"
                  divided
                  mandatory
                >
                  <v-btn value="upi">UPI ID</v-btn>
                  <v-btn value="card">Card</v-btn>
                </v-btn-toggle>
              </div>

              <div v-if="paymentMode === 'upi'" class="upi-panel">
                <div class="upi-visual">
                  <p class="upi-badge">Instant UPI</p>
                  <h3>Pay by UPI ID</h3>
                  <p>Use any UPI app linked to your bank account.</p>
                </div>

                <v-row class="mt-1">
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.upiId"
                      hint="Example: name@okaxis"
                      label="UPI ID"
                      persistent-hint
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </div>

              <div v-else>
                <div class="card-visual">
                  <p class="card-label">Mindstore Black</p>
                  <p class="card-number">{{ maskedCardNumber }}</p>
                  <div class="card-meta">
                    <span>{{ form.cardHolder || 'CARD HOLDER' }}</span>
                    <span>{{ form.expiry || 'MM/YY' }}</span>
                  </div>
                </div>

                <v-row class="mt-1">
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.cardHolder"
                      label="Card Holder Name"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.cardNumber"
                      label="Card Number"
                      maxlength="19"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6" sm="4">
                    <v-text-field v-model="form.expiry" label="Expiry (MM/YY)" maxlength="5" variant="outlined" />
                  </v-col>
                  <v-col cols="6" sm="4">
                    <v-text-field
                      v-model="form.cvv"
                      label="CVV"
                      maxlength="4"
                      type="password"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="summary-card" variant="flat">
            <v-card-title class="summary-title">Order Summary</v-card-title>
            <v-card-text class="summary-body">
              <div class="summary-list">
                <div
                  v-for="item in selectedItems"
                  :key="item.product_id"
                  class="summary-item"
                >
                  <p class="item-name">{{ item.name }}</p>
                  <p class="item-meta">Qty {{ item.quantity }}</p>
                  <p class="item-price">{{ formatAmount(item.price * item.quantity) }}</p>
                </div>
              </div>

              <v-divider class="my-4" />

              <div class="summary-row">
                <span>Subtotal</span>
                <strong>{{ formatAmount(totalAmount) }}</strong>
              </div>
              <div v-if="promoDiscount > 0" class="summary-row promo-row">
                <span>Promo ({{ selectedPromoCode }})</span>
                <strong>-{{ formatAmount(promoDiscount) }}</strong>
              </div>
              <div class="summary-row">
                <span>Shipping</span>
                <strong>Free</strong>
              </div>
              <div class="summary-row total-row">
                <span>Total</span>
                <strong>{{ formatAmount(payableAmount) }}</strong>
              </div>
            </v-card-text>

            <v-card-actions class="summary-actions">
              <v-btn
                block
                class="pay-btn"
                color="primary"
                :loading="submitting"
                rounded="pill"
                size="large"
                @click="submitPayment"
              >
                Pay {{ formatAmount(payableAmount) }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-else class="empty-row">
        <v-col cols="12">
          <v-card class="empty-card" variant="flat">
            <v-card-text class="text-center py-10">
              <v-icon size="52">mdi-cart-outline</v-icon>
              <h2 class="empty-title">No Selected Items</h2>
              <p class="empty-copy">Go back to your cart and select products before payment.</p>
              <v-btn class="mt-4" rounded="pill" @click="$router.push('/cart')">Back to Cart</v-btn>
            </v-card-text>
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
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useCartStore } from '@/stores/cart'
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
    setup() {
      const route = useRoute()
      const router = useRouter()
      const cartStore = useCartStore()
      const submitting = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const userSettings = ref(loadUserSettings())
      const selectedProductIds = ref([])
      const selectedPromoCode = ref('')
      const paymentMode = ref('card')

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

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
            }
          })
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

      const validateForm = () => {
        if (!form.value.firstName || !form.value.lastName) {
          return 'Enter your full name'
        }
        if (!form.value.email || !form.value.address || !form.value.city || !form.value.state || !form.value.zip) {
          return 'Fill all billing address fields'
        }
        if (paymentMode.value === 'upi') {
          const upiPattern = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/
          if (!upiPattern.test(String(form.value.upiId || '').trim())) {
            return 'Enter a valid UPI ID'
          }
        } else {
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
        return ''
      }

      const submitPayment = async () => {
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
            `${API_URL}/api/checkout/place-order`,
            {
              selected_product_ids: selectedProductIds.value,
              promo_code: selectedPromoCode.value && promoDiscount.value > 0 ? selectedPromoCode.value : undefined
            },
            { withCredentials: true }
          )

          if (response.data?.success) {
            await cartStore.fetchCart()
            router.push(`/order-success?order_id=${response.data.order_id}`)
            return
          }

          throw new Error('Payment failed')
        } catch (error) {
          console.error('Payment failed:', error)
          snackbarText.value = error.response?.data?.message || 'Payment failed. Please try again.'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          submitting.value = false
        }
      }

      onMounted(async () => {
        await cartStore.fetchCart()
        userSettings.value = loadUserSettings()
        parseSelectedProductIds()
      })

      return {
        form,
        paymentMode,
        submitting,
        selectedItems,
        totalAmount,
        selectedPromoCode,
        promoDiscount,
        payableAmount,
        maskedCardNumber,
        formatAmount,
        submitPayment,
        snackbar,
        snackbarText,
        snackbarColor,
      }
    }
  }
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 8% 10%, rgba(207, 126, 48, 0.2) 0%, rgba(207, 126, 48, 0) 34%),
    radial-gradient(circle at 92% 84%, rgba(36, 64, 61, 0.16) 0%, rgba(36, 64, 61, 0) 40%),
    linear-gradient(160deg, #f2f6f3 0%, #ecf2ee 45%, #eef3f0 100%);
}

.payment-shell {
  padding-top: 52px;
  padding-bottom: 64px;
}

.payment-hero {
  text-align: center;
}

.payment-kicker {
  font-size: 0.78rem;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #b46a22;
  font-weight: 700;
}

.payment-title {
  margin-top: 10px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3.2rem);
  color: #1c2c30;
}

.payment-subtitle {
  margin: 10px auto 0;
  max-width: 620px;
  color: #61737a;
  line-height: 1.7;
}

.payment-row {
  margin-top: 32px;
  row-gap: 12px;
}

.payment-card,
.summary-card,
.empty-card {
  border: 1px solid #d8e2dd;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 42px rgba(20, 35, 33, 0.08);
}

.section-title,
.summary-title {
  padding: 20px 20px 6px;
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  color: #1f3034;
}

.section-body {
  padding: 12px 20px 18px;
}

.payment-mode-switch {
  margin-bottom: 14px;
}

.mode-toggle {
  width: 100%;
}

.mode-toggle :deep(.v-btn) {
  flex: 1 1 0;
  text-transform: none;
  font-weight: 700;
}

.upi-panel {
  border: 1px solid #d9e4df;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(248, 252, 249, 0.9), rgba(242, 248, 244, 0.86));
  padding: 14px;
}

.upi-visual {
  border-radius: 12px;
  background: linear-gradient(130deg, #25443f, #3b645d);
  color: #f4f8f7;
  padding: 14px;
}

.upi-badge {
  display: inline-block;
  border: 1px solid rgba(228, 237, 234, 0.44);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.upi-visual h3 {
  margin-top: 8px;
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
}

.upi-visual p {
  margin-top: 6px;
  color: rgba(244, 248, 247, 0.88);
}

.card-visual {
  border-radius: 18px;
  background: linear-gradient(130deg, #1f3134, #2f494c 45%, #506f71);
  color: #f4f8f7;
  padding: 18px;
  margin-bottom: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 12px 24px rgba(24, 41, 44, 0.22);
}

.card-label {
  font-size: 0.72rem;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  opacity: 0.9;
}

.card-number {
  margin-top: 16px;
  font-family: 'Manrope', sans-serif;
  letter-spacing: 1.9px;
  font-size: 1.15rem;
}

.card-meta {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  letter-spacing: 0.9px;
  text-transform: uppercase;
}

.summary-body {
  padding: 8px 20px 4px;
}

.summary-list {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow: auto;
}

.summary-item {
  border: 1px solid #e0e9e4;
  border-radius: 12px;
  background: #fbfdfc;
  padding: 10px;
}

.item-name {
  color: #203136;
  font-weight: 700;
  line-height: 1.3;
}

.item-meta {
  margin-top: 4px;
  font-size: 0.82rem;
  color: #70828a;
}

.item-price {
  margin-top: 6px;
  color: #b15f1e;
  font-weight: 800;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #566b71;
}

.promo-row {
  color: #246a57;
}

.total-row {
  margin-top: 6px;
  font-size: 1.1rem;
  color: #1f3034;
}

.summary-actions {
  padding: 12px 20px 22px;
}

.pay-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 12px 24px rgba(198, 115, 42, 0.25);
}

.empty-row {
  margin-top: 30px;
}

.empty-title {
  margin-top: 14px;
  font-family: 'Playfair Display', serif;
  color: #1f3034;
}

.empty-copy {
  margin-top: 8px;
  color: #64767d;
}

@media (max-width: 960px) {
  .payment-shell {
    padding-top: 40px;
  }

  .summary-card {
    margin-top: 8px;
  }
}

@media (max-width: 600px) {
  .payment-shell {
    padding-top: 32px;
    padding-bottom: 44px;
  }

  .payment-card,
  .summary-card,
  .empty-card {
    border-radius: 16px;
  }

  .section-title,
  .summary-title {
    font-size: 1.2rem;
  }

  .section-body,
  .summary-body,
  .summary-actions {
    padding-left: 14px;
    padding-right: 14px;
  }

  .card-visual {
    padding: 14px;
  }

  .card-number {
    letter-spacing: 1.2px;
    font-size: 1rem;
  }

  .mode-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
