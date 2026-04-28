<template>
  <template v-if="!isAuthPage">
    <v-app-bar app border="sm" elevation="1">
      <v-container class="header-container">
        <router-link class="brand-link" to="/">
          <v-img alt="Mindstore logo" class="brand-logo" src="../assets/logo.svg" width="34" />
          <span class="brand-title">Mindstore</span>
        </router-link>

        <div class="d-none d-md-flex align-center ga-1">
          <v-btn to="/" variant="text">Home</v-btn>

          <v-menu>
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="text">
                Categories
                <v-icon end size="18">mdi-chevron-down</v-icon>
              </v-btn>
            </template>

            <v-list density="compact" min-width="280">
              <template v-for="category in categoryDropdown" :key="category.key">
                <v-list-subheader>{{ category.label }}</v-list-subheader>
                <v-list-item
                  v-for="item in category.items"
                  :key="item.key"
                  :prepend-icon="item.icon"
                  :title="item.name"
                  @click="openCatalogItem(category.key, item.key)"
                />
              </template>
            </v-list>
          </v-menu>

          <v-btn class="cart-btn" to="/cart" variant="text">
            Cart
            <v-badge
              v-if="cartStore.itemCount > 0"
              color="primary"
              :content="cartStore.itemCount"
              inline
            />
          </v-btn>
        </div>

        <div class="d-flex align-center ga-1">
          <v-btn
            v-if="appStore.isAuthenticated"
            icon
            to="/profile"
            variant="text"
          >
            <v-avatar v-if="profileImage" :image="profileImage" size="32" />
            <v-icon v-else>mdi-account-circle</v-icon>
          </v-btn>

          <v-btn
            v-if="appStore.isAuthenticated && canAccessAdmin"
            class="d-none d-md-inline-flex"
            to="/admin"
            variant="tonal"
          >
            Admin
          </v-btn>

          <v-btn v-if="!appStore.isAuthenticated" to="/login">
            Login
          </v-btn>

          <v-btn
            aria-label="Open menu"
            class="d-md-none"
            icon
            variant="text"
            @click="toggleMobileMenu"
          >
            <v-icon>{{ isMobileMenuOpen ? 'mdi-close' : 'mdi-menu' }}</v-icon>
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer
      v-model="isMobileMenuOpen"
      location="right"
      temporary
      width="290"
    >
      <v-list density="comfortable" nav>
        <v-list-item prepend-icon="mdi-home-outline" title="Home" to="/" @click="closeMobileMenu" />
        <v-list-group value="categories">
          <template #activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-shape-outline" title="Categories" />
          </template>
          <template v-for="category in categoryDropdown" :key="`mobile-${category.key}`">
            <v-list-subheader>{{ category.label }}</v-list-subheader>
            <v-list-item
              v-for="item in category.items"
              :key="`mobile-${category.key}-${item.key}`"
              :prepend-icon="item.icon"
              :title="item.name"
              @click="openCatalogItemFromMobile(category.key, item.key)"
            />
          </template>
        </v-list-group>
        <v-list-item prepend-icon="mdi-cart-outline" title="Cart" to="/cart" @click="closeMobileMenu">
          <template #append>
            <v-badge
              v-if="cartStore.itemCount > 0"
              color="primary"
              :content="cartStore.itemCount"
            />
          </template>
        </v-list-item>
        <v-list-item
          v-if="appStore.isAuthenticated"
          prepend-icon="mdi-account-outline"
          title="Profile"
          to="/profile"
          @click="closeMobileMenu"
        />
        <v-list-item
          v-if="appStore.isAuthenticated && canAccessAdmin"
          prepend-icon="mdi-shield-star-outline"
          title="Admin"
          to="/admin"
          @click="closeMobileMenu"
        />
        <v-list-item
          v-if="!appStore.isAuthenticated"
          prepend-icon="mdi-login"
          title="Login"
          to="/login"
          @click="closeMobileMenu"
        />
      </v-list>
    </v-navigation-drawer>
  </template>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { CATALOG_MENU } from '@/constants/catalogMenu'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const cartStore = useCartStore()

  const isMobileMenuOpen = ref(false)
  const categoryDropdown = CATALOG_MENU
  const isAuthPage = computed(() => ['/login', '/create-account'].includes(route.path))
  const profileImage = computed(() =>
    appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url || null,
  )
  const canAccessAdmin = computed(() => Boolean(appStore.user?.is_admin))

  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
  }

  const openCatalogItem = (categoryKey, itemKey) => {
    const targetCategory = categoryDropdown.find((category) => category.key === categoryKey)
    const targetItem = targetCategory?.items.find((item) => item.key === itemKey)
    if (!targetCategory || !targetItem) return
    closeMobileMenu()
    router.push(`/${targetCategory.key}/${targetItem.key}`)
  }

  const openCatalogItemFromMobile = (categoryKey, itemKey) => {
    openCatalogItem(categoryKey, itemKey)
  }

  watch(
    () => route.fullPath,
    () => {
      closeMobileMenu()
    },
  )
</script>

<style scoped>
.header-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.brand-logo {
  border-radius: 4px;
}

.brand-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f1f1f;
}

.cart-btn {
  gap: 6px;
}
</style>
