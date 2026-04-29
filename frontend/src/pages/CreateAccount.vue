<template>
  <section class="auth-page">
    <div class="bg-shape shape-a" />
    <div class="bg-shape shape-b" />
    <div class="bg-grid" />

    <v-container class="auth-shell">
      <v-row no-gutters>
        <v-col class="auth-main pa-3" cols="12" lg="5">
          <div class="form-card">
            <p class="form-kicker">New Member</p>
            <h2 class="form-title">Create account</h2>
            <p class="form-subtitle">Use your details below to join Mindstore.</p>

            <BaseAlert v-if="errorMessage" class="mt-3" :message="errorMessage" type="error" />

            <v-form class="mt-4" @submit.prevent="submitSignup">
              <v-text-field v-model="name" autocomplete="name" density="comfortable" label="Full name"
                prepend-inner-icon="mdi-account-outline" rounded="lg" variant="outlined" />

              <v-text-field v-model="email" autocomplete="email" class="mt-1" density="comfortable"
                label="Email address" prepend-inner-icon="mdi-email-outline" rounded="lg" type="email"
                variant="outlined" />

              <v-text-field v-model="password"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                autocomplete="new-password" class="mt-1" density="comfortable" label="Password"
                prepend-inner-icon="mdi-lock-outline" rounded="lg" :type="showPassword ? 'text' : 'password'"
                variant="outlined" @click:append-inner="showPassword = !showPassword" />

              <v-text-field v-model="confirmPassword"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                autocomplete="new-password" class="mt-1" density="comfortable" label="Confirm password"
                prepend-inner-icon="mdi-lock-check-outline" rounded="lg"
                :type="showConfirmPassword ? 'text' : 'password'" variant="outlined"
                @click:append-inner="showConfirmPassword = !showConfirmPassword" />

              <div class="form-meta">
                <span>Minimum 6 characters</span>
                <span class="meta-dot" />
                <span>Secure signup flow</span>
              </div>

              <v-btn block class="submit-btn mt-3" :disabled="isSubmitDisabled" :loading="appStore.loading"
                rounded="pill" size="large" type="submit" variant="flat">
                Create Account
              </v-btn>
            </v-form>

            <div class="divider" />
            <p class="switch-copy">
              Already a member?
              <router-link class="switch-link" to="/login">Log in</router-link>
            </p>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseAlert from '@/components/BaseAlert.vue'
import { useAppStore } from '@/stores/app'
import { getAuthErrorMessage } from '@/utils/authErrors'

export default {
  name: 'CreateAccount',
  components: {
    BaseAlert
  },
  setup() {
    const appStore = useAppStore()
    const router = useRouter()
    const name = ref('')
    const email = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const showPassword = ref(false)
    const showConfirmPassword = ref(false)
    const errorMessage = ref('')

    const isSubmitDisabled = computed(() => {
      return (
        appStore.loading ||
        !name.value.trim() ||
        !email.value.trim() ||
        !password.value ||
        password.value.length < 6 ||
        !confirmPassword.value
      )
    })

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

    const submitSignup = async () => {
      errorMessage.value = ''

      if (password.value !== confirmPassword.value) {
        errorMessage.value = 'Passwords do not match.'
        return
      }

      if (password.value.length < 6) {
        errorMessage.value = 'Password must be at least 6 characters.'
        return
      }

      try {
        await appStore.createAccountWithEmail({
          name: name.value,
          email: email.value,
          password: password.value
        })
        router.replace('/')
      } catch (error) {
        errorMessage.value = getAuthErrorMessage(error)
      }
    }

    return {
      appStore,
      name,
      email,
      password,
      confirmPassword,
      showPassword,
      showConfirmPassword,
      errorMessage,
      isSubmitDisabled,
      submitSignup
    }
  }
}
</script>

