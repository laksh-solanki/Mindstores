<template>
  <template v-if="!isAuthPage">
    <v-app-bar app class="premium-header" elevation="0" height="70">
      <v-container class="header-container">
        <router-link class="brand-link" to="/">
          <span class="brand-mark">
            <v-img alt="Mindstore logo" class="brand-logo" src="../assets/logo.svg" width="32" />
          </span>
          <span class="brand-copy">
            <span class="brand-title">Mindstore</span>
            <span class="brand-subtitle">Premium marketplace</span>
          </span>
        </router-link>

        <nav aria-label="Primary catalog categories" class="category-nav d-none d-lg-flex">
          <v-btn
            class="nav-link"
            :class="{ 'is-active': route.path === '/' }"
            rounded="lg"
            to="/"
            variant="text"
          >
            Home
          </v-btn>
          <v-btn
            v-for="category in categoryLinks"
            :key="category.key"
            class="nav-link category-link"
            :class="{ 'is-active': activeCategoryKey === category.key }"
            rounded="lg"
            variant="text"
            @click="openCategory(category.key)"
          >
            <v-icon size="18" start>{{ category.icon }}</v-icon>
            {{ category.label }}
          </v-btn>
          <v-chip
            v-if="categoriesLoading && categoryLinks.length === 0"
            color="primary"
            size="small"
            variant="tonal"
          >
            Syncing catalog
          </v-chip>
        </nav>

        <div class="header-actions">
          <v-menu v-model="isSearchOpen" :close-on-content-click="false" location="bottom end" max-width="380">
            <template #activator="{ props }">
              <div v-bind="props" class="search-wrap d-none d-md-block">
                <v-text-field
                  v-model="searchQuery"
                  clearable
                  density="compact"
                  hide-details
                  label="Search"
                  prepend-inner-icon="mdi-magnify"
                  rounded="lg"
                  single-line
                  variant="outlined"
                  @focus="isSearchOpen = true"
                  @keydown.enter.prevent="submitSearch"
                />
              </div>
            </template>

            <v-list class="search-menu" density="comfortable">
              <v-list-item v-if="searchSuggestions.length === 0" disabled>
                <v-list-item-title>{{ searchQuery ? 'No matching products' : 'Type product or category' }}</v-list-item-title>
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

          <v-btn
            aria-label="Refresh catalog categories"
            class="d-none d-sm-inline-flex"
            icon
            :loading="categoriesLoading"
            rounded="lg"
            variant="text"
            @click="refreshCatalogNav"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent" location="bottom">Refresh catalog</v-tooltip>
          </v-btn>

          <v-btn
            aria-label="Cart"
            class="cart-icon-btn"
            icon
            rounded="lg"
            to="/cart"
            variant="text"
          >
            <v-badge
              v-if="cartStore.itemCount > 0"
              color="primary"
              :content="cartStore.itemCount"
              floating
            >
              <v-icon>mdi-cart-outline</v-icon>
            </v-badge>
            <v-icon v-else>mdi-cart-outline</v-icon>
          </v-btn>

          <v-menu v-if="appStore.isAuthenticated" location="bottom end" offset="8">
            <template #activator="{ props }">
              <v-btn v-bind="props" rounded="lg" variant="text">
                <v-avatar v-if="profileImage" :image="profileImage" size="32" />
                <v-avatar v-else color="primary" size="32">
                  <span class="text-white text-caption font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
                <v-icon class="d-none d-sm-inline-flex" end size="18">mdi-chevron-down</v-icon>
              </v-btn>
            </template>

            <v-card min-width="280" rounded="lg">
              <v-list density="comfortable">
                <v-list-item :subtitle="appStore.user?.email" :title="userName">
                  <template #prepend>
                    <v-avatar v-if="profileImage" :image="profileImage" size="40" />
                    <v-avatar v-else color="primary" size="40">
                      <span class="text-white font-weight-bold">{{ userInitials }}</span>
                    </v-avatar>
                  </template>
                </v-list-item>
                <v-divider />
                <v-list-item prepend-icon="mdi-account-outline" title="Profile" to="/profile" />
                <v-list-item prepend-icon="mdi-cart-outline" title="Cart" to="/cart" />
                <v-list-item
                  v-if="canAccessAdmin"
                  prepend-icon="mdi-shield-star-outline"
                  title="Admin"
                  to="/admin"
                />
                <v-divider />
                <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logout" />
              </v-list>
            </v-card>
          </v-menu>

          <v-btn
            v-else
            class="login-btn"
            color="primary"
            rounded="lg"
            to="/login"
            variant="flat"
          >
            Login
          </v-btn>

          <v-btn
            aria-label="Open menu"
            class="d-lg-none"
            icon
            rounded="lg"
            variant="text"
            @click="toggleMobileMenu"
          >
            <v-icon>{{ isMobileMenuOpen ? 'mdi-close' : 'mdi-menu' }}</v-icon>
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer v-model="isMobileMenuOpen" location="right" temporary width="320">
      <div class="mobile-drawer-head">
        <div>
          <p>Mindstore</p>
          <span>Premium catalog</span>
        </div>
        <v-btn
          aria-label="Close menu"
          icon="mdi-close"
          rounded="lg"
          variant="text"
          @click="closeMobileMenu"
        />
      </div>

      <div class="mobile-search">
        <v-text-field
          v-model="searchQuery"
          clearable
          density="comfortable"
          hide-details
          label="Search products"
          prepend-inner-icon="mdi-magnify"
          rounded="lg"
          variant="outlined"
          @keydown.enter.prevent="submitSearch"
        />
      </div>

      <v-list density="comfortable" nav>
        <v-list-item prepend-icon="mdi-home-outline" title="Home" to="/" @click="closeMobileMenu" />
        <v-list-subheader>Categories</v-list-subheader>
        <v-list-item
          v-for="category in categoryLinks"
          :key="category.key"
          :active="activeCategoryKey === category.key"
          :prepend-icon="category.icon"
          rounded="lg"
          :title="category.label"
          @click="openCategory(category.key)"
        />
        <v-list-item v-if="categoryLinks.length === 0" disabled title="Loading categories..." />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-refresh" title="Refresh Catalog" @click="refreshCatalogNav" />
        <v-list-item prepend-icon="mdi-cart-outline" title="Cart" to="/cart" @click="closeMobileMenu">
          <template #append>
            <v-badge v-if="cartStore.itemCount > 0" color="primary" :content="cartStore.itemCount" />
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
          v-if="appStore.isAuthenticated"
          prepend-icon="mdi-logout"
          title="Logout"
          @click="logout"
        />
        <v-list-item
          v-else
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
  import axios from 'axios'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { API_URL } from '@/utils/api'
  import { buildCatalogEntries, slugifyCatalogValue } from '@/utils/catalog'
  import { safeDisplayImageUrl } from '@/utils/images'
  import { clearProductsCache } from '@/utils/productCache'

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
  const userName = computed(() => appStore.user?.name || appStore.user?.email || 'Account')
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
      const response = await axios.get(`${API_URL}/products`, {
        params: {
          limit: 250,
          sort: 'name_asc',
          ...(force ? { refresh: Date.now() } : {}),
        },
        timeout: 10_000,
      })
      productsCache.value = Array.isArray(response.data) ? response.data : response.data?.items || []
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

  function toggleMobileMenu () {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  function closeMobileMenu () {
    isMobileMenuOpen.value = false
  }

  function openCategory (categoryKey) {
    const targetCategory = categoryLinks.value.find((category) => category.key === categoryKey)
    if (!targetCategory) return
    closeMobileMenu()
    router.push(`/${targetCategory.key}`)
  }

  function openSearchSuggestion (suggestion) {
    if (!suggestion?.target) {
      return
    }
    isSearchOpen.value = false
    closeMobileMenu()
    router.push(suggestion.target)
  }

  function submitSearch () {
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

  async function logout () {
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
.premium-header {
  border-bottom: 1px solid rgba(24, 45, 38, 0.35);
  background: var(--ms-green) !important;
  color: #fff8e8 !important;
  backdrop-filter: blur(12px);
}

.header-container {
  width: 100%;
  max-width: 1320px !important;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  text-decoration: none;
  color: #fff8e8;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255, 248, 232, 0.6);
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #fff8e8;
}

.brand-logo {
  border-radius: 4px;
}

.brand-copy {
  display: grid;
  min-width: 0;
}

.brand-title {
  font-size: 1rem;
  font-weight: 800;
  color: #fff8e8;
  line-height: 1.1;
}

.brand-subtitle {
  color: rgba(255, 248, 232, 0.72);
  font-size: 0.74rem;
  font-weight: 700;
}

.category-nav {
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

.nav-link {
  flex: 0 0 auto;
  color: rgba(255, 248, 232, 0.84);
  height: 42px;
  padding-inline: 11px;
}

.nav-link.is-active {
  background: #fff8e8 !important;
  color: var(--ms-green) !important;
}

.category-link {
  max-width: 160px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}

.header-actions :deep(.v-btn) {
  color: #fff8e8;
}

.search-wrap {
  width: clamp(180px, 22vw, 320px);
}

.search-wrap :deep(.v-field) {
  background: #fff8e8;
  color: var(--ms-ink);
}

.search-wrap :deep(.v-field__outline) {
  color: rgba(255, 248, 232, 0.72);
}

.search-menu {
  border: 1px solid var(--ms-border);
  background: var(--ms-surface-strong) !important;
}

.cart-icon-btn {
  color: #fff8e8;
}

.cart-icon-btn:hover,
.header-actions > .v-btn:hover {
  background: rgba(255, 248, 232, 0.14) !important;
}

.login-btn {
  min-width: 84px;
}

.mobile-drawer-head {
  padding: 18px 18px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mobile-drawer-head p {
  font-weight: 800;
  color: var(--ms-ink);
}

.mobile-drawer-head span {
  display: block;
  margin-top: 2px;
  color: var(--ms-green);
  font-size: 0.78rem;
  font-weight: 700;
}

.mobile-search {
  padding: 8px 18px 12px;
}

:deep(.v-navigation-drawer) {
  background: var(--ms-surface) !important;
  border-left: 1px solid var(--ms-border) !important;
}

:deep(.v-list-item--active) {
  background: var(--ms-green-soft) !important;
  color: var(--ms-green) !important;
}

@media (max-width: 1280px) {
  .header-container {
    gap: 12px;
  }

  .brand-subtitle {
    display: none;
  }
}

@media (max-width: 600px) {
  .premium-header {
    height: 68px !important;
  }

  .header-container {
    display: flex;
    gap: 10px;
  }

  .brand-mark {
    width: 38px;
    height: 38px;
  }

  .brand-title {
    font-size: 0.95rem;
  }
}
</style>
