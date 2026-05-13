<template>
  <v-container class="py-6 py-md-8">
    <v-sheet class="pa-4 pa-md-6 mb-6" border rounded="lg">
      <v-chip color="primary" size="small" variant="tonal">Secure Checkout</v-chip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mt-3">Personal Payment</h1>
      <p class="text-body-2 text-medium-emphasis mt-2">Finalize your order with encrypted payment and curated delivery details.</p>
    </v-sheet>

    <v-row v-if="selectedItems.length > 0">
      <v-col cols="12" md="8">
        <v-card rounded="lg" variant="outlined">
          <v-card-title>Contact & Billing</v-card-title>
          <v-divider />
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.firstName" label="First Name" rounded="lg" variant="outlined" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.lastName" label="Last Name" rounded="lg" variant="outlined" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  rounded="lg"
                  type="email"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.phone" label="Phone Number" rounded="lg" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="form.address" label="Street Address" rounded="lg" variant="outlined" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.city" label="City" rounded="lg" variant="outlined" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model="form.state" label="State" rounded="lg" variant="outlined" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model="form.zip" label="ZIP" rounded="lg" variant="outlined" />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mt-4" rounded="lg" variant="outlined">
          <v-card-title>Payment Method</v-card-title>
          <v-divider />
          <v-card-text>
            <v-tabs
              v-model="tab"
              class="mb-4"
              density="comfortable"
              grow
              mandatory
            >
              <v-tab value="upi">UPI ID</v-tab>
              <v-tab value="card">Card</v-tab>
            </v-tabs>

            <v-tabs-window v-model="tab">
              <v-tabs-window-item value="upi">
                <v-alert class="mb-3" density="compact" type="info" variant="tonal">
                  Use any UPI app linked to your bank account.
                </v-alert>
                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.upiId"
                      hint="Example: name@okaxis"
                      label="UPI ID"
                      persistent-hint
                      rounded="lg"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-tabs-window-item>

              <v-tabs-window-item value="card">
                <v-sheet class="pa-4 mb-4" border rounded="lg">
                  <p class="text-caption text-medium-emphasis">Mindstore Card Preview</p>
                  <p class="text-h6 font-weight-bold mt-2">{{ maskedCardNumber }}</p>
                  <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-2">
                    <span>{{ form.cardHolder || 'CARD HOLDER' }}</span>
                    <span>{{ form.expiry || 'MM/YY' }}</span>
                  </div>
                </v-sheet>

                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.cardHolder"
                      label="Card Holder Name"
                      rounded="lg"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.cardNumber"
                      label="Card Number"
                      maxlength="19"
                      rounded="lg"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6" sm="4">
                    <v-text-field
                      v-model="form.expiry"
                      label="Expiry (MM/YY)"
                      maxlength="5"
                      rounded="lg"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6" sm="4">
                    <v-text-field
                      v-model="form.cvv"
                      label="CVV"
                      maxlength="4"
                      rounded="lg"
                      type="password"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card rounded="lg" variant="outlined">
          <v-card-title>Order Summary</v-card-title>
          <v-divider />
          <v-card-text>
            <div class="d-flex flex-column ga-2">
              <v-sheet v-for="item in selectedItems" :key="item.product_id" class="pa-3" border rounded="lg">
                <p class="font-weight-medium">{{ item.name }}</p>
                <p class="text-caption text-medium-emphasis mt-1">
                  Qty {{ item.quantity }} - {{ item.stock > 0 ? `${item.stock} in stock` : 'Sold out' }}
                </p>
                <p class="font-weight-bold mt-2">{{ formatAmount(item.price * item.quantity) }}</p>
              </v-sheet>
            </div>

            <v-alert
              v-if="selectedStockIssues.length > 0"
              class="mt-3"
              density="compact"
              type="warning"
              variant="tonal"
            >
              {{ selectedStockIssues.length }} selected item needs stock review.
            </v-alert>

            <v-divider class="my-4" />

            <div class="d-flex justify-space-between mb-2">
              <span>Subtotal</span>
              <strong>{{ formatAmount(totalAmount) }}</strong>
            </div>
            <div v-if="promoDiscount > 0" class="d-flex justify-space-between mb-2 text-success">
              <span>Promo ({{ selectedPromoCode }})</span>
              <strong>-{{ formatAmount(promoDiscount) }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>Shipping</span>
              <strong>Free</strong>
            </div>
            <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold mt-3">
              <span>Total</span>
              <strong>{{ formatAmount(payableAmount) }}</strong>
            </div>
          </v-card-text>

          <v-card-actions class="d-flex flex-column ga-2">
            <v-btn
              block
              color="primary"
              :disabled="selectedStockIssues.length > 0"
              :loading="submitting"
              rounded="lg"
              size="large"
              variant="flat"
              @click="submitPayment"
            >
              Pay {{ formatAmount(payableAmount) }}
            </v-btn>

            <v-btn
              block
              color="error"
              rounded="lg"
              size="large"
              variant="tonal"
              @click="cancelPayment"
            >
              Cancel Payment
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-card class="text-center py-10" rounded="lg" variant="outlined">
          <v-icon size="52">mdi-cart-outline</v-icon>
          <h2 class="text-h5 mt-4">No Selected Items</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">Go back to your cart and select products before payment.</p>
          <div class="mt-4">
            <v-btn color="primary" rounded="lg" to="/cart" variant="flat">Back to Cart</v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

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
        const delivery = settings.deliveryProfile || {}
        const { firstName, lastName } = splitName(appStore.user?.name || settings.displayName)

        form.value = {
          ...form.value,
          firstName: form.value.firstName || firstName,
          lastName: form.value.lastName || lastName,
          email: form.value.email || appStore.user?.email || '',
          phone: form.value.phone || (settings.saveDeliveryDetails ? delivery.phone : ''),
          address: form.value.address || (settings.saveDeliveryDetails ? delivery.address : ''),
          city: form.value.city || (settings.saveDeliveryDetails ? delivery.city : ''),
          state: form.value.state || (settings.saveDeliveryDetails ? delivery.state : ''),
          zip: form.value.zip || (settings.saveDeliveryDetails ? delivery.postalCode : '')
        }
      }

      const validateForm = () => {
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
              promo_code: selectedPromoCode.value && promoDiscount.value > 0 ? selectedPromoCode.value : undefined
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
