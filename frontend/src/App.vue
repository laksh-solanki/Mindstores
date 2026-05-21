<template>
  <v-app>
    <AppHeader v-if="!isAdminPage" />

    <router-view v-if="isAdminPage" />

    <v-main v-else>
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

/* ═════════════════════════════════════════════════════════════
   GLOBAL DARK MODE OVERRIDES (HIGH-CONTRAST FLAT EDITORIAL)
   ═════════════════════════════════════════════════════════════ */
.v-theme--dark .profile-page,
.v-theme--dark .bespoke-profile-container,
.v-theme--dark .cart-page,
.v-theme--dark .catalog-page,
.v-theme--dark .product-detail-page,
.v-theme--dark .admin-page,
.v-theme--dark .payment-page,
.v-theme--dark .order-success-page {
  background-color: #090d16 !important;
  color: #f8fafc !important;
}

.v-theme--dark .page-title,
.v-theme--dark .brand-tagline,
.v-theme--dark .brand-tagline .tag-label,
.v-theme--dark .panel-title,
.v-theme--dark .panel-subtitle,
.v-theme--dark .profile-name,
.v-theme--dark .profile-email,
.v-theme--dark .stat-value,
.v-theme--dark .stat-label,
.v-theme--dark .check-row,
.v-theme--dark .readiness-title,
.v-theme--dark .readiness-subtitle,
.v-theme--dark .dirty-state-text,
.v-theme--dark .clean-state-text,
.v-theme--dark .photo-name,
.v-theme--dark .pref-details strong,
.v-theme--dark .pref-desc,
.v-theme--dark .menu-list-item,
.v-theme--dark .v-list-item-title,
.v-theme--dark .v-list-item-subtitle,
.v-theme--dark .empty-title,
.v-theme--dark .empty-subtitle,
.v-theme--dark .text-h6 {
  color: #f8fafc !important;
}

.v-theme--dark .flat-card-container,
.v-theme--dark .preference-flat-card,
.v-theme--dark .stat-flat-box,
.v-theme--dark .readiness-tracker-card {
  background-color: #121824 !important;
  border: 2px solid #f8fafc !important;
  box-shadow: 4px 4px 0px #f8fafc !important;
  color: #f8fafc !important;
}

.v-theme--dark .stat-flat-box {
  border: 1px solid #f8fafc !important;
  box-shadow: 2px 2px 0px #f8fafc !important;
}

.v-theme--dark .btn-flat-outline {
  border: 2px solid #f8fafc !important;
  color: #f8fafc !important;
  background-color: transparent !important;
}
.v-theme--dark .btn-flat-outline:hover:not(:disabled) {
  background-color: rgba(248, 250, 252, 0.1) !important;
}
.v-theme--dark .btn-flat-outline:disabled {
  border-color: #475569 !important;
  color: #475569 !important;
}

.v-theme--dark .btn-flat-solid {
  background-color: #f8fafc !important;
  color: #090d16 !important;
  border: 2px solid #f8fafc !important;
}
.v-theme--dark .btn-flat-solid:hover:not(:disabled) {
  background-color: #e2e8f0 !important;
  color: #090d16 !important;
  border-color: #e2e8f0 !important;
}
.v-theme--dark .btn-flat-solid:disabled {
  background-color: #1e293b !important;
  color: #475569 !important;
  border-color: #1e293b !important;
}

.v-theme--dark .flat-switch :deep(.v-selection-control__input) {
  color: #f8fafc !important;
}

.v-theme--dark .flat-text-field :deep(.v-field) {
  border-color: #f8fafc !important;
}
.v-theme--dark .flat-text-field :deep(.v-field--focused) {
  border-color: #f8fafc !important;
}
.v-theme--dark .flat-text-field :deep(.v-label) {
  color: #cbd5e1 !important;
}

