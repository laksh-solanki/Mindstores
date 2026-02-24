<template>
  <div class="login-page">
    <v-container class="login-shell">
      <v-row class="login-row" no-gutters>
        <v-col class="hero-col" cols="12" lg="7">
          <div class="hero-panel">
            <p class="hero-kicker">Members Access</p>
            <h1 class="hero-title">Bring calm to your home, one intentional piece at a time.</h1>
            <p class="hero-copy">
              Sign in to save your cart, track orders, and get early access to limited seasonal drops.
            </p>

            <div class="hero-stats">
              <div class="stat-chip">
                <span class="stat-value">300+</span>
                <span class="stat-label">Products</span>
              </div>
              <div class="stat-chip">
                <span class="stat-value">24h</span>
                <span class="stat-label">Dispatch</span>
              </div>
              <div class="stat-chip">
                <span class="stat-value">4.8/5</span>
                <span class="stat-label">Ratings</span>
              </div>
            </div>
          </div>
        </v-col>

        <v-col class="form-col" cols="12" lg="5">
          <div class="auth-card">
            <div class="brand-pill">
              <v-img alt="logo" class="brand-mark" src="../assets/logo.svg" />
              <span class="brand-text">MINDSTORE</span>
            </div>

            <h2 class="auth-title">Welcome Back</h2>
            <p class="auth-subtitle">Continue with Google to access your account securely.</p>

            <v-btn
              block
              class="google-btn"
              :disabled="appStore.loading"
              :loading="appStore.loading"
              rounded="pill"
              size="x-large"
              variant="flat"
              @click="loginWithGoogle"
            >
              <v-img class="pr-2" src="../assets/Google-logo.png" width="35 " />
              Continue with Google
            </v-btn>

            <div class="trust-list">
              <div class="trust-item">
                <v-icon size="18">mdi-check-circle</v-icon>
                <span>Secure sign-in powered by Firebase</span>
              </div>
              <div class="trust-item">
                <v-icon size="18">mdi-check-circle</v-icon>
                <span>Saved cart and faster checkout</span>
              </div>
              <div class="trust-item">
                <v-icon size="18">mdi-check-circle</v-icon>
                <span>Order history and status tracking</span>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
  import { onMounted, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'

  export default {
    name: 'Login',
    setup() {
      const appStore = useAppStore()
      const router = useRouter()

      onMounted(() => {
        if (appStore.isAuthenticated) {
          router.replace('/')
        }
      })

      watch(
        () => appStore.isAuthenticated,
        (isAuthenticated) => {
          if (isAuthenticated) {
            router.replace('/')
          }
        },
      )

      const loginWithGoogle = async () => {
        await appStore.loginWithGoogle()
      }

      return {
        appStore,
        loginWithGoogle
      }
    }
  }
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 18%, rgba(205, 122, 41, 0.24) 0%, rgba(205, 122, 41, 0) 36%),
    radial-gradient(circle at 88% 76%, rgba(58, 87, 79, 0.16) 0%, rgba(58, 87, 79, 0) 40%),
    linear-gradient(160deg, #f3f7f4 0%, #eef3ef 48%, #edf1ee 100%);
}

.login-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-top: 20px;
  padding-bottom: 20px;
}

.login-row {
  width: 100%;
  border: 1px solid #dbe4df;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(24, 36, 34, 0.1);
  background: #f4f8f5;
}

.hero-col {
  background:
    linear-gradient(138deg, rgba(19, 34, 37, 0.97), rgba(34, 55, 58, 0.94)),
    url('https://images.unsplash.com/photo-1486946255434-2466348c2166?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400');
  background-size: cover;
  background-position: center;
  color: #f4efe7;
}

.hero-panel {
  min-height: 620px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px clamp(24px, 5vw, 58px);
}

.hero-kicker {
  text-transform: uppercase;
  letter-spacing: 1.8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #d9bc95;
}

.hero-title {
  margin-top: 18px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1.08;
}

.hero-copy {
  margin-top: 18px;
  max-width: 560px;
  font-size: 1rem;
  line-height: 1.75;
  color: rgba(243, 236, 228, 0.86);
}

.hero-stats {
  margin-top: 30px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-chip {
  border: 1px solid rgba(233, 218, 197, 0.28);
  border-radius: 14px;
  background: rgba(245, 239, 230, 0.08);
  padding: 12px 14px;
  min-width: 112px;
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.08rem;
  font-weight: 700;
  color: #f6ede1;
}

.stat-label {
  margin-top: 2px;
  font-size: 0.76rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(232, 219, 200, 0.72);
}

.form-col {
  background: linear-gradient(160deg, #f9fbfa 0%, #f1f5f2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(22px, 4vw, 34px);
}

.auth-card {
  width: 100%;
  max-width: 430px;
  border: 1px solid #dbe4df;
  border-radius: 22px;
  background: #ffffff;
  padding: clamp(22px, 4vw, 32px);
  box-shadow: 0 16px 38px rgba(24, 36, 34, 0.08);
}

.brand-pill {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #d8e1dc;
  border-radius: 999px;
  padding: 6px 12px 6px 6px;
}

.brand-mark {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  background: #203235;
  color: #f4efe7;
  display: grid;
  place-items: center;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.brand-text {
  font-size: 0.78rem;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  color: #2f4247;
  font-weight: 700;
}

.auth-title {
  margin-top: 24px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 2.6rem);
  color: #1a292d;
  line-height: 1.1;
}

.auth-subtitle {
  margin-top: 10px;
  font-family: 'Manrope', sans-serif;
  color: #586a71;
  line-height: 1.7;
}

.google-btn {
  margin-top: 24px;
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.1px;
  color: #ffffff;
  background: linear-gradient(120deg, #cb782b, #b35e1e);
  box-shadow: 0 12px 28px rgba(198, 113, 38, 0.26);
}

.trust-list {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475a61;
  font-size: 0.92rem;
}

.trust-item :deep(.v-icon) {
  color: #2f6f62;
}

@media (max-width: 960px) {
  .login-shell {
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .hero-panel {
    min-height: 420px;
  }
}

@media (max-width: 600px) {
  .login-row {
    border-radius: 20px;
  }

  .hero-panel {
    min-height: 340px;
  }

  .auth-card {
    border-radius: 18px;
  }
}
</style>
