<template>
  <v-app>
    <AppHeader />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter v-if="!isAuthPage" />
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

  const isAuthPage = computed(() => ['/login', '/create-account'].includes(route.path))
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
  --ms-bg: #f5f5f5;
  --ms-surface: #ffffff;
  --ms-ink: #1e1e1e;
  --ms-border: #e0e0e0;
}

body {
  font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  color: var(--ms-ink);
  background: var(--ms-bg);
}

.v-main {
  background-color: var(--ms-bg);
}

/* Global alignment + responsive baseline */
:where(
  .home-premium,
  .catalog-page,
  .cart-page,
  .payment-page,
  .admin-page,
  .atelier-product-page,
  .profile-page,
  .order-success-page,
  .auth-page,
  .premium-tos
) {
  background: var(--ms-bg) !important;
  color: #1f1f1f !important;
}

:where(
  .home-premium,
  .catalog-page,
  .cart-page,
  .payment-page,
  .admin-page,
  .atelier-product-page,
  .profile-page,
  .order-success-page,
  .auth-page,
  .premium-tos
) .v-container {
  max-width: 1200px !important;
  padding-inline: 16px !important;
}

:where(
  .home-premium,
  .catalog-page,
  .cart-page,
  .payment-page,
  .admin-page,
  .atelier-product-page,
  .profile-page,
  .order-success-page,
  .auth-page,
  .premium-tos
) :is(h1, h2, h3, h4, h5, h6, p, span, a, button, label) {
  font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif !important;
  letter-spacing: 0 !important;
}

:where(
  .home-premium,
  .catalog-page,
  .cart-page,
  .payment-page,
  .admin-page,
  .atelier-product-page,
  .profile-page,
  .order-success-page,
  .auth-page
) :is(.page-title, .payment-title, .intro-title, .product-title, .success-title, .form-title) {
  font-size: clamp(1.55rem, 2.6vw, 2.2rem) !important;
  line-height: 1.25 !important;
  font-weight: 600 !important;
}

:where(
  .home-premium,
  .catalog-page,
  .cart-page,
  .payment-page,
  .admin-page,
  .atelier-product-page,
  .profile-page,
  .order-success-page,
  .auth-page
) :is(.section-head, .profile-hero, .payment-hero, .cart-hero, .admin-hero, .catalog-intro) {
  text-align: left !important;
  margin-bottom: 12px !important;
}

.hero-glow,
.texture-layer,
.story-overlay,
.hero-badge,
.edition-badge,
.bg-shape,
.bg-grid,
.visual-overlay,
.orb {
  display: none !important;
}

/* Card sizing/alignment */
:is(
  .hero-stage,
  .value-card,
  .collection-card,
  .story-card,
  .membership-card,
  .filter-panel,
  .result-card,
  .cart-item-card,
  .order-summary-card,
  .payment-card,
  .summary-card,
  .admin-surface,
  .mobile-product-card,
  .gallery-board,
  .purchase-panel,
  .detail-card,
  .empty-state,
  .results-empty,
  .collection-empty,
  .profile-card,
  .settings-card,
  .orders-card,
  .success-card,
  .form-card,
  .auth-frame,
  .auth-main,
  .order-item,
  .premium-wrapper,
  .glass-card
) {
  background: var(--ms-surface) !important;
  border: 1px solid var(--ms-border) !important;
  box-shadow: none !important;
  border-radius: 12px !important;
}