.v-theme--dark .profile-menu-card {
  background-color: #121824 !important;
  border: 2px solid #f8fafc !important;
}
.v-theme--dark .profile-menu-cover {
  border-bottom: 2px solid #f8fafc !important;
  background-color: #1e293b !important;
}
.v-theme--dark .profile-menu-avatar {
  box-shadow: 0 0 0 2px #f8fafc !important;
}
.v-theme--dark .flat-menu-content {
  border: 2px solid #f8fafc !important;
  box-shadow: 6px 6px 0px #f8fafc !important;
  background-color: #121824 !important;
}
.v-theme--dark .flat-menu-content .v-list {
  background-color: #121824 !important;
}
.v-theme--dark .flat-menu-content .v-list-item {
  color: #f8fafc !important;
}
.v-theme--dark .flat-menu-content .v-list-item:hover {
  background-color: #1e293b !important;
}
.v-theme--dark .v-divider {
  border-color: #f8fafc !important;
  color: #f8fafc !important;
}

.v-theme--dark .dialog-frame-flat {
  background-color: #121824 !important;
  border: 2px solid #f8fafc !important;
  box-shadow: 8px 8px 0px #f8fafc !important;
  color: #f8fafc !important;
}
.v-theme--dark .dialog-frame-flat .mac-titlebar {
  border-bottom: 1px solid #f8fafc !important;
  background: #1e293b !important;
}
.v-theme--dark .dialog-frame-flat .mac-title {
  color: #f8fafc !important;
}
.v-theme--dark .dialog-frame-flat .dialog-inner-card {
  background-color: #121824 !important;
}

/* Admin Page Dark Theme Enhancements */
.v-theme--dark .admin-page .v-card {
  background-color: #121824 !important;
  border-color: rgba(248, 250, 252, 0.15) !important;
  color: #f8fafc !important;
}
.v-theme--dark .admin-page .v-sheet {
  background-color: #121824 !important;
  border-color: rgba(248, 250, 252, 0.15) !important;
}
.v-theme--dark .admin-page .v-data-table {
  background-color: #121824 !important;
  color: #f8fafc !important;
}
.v-theme--dark .admin-page .v-data-table-headers {
  background-color: #1e293b !important;
  color: #f8fafc !important;
}
.v-theme--dark .admin-page .v-data-table-footer {
  color: #cbd5e1 !important;
}
.v-theme--dark .admin-page .v-list {
  background-color: #121824 !important;
}
.v-theme--dark .admin-page .v-list-item {
  color: #f8fafc !important;
}
.v-theme--dark .admin-page .v-pagination__item {
  background-color: #121824 !important;
  color: #f8fafc !important;
  border-color: rgba(248, 250, 252, 0.15) !important;
}
.v-theme--dark .admin-page .v-pagination__item--is-active {
  background-color: #0d9488 !important;
  color: #ffffff !important;
  border-color: #0d9488 !important;
}

/* Storefront AppHeader Dark Theme Overrides */
.v-theme--dark .app-header {
  background-color: #090d16 !important;
  color: #f8fafc !important;
  border-bottom: 2px solid #f8fafc !important;
}
.v-theme--dark .app-header .brand-text {
  color: #f8fafc !important;
}
.v-theme--dark .app-header .brand-avatar {
  border-color: #f8fafc !important;
  background-color: #090d16 !important;
}
.v-theme--dark .app-header .nav-btn {
  color: #f8fafc !important;
}
.v-theme--dark .app-header .nav-btn:hover {
  background-color: rgba(248, 250, 252, 0.1) !important;
}
.v-theme--dark .app-header .nav-btn--active {
  background-color: #f8fafc !important;
  color: #090d16 !important;
}
.v-theme--dark .app-header .v-text-field .v-field {
  background-color: #121824 !important;
  color: #f8fafc !important;
}
.v-theme--dark .app-header .v-text-field .v-field__input {
  color: #f8fafc !important;
}
.v-theme--dark .app-header .v-text-field .v-label {
  color: #cbd5e1 !important;
}
.v-theme--dark .app-header .v-badge__badge {
  background-color: #f8fafc !important;
  color: #090d16 !important;
}
</style>
