<template>
  <v-app-bar
    v-if="route.path !== '/login'"
    app
    class="app-bar"
    :color="isScrolled ? 'surface' : 'transparent'"
    :elevation="isScrolled ? 2 : 0"
    flat
  >
    <v-container class="d-flex align-center header-shell px-4 px-md-8">
      <router-link class="logo-link" to="/">
        <h1 class="logo-text">MINDSTORE</h1>
      </router-link>

      <v-spacer />

      <v-btn class="nav-btn" to="/" variant="text">
        Home
      </v-btn>

      <v-btn class="nav-btn" icon to="/cart" variant="text">
        <v-icon>mdi-cart-outline</v-icon>
        <v-badge v-if="cartStore.itemCount > 0" class="cart-badge" color="accent" :content="cartStore.itemCount" />
      </v-btn>

      <v-btn
        v-if="appStore.isAuthenticated"
        class="nav-btn"
        icon
        to="/profile"
        variant="text"
      >
        <v-icon>mdi-account-circle</v-icon>
      </v-btn>

      <v-btn
        v-if="appStore.isAuthenticated && appStore.user"
        class="ml-2 admin-btn"
        color="primary"
        to="/admin"
        variant="flat"
      >
        Admin
      </v-btn>

      <v-btn
        v-if="!appStore.isAuthenticated"
        class="login-btn"
        color="primary"
        to="/login"
        variant="flat"
      >
        Login
      </v-btn>
    </v-container>
  </v-app-bar>
</template>
<script>
  import { onMounted, onUnmounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'

  export default {
    name: 'App',
    setup() {
      const route = useRoute()
      // REFIX: Use appStore instead of authStore
      const appStore = useAppStore()
      const cartStore = useCartStore()
      const isScrolled = ref(false)

      const handleScroll = () => {
        isScrolled.value = window.scrollY > 20
      }

      onMounted(() => {
        window.addEventListener('scroll', handleScroll)
      })

      onUnmounted(() => {
        window.removeEventListener('scroll', handleScroll)
      })

      return {
        route,
        isScrolled,
        appStore,
        cartStore
      }
    }
  }
</script>
<style>
.logo-link {
  text-decoration: none;
}

.logo-text {
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: #1a2426;
  letter-spacing: 1.4px;
}

.app-bar {
  transition: all 0.25s ease;
  backdrop-filter: blur(10px);
}

.header-shell {
  border-bottom: 1px solid transparent;
}

.app-bar.v-toolbar--elevated .header-shell {
  border-bottom-color: var(--ms-border);
}

.nav-btn {
  font-family: 'Manrope', sans-serif;
  text-transform: none;
  font-weight: 600;
  color: #243036;
  position: relative;
}

.cart-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

.admin-btn,
.login-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 999px;
}

@media (max-width: 600px) {
  .logo-text {
    font-size: 1.1rem;
    letter-spacing: 1px;
  }

  .nav-btn {
    min-width: 38px;
    padding: 0 6px;
  }
}
</style>
