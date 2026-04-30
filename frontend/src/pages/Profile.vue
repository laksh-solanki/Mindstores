<template>
  <div class="profile-page">
    <v-container class="profile-shell">
      <section class="profile-hero">
        <p class="profile-kicker">Account Hub</p>
        <h1 class="page-title">Profile & Orders</h1>
        <p class="profile-subtitle">Your identity, preferences, and order activity in one premium workspace.</p>
      </section>

      <v-row align="stretch" class="profile-grid">
        <v-col cols="12" lg="4">
          <v-card class="profile-card" variant="flat">
            <v-card-text class="profile-card-body">
              <v-avatar
                v-if="profilePreviewImage"
                class="profile-avatar"
                :image="profilePreviewImage"
                size="112"
              />
              <v-avatar v-else class="profile-avatar" color="#1f3034" size="112">
                <v-icon color="white" size="50">mdi-account</v-icon>
              </v-avatar>

              <h2 class="profile-name">{{ appStore.user?.name || 'Mindstore User' }}</h2>
              <p class="profile-email">{{ appStore.user?.email || 'No email available' }}</p>

              <div class="avatar-actions">
                <v-btn class="avatar-btn" rounded="pill" variant="tonal" @click="openPhotoPicker">
                  <v-icon start>mdi-pencil</v-icon>
                  Upload Photo
                </v-btn>
                <v-btn
                  class="avatar-btn"
                  :disabled="!profilePreviewImage"
                  rounded="pill"
                  variant="tonal"
                  @click="removePhoto"
                >
                  <v-icon start>mdi-delete</v-icon>
                  Remove
                </v-btn>
              </div>
              <p v-if="selectedPhotoName" class="photo-name">Selected: {{ selectedPhotoName }}</p>

              <input
                ref="fileInput"
                accept="image/*"
                class="sr-only"
                type="file"
                @change="onPhotoSelected"
              >

              <div class="profile-stat-grid">
                <article class="stat-card">
                  <p class="stat-value">{{ orders.length }}</p>
                  <p class="stat-label">Orders</p>
                </article>
                <article class="stat-card">
                  <p class="stat-value">{{ isAdmin ? 'Yes' : 'No' }}</p>
                  <p class="stat-label">Admin</p>
                </article>
              </div>

              <v-btn
                block
                class="logout-btn mt-4"
                color="error"
                rounded="pill"
                variant="tonal"
                @click="logout"
              >
                <v-icon start>mdi-logout</v-icon>
                Logout
              </v-btn>
            </v-card-text>
          </v-card>

          <v-card class="settings-card mt-4" variant="flat">
            <v-card-title class="section-title">Profile & Preferences</v-card-title>
            <v-card-text class="section-body">
              <v-text-field
                v-model="profileForm.name"
                density="comfortable"
                label="Full Name"
                rounded="lg"
                variant="outlined"
              />

              <v-text-field
                v-model="profileForm.email"
                class="mt-1"
                density="comfortable"
                label="Email"
                readonly
                rounded="lg"
                variant="outlined"
              />

              <v-select
                v-model="profileForm.countryCode"
                class="mt-1"
                density="comfortable"
                item-title="label"
                item-value="code"
                :items="countryOptions"
                label="Country"
                rounded="lg"
                variant="outlined"
              />

              <v-text-field
                class="mt-1"
                density="comfortable"
                label="Currency"
                :model-value="`${settings.currency} (Auto by Country)`"
                readonly
                rounded="lg"
                variant="outlined"
              />

              <v-switch
                v-model="settings.orderUpdates"
                class="mt-2"
                color="primary"
                hide-details
                inset
                label="Order status updates"
              />
              <v-switch
                v-model="settings.promotionalEmails"
                color="primary"
                hide-details
                inset
                label="Promotional emails"
              />
              <v-switch
                v-model="settings.quickCheckout"
                color="primary"
                hide-details
                inset
                label="Enable quick checkout"
              />

              <v-btn
                block
                class="save-btn mt-3"
                color="primary"
                :disabled="!isFormDirty"
                :loading="savingAll"
                rounded="pill"
                @click="saveAll"
              >
                Save Profile & Preferences
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="8">
          <v-card class="orders-card" variant="flat">
            <v-card-title class="orders-title">Recent Orders</v-card-title>
            <v-card-text>
              <v-progress-linear v-if="loading" indeterminate />

              <div v-else-if="orders.length === 0" class="empty-orders">
                <div class="empty-orders-icon">
                  <v-icon size="50">mdi-package-variant</v-icon>
                </div>
                <p class="empty-orders-title">No orders yet</p>
                <p class="empty-orders-copy">Orders placed from your cart will appear here.</p>
              </div>

              <div v-else class="orders-list">
                <article v-for="order in orders" :key="order.order_id" class="order-item">
                  <div class="order-item-head">
                    <div>
                      <p class="order-id">Order #{{ order.order_id }}</p>
                      <p class="order-date">{{ formatDate(order.created_at) }}</p>
                    </div>

                    <div class="order-meta">
                      <p class="order-amount">{{ formatAmount(order.total_amount) }}</p>
                      <v-chip :color="order.status === 'completed' ? 'success' : 'warning'" size="small" variant="flat">
                        {{ order.status }}
                      </v-chip>
                    </div>
                  </div>

                  <div class="order-items">
                    <p
                      v-for="item in order.items.slice(0, 3)"
                      :key="`${order.order_id}-${item.product_id}`"
                      class="order-item-line"
                    >
                      {{ item.name }} x{{ item.quantity }}
                    </p>
                    <p v-if="order.items.length > 3" class="order-item-line muted">
                      +{{ order.items.length - 3 }} more items
                    </p>
                  </div>
                </article>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
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
  import { API_URL } from '@/utils/api'
  import { fetchExchangeRates, formatCurrencyAmount } from '@/utils/currency'
  import {
    getCurrencyForCountry,
    loadUserSettings,
    normalizeCountryCode,
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

  const DEFAULT_SETTINGS = {
    currency: DEFAULT_CURRENCY,
    orderUpdates: true,
    promotionalEmails: false,
    quickCheckout: true
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

  export default {
    name: 'Profile',
    components: {
      BaseAlert
    },
    setup() {
      const router = useRouter()
      const appStore = useAppStore()
      const orders = ref([])
      const loading = ref(false)
      const savingAll = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const fileInput = ref(null)
      const selectedPhotoName = ref('')
      const pictureChanged = ref(false)

      const settings = ref({ ...DEFAULT_SETTINGS })
      const settingsBaseline = ref({ ...DEFAULT_SETTINGS })

      const profileForm = ref({
        name: '',
        email: '',
        countryCode: '',
        picture: ''
      })

      const profileImage = computed(() =>
        appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url || ''
      )
      const profilePreviewImage = computed(() => {
        if (pictureChanged.value) {
          return profileForm.value.picture || ''
        }
        return profileImage.value
      })
      const isAdmin = computed(() => Boolean(appStore.user?.is_admin))
      const countryDisplayName = computed(() => {
        const countryCode =
          normalizeCountryCode(appStore.user?.country_code) ||
          normalizeCountryCode(profileForm.value.countryCode) ||
          DEFAULT_COUNTRY_CODE
        return getCountryNameFromCode(countryCode)
      })

      const countryOptions = computed(() => {
        const selectedCountryCode = normalizeCountryCode(profileForm.value.countryCode)
        if (!selectedCountryCode) {
          return COUNTRY_OPTIONS_BASE
        }

        if (COUNTRY_OPTIONS_BASE.some((item) => item.code === selectedCountryCode)) {
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

      const isSettingsDirty = computed(() => {
        return (
          settings.value.currency !== settingsBaseline.value.currency ||
          settings.value.orderUpdates !== settingsBaseline.value.orderUpdates ||
          settings.value.promotionalEmails !== settingsBaseline.value.promotionalEmails ||
          settings.value.quickCheckout !== settingsBaseline.value.quickCheckout
        )
      })

      const isFormDirty = computed(() => isProfileDirty.value || isSettingsDirty.value)

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
        settings.value = {
          currency: loaded.currency || DEFAULT_CURRENCY,
          orderUpdates: loaded.orderUpdates,
          promotionalEmails: loaded.promotionalEmails,
          quickCheckout: loaded.quickCheckout
        }
        syncCurrencyWithCountry()
        settingsBaseline.value = { ...settings.value }
      }

      const openPhotoPicker = () => {
        fileInput.value?.click()
      }

      const onPhotoSelected = (event) => {
        const file = event?.target?.files?.[0]
        event.target.value = ''
        if (!file) {
          return
        }

        if (!file.type?.startsWith('image/')) {
          snackbarText.value = 'Please choose an image file.'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        if (file.size > 2 * 1024 * 1024) {
          snackbarText.value = 'Image too large. Maximum size is 2MB.'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        const reader = new FileReader()
        reader.addEventListener('load', () => {
          const result = String(reader.result || '')
          if (!result.startsWith('data:image/')) {
            snackbarText.value = 'Unsupported image format.'
            snackbarColor.value = 'warning'
            snackbar.value = true
            return
          }
          profileForm.value.picture = result
          selectedPhotoName.value = file.name
          pictureChanged.value = true
        })
        reader.addEventListener('error', () => {
          snackbarText.value = 'Unable to read image file.'
          snackbarColor.value = 'error'
          snackbar.value = true
        })
        reader.readAsDataURL(file)
      }

      const removePhoto = () => {
        profileForm.value.picture = ''
        selectedPhotoName.value = ''
        pictureChanged.value = true
      }

      const saveAll = async () => {
        const name = String(profileForm.value.name || '').trim()
        if (!name) {
          snackbarText.value = 'Full name is required.'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        savingAll.value = true
        try {
          await appStore.updateAccountProfile({
            name,
            countryCode: profileForm.value.countryCode,
            picture: pictureChanged.value ? profileForm.value.picture : undefined
          })

          const existingSettings = loadUserSettings()
          saveUserSettings({
            ...existingSettings,
            displayName: name,
            currency: settings.value.currency,
            orderUpdates: settings.value.orderUpdates,
            promotionalEmails: settings.value.promotionalEmails,
            quickCheckout: settings.value.quickCheckout
          })

          loadProfileForm()
          loadSettings()
          snackbarText.value = 'Profile and preferences saved'
          snackbarColor.value = 'success'
          snackbar.value = true
        } catch (error) {
          const errorMessage = error?.response?.data?.message || error?.message || ''
          const isNotAuthenticated = error?.response?.status === 401 || errorMessage === 'Not authenticated'
          snackbarText.value = isNotAuthenticated ? 'Not authenticated' : errorMessage || 'Failed to save profile and preferences'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          savingAll.value = false
        }
      }

      const fetchOrders = async () => {
        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/orders`, { withCredentials: true })
          orders.value = Array.isArray(response.data) ? response.data : []
        } catch (error) {
          console.error('Failed to fetch orders:', error)
        } finally {
          loading.value = false
        }
      }

      const logout = async () => {
        await appStore.logout()
        router.push('/')
      }

      const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      const formatAmount = (amount) => {
        return formatCurrencyAmount(amount, settings.value.currency || 'USD')
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

      onMounted(async () => {
        void fetchExchangeRates()
        await Promise.allSettled([appStore.refreshCurrentUser(), fetchOrders()])
      })

      return {
        appStore,
        orders,
        loading,
        savingAll,
        snackbar,
        snackbarText,
        snackbarColor,
        fileInput,
        selectedPhotoName,
        settings,
        profileForm,
        profilePreviewImage,
        isAdmin,
        countryDisplayName,
        countryOptions,
        isFormDirty,
        openPhotoPicker,
        onPhotoSelected,
        removePhoto,
        saveAll,
        logout,
        formatDate,
        formatAmount
      }
    }
  }
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 12%, rgba(203, 123, 44, 0.2) 0%, rgba(203, 123, 44, 0) 34%),
    radial-gradient(circle at 88% 10%, rgba(43, 79, 80, 0.16) 0%, rgba(43, 79, 80, 0) 38%),
    linear-gradient(160deg, #f2f6f3 0%, #edf3ef 45%, #eef3f0 100%);
}

.profile-shell {
  padding-top: 48px;
  padding-bottom: 64px;
}

.profile-hero {
  text-align: center;
}

.profile-kicker {
  font-size: 0.78rem;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #b46a22;
  font-weight: 700;
}

.page-title {
  margin-top: 10px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.1rem, 4vw, 3.2rem);
  color: #1c2d30;
}

.profile-subtitle {
  margin: 10px auto 0;
  max-width: 650px;
  color: #5e7076;
  line-height: 1.7;
}

.profile-grid {
  margin-top: 34px;
}

.profile-card,
.settings-card,
.orders-card {
  border: 1px solid #d8e2dd;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 44px rgba(20, 35, 33, 0.08);
}

.profile-card-body {
  text-align: center;
  padding: 28px;
}

.profile-avatar {
  margin: 0 auto;
  border: 3px solid #dce7e2;
  box-shadow: 0 12px 28px rgba(22, 38, 34, 0.18);
}

.profile-name {
  margin-top: 14px;
  font-family: 'Playfair Display', serif;
  font-size: 1.85rem;
  color: #1e2f33;
}

.profile-email {
  margin-top: 6px;
  color: #60737b;
  word-break: break-word;
}

.profile-country {
  margin-top: 4px;
  color: #4f636b;
  font-size: 0.92rem;
}

.avatar-actions {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.avatar-btn {
  text-transform: none;
  font-weight: 700;
}

.photo-name {
  margin-top: 8px;
  color: #60737b;
  font-size: 0.82rem;
}

.profile-stat-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-card {
  border: 1px solid #dbe4df;
  border-radius: 14px;
  background: #f8fbf9;
  padding: 10px;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1f3034;
}

.stat-label {
  margin-top: 2px;
  font-size: 0.8rem;
  color: #6f8086;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.section-title,
.orders-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  color: #1f3034;
  padding: 20px 20px 6px;
}

.section-body {
  padding: 8px 20px 20px;
}

.save-btn,
.logout-btn {
  text-transform: none;
  font-weight: 700;
}

.orders-card {
  min-height: 100%;
}

.empty-orders {
  text-align: center;
  padding: 44px 16px;
}

.empty-orders-icon {
  width: 76px;
  height: 76px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(140deg, #f4dfc7, #f0cfac);
  color: #7b4918;
  display: grid;
  place-items: center;
}

.empty-orders-title {
  margin-top: 16px;
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  color: #1d2d31;
}

.empty-orders-copy {
  margin-top: 8px;
  color: #64767d;
}

.orders-list {
  display: grid;
  gap: 12px;
  margin-top: 6px;
}

.order-item {
  border: 1px solid #d9e3de;
  border-radius: 16px;
  padding: 14px;
  background: linear-gradient(160deg, #fbfdfc 0%, #f5faf7 100%);
}

.order-item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.order-id {
  font-weight: 700;
  color: #1f3034;
}

.order-date {
  margin-top: 4px;
  color: #6e8188;
  font-size: 0.9rem;
}

.order-meta {
  text-align: right;
}

.order-amount {
  font-weight: 800;
  color: #b15f1e;
  margin-bottom: 6px;
}

.order-items {
  margin-top: 10px;
  border-top: 1px dashed #d4ddd8;
  padding-top: 10px;
}

.order-item-line {
  color: #445a61;
  font-size: 0.9rem;
}

.order-item-line + .order-item-line {
  margin-top: 4px;
}

.muted {
  color: #70838a;
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

@media (max-width: 960px) {
  .profile-shell {
    padding-top: 38px;
  }

  .orders-card {
    margin-top: 2px;
  }
}

@media (max-width: 600px) {
  .profile-shell {
    padding-top: 30px;
    padding-bottom: 44px;
  }

  .profile-card-body {
    padding: 20px;
  }

  .avatar-actions {
    grid-template-columns: 1fr;
  }

  .order-item-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .order-meta {
    text-align: left;
  }
}
</style>
