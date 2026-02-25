<template>
  <div class="auth-page">
    <div class="bg-orb orb-a" />
    <div class="bg-orb orb-b" />

    <v-container class="auth-shell">
      <v-row class="auth-frame" no-gutters>
        <v-col class="auth-aside" cols="12" lg="6">
          <div class="aside-overlay" />
          <div class="aside-content">
            <div class="brand-pill">
              <v-img alt="logo" class="brand-mark" src="../assets/logo.svg" />
              <span class="brand-text">Mindstore</span>
            </div>

            <p class="aside-kicker">Member Space</p>
            <h1 class="aside-title">Curated essentials. Seamless account access.</h1>
            <p class="aside-copy">Sign in to keep your cart, profile, and orders perfectly synced.</p>

            <div class="feature-list">
              <article class="feature-item">
                <v-icon size="18">mdi-check-circle</v-icon>
                <div>
                  <h3>Protected Session</h3>
                  <p>Secure login with verified account context.</p>
                </div>
              </article>
              <article class="feature-item">
                <v-icon size="18">mdi-clock-fast</v-icon>
                <div>
                  <h3>Faster Checkout</h3>
                  <p>Saved profile details for quicker payments.</p>
                </div>
              </article>
              <article class="feature-item">
                <v-icon size="18">mdi-shield-check</v-icon>
                <div>
                  <h3>Reliable History</h3>
                  <p>Track every order and status update easily.</p>
                </div>
              </article>
            </div>
          </div>
        </v-col>

        <v-col class="auth-main" cols="12" lg="6">
          <div class="form-card">
            <p class="form-kicker">Welcome Back</p>
            <h2 class="form-title">Log In</h2>
            <p class="form-subtitle">Continue with your email account.</p>

            <v-alert
              v-if="errorMessage"
              class="mt-3"
              density="comfortable"
              type="error"
              variant="tonal"
            >
              {{ errorMessage }}
            </v-alert>

            <v-form class="mt-4" @submit.prevent="submitLogin">
              <v-text-field
                v-model="email"
                autocomplete="email"
                density="comfortable"
                label="Email"
                prepend-inner-icon="mdi-email"
                rounded="lg"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="password"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                autocomplete="current-password"
                class="mt-1"
                density="comfortable"
                label="Password"
                prepend-inner-icon="mdi-lock-outline"
                rounded="lg"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showPassword = !showPassword"
              />

              <v-btn
                block
                class="submit-btn mt-3"
                :disabled="appStore.loading || !email.trim() || !password"
                :loading="appStore.loading"
                rounded="pill"
                size="large"
                type="submit"
                variant="flat"
              >
                Continue
              </v-btn>
            </v-form>

            <div class="divider" />
            <p class="switch-copy">
              New to Mindstore?
              <router-link class="switch-link" to="/create-account">Create account</router-link>
            </p>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
  import { onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { getAuthErrorMessage } from '@/utils/authErrors'

  export default {
    name: 'Login',
    setup() {
      const appStore = useAppStore()
      const router = useRouter()
      const email = ref('')
      const password = ref('')
      const showPassword = ref(false)
      const errorMessage = ref('')

      const redirectIfAuthenticated = () => {
        if (appStore.isAuthenticated) {
          router.replace('/')
        }
      }

      onMounted(() => {
        redirectIfAuthenticated()
      })

      watch(
        () => appStore.isAuthenticated,
        () => {
          redirectIfAuthenticated()
        },
      )

      const submitLogin = async () => {
        errorMessage.value = ''
        try {
          await appStore.loginWithEmail(email.value, password.value)
          router.replace('/')
        } catch (error) {
          errorMessage.value = getAuthErrorMessage(error)
        }
      }

      return {
        appStore,
        email,
        password,
        showPassword,
        errorMessage,
        submitLogin
      }
    }
  }
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(154deg, #f4f8f5 0%, #edf3ef 44%, #e8efe9 100%);
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  pointer-events: none;
}

.orb-a {
  width: 420px;
  height: 420px;
  top: -140px;
  left: -120px;
  background: radial-gradient(circle, rgba(198, 114, 36, 0.24) 0%, rgba(198, 114, 36, 0) 68%);
}

.orb-b {
  width: 520px;
  height: 520px;
  right: -180px;
  bottom: -220px;
  background: radial-gradient(circle, rgba(29, 79, 79, 0.2) 0%, rgba(29, 79, 79, 0) 68%);
}

.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
  padding-top: 22px;
  padding-bottom: 22px;
}

