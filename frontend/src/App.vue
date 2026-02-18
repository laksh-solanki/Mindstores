<template>
  <v-app>
    <AppHeader />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter v-if="route.path !== '/login'" />
  </v-app>
</template>

<script setup>
  import { onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import AppFooter from '@/components/AppFooter.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import { useAppStore } from '@/stores/app'

  const route = useRoute()
  const appStore = useAppStore()

  // Initialize the Auth Listener when the app starts
  onMounted(() => {
    appStore.initAuthListener()
  })
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
}

:root {
  --ms-bg: #f5f7f4;
  --ms-surface: #ffffff;
  --ms-ink: #182124;
  --ms-muted: #5d6a70;
  --ms-accent: #d27a2d;
  --ms-accent-deep: #b35d15;
  --ms-border: #dce3df;
}

body {
  font-family: 'Manrope', sans-serif;
  color: var(--ms-ink);
  background: radial-gradient(circle at 10% 20%, #edf2ea 0%, #f5f7f4 50%, #eef2ef 100%);
}

.v-main {
  background-color: transparent;
}
</style>
