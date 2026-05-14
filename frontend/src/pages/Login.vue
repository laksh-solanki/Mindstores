<template>
  <v-container class="py-8">
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="5">
        <v-card rounded="lg" variant="outlined">
          <v-card-text class="pa-6 pa-md-8">
            <v-chip color="teal-darken-1" size="small" variant="tonal">Account Login</v-chip>
            <h1 class="text-h4 font-weight-bold mt-3">Welcome back</h1>
            <p class="text-body-2 text-medium-emphasis mt-2">Sign in to continue to your Mindstore account.</p>

            <BaseAlert
              v-if="errorMessage"
              class="mt-3"
              :message="errorMessage"
              type="error"
            />

            <v-form class="mt-4" @submit.prevent="submitLogin">
              <v-text-field
                v-model="email"
                autocomplete="email"
                density="comfortable"
                label="Email address"
                prepend-inner-icon="mdi-email-outline"
                rounded="lg"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="password"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
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

              <v-alert class="mt-2" density="compact" type="info" color="teal-darken-1" variant="tonal">
                Secure login enabled and session guarded.
              </v-alert>

              <v-btn
                block
                class="mt-4"
                color="teal-darken-1"
                :disabled="isSubmitDisabled"
                :loading="appStore.loading"
                rounded="lg"
                size="large"
                type="submit"
                variant="flat"
              >
                Access Account
              </v-btn>
            </v-form>

            <v-divider class="my-4" />

            <p class="text-body-2 text-medium-emphasis">
              New to Mindstore?
              <router-link class="font-weight-bold text-teal-darken-1 text-decoration-none" to="/create-account">Create an account</router-link>
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
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
        isSubmitDisabled,
        submitLogin
      }
    }
  }
</script>
