<template>
  <div class="profile-page">
    <v-container class="profile-shell">
      <section class="profile-topbar">
        <div>
          <p class="profile-kicker ml-2">Account</p>
          <h1 class="page-title ml-2">Profile</h1>
        </div>

        <div v-if="appStore.isAuthenticated" class="topbar-actions">
          <v-btn
            aria-label="Refresh profile"
            :loading="refreshing"
            rounded="lg"
            variant="tonal"
            @click="refreshProfile"
          >
            <v-icon start>mdi-refresh</v-icon>
            Refresh
          </v-btn>
          <v-btn
            color="teal-darken-1"
            :disabled="!isFormDirty"
            :loading="savingAll"
            rounded="lg"
            @click="saveAll"
          >
            <v-icon start>mdi-content-save-outline</v-icon>
            Save
          </v-btn>
        </div>
      </section>

      <v-alert
        v-if="!appStore.loading && !appStore.isAuthenticated"
        class="profile-alert"
        rounded="lg"
        type="info"
        variant="tonal"
      >
        <div class="guest-alert">
          <div>
            <strong>Sign in to view your profile.</strong>
            <p>Your orders, cart, and saved checkout details are connected to your account.</p>
          </div>
          <v-btn color="teal-darken-1" rounded="lg" to="/login" variant="flat">Login</v-btn>
        </div>
      </v-alert>

      <template v-else>
        <div class="profile-layout">
          <aside class="profile-sidebar">
            <section class="profile-panel identity-panel">
              <div class="avatar-wrap">
                <v-avatar
                  v-if="profilePreviewImage"
                  class="profile-avatar"
                  :image="profilePreviewImage"
                  size="104"
                />
                <v-avatar v-else class="profile-avatar initials-avatar" color="teal-darken-1" size="104">
                  {{ profileInitials }}
                </v-avatar>

                <div class="avatar-actions">
                  <v-btn
                    aria-label="Upload photo"
                    icon
                    rounded="lg"
                    size="small"
                    variant="tonal"
                    @click="openPhotoPicker"
                  >
                    <v-icon>mdi-camera-outline</v-icon>
                    <v-tooltip activator="parent" location="bottom">Upload photo</v-tooltip>
                  </v-btn>
                  <v-btn
                    aria-label="Remove photo"
                    :disabled="!profilePreviewImage"
                    icon
                    rounded="lg"
                    size="small"
                    variant="tonal"
                    @click="removePhoto"
                  >
                    <v-icon>mdi-delete-outline</v-icon>
                    <v-tooltip activator="parent" location="bottom">Remove photo</v-tooltip>
                  </v-btn>
                </div>
              </div>

              <input
                ref="fileInput"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="sr-only"
                type="file"
                @change="onPhotoSelected"
              >

              <h2 class="profile-name">{{ displayName }}</h2>
              <p class="profile-email">{{ appStore.user?.email || 'No email available' }}</p>
              <p v-if="selectedPhotoName" class="photo-name">{{ selectedPhotoName }}</p>

              <div class="profile-chip-row">
                <v-chip color="teal-darken-1" size="small" variant="tonal">{{ countryDisplayName }}</v-chip>
                <v-chip :color="isAdmin ? 'success' : undefined" size="small" variant="tonal">
                  {{ isAdmin ? 'Admin' : 'Customer' }}
                </v-chip>
              </div>

              <div class="profile-stat-grid">
                <article class="profile-stat">
                  <v-icon>mdi-package-variant-closed</v-icon>
                  <strong>{{ orders.length }}</strong>
                  <span>Orders</span>
                </article>
                <article class="profile-stat">
                  <v-icon>mdi-cart-outline</v-icon>
                  <strong>{{ cartStore.itemCount }}</strong>
                  <span>Cart</span>
                </article>
                <article class="profile-stat">
                  <v-icon>mdi-cash-multiple</v-icon>
                  <strong>{{ totalSpentDisplay }}</strong>
                  <span>Spent</span>
                </article>
                <article class="profile-stat">
                  <v-icon>mdi-currency-usd</v-icon>
                  <strong>{{ settings.currency }}</strong>
                  <span>Currency</span>
                </article>
              </div>

              <v-btn
                block
                class="logout-btn"
                color="error"
                rounded="lg"
                variant="tonal"
                @click="logout"
              >
                <v-icon start>mdi-logout</v-icon>
                Logout
              </v-btn>
            </section>

            <section class="profile-panel readiness-panel">
              <div class="readiness-head">
                <v-progress-circular
                  color="teal-darken-1"
                  :model-value="profileCompletion"
                  size="74"
                  width="8"
                >
                  {{ profileCompletion }}%
                </v-progress-circular>
                <div>
                  <h3>Account Readiness</h3>
                  <p>{{ completedProfileItems }} of {{ profileChecklist.length }} complete</p>
                </div>
              </div>

              <div class="check-list">
                <div
                  v-for="item in profileChecklist"
                  :key="item.label"
                  :class="['check-row', { complete: item.complete }]"
                >
                  <v-icon size="18">{{ item.complete ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                  <span>{{ item.label }}</span>
                </div>
              </div>
            </section>
          </aside>

          <main class="profile-main">
            <v-tabs v-model="activeTab" class="profile-tabs" density="comfortable">
              <v-tab value="profile">
                <v-icon start>mdi-account-edit-outline</v-icon>
                Profile
              </v-tab>
              <v-tab value="orders">
                <v-icon start>mdi-receipt-text-outline</v-icon>
                Orders
              </v-tab>
              <v-tab value="security">
                <v-icon start>mdi-shield-account-outline</v-icon>
                Security
              </v-tab>
            </v-tabs>

            <v-tabs-window v-model="activeTab">
              <v-tabs-window-item value="profile">
                <div class="profile-content-grid">
                  <section class="profile-panel form-panel">
                    <div class="panel-head">
                      <div>
                        <h2>Personal Details</h2>
                        <p>Saved to your Mindstore account.</p>
                      </div>
                    </div>

                    <v-row>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="profileForm.name"
                          density="comfortable"
                          label="Full Name"
                          maxlength="120"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="profileForm.email"
                          density="comfortable"
                          label="Email"
                          readonly
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="profileForm.countryCode"
                          density="comfortable"
                          item-title="label"
                          item-value="code"
                          :items="countryOptions"
                          label="Country"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          density="comfortable"
                          label="Currency"
                          :model-value="`${settings.currency} (Auto)`"
                          readonly
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                    </v-row>
                  </section>

                  <section class="profile-panel form-panel">
                    <div class="panel-head">
                      <div>
                        <h2>Delivery Profile</h2>
                        <p>Used to prefill checkout.</p>
                      </div>
                      <v-switch
                        v-model="settings.saveDeliveryDetails"
                        color="teal-darken-1"
                        density="compact"
                        hide-details
                        inset
                      />
                    </div>

                    <v-row>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="settings.deliveryProfile.phone"
                          density="comfortable"
                          label="Phone Number"
                          maxlength="32"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="settings.deliveryProfile.postalCode"
                          density="comfortable"
                          label="Postal Code"
                          maxlength="32"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model="settings.deliveryProfile.address"
                          density="comfortable"
                          label="Street Address"
                          maxlength="220"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="settings.deliveryProfile.city"
                          density="comfortable"
                          label="City"
                          maxlength="96"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="settings.deliveryProfile.state"
                          density="comfortable"
                          label="State"
                          maxlength="96"
                          rounded="lg"
                          variant="outlined"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-textarea
                          v-model="settings.deliveryProfile.instructions"
                          auto-grow
                          density="comfortable"
                          label="Delivery Notes"
                          maxlength="240"
                          rounded="lg"
                          rows="2"
                          variant="outlined"
                        />
                      </v-col>
                    </v-row>
                  </section>

                  <section class="profile-panel form-panel wide-panel">
                    <div class="panel-head">
                      <div>
                        <h2>Preferences</h2>
                        <p>Stored locally for this browser.</p>
                      </div>
                    </div>

                    <div class="preference-grid">
                      <label class="preference-row">
                        <span>
                          <strong>Order updates</strong>
                          <small>Email order status changes</small>
                        </span>
                        <v-switch v-model="settings.orderUpdates" color="teal-darken-1" hide-details inset />
                      </label>
                      <label class="preference-row">
                        <span>
                          <strong>Promotional emails</strong>
                          <small>Offers and seasonal drops</small>
                        </span>
                        <v-switch v-model="settings.promotionalEmails" color="teal-darken-1" hide-details inset />
                      </label>
                      <label class="preference-row">
                        <span>
                          <strong>Quick checkout</strong>
                          <small>Select cart items automatically</small>
                        </span>
                        <v-switch v-model="settings.quickCheckout" color="teal-darken-1" hide-details inset />
                      </label>
                      <label class="preference-row">
                        <span>
                          <strong>Low stock alerts</strong>
                          <small>Show inventory reminders</small>
                        </span>
                        <v-switch v-model="settings.lowStockAlerts" color="teal-darken-1" hide-details inset />
                      </label>
                    </div>

                    <div class="save-strip">
                      <span v-if="isFormDirty">Unsaved changes</span>
                      <span v-else>Profile is up to date</span>
                      <v-btn
                        color="teal-darken-1"
                        :disabled="!isFormDirty"
                        :loading="savingAll"
                        rounded="lg"
                        @click="saveAll"
                      >
                        Save Changes
                      </v-btn>
                    </div>
                  </section>
                </div>
              </v-tabs-window-item>

              <v-tabs-window-item value="orders">
                <section class="profile-panel orders-panel">
                  <div class="panel-head orders-head">
                    <div>
                      <h2>Orders</h2>
                      <p>{{ orders.length }} total, {{ completedOrderCount }} completed.</p>
                    </div>
                    <v-btn
                      aria-label="Refresh orders"
                      :loading="loading"
                      rounded="lg"
                      variant="tonal"
                      @click="fetchOrders"
                    >
                      <v-icon start>mdi-refresh</v-icon>
                      Refresh
                    </v-btn>
                  </div>

                  <div class="orders-toolbar">
                    <v-text-field
                      v-model="orderSearch"
                      density="comfortable"
                      hide-details
                      label="Search Orders"
                      prepend-inner-icon="mdi-magnify"
                      rounded="lg"
                      variant="outlined"
                    />
                    <v-select
                      v-model="orderStatusFilter"
                      density="comfortable"
                      hide-details
                      item-title="label"
                      item-value="value"
                      :items="orderStatusOptions"
                      label="Status"
                      rounded="lg"
                      variant="outlined"
                    />
                    <v-select
                      v-model="orderSort"
                      density="comfortable"
                      hide-details
                      item-title="label"
                      item-value="value"
                      :items="orderSortOptions"
                      label="Sort"
                      rounded="lg"
                      variant="outlined"
                    />
                  </div>

                  <v-progress-linear v-if="loading" class="mt-4" color="teal-darken-1" indeterminate />

                  <div v-else-if="filteredOrders.length === 0" class="empty-orders">
                    <v-icon size="48">mdi-package-variant</v-icon>
                    <h3>{{ orders.length === 0 ? 'No orders yet' : 'No matching orders' }}</h3>
                    <p>{{ orders.length === 0 ? 'Orders placed from your cart will appear here.' : 'Adjust search or status filters.' }}</p>
                    <v-btn color="teal-darken-1" rounded="lg" to="/" variant="flat">Shop Products</v-btn>
                  </div>

                  <v-expansion-panels v-else class="orders-list w-100" variant="accordion">
                    <v-expansion-panel
                      v-for="order in filteredOrders"
                      :key="order.order_id"
                      class="order-item"
                    >
                      <v-expansion-panel-title>
                        <div class="order-title-row">
                          <div>
                            <p class="order-id">Order #{{ order.order_id }}</p>
                            <p class="order-date">{{ formatDate(order.created_at) }}</p>
                          </div>
                          <div class="order-summary">
                            <strong>{{ formatAmount(order.total_amount) }}</strong>
                            <v-chip :color="statusColor(order.status)" size="small" variant="tonal">
                              {{ order.status }}
                            </v-chip>
                          </div>
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <div class="order-detail-grid">
                          <div class="order-detail">
                            <span>Items</span>
                            <strong>{{ order.items.length }}</strong>
                          </div>
                          <div class="order-detail">
                            <span>Created</span>
                            <strong>{{ formatDate(order.created_at) }}</strong>
                          </div>
                          <div class="order-detail">
                            <span>Status</span>
                            <strong>{{ order.status }}</strong>
                          </div>
                        </div>

                        <div class="order-product-list">
                          <div
                            v-for="item in order.items"
                            :key="`${order.order_id}-${item.product_id}`"
                            class="order-product-row"
                          >
                            <div>
                              <strong>{{ item.name || 'Product' }}</strong>
                              <span>Qty {{ item.quantity || 1 }}</span>
                            </div>
                            <span>{{ item.product_id }}</span>
                          </div>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </section>
              </v-tabs-window-item>

              <v-tabs-window-item value="security">
                <div class="profile-content-grid">
                  <section class="profile-panel form-panel">
                    <div class="panel-head">
                      <div>
                        <h2>Session</h2>
                        <p>Current account connection.</p>
                      </div>
                      <v-chip color="success" size="small" variant="tonal">Authenticated</v-chip>
                    </div>

                    <div class="account-list">
                      <div class="account-row">
                        <span>Email</span>
                        <strong>{{ appStore.user?.email || 'Not available' }}</strong>
                      </div>
                      <div class="account-row">
                        <span>User ID</span>
                        <strong>{{ appStore.user?.user_id || appStore.user?.uid || 'Not available' }}</strong>
                      </div>
                      <div class="account-row">
                        <span>Created</span>
                        <strong>{{ formatDate(appStore.user?.created_at) }}</strong>
                      </div>
                      <div class="account-row">
                        <span>Updated</span>
                        <strong>{{ formatDate(appStore.user?.updated_at) }}</strong>
                      </div>
                    </div>
                  </section>

                  <section class="profile-panel form-panel">
                    <div class="panel-head">
                      <div>
                        <h2>Account Actions</h2>
                        <p>Quick links for your account.</p>
                      </div>
                    </div>

                    <div class="action-grid">
                      <v-btn color="teal-darken-1" rounded="lg" to="/cart" variant="flat">
                        <v-icon start>mdi-cart-outline</v-icon>
                        Open Cart
                      </v-btn>
                      <v-btn color="teal-darken-1" rounded="lg" to="/" variant="tonal">
                        <v-icon start>mdi-storefront-outline</v-icon>
                        Continue Shopping
                      </v-btn>
                      <v-btn
                        v-if="isAdmin"
                        color="success"
                        rounded="lg"
                        to="/admin"
                        variant="tonal"
                      >
                        <v-icon start>mdi-shield-star-outline</v-icon>
                        Admin
                      </v-btn>
                      <v-btn color="error" rounded="lg" variant="tonal" @click="logout">
                        <v-icon start>mdi-logout</v-icon>
                        Logout
                      </v-btn>
                    </div>
                  </section>
                </div>
              </v-tabs-window-item>
            </v-tabs-window>
          </main>
        </div>
      </template>
    </v-container>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="3000"
      :type="snackbarColor"
    />
  </div>
</template>

<script>
  import axios from 'axios'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { API_URL, buildAuthenticatedRequestConfig } from '@/utils/api'
  import { fetchExchangeRates, formatCurrencyAmount } from '@/utils/currency'
  import { safeDisplayImageUrl } from '@/utils/images'
  import {
    getCurrencyForCountry,
    loadUserSettings,
    normalizeCountryCode,
    normalizeDeliveryProfile,
    resolveCurrencyFromUserCountry,
    saveUserSettings,
    DEFAULT_SETTINGS as USER_SETTINGS_DEFAULTS
  } from '@/utils/userSettings'

  const COUNTRY_OPTIONS_BASE = [
    { code: 'US', label: 'United States' },
    { code: 'IN', label: 'India' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'CA', label: 'Canada' },
    { code: 'AU', label: 'Australia' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
    { code: 'IT', label: 'Italy' },
    { code: 'ES', label: 'Spain' },
    { code: 'NL', label: 'Netherlands' },
    { code: 'AE', label: 'United Arab Emirates' },
    { code: 'SG', label: 'Singapore' },
    { code: 'JP', label: 'Japan' },
    { code: 'BR', label: 'Brazil' },
    { code: 'MX', label: 'Mexico' }
  ]

  const DEFAULT_COUNTRY_CODE = 'US'
  const DEFAULT_CURRENCY = USER_SETTINGS_DEFAULTS.currency
  const MAX_PHOTO_FILE_BYTES = 512 * 1024
  const MAX_PHOTO_DATA_URL_LENGTH = 700_000

  const DEFAULT_SETTINGS = {
    currency: DEFAULT_CURRENCY,
    orderUpdates: USER_SETTINGS_DEFAULTS.orderUpdates,
    promotionalEmails: USER_SETTINGS_DEFAULTS.promotionalEmails,
    quickCheckout: USER_SETTINGS_DEFAULTS.quickCheckout,
    lowStockAlerts: USER_SETTINGS_DEFAULTS.lowStockAlerts,
    saveDeliveryDetails: USER_SETTINGS_DEFAULTS.saveDeliveryDetails,
    deliveryProfile: { ...USER_SETTINGS_DEFAULTS.deliveryProfile }
  }

  const orderSortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'highest', label: 'Highest Total' },
    { value: 'lowest', label: 'Lowest Total' }
  ]

  function cloneSettings(settings) {
    return {
      ...settings,
      deliveryProfile: { ...settings.deliveryProfile }
    }
  }

  function getCountryNameFromCode(code) {
    const normalizedCode = normalizeCountryCode(code || DEFAULT_COUNTRY_CODE)

    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
      return displayNames.of(normalizedCode) || normalizedCode
    } catch {
      return normalizedCode
    }
  }

  function normalizeOrder(order = {}) {
    return {
      ...order,
      order_id: order.order_id || order.id || 'pending',
      status: String(order.status || 'processing').trim() || 'processing',
      total_amount: Number(order.total_amount || order.total || 0),
      created_at: order.created_at || order.createdAt || null,
      items: Array.isArray(order.items) ? order.items : []
    }
  }

  function createSettingsSnapshot(settings) {
    return JSON.stringify({
      currency: settings.currency,
      orderUpdates: settings.orderUpdates,
      promotionalEmails: settings.promotionalEmails,
      quickCheckout: settings.quickCheckout,
      lowStockAlerts: settings.lowStockAlerts,
      saveDeliveryDetails: settings.saveDeliveryDetails,
      deliveryProfile: normalizeDeliveryProfile(settings.deliveryProfile)
    })
  }

  export default {
    name: 'Profile',
    components: {
      BaseAlert
    },
    setup() {
      const router = useRouter()
      const appStore = useAppStore()
      const cartStore = useCartStore()
      const orders = ref([])
      const loading = ref(false)
      const refreshing = ref(false)
      const profileLoaded = ref(false)
      const savingAll = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const fileInput = ref(null)
      const selectedPhotoName = ref('')
      const pictureChanged = ref(false)
      const activeTab = ref('profile')
      const orderSearch = ref('')
      const orderStatusFilter = ref('all')
      const orderSort = ref('newest')

      const settings = ref(cloneSettings(DEFAULT_SETTINGS))
      const settingsBaseline = ref(cloneSettings(DEFAULT_SETTINGS))

      const profileForm = ref({
        name: '',
        email: '',
        countryCode: '',
        picture: ''
      })

      const displayName = computed(() => {
        return profileForm.value.name || appStore.user?.name || 'Mindstore User'
      })

      const profileInitials = computed(() => {
        const source = displayName.value || appStore.user?.email || 'MS'
        return String(source)
          .split(/\s+|@/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('') || 'MS'
      })

      const profileImage = computed(() =>
        safeDisplayImageUrl(appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url)
      )

      const profilePreviewImage = computed(() => {
        if (pictureChanged.value) {
          return safeDisplayImageUrl(profileForm.value.picture)
        }
        return profileImage.value
      })

      const isAdmin = computed(() => Boolean(appStore.user?.is_admin))

      const countryDisplayName = computed(() => {
        const countryCode =
          normalizeCountryCode(profileForm.value.countryCode) ||
          normalizeCountryCode(appStore.user?.country_code) ||
          DEFAULT_COUNTRY_CODE
        return getCountryNameFromCode(countryCode)
      })

      const countryOptions = computed(() => {
        const selectedCountryCode = normalizeCountryCode(profileForm.value.countryCode)
        if (!selectedCountryCode || COUNTRY_OPTIONS_BASE.some((item) => item.code === selectedCountryCode)) {
          return COUNTRY_OPTIONS_BASE
        }

        return [...COUNTRY_OPTIONS_BASE, { code: selectedCountryCode, label: getCountryNameFromCode(selectedCountryCode) }]
      })

      const isProfileDirty = computed(() => {
        const formName = String(profileForm.value.name || '').trim()
        const userName = String(appStore.user?.name || '').trim()
        const formCountry = normalizeCountryCode(profileForm.value.countryCode || '')
        const userCountry = normalizeCountryCode(appStore.user?.country_code || DEFAULT_COUNTRY_CODE)
        return formName !== userName || formCountry !== userCountry || pictureChanged.value
      })

      const isSettingsDirty = computed(() => createSettingsSnapshot(settings.value) !== createSettingsSnapshot(settingsBaseline.value))
      const isFormDirty = computed(() => isProfileDirty.value || isSettingsDirty.value)

      const totalSpent = computed(() => orders.value.reduce((total, order) => total + Number(order.total_amount || 0), 0))
      const totalSpentDisplay = computed(() => formatAmount(totalSpent.value))
      const completedOrderCount = computed(() =>
        orders.value.filter((order) => String(order.status || '').toLowerCase() === 'completed').length
      )

      const deliveryIsComplete = computed(() => {
        const delivery = settings.value.deliveryProfile || {}
        return Boolean(delivery.phone && delivery.address && delivery.city && delivery.postalCode)
      })

      const profileChecklist = computed(() => [
        { label: 'Name', complete: Boolean(String(profileForm.value.name || '').trim()) },
        { label: 'Email', complete: Boolean(appStore.user?.email) },
        { label: 'Country', complete: Boolean(normalizeCountryCode(profileForm.value.countryCode)) },
        { label: 'Photo', complete: Boolean(profilePreviewImage.value) },
        { label: 'Delivery', complete: deliveryIsComplete.value }
      ])

      const completedProfileItems = computed(() =>
        profileChecklist.value.filter((item) => item.complete).length
      )

      const profileCompletion = computed(() =>
        Math.round((completedProfileItems.value / profileChecklist.value.length) * 100)
      )

      const orderStatusOptions = computed(() => {
        const statuses = [...new Set(orders.value.map((order) => String(order.status || '').toLowerCase()).filter(Boolean))]
        return [
          { value: 'all', label: 'All Status' },
          ...statuses.map((status) => ({
            value: status,
            label: status.replace(/(^|\s|-)\S/g, (match) => match.toUpperCase())
          }))
        ]
      })

      const filteredOrders = computed(() => {
        const query = String(orderSearch.value || '').trim().toLowerCase()
        const status = String(orderStatusFilter.value || 'all').toLowerCase()

        const filtered = orders.value.filter((order) => {
          const orderStatus = String(order.status || '').toLowerCase()
          const matchesStatus = status === 'all' || orderStatus === status
          const searchable = [
            order.order_id,
            order.status,
            order.total_amount,
            ...order.items.map((item) => item.name || item.product_id || '')
          ].join(' ').toLowerCase()
          return matchesStatus && (!query || searchable.includes(query))
        })

        return filtered.toSorted((left, right) => {
          if (orderSort.value === 'highest') {
            return Number(right.total_amount || 0) - Number(left.total_amount || 0)
          }
          if (orderSort.value === 'lowest') {
            return Number(left.total_amount || 0) - Number(right.total_amount || 0)
          }

          const leftDate = new Date(left.created_at || 0).getTime()
          const rightDate = new Date(right.created_at || 0).getTime()
          return orderSort.value === 'oldest' ? leftDate - rightDate : rightDate - leftDate
        })
      })

      const deriveCurrencyForSelectedCountry = () => {
        const fallbackCurrency = resolveCurrencyFromUserCountry(
          appStore.user,
          settings.value.currency || DEFAULT_CURRENCY
        )
        const countryCode = profileForm.value.countryCode || DEFAULT_COUNTRY_CODE
        return getCurrencyForCountry(countryCode, fallbackCurrency)
      }

      const syncCurrencyWithCountry = () => {
        const derivedCurrency = deriveCurrencyForSelectedCountry()
        settings.value.currency = derivedCurrency || DEFAULT_CURRENCY
      }

      const loadProfileForm = () => {
        profileForm.value = {
          name: appStore.user?.name || '',
          email: appStore.user?.email || '',
          countryCode: normalizeCountryCode(
            appStore.user?.country_code || appStore.user?.country || DEFAULT_COUNTRY_CODE
          ),
          picture: profileImage.value || ''
        }
        selectedPhotoName.value = ''
        pictureChanged.value = false
      }

      const loadSettings = () => {
        const loaded = loadUserSettings()
        settings.value = cloneSettings({
          ...DEFAULT_SETTINGS,
          currency: loaded.currency || DEFAULT_CURRENCY,
          orderUpdates: loaded.orderUpdates,
          promotionalEmails: loaded.promotionalEmails,
          quickCheckout: loaded.quickCheckout,
          lowStockAlerts: loaded.lowStockAlerts,
          saveDeliveryDetails: loaded.saveDeliveryDetails,
          deliveryProfile: normalizeDeliveryProfile(loaded.deliveryProfile)
        })
        syncCurrencyWithCountry()
        settingsBaseline.value = cloneSettings(settings.value)
      }

      const openPhotoPicker = () => {
        fileInput.value?.click()
      }

      const showMessage = (message, color = 'success') => {
        snackbarText.value = message
        snackbarColor.value = color
        snackbar.value = true
      }

      const onPhotoSelected = (event) => {
        const file = event?.target?.files?.[0]
        event.target.value = ''
        if (!file) {
          return
        }

        if (!file.type?.startsWith('image/')) {
          showMessage('Please choose an image file.', 'warning')
          return
        }

        if (file.size > MAX_PHOTO_FILE_BYTES) {
          showMessage('Image too large. Maximum size is 512KB.', 'warning')
          return
        }

        const reader = new FileReader()
        reader.addEventListener('load', () => {
          const result = String(reader.result || '')
          if (!result.startsWith('data:image/') || result.length > MAX_PHOTO_DATA_URL_LENGTH) {
            showMessage('Unsupported image format or size.', 'warning')
            return
          }
          profileForm.value.picture = result
          selectedPhotoName.value = file.name
          pictureChanged.value = true
        })
        reader.addEventListener('error', () => {
          showMessage('Unable to read image file.', 'error')
        })
        reader.readAsDataURL(file)
      }

      const removePhoto = () => {
        profileForm.value.picture = ''
        selectedPhotoName.value = ''
        pictureChanged.value = true
      }

      const saveAll = async () => {
        if (!appStore.isAuthenticated) {
          showMessage('Please login before saving profile details.', 'warning')
          return
        }

        const name = String(profileForm.value.name || '').trim()
        if (!name) {
          showMessage('Full name is required.', 'warning')
          return
        }

        savingAll.value = true
        try {
          if (isProfileDirty.value) {
            await appStore.updateAccountProfile({
              name,
              countryCode: profileForm.value.countryCode,
              picture: pictureChanged.value ? profileForm.value.picture : undefined
            })
          }

          const existingSettings = loadUserSettings()
          saveUserSettings({
            ...existingSettings,
            displayName: name,
            currency: settings.value.currency,
            orderUpdates: settings.value.orderUpdates,
            promotionalEmails: settings.value.promotionalEmails,
            quickCheckout: settings.value.quickCheckout,
            lowStockAlerts: settings.value.lowStockAlerts,
            saveDeliveryDetails: settings.value.saveDeliveryDetails,
            deliveryProfile: settings.value.deliveryProfile
          })

          loadProfileForm()
          loadSettings()
          showMessage('Profile saved')
        } catch (error) {
          const errorMessage = error?.response?.data?.message || error?.message || ''
          const isNotAuthenticated = error?.response?.status === 401 || errorMessage === 'Not authenticated'
          showMessage(isNotAuthenticated ? 'Not authenticated' : errorMessage || 'Failed to save profile', 'error')
        } finally {
          savingAll.value = false
        }
      }

      const fetchOrders = async () => {
        if (!appStore.isAuthenticated) {
          orders.value = []
          return
        }

        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/orders`, await buildAuthenticatedRequestConfig())
          const payload = Array.isArray(response.data) ? response.data : response.data?.orders || []
          orders.value = Array.isArray(payload) ? payload.map((order) => normalizeOrder(order)) : []
        } catch (error) {
          const isNotAuthenticated = error?.response?.status === 401
          if (isNotAuthenticated) {
            orders.value = []
            return
          }
          console.error('Failed to fetch orders:', error)
          showMessage('Failed to load orders.', 'error')
        } finally {
          loading.value = false
        }
      }

      const refreshProfile = async ({ silent = false } = {}) => {
        if (!appStore.isAuthenticated) {
          return
        }

        refreshing.value = true
        try {
          await Promise.allSettled([
            appStore.refreshCurrentUser(),
            cartStore.fetchCart()
          ])
          await fetchOrders()
          profileLoaded.value = true
          if (!silent) {
            showMessage('Profile refreshed')
          }
        } finally {
          refreshing.value = false
        }
      }

      const logout = async () => {
        orders.value = []
        cartStore.clearCart()
        await appStore.logout()
        router.push('/')
      }

      const formatDate = (dateString) => {
        const date = new Date(dateString || 0)
        if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
          return 'Not available'
        }
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }

      const formatAmount = (amount) => {
        return formatCurrencyAmount(amount, settings.value.currency || 'USD')
      }

      const statusColor = (status) => {
        const normalizedStatus = String(status || '').toLowerCase()
        if (normalizedStatus === 'completed') return 'success'
        if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') return 'error'
        if (normalizedStatus === 'shipped') return 'info'
        return 'warning'
      }

      watch(
        () => appStore.user,
        () => {
          loadProfileForm()
          loadSettings()
        },
        { immediate: true }
      )

      watch(
        () => profileForm.value.countryCode,
        () => {
          syncCurrencyWithCountry()
        }
      )

      watch(
        () => [appStore.isAuthenticated, appStore.loading],
        ([isAuthenticated, isLoading]) => {
          if (isLoading) {
            return
          }

          if (!isAuthenticated) {
            orders.value = []
            profileLoaded.value = false
            return
          }

          if (!profileLoaded.value) {
            void refreshProfile({ silent: true })
          }
        },
        { immediate: true }
      )

      onMounted(() => {
        void fetchExchangeRates()
      })

      return {
        appStore,
        cartStore,
        orders,
        filteredOrders,
        loading,
        refreshing,
        savingAll,
        snackbar,
        snackbarText,
        snackbarColor,
        fileInput,
        selectedPhotoName,
        settings,
        profileForm,
        displayName,
        profileInitials,
        profilePreviewImage,
        isAdmin,
        countryDisplayName,
        countryOptions,
        isFormDirty,
        activeTab,
        profileChecklist,
        completedProfileItems,
        profileCompletion,
        totalSpentDisplay,
        completedOrderCount,
        orderSearch,
        orderStatusFilter,
        orderStatusOptions,
        orderSort,
        orderSortOptions,
        openPhotoPicker,
        onPhotoSelected,
        removePhoto,
        saveAll,
        fetchOrders,
        refreshProfile,
        logout,
        formatDate,
        formatAmount,
        statusColor
      }
    }
  }
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.profile-shell {
  padding-top: 24px;
  padding-bottom: 32px;
}

.profile-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.profile-kicker {
  margin-bottom: 4px;
  font-size: 0.78rem;
  color: #616161;
  font-weight: 700;
  text-transform: uppercase;
}

.page-title {
  font-size: clamp(1.55rem, 2.6vw, 2.2rem);
  line-height: 1.25;
  font-weight: 600;
  color: #1f1f1f;
}

.profile-subtitle {
  margin-top: 6px;
  color: #616161;
  line-height: 1.55;
}

.topbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.profile-alert {
  margin-top: 16px;
}

.guest-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.guest-alert p {
  margin-top: 4px;
}

.profile-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.profile-sidebar {
  display: grid;
  gap: 16px;
  position: sticky;
  top: 88px;
}

.profile-main {
  min-width: 0;
}

.profile-panel {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
}

.identity-panel,
.readiness-panel,
.form-panel,
.orders-panel {
  padding: 20px;
}

.avatar-wrap {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.profile-avatar {
  border: 1px solid #e0e0e0;
}

.initials-avatar {
  font-size: 1.75rem;
  font-weight: 700;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.profile-name {
  margin-top: 12px;
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: #212121;
  overflow-wrap: anywhere;
}

.profile-email,
.photo-name {
  margin-top: 4px;
  text-align: center;
  color: #616161;
  overflow-wrap: anywhere;
}

.photo-name {
  font-size: 0.82rem;
}

.profile-chip-row {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.profile-stat-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.profile-stat {
  min-height: 90px;
  border: 1px solid #eeeeee;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  align-content: center;
  gap: 3px;
  background: #fafafa;
}

.profile-stat .v-icon {
  color: #1976d2;
}

.profile-stat strong {
  font-size: 1.05rem;
  color: #212121;
  overflow-wrap: anywhere;
}

.profile-stat span {
  color: #616161;
  font-size: 0.82rem;
}

.logout-btn {
  margin-top: 16px;
}

.readiness-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.readiness-head h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #212121;
}

.readiness-head p {
  margin-top: 3px;
  color: #616161;
  font-size: 0.9rem;
}

.check-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #757575;
}

.check-row.complete {
  color: #00897B;
}

.profile-tabs {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  margin-bottom: 16px;
}

.profile-content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.wide-panel {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  font-size: 1.12rem;
  color: #212121;
  font-weight: 700;
}

.panel-head p {
  margin-top: 3px;
  color: #616161;
  font-size: 0.9rem;
}

.preference-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.preference-row {
  min-height: 82px;
  border: 1px solid #eeeeee;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fafafa;
}

.preference-row span {
  display: grid;
  gap: 4px;
}

.preference-row strong {
  color: #212121;
}

.preference-row small {
  color: #616161;
}

.save-strip {
  margin-top: 16px;
  border-top: 1px solid #eeeeee;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #616161;
}

.orders-head {
  align-items: center;
}

.orders-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 0.45fr) minmax(160px, 0.45fr);
  gap: 10px;
}

.empty-orders {
  min-height: 300px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  color: #616161;
}

.empty-orders h3 {
  color: #212121;
  font-size: 1.15rem;
}

.orders-list {
  margin-top: 14px;
  gap: 10px;
}

.order-item {
  border: 1px solid #eeeeee;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: none !important;
}

.order-title-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.order-id {
  color: #212121;
  font-weight: 700;
}

.order-date {
  margin-top: 3px;
  color: #616161;
  font-size: 0.88rem;
}

.order-summary {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 7px;
  text-align: right;
}

.order-summary strong {
  color: #1976d2;
}

.order-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.order-detail {
  border: 1px solid #eeeeee;
  border-radius: 8px;
  padding: 10px;
  background: #fafafa;
}

.order-detail span {
  display: block;
  color: #616161;
  font-size: 0.82rem;
}

.order-detail strong {
  display: block;
  margin-top: 4px;
  color: #212121;
  overflow-wrap: anywhere;
}

.order-product-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.order-product-row {
  border-top: 1px solid #eeeeee;
  padding-top: 8px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.order-product-row div {
  display: grid;
  gap: 3px;
}

.order-product-row strong {
  color: #212121;
}

.order-product-row span {
  color: #616161;
  font-size: 0.84rem;
  overflow-wrap: anywhere;
}

.account-list {
  display: grid;
  gap: 10px;
}

.account-row {
  border: 1px solid #eeeeee;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 5px;
  background: #fafafa;
}

.account-row span {
  color: #616161;
  font-size: 0.82rem;
}

.account-row strong {
  color: #212121;
  overflow-wrap: anywhere;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 10px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1100px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-sidebar {
    position: static;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 800px) {
  .profile-topbar,
  .guest-alert,
  .save-strip,
  .order-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .topbar-actions {
    justify-content: stretch;
  }

  .topbar-actions .v-btn,
  .save-strip .v-btn {
    width: 100%;
  }

  .profile-sidebar,
  .profile-content-grid,
  .preference-grid,
  .orders-toolbar,
  .order-detail-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }

  .order-summary {
    align-items: flex-start;
    text-align: left;
  }
}

@media (max-width: 600px) {
  .profile-shell {
    padding-top: 18px;
    padding-bottom: 24px;
  }

  .identity-panel,
  .readiness-panel,
  .form-panel,
  .orders-panel {
    padding: 16px;
  }

  .profile-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
