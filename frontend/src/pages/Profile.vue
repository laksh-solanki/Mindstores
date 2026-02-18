<template>
  <div class="profile-page">
    <v-container class="profile-shell">
      <section class="profile-hero">
        <p class="profile-kicker">Account</p>
        <h1 class="page-title">My Profile</h1>
        <p class="profile-subtitle">Manage your identity, preferences, and order history in one place.</p>
      </section>

      <v-row align="stretch" class="profile-content">
        <v-col cols="12" lg="4">
          <v-card class="profile-card" variant="flat">
            <v-card-text class="profile-card-body">
              <v-avatar class="profile-avatar" color="primary" size="104">
                <img v-if="profileImage" alt="Profile" :src="profileImage">
                <v-icon v-else color="white" size="56">mdi-account</v-icon>
              </v-avatar>

              <h2 class="profile-name">{{ appStore.user?.name || 'Mindstore User' }}</h2>
              <p class="profile-email">{{ appStore.user?.email || 'No email available' }}</p>

              <div class="quick-stats">
                <div class="stat-item">
                  <p class="stat-value">{{ orders.length }}</p>
                  <p class="stat-label">Orders</p>
                </div>
                <div class="stat-item">
                  <p class="stat-value">{{ isAdmin ? 'Yes' : 'No' }}</p>
                  <p class="stat-label">Admin</p>
                </div>
              </div>

              <v-divider class="my-4" />

              <v-btn
                block
                class="logout-btn"
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
            <v-card-title class="section-title">Preferences</v-card-title>
            <v-card-text class="settings-body">
              <v-text-field
                v-model="settings.displayName"
                density="comfortable"
                label="Display Name"
                variant="outlined"
              />

              <v-select
                v-model="settings.currency"
                density="comfortable"
                :items="currencyOptions"
                label="Preferred Currency"
                variant="outlined"
              />

              <v-switch
                v-model="settings.orderUpdates"
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
                class="save-settings-btn mt-3"
                color="primary"
                :loading="savingSettings"
                rounded="pill"
                @click="saveSettings"
              >
                Save Settings
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="8">
          <v-card class="orders-card" variant="flat">
            <v-card-title class="orders-title">Order History</v-card-title>
            <v-card-text>
              <v-progress-linear v-if="loading" indeterminate />

              <div v-else-if="orders.length === 0" class="empty-orders">
                <div class="empty-orders-icon">
                  <v-icon size="50">mdi-package-variant</v-icon>
                </div>
                <p class="empty-orders-title">No orders yet</p>
                <p class="empty-orders-copy">Your placed orders will appear here with status and totals.</p>
              </div>

              <div v-else class="orders-list">
                <v-card
                  v-for="order in orders"
                  :key="order.order_id"
                  class="order-item"
                  variant="flat"
                >
                  <div class="order-item-head">
                    <div>
                      <p class="order-id">Order #{{ order.order_id }}</p>
                      <p class="order-date">{{ formatDate(order.created_at) }}</p>
                    </div>

                    <div class="order-meta">
                      <p class="order-amount">{{ formatAmount(order.total_amount) }}</p>
                      <v-chip
                        :color="order.status === 'completed' ? 'success' : 'warning'"
                        size="small"
                        variant="flat"
                      >
                        {{ order.status }}
                      </v-chip>
                    </div>
                  </div>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="2800">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
  import axios from 'axios'
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { ALLOWED_CURRENCIES, loadUserSettings, saveUserSettings } from '@/utils/userSettings'

  export default {
    name: 'Profile',
    setup() {
      const router = useRouter()
      const appStore = useAppStore()
      const orders = ref([])
      const loading = ref(false)
      const savingSettings = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const currencyOptions = ALLOWED_CURRENCIES
      const settings = ref({
        displayName: '',
        currency: 'USD',
        orderUpdates: true,
        promotionalEmails: false,
        quickCheckout: true
      })

      const profileImage = computed(() =>
        appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url || null
      )
      const isAdmin = computed(() => Boolean(appStore.user?.is_admin))

      const loadSettings = () => {
        const loaded = loadUserSettings()
        settings.value = {
          displayName: loaded.displayName || appStore.user?.name || '',
          currency: loaded.currency,
          orderUpdates: loaded.orderUpdates,
          promotionalEmails: loaded.promotionalEmails,
          quickCheckout: loaded.quickCheckout
        }
      }

      const saveSettings = async () => {
        savingSettings.value = true
        try {
          const payload = {
            displayName: settings.value.displayName?.trim() || '',
            currency: settings.value.currency,
            orderUpdates: settings.value.orderUpdates,
            promotionalEmails: settings.value.promotionalEmails,
            quickCheckout: settings.value.quickCheckout
          }
          saveUserSettings(payload)

          if (payload.displayName) {
            appStore.user = {
              ...appStore.user,
              name: payload.displayName
            }
          }

          snackbarText.value = 'Settings saved'
          snackbarColor.value = 'success'
          snackbar.value = true
        } catch {
          snackbarText.value = 'Failed to save settings'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          savingSettings.value = false
        }
      }

      const fetchOrders = async () => {
        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/api/orders`, {
            withCredentials: true
          })
          orders.value = response.data
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
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.value.currency || 'USD',
            maximumFractionDigits: 2
          }).format(Number(amount || 0))
        } catch {
          return `$${Number(amount || 0).toFixed(2)}`
        }
      }

      onMounted(() => {
        loadSettings()
        fetchOrders()
      })

      return {
        appStore,
        orders,
        loading,
        logout,
        formatDate,
        formatAmount,
        profileImage,
        isAdmin,
        settings,
        currencyOptions,
        saveSettings,
        savingSettings,
        snackbar,
        snackbarText,
        snackbarColor
      }
    }
  }
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 15%, rgba(206, 124, 43, 0.2) 0%, rgba(206, 124, 43, 0) 36%),
    radial-gradient(circle at 90% 80%, rgba(35, 62, 60, 0.14) 0%, rgba(35, 62, 60, 0) 40%),
    linear-gradient(160deg, #f2f6f3 0%, #ecf2ee 45%, #eef3f0 100%);
}

.profile-shell {
  padding-top: 52px;
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
  font-size: clamp(2rem, 4vw, 3.1rem);
  color: #1c2d30;
}

.profile-subtitle {
  margin: 10px auto 0;
  max-width: 620px;
  color: #5e7076;
  line-height: 1.7;
}

.profile-content {
  margin-top: 34px;
}

.profile-card,
.settings-card,
.orders-card {
  border: 1px solid #d8e2dd;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 40px rgba(20, 35, 33, 0.08);
}

.profile-card-body {
  padding: 26px;
  text-align: center;
}

.profile-avatar {
  border: 2px solid #d8e2dd;
  box-shadow: 0 10px 24px rgba(24, 38, 35, 0.15);
}

.profile-name {
  margin-top: 14px;
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: #1f2f33;
}

.profile-email {
  margin-top: 6px;
  color: #6a7c83;
  word-break: break-word;
}

.quick-stats {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat-item {
  border: 1px solid #dbe4df;
  border-radius: 12px;
  background: #f9fbfa;
  padding: 10px;
}

.stat-value {
  font-weight: 800;
  color: #1f3034;
}

.stat-label {
  margin-top: 2px;
  font-size: 0.8rem;
  color: #71828a;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.logout-btn,
.save-settings-btn {
  text-transform: none;
  font-weight: 700;
}

.section-title,
.orders-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2f33;
}

.settings-body {
  padding-top: 6px;
}

.empty-orders {
  text-align: center;
  padding: 36px 14px;
}

.empty-orders-icon {
  width: 74px;
  height: 74px;
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
  gap: 10px;
}

.order-item {
  border: 1px solid #d9e3de;
  border-radius: 14px;
  background: #fbfdfb;
  padding: 14px;
}

.order-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.order-id {
  font-weight: 700;
  color: #1f3034;
}

.order-date {
  margin-top: 4px;
  color: #70828a;
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

@media (max-width: 960px) {
  .profile-shell {
    padding-top: 40px;
  }
}

@media (max-width: 600px) {
  .profile-shell {
    padding-top: 32px;
    padding-bottom: 44px;
  }

  .profile-card-body {
    padding: 20px;
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
