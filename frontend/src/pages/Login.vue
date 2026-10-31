<template>
  <v-container class="bespoke-auth-container" fluid>  
    <!-- Center stage Grid wrapper -->
    <div class="auth-grid-wrapper">
      <div class="gallery-frame auth-frame">
        <!-- Form container -->
        <div class="auth-card-body">

          <div class="brand-tagline">
            <span class="tag-label">SECURE GATEWAY</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">ACCOUNT LOGIN</span>
          </div>

          <h1 class="auth-title">Welcome <span class="highlight-serif">back</span></h1>
          <p class="auth-subtitle">Sign in to continue to your Mindstore account.</p>

          <BaseAlert
            v-if="errorMessage"
            class="mb-4"
            :message="errorMessage"
            type="error"
          />

          <v-form class="auth-form-fields" @submit.prevent="submitLogin">
            <v-text-field
              v-model="email"
              autocomplete="email"
              class="auth-text-field"
              density="comfortable"
              label="Email address"
              prepend-inner-icon="mdi-email-outline"
              type="email"
              variant="outlined"
            />

            <v-text-field
              v-model="password"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              autocomplete="current-password"
              class="auth-text-field"
              density="comfortable"
              label="Password"
              prepend-inner-icon="mdi-lock-outline"
              :type="showPassword ? 'text' : 'password'"
              variant="outlined"
              @click:append-inner="showPassword = !showPassword"
            />

            <v-alert
              class="secure-guard-alert mt-2"
              color="teal-darken-1"
              density="compact"
              type="info"
              variant="tonal"
            >
              Secure login enabled and session guarded.
            </v-alert>

            <v-btn
              block
              class="btn-store-primary mt-4"
              :disabled="isSubmitDisabled"
              elevation="0"
              :loading="appStore.loading"
              rounded="0"
              type="submit"
            >
              Access Account
            </v-btn>
          </v-form>

          <div class="auth-divider-row">
            <span class="auth-divider-line" />
            <span class="auth-divider-text">or</span>
            <span class="auth-divider-line" />
          </div>

          <v-btn
            block
            class="btn-store-outline"
            :disabled="appStore.loading"
            elevation="0"
            :loading="appStore.loading"
            prepend-icon="mdi-google"
            rounded="0"
            @click="submitGoogleLogin"
          >
            Continue with Google
          </v-btn>

          <div class="auth-footer-prompt">
            <p>
              New to Mindstore?
              <router-link class="auth-redirect-link" to="/create-account">Create an account</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { getAuthErrorMessage } from '@/utils/authErrors'

  export default {
    name: 'Login',
    components: {
      BaseAlert
    },
    setup() {
      const appStore = useAppStore()
      const route = useRoute()
      const router = useRouter()
      const email = ref('')
      const password = ref('')
      const showPassword = ref(false)
      const errorMessage = ref('')

      const isSubmitDisabled = computed(() => {
        return appStore.loading || !email.value.trim() || !password.value
      })

      const redirectIfAuthenticated = () => {
        if (appStore.isAuthenticated) {
          router.replace('/')
        }
      }

      onMounted(() => {
        redirectIfAuthenticated()
        if (route.query.oauth_error) {
          const err = String(route.query.oauth_error)
          if (err === 'oauth_not_configured') {
            errorMessage.value = 'Google OAuth is not configured on the backend.'
          } else if (err === 'invalid_state') {
            errorMessage.value = 'Sign in was cancelled or expired. Please try again.'
          } else {
            errorMessage.value = 'Unable to complete Google sign-in. Please try again.'
          }
        }
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

      const submitGoogleLogin = () => {
        errorMessage.value = ''
        try {
          appStore.loginWithGoogle('/')
        } catch (error) {
          errorMessage.value = getAuthErrorMessage(error)
        }
      }

      const goBack = () => {
        const historyState = window.history.state
        const hasInAppBack = typeof historyState?.back === 'string' && historyState.back.length > 0
        if (hasInAppBack) {
          router.go(-1)
          return
        }
        router.push('/')
      }

      return {
        appStore,
        email,
        password,
        showPassword,
        errorMessage,
        isSubmitDisabled,
        submitLogin,
        submitGoogleLogin,
        goBack
      }
    }
  }
</script>

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.bespoke-auth-container {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px max(16px, 4vw) 40px !important;
  display: flex;
  flex-direction: column;
}

/* ════════════════════════════════ HEADER BAR ══ */
.auth-header-bar {
  display: flex;
  align-items: center;
  margin-bottom: 40px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.back-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: color 0.2s ease;
}
.back-btn:hover {
  color: #0d9488;
}
.underline-hover {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transition: transform 0.25s ease;
  transform-origin: right;
  transform: scaleX(0);
}
.back-btn:hover .underline-hover {
  transform: scaleX(1);
  transform-origin: left;
}

/* ════════════════════════════════ GRID WRAPPER ═ */
.auth-grid-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

/* ════════════════════════════════ WINDOW FRAME ═ */
.auth-frame {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border: 1px solid #0f172a;

}
.auth-card-body {
  padding: 32px 32px;
}


/* ════════════════════════════════ TYPOGRAPHY ══ */
.brand-tagline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}
.tag-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #0f766e;
}
.tag-dot {
  font-size: 10px;
  color: #cbd5e1;
}

.auth-title {
  font-size: clamp(24px, 3.5vw, 32px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin: 0 0 8px;
}
.highlight-serif {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}

.auth-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px;
  font-weight: 500;
}

/* ════════════════════════════════ FORM FIELDS ══ */
.auth-form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-text-field :deep(.v-field) {
  border-radius: 0 !important;
  border-color: #cbd5e1 !important;
}

.auth-text-field :deep(.v-field--focused) {
  border-color: #0f172a !important;
}

.secure-guard-alert {
  border-radius: 0 !important;
  font-size: 12px !important;
}

/* ════════════════════════════════ BUTTONS ═════ */
.action-btn-auth {
  height: 50px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  background: #0f172a !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  transition: background-color 0.2s ease !important;
}
.action-btn-auth:hover:not(:disabled) {
  background: #1e293b !important;
}

.auth-divider-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
}
.auth-divider-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}
.auth-divider-text {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.google-btn-auth {
  height: 50px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  background: transparent !important;
  transition: border-color 0.2s ease, background-color 0.2s ease !important;
}
.google-btn-auth:hover:not(:disabled) {
  border-color: #0f172a !important;
  background: #f8fafc !important;
}

.auth-footer-prompt {
  margin-top: 24px;
  text-align: center;
}
.auth-footer-prompt p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}
.auth-redirect-link {
  font-weight: 700;
  color: #0d9488;
  text-decoration: none;
  transition: color 0.15s ease;
}
.auth-redirect-link:hover {
  color: #0f766e;
  text-decoration: underline;
}

/* ════════════════════════════════ RESPONSIVE ═════ */
@media (max-width: 599px) {
  .bespoke-auth-container {
    padding: 24px 16px 60px !important;
  }
  .auth-card-body {
    padding: 32px 20px;
  }
}
</style>
