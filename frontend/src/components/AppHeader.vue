<template>
  <template v-if="!isAuthPage">
    <v-app-bar
      app
      class="app-header d-flex flex-column justify-center align-items-center"
      :class="{ 'is-scrolled': isScrolled }"
      flat
      height="75"
    >
      <v-container class="header-shell px-4 px-md-8">
        <router-link class="brand-link header-brand" to="/">
          <v-img alt="logo" class="brand-mark" src="../assets/logo.svg" width="49" />
          <span class="brand-copy">
            <span class="brand-title">MINDSTORE</span>
            <span class="brand-subtitle">Curated Essentials</span>
          </span>
        </router-link>

        <div class="nav-pill d-none d-md-flex">
          <v-btn class="nav-btn" to="/" variant="text">
            Home
          </v-btn>

          <div
            class="nav-dropdown"
            @focusin="openCategoryDropdown"
            @focusout="onDropdownFocusOut"
            @mouseenter="openCategoryDropdown"
            @mouseleave="closeCategoryDropdown"
          >
            <v-btn class="nav-btn nav-btn--dropdown" variant="text">
              Categories
              <v-icon end size="16">
                {{ isCategoryDropdownOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </v-icon>
            </v-btn>

            <transition name="dropdown-fade">
              <div v-if="isCategoryDropdownOpen" class="category-dropdown" @keydown.esc="closeCategoryDropdown">
                <div class="dropdown-list-panel">
                  <div class="dropdown-category-tabs">
                    <button
                      v-for="category in categoryDropdown"
                      :key="category.key"
                      :class="['dropdown-category-tab', { 'is-active': activeCategory.key === category.key }]"
                      type="button"
                      @focus="setActiveCategory(category.key)"
                      @mouseenter="setActiveCategory(category.key)"
                    >
                      {{ category.label }}
                    </button>
                  </div>

                  <div class="dropdown-items">
                    <button
                      v-for="item in activeCategory.items"
                      :key="item.key"
                      :class="['dropdown-item', { 'is-active': activeItem.key === item.key }]"
                      type="button"
                      @click="openCatalogItem(activeCategory.key, item.key)"
                      @focus="setActiveItem(item.key)"
                      @mouseenter="setActiveItem(item.key)"
                    >
                      <v-icon class="dropdown-item-icon" size="18">{{ item.icon }}</v-icon>
                      <span>
                        <strong>{{ item.name }}</strong>
                        <small>{{ item.short }}</small>
                      </span>
                    </button>
                  </div>
                </div>

                <div class="dropdown-preview-panel">
                  <div class="preview-photo-shell">
                    <img
                      :alt="`${activeItem.name} preview`"
                      class="preview-photo"
                      :src="activeItemImage"
                      @error="onPreviewImageError"
                    >
                  </div>
                  <p class="preview-kicker">{{ activeCategory.label }}</p>
                  <h4>{{ activeItem.name }}</h4>
                  <p>{{ activeItem.description }}</p>
                  <div class="preview-meta">
                    <v-icon size="16">{{ activeItem.icon }}</v-icon>
                    <span>{{ activeItem.highlight }}</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <v-btn class="nav-btn" to="/cart" variant="text">
            Cart
            <v-badge v-if="cartStore.itemCount > 0" class="cart-badge" color="accent" :content="cartStore.itemCount" />
          </v-btn>
        </div>

        <div class="action-cluster">
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

          <v-btn
            aria-label="Open menu"
            class="icon-btn mobile-menu-toggle d-md-none"
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
      class="mobile-menu-drawer"
      location="right"
      scrim="rgba(8, 12, 14, 0.42)"
      temporary
      :width="286"
    >
      <v-list class="mobile-menu-list" density="compact" nav>
        <v-list-item
          class="mobile-primary-item"
          prepend-icon="mdi-home-outline"
          title="Home"
          to="/"
          @click="closeMobileMenu"
        />

        <v-list-group class="mobile-categories-group" value="categories">
          <template #activator="{ props }">
            <v-list-item class="mobile-primary-item" v-bind="props" prepend-icon="mdi-shape-outline" title="Categories" />
          </template>

          <div class="mobile-category-groups">
            <div v-for="category in categoryDropdown" :key="category.key" class="mobile-category-group">
              <p class="mobile-category-label">{{ category.label }}</p>

              <button
                v-for="item in category.items"
                :key="item.key"
                class="mobile-category-item"
                type="button"
                @click="openCatalogItemFromMobile(category.key, item.key)"
              >
                <v-icon size="14">{{ item.icon }}</v-icon>
                <span>{{ item.name }}</span>
              </button>
            </div>
          </div>
        </v-list-group>

        <v-list-item
          class="mobile-primary-item"
          prepend-icon="mdi-cart-outline"
          title="Cart"
          to="/cart"
          @click="closeMobileMenu"
        >
          <template #append>
            <v-badge
              v-if="cartStore.itemCount > 0"
              class="mobile-cart-count"
              color="accent"
              :content="cartStore.itemCount"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </template>
</template>
<script>
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import previewFallbackImage from '@/assets/DeskImg.jpg'
  import { CATALOG_MENU } from '@/constants/catalogMenu'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'

  export default {
    name: 'AppHeader',
    setup() {
      const route = useRoute()
      const router = useRouter()
      const appStore = useAppStore()
      const cartStore = useCartStore()
      const isScrolled = ref(false)
      const categoryDropdown = CATALOG_MENU
      const isCategoryDropdownOpen = ref(false)
      const isMobileMenuOpen = ref(false)
      const activeCategoryKey = ref(categoryDropdown[0].key)
      const activeItemKey = ref(categoryDropdown[0].items[0].key)
      const isAuthPage = computed(() => ['/login', '/create-account'].includes(route.path))
      const profileImage = computed(() =>
        appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url || null,
      )
      const canAccessAdmin = computed(() => Boolean(appStore.user?.is_admin))
      const activeCategory = computed(() =>
        categoryDropdown.find((category) => category.key === activeCategoryKey.value) || categoryDropdown[0],
      )
      const activeItem = computed(() =>
        activeCategory.value.items.find((item) => item.key === activeItemKey.value) || activeCategory.value.items[0],
      )
      const previewImageFailed = ref(false)
      const activeItemImage = computed(() => {
        if (previewImageFailed.value) return previewFallbackImage
        return activeItem.value?.image || previewFallbackImage
      })

      const handleScroll = () => {
        isScrolled.value = window.scrollY > 20
      }

      const openCategoryDropdown = () => {
        isCategoryDropdownOpen.value = true
      }

      const closeCategoryDropdown = () => {
        isCategoryDropdownOpen.value = false
      }

      const toggleMobileMenu = () => {
        isMobileMenuOpen.value = !isMobileMenuOpen.value
      }

      const closeMobileMenu = () => {
        isMobileMenuOpen.value = false
      }

      const setActiveCategory = (categoryKey) => {
        const selectedCategory = categoryDropdown.find((category) => category.key === categoryKey)
        if (!selectedCategory) return
        activeCategoryKey.value = selectedCategory.key
        activeItemKey.value = selectedCategory.items[0]?.key || ''
      }

      const setActiveItem = (itemKey) => {
        activeItemKey.value = itemKey
      }

      const openCatalogItem = (categoryKey, itemKey) => {
        const targetCategory = categoryDropdown.find((category) => category.key === categoryKey)
        const targetItem = targetCategory?.items.find((item) => item.key === itemKey)
        if (!targetCategory || !targetItem) return
        closeCategoryDropdown()
        closeMobileMenu()
        router.push(`/${targetCategory.key}/${targetItem.key}`)
      }

      const openCatalogItemFromMobile = (categoryKey, itemKey) => {
        openCatalogItem(categoryKey, itemKey)
      }

      const onDropdownFocusOut = (event) => {
        const nextFocusTarget = event.relatedTarget
        if (event.currentTarget && !event.currentTarget.contains(nextFocusTarget)) {
          closeCategoryDropdown()
        }
      }

      const onPreviewImageError = () => {
        previewImageFailed.value = true
      }

      watch([activeCategoryKey, activeItemKey], () => {
        previewImageFailed.value = false
      })

      watch(
        () => route.fullPath,
        () => {
          closeCategoryDropdown()
          closeMobileMenu()
        },
      )

      onMounted(() => {
        window.addEventListener('scroll', handleScroll)
      })

      onUnmounted(() => {
        window.removeEventListener('scroll', handleScroll)
      })

      return {
        isAuthPage,
        isScrolled,
        profileImage,
        canAccessAdmin,
        categoryDropdown,
        isCategoryDropdownOpen,
        isMobileMenuOpen,
        activeCategory,
        activeItem,
        activeItemImage,
        onPreviewImageError,
        openCategoryDropdown,
        closeCategoryDropdown,
        toggleMobileMenu,
        closeMobileMenu,
        setActiveCategory,
        setActiveItem,
        openCatalogItem,
        openCatalogItemFromMobile,
        onDropdownFocusOut,
        appStore,
        cartStore
      }
    }
  }
</script>
<style>
.header-shell {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  overflow: visible;
}

.app-header {
  transition: background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  background: linear-gradient(130deg, rgba(255, 255, 255, 0.9), rgba(246, 249, 247, 0.92));
  border-bottom: 1px solid rgba(181, 195, 188, 0.36);
  backdrop-filter: blur(14px);
  overflow: visible !important;
  z-index: 1200 !important;
}

.app-header .v-toolbar__content,
.app-header .v-toolbar__extension {
  overflow: visible !important;
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

.header-brand {
  justify-self: start;
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
  position: relative;
  justify-self: center;
  display: flex;
  align-items: center;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.82), rgba(235, 242, 238, 0.9));
  border: 1px solid rgba(178, 194, 186, 0.6);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
  overflow: visible;
}

.nav-btn {
  position: relative;
  text-transform: none;
  font-weight: 700;
  border-radius: 999px;
  color: #263338;
  letter-spacing: 0.1px;
}

.nav-btn:hover {
  background: rgba(217, 228, 223, 0.54);
}

.nav-dropdown {
  position: relative;
}

.nav-btn--dropdown {
  padding-inline: 14px;
}

.category-dropdown {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  width: min(680px, 74vw);
  border-radius: 20px;
  border: 1px solid rgba(176, 194, 186, 0.72);
  background: linear-gradient(130deg, #ffffff, #f2f7f5);
  box-shadow: 0 26px 52px rgba(18, 34, 31, 0.2);
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 12px;
  padding: 14px;
  z-index: 4000;
}

.dropdown-list-panel {
  border-radius: 14px;
  border: 1px solid rgba(189, 203, 196, 0.58);
  background: rgba(255, 255, 255, 0.78);
  padding: 10px;
}

.dropdown-category-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.dropdown-category-tab {
  border: 1px solid rgba(183, 196, 190, 0.8);
  background: #f7fbf9;
  color: #2b3d43;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-category-tab.is-active {
  background: #22353a;
  color: #ffffff;
  border-color: #22353a;
}

.dropdown-items {
  display: grid;
  gap: 8px;
}

.dropdown-item {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: #1f3035;
  cursor: pointer;
  text-align: left;
  padding: 10px;
  transition: all 0.2s ease;
}

.dropdown-item:hover,
.dropdown-item.is-active {
  border-color: rgba(176, 194, 186, 0.92);
  background: rgba(226, 235, 232, 0.62);
}

.dropdown-item-icon {
  margin-top: 2px;
}

.dropdown-item strong {
  display: block;
  font-size: 0.88rem;
}

.dropdown-item small {
  display: block;
  margin-top: 2px;
  font-size: 0.75rem;
  color: #60727a;
}

.dropdown-preview-panel {
  border-radius: 14px;
  background: radial-gradient(circle at top left, rgba(199, 116, 43, 0.18), rgba(21, 43, 50, 0.96));
  color: #f2f7fb;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.preview-photo-shell {
  width: 100%;
  height: 145px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(241, 246, 251, 0.22);
  box-shadow: 0 10px 20px rgba(11, 21, 26, 0.24);
  margin-bottom: 12px;
}

.preview-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: rgba(255, 255, 255, 0.2);
}

.preview-kicker {
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-size: 0.68rem;
  color: rgba(244, 225, 198, 0.96);
}

.dropdown-preview-panel h4 {
  margin-top: 8px;
  font-size: 1.26rem;
  line-height: 1.2;
}

.dropdown-preview-panel p {
  margin-top: 10px;
  font-size: 0.86rem;
  line-height: 1.58;
  color: rgba(232, 240, 247, 0.92);
}

.preview-meta {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  width: fit-content;
  font-size: 0.76rem;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}

.action-cluster {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  color: #203034;
}

.mobile-menu-toggle {
  color: #203034;
}

.mobile-menu-drawer {
  max-width: 86vw;
  border-left: 1px solid rgba(182, 196, 190, 0.45);
  background: linear-gradient(165deg, #fcfdfd 0%, #f4f7f6 100%);
  font-family: 'Manrope', 'Segoe UI', sans-serif;
}

.mobile-menu-list {
  padding: 10px 10px 14px;
}

.mobile-menu-list .mobile-primary-item {
  border-radius: 10px;
  margin-bottom: 2px;
}

.mobile-menu-list :deep(.v-list-item-title) {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.16px;
  color: #1f2f33;
}

.mobile-menu-list :deep(.v-list-item__prepend .v-icon) {
  color: #3c4d53;
  font-size: 0.98rem;
}

.mobile-menu-list :deep(.v-list-item--active) {
  background: rgba(224, 233, 229, 0.72);
}

.mobile-categories-group {
  margin-top: 2px;
}

.mobile-category-groups {
  display: grid;
  gap: 7px;
  padding: 0 8px 10px 38px;
}

.mobile-category-group {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}

.mobile-category-label {
  margin: 0 0 4px;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #68797f;
}

.mobile-category-item {
  width: 100%;
  border: 0;
  border-radius: 7px;
  background: transparent;
  padding: 6px 8px;
  color: #2a3b40;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.15px;
  line-height: 1.2;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.mobile-category-item:hover {
  background: rgba(220, 231, 226, 0.62);
  color: #19292d;
}

.mobile-cart-count {
  margin-right: 2px;
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

@media (max-width: 1260px) {
  .header-shell {
    grid-template-columns: auto 1fr auto;
    column-gap: 10px;
  }

  .brand-subtitle {
    display: none;
  }

  .brand-title {
    font-size: 0.96rem;
    letter-spacing: 1px;
  }

  .nav-btn {
    padding-inline: 12px;
    font-size: 0.88rem;
  }

  .category-dropdown {
    width: min(620px, 88vw);
  }
}

@media (max-width: 960px) {
  .header-shell {
    grid-template-columns: auto 1fr auto;
    column-gap: 8px;
  }

  .action-cluster {
    justify-content: flex-end;
    gap: 6px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
  }

  .admin-btn,
  .login-btn {
    padding-inline: 12px;
  }
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
    padding-inline: 10px;
    font-size: 0.78rem;
  }
}
</style>
