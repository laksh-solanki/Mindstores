<template>
  <v-container class="py-6 px-max-md" fluid>
    <div v-if="catalogEntry" class="flat-breadcrumb-wrap mb-4">
      <v-breadcrumbs class="text-subtitle-2 px-0 py-0" :items="breadcrumbItems">
        <template #prepend>
          <v-icon class="mr-1" icon="mdi-home" size="14" />
        </template>
        <template #divider>
          <span class="breadcrumb-divider">/</span>
        </template>
      </v-breadcrumbs>
    </div>

    <div v-else class="flat-empty-products text-center py-10">
      <v-icon class="mb-3" color="warning" size="48">mdi-folder-alert-outline</v-icon>
      <h2 class="empty-title">Category not found</h2>
      <p class="empty-text">The requested category path is invalid.</p>
      <div class="mt-4">
        <v-btn class="action-btn-back" rounded="0" to="/" variant="flat">Back to Home</v-btn>
      </div>
    </div>

    <v-row v-if="catalogEntry" class="ga-0">
      <v-col class="pr-md-4 pb-4" cols="12" lg="3" md="4">
        <!-- Mobile Expansion Filter -->
        <v-expansion-panels
          v-if="isMobileFilters"
          v-model="mobileFilterPanel"
          class="flat-mobile-panels"
          elevation="0"
          rounded="0"
          variant="accordion"
        >
          <v-expansion-panel class="flat-panel" value="filters">
            <v-expansion-panel-title class="flat-panel-title">
              <span class="font-weight-bold">Filters</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text class="flat-panel-text">
              <div class="d-flex flex-column ga-4 pt-2">
                <v-text-field
                  v-model="filters.search"
                  bg-color="#ffffff"
                  class="flat-field"
                  clearable
                  density="comfortable"
                  hide-details
                  label="Search products"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />

                <v-select
                  v-model="filters.company"
                  bg-color="#ffffff"
                  class="flat-field"
                  density="comfortable"
                  hide-details
                  :items="companyOptions"
                  label="Company"
                  variant="outlined"
                />

                <div class="flat-slider-box pa-3">
                  <p class="slider-label mb-2">Price Range</p>
                  <v-range-slider
                    v-model="priceRange"
                    class="flat-range-slider"
                    color="teal-darken-1"
                    density="comfortable"
                    hide-details
                    :max="priceBounds.max"
                    :min="priceBounds.min"
                    step="1"
                    thumb-label="always"
                  />
                  <div class="d-flex justify-space-between text-caption mt-1">
                    <span>{{ formatAmount(priceRange[0] || 0) }}</span>
                    <span>{{ formatAmount(priceRange[1] || 0) }}</span>
                  </div>
                </div>

                <v-checkbox
                  v-model="filters.inStock"
                  class="flat-checkbox"
                  color="teal-darken-1"
                  density="comfortable"
                  hide-details
                  label="In stock only"
                />

                <v-select
                  v-model="filters.sort"
                  bg-color="#ffffff"
                  class="flat-field"
                  density="comfortable"
                  hide-details
                  item-title="label"
                  item-value="value"
                  :items="sortOptions"
                  label="Sort By"
                  variant="outlined"
                />
                
                <v-btn class="flat-reset-btn" rounded="0" variant="outlined" @click="resetFilters">Reset Filters</v-btn>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Desktop Filters Card -->
        <div
          v-else
          class="flat-sidebar-card position-sticky"
          style="top: 5.5rem"
        >
          <div class="sidebar-header d-flex align-center justify-space-between ga-2">
            <span class="sidebar-title">Filters</span>
            <button class="flat-reset-link" @click="resetFilters">
              Reset
              <span class="underline-hover" />
            </button>
          </div>
          <div class="sidebar-body d-flex flex-column ga-4">
            <v-text-field
              v-model="filters.search"
              bg-color="#ffffff"
              class="flat-field"
              clearable
              density="comfortable"
              hide-details
              label="Search products"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />

            <v-select
              v-model="filters.company"
              bg-color="#ffffff"
              class="flat-field"
              density="comfortable"
              hide-details
              :items="companyOptions"
              label="Company"
              variant="outlined"
            />

            <div class="flat-slider-box pa-3">
              <p class="slider-label mb-2">Price Range</p>
              <v-range-slider
                v-model="priceRange"
                class="flat-range-slider"
                color="teal-darken-1"
                density="comfortable"
                hide-details
                :max="priceBounds.max"
                :min="priceBounds.min"
                step="1"
                thumb-label="always"
              />
              <div class="d-flex justify-space-between text-caption mt-1">
                <span>{{ formatAmount(priceRange[0] || 0) }}</span>
                <span>{{ formatAmount(priceRange[1] || 0) }}</span>
              </div>
            </div>

            <v-checkbox
              v-model="filters.inStock"
              class="flat-checkbox"
              color="teal-darken-1"
              density="comfortable"
              hide-details
              label="In stock only"
            />

            <v-select
              v-model="filters.sort"
              bg-color="#ffffff"
              class="flat-field"
              density="comfortable"
              hide-details
              item-title="label"
              item-value="value"
              :items="sortOptions"
              label="Sort By"
              variant="outlined"
            />
          </div>
        </div>
      </v-col>

      <v-col cols="12" lg="9" md="8">
        <div class="flat-results-bar mb-4">
          <p class="results-text">{{ resultsLabel }}</p>
          <span v-if="totalPages > 0" class="results-page-tag">
            Page {{ currentPage }} / {{ totalPages }}
          </span>
        </div>

        <v-row v-if="loading" v-slot no-gutters>
          <v-col
            v-for="n in 8"
            :key="n"
            class="pa-0"
            cols="12"
            lg="4"
            sm="6"
          >
            <v-skeleton-loader class="border rounded-0" style="margin-right: -1px; margin-bottom: -1px;" type="image, article" />
          </v-col>
        </v-row>

        <v-row v-else-if="products.length > 0" no-gutters>
          <v-col
            v-for="product in products"
            :key="product.product_id"
            cols="12"
            lg="4"
            sm="6"
          >
            <div
              class="product-joint-card"
              role="button"
              tabindex="0"
              @click="openProduct(product.product_id)"
              @keydown.enter="openProduct(product.product_id)"
            >
              <div class="product-image-wrap">
                <v-img
                  v-if="productImageUrl(product)"
                  :alt="product.name"
                  aspect-ratio="1"
                  class="product-grid-image"
                  contain
                  :src="productImageUrl(product)"
                />
                <div v-else class="no-image-grid-placeholder">
                  <v-icon color="grey-lighten-1" size="36">mdi-image-off-outline</v-icon>
                </div>
              </div>

              <div class="product-card-body">
                <div class="product-card-meta">
                  <span class="product-grid-category">{{ getCompanyLabel(product) }}</span>
                  <span class="grid-badge-stock" :class="{ 'grid-badge-stock--out': isProductSoldOut(product) }">
                    <span class="status-dot" />
                    {{ isProductSoldOut(product) ? 'Sold out' : `${Number(product.stock || 0)} left` }}
                  </span>
                </div>

                <h3 class="product-grid-name" :title="product.name">{{ product.name }}</h3>
                <p class="product-grid-subcat">{{ product.subcategory || catalogEntry.category.label }}</p>

                <div class="product-grid-footer">
                  <span class="product-grid-price">{{ formatAmount(product.price) }}</span>
                  <button
                    :aria-label="`Add ${product.name} to cart`"
                    class="product-grid-cart-btn"
                    :disabled="isProductSoldOut(product)"
                    @click.stop="quickAddToCart(product)"
                  >
                    <v-icon icon="mdi-cart-plus" size="18" />
                  </button>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <div v-else class="flat-empty-products py-10">
          <v-icon class="mb-3" color="grey-lighten-1" size="48">mdi-package-variant-remove</v-icon>
          <h3 class="empty-title">No products match your filters</h3>
          <p class="empty-text">Change company, price, or stock filters to load more results.</p>
        </div>

        <div v-if="!loading && totalPages > 1" class="d-flex justify-center mt-6">
          <v-pagination
            v-model="currentPage"
            class="custom-pagination"
            density="comfortable"
            :length="totalPages"
            :total-visible="6"
          />
        </div>
      </v-col>
    </v-row>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="2200"
      :type="snackbarColor"
    />
  </v-container>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { resolveCatalogEntryFromProducts } from '@/utils/catalog'
  import { useCurrency } from '@/utils/currency'
  import { safeDisplayImageUrl } from '@/utils/images'
  import { PRODUCTS_CACHE_INVALIDATED_EVENT } from '@/utils/productCache'
  import {
    extractProductItems,
    extractProductsMeta,
    fetchProductList,
  } from '@/utils/products'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const cartStore = useCartStore()
  const { formatAmount } = useCurrency()
  const { smAndDown } = useDisplay()

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')

  const loadingSource = ref(false)
  const loadingProducts = ref(false)
  const loading = computed(() => loadingSource.value || loadingProducts.value)
  const catalogEntry = ref(null)
  const products = ref([])
  const sourceProducts = ref([])
  const totalItems = ref(0)
  const totalPages = ref(1)
  const currentPage = ref(1)
  const pageSize = 12
  const suppressFilterWatch = ref(false)
  const priceBounds = ref({ min: 0, max: 0 })
  const priceRange = ref([0, 0])
  const sourceRequestVersion = ref(0)
  const productsRequestVersion = ref(0)
  const mobileFilterPanel = ref(null)
  const filters = reactive({
    search: '',
    company: 'All',
    inStock: false,
    sort: 'newest',
  })
  const sortOptions = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A to Z', value: 'name_asc' },
  ]

  let filterFetchTimer = null

  const isAllProductsRoute = computed(() => route.name === 'CatalogAll')
  const isMobileFilters = computed(() => smAndDown.value)
  const querySearchTerm = computed(() => String(route.query.search || '').trim().slice(0, 80))

  const breadcrumbItems = computed(() => {
    if (!catalogEntry.value) return []

    const items = [
      {
        title: '/ Product',
        to: '/products',
      },
    ]

    if (!catalogEntry.value.isAll) {
      items.push({
        title: catalogEntry.value.category.label,
        to: `/${catalogEntry.value.category.key}`,
      })

      if (catalogEntry.value.item) {
        items.push({
          title: catalogEntry.value.item.name,
          to: catalogEntry.value.canonicalPath,
        })
      }
    }

    const activeSearch = String(filters.search || '').trim()
    if (activeSearch) {
      items.push({
        title: activeSearch,
      })
    }

    const activeItem = items.at(-1)
    if (activeItem) {
      activeItem.disabled = true
      delete activeItem.to
    }

    return items
  })

  const companyOptions = computed(() => {
    const companies = new Set()
    for (const product of sourceProducts.value) {
      companies.add(getCompanyLabel(product))
    }
    return ['All', ...Array.from(companies).filter(Boolean).toSorted((a, b) => a.localeCompare(b))]
  })

  const resultsLabel = computed(() => {
    if (totalItems.value <= 0) return '0 items'
    return `${products.value.length} of ${totalItems.value} items`
  })

  function getCompanyLabel(product) {
    const explicitCompany = String(product?.company || '').trim()
    if (explicitCompany) return explicitCompany
    const fallbackNameToken = String(product?.name || '').trim().split(/\s+/)[0]
    return fallbackNameToken || 'Unknown'
  }

  function productImageUrl(product) {
    return safeDisplayImageUrl(product?.image_url)
  }

  function buildCategoryQuery() {
    if (!catalogEntry.value) return {}
    if (catalogEntry.value.isAll) return {}
    if (!catalogEntry.value.item) {
      return {
        category: catalogEntry.value.category.apiCategory,
      }
    }
    return {
      category: catalogEntry.value.category.apiCategory,
      subcategory: catalogEntry.value.item.apiSubcategory,
    }
  }

  async function fetchSourceProducts() {
    const requestId = ++sourceRequestVersion.value
    loadingSource.value = true

    try {
      const response = await fetchProductList({
        params: {
          limit: 250,
          sort: 'newest',
        },
      })

      if (requestId !== sourceRequestVersion.value) return
      const allProducts = extractProductItems(response.data)

      const nextCatalogEntry = isAllProductsRoute.value
        ? {
          category: {
            key: 'products',
            label: 'Product',
            apiCategory: '',
          },
          item: null,
          isAll: true,
          canonicalPath: '/products',
        }
        : resolveCatalogEntryFromProducts(
          allProducts,
          route.params.category,
          route.params.subcategory,
        )

      if (!nextCatalogEntry) {
        catalogEntry.value = null
        sourceProducts.value = []
        products.value = []
        totalItems.value = 0
        totalPages.value = 1
        currentPage.value = 1
        return
      }

      catalogEntry.value = nextCatalogEntry

      if (route.path !== nextCatalogEntry.canonicalPath) {
        router.replace({
          path: nextCatalogEntry.canonicalPath,
          query: route.query,
        })
        return
      }

      sourceProducts.value = nextCatalogEntry.isAll
        ? allProducts
        : allProducts.filter((product) => {
          if (product?.category !== nextCatalogEntry.category.apiCategory) {
            return false
          }
          return !nextCatalogEntry.item || product?.subcategory === nextCatalogEntry.item.apiSubcategory
        })

      if (sourceProducts.value.length === 0) {
        priceBounds.value = { min: 0, max: 0 }
        priceRange.value = [0, 0]
      } else {
        const allPrices = sourceProducts.value.map((product) => Number(product.price || 0))
        const minPrice = Math.floor(Math.min(...allPrices))
        const maxPrice = Math.ceil(Math.max(...allPrices))
        priceBounds.value = { min: minPrice, max: maxPrice }
        priceRange.value = [minPrice, maxPrice]
      }

      suppressFilterWatch.value = true
      filters.company = 'All'
      filters.inStock = false
      filters.sort = 'newest'
      filters.search = querySearchTerm.value
      currentPage.value = 1
      suppressFilterWatch.value = false
      await fetchProducts()
    } catch (error) {
      if (requestId !== sourceRequestVersion.value) return
      console.error('Failed to fetch source products:', error)
      catalogEntry.value = null
      sourceProducts.value = []
      products.value = []
      totalItems.value = 0
      totalPages.value = 1
      currentPage.value = 1
    } finally {
      if (requestId === sourceRequestVersion.value) {
        loadingSource.value = false
      }
    }
  }

  async function fetchProducts() {
    if (!catalogEntry.value) {
      products.value = []
      return
    }

    const requestId = ++productsRequestVersion.value
    loadingProducts.value = true
    try {
      const params = {
        ...buildCategoryQuery(),
        sort: filters.sort,
        include_meta: true,
        page: currentPage.value,
        page_size: pageSize,
      }

      if (filters.company && filters.company !== 'All') {
        params.company = filters.company
      }
      const normalizedSearch = String(filters.search || '').trim()
      if (normalizedSearch) {
        params.search = normalizedSearch
      }
      if (filters.inStock) {
        params.in_stock = true
      }
      const [minPrice, maxPrice] = priceRange.value
      if (minPrice > priceBounds.value.min) {
        params.min_price = minPrice
      }
      if (maxPrice < priceBounds.value.max) {
        params.max_price = maxPrice
      }

      const response = await fetchProductList({ params })
      if (requestId !== productsRequestVersion.value) return

      const payload = response.data
      const normalizedItems = extractProductItems(payload)
      const normalizedMeta = extractProductsMeta(payload)

      products.value = normalizedItems
      totalItems.value = Number(normalizedMeta?.total ?? normalizedItems.length)
      totalPages.value = Math.max(1, Number(normalizedMeta?.total_pages || 1))
    } catch (error) {
      if (requestId !== productsRequestVersion.value) return
      console.error('Failed to fetch filtered products:', error)
      products.value = []
      totalItems.value = 0
      totalPages.value = 1
    } finally {
      if (requestId === productsRequestVersion.value) {
        loadingProducts.value = false
      }
    }
  }

  function scheduleFetchProducts() {
    if (filterFetchTimer) {
      clearTimeout(filterFetchTimer)
    }
    filterFetchTimer = setTimeout(() => {
      fetchProducts()
    }, 260)
  }

  function resetFilters() {
    const wasPageOne = currentPage.value === 1
    suppressFilterWatch.value = true
    filters.search = ''
    filters.company = 'All'
    filters.inStock = false
    filters.sort = 'newest'
    priceRange.value = [priceBounds.value.min, priceBounds.value.max]
    suppressFilterWatch.value = false
    currentPage.value = 1

    if (route.query.search) {
      router.replace({
        path: route.path,
        query: {
          ...route.query,
          search: undefined,
        },
      })
    }

    if (wasPageOne) {
      scheduleFetchProducts()
    }
  }

  function openProduct(productId) {
    router.push(`/product/${productId}`)
  }

  const productStock = (product) => Number(product?.stock || 0)
  const isProductSoldOut = (product) => productStock(product) <= 0

  async function quickAddToCart(product) {
    if (!appStore.isAuthenticated) {
      router.push('/login')
      return
    }

    if (isProductSoldOut(product)) {
      snackbarText.value = 'This product is sold out'
      snackbarColor.value = 'warning'
      snackbar.value = true
      return
    }

    try {
      await cartStore.addToCart(product.product_id, 1)
      snackbarText.value = 'Added to cart'
      snackbarColor.value = 'success'
      snackbar.value = true
    } catch (error) {
      snackbarText.value = error?.response?.data?.message || 'Unable to add item'
      snackbarColor.value = 'warning'
      snackbar.value = true
    }
  }

  watch(
    () => [route.name, route.params.category, route.params.subcategory],
    async () => {
      await fetchSourceProducts()
    },
    { immediate: true },
  )

  watch(querySearchTerm, () => {
    if (!catalogEntry.value) return
    if (filters.search === querySearchTerm.value) return

    suppressFilterWatch.value = true
    filters.search = querySearchTerm.value
    currentPage.value = 1
    suppressFilterWatch.value = false
    fetchProducts()
  })

  watch(
    () => [filters.search, filters.company, filters.inStock, filters.sort, priceRange.value[0], priceRange.value[1]],
    () => {
      if (!catalogEntry.value) return
      if (suppressFilterWatch.value) return
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      scheduleFetchProducts()
    },
  )

  watch(currentPage, () => {
    if (!catalogEntry.value) return
    fetchProducts()
  })

  function handleProductsInvalidated() {
    fetchSourceProducts()
  }

  onMounted(() => {
    window.addEventListener(PRODUCTS_CACHE_INVALIDATED_EVENT, handleProductsInvalidated)
  })

  onUnmounted(() => {
    if (filterFetchTimer) {
      clearTimeout(filterFetchTimer)
    }
    window.removeEventListener(PRODUCTS_CACHE_INVALIDATED_EVENT, handleProductsInvalidated)
  })