:is(.collection-card, .result-card, .story-card, .mobile-product-card, .order-item) {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

:is(.collection-media, .result-media, .hero-frame, .story-image, .cart-item-image-wrapper) {
  aspect-ratio: 4 / 3 !important;
  height: auto !important;
  overflow: hidden !important;
}

:is(.hero-image, .collection-image, .story-image, .result-image, .cart-item-image, .mobile-product-image) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

:is(.hero-row, .catalog-layout, .content-row, .payment-row, .profile-grid, .main-row) {
  row-gap: 16px !important;
}

:is(.summary-actions, .action-row, .hero-actions, .membership-actions, .mobile-actions, .avatar-actions) {
  gap: 10px !important;
  align-items: center !important;
}

/* Button and control alignment */
.v-btn {
  min-height: 40px;
  text-transform: none !important;
  font-weight: 600 !important;
}

.hero-btn--primary,
.membership-btn--primary,
.action-add-to-cart,
.action-buy-now,
.checkout-btn,
.pay-btn,
.add-btn,
.login-btn,
.admin-btn,
.primary-btn,
.submit-btn,
.save-btn {
  background: #1976d2 !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.hero-btn--ghost,
.membership-btn--ghost,
.support-btn--ghost,
.payment-cancel-btn,
.secondary-btn {
  background: transparent !important;
  border-color: var(--ms-border) !important;
  color: #1f1f1f !important;
}

.auth-visual {
  display: none !important;
}

.auth-main {
  width: 100% !important;
  max-width: 540px !important;
  margin: 0 auto !important;
}

.auth-shell {
  min-height: auto !important;
  padding-top: 24px !important;
  padding-bottom: 24px !important;
}

:is(.profile-shell, .success-shell, .cart-shell, .payment-shell, .admin-shell, .catalog-shell, .atelier-shell) {
  padding-top: 24px !important;
  padding-bottom: 24px !important;
}

:is(.hero-shell, .value-section, .collection-section, .stories-section, .membership-section) {
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}

.hero-row {
  min-height: auto !important;
}

.hero-copy h1 {
  font-size: clamp(1.7rem, 3.6vw, 2.25rem) !important;
  line-height: 1.25 !important;
}

.progress-rail {
  grid-template-columns: 1fr !important;
  gap: 8px !important;
  justify-items: center !important;
}

.progress-line {
  width: 1px !important;
  height: 14px !important;
}

@media (min-width: 961px) {
  :where(
    .home-premium,
    .catalog-page,
    .cart-page,
    .payment-page,
    .admin-page,
    .atelier-product-page,
    .profile-page,
    .order-success-page,
    .auth-page,
    .premium-tos
  ) .v-container {
    padding-inline: 24px !important;
  }

  .progress-rail {
    grid-template-columns: auto 1fr auto 1fr auto !important;
    justify-items: stretch !important;
  }

  .progress-line {
    width: auto !important;
    height: 1px !important;
  }
}

@media (max-width: 960px) {
  :is(
    .hero-stage,
    .value-card,
    .collection-card,
    .story-card,
    .membership-card,
    .filter-panel,
    .result-card,
    .cart-item-card,
    .order-summary-card,
    .payment-card,
    .summary-card,
    .admin-surface,
    .mobile-product-card,
    .gallery-board,
    .purchase-panel,
    .detail-card,
    .profile-card,
    .settings-card,
    .orders-card,
    .success-card,
    .form-card,
    .order-item,
    .premium-wrapper,
    .glass-card
  ) {
    border-radius: 10px !important;
  }

  :is(.summary-actions, .action-row, .hero-actions, .membership-actions, .mobile-actions, .avatar-actions) .v-btn {
    min-width: 120px;
  }
}

@media (max-width: 600px) {
  :where(
    .home-premium,
    .catalog-page,
    .cart-page,
    .payment-page,
    .admin-page,
    .atelier-product-page,
    .profile-page,
    .order-success-page,
    .auth-page,
    .premium-tos
  ) .v-container {
    padding-inline: 12px !important;
  }

  :where(
    .home-premium,
    .catalog-page,
    .cart-page,
    .payment-page,
    .admin-page,
    .atelier-product-page,
    .profile-page,
    .order-success-page,
    .auth-page
  ) :is(.page-title, .payment-title, .intro-title, .product-title, .success-title, .form-title) {
    font-size: 1.4rem !important;
  }

  :is(.summary-actions, .action-row, .hero-actions, .membership-actions, .mobile-actions, .avatar-actions) {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  :is(.summary-actions, .action-row, .hero-actions, .membership-actions, .mobile-actions, .avatar-actions) .v-btn {
    width: 100% !important;
  }

  :is(.collection-media, .result-media, .hero-frame, .story-image, .cart-item-image-wrapper) {
    aspect-ratio: 1 / 1 !important;
  }
}
</style>
