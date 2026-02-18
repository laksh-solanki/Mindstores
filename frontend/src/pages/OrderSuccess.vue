<template>
  <div class="order-success-page">
    <v-container class="success-shell">
      <v-row class="justify-center">
        <v-col cols="12" lg="8" md="9">
          <v-card class="success-card" variant="flat">
            <div class="orb orb-left" />
            <div class="orb orb-right" />
            <v-card-text class="success-body">
              <div class="badge-row">
                <span class="status-chip">
                  <v-icon class="check-icon" icon="mdi-check-circle" size="16" />
                  Payment Confirmed
                </span>
              </div>

              <div class="success-icon-wrap">
                <v-icon class="check-icon" icon="mdi-check-circle " size="54" />
              </div>

              <h1 class="success-title">Order Confirmed</h1>
              <p class="success-text">
                Thank you for your purchase. Your order is now in progress and will appear in your profile.
              </p>

              <div v-if="orderId" class="order-pill">
                <span>Order Reference</span>
                <strong>#{{ orderId }}</strong>
              </div>

              <div class="progress-rail">
                <div class="progress-item is-active">
                  <span class="dot" />
                  <p>Confirmed</p>
                </div>
                <div class="progress-line" />
                <div class="progress-item">
                  <span class="dot" />
                  <p>Processing</p>
                </div>
                <div class="progress-line" />
                <div class="progress-item">
                  <span class="dot" />
                  <p>Shipped</p>
                </div>
              </div>

              <div class="action-row">
                <v-btn
                  class="primary-btn"
                  color="primary"
                  rounded="pill"
                  size="large"
                  @click="$router.push('/profile')"
                >
                  View Orders
                </v-btn>
                <v-btn
                  class="secondary-btn"
                  rounded="pill"
                  size="large"
                  variant="outlined"
                  @click="$router.push('/')"
                >
                  Continue Shopping
                </v-btn>
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
.order-success-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 11% 12%, rgba(203, 120, 41, 0.2) 0%, rgba(203, 120, 41, 0) 35%),
    radial-gradient(circle at 88% 78%, rgba(34, 61, 58, 0.16) 0%, rgba(34, 61, 58, 0) 40%),
    linear-gradient(160deg, #f2f6f3 0%, #ecf2ee 45%, #eef3f0 100%);
}

.success-shell {
  padding-top: 52px;
  padding-bottom: 64px;
}

.success-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid #d8e2dd;
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.93), rgba(246, 250, 247, 0.91));
  box-shadow: 0 26px 56px rgba(18, 33, 31, 0.1);
}

.success-body {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: clamp(28px, 5vw, 56px);
}

.orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(0.2px);
}

.orb-left {
  width: 220px;
  height: 220px;
  left: -70px;
  top: -60px;
  background: radial-gradient(circle, rgba(228, 163, 93, 0.34), rgba(228, 163, 93, 0));
}

.orb-right {
  width: 240px;
  height: 240px;
  right: -84px;
  bottom: -95px;
  background: radial-gradient(circle, rgba(97, 140, 133, 0.22), rgba(97, 140, 133, 0));
}

.badge-row {
  margin-bottom: 14px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid #d7e3de;
  background: #f9fcfa;
  padding: 6px 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: #35524e;
  font-weight: 700;
}

.check-icon {
  color: currentColor;
}

.success-icon-wrap {
  width: 88px;
  height: 88px;
  margin: 0 auto;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #f6fbf9;
  background: linear-gradient(140deg, #25453f, #3a615a);
  box-shadow: 0 16px 30px rgba(30, 56, 52, 0.24);
}

.success-title {
  margin-top: 18px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: #1c2d30;
}

.success-text {
  margin: 12px auto 0;
  max-width: 620px;
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  color: #5f7178;
  line-height: 1.6;
}

.order-pill {
  margin: 22px auto 0;
  border-radius: 14px;
  border: 1px solid #d8e4de;
  background: rgba(255, 255, 255, 0.78);
  width: min(100%, 360px);
  padding: 12px 14px;
  display: grid;
  gap: 4px;
}

.order-pill span {
  color: #6a7d85;
  font-size: 0.78rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
}

.order-pill strong {
  color: #1f3135;
  font-family: 'Manrope', sans-serif;
  font-size: 1.08rem;
  letter-spacing: 0.4px;
}

.progress-rail {
  margin: 24px auto 0;
  width: min(100%, 620px);
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto;
  align-items: center;
  gap: 10px;
}

.progress-line {
  height: 1px;
  background: linear-gradient(90deg, #a8bcb4, #d4e0db);
}

.progress-item {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid #b9c9c2;
  background: #ffffff;
}

.progress-item p {
  margin: 0;
  color: #70838a;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
}

.progress-item.is-active .dot {
  border-color: #2d4d47;
  background: #2d4d47;
}

.progress-item.is-active p {
  color: #1f3438;
}

.action-row {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn {
  text-transform: none;
  font-weight: 700;
}

.primary-btn {
  box-shadow: 0 12px 24px rgba(198, 115, 42, 0.25);
}

@media (max-width: 960px) {
  .success-shell {
    padding-top: 40px;
  }
}

@media (max-width: 600px) {
  .success-shell {
    padding-top: 32px;
    padding-bottom: 44px;
  }

  .success-card {
    border-radius: 18px;
  }

  .progress-rail {
    grid-template-columns: 1fr;
    gap: 8px;
    justify-items: center;
  }

  .progress-line {
    width: 1px;
    height: 16px;
    background: linear-gradient(180deg, #a8bcb4, #d4e0db);
  }

  .action-row {
    gap: 10px;
  }

  .primary-btn,
  .secondary-btn {
    width: 100%;
  }
}
</style>