.auth-frame {
  width: 100%;
  border: 1px solid #d5dfda;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 24px 56px rgba(20, 35, 33, 0.11);
  backdrop-filter: blur(10px);
}

.auth-aside {
  position: relative;
  color: #f5f0e8;
  background:
    linear-gradient(148deg, rgba(18, 36, 39, 0.92), rgba(35, 58, 62, 0.9)),
    url('https://images.unsplash.com/photo-1486946255434-2466348c2166?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400');
  background-size: cover;
  background-position: center;
}

.aside-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 84% 12%, rgba(212, 154, 95, 0.3), rgba(212, 154, 95, 0));
}

.aside-content {
  position: relative;
  z-index: 1;
  min-height: 100%;
  padding: clamp(24px, 4vw, 42px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-pill {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(241, 230, 214, 0.38);
  border-radius: 999px;
  padding: 6px 12px 6px 6px;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 9px;
}

.brand-text {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.05px;
  text-transform: uppercase;
}

.aside-kicker {
  margin-top: 22px;
  font-size: 0.73rem;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: #ddc29f;
  font-weight: 700;
}

.aside-title {
  margin-top: 10px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.5rem, 2.3vw, 2.15rem);
  line-height: 1.18;
}

.aside-copy {
  margin-top: 12px;
  font-size: 0.93rem;
  line-height: 1.68;
  color: rgba(245, 240, 230, 0.9);
}

.feature-list {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.feature-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  border: 1px solid rgba(226, 214, 198, 0.26);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(247, 240, 230, 0.08);
}

.feature-item :deep(.v-icon) {
  color: #e1c9a8;
  margin-top: 1px;
}

.feature-item h3 {
  font-size: 0.87rem;
  color: #f2eadf;
}

.feature-item p {
  margin-top: 2px;
  font-size: 0.8rem;
  color: rgba(245, 240, 230, 0.74);
}

.auth-main {
  padding: clamp(20px, 3.4vw, 36px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(162deg, rgba(252, 253, 252, 0.94), rgba(244, 248, 245, 0.92));
}

.form-card {
  width: 100%;
  max-width: 430px;
  border: 1px solid #d8e2dd;
  border-radius: 18px;
  background: #ffffff;
  padding: clamp(20px, 3vw, 28px);
  box-shadow: 0 14px 34px rgba(20, 35, 32, 0.08);
}

.form-kicker {
  font-size: 0.73rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #b06925;
  font-weight: 700;
}

.form-title {
  margin-top: 8px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.55rem, 2vw, 1.95rem);
  color: #1b2b30;
}

.form-subtitle {
  margin-top: 6px;
  color: #607178;
  font-size: 0.9rem;
}

.submit-btn {
  text-transform: none;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(122deg, #c7742c, #b25d1d);
  box-shadow: 0 12px 22px rgba(188, 106, 35, 0.26);
}

.divider {
  margin-top: 14px;
  height: 1px;
  background: linear-gradient(to right, transparent, #d5dfda, transparent);
}

.switch-copy {
  margin-top: 12px;
  text-align: center;
  font-size: 0.9rem;
  color: #617279;
}

.switch-link {
  text-decoration: none;
  color: #27515b;
  font-weight: 700;
}

.switch-link:hover {
  text-decoration: underline;
}

@media (max-width: 1264px) {
  .aside-content {
    min-height: 360px;
  }
}

@media (max-width: 960px) {
  .auth-shell {
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .auth-frame {
    border-radius: 20px;
  }

  .aside-content {
    min-height: 300px;
  }
}

@media (max-width: 600px) {
  .aside-content {
    min-height: 240px;
    padding: 18px;
  }

  .feature-list {
    gap: 8px;
  }

  .form-card {
    border-radius: 14px;
  }

  .auth-main {
    padding: 16px;
  }
}
</style>
