<template>
  <v-app-bar
    v-if="route.path !== '/login'"
    app
    class="app-bar"
    :color="isScrolled ? 'surface' : 'transparent'"
    :elevation="isScrolled ? 1 : 0"
    flat
  >
    <v-container class="d-flex align-center px-8">
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
        class="ml-2"
        color="primary"
        to="/admin"
        variant="flat"
      >
        Admin
      </v-btn>

      <v-btn v-if="!appStore.isAuthenticated" color="primary" to="/login" variant="flat">
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
        // REFIX: Call the correct init method from app.js
        appStore.initAuthListener()
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
  font-size: 1.5rem;
  font-weight: 700;
  color: #2F4F4F;
  letter-spacing: 2px;
}

.app-bar {
  transition: all 0.3s ease;
}

.nav-btn {
  font-family: 'Manrope', sans-serif;
  text-transform: none;
  font-weight: 500;
  position: relative;
}

.cart-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
