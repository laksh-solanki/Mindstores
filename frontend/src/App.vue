<template>
  <v-app>
    <AppHeader />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter v-if="route.path !== '/login'" />
    <FullScreenLoader :model-value="showFullscreenLoader" />
  </v-app>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AppFooter from '@/components/AppFooter.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import FullScreenLoader from '@/components/FullScreenLoader.vue'
  import { useAppStore } from '@/stores/app'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const routeLoading = ref(false)
  const pageBooting = ref(document.readyState !== 'complete')

  const showFullscreenLoader = computed(() => {
    return appStore.loading || routeLoading.value || pageBooting.value
  })

  function handleWindowLoad () {
    pageBooting.value = false
  }

  let removeBeforeEachGuard = null
  let removeAfterEachGuard = null
  let removeRouteErrorHandler = null

  // Initialize the Auth Listener when the app starts
  onMounted(() => {
    appStore.initAuthListener()

    removeBeforeEachGuard = router.beforeEach((to, from, next) => {
      if (to.fullPath !== from.fullPath) {
        routeLoading.value = true
      }
      next()
    })

    removeAfterEachGuard = router.afterEach(() => {
      routeLoading.value = false
    })

    removeRouteErrorHandler = router.onError(() => {
      routeLoading.value = false
    })

    if (document.readyState === 'complete') {
      pageBooting.value = false
    } else {
      window.addEventListener('load', handleWindowLoad, { once: true })
    }
  })

  onUnmounted(() => {
    removeBeforeEachGuard?.()
    removeAfterEachGuard?.()
    removeRouteErrorHandler?.()
    window.removeEventListener('load', handleWindowLoad)
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
