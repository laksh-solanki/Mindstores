<template>
  <template v-if="!isAuthPage">
    <v-app-bar app class="app-header" color="white" elevation="0">
      <v-container class="header-container d-flex align-center ga-md-5" fluid>
        <router-link class="brand-link d-flex align-center text-decoration-none ga-2" to="/">
          <v-avatar color="white" rounded="0" size="33">
            <v-img alt="Mindstore logo" src="../assets/logo.svg" width="23" />
          </v-avatar>
          <div class="d-none d-sm-flex flex-column brand-text">
            <span class="text-subtitle-1 font-weight-black">MINDSTORE</span>
          </div>
        </router-link>

        <div class="desktop-category-nav d-none d-lg-flex align-center ga-1 overflow-x-auto flex-grow-1">
          <v-btn
            class="nav-btn"
            :class="{ 'nav-btn--active': route.path === '/' }"
            color="black"
            rounded="0"
            to="/"
            :variant="route.path === '/' ? 'flat' : 'text'"
          >
            Home
          </v-btn>
          <v-btn
            v-for="category in categoryLinks"
            :key="category.key"
            class="nav-btn"
            :class="{ 'nav-btn--active': activeCategoryKey === category.key }"
            color="black"
            rounded="0"
            :variant="activeCategoryKey === category.key ? 'flat' : 'text'"
            @click="openCategory(category.key)"
          >
            {{ category.label }}
          </v-btn>
          <v-chip
            v-if="categoriesLoading && categoryLinks.length === 0"
            class="sync-chip"
            color="black"
            size="small"
            variant="outlined"
          >
            Syncing catalog
          </v-chip>
        </div>

        <div class="header-search d-none d-md-block flex-grow-1">
          <v-menu
            v-model="isSearchOpen"
            :close-on-content-click="false"
            content-class="flat-menu-content"
            location="bottom end"
            max-width="380"
          >
            <template #activator="{ props }">
              <div v-bind="props">
                <v-text-field
                  v-model="searchQuery"
                  bg-color="white"
                  clearable
                  density="compact"
                  hide-details
                  label="Search products..."
                  prepend-inner-icon="mdi-magnify"
                  rounded="0"
                  single-line
                  variant="outlined"
                  @focus="isSearchOpen = true"
                  @keydown.enter.prevent="submitSearch"
                />
              </div>
            </template>

            <v-list density="comfortable">
              <v-list-item v-if="searchSuggestions.length === 0" disabled>
                <v-list-item-title>{{ searchQuery ? 'No matching products' : 'Type product or category'
                }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-for="suggestion in searchSuggestions"
                :key="`${suggestion.type}-${suggestion.id}`"
                :prepend-icon="suggestion.icon"
                :subtitle="suggestion.subtitle"
                :title="suggestion.title"
                @click="openSearchSuggestion(suggestion)"
              />
            </v-list>
          </v-menu>
        </div>

        <div class="header-actions">
          <v-btn
            aria-label="Cart"
            class="cart-action-btn mr-2"
            icon
            rounded="0"
            to="/cart"
            variant="text"
          >
            <v-badge
              v-if="cartStore.itemCount > 0"
              class="flat-cart-badge"
              color="black"
              :content="cartStore.itemCount"
              floating
              location="top right"
            >
              <v-icon>mdi-cart-outline</v-icon>
            </v-badge>
            <v-icon v-else>mdi-cart-outline</v-icon>
          </v-btn>

          <v-menu v-if="appStore.isAuthenticated" content-class="flat-menu-content" location="bottom end" offset="3">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                class="account-action"
                icon
                rounded="0"
                variant="text"
              >
                <v-avatar v-if="profileImage" :image="profileImage" rounded="lg" size="37" />
                <v-avatar v-else color="black" rounded="lg" size="37">
                  <span class="text-white text-caption font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
              </v-btn>
            </template>

            <v-card
              border="0"
              class="profile-menu-card"
              elevation="0"
              rounded="0"
              width="320"
            >
              <v-sheet class="profile-menu-cover" color="grey-lighten-4" height="95" />
              <div class="profile-menu-identity">
                <v-avatar
                  v-if="profileImage"
                  class="profile-menu-avatar pa-1"
                  :image="profileImage"
                  rounded="lg"
                  size="88"
                />
                <v-avatar
                  v-else
                  class="profile-menu-avatar"
                  color="black"
                  rounded="lg"
                  size="88"
                >
                  <span class="text-white text-h5 font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
                <div class="text-h6 font-weight-black text-center mt-3" style="color: #0f172a;">
                  {{ userName }}
                </div>
              </div>
              <v-divider class="border-opacity-100" style="color: #0f172a;" />
              <v-list class="pa-1" density="comfortable">
                <v-list-item
                  class="menu-list-item"
                  prepend-icon="mdi-account-outline"
                  rounded="0"
                  title="Profile"
                  to="/profile"
                />
                <v-list-item
                  class="menu-list-item"
                  prepend-icon="mdi-receipt-text-outline"
                  rounded="0"
                  title="Order History"
                  to="/orders"
                />
                <v-list-item
                  class="menu-list-item"
                  prepend-icon="mdi-cart-outline"
                  rounded="0"
                  title="Cart"
                  to="/cart"
                />
                <v-list-item
                  v-if="canAccessAdmin"
                  class="mb-1 menu-list-item"
                  prepend-icon="mdi-shield-star-outline"
                  rounded="0"
                  title="Admin"
                  to="/admin"
                />

                <v-divider class="border-opacity-100" style="color: #0f172a;" />
                <v-list-item class="mt-1">
                  <v-btn
                    class="logout-btn"
                    color="black"
                    prepend-icon="mdi-logout"
                    rounded="0"
                    text="Logout"
                    variant="outlined"
                    width="100%"
                    @click="logout"
                  >
                    Logout
                  </v-btn>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>

          <v-btn
            v-else
            aria-label="Login"
            class="login-action"
            color="black"
            rounded="0"
            to="/login"
            variant="flat"
          >
            <v-icon class="d-sm-none" icon="mdi-login" />
            <span class="d-none d-sm-inline">Login</span>
          </v-btn>

          <v-btn
            aria-label="Open menu"
            class="d-lg-none menu-action"
            icon
            rounded="0"
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
      class="mobile-drawer"
      elevation="0"
      location="right"
      temporary
      width="320"
    >
      <v-sheet class="pa-4 border-b-sm" style="border-bottom-color: #0f172a !important;">
        <v-text-field
          v-model="searchQuery"
          clearable
          density="comfortable"
          hide-details
          label="Search products..."
          prepend-inner-icon="mdi-magnify"
          rounded="0"
          variant="outlined"
          @keydown.enter.prevent="submitSearch"
        />
      </v-sheet>

      <v-list class="mobile-drawer-list" density="comfortable" nav>
        <v-list-item
          prepend-icon="mdi-home-outline"
          rounded="0"
          title="Home"
          to="/"
          @click="closeMobileMenu"
        />
        <v-list-subheader class="mobile-subheader">Categories</v-list-subheader>
        <v-list-item
          v-for="category in categoryLinks"
          :key="category.key"
          :active="activeCategoryKey === category.key"
          :prepend-icon="category.icon"
          rounded="0"
          :title="category.label"
          @click="openCategory(category.key)"
        />
        <v-list-item v-if="categoryLinks.length === 0" disabled title="Loading categories..." />
        <v-divider class="my-2 border-opacity-100" style="color: #0f172a;" />
        <v-list-item
          prepend-icon="mdi-cart-outline"
          rounded="0"
          title="Cart"
          to="/cart"
          @click="closeMobileMenu"
        >
          <template #append>
            <v-badge
              v-if="cartStore.itemCount > 0"
              class="flat-cart-badge"
              color="black"
              :content="cartStore.itemCount"
              inline
            />
          </template>
        </v-list-item>
        <v-list-item
          v-if="appStore.isAuthenticated"
          prepend-icon="mdi-account-outline"
          rounded="0"
          title="Profile"
          to="/profile"
          @click="closeMobileMenu"
        />
        <v-list-item
          v-if="appStore.isAuthenticated && canAccessAdmin"
          prepend-icon="mdi-shield-star-outline"
          rounded="0"
          title="Admin"
          to="/admin"
          @click="closeMobileMenu"
        />
        <v-list-item
          v-if="appStore.isAuthenticated"
          prepend-icon="mdi-logout"
          rounded="0"
          title="Logout"
          @click="logout"
        />
        <v-list-item
          v-else
          prepend-icon="mdi-login"
          rounded="0"
          title="Login"
          to="/login"
          @click="closeMobileMenu"
        />
      </v-list>
    </v-navigation-drawer>
  </template>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { buildCatalogEntries, slugifyCatalogValue } from '@/utils/catalog'
  import { safeDisplayImageUrl } from '@/utils/images'
  import { clearProductsCache } from '@/utils/productCache'
  import { extractProductItems, fetchProductList } from '@/utils/products'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const cartStore = useCartStore()


  const isMobileMenuOpen = ref(false)
  const productsCache = ref([])
  const categoriesLoading = ref(false)
  const searchQuery = ref('')
  const isSearchOpen = ref(false)

  const isAuthPage = computed(() => ['/login', '/create-account'].includes(route.path))
  const activeCategoryKey = computed(() => String(route.params.category || '').trim())
  const profileImage = computed(() =>
    safeDisplayImageUrl(appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url),
  )
  const canAccessAdmin = computed(() => Boolean(appStore.user?.is_admin))
  const userName = computed(() => appStore.user?.name || 'Account')
  const userInitials = computed(() => {
    return (
      String(userName.value || 'MS')
        .split(/\s|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.slice(0, 1).toUpperCase())
        .join('') || 'MS'
    )
  })

  const categoryLinks = computed(() => buildCatalogEntries(productsCache.value).map((category) => ({
    key: category.key,
    label: category.label,
    icon: category.icon,
    apiCategory: category.apiCategory,
  })))

  const searchSuggestions = computed(() => {
    const query = String(searchQuery.value || '').trim()
    const normalizedQuery = query.toLowerCase()
    if (!query) {
      return []
    }

    const categoryMatches = categoryLinks.value
      .filter((category) => category.label.toLowerCase().includes(normalizedQuery) || category.key.includes(slugifyCatalogValue(query)))
      .slice(0, 3)
      .map((category) => ({
        id: category.key,
        type: 'category',
        title: category.label,
        subtitle: 'Category',
        icon: category.icon,
        target: `/${category.key}`,
      }))

    const productMatches = productsCache.value
      .filter((product) => {
        return [product?.name, product?.company, product?.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .slice(0, 5)
      .map((product) => ({
        id: product.product_id,
        type: 'product',
        title: product.name,
        subtitle: `Search ${product.category || 'catalog'}`,
        icon: 'mdi-magnify',
        target: buildSearchTarget(query, product.category),
      }))

    return [...categoryMatches, ...productMatches].slice(0, 6)
  })

  function buildSearchTarget(searchTerm, category = '') {
    const query = String(searchTerm || '').trim()
    const categoryKey = slugifyCatalogValue(category)
    const path = categoryKey ? `/${categoryKey}` : '/products'
    const params = new URLSearchParams()
    if (query) {
      params.set('search', query)
    }
    return params.toString() ? `${path}?${params.toString()}` : path
  }

  async function loadCatalogNav(options = {}) {
    categoriesLoading.value = true
    try {
      const force = Boolean(options.force)
      const response = await fetchProductList({
        params: {
          limit: 250,
          sort: 'name_asc',
          ...(force ? { refresh: Date.now() } : {}),
        },
        timeout: 10_000,
      })
      productsCache.value = extractProductItems(response.data)
    } catch (error) {
      console.error('Failed to load category navigation:', error)
      productsCache.value = []
    } finally {
      categoriesLoading.value = false
    }
  }

  async function refreshCatalogNav() {
    clearProductsCache()
    await loadCatalogNav({ force: true })
  }

  function toggleMobileMenu() {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  function closeMobileMenu() {
    isMobileMenuOpen.value = false
  }

  function openCategory(categoryKey) {
    const targetCategory = categoryLinks.value.find((category) => category.key === categoryKey)
    if (!targetCategory) return
    closeMobileMenu()
    router.push(`/${targetCategory.key}`)
  }

  function openSearchSuggestion(suggestion) {
    if (!suggestion?.target) {
      return
    }
    isSearchOpen.value = false
    closeMobileMenu()
    router.push(suggestion.target)
  }

  function submitSearch() {
    const rawQuery = String(searchQuery.value || '').trim()
    if (!rawQuery) return

    const normalizedQuery = slugifyCatalogValue(rawQuery)
    const matchedCategory = categoryLinks.value.find((category) => category.key === normalizedQuery)
    if (matchedCategory) {
      openCategory(matchedCategory.key)
      return
    }

    const matchedProduct = productsCache.value.find((product) => {
      return [product?.name, product?.company, product?.category, product?.subcategory]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(rawQuery.toLowerCase())
    })

    isSearchOpen.value = false
    closeMobileMenu()
    router.push(buildSearchTarget(rawQuery, matchedProduct?.category))
  }

  async function logout() {
    closeMobileMenu()
    await appStore.logout()
    router.push('/')
  }

  watch(
    () => route.fullPath,
    () => {
      closeMobileMenu()
      isSearchOpen.value = false
    },
  )

  onMounted(() => {
    loadCatalogNav()
  })
</script>

<style scoped>
.app-header {
  background-color: #ffffff !important;
  color: #0f172a !important;
  border-bottom: 2px solid #0f172a !important;
}

.header-container {
  width: 100%;
  min-height: 64px;
  gap: 12px;
  padding-inline: 12px !important;
}

.brand-link {
  flex: 0 0 auto;
  min-width: 0;
}

.brand-text {
  color: #0f172a;
}

.desktop-category-nav {
  min-width: 0;
  scrollbar-width: none;
}

.desktop-category-nav::-webkit-scrollbar {
  display: none;
}

.nav-btn {
  text-transform: uppercase !important;
  font-weight: 800 !important;
  letter-spacing: 0.05em !important;
  font-size: 13px !important;
  border-radius: 0 !important;
  transition: all 0.2s ease !important;
}

.nav-btn:hover {
  background-color: #f1f5f9 !important;
}

.nav-btn--active {
  background-color: #0f172a !important;
  color: #ffffff !important;
}

.sync-chip {
  border-radius: 0 !important;
  font-weight: 700;
  border: 1px solid #0f172a !important;
}

.header-search {
  max-width: 360px;
  min-width: 180px;
}

/* Force flat design on search text field outline */
.header-search :deep(.v-field) {
  border-radius: 0 !important;
  border: 2px solid #0f172a !important;

}
.header-search :deep(.v-field__outline) {
  display: none !important;
}

.header-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-left: auto;
}

.header-actions :deep(.v-btn:not(.login-action)) {
  color: #0f172a !important;
}

.cart-action-btn {
  border-radius: 0 !important;
}

/* Flat black cart badge styling */
:deep(.v-badge__badge) {
  border-radius: 0 !important;
  border: 1.5px solid #0f172a !important;
  background-color: #0f172a !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  font-size: 10px !important;
  padding: 2px 4px !important;
  height: auto !important;
  min-width: 16px !important;
}

.account-action {
  min-width: 44px;
  padding-inline: 6px;
  border-radius: 0 !important;
}

.profile-menu-card {
  background-color: #ffffff !important;
}

.profile-menu-cover {
  border-bottom: 2px solid #0f172a;
}

.profile-menu-identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 22px;
  margin-top: -44px;
}

.profile-menu-avatar {
  border: 2px solid #000000;
}

.menu-list-item {
  color: #0f172a !important;
  font-weight: 700 !important;
}
.menu-list-item:hover {
  background-color: #f1f5f9 !important;
}

.logout-btn {
  border: 2px solid #ef4444 !important;
  color: #ef4444 !important;
  font-weight: 800 !important;
}
.logout-btn:hover {
  background-color: #fef2f2 !important;
}

.login-action {
  min-width: 76px;
  border: 2px solid #0f172a !important;
  font-weight: 800 !important;
  transition: all 0.2s ease !important;
}
.login-action:hover {
  background-color: #1e293b !important;
  color: #ffffff !important;
}

.menu-action {
  border-radius: 0 !important;
}

.mobile-drawer {
  max-width: 100vw;
  border-left: 2px solid #0f172a !important;
  background-color: #ffffff !important;
}

.mobile-drawer :deep(.v-field) {
  border-radius: 0 !important;
  border: 2px solid #0f172a !important;
}
.mobile-drawer :deep(.v-field__outline) {
  display: none !important;
}

.mobile-drawer-list :deep(.v-list-item) {
  border-radius: 0 !important;
  color: #0f172a !important;
  font-weight: 700;
}
.mobile-drawer-list :deep(.v-list-item--active) {
  background-color: #0f172a !important;
  color: #ffffff !important;
}

.mobile-subheader {
  font-weight: 900;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
  font-size: 11px;
}

@media (max-width: 959px) {
  .header-container {
    gap: 8px;
    padding-inline: 10px !important;
  }

  .header-actions {
    gap: 2px;
  }
}

@media (max-width: 599px) {
  .header-container {
    padding-inline: 8px !important;
  }

  .brand-link {
    max-width: 44px;
  }

  .header-actions :deep(.v-btn) {
    width: 40px;
    height: 40px;
  }

  .login-action {
    min-width: 40px;
    padding-inline: 0 !important;
  }

  .account-action {
    min-width: 40px;
    padding-inline: 0 !important;
  }
}
</style>

<style>
/* ═════════ TELEPORTED OVERLAYS (GLOBAL STYLE) ════════ */
.flat-menu-content {
  border-radius: 0 !important;
  border: 2px solid #0f172a !important;

  background-color: #ffffff !important;
}

.flat-menu-content .v-list {
  border-radius: 0 !important;
  padding: 4px !important;
}

.flat-menu-content .v-list-item {
  border-radius: 0 !important;
  font-weight: 700 !important;
  color: #0f172a !important;
}

.flat-menu-content .v-list-item--active {
  background-color: #0f172a !important;
  color: #ffffff !important;
}
</style>
