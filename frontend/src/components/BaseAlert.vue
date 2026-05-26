<template>
  <transition name="base-alert-float">
    <div
      v-if="isVisible"
      class="base-alert-wrap"
      :class="{ 'base-alert-wrap--floating': floating }"
    >
      <div
        :aria-live="liveMode"
        class="base-alert"
        :class="`base-alert--${resolvedType}`"
        role="alert"
      >
        <div class="base-alert__icon">
          <v-icon size="18">{{ alertIcon }}</v-icon>
        </div>

        <div class="base-alert__body">
          <p v-if="title" class="base-alert__title">{{ title }}</p>
          <p v-if="message" class="base-alert__message">{{ message }}</p>
          <div v-if="$slots.default" class="base-alert__slot">
            <slot />
          </div>
        </div>

        <button
          v-if="showCloseButton"
          aria-label="Dismiss alert"
          class="base-alert__dismiss"
          type="button"
          @click="hide"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
  import { computed, onBeforeUnmount, ref, watch } from 'vue'

  const ICON_BY_TYPE = {
    info: 'mdi-information',
    success: 'mdi-check-circle',
    warning: 'mdi-alert',
    error: 'mdi-alert-circle'
  }

  export default {
    name: 'BaseAlert',
    props: {
      type: {
        type: String,
        default: 'info',
        validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
      },
      title: {
        type: String,
        default: ''
      },
      message: {
        type: String,
        default: ''
      },
      modelValue: {
        type: Boolean,
        default: true
      },
      floating: {
        type: Boolean,
        default: false
      },
      timeout: {
        type: Number,
        default: 0
      },
      dismissible: {
        type: Boolean,
        default: false
      }
    },
    emits: ['update:modelValue', 'dismiss'],
    setup(props, { emit }) {
      const isOpen = ref(Boolean(props.modelValue))
      let hideTimer = null

      const clearHideTimer = () => {
        if (hideTimer) {
          window.clearTimeout(hideTimer)
          hideTimer = null
        }
      }

      const hide = () => {
        if (!isOpen.value) return
        isOpen.value = false
        emit('update:modelValue', false)
        emit('dismiss')
        clearHideTimer()
      }

      const scheduleAutoHide = () => {
        clearHideTimer()
        if (!props.floating || !isOpen.value || props.timeout <= 0) return
        hideTimer = window.setTimeout(() => {
          hide()
        }, props.timeout)
      }

      watch(
        () => props.modelValue,
        (nextValue) => {
          isOpen.value = Boolean(nextValue)
          if (isOpen.value) {
            scheduleAutoHide()
          } else {
            clearHideTimer()
          }
        },
        { immediate: true }
      )

      watch(
        () => [props.floating, props.timeout],
        () => {
          if (isOpen.value) {
            scheduleAutoHide()
          } else {
            clearHideTimer()
          }
        }
      )

      onBeforeUnmount(() => {
        clearHideTimer()
      })

      const resolvedType = computed(() => props.type || 'info')
      const alertIcon = computed(() => ICON_BY_TYPE[resolvedType.value] || ICON_BY_TYPE.info)
      const showCloseButton = computed(() => props.dismissible)
      const isVisible = computed(() => (props.floating ? isOpen.value : true))
      const liveMode = computed(() =>
        resolvedType.value === 'error' || resolvedType.value === 'warning' ? 'assertive' : 'polite'
      )

      return {
        resolvedType,
        alertIcon,
        showCloseButton,
        isVisible,
        liveMode,
        hide
      }
    }
  }
</script>

<style scoped>
.base-alert-wrap {
  width: 100%;
}

.base-alert-wrap--floating {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 96px);
  right: 12px;
  width: min(88vw, 380px);
  z-index: 2000;
  pointer-events: none;
}

.base-alert {
  --alert-surface: #f4f8f7;
  --alert-border: #c9dbd6;
  --alert-copy: #2c3f44;
  --alert-title: #274047;
  --alert-icon-color: #245454;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  border: 1px solid var(--alert-border);
  background: var(--alert-surface);
  padding: 8px 10px;
  color: var(--alert-copy);

  position: relative;
  border-left: 3px solid var(--alert-icon-color);
}

.base-alert-wrap--floating .base-alert {
  pointer-events: auto;

}

.base-alert__icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: var(--alert-icon-color);
  flex-shrink: 0;
}

.base-alert__body {
  min-width: 0;
  flex: 1;
}

.base-alert__title {
  font-weight: 700;
  font-size: 0.8rem;
  line-height: 1.2;
  color: var(--alert-title);
}

.base-alert__message,
.base-alert__slot {
  margin-top: 0;
  font-size: 0.82rem;
  line-height: 1.35;
  word-break: break-word;
}

.base-alert__slot :deep(p) {
  margin: 0;
}

.base-alert__dismiss {
  appearance: none;
  border: 0;
  background: transparent;
  color: #6f8086;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.base-alert__dismiss:hover {
  background: rgba(22, 40, 39, 0.08);
}

.base-alert--info {
  --alert-surface: #eef6f8;
  --alert-border: #c8dbe1;
  --alert-copy: #244049;
  --alert-title: #193844;
  --alert-icon-color: #276678;
}

.base-alert--success {
  --alert-surface: #edf8f1;
  --alert-border: #c6decf;
  --alert-copy: #1f4532;
  --alert-title: #163825;
  --alert-icon-color: #2a7a46;
}

.base-alert--warning {
  --alert-surface: #fff5e9;
  --alert-border: #f0d6ab;
  --alert-copy: #5b3d18;
  --alert-title: #4a2f0f;
  --alert-icon-color: #b2661f;
}

.base-alert--error {
  --alert-surface: #fff0f0;
  --alert-border: #efc3c3;
  --alert-copy: #5a2224;
  --alert-title: #4a1618;
  --alert-icon-color: #a42d30;
}

.base-alert-float-enter-active,
.base-alert-float-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.base-alert-float-enter-from,
.base-alert-float-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .base-alert-wrap--floating {
    top: calc(env(safe-area-inset-top, 0px) + 88px);
    right: 8px;
    width: min(calc(100vw - 16px), 360px);
  }

  .base-alert {
    border-radius: 9px;
    padding: 8px 9px;
  }

  .base-alert__icon {
    width: 16px;
    height: 16px;
  }
}
</style>
