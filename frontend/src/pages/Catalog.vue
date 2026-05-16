<template>
  <v-container class="py-5 py-md-3 " fluid>
    <v-sheet v-if="catalogEntry" class="mb-1 pa-0">
      <v-breadcrumbs :items="breadcrumbItems" class="text-h6">
        <template v-slot:prepend>
          <v-icon icon="mdi-home" size="xs-small"></v-icon>
        </template>
      </v-breadcrumbs>
    </v-sheet>

    <v-card v-else class="pa-6 text-center" rounded="lg" variant="outlined">
      <v-icon color="warning" size="40">mdi-folder-alert-outline</v-icon>
      <h2 class="text-h5 mt-3">Category not found</h2>
      <p class="text-body-2 text-medium-emphasis mt-2">The requested category path is invalid.</p>
      <div class="mt-4">
        <v-btn color="teal-darken-1" rounded="lg" to="/" variant="flat">Back to Home</v-btn>
      </div>
    </v-card>

    <v-row v-if="catalogEntry" class="ga-0">
      <v-col cols="12" lg="3" md="4">
        <v-expansion-panels v-if="isMobileFilters" v-model="mobileFilterPanel" variant="accordion" rounded="lg" elevation="0">
          <v-expansion-panel class="border" value="filters">
            <v-expansion-panel-title>
              <span class="font-weight-medium">Filters</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="d-flex flex-column ga-3">
                <v-text-field v-model="filters.search" clearable density="comfortable" hide-details
                  label="Search products" prepend-inner-icon="mdi-magnify" variant="outlined" />

                <v-select v-model="filters.company" density="comfortable" hide-details :items="companyOptions"
                  label="Company" variant="outlined" />

                <v-sheet class="pa-3" border rounded="lg">
                  <p class="text-caption text-medium-emphasis mb-2">Price Range</p>
                  <v-range-slider v-model="priceRange" color="teal-darken-1" density="comfortable" hide-details
                    :max="priceBounds.max" :min="priceBounds.min" step="1" thumb-label="always" />
                  <div class="d-flex justify-space-between text-caption mt-1">
                    <span>{{ formatAmount(priceRange[0] || 0) }}</span>
                    <span>{{ formatAmount(priceRange[1] || 0) }}</span>
                  </div>
                </v-sheet>

                <v-checkbox v-model="filters.inStock" color="teal-darken-1" density="comfortable" hide-details
                  label="In stock only" />

                <v-select v-model="filters.sort" density="comfortable" hide-details item-title="label"
                  item-value="value" :items="sortOptions" label="Sort By" variant="outlined" />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-card v-else rounded="lg" variant="flat" class="border position-sticky" style="top: 4.5rem">
          <v-card-title class="d-flex align-center justify-space-between ga-2">
            <span>Filters</span>
            <v-btn size="small" variant="text" @click="resetFilters">Reset</v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="d-flex flex-column ga-3">
            <v-text-field v-model="filters.search" clearable density="comfortable" hide-details label="Search products"
              prepend-inner-icon="mdi-magnify" variant="outlined" />

            <v-select v-model="filters.company" density="comfortable" hide-details :items="companyOptions"
              label="Company" variant="outlined" />

            <v-sheet class="pa-3" border rounded="lg">
              <p class="text-caption text-medium-emphasis mb-2">Price Range</p>
              <v-range-slider v-model="priceRange" color="teal-darken-1" density="comfortable" hide-details
                :max="priceBounds.max" :min="priceBounds.min" step="1" thumb-label="always" />
              <div class="d-flex justify-space-between text-caption mt-1">
                <span>{{ formatAmount(priceRange[0] || 0) }}</span>
                <span>{{ formatAmount(priceRange[1] || 0) }}</span>
              </div>
            </v-sheet>

            <v-checkbox v-model="filters.inStock" color="teal-darken-1" density="comfortable" hide-details
              label="In stock only" />

            <v-select v-model="filters.sort" density="comfortable" hide-details item-title="label" item-value="value"
              :items="sortOptions" label="Sort By" variant="outlined" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="9" md="8">
        <v-sheet
          class="d-flex flex-wrap align-center justify-space-between ga-3 pa-2 rounded-lg border mb-4">
          <p class="text-body-2 text-medium-emphasis font-weight-medium">{{ resultsLabel }}</p>
          <v-chip v-if="totalPages > 0" size="small" variant="outlined">
            Page {{ currentPage }} / {{ totalPages }}
          </v-chip>
        </v-sheet>

        <v-row v-if="loading">
          <v-col v-for="n in 8" :key="n" cols="12" lg="4" sm="6">
            <v-skeleton-loader type="image, article" />
          </v-col>
        </v-row>

        <v-row v-else-if="products.length > 0" no-gutters>
          <v-col v-for="product in products" :key="product.product_id" cols="12" lg="4" sm="6">
            <v-card class="h-100" rounded="0" variant="flat" border @click="openProduct(product.product_id)">
              <v-img v-if="productImageUrl(product)" :alt="product.name" aspect-ratio="1" cover
                :src="productImageUrl(product)" />
              <v-sheet v-else class="d-flex align-center justify-center" height="220">
                <v-icon color="primary" size="44">mdi-image-off-outline</v-icon>
              </v-sheet>

              <v-card-text>
                <p class="text-caption text-medium-emphasis text-uppercase mb-1">{{ getCompanyLabel(product) }}</p>
                <p class="text-subtitle-1 font-weight-bold text-truncate">{{ product.name }}</p>
                <p class="text-body-2 text-medium-emphasis mt-1">
                  {{ product.subcategory || catalogEntry.category.label }}
                </p>
                <div class="d-flex align-center justify-space-between ga-2 mt-3">
                  <strong>{{ formatAmount(product.price) }}</strong>
                  <v-chip :color="Number(product.stock || 0) > 0 ? 'success' : 'error'" size="small" variant="tonal">
                    {{ Number(product.stock || 0) > 0 ? `Stock ${product.stock}` : 'Out of stock' }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card v-else class="pa-8 text-center" rounded="lg" variant="outlined">
          <v-icon color="primary" size="40">mdi-package-variant-remove</v-icon>
          <h3 class="text-h6 mt-3">No products match your filters</h3>
          <p class="text-body-2 text-medium-emphasis mt-2">Change company, price, or stock filters to load more results.
          </p>
        </v-card>

        <div v-if="!loading && totalPages > 1" class="d-flex justify-center mt-5">
          <v-pagination v-model="currentPage" density="comfortable" :length="totalPages" rounded="circle"
            :total-visible="6" />
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { resolveCatalogEntryFromProducts } from '@/utils/catalog'
import { useCurrency } from '@/utils/currency'
import { safeDisplayImageUrl } from '@/utils/images'
import {
  extractProductItems,
  extractProductsMeta,
  fetchProductList,
} from '@/utils/products'
import { PRODUCTS_CACHE_INVALIDATED_EVENT } from '@/utils/productCache'

const route = useRoute()
const router = useRouter()
const { formatAmount } = useCurrency()
const { smAndDown } = useDisplay()

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

  const activeItem = items[items.length - 1]
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
    totalItems.value = Number(normalizedMeta?.total || normalizedItems.length || 0)
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
