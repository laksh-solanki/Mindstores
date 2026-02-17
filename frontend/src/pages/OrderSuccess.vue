<template>
  <div class="order-success-page">
    <v-container class="py-12">
      <v-row class="justify-center">
        <v-col cols="12" md="6">
          <v-card class="success-card text-center">
            <v-card-text class="py-12">
              <div>
                <v-icon color="success" size="80">mdi-check-circle</v-icon>
                <h1 class="success-title mt-4">Order Successful!</h1>
                <p class="success-text mt-2">
                  Thank you for your purchase. Your order has been confirmed.
                </p>
                <p v-if="orderId" class="text-caption text-grey mt-1">
                  Order #{{ orderId }}
                </p>

                <div class="mt-8">
                  <v-btn
                    color="primary"
                    size="large"
                    @click="$router.push('/profile')"
                  >
                    View Orders
                  </v-btn>
                  <v-btn
                    class="ml-4"
                    size="large"
                    variant="outlined"
                    @click="$router.push('/')"
                  >
                    Continue Shopping
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
  import { onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'

  export default {
    name: 'OrderSuccess',
    setup() {
      const route = useRoute()
      const orderId = ref('')

      onMounted(() => {
        // REFIX: Read order_id from query params
        orderId.value = route.query.order_id || ''
      })

      return {
        orderId
      }
    }
  }
</script>

<style scoped>
.success-card {
  border-radius: 12px;
}

.success-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 700;
  color: #2F4F4F;
}

.success-text {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  color: #5A6A85;
  line-height: 1.6;
}
</style>
