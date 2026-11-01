<template>
  <v-dialog
    v-model="isOpen"
    class="flat-dialog user-admin-otp-dialog"
    :fullscreen="xs"
    :max-width="dialogMaxWidth"
    scrollable
    width="100%"
  >
    <div class="gallery-frame dialog-frame-flat user-admin-otp-frame h-100">
      <button
        aria-label="Close dialog"
        class="dialog-close-btn"
        :disabled="verifying"
        type="button"
        @click="closeDialog"
      >
        <v-icon size="20">mdi-close</v-icon>
      </button>

      <div class="dialog-card-body d-flex flex-column pa-6">
        <h2 class="dialog-title text-wrap">
          User Admin <span class="highlight-serif">Access</span>
        </h2>

        <div class="custom-flat-alert info-alert mt-2">
          <v-icon class="alert-icon" size="20">mdi-shield-check-outline</v-icon>
          <div class="alert-content">
            Confirm your email address, request an OTP code, and enter it below to open the User Admin console.
          </div>
        </div>

        <!-- Feedback Alert -->
        <div v-if="alert" :class="['custom-flat-alert', `${alert.type}-alert`, 'mt-4']">
          <v-icon class="alert-icon" size="18">
            {{
              alert.type === 'success'
                ? 'mdi-check-circle'
                : alert.type === 'warning'
                  ? 'mdi-alert'
                  : 'mdi-alert-circle'
            }}
          </v-icon>
          <div class="alert-content">
            {{ alert.message }}
            <span v-if="alert.debugOtp" class="font-weight-bold ml-1 debug-otp-pill">
              Dev OTP: {{ alert.debugOtp }}
            </span>
          </div>
          <button aria-label="Dismiss alert" class="alert-close-btn ml-2" type="button" @click="alert = null">
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>

        <!-- Email Input Section (Auto Fetching) -->
        <div class="email-section mt-5">
          <div class="d-flex justify-space-between align-center mb-1">
            <label class="field-label">
              Email Address
            </label>
          </div>

          <div class="email-input-row d-flex flex-column flex-sm-row ga-2 align-stretch">
            <v-text-field
              v-model="email"
              class="flat-text-field flex-grow-1"
              density="comfortable"
              :disabled="sendingOtp || verifying"
              hide-details="auto"
              placeholder="name@example.com"
              prepend-inner-icon="mdi-email-outline"
              type="email"
              variant="outlined"
              @keydown.enter.prevent="handleSendOtp"
            />
            <button
              class="send-otp-btn text-no-wrap"
              :disabled="sendingOtp || verifying || cooldownTimer > 0 || !isValidEmail"
              type="button"
              @click="handleSendOtp"
            >
              <v-progress-circular
                v-if="sendingOtp"
                class="mr-1"
                indeterminate
                size="16"
                width="2"
              />
              <v-icon v-else class="mr-1" size="16">
                {{ otpSent ? 'mdi-refresh' : 'mdi-send-outline' }}
              </v-icon>
              {{
                sendingOtp
                  ? 'Sending...'
                  : cooldownTimer > 0
                    ? `Resend (${cooldownTimer}s)`
                    : otpSent
                      ? 'Resend OTP'
                      : 'Send OTP'
              }}
            </button>
          </div>
          <div class="helper-text mt-1">
            Verification code will be sent to this email address.
          </div>
        </div>

        <!-- OTP Input Section -->
        <div class="otp-section mt-5">
          <div class="d-flex justify-space-between align-center mb-1">
            <label class="field-label">
              Enter 6-Digit OTP
            </label>
            <span v-if="otpSent" class="otp-validity-tag">
              Valid for 10 minutes
            </span>
          </div>

          <div class="otp-wrap-flat">
            <v-otp-input
              v-model="otpCode"
              class="flat-otp-input"
              density="comfortable"
              :disabled="verifying"
              :length="6"
              type="number"
              variant="outlined"
              @finish="handleVerifyOtp"
            />
          </div>
          <div v-if="!otpSent" class="helper-text text-muted mt-2">
            Click <strong>Send OTP</strong> above first to receive your code.
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="dialog-actions-flat mt-6">
          <button class="btn-flat-outline" :disabled="verifying" type="button" @click="closeDialog">
            Cancel
          </button>
          <button
            class="btn-flat-solid verify-action-btn"
            :disabled="verifying || !otpCode || String(otpCode).trim().length !== 6"
            type="button"
            @click="handleVerifyOtp()"
          >
            <v-progress-circular
              v-if="verifying"
              class="mr-2"
              indeterminate
              size="16"
              width="2"
            />
            {{ verifying ? 'Verifying...' : 'Verify & Open Admin' }}
          </button>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script>
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useAppStore } from '@/stores/app'

  export default {
    name: 'UserAdminAccessDialog',
    props: {
      modelValue: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['update:modelValue', 'verified'],
    setup(props, { emit }) {
      const appStore = useAppStore()
      const router = useRouter()
      const { xs } = useDisplay()

      const email = ref('')
      const otpCode = ref('')
      const sendingOtp = ref(false)
      const verifying = ref(false)
      const otpSent = ref(false)
      const cooldownTimer = ref(0)
      const alert = ref(null)

      let timerInterval = null

      const isOpen = computed({
        get: () => props.modelValue,
        set: (val) => emit('update:modelValue', val),
      })

      const dialogMaxWidth = computed(() => (xs.value ? undefined : 640))

      const isEmailAutoFetched = computed(() => {
        const userEmail = String(appStore.user?.email || '').trim().toLowerCase()
        const currentEmail = String(email.value || '').trim().toLowerCase()
        return Boolean(userEmail && userEmail === currentEmail)
      })

      const isValidEmail = computed(() => {
        const val = String(email.value || '').trim()
        return /^[^@\s]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(val)
      })

      const fetchAccountEmail = () => {
        const accountEmail = String(appStore.user?.email || '').trim()
        if (accountEmail) {
          email.value = accountEmail
        }
      }

      const startCooldown = (seconds = 60) => {
        clearInterval(timerInterval)
        cooldownTimer.value = seconds
        timerInterval = setInterval(() => {
          if (cooldownTimer.value > 1) {
            cooldownTimer.value -= 1
          } else {
            cooldownTimer.value = 0
            clearInterval(timerInterval)
          }
        }, 1000)
      }

      const resetState = () => {
        fetchAccountEmail()
        otpCode.value = ''
        otpSent.value = false
        alert.value = null
        cooldownTimer.value = 0
        clearInterval(timerInterval)
      }

      watch(
        () => props.modelValue,
        (newVal) => {
          if (newVal) {
            resetState()
          } else {
            clearInterval(timerInterval)
          }
        },
        { immediate: true },
      )

      watch(
        () => appStore.user?.email,
        (newEmail) => {
          if (newEmail && !email.value) {
            email.value = newEmail.trim()
          }
        },
      )

      onBeforeUnmount(() => {
        clearInterval(timerInterval)
      })

      const handleSendOtp = async () => {
        const targetEmail = String(email.value || '').trim().toLowerCase()
        if (!targetEmail || !isValidEmail.value) {
          alert.value = {
            message: 'Please enter a valid email address.',
            type: 'warning',
          }
          return
        }

        sendingOtp.value = true
        alert.value = null

        try {
          const response = await appStore.sendUserAdminOtp(targetEmail)
          otpSent.value = true
          startCooldown(60)

          alert.value = {
            message:
              response?.message ||
              `OTP sent successfully to ${targetEmail}. Please check your inbox.`,
            type: 'success',
            debugOtp: response?.debug_otp,
          }
        } catch (error) {
          alert.value = {
            message:
              error?.response?.data?.message ||
              error?.message ||
              'Failed to send OTP. Please try again.',
            type: 'error',
          }
        } finally {
          sendingOtp.value = false
        }
      }

      const handleVerifyOtp = async (codeArg) => {
        const targetEmail = String(email.value || '').trim().toLowerCase()
        const rawCode =
          typeof codeArg === 'string' && codeArg.length === 6
            ? codeArg
            : String(otpCode.value || '')
        const code = rawCode.replace(/\D+/g, '')

        if (!targetEmail || !isValidEmail.value) {
          alert.value = {
            message: 'Please provide a valid email address.',
            type: 'warning',
          }
          return
        }

        if (code.length !== 6) {
          alert.value = {
            message: 'Please enter the complete 6-digit OTP code.',
            type: 'warning',
          }
          return
        }

        verifying.value = true
        alert.value = null

        try {
          const response = await appStore.verifyUserAdminOtp({
            email: targetEmail,
            otp: code,
          })

          alert.value = {
            message:
              response?.message ||
              'OTP verified successfully! Access granted. Opening User Admin...',
            type: 'success',
          }

          emit('verified', response)

          setTimeout(async () => {
            isOpen.value = false
            await router.push('/user-admin')
          }, 900)
        } catch (error) {
          alert.value = {
            message:
              error?.response?.data?.message ||
              error?.message ||
              'Invalid OTP code. Please check and try again.',
            type: 'error',
          }
          otpCode.value = ''
        } finally {
          if (!alert.value || alert.value.type !== 'success') {
            verifying.value = false
          }
        }
      }

      const closeDialog = () => {
        if (!verifying.value) {
          isOpen.value = false
        }
      }

      return {
        isOpen,
        email,
        otpCode,
        sendingOtp,
        verifying,
        otpSent,
        cooldownTimer,
        alert,
        dialogMaxWidth,
        isEmailAutoFetched,
        isValidEmail,
        xs,
        handleSendOtp,
        handleVerifyOtp,
        closeDialog,
      }
    },
  }
</script>

<style>
/* ══════════════════════════════════════════════════════════════
   USER ADMIN OTP ACCESS DIALOG STYLING (GLOBAL OVERLAY SCOPE)
══════════════════════════════════════════════════════════════ */
.user-admin-otp-dialog .v-overlay__content {
  border-radius: 0 !important;
  box-shadow: 10px 10px 0px rgba(15, 23, 42, 0.95) !important;
}

.user-admin-otp-frame.dialog-frame-flat {
  background: #ffffff !important;
  border: 2px solid #0f172a !important;
  color: #0f172a !important;
  position: relative !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.user-admin-otp-frame .dialog-close-btn {
  position: absolute !important;
  right: 14px !important;
  top: 14px !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  color: #64748b !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 4px !important;
  z-index: 10 !important;
  transition: color 0.2s ease !important;
}

.user-admin-otp-frame .dialog-close-btn:hover {
  color: #ef4444 !important;
}

.user-admin-otp-frame .brand-tagline {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin-bottom: 4px !important;
}

.user-admin-otp-frame .tag-label {
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.15em !important;
  color: #0d9488 !important;
  text-transform: uppercase !important;
}

.user-admin-otp-frame .tag-dot {
  font-size: 10px !important;
  color: #cbd5e1 !important;
}

.user-admin-otp-frame .dialog-title {
  font-size: 26px !important;
  font-weight: 900 !important;
  color: #0f172a !important;
  letter-spacing: -0.5px !important;
  margin: 2px 0 12px 0 !important;
  line-height: 1.2 !important;
}

.user-admin-otp-frame .highlight-serif {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-style: italic !important;
  font-weight: 400 !important;
  color: #0d9488 !important;
}

/* Custom flat alerts */
.user-admin-otp-frame .custom-flat-alert {
  display: flex !important;
  align-items: flex-start !important;
  gap: 12px !important;
  padding: 12px 14px !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}

.user-admin-otp-frame .custom-flat-alert.info-alert {
  background: #f0fdfa !important;
  border: 2px solid #0d9488 !important;
  color: #0f766e !important;
}

.user-admin-otp-frame .custom-flat-alert.warning-alert {
  background: #fffbeb !important;
  border: 2px solid #d97706 !important;
  color: #b45309 !important;
}

.user-admin-otp-frame .custom-flat-alert.error-alert {
  background: #fef2f2 !important;
  border: 2px solid #ef4444 !important;
  color: #dc2626 !important;
}

.user-admin-otp-frame .custom-flat-alert.success-alert {
  background: #f0fdf4 !important;
  border: 2px solid #22c55e !important;
  color: #15803d !important;
}

.user-admin-otp-frame .alert-icon {
  margin-top: 1px !important;
  flex-shrink: 0 !important;
}

.user-admin-otp-frame .alert-content {
  flex-grow: 1 !important;
}

.user-admin-otp-frame .alert-close-btn {
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  color: inherit !important;
  opacity: 0.7 !important;
  padding: 0 !important;
}

.user-admin-otp-frame .alert-close-btn:hover {
  opacity: 1 !important;
}

.user-admin-otp-frame .debug-otp-pill {
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #7dd3fc;
  font-family: monospace;
}

/* Field labels and helper texts */
.user-admin-otp-frame .field-label {
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #475569 !important;
}

.user-admin-otp-frame .auto-fetch-badge {
  color: #047857 !important;
  font-weight: 700 !important;
  background-color: #ecfdf5 !important;
  padding: 2px 8px !important;
  border-radius: 9999px !important;
  border: 1px solid #a7f3d0 !important;
  font-size: 11px !important;
}

.user-admin-otp-frame .otp-validity-tag {
  font-size: 11px !important;
  color: #0d9488 !important;
  font-weight: 600 !important;
}

.user-admin-otp-frame .helper-text {
  font-size: 12px !important;
  color: #64748b !important;
}

.user-admin-otp-frame .helper-text.text-muted {
  color: #94a3b8 !important;
}

/* Text fields inside dialog */
.user-admin-otp-frame .flat-text-field .v-field {
  background: #ffffff !important;
  border-radius: 0 !important;
  border: 2px solid #cbd5e1 !important;
  color: #0f172a !important;
  box-shadow: none !important;
}

.user-admin-otp-frame .flat-text-field .v-field--focused {
  border-color: #0f172a !important;
}

.user-admin-otp-frame .flat-text-field .v-field__input {
  color: #0f172a !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  min-height: 46px !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

/* Send OTP Button */
.user-admin-otp-frame .send-otp-btn {
  background: #0f172a !important;
  color: #ffffff !important;
  border: 2px solid #0f172a !important;
  border-radius: 0 !important;
  min-height: 48px !important;
  padding: 0 18px !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.user-admin-otp-frame .send-otp-btn:hover:not(:disabled) {
  background: #1e293b !important;
  border-color: #1e293b !important;
}

.user-admin-otp-frame .send-otp-btn:disabled {
  background: #e2e8f0 !important;
  border-color: #cbd5e1 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
}

/* OTP Input Wrap and Boxes */
.user-admin-otp-frame .otp-wrap-flat {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  background: #f8fafc !important;
  border: 2px solid #cbd5e1 !important;
  padding: 16px 12px !important;
  border-radius: 0 !important;
}

.user-admin-otp-frame .flat-otp-input .v-otp-input__field {
  border-radius: 0 !important;
  border: 2px solid #0f172a !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-weight: 900 !important;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
  font-size: 1.6rem !important;
  text-align: center !important;
  height: 52px !important;
  width: 44px !important;
  margin: 0 3px !important;
  transition: all 0.2s ease !important;
}

.user-admin-otp-frame .flat-otp-input .v-otp-input__field:focus {
  border-color: #0d9488 !important;
  background: #f0fdfa !important;
}

/* Dialog Action Buttons */
.user-admin-otp-frame .dialog-actions-flat {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
}

.user-admin-otp-frame .btn-flat-outline {
  padding: 12px 22px !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #0f172a !important;
  border: 2px solid #0f172a !important;
  background: transparent !important;
  border-radius: 0 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.user-admin-otp-frame .btn-flat-outline:hover:not(:disabled) {
  background: #f1f5f9 !important;
}

.user-admin-otp-frame .btn-flat-solid {
  padding: 12px 24px !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  background: #0d9488 !important;
  border: 2px solid #0d9488 !important;
  color: #ffffff !important;
  border-radius: 0 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.user-admin-otp-frame .btn-flat-solid:hover:not(:disabled) {
  background: #0f766e !important;
  border-color: #0f766e !important;
}

.user-admin-otp-frame .btn-flat-solid:disabled {
  background: #e2e8f0 !important;
  border-color: #cbd5e1 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
}

/* ══════════════════════════════════════════════════════════════
   DARK THEME OVERRIDES
══════════════════════════════════════════════════════════════ */
.v-theme--dark .user-admin-otp-dialog .v-overlay__content {
  box-shadow: 10px 10px 0px rgba(0, 0, 0, 0.9) !important;
}

.v-theme--dark .user-admin-otp-frame.dialog-frame-flat {
  background: #0f172a !important;
  border: 2px solid #38bdf8 !important;
  color: #f8fafc !important;
}

.v-theme--dark .user-admin-otp-frame .dialog-title {
  color: #f8fafc !important;
}

.v-theme--dark .user-admin-otp-frame .dialog-title .highlight-serif {
  color: #38bdf8 !important;
}

.v-theme--dark .user-admin-otp-frame .tag-label {
  color: #38bdf8 !important;
}

.v-theme--dark .user-admin-otp-frame .field-label {
  color: #94a3b8 !important;
}

.v-theme--dark .user-admin-otp-frame .flat-text-field .v-field {
  background: #1e293b !important;
  border-color: #334155 !important;
  color: #ffffff !important;
}

.v-theme--dark .user-admin-otp-frame .flat-text-field .v-field--focused {
  border-color: #38bdf8 !important;
}

.v-theme--dark .user-admin-otp-frame .flat-text-field .v-field__input {
  color: #ffffff !important;
}

.v-theme--dark .user-admin-otp-frame .send-otp-btn {
  background: #38bdf8 !important;
  border-color: #38bdf8 !important;
  color: #0f172a !important;
}

.v-theme--dark .user-admin-otp-frame .send-otp-btn:hover:not(:disabled) {
  background: #7dd3fc !important;
  border-color: #7dd3fc !important;
}

.v-theme--dark .user-admin-otp-frame .otp-wrap-flat {
  background: #1e293b !important;
  border-color: #334155 !important;
}

.v-theme--dark .user-admin-otp-frame .flat-otp-input .v-otp-input__field {
  background: #0f172a !important;
  border-color: #38bdf8 !important;
  color: #ffffff !important;
}

.v-theme--dark .user-admin-otp-frame .btn-flat-outline {
  color: #f8fafc !important;
  border-color: #64748b !important;
}

.v-theme--dark .user-admin-otp-frame .btn-flat-outline:hover:not(:disabled) {
  background: #1e293b !important;
}

.v-theme--dark .user-admin-otp-frame .btn-flat-solid {
  background: #0284c7 !important;
  border-color: #0284c7 !important;
  color: #ffffff !important;
}

.v-theme--dark .user-admin-otp-frame .btn-flat-solid:hover:not(:disabled) {
  background: #0369a1 !important;
  border-color: #0369a1 !important;
}
</style>
