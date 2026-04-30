<template>
  <div class="catalog-page">
    <v-container class="catalog-shell">
      <section v-if="catalogEntry" class="catalog-intro">
        <p class="catalog-kicker">Category Collection</p>
        <h1>{{ pageTitle }}</h1>
      </section>

      <section v-else class="catalog-missing">
        <h2>Category not found</h2>
        <p>The requested category path is invalid.</p>
        <v-btn class="catalog-home-btn" rounded="pill" to="/" variant="flat">Back to Home</v-btn>
      </section>

      <v-row v-if="catalogEntry" class="catalog-layout">
        <v-col cols="12" lg="3" md="4">
          <aside class="filter-panel">
            <div class="filter-head">
              <h3>Filters</h3>
              <v-btn class="filter-reset" size="small" variant="text" @click="resetFilters">
                Reset
              </v-btn>
            </div>

            <v-text-field
              v-model="filters.search"
              class="filter-control"
              clearable
              density="comfortable"
              hide-details
              label="Search products"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />

            <v-select
              v-model="filters.company"
              class="filter-control"
              density="comfortable"
              hide-details
              :items="companyOptions"
              label="Company"
              variant="outlined"
            />

            <div class="filter-control price-control">
              <p class="price-label">Price Range</p>
              <v-range-slider
                v-model="priceRange"
                color="primary"
                density="comfortable"
                hide-details
                :max="priceBounds.max"
                :min="priceBounds.min"
                step="1"
                thumb-label="always"
              />
              <div class="price-values">
                <span>{{ formatAmount(priceRange[0] || 0) }}</span>
                <span>{{ formatAmount(priceRange[1] || 0) }}</span>
              </div>
            </div>

            <v-checkbox
              v-model="filters.inStock"
              class="filter-control"
              color="primary"
              density="comfortable"
              hide-details
              label="In stock only"
            />

            <v-select
              v-model="filters.sort"
              class="filter-control"
              density="comfortable"
              hide-details
              item-title="label"
              item-value="value"
              :items="sortOptions"
              label="Sort By"
              variant="outlined"
            />
          </aside>
        </v-col>

        <v-col cols="12" lg="9" md="8">
          <div class="results-head">
            <p class="result-label">{{ resultsLabel }}</p>
            <v-chip
              v-if="totalPages > 0"
              class="results-page-chip"
              size="small"
              variant="outlined"
            >
              Page {{ currentPage }} / {{ totalPages }}
            </v-chip>
          </div>

          <v-row v-if="loading">
            <v-col
              v-for="n in 8"
              :key="n"
              cols="12"
              lg="4"
              sm="6"
            >
              <v-skeleton-loader class="result-skeleton" type="image, article" />
            </v-col>
          </v-row>

          <v-row v-else-if="products.length > 0">
            <v-col
              v-for="product in products"
              :key="product.product_id"
              cols="12"
              lg="4"
              sm="6"
            >
              <v-card class="result-card" elevation="0" @click="openProduct(product.product_id)">
                <div class="result-media">
                  <img :alt="product.name" class="result-image" loading="lazy" :src="product.image_url">
                </div>
                <v-card-text class="result-content">
                  <p class="result-company">{{ getCompanyLabel(product) }}</p>
                  <h3>{{ product.name }}</h3>
                  <p class="result-subcategory">{{ product.subcategory || catalogEntry.category.label }}</p>
                  <div class="result-meta">
                    <span class="result-price">{{ formatAmount(product.price) }}</span>
                    <span class="result-stock" :class="{ 'is-low': Number(product.stock || 0) < 1 }">
                      {{ Number(product.stock || 0) > 0 ? `Stock ${product.stock}` : 'Out of stock' }}
                    </span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <div v-else class="results-empty">
            <h3>No products match your filters.</h3>
            <p>Change company, price, or stock filters to load more results.</p>
          </div>

          <div v-if="!loading && totalPages > 1" class="results-pagination">
            <v-pagination
              v-model="currentPage"
              density="comfortable"
              :length="totalPages"
              rounded="circle"
              :total-visible="6"
            />
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
  import axios from 'axios'
  import { computed, onUnmounted, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { API_URL } from '@/utils/api'
  import { resolveCatalogEntryFromProducts } from '@/utils/catalog'
  import { useCurrency } from '@/utils/currency'

  const route = useRoute()
  const router = useRouter()
  const { formatAmount } = useCurrency()

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

  const pageTitle = computed(() => {
    if (!catalogEntry.value) return 'Catalog'
    // Category-only view
    if (!catalogEntry.value.item) {
      return `${catalogEntry.value.category.label}`
    }
    // Category + subcategory view
    return `${catalogEntry.value.category.label} / ${catalogEntry.value.item.name}`
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

  function buildCategoryQuery() {
    if (!catalogEntry.value) return {}
    // Category-only view - show all products in category
    if (!catalogEntry.value.item) {
      return {
        category: catalogEntry.value.category.apiCategory,
      }
    }
    // Category + subcategory view
    return {
      category: catalogEntry.value.category.apiCategory,
      subcategory: catalogEntry.value.item.apiSubcategory,
    }
  }

  async function fetchSourceProducts() {
    const requestId = ++sourceRequestVersion.value
    loadingSource.value = true
    try {
      const response = await axios.get(`${API_URL}/products`, {
        params: {
          limit: 250,
          sort: 'newest',
        },
      })

      if (requestId !== sourceRequestVersion.value) return
      const allProducts = Array.isArray(response.data) ? response.data : []
      const nextCatalogEntry = resolveCatalogEntryFromProducts(
        allProducts,
        route.params.category,
        route.params.subcategory,
      )

      // Handle category-only route (no subcategory)
      const isCategoryOnly = !route.params.subcategory
      let categoryOnlyEntry = null

      if (isCategoryOnly) {
        // Find the category without requiring subcategory
        const normalizedCategorySlug = String(route.params.category || '').toLowerCase()
        const foundCategory = allProducts.find(p =>
          String(p.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === normalizedCategorySlug
        )

        if (foundCategory) {
          const categoryLabel = foundCategory.category
          const categoryKey = String(categoryLabel || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
          categoryOnlyEntry = {
            category: {
              key: categoryKey,
              label: categoryLabel,
              apiCategory: categoryLabel,
            },
            item: null, // No subcategory filter
            canonicalPath: `/${categoryKey}`
          }
        }
      }

      // Use category-only entry if that's what we're navigating to
      const finalCatalogEntry = isCategoryOnly ? categoryOnlyEntry : nextCatalogEntry

      if (!finalCatalogEntry) {
        catalogEntry.value = null
        sourceProducts.value = []
        products.value = []
        totalItems.value = 0
        totalPages.value = 1
        currentPage.value = 1
        return
      }

      catalogEntry.value = finalCatalogEntry

      // Only redirect if we have a subcategory and path doesn't match
      if (!isCategoryOnly && route.path !== finalCatalogEntry.canonicalPath) {
        router.replace(finalCatalogEntry.canonicalPath)
        return
      }

      // Filter products based on whether we have a subcategory or not
      sourceProducts.value = allProducts.filter((product) => {
        // Category-only: show all products in the category
        if (isCategoryOnly && !nextCatalogEntry?.item) {
          return product?.category === finalCatalogEntry.category.apiCategory
        }
        // Category + subcategory: filter by both
        return (
          product?.category === finalCatalogEntry.category.apiCategory &&
          product?.subcategory === finalCatalogEntry.item?.apiSubcategory
        )
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
      filters.search = ''
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

      const response = await axios.get(`${API_URL}/products`, { params })
      if (requestId !== productsRequestVersion.value) return
      const payload = response.data
      if (Array.isArray(payload?.items)) {
        products.value = payload.items
        totalItems.value = Number(payload?.meta?.total || 0)
        totalPages.value = Math.max(1, Number(payload?.meta?.total_pages || 1))
        return
      }

      const fallbackProducts = Array.isArray(payload) ? payload : []
      products.value = fallbackProducts
      totalItems.value = fallbackProducts.length
      totalPages.value = 1
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
    if (wasPageOne) {
      scheduleFetchProducts()
    }
  }

  function openProduct(productId) {
    router.push(`/product/${productId}`)
  }

  watch(
    () => [route.params.category, route.params.subcategory],
    async () => {
      await fetchSourceProducts()
    },
    { immediate: true },
  )

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

  onUnmounted(() => {
    if (filterFetchTimer) {
      clearTimeout(filterFetchTimer)
    }
  })
</script>

<style scoped>
.catalog-page {
  min-height: 100vh;
  padding: 34px 0 64px;
  background:
    radial-gradient(circle at 8% 10%, rgba(210, 122, 45, 0.22), rgba(210, 122, 45, 0) 28%),
    radial-gradient(circle at 86% 8%, rgba(30, 67, 73, 0.14), rgba(30, 67, 73, 0) 28%),
    linear-gradient(160deg, #f5f1ec 0%, #f3f5f2 48%, #eef3f5 100%);
}

.catalog-shell {
  position: relative;
  z-index: 1;
}

.catalog-intro h1 {
  margin-top: 8px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  color: #1a2c31;
}

.catalog-kicker {
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: 0.72rem;
  color: #b56724;
  font-weight: 700;
}

.catalog-subtitle {
  margin-top: 10px;
  max-width: 760px;
  color: #64757d;
  line-height: 1.7;
}

.catalog-layout {
  margin-top: 18px;
}

.filter-panel {
  position: sticky;
  top: 104px;
  border: 1px solid #d5dfdb;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 30px rgba(20, 37, 41, 0.1);
}

.filter-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-head h3 {
  font-size: 1.08rem;
  color: #1e3238;
}

.filter-reset {
  text-transform: none;
}

.filter-control {
  margin-top: 10px;
}

.price-control {
  border: 1px solid #d8e2de;
  border-radius: 12px;
  padding: 10px;
  background: #f9fbfa;
}

.price-label {
  color: #4f646b;
  font-size: 0.82rem;
  font-weight: 700;
}

.price-values {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
  color: #31484f;
}

.results-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 16px;
}

.result-label {
  color: #5a6b72;
  font-size: 0.88rem;
  font-weight: 700;
}

.results-page-chip {
  color: #35505a;
  border-color: #c8d5d9;
  background: rgba(255, 255, 255, 0.7);
}

.result-card {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #d8dfdd;
  background: #ffffff;
  cursor: pointer;
  height: 100%;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.result-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 32px rgba(26, 43, 47, 0.14);
}

.result-media {
  width: 100%;
  height: 220px;
  overflow: hidden;
  background: #e9eeeb;
}

.result-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-content {
  padding: 14px !important;
}

.result-company {
  color: #7b8b92;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.3px;
  font-weight: 700;
}

.result-content h3 {
  margin-top: 7px;
  color: #203138;
  font-size: 0.98rem;
  line-height: 1.35;
  min-height: 42px;
}

.result-subcategory {
  margin-top: 6px;
  color: #60727a;
  font-size: 0.84rem;
}

.result-meta {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.result-price {
  color: #a55e22;
  font-weight: 800;
}

.result-stock {
  font-size: 0.78rem;
  border: 1px solid #cfe0d8;
  border-radius: 999px;
  padding: 4px 8px;
  color: #2c5442;
  background: #f2faf6;
}

.result-stock.is-low {
  border-color: #e6c2bd;
  color: #8d2e2e;
  background: #fff5f5;
}

.results-empty {
  margin-top: 12px;
  border: 1px dashed #c0cbc8;
  border-radius: 16px;
  padding: 32px 18px;
  text-align: center;
  background: rgba(255, 255, 255, 0.66);
}

.results-empty h3 {
  color: #203238;
  font-size: 1.2rem;
}

.results-empty p {
  margin-top: 8px;
  color: #66777d;
}

.results-pagination {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

.catalog-missing {
  text-align: center;
  padding: 54px 0;
}

.catalog-home-btn {
  margin-top: 12px;
  text-transform: none;
}

.result-skeleton {
  border-radius: 16px;
}

@media (max-width: 960px) {
  .filter-panel {
    position: static;
  }

  .results-head {
    justify-content: space-between;
  }
}

@media (max-width: 600px) {
  .catalog-page {
    padding-top: 76px;
  }
}
</style>
