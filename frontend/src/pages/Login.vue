<template>
  <div class="login-page">
    <v-row no-gutters style="min-height: 100vh;">
      <v-col class="auth-image-col" cols="12" md="6">
        <div class="auth-image-wrapper">
          <img
            alt="Login background"
            class="auth-image"
            src="https://images.unsplash.com/photo-1758520388257-c93edfc40702?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          >
          <div class="auth-image-overlay">
            <h2 class="auth-image-title">MINDSTORE</h2>
            <p class="auth-image-subtitle">Curated for Modern Living</p>
          </div>
        </div>
      </v-col>

      <v-col class="auth-form-col" cols="12" md="6">
        <div class="auth-form-wrapper">
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to continue your shopping experience</p>

          <v-btn
            block
            class="mt-8 google-btn"
            size="large"
            variant="outlined"
            @click="loginWithGoogle"
          >
            <v-icon left>mdi-google</v-icon>
            Continue with Google
          </v-btn>

          <div class="divider-wrapper mt-8 mb-6">
            <v-divider />
            <span class="divider-text">New to Mindstore?</span>
            <v-divider />
          </div>

          <p class="register-text">
            Create an account by signing in with Google to access your cart and manage orders.
          </p>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'

  export default {
    name: 'Login',
    setup() {
      const appStore = useAppStore()
      const router = useRouter()

      const loginWithGoogle = async () => {
        // Login with Google and wait for result
        await appStore.loginWithGoogle()
        // Note: The listener in App.vue handles the state update,
        // but we can assume success if no error thrown and redirect
        if (appStore.isAuthenticated) {
          router.push('/')
        } else {
          // Fallback or just let the listener handle it (App.vue handles auth state changes)
          router.push('/')
        }
      }

      return {
        loginWithGoogle
      }
    }
  }
</script>

<style scoped>
.auth-image-col {
  position: relative;
}

.auth-image-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.auth-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(47, 79, 79, 0.8), rgba(47, 79, 79, 0.4));
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
}

.auth-image-title {
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 1rem;
}

.auth-image-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 1.2rem;
  letter-spacing: 2px;
}

.auth-form-col {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  padding: 3rem;
}

.auth-form-wrapper {
  width: 100%;
  max-width: 450px;
}

.auth-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #2F4F4F;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  color: #5A6A85;
  line-height: 1.6;
}

.google-btn {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  text-transform: none;
  border: 2px solid #E2E8F0;
  border-radius: 12px;
}

.divider-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.divider-text {
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  color: #78909C;
  white-space: nowrap;
}

.register-text {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  color: #5A6A85;
  text-align: center;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .auth-image-col {
    min-height: 300px;
  }

  .auth-title {
    font-size: 2rem;
  }

  .auth-image-title {
    font-size: 2rem;
  }
}
</style>
