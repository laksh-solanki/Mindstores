<template>
  <v-app>
    <AppHeader v-if="!isAdminPage" />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter v-if="!isAuthPage && !isAdminPage" />
    <CookieConsent />
    <FullScreenLoader :model-value="showFullscreenLoader" />
  </v-app>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AppFooter from '@/components/AppFooter.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import CookieConsent from '@/components/CookieConsent.vue'
  import FullScreenLoader from '@/components/FullScreenLoader.vue'
  import { useAppStore } from '@/stores/app'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const routeLoading = ref(false)

  const isAuthPage = computed(() => ['/login', '/create-account'].includes(route.path))
  const isAdminPage = computed(() => route.path === '/admin')
  const showFullscreenLoader = computed(() => {
    return routeLoading.value
  })

  let removeBeforeEachGuard = null
  let removeAfterEachGuard = null
  let removeRouteErrorHandler = null

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
  })

  onUnmounted(() => {
    removeBeforeEachGuard?.()
    removeAfterEachGuard?.()
    removeRouteErrorHandler?.()
  })
</script>

<style>
html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
}
</style>