</script>

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.py-6 {
  min-height: 100vh;
  background: #f8fafc;
  padding: 40px max(16px, 4vw) 80px !important;
}

/* ════════════════════════════════ BREADCRUMBS ═ */
.flat-breadcrumb-wrap :deep(.v-breadcrumbs) {
  font-family: monospace;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.flat-breadcrumb-wrap :deep(.v-breadcrumbs-item) {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #64748b !important;
  transition: color 0.15s ease;
}

.flat-breadcrumb-wrap :deep(.v-breadcrumbs-item--disabled) {
  color: #0f172a !important;
}

.flat-breadcrumb-wrap :deep(.v-breadcrumbs-item:hover:not(.v-breadcrumbs-item--disabled)) {
  color: #0d9488 !important;
}

.breadcrumb-divider {
  color: #cbd5e1;
  font-weight: 500;
  margin: 0 4px;
}

/* ════════════════════════════════ FILTERS SIDEBAR ══ */
.flat-sidebar-card {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 6px 6px 0px #0f172a;
  padding: 24px;
}

.sidebar-header {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.flat-reset-link {
  position: relative;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  transition: color 0.15s ease;
}

.flat-reset-link:hover {
  color: #0d9488;
}

.underline-hover {
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transition: transform 0.25s ease;
  transform-origin: right;
  transform: scaleX(0);
}

.flat-reset-link:hover .underline-hover {
  transform: scaleX(1);
  transform-origin: left;
}

.sidebar-body {
  display: flex;
  flex-direction: column;
}

/* Custom flat text field & selects */
.flat-field :deep(.v-field) {
  border-radius: 0 !important;
  border: 1px solid #0f172a !important;
  background: #ffffff !important;
  box-shadow: none !important;
  transition: border-color 0.15s ease;
}

.flat-field :deep(.v-field--focused) {
  border-color: #0d9488 !important;
}

.flat-field :deep(.v-field__outline) {
  display: none !important;
}

.flat-field :deep(.v-label) {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #64748b !important;
}

/* Price Range Slider Container */
.flat-slider-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.slider-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.flat-range-slider :deep(.v-slider-thumb__label) {
  background: #0f172a !important;
  border-radius: 0 !important;
  font-family: monospace;
  font-size: 10px !important;
}

.flat-range-slider :deep(.v-slider-track__fill) {
  background: #0d9488 !important;
}

.flat-range-slider :deep(.v-slider-track__background) {
  background: #e2e8f0 !important;
}

/* Flat Checkbox */
.flat-checkbox :deep(.v-checkbox-btn) {
  padding: 0 !important;
  min-height: auto !important;
}

.flat-checkbox :deep(.v-label) {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  opacity: 1 !important;
}

.flat-checkbox :deep(.v-selection-control__input) {
  color: #0f172a !important;
}

/* Mobile Filters Custom Panel */
.flat-mobile-panels {
  border: 1px solid #0f172a;
}

.flat-panel :deep(.v-expansion-panel-title) {
  background: #ffffff !important;
  border-bottom: 1px solid #0f172a;
}

.flat-panel-title {
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #0f172a;
}

.flat-panel-text {
  background: #f8fafc;
}

.flat-reset-btn {
  height: 40px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  border: 1px solid #0f172a !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
}

.flat-reset-btn:hover {
  background: #0f172a !important;
  color: #ffffff !important;
}

/* ════════════════════════════ RESULTS BAR ═══ */
.flat-results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #0f172a;
  padding: 12px 20px;
}

.results-text {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.results-page-tag {
  font-size: 10px;
  font-weight: 800;
  color: #0d9488;
  border: 1px solid rgba(13, 148, 136, 0.15);
  background: rgba(13, 148, 136, 0.05);
  padding: 3px 8px;
  letter-spacing: 0.05em;
}

/* ════════════════════════════ PRODUCT JOINT GRID ══ */
.product-joint-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border: 1px solid #0f172a;
  margin-right: -1px;
  margin-bottom: -1px;
  cursor: pointer;
  position: relative;
  z-index: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, z-index 0s;
}

.product-joint-card:hover {
  background: #fafafa;
  border-color: #0d9488;
  z-index: 2;
}

.product-image-wrap {
  position: relative;
  width: 100%;
  background: #fafafa;
  border-bottom: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.product-grid-image {
  max-width: 100%;
  transition: transform 0.3s ease;
}

.product-joint-card:hover .product-grid-image {
  transform: scale(1.03);
}

.no-image-grid-placeholder {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  width: 100%;
}

.product-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.product-grid-category {
  font-size: 10px;
  font-weight: 800;
  color: #0d9488;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Flat Grid Stock Badge */
.grid-badge-stock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #166534;
  background: rgba(22, 163, 74, 0.06);
  padding: 3px 8px;
  border: 1px solid rgba(22, 163, 74, 0.12);
}

.grid-badge-stock--out {
  color: #991b1b;
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.12);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.product-grid-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  line-height: 1.4;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.product-grid-subcat {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 16px;
}

.product-grid-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed #f1f5f9;
}

.product-grid-price {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.product-grid-cart-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s ease;
}

.product-grid-cart-btn:hover:not(:disabled) {
  background: #0d9488;
}

.product-grid-cart-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

/* ════════════════════════════ EMPTY STATE ═════ */
.flat-empty-products {
  width: 100%;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
}

.empty-text {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* ════════════════════════════ PAGINATION ══════ */
.custom-pagination {
  margin-top: 12px;
}

.custom-pagination :deep(.v-btn) {
  border-radius: 0 !important;
  border: 1px solid #cbd5e1 !important;
  box-shadow: none !important;
  color: #0f172a !important;
  background: #ffffff !important;
  font-weight: 700 !important;
  transition: all 0.15s ease !important;
}

.custom-pagination :deep(.v-pagination__item--focused .v-btn),
.custom-pagination :deep(.v-btn--active) {
  background: #0f172a !important;
  border-color: #0f172a !important;
  color: #ffffff !important;
}

.custom-pagination :deep(.v-btn:hover) {
  background: #f8fafc !important;
  border-color: #0d9488 !important;
}

.custom-pagination :deep(.v-btn--active:hover) {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
}

/* ════════════════════════════ BACK BUTTON ═════ */
.action-btn-back {
  height: 40px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  background: #0f172a !important;
  letter-spacing: 0px !important;
  text-transform: none !important;
  transition: background-color 0.15s ease !important;
}

.action-btn-back:hover {
  background: #0d9488 !important;
}

/* ════════════════════════════ RESPONSIVE ════════ */
@media (max-width: 959px) {
  .py-6 {
    padding: 24px 16px 60px !important;
  }
}
</style>
