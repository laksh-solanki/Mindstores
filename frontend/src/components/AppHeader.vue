<template>
  <template v-if="!isAuthPage">
    <v-app-bar app class="app-header" color="teal-darken-2" elevation="0">
      <v-container class="header-container d-flex align-center ga-md-4" fluid>
        <router-link class="brand-link d-flex align-center text-decoration-none text-white ga-2" to="/">
          <v-avatar color="white" rounded="lg" size="33">
            <v-img alt="Mindstore logo" src="../assets/logo.svg" width="23" />
          </v-avatar>
          <div class="d-none d-sm-flex flex-column">
            <span class="text-subtitle-1">Mindstore</span>
          </div>
        </router-link>

        <div class="desktop-category-nav d-none d-lg-flex align-center ga-1 overflow-x-auto flex-grow-1">
          <v-btn :color="route.path === '/' ? 'white' : undefined" rounded="lg" to="/"
            :variant="route.path === '/' ? 'flat' : 'text'">
            Home
          </v-btn>
          <v-btn v-for="category in categoryLinks" :key="category.key"
            :color="activeCategoryKey === category.key ? 'white' : undefined" rounded="lg"
            :variant="activeCategoryKey === category.key ? 'flat' : 'text'" @click="openCategory(category.key)">
            {{ category.label }}
          </v-btn>
          <v-chip v-if="categoriesLoading && categoryLinks.length === 0" color="white" size="small" variant="tonal">
            Syncing catalog
          </v-chip>
        </div>

        <div class="header-search d-none d-md-block flex-grow-1">
          <v-menu v-model="isSearchOpen" :close-on-content-click="false" location="bottom end" max-width="380">
            <template #activator="{ props }">
              <div v-bind="props">
                <v-text-field v-model="searchQuery" bg-color="white" clearable density="compact" hide-details
                  label="Search" prepend-inner-icon="mdi-magnify" rounded="lg" single-line variant="outlined"
                  @focus="isSearchOpen = true" @keydown.enter.prevent="submitSearch" />
              </div>
            </template>

            <v-list density="comfortable">
              <v-list-item v-if="searchSuggestions.length === 0" disabled>
                <v-list-item-title>{{ searchQuery ? 'No matching products' : 'Type product or category'
                  }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-for="suggestion in searchSuggestions" :key="`${suggestion.type}-${suggestion.id}`"
                :prepend-icon="suggestion.icon" :subtitle="suggestion.subtitle" :title="suggestion.title"
                @click="openSearchSuggestion(suggestion)" />
            </v-list>
          </v-menu>
        </div>

        <div class="header-actions">
          <v-btn aria-label="Cart" icon rounded="lg" to="/cart" variant="text">
            <v-badge v-if="cartStore.itemCount > 0" location="top right" color="indigo-lighten-5" :content="cartStore.itemCount" floating>
              <v-icon>mdi-cart-outline</v-icon>
            </v-badge>
            <v-icon v-else>mdi-cart-outline</v-icon>
          </v-btn>

          <v-menu v-if="appStore.isAuthenticated" location="bottom end" offset="3">
            <template #activator="{ props }">
              <v-btn v-bind="props" class="account-action" rounded="xl" icon variant="text">
                <v-avatar v-if="profileImage" :image="profileImage" size="37" />
                <v-avatar v-else color="teal-darken-1" size="37">
                  <span class="text-white text-caption font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
              </v-btn>
            </template>

            <v-card width="340" border rounded="lg">
              <v-sheet class="profile-menu-cover" color="teal-lighten-5" height="95" />
              <div class="profile-menu-identity">
                <v-avatar v-if="profileImage" class="profile-menu-avatar" :image="profileImage" size="88" />
                <v-avatar v-else class="profile-menu-avatar" color="teal-darken-1" size="88">
                  <span class="text-white text-h5 font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
                <div class="text-h6 font-weight-bold text-center mt-3">
                  {{ userName }}
                </div>
              </div>
              <v-divider />
              <v-list density="comfortable" class="pa-1">
                <v-list-item prepend-icon="mdi-account-outline" title="Profile" to="/profile" rounded="lg" />
                <v-list-item prepend-icon="mdi-cart-outline" title="Cart" to="/cart" rounded="lg" />
                <v-list-item v-if="canAccessAdmin" prepend-icon="mdi-shield-star-outline" class="mb-1" title="Admin" to="/admin" rounded="lg" />
                <v-divider />
                <v-list-item  class="mt-1">
                  <v-btn text="Logout" prepend-icon="mdi-logout" color="red-lighten-1" width="100%" rounded="lg" @click="logout" variant="text">
                    Logout
                  </v-btn>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>

          <v-btn v-else aria-label="Login" class="login-action" color="white" rounded="lg" to="/login" variant="flat">
            <v-icon class="d-sm-none" icon="mdi-login" />
            <span class="d-none d-sm-inline">Login</span>
          </v-btn>

          <v-btn aria-label="Open menu" class="d-lg-none menu-action" icon rounded="lg" variant="text"
            @click="toggleMobileMenu">
            <v-icon>{{ isMobileMenuOpen ? 'mdi-close' : 'mdi-menu' }}</v-icon>
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer v-model="isMobileMenuOpen" class="mobile-drawer" location="right" temporary width="320">
      <v-sheet class="pa-4 border-b-sm">
        <v-text-field v-model="searchQuery" clearable density="comfortable" hide-details label="Search products"
          prepend-inner-icon="mdi-magnify" rounded="lg" variant="outlined" @keydown.enter.prevent="submitSearch" />
      </v-sheet>

      <v-list density="comfortable" nav>
        <v-list-item prepend-icon="mdi-home-outline" title="Home" to="/" @click="closeMobileMenu" />
        <v-list-subheader>Categories</v-list-subheader>
        <v-list-item v-for="category in categoryLinks" :key="category.key" :active="activeCategoryKey === category.key"
          :prepend-icon="category.icon" rounded="lg" :title="category.label" @click="openCategory(category.key)" />
        <v-list-item v-if="categoryLinks.length === 0" disabled title="Loading categories..." />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-cart-outline" title="Cart" to="/cart" @click="closeMobileMenu">
          <template #append>
            <v-badge v-if="cartStore.itemCount > 0" color="teal-darken-1" :content="cartStore.itemCount" />
          </template>
        </v-list-item>
        <v-list-item v-if="appStore.isAuthenticated" prepend-icon="mdi-account-outline" title="Profile" to="/profile"
          @click="closeMobileMenu" />
        <v-list-item v-if="appStore.isAuthenticated && canAccessAdmin" prepend-icon="mdi-shield-star-outline"
          title="Admin" to="/admin" @click="closeMobileMenu" />
        <v-list-item v-if="appStore.isAuthenticated" prepend-icon="mdi-logout" title="Logout" @click="logout" />
        <v-list-item v-else prepend-icon="mdi-login" title="Login" to="/login" @click="closeMobileMenu" />
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
  color: #ffffff;
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

.desktop-category-nav {
  min-width: 0;
  scrollbar-width: none;
}

.desktop-category-nav::-webkit-scrollbar {
  display: none;
}

.header-search {
  max-width: 360px;
  min-width: 180px;
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
  color: #ffffff;
}

.account-action {
  min-width: 44px;
  padding-inline: 6px;
}

.profile-menu-cover {
  border-bottom: 1px solid rgba(15, 118, 110, 0.12);
}

.profile-menu-identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 22px;
  margin-top: -44px;
}

.profile-menu-avatar {
  border: 4px solid #ffffff;
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.14),
    0 10px 24px rgba(15, 23, 42, 0.12);
}

.login-action {
  min-width: 76px;
}

.mobile-drawer {
  max-width: 100vw;
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
