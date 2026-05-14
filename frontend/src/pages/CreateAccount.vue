<template>
  <v-container class="py-8">
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="5">
        <v-card rounded="lg" variant="outlined">
          <v-card-text class="pa-6 pa-md-8">
            <v-chip color="teal-darken-1" size="small" variant="tonal">Create Account</v-chip>
            <h1 class="text-h4 font-weight-bold mt-3">Join Mindstore</h1>
            <p class="text-body-2 text-medium-emphasis mt-2">Create an account to start shopping with Mindstore.</p>

            <BaseAlert
              v-if="errorMessage"
              class="mt-3"
              :message="errorMessage"
              type="error"
            />

            <v-form class="mt-4" @submit.prevent="submitSignup">
              <v-text-field
                v-model="name"
                autocomplete="name"
                density="comfortable"
                label="Full name"
                prepend-inner-icon="mdi-account-outline"
                rounded="lg"
                variant="outlined"
              />

              <v-text-field
                v-model="email"
                autocomplete="email"
                class="mt-1"
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
                autocomplete="new-password"
                class="mt-1"
                density="comfortable"
                label="Password"
                prepend-inner-icon="mdi-lock-outline"
                rounded="lg"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showPassword = !showPassword"
              />

              <v-text-field
                v-model="confirmPassword"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                autocomplete="new-password"
                class="mt-1"
                density="comfortable"
                label="Confirm password"
                prepend-inner-icon="mdi-lock-check-outline"
                rounded="lg"
                :type="showConfirmPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
              />

              <v-alert class="mt-2" density="compact" type="info" color="teal-darken-1" variant="tonal">
                Minimum 6 characters and secure signup enabled.
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
                Create Account
              </v-btn>
            </v-form>

            <v-divider class="my-4" />

            <p class="text-body-2 text-medium-emphasis">
              Already have an account?
              <router-link class="font-weight-bold text-teal-darken-1 text-decoration-none" to="/login">Log in</router-link>
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
