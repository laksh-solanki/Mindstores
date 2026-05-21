<template>
  <v-container class="bespoke-success-container" fluid>
    <v-row justify="center">
      <v-col cols="12" lg="7" md="9">
        <!-- macOS mockup window frame -->
        <div class="gallery-frame success-frame-window">
          <div class="frame-header">
            <div class="frame-dots">
              <span class="dot-red" @click="$router.push('/')" />
              <span class="dot-yellow" />
              <span class="dot-green" />
            </div>
            <div class="frame-title-display">payment_confirmed.json</div>
          </div>
          
          <div class="success-body text-center pa-6 pa-md-10">
            <!-- Custom Flat Success Badge -->
            <div class="custom-success-badge mb-5">
              <v-icon class="mr-1" icon="mdi-check-circle" size="18" />
              Payment Confirmed
            </div>

            <!-- Serif Highlight Title -->
            <h1 class="success-title">Order <span class="highlight-serif">Confirmed</span></h1>
            <p class="success-subtitle mt-3">
              Thank you for your purchase. Your order is now in progress and will appear in your profile.
            </p>

            <!-- Flat Receipt Reference Box -->
            <div v-if="orderId" class="flat-receipt-box mt-6">
              <span class="receipt-label">ORDER REFERENCE</span>
              <strong class="receipt-value mt-1">#{{ orderId }}</strong>
            </div>

            <!-- Custom Step Timeline -->
            <div class="flat-step-timeline mt-8 w-100">
              <div class="step-item active">
                <div class="step-node">✓</div>
                <span class="step-label">Confirmed</span>
              </div>
              <div class="step-connector active" />
              <div class="step-item active-current">
                <div class="step-node">2</div>
                <span class="step-label">Processing</span>
              </div>
              <div class="step-connector" />
              <div class="step-item">
                <div class="step-node">3</div>
                <span class="step-label">Shipped</span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="d-flex flex-column flex-sm-row justify-center ga-3 mt-8">
              <v-btn
                class="action-btn-flat px-8"
                rounded="0"
                size="large"
                variant="flat"
                @click="$router.push('/profile')"
              >
                View Orders
              </v-btn>
              <v-btn
                class="action-btn-flat-outline px-8"
                rounded="0"
                size="large"
                variant="outlined"
                @click="$router.push('/')"
              >
                Continue Shopping
              </v-btn>
            </div>
          </div>
        </div>
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

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.bespoke-success-container {
  min-height: 100vh;
  background: #f8fafc;
  padding: 80px max(16px, 4vw) 120px !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ════════════════════════════════ macOS FRAME ══ */
.gallery-frame {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 8px 8px 0px #0f172a;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.frame-header {
  height: 38px;
  background: #f1f5f9;
  border-bottom: 1px solid #0f172a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  position: relative;
}

.frame-dots {
  display: flex;
  gap: 6px;
}

.dot-red, .dot-yellow, .dot-green {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
}
.dot-red { background: #ef4444; cursor: pointer; }
.dot-yellow { background: #eab308; }
.dot-green { background: #22c55e; }

.frame-title-display {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

/* ════════════════════════════════ BODY ════════ */
.success-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ════════════════════════════════ BADGES ══════ */
.custom-success-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #0f766e;
  border: 1px solid #0f766e;
  padding: 4px 12px;
  background: #f0fdf4;
}

.success-title {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.highlight-serif {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}

.success-subtitle {
  font-size: 15px;
  color: #64748b;
  max-width: 460px;
  line-height: 1.6;
}

/* ════════════════════════════════ RECEIPT BOX ═ */
.flat-receipt-box {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #0f172a;
  padding: 12px 24px;
  background: #ffffff;
  box-shadow: 4px 4px 0px #0d9488;
}

.receipt-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #64748b;
}

.receipt-value {
  font-family: monospace;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

/* ════════════════════════════════ STEP TIMELINE ═ */
.flat-step-timeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 440px;
  margin: 32px auto;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.step-node {
  width: 32px;
  height: 32px;
  border: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  background-color: #ffffff;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.step-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.step-connector {
  flex-grow: 1;
  height: 2px;
  background-color: #e2e8f0;
  margin: -16px 8px 0;
  transition: background-color 0.2s ease;
}

/* Active and Current States */
.step-item.active .step-node {
  background-color: #0d9488;
  border-color: #0f172a;
  color: #ffffff;
}
.step-item.active .step-label {
  color: #0f766e;
}

.step-item.active-current .step-node {
  background-color: #ffffff;
  border-color: #0d9488;
  border-width: 2px;
  color: #0d9488;
}
.step-item.active-current .step-label {
  color: #0f172a;
}

.step-connector.active {
  background-color: #0f172a;
}

/* ════════════════════════════════ BUTTONS ═════ */
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
  color: #0f172a !important;
  font-weight: 800 !important;
  font-size: 14px !important;
  letter-spacing: 0.05em !important;
  border: 1px solid #0f172a !important;
  transition: all 0.2s ease !important;
}
.action-btn-flat-outline:hover {
  background: #f1f5f9 !important;
}
</style>