<style scoped>
.auth-page {
  --signup-bg: #0f2025;
  --signup-bg-deep: #0a181c;
  --signup-accent: #d78636;
  --signup-accent-soft: #ebbe8d;
  --signup-ink: #1a2b31;
  --signup-muted: #607279;
  --signup-border: #d9e2df;

  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(140deg, #eaf0ec 0%, #f5f8f5 45%, #edf2ef 100%);
}

.bg-shape {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
}

.shape-a {
  width: 440px;
  height: 440px;
  top: -180px;
  left: -120px;
  background: radial-gradient(circle, rgba(53, 110, 118, 0.23) 0%, rgba(53, 110, 118, 0) 72%);
}

.shape-b {
  width: 520px;
  height: 520px;
  right: -210px;
  bottom: -220px;
  background: radial-gradient(circle, rgba(215, 134, 54, 0.2) 0%, rgba(215, 134, 54, 0) 72%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.25;
  background-image:
    linear-gradient(rgba(18, 44, 49, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(18, 44, 49, 0.08) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at 50% 40%, #000 36%, transparent 88%);
}

.auth-shell {
  min-height: 100vh !important;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
  padding-top: 22px;
  padding-bottom: 22px;
}

.auth-frame {
  width: 100%;
  border: 1px solid #d3deda;
  border-radius: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 26px 60px rgba(18, 40, 45, 0.14);
  backdrop-filter: blur(10px);
}

.auth-visual {
  position: relative;
  color: #f4efe8;
  background:
    linear-gradient(152deg, rgba(11, 29, 33, 0.94), rgba(19, 47, 53, 0.92)),
    radial-gradient(circle at 20% 20%, rgba(227, 180, 130, 0.3), rgba(227, 180, 130, 0));
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 86% 12%, rgba(225, 170, 108, 0.3), rgba(225, 170, 108, 0)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 35%);
}

.visual-content {
  position: relative;
  z-index: 1;
  min-height: 100%;
  padding: clamp(26px, 4.2vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: reveal-up 0.65s ease;
}

.brand-chip {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(237, 224, 205, 0.38);
  border-radius: 999px;
  padding: 6px 14px 6px 6px;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 1.06px;
  font-weight: 700;
}

.brand-mark {
  width: 29px;
  height: 29px;
  border-radius: 8px;
}

.visual-kicker {
  margin-top: 24px;
  color: #e6c196;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 1.9px;
  font-weight: 700;
}

.visual-title {
  margin-top: 12px;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: clamp(2rem, 3.2vw, 2.75rem);
  line-height: 1.08;
  max-width: 680px;
}

.visual-copy {
  margin-top: 14px;
  max-width: 560px;
  font-size: 0.95rem;
  line-height: 1.76;
  color: rgba(244, 239, 231, 0.86);
}

.insight-grid {
  margin-top: 22px;
  display: grid;
  gap: 10px;
  max-width: 560px;
}

.insight-card {
  border: 1px solid rgba(234, 220, 198, 0.24);
  border-radius: 12px;
  background: rgba(243, 233, 220, 0.08);
  padding: 11px 12px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}

.insight-card :deep(.v-icon) {
  color: #e7c59b;
}

.insight-card h3 {
  font-size: 0.89rem;
  color: #f6eee2;
}

.insight-card p {
  margin-top: 3px;
  font-size: 0.81rem;
  color: rgba(244, 239, 231, 0.72);
}

.auth-main {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(165deg, rgba(253, 254, 253, 0.95), rgba(244, 248, 246, 0.94)) !important;
}

.form-card {
  width: 100%;
  max-width: 430px;
  border: 1px solid var(--signup-border);
  border-radius: 20px;
  background: #ffffff;
  padding: clamp(20px, 3vw, 30px);
  box-shadow: 0 14px 34px rgba(24, 43, 49, 0.1);
  animation: reveal-up 0.65s ease;
}

.form-kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #b06720;
  font-weight: 700;
}

.form-title {
  margin-top: 8px;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: clamp(1.8rem, 2.1vw, 2.2rem);
  line-height: 1.08;
  color: var(--signup-ink);
}

.form-subtitle {
  margin-top: 7px;
  font-size: 0.91rem;
  color: var(--signup-muted);
}

.form-meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  color: #6d7f85;
}

.meta-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #8ea2a8;
}

.submit-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #fff;
  background: linear-gradient(120deg, #d78636, #b96320);
  box-shadow: 0 13px 24px rgba(202, 112, 36, 0.28);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 17px 26px rgba(202, 112, 36, 0.32);
}

.divider {
  margin-top: 14px;
  height: 1px;
  background: linear-gradient(to right, transparent, #d6dfdc, transparent);
}

.switch-copy {
  margin-top: 12px;
  text-align: center;
  font-size: 0.92rem;
  color: #5f7378;
}

.switch-link {
  text-decoration: none;
  color: #164652;
  font-weight: 700;
}

.switch-link:hover {
  text-decoration: underline;
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1264px) {
  .visual-content {
    min-height: 380px;
  }
}

@media (max-width: 960px) {
  .auth-shell {
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .auth-frame {
    border-radius: 22px;
  }

  .visual-content {
    min-height: 300px;
  }
}

@media (max-width: 600px) {
  .visual-content {
    min-height: 250px;
    padding: 18px;
  }

  .insight-grid {
    gap: 8px;
  }

  .auth-main {
    padding: 16px;
  }

  .form-card {
    border-radius: 15px;
  }

  .form-meta {
    font-size: 0.69rem;
  }
}
</style>
