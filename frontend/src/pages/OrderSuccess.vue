<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="9" lg="7">
        <v-card rounded="xl" variant="flat" border elevation="1">
          <v-card-text class="d-flex flex-column align-center w-100 pa-6 pa-md-8 text-center">
            <v-chip class="mb-4" color="success" variant="tonal">
              <v-icon class="me-1" icon="mdi-check-circle" size="16" />
              Payment Confirmed
            </v-chip>

            <v-avatar color="success" size="40" variant="tonal">
              <v-icon icon="mdi-check-circle" size="40" />
            </v-avatar>

            <h1 class="text-h4 text-md-h3 font-weight-bold mt-5">Order Confirmed</h1>
            <p class="text-body-1 text-medium-emphasis mt-3">
              Thank you for your purchase. Your order is now in progress and will appear in your profile.
            </p>

            <v-sheet v-if="orderId" class="pa-3 mt-5" border rounded="lg">
              <p class="text-caption text-medium-emphasis">Order Reference</p>
              <p class="text-subtitle-1 font-weight-bold mt-1">#{{ orderId }}</p>
            </v-sheet>

            <v-timeline align="center" class="mt-6" density="compact" side="end" direction="horizontal" truncate-line="both">
              <v-timeline-item dot-color="success" fill-dot size="small">
                Confirmed
              </v-timeline-item>
              <v-timeline-item dot-color="primary" size="small">
                Processing
              </v-timeline-item>
              <v-timeline-item dot-color="grey" size="small">
                Shipped
              </v-timeline-item>
            </v-timeline>

            <div class="d-flex flex-column flex-sm-row justify-center ga-3 mt-6">
              <v-btn color="teal-darken-2" rounded="lg" size="large" @click="$router.push('/profile')">
                View Orders
              </v-btn>
              <v-btn color="teal-darken-1" rounded="lg" size="large" variant="outlined" @click="$router.push('/')">
                Continue Shopping
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
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
      orderId.value = route.query.order_id || ''
    })

    return {
      orderId
    }
  }
}
</script>
