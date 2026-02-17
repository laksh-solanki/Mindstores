<template>
  <div class="profile-page">
    <v-container class="py-12">
      <h1 class="page-title">My Profile</h1>

      <v-row class="mt-8">
        <v-col cols="12" md="4">
          <v-card class="profile-card">
            <v-card-text class="text-center">
              <v-avatar class="mb-4" color="primary" size="100">
                <img v-if="appStore.user?.picture" alt="Profile" :src="appStore.user.picture">
                <v-icon v-else color="white" size="60">mdi-account</v-icon>
              </v-avatar>
              <h2 class="profile-name">{{ appStore.user?.name }}</h2>
              <p class="profile-email">{{ appStore.user?.email }}</p>
            </v-card-text>
            <v-card-actions>
              <v-btn
                block
                color="error"
                variant="text"
                @click="logout"
              >
                <v-icon left>mdi-logout</v-icon>
                Logout
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <v-card class="orders-card">
            <v-card-title class="card-title">Order History</v-card-title>
            <v-card-text>
              <v-progress-linear v-if="loading" indeterminate />

              <div v-else-if="orders.length === 0" class="text-center py-8">
                <v-icon color="grey" size="60">mdi-package-variant</v-icon>
                <p class="mt-4 text-subtitle-1">No orders yet</p>
              </div>

              <div v-else>
                <v-list>
                  <v-list-item
                    v-for="order in orders"
                    :key="order.order_id"
                    class="order-item"
                  >
                    <v-list-item-title class="order-id">
                      Order #{{ order.order_id }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatDate(order.created_at) }}
                    </v-list-item-subtitle>
                    <template #append>
                      <div class="text-right">
                        <div class="order-amount">
                          ${{ order.total_amount.toFixed(2) }}
                        </div>
                        <v-chip
                          :color="order.status === 'completed' ? 'success' : 'warning'"
                          size="small"
                        >
                          {{ order.status }}
                        </v-chip>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
  import axios from 'axios'
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app' // Switched to useAppStore

  export default {
    name: 'Profile',
    setup() {
      const router = useRouter()
      const appStore = useAppStore()
      const orders = ref([])
      const loading = ref(false)

      // REFIX: Vite compatible env var
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

      onMounted(() => {
        fetchOrders()
      })

      return {
        appStore,
        orders,
        loading,
        logout,
        formatDate
      }
    }
  }
</script>

<style scoped>
.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #2F4F4F;
  text-align: center;
}

.profile-card,
.orders-card {
  border-radius: 12px;
}

.profile-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2F4F4F;
  margin-bottom: 0.5rem;
}

.profile-email {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  color: #78909C;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2F4F4F;
}

.order-item {
  border-bottom: 1px solid #E2E8F0;
  padding: 1rem 0;
}

.order-id {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  color: #1A202C;
}

.order-amount {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  color: #2F4F4F;
  margin-bottom: 0.5rem;
}
</style>
