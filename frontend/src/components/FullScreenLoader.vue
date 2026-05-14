<template>
  <v-overlay
    class="fullscreen-loader"
    :model-value="modelValue"
    persistent
    scrim="#f5f7f4"
    z-index="3000"
  >
    <div class="fullscreen-loader-center">
      <div class="fullscreen-loader-content">
        <v-progress-circular
          color="teal-darken-1"
          indeterminate
          size="64"
          width="5"
        />
        <p>{{ text }}</p>
      </div>
    </div>
  </v-overlay>
</template>

<script setup>
  defineProps({
    modelValue: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: 'Loading page...'
    }
  })
</script>

<style scoped>
.fullscreen-loader {
  backdrop-filter: blur(2px);
}

.fullscreen-loader:deep(.v-overlay__content) {
  width: 100vw;
  height: 100vh;
  max-width: none;
  margin: 0;
}

.fullscreen-loader-center {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.fullscreen-loader-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 14px;
  color: var(--ms-ink);
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  letter-spacing: 0.3px;
}
</style>
