<template>
  <v-app>
    <AppHeader v-if="!isAdminPage" />

    <router-view v-if="isAdminPage" />

    <v-main v-else>
      <router-view />
    </v-main>

    <AppFooter v-if="!isAuthPage && !isAdminPage" />
    <DisclaimerDialog />
    <CookieConsent />
    <FullScreenLoader :model-value="showFullscreenLoader" />
  </v-app>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useTheme } from 'vuetify'
  import AppFooter from '@/components/AppFooter.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import CookieConsent from '@/components/CookieConsent.vue'
  import DisclaimerDialog from '@/components/DisclaimerDialog.vue'
  import FullScreenLoader from '@/components/FullScreenLoader.vue'
  import { useAppStore } from '@/stores/app'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const routeLoading = ref(false)
  const theme = useTheme()

  watch(
    () => route.path,
    (newPath) => {
      if (newPath === '/admin') {
        const saved = localStorage.getItem('mindstore_theme') || 'light'
        theme.change(saved)
      } else {
        theme.change('light')
      }
    },
    { immediate: true }
  )

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
body {
  min-height: 100%;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
}

#app {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  width: 100%;
}

body {
  margin: 0;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* Touch targets and smooth interaction */
button, a, input, select, textarea {
  touch-action: manipulation;
}

.min-width-0 {
  min-width: 0 !important;
}

/* ═════════════════════════════════════════════════════════════
   UNIFIED STORE DESIGN SYSTEM (MINIMAL FLAT E-COMMERCE)
   ═════════════════════════════════════════════════════════════ */
.site-container {
  max-width: 1280px;
  width: 100%;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-inline: clamp(16px, 3.5vw, 32px) !important;
}

/* Standard Buttons */
.btn-store-primary {
  height: 48px !important;
  padding: 0 24px !important;
  background: #0f172a !important;
  color: #ffffff !important;
  border: 1.5px solid #0f172a !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}
.btn-store-primary:hover:not(:disabled) {
  background: #1e293b !important;
  border-color: #1e293b !important;
}
.btn-store-primary:disabled {
  background: #cbd5e1 !important;
  border-color: #cbd5e1 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
}

.btn-store-outline {
  height: 48px !important;
  padding: 0 24px !important;
  background: transparent !important;
  color: #0f172a !important;
  border: 1.5px solid #0f172a !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}
.btn-store-outline:hover:not(:disabled) {
  background: #f8fafc !important;
  border-color: #0d9488 !important;
  color: #0d9488 !important;
}
.btn-store-outline:disabled {
  border-color: #cbd5e1 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
}

.btn-store-sm {
  height: 36px !important;
  padding: 0 16px !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
  border-radius: 0 !important;
}

.btn-store-icon {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #0f172a !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 0 !important;
  cursor: pointer !important;
  transition: background-color 0.15s ease !important;
}
.btn-store-icon:hover:not(:disabled) {
  background: #0d9488 !important;
}
.btn-store-icon:disabled {
  background: #e2e8f0 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
}

/* Standard Content Card */
.store-card {
  background: #ffffff !important;
  border: 1.5px solid #0f172a !important;
  border-radius: 0 !important;
  padding: 24px !important;
}

/* Unified Product Card System (Used in Home and Catalog) */
.product-card-unified {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1.5px solid #0f172a;
  margin-right: -1.5px;
  margin-bottom: -1.5px;
  cursor: pointer;
  position: relative;
  z-index: 0;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.product-card-unified:hover {
  background: #fafafa;
  border-color: #0d9488;
  z-index: 2;
}

.product-card-unified .product-card-img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #fafafa;
  border-bottom: 1.5px solid #0f172a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.product-card-unified .product-card-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}
.product-card-unified:hover .product-card-img {
  transform: scale(1.04);
}

.product-card-unified .product-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
}

.product-card-unified .product-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.product-card-unified .product-card-category {
  font-size: 10px;
  font-weight: 800;
  color: #0d9488;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.product-card-unified .product-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
  line-height: 1.35;
  min-height: 2.7em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card-unified .product-card-subcat {
  font-size: 11px;
  color: #64748b;
  margin: 0 0 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-card-unified .product-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
}

.product-card-unified .product-card-price {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

/* ═════════════════════════════════════════════════════════════
   GLOBAL CUSTOM SCROLLBAR (MATCHES FLAT EDITORIAL DESIGN)
   ═════════════════════════════════════════════════════════════ */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
}

::-webkit-scrollbar-thumb {
  background: #0f172a;
  border: 2px solid #f8fafc;
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: #334155;
}

html {
  scrollbar-color: #0f172a #f8fafc;
  scrollbar-width: thin;
}

/* ═════════════════════════════════════════════════════════════
   GLOBAL DARK MODE OVERRIDES (HIGH-CONTRAST FLAT EDITORIAL)
   ═════════════════════════════════════════════════════════════ */
.v-theme--dark ::-webkit-scrollbar-track {
  background: #090d16;
  border-left: 1px solid #1e293b;
}

.v-theme--dark ::-webkit-scrollbar-thumb {
  background: #f8fafc;
  border: 2px solid #090d16;
}

.v-theme--dark ::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.v-theme--dark {
  scrollbar-color: #f8fafc #090d16;
}
.v-theme--dark .profile-page,
.v-theme--dark .bespoke-profile-container,
.v-theme--dark .cart-page,
.v-theme--dark .catalog-page,
.v-theme--dark .product-detail-page,
.v-theme--dark .admin-page,
.v-theme--dark .payment-page,
.v-theme--dark .order-success-page,
.v-theme--dark .home-page,
.v-theme--dark .user-admin-page,
.v-theme--dark .bespoke-admin-container,
.v-theme--dark .bespoke-auth-container,
.v-theme--dark .privacy-page,
.v-theme--dark .terms-page {
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

  color: #f8fafc !important;
}

.v-theme--dark .stat-flat-box {
  border: 1px solid #f8fafc !important;

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

.v-theme--dark .store-card,
.v-theme--dark .product-card-unified {
  background-color: #121824 !important;
  border-color: #f8fafc !important;
  color: #f8fafc !important;
}

.v-theme--dark .product-card-unified .product-card-img-box {
  background-color: #0f172a !important;
  border-bottom-color: #f8fafc !important;
}

.v-theme--dark .product-card-unified .product-card-title,
.v-theme--dark .product-card-unified .product-card-price {
  color: #f8fafc !important;
}

.v-theme--dark .btn-store-primary {
  background-color: #f8fafc !important;
  color: #090d16 !important;
  border-color: #f8fafc !important;
}
.v-theme--dark .btn-store-primary:hover:not(:disabled) {
  background-color: #e2e8f0 !important;
  color: #090d16 !important;
}

.v-theme--dark .btn-store-outline {
  border-color: #f8fafc !important;
  color: #f8fafc !important;
  background-color: transparent !important;
}
.v-theme--dark .btn-store-outline:hover:not(:disabled) {
  background-color: rgba(248, 250, 252, 0.1) !important;
}

.v-theme--dark .btn-store-icon {
  background-color: #f8fafc !important;
  color: #090d16 !important;
}
.v-theme--dark .btn-store-icon:hover:not(:disabled) {
  background-color: #0d9488 !important;
  color: #ffffff !important;
}

.v-theme--dark .flat-switch .v-selection-control__input {
  color: #f8fafc !important;
}

.v-theme--dark .flat-text-field .v-field {
  border: 1px solid #334155 !important;
}
.v-theme--dark .flat-text-field .v-field--focused {
  border-color: #f8fafc !important;
}
.v-theme--dark .flat-text-field .v-label {
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

.v-theme--dark .flat-menu-content {
  border: 2px solid #f8fafc !important;

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
  border: 1px solid #334155 !important;
  color: #f8fafc !important;
}
.v-theme--dark .admin-page .v-sheet {
  background-color: #121824 !important;
  border: 1px solid #334155 !important;
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

/* ═════════════════════════════════════════════════════════════
   USER ADMIN CONSOLE & OTHER PAGES DARK MODE OVERRIDES
   ═════════════════════════════════════════════════════════════ */
.v-theme--dark .user-admin-page {
  background-color: #090d16 !important;
}

.v-theme--dark .admin-topbar {
  border-bottom-color: #1e293b !important;
}

.v-theme--dark .section-title,
.v-theme--dark .section-subtitle,
.v-theme--dark .metric-value {
  color: #f8fafc !important;
}

.v-theme--dark .metric-card-flat {
  background-color: #121824 !important;
  border-color: #f8fafc !important;
}

.v-theme--dark .metric-avatar-flat {
  background-color: #1e293b !important;
  border-color: #334155 !important;
}

.v-theme--dark .custom-progress-container {
  background-color: #334155 !important;
  border-color: #334155 !important;
}

.v-theme--dark .custom-progress-bar {
  border-right-color: #0d9488 !important;
}

.v-theme--dark .custom-nav-item {
  color: #f8fafc !important;
}
.v-theme--dark .custom-nav-item:hover {
  border-color: #334155 !important;
  background-color: #1e293b !important;
}
.v-theme--dark .active-nav-item {
  background-color: #f8fafc !important;
  color: #090d16 !important;
  border-color: #f8fafc !important;
}

.v-theme--dark .custom-admin-table thead th {
  border-bottom: 2px solid #f8fafc !important;
  color: #f8fafc !important;
  background-color: #1e293b !important;
}

.v-theme--dark .custom-admin-table tbody td {
  border-bottom: 1px solid #1e293b !important;
  color: #cbd5e1 !important;
}

.v-theme--dark .avatar-flat-mini,
.v-theme--dark .table-avatar-flat {
  border-color: #f8fafc !important;
  background-color: #1e293b !important;
}

.v-theme--dark .action-icon-btn {
  border-color: #334155 !important;
  background-color: #121824 !important;
  color: #cbd5e1 !important;
}
.v-theme--dark .action-icon-btn:hover {
  border-color: #f8fafc !important;
  color: #f8fafc !important;
  background-color: #1e293b !important;
}

.v-theme--dark .border-bottom-dashed {
  border-bottom-color: #1e293b !important;
}

.v-theme--dark .review-comment {
  color: #cbd5e1 !important;
}

.v-theme--dark .review-item-flat {
  border-bottom-color: #1e293b !important;
}

/* Global Dark Theme Overrides for Text */
.v-theme--dark .text-slate-900,
.v-theme--dark .text-slate-800,
.v-theme--dark .text-slate-700 {
  color: #f8fafc !important;
}

.v-theme--dark .text-slate-600,
.v-theme--dark .text-slate-500,
.v-theme--dark .text-slate-400 {
  color: #94a3b8 !important;
}

.v-theme--dark .bg-light {
  background-color: #1e293b !important;
}

/* Stock adjuster button styles */
.inline-stock-adjuster .stock-btn-flat {
  width: 24px;
  height: 24px;
  border: 1px solid #0f172a;
  background-color: #ffffff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.inline-stock-adjuster .stock-btn-flat:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.inline-stock-adjuster .stock-btn-flat:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.v-theme--dark .inline-stock-adjuster .stock-btn-flat {
  border-color: #f8fafc;
  background-color: #121824;
  color: #f8fafc;
}

.v-theme--dark .inline-stock-adjuster .stock-btn-flat:hover:not(:disabled) {
  background-color: #1e293b;
}

/* Privacy & Terms pages dark mode styles */
.v-theme--dark .premium-wrapper,
.v-theme--dark .glass-card {
  background: #121824 !important;
  color: #f8fafc !important;
  border-color: #334155 !important;
}

.v-theme--dark .premium-tos .bg-gradient {
  background: radial-gradient(circle at top right, #090d16, #090d16) !important;
}

.v-theme--dark .section {
  border-bottom-color: rgba(248, 250, 252, 0.1) !important;
}

.v-theme--dark .section-icon {
  background: #1e293b !important;
  color: #a5b4fc !important;
}

.v-theme--dark .contact-box {
  background: #1e293b !important;
  border-color: #334155 !important;
}

.v-theme--dark .tos-tab.v-tab--selected {
  color: #f8fafc !important;
}

.v-theme--dark .header-actions .v-btn {
  color: #f8fafc !important;
}
</style>
