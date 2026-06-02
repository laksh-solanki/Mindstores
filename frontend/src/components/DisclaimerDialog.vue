<template>
  <v-dialog v-model="dialog" max-width="500" persistent>
    <v-card class="disclaimer-card" elevation="0">
      <div class="card-header pa-4 pb-0 d-flex justify-space-between align-center">
        <v-icon color="warning" size="28">mdi-alert-circle-outline</v-icon>
        <button aria-label="Close dialog" class="close-btn" @click="closeDialog">
          <v-icon size="20">mdi-close</v-icon>
        </button>
      </div>
      
      <v-card-text class="pt-2 pb-6 px-6 text-center">
        <h2 class="disclaimer-title mb-3">Welcome to Mindstores</h2>
        <p class="disclaimer-text">
          Mindstores is a portfolio demonstration of an online storefront. Products, prices, promotions, checkout
          options, and order updates are sample content. Please do not enter real payment information. No real purchase,
          payment, or delivery is created.
        </p>
      </v-card-text>
      
      <v-card-actions class="px-6 pb-6 pt-0 justify-center">
        <v-btn
          class="accept-btn px-8"
          color="teal-darken-1"
          rounded="0"
          variant="flat"
          @click="closeDialog"
        >
          I Understand
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { onMounted, ref } from 'vue'

  const dialog = ref(false)

  onMounted(() => {
    const hasSeenDisclaimer = localStorage.getItem('mindstores_disclaimer_seen')
    if (!hasSeenDisclaimer) {
      dialog.value = true
    }
  })

  function closeDialog() {
    dialog.value = false
    localStorage.setItem('mindstores_disclaimer_seen', 'true')
  }
</script>

<style scoped>
.disclaimer-card {
  border: 2px solid #0f172a;
  border-radius: 0 !important;
  background-color: #ffffff;
}

.disclaimer-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.disclaimer-text {
  font-size: 15px;
  color: #475569;
  line-height: 1.6;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748b;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #0f172a;
}

.accept-btn {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Dark theme overrides */
:global(.v-theme--dark .disclaimer-card) {
  background: #121824 !important;
  border-color: #f8fafc !important;
}
:global(.v-theme--dark .disclaimer-title) {
  color: #f8fafc !important;
}
:global(.v-theme--dark .disclaimer-text) {
  color: #cbd5e1 !important;
}
:global(.v-theme--dark .close-btn) {
  color: #94a3b8 !important;
}
:global(.v-theme--dark .close-btn:hover) {
  color: #f8fafc !important;
}
</style>
