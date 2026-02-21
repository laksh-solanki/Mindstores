<template>
  <v-app-bar
    v-if="route.path !== '/login'"
    app
    class="app-header"
    :class="{ 'is-scrolled': isScrolled }"
    flat
    height="86"
  >
    <v-container class="header-shell px-4 px-md-8">
      <router-link class="brand-link" to="/">
        <v-img alt="logo" class="brand-mark" src="../assets/logo.svg" width="49" />
        <span class="brand-copy">
          <span class="brand-title">MINDSTORE</span>
          <span class="brand-subtitle">Curated Essentials</span>
        </span>
      </router-link>

      <v-spacer />

      <div class="nav-pill d-none d-md-flex">
        <v-btn class="nav-btn" to="/" variant="text">
          Home
        </v-btn>
        <v-btn class="nav-btn" to="/cart" variant="text">
          Cart
          <v-badge v-if="cartStore.itemCount > 0" class="cart-badge" color="accent" :content="cartStore.itemCount" />
        </v-btn>
      </div>

      <div class="action-cluster">
        <v-btn class="nav-btn d-md-none" to="/" variant="text">
          Home
        </v-btn>

        <v-btn class="icon-btn mobile-cart-btn d-md-none" icon to="/cart" variant="text">
          <v-badge v-if="cartStore.itemCount > 0" color="accent" :content="cartStore.itemCount" floating>
            <v-icon>mdi-cart-outline</v-icon>
          </v-badge>
          <v-icon v-else>mdi-cart-outline</v-icon>
        </v-btn>

        <v-btn
          v-if="appStore.isAuthenticated"
          class="icon-btn"
          icon
          to="/profile"
          variant="text"
        >
          <v-avatar v-if="profileImage" class="header-avatar" :image="profileImage" size="36" />
          <v-icon v-else>mdi-account-circle</v-icon>
        </v-btn>

        <v-btn v-if="appStore.isAuthenticated && canAccessAdmin" class="admin-btn" to="/admin" variant="flat">
          <v-icon start>mdi-shield-star-outline</v-icon>
          Admin
        </v-btn>

        <v-btn v-if="!appStore.isAuthenticated" class="login-btn" to="/login" variant="flat">
          Login
        </v-btn>
      </div>
    </v-container>
  </v-app-bar>
</template>
<script>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'

  export default {
    name: 'AppHeader',
    setup() {
      const route = useRoute()
      const appStore = useAppStore()
      const cartStore = useCartStore()
      const isScrolled = ref(false)
      const profileImage = computed(() =>
        appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url || null,
      )
      const canAccessAdmin = computed(() => Boolean(appStore.user?.is_admin))

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
        profileImage,
        canAccessAdmin,
        appStore,
        cartStore
      }
    }
  }
</script>
<style>
.header-shell {
  height: 100%;
  display: flex;
  align-items: center;
}

.app-header {
  transition: background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  background: linear-gradient(130deg, rgba(255, 255, 255, 0.9), rgba(246, 249, 247, 0.92));
  border-bottom: 1px solid rgba(181, 195, 188, 0.36);
  backdrop-filter: blur(14px);
}

.app-header.is-scrolled {
  background: linear-gradient(130deg, rgba(255, 255, 255, 0.96), rgba(243, 248, 245, 0.96));
  box-shadow: 0 12px 28px rgba(18, 34, 30, 0.08);
  border-bottom-color: rgba(178, 194, 186, 0.62);
}

.brand-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.06rem;
  font-weight: 700;
  letter-spacing: 1.4px;
  line-height: 1;
  color: #162224;
}

.brand-subtitle {
  font-size: 0.72rem;
  color: #64747b;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-top: 4px;
}

.nav-pill {
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.82), rgba(235, 242, 238, 0.9));
  border: 1px solid rgba(178, 194, 186, 0.6);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
  margin-right: 8px;
}

.nav-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 999px;
  color: #263338;
  letter-spacing: 0.1px;
}

.nav-btn:hover {
  background: rgba(217, 228, 223, 0.54);
}

.action-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  color: #203034;
}

.mobile-cart-btn {
  position: relative;
}

.header-avatar {
  border: 1px solid rgba(182, 197, 189, 0.9);
  box-shadow: 0 4px 12px rgba(25, 44, 46, 0.16);
}

.cart-badge {
  position: absolute;
  top: 6px;
  right: 6px;
}

.admin-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 999px;
  background: #223335;
  color: #f6fbfa;
  padding-inline: 14px;
}

.login-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 999px;
  padding-inline: 18px;
  color: #ffffff;
  background: linear-gradient(120deg, #cc7a2d, #b45f1e);
  box-shadow: 0 8px 20px rgba(199, 116, 43, 0.28);
}

@media (max-width: 600px) {
  .brand-copy {
    display: none;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 0.84rem;
  }

  .action-cluster {
    gap: 4px;
  }

  .admin-btn,
  .login-btn {
    min-width: unset;
    padding-inline: 12px;
  }
}
</style>
