<template>
  <div class="user-admin-page">
    <v-container class="py-5 py-md-7" fluid>
      <v-row align="center" class="mb-4" dense>
        <v-col cols="12" md="7">
          <div class="text-h5 text-md-h4 font-weight-bold">User Admin</div>
          <div class="text-body-2 text-medium-emphasis">
            Manage your product drafts from your PIN-protected account.
          </div>
        </v-col>
        <v-col cols="12" md="5">
          <div class="d-flex flex-column flex-sm-row justify-md-end ga-2">
            <v-btn
              color="teal-darken-1"
              prepend-icon="mdi-refresh"
              rounded="lg"
              variant="tonal"
              @click="loadConsole"
            >
              Refresh
            </v-btn>
            <v-btn
              color="teal-darken-1"
              prepend-icon="mdi-account-outline"
              rounded="lg"
              to="/profile"
              variant="flat"
            >
              Profile
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <v-alert
        v-if="!appStore.loading && !appStore.isAuthenticated"
        class="mb-4"
        rounded="lg"
        type="info"
        variant="tonal"
      >
        <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3">
          <span>Login before opening your user admin controls.</span>
          <v-btn color="teal-darken-1" rounded="lg" to="/login" variant="flat">Login</v-btn>
        </div>
      </v-alert>

      <v-alert
        v-else-if="!loading && !hasPinAccess"
        class="mb-4"
        rounded="lg"
        type="warning"
        variant="tonal"
      >
        <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3">
          <span>Create or enter your User Admin PIN from Profile before using User Admin.</span>
          <v-btn color="teal-darken-1" rounded="lg" to="/profile" variant="flat">Open Profile</v-btn>
        </div>
      </v-alert>

      <template v-if="appStore.isAuthenticated && hasPinAccess">
        <v-row align="start" dense>
          <v-col cols="12" lg="2" md="3">
            <v-card border rounded="lg" variant="flat">
              <v-list density="compact" nav>
                <v-list-item
                  v-for="item in userAdminNavItems"
                  :key="item.id"
                  :active="activePanel === item.id"
                  active-color="teal-darken-1"
                  rounded="lg"
                  @click="activePanel = item.id"
                >
                  <template #prepend>
                    <v-icon :icon="item.icon" />
                  </template>
                  <v-list-item-title>{{ item.label }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <v-col cols="12" lg="10" md="9">
            <template v-if="activePanel === 'dashboard'">
              <v-row dense>
                <v-col
                  v-for="metric in metrics"
                  :key="metric.label"
                  cols="12"
                  md="3"
                  sm="6"
                >
                  <v-card border rounded="lg" variant="flat">
                    <v-card-text class="d-flex align-center justify-space-between ga-3">
                      <div>
                        <div class="text-caption text-medium-emphasis">{{ metric.label }}</div>
                        <div class="text-h6 font-weight-bold">{{ metric.value }}</div>
                      </div>
                      <v-avatar :color="metric.color" size="44" variant="tonal">
                        <v-icon :color="metric.color">{{ metric.icon }}</v-icon>
                      </v-avatar>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <v-row class="mt-2" dense>
                <v-col cols="12" lg="4">
                  <v-card border class="h-100" rounded="lg" variant="flat">
                    <v-card-title>Product Analysis</v-card-title>
                    <v-card-text>
                      <div
                        v-for="segment in categoryStats"
                        :key="segment.name"
                        class="mb-4"
                      >
                        <div class="d-flex justify-space-between text-body-2 mb-1">
                          <span class="font-weight-medium">{{ segment.name }}</span>
                          <span class="text-medium-emphasis">{{ segment.count }}</span>
                        </div>
                        <v-progress-linear color="teal-darken-1" height="10" :model-value="segment.percent" rounded />
                      </div>
                      <v-alert v-if="categoryStats.length === 0" type="info" variant="tonal">
                        No product categories yet.
                      </v-alert>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" lg="4">
                  <v-card border class="h-100" rounded="lg" variant="flat">
                    <v-card-title>Inventory</v-card-title>
                    <v-card-text>
                      <v-list density="compact">
                        <v-list-item :subtitle="`${lowStockCount} products below 5 units`" title="Low stock">
                          <template #prepend>
                            <v-icon color="warning" icon="mdi-alert-outline" />
                          </template>
                        </v-list-item>
                        <v-list-item :subtitle="`${productsWithImagesCount} products with images`" title="Images">
                          <template #prepend>
                            <v-icon color="teal-darken-1" icon="mdi-image-multiple-outline" />
                          </template>
                        </v-list-item>
                        <v-list-item :subtitle="formatMoney(totalInventoryValue)" title="Shelf value">
                          <template #prepend>
                            <v-icon color="success" icon="mdi-cash-multiple" />
                          </template>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" lg="4">
                  <v-card border class="h-100" rounded="lg" variant="flat">
                    <v-card-title>Top Value Products</v-card-title>
                    <v-card-text>
                      <v-list v-if="topValueProducts.length > 0" density="compact">
                        <v-list-item
                          v-for="product in topValueProducts"
                          :key="product.product_id || product.name"
                          :subtitle="formatDraftCategory(product)"
                          :title="product.name"
                        >
                          <template #prepend>
                            <v-avatar v-if="draftImageUrl(product)" rounded="lg" size="36">
                              <v-img cover :src="draftImageUrl(product)" />
                            </v-avatar>
                            <v-avatar v-else color="surface" rounded="lg" size="36">
                              <v-icon color="primary" icon="mdi-image-off-outline" />
                            </v-avatar>
                          </template>
                          <template #append>
                            <div class="text-body-2 font-weight-bold">{{ formatMoney(product.shelf_value) }}</div>
                          </template>
                        </v-list-item>
                      </v-list>
                      <v-alert v-else type="info" variant="tonal">
                        No product value data.
                      </v-alert>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </template>

            <v-card v-else-if="activePanel === 'products'" border rounded="lg" variant="flat">
              <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3">
                <div>
                  <div>Products</div>
                  <div class="text-body-2 text-medium-emphasis">{{ products.length }} saved in your user admin area.</div>
                </div>
                <div class="d-flex flex-column flex-sm-row ga-2">
                  <v-text-field
                    v-model="productSearch"
                    density="compact"
                    hide-details
                    label="Search products"
                    max-width="320"
                    prepend-inner-icon="mdi-magnify"
                    rounded="lg"
                    variant="outlined"
                  />
                  <v-btn
                    color="teal-darken-1"
                    prepend-icon="mdi-plus"
                    rounded="lg"
                    variant="flat"
                    @click="openAddDialog"
                  >
                    Add Product
                  </v-btn>
                </div>
              </v-card-title>
              <v-card-text>
                <v-progress-linear v-if="loading" color="teal-darken-1" indeterminate />
                <v-alert v-else-if="filteredProducts.length === 0" type="info" variant="tonal">
                  {{ products.length === 0 ? 'Add your first product.' : 'No matching products found.' }}
                </v-alert>
                <v-data-table
                  v-else
                  density="comfortable"
                  :headers="productHeaders"
                  :items="filteredProducts"
                  :items-per-page="8"
                >
                  <template #item.name="{ item }">
                    <div class="d-flex align-center ga-3 py-2">
                      <v-avatar v-if="draftImageUrl(resolveItem(item))" rounded="lg" size="44">
                        <v-img cover :src="draftImageUrl(resolveItem(item))" />
                      </v-avatar>
                      <v-avatar v-else color="surface" rounded="lg" size="44">
                        <v-icon color="primary">mdi-image-off-outline</v-icon>
                      </v-avatar>
                      <div>
                        <div class="font-weight-medium">{{ resolveItem(item).name }}</div>
                        <div class="text-caption text-medium-emphasis">{{ formatDraftCategory(resolveItem(item)) }}</div>
                      </div>
                    </div>
                  </template>
                  <template #item.price="{ item }">
                    {{ formatDraftPrice(resolveItem(item)) }}
                  </template>
                  <template #item.stock="{ item }">
                    <v-chip color="teal-darken-1" size="small" variant="tonal">
                      {{ resolveItem(item).stock }}
                    </v-chip>
                  </template>
                  <template #item.actions="{ item }">
                    <div class="d-flex align-center">
                      <v-btn
                        aria-label="Edit product"
                        icon
                        size="small"
                        variant="text"
                        @click="editProduct(resolveItem(item))"
                      >
                        <v-icon icon="mdi-pencil-outline" />
                      </v-btn>
                      <v-btn
                        aria-label="Remove product"
                        color="error"
                        icon
                        size="small"
                        variant="text"
                        @click="removeProduct(resolveItem(item))"
                      >
                        <v-icon icon="mdi-delete-outline" />
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>

            <v-card v-else-if="activePanel === 'reviews'" border rounded="lg" variant="flat">
              <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3">
                <div>
                  <div>Reviews</div>
                  <div class="text-body-2 text-medium-emphasis">{{ reviews.length }} public reviews on your products.</div>
                </div>
                <v-btn
                  color="teal-darken-1"
                  prepend-icon="mdi-refresh"
                  rounded="lg"
                  variant="tonal"
                  @click="loadConsole"
                >
                  Refresh
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-progress-linear v-if="reviewsLoading" color="teal-darken-1" indeterminate />
                <v-alert v-else-if="reviews.length === 0" type="info" variant="tonal">
                  No product reviews yet.
                </v-alert>
                <v-list v-else bg-color="transparent" lines="three">
                  <template
                    v-for="(review, index) in reviews"
                    :key="review.review_id || `${review.product_id}-${index}`"
                  >
                    <v-list-item>
                      <template #prepend>
                        <v-avatar v-if="review.product_image_url" rounded="lg" size="48">
                          <v-img cover :src="review.product_image_url" />
                        </v-avatar>
                        <v-avatar v-else color="surface" rounded="lg" size="48">
                          <v-icon color="primary" icon="mdi-image-off-outline" />
                        </v-avatar>
                      </template>
                      <template #title>
                        <div class="d-flex align-center flex-wrap ga-2">
                          <span class="font-weight-medium">{{ review.product_name || review.product_id }}</span>
                          <v-rating
                            active-color="amber-darken-2"
                            color="grey-lighten-1"
                            density="compact"
                            :model-value="Number(review.rating || 0)"
                            readonly
                            size="16"
                          />
                        </div>
                      </template>
                      <template #subtitle>
                        <div class="text-body-2 text-medium-emphasis mt-1">{{ review.comment }}</div>
                        <div class="d-flex flex-wrap ga-2 mt-2 text-caption text-medium-emphasis">
                          <span>{{ review.reviewer_name || 'Mindstores user' }}</span>
                          <span v-if="review.reviewer_email">{{ review.reviewer_email }}</span>
                          <span>{{ formatReviewDate(review.created_at) }}</span>
                        </div>
                      </template>
                    </v-list-item>
                    <v-divider v-if="index < reviews.length - 1" />
                  </template>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="3000"
      :type="snackbarColor"
    />

    <v-dialog v-model="productDialog" max-width="1180" scrollable>
      <v-card rounded="lg">
        <v-card-title>{{ editProductId ? 'Edit Product' : 'Add Product' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveProductDraft">
            <v-row dense>
              <v-col cols="12" md="8">
                <v-row class="ga-4" dense>
                  <v-col cols="12">
                    <v-file-input
                      v-model="productImageFiles"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      chips
                      clearable
                      density="comfortable"
                      label="Product images"
                      multiple
                      placeholder="Select product images"
                      prepend-icon="mdi-image-plus"
                      variant="outlined"
                      @click:clear="clearProductImageFiles"
                      @update:model-value="onProductImagesSelected"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      auto-grow
                      density="comfortable"
                      hide-details
                      label="Image URLs (one per line)"
                      :model-value="productImageInputValue"
                      prepend-icon="mdi-image-search-outline"
                      rows="2"
                      variant="outlined"
                      @update:model-value="updateProductImageUrls"
                    />
                  </v-col>
                </v-row>
              </v-col>
              <v-col cols="12" md="4">
                <v-sheet
                  border
                  class="d-flex align-center justify-center h-100 pa-3"
                  color="blue-grey-lighten-5"
                  rounded="lg"
                >
                  <v-carousel
                    v-if="productImageGallery.length > 0"
                    height="180"
                    hide-delimiter-background
                    :hide-delimiters="productImageGallery.length <= 1"
                    :show-arrows="productImageGallery.length > 1 ? 'hover' : false"
                  >
                    <v-carousel-item
                      v-for="(imageUrl, index) in productImageGallery"
                      :key="`${imageUrl}-${index}`"
                    >
                      <v-img
                        :alt="`Product preview ${index + 1}`"
                        cover
                        height="180"
                        :src="imageUrl"
                      />
                    </v-carousel-item>
                  </v-carousel>
                  <v-avatar
                    v-else
                    color="surface"
                    rounded="lg"
                    size="156"
                    variant="outlined"
                  >
                    <v-icon color="primary">mdi-image-off-outline</v-icon>
                  </v-avatar>
                </v-sheet>
              </v-col>
              <v-col v-if="productImageGallery.length > 0" cols="12">
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="(imageUrl, index) in productImageGallery"
                    :key="`${imageUrl}-${index}`"
                    closable
                    size="small"
                    variant="outlined"
                    @click:close="removeProductImage(index)"
                  >
                    {{ index === 0 ? 'Primary image' : `Image ${index + 1}` }}
                  </v-chip>
                </div>
              </v-col>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="productForm.name"
                  density="comfortable"
                  label="Product name"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="productForm.company"
                  density="comfortable"
                  label="Brand"
                  variant="outlined"
                />
              </v-col>
              <v-col class="d-flex flex-column ga-1" cols="12" md="1">
                <v-btn
                  v-for="option in descriptionBulletOptions"
                  :key="option.symbol"
                  :aria-label="option.label"
                  min-width="54"
                  rounded="lg"
                  variant="outlined"
                  @click="addDescriptionBullet(option.symbol)"
                >
                  {{ option.symbol }}
                </v-btn>
              </v-col>
              <v-col cols="12" md="11">
                <v-textarea
                  v-model="productForm.description"
                  auto-grow
                  density="comfortable"
                  label="Description"
                  rows="7"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="productForm.price_currency"
                  density="comfortable"
                  item-title="title"
                  item-value="value"
                  :items="priceCurrencyOptions"
                  label="Country currency"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.price"
                  density="comfortable"
                  label="Price"
                  min="0"
                  :prefix="selectedPriceCurrency"
                  required
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.stock"
                  density="comfortable"
                  label="Stock"
                  min="0"
                  required
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="productForm.category"
                  density="comfortable"
                  :items="categoryOptions"
                  label="Category"
                  required
                  variant="outlined"
                >
                  <template #append-item>
                    <v-divider class="mt-2" />
                    <v-list-item
                      prepend-icon="mdi-plus"
                      title="Add more"
                      @click="openCatalogOptionDialog('category')"
                      @mousedown.prevent
                    />
                  </template>
                </v-combobox>
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="productForm.subcategory"
                  density="comfortable"
                  :disabled="!normalizeCategoryName(productForm.category)"
                  :items="availableSubcategories"
                  label="Subcategory (optional)"
                  variant="outlined"
                >
                  <template #append-item>
                    <v-divider class="mt-2" />
                    <v-list-item
                      :disabled="!normalizeCategoryName(productForm.category)"
                      prepend-icon="mdi-plus"
                      title="Add more"
                      @click="openCatalogOptionDialog('subcategory')"
                      @mousedown.prevent
                    />
                  </template>
                </v-combobox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn rounded="lg" variant="text" @click="productDialog = false">Cancel</v-btn>
          <v-btn
            color="teal-darken-1"
            :loading="saving"
            rounded="lg"
            variant="flat"
            @click="saveProductDraft"
          >
            {{ editProductId ? 'Update' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="catalogOptionDialog" max-width="460">
      <v-card rounded="lg">
        <v-card-title>{{ catalogOptionDialogTitle }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="catalogOptionInput"
            autofocus
            density="comfortable"
            :label="catalogOptionInputLabel"
            variant="outlined"
            @keyup.enter="saveCatalogOption"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn rounded="lg" variant="text" @click="catalogOptionDialog = false">Cancel</v-btn>
          <v-btn
            color="teal-darken-1"
            :loading="catalogOptionSaving"
            rounded="lg"
            variant="flat"
            @click="saveCatalogOption"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { safeDisplayImageUrl, safeDisplayImageUrls } from '@/utils/images'
  import {
    createUserAdminProduct,
    deleteUserAdminProduct,
    fetchUserAdminProducts,
    fetchUserAdminProfile,
    fetchUserAdminReviews,
    updateUserAdminProduct
  } from '@/utils/userAdmin'

  const EMPTY_FORM = {
    name: '',
    company: '',
    category: '',
    subcategory: '',
    description: '',
    image_url: '',
    image_urls: [],
    price: 0,
    price_currency: 'USD',
    stock: 0
  }

  const DEFAULT_PRICE_CURRENCY = 'USD'
  const MAX_PRODUCT_IMAGE_FILE_BYTES = 512 * 1024
  const MAX_PRODUCT_IMAGE_DATA_URL_LENGTH = 700_000
  const MAX_PRODUCT_IMAGE_COUNT = 6
  const DESCRIPTION_BULLET_OPTIONS = [
    { symbol: '-', label: 'Add dash bullet' },
    { symbol: '•', label: 'Add dot bullet' },
    { symbol: '>', label: 'Add angle bullet' }
  ]
  const PRICE_CURRENCY_OPTIONS = [
    { title: 'United States (USD)', value: 'USD' },
    { title: 'India (INR)', value: 'INR' },
    { title: 'United Kingdom (GBP)', value: 'GBP' },
    { title: 'Europe (EUR)', value: 'EUR' }
  ]

  const productHeaders = [
    { title: 'Product', key: 'name' },
    { title: 'Price', key: 'price' },
    { title: 'Stock', key: 'stock' },
    { title: 'Actions', key: 'actions', sortable: false }
  ]

  const userAdminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'mdi-view-dashboard-outline' },
    { id: 'products', label: 'Products', icon: 'mdi-package-variant-closed' },
    { id: 'reviews', label: 'Reviews', icon: 'mdi-message-star-outline' }
  ]

  function normalizeText(value, maxLength = 5000) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength)
  }

  function normalizeCategoryName(value) {
    return normalizeText(value, 80)
  }

  function normalizeSubcategoryName(category, subcategory) {
    return normalizeCategoryName(category) ? normalizeText(subcategory, 80) : ''
  }

  function normalizeProductCurrency(value) {
    const normalized = String(value || '').trim().toUpperCase()
    return PRICE_CURRENCY_OPTIONS.some((option) => option.value === normalized)
      ? normalized
      : DEFAULT_PRICE_CURRENCY
  }

  export default {
    name: 'UserAdmin',
    components: {
      BaseAlert
    },
    setup() {
      const appStore = useAppStore()
      const router = useRouter()
      const loading = ref(false)
      const saving = ref(false)
      const activePanel = ref('dashboard')
      const profile = ref({})
      const products = ref([])
      const reviews = ref([])
      const productSearch = ref('')
      const productForm = ref({ ...EMPTY_FORM })
      const productImageFiles = ref([])
      const productImageInputValue = ref('')
      const productDialog = ref(false)
      const editProductId = ref('')
      const catalogOptionDialog = ref(false)
      const catalogOptionType = ref('category')
      const catalogOptionInput = ref('')
      const catalogOptionSaving = ref(false)
      const reviewsLoading = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')

      const priceCurrencyOptions = PRICE_CURRENCY_OPTIONS
      const descriptionBulletOptions = DESCRIPTION_BULLET_OPTIONS

      const hasPinAccess = computed(() =>
        Boolean(profile.value?.has_pin_access)
      )

      const selectedPriceCurrency = computed(() => normalizeProductCurrency(productForm.value.price_currency))

      const productImageGallery = computed(() =>
        safeDisplayImageUrls(productForm.value.image_urls, productForm.value.image_url).slice(0, MAX_PRODUCT_IMAGE_COUNT)
      )

      const categoryOptions = computed(() => {
        const categories = new Set(
          products.value
            .map((product) => normalizeCategoryName(product.category))
            .filter(Boolean)
        )
        const currentCategory = normalizeCategoryName(productForm.value.category)
        if (currentCategory) {
          categories.add(currentCategory)
        }
        return [...categories].toSorted((left, right) => left.localeCompare(right))
      })

      const availableSubcategories = computed(() => {
        const selectedCategory = normalizeCategoryName(productForm.value.category)
        if (!selectedCategory) {
          return []
        }
        const subcategories = new Set(
          products.value
            .filter((product) => normalizeCategoryName(product.category) === selectedCategory)
            .map((product) => normalizeSubcategoryName(selectedCategory, product.subcategory))
            .filter(Boolean)
        )
        const currentSubcategory = normalizeSubcategoryName(selectedCategory, productForm.value.subcategory)
        if (currentSubcategory) {
          subcategories.add(currentSubcategory)
        }
        return [...subcategories].toSorted((left, right) => left.localeCompare(right))
      })

      const catalogOptionDialogTitle = computed(() =>
        catalogOptionType.value === 'subcategory' ? 'Add Subcategory' : 'Add Category'
      )

      const catalogOptionInputLabel = computed(() =>
        catalogOptionType.value === 'subcategory' ? 'Subcategory name' : 'Category name'
      )

      const filteredProducts = computed(() => {
        const query = String(productSearch.value || '').trim().toLowerCase()
        if (!query) {
          return products.value
        }
        return products.value.filter((product) =>
          [product.name, product.company, product.category, product.subcategory, product.description]
            .join(' ')
            .toLowerCase()
            .includes(query)
        )
      })

      const lowStockCount = computed(() =>
        products.value.filter((product) => Number(product.stock || 0) < 5).length
      )

      const productsWithImagesCount = computed(() =>
        products.value.filter((product) => safeDisplayImageUrls(product.image_urls, product.image_url).length > 0).length
      )

      const totalInventoryValue = computed(() =>
        products.value.reduce((total, product) => {
          const price = Number(product.price_amount || product.price || 0)
          const stock = Math.max(0, Math.trunc(Number(product.stock || 0)))
          return total + price * stock
        }, 0)
      )

      const categoryStats = computed(() => {
        const totalProducts = products.value.length
        const stats = new Map()
        for (const product of products.value) {
          const category = normalizeCategoryName(product.category) || 'Other'
          const existing = stats.get(category) || { name: category, count: 0, percent: 0 }
          existing.count += 1
          stats.set(category, existing)
        }
        return [...stats.values()]
          .map((item) => ({
            ...item,
            percent: totalProducts > 0 ? Math.round((item.count / totalProducts) * 100) : 0
          }))
          .toSorted((left, right) => right.count - left.count)
          .slice(0, 6)
      })

      const topValueProducts = computed(() =>
        products.value
          .map((product) => ({
            ...product,
            shelf_value: Number(product.price_amount || product.price || 0) * Math.max(0, Math.trunc(Number(product.stock || 0)))
          }))
          .toSorted((left, right) => right.shelf_value - left.shelf_value)
          .slice(0, 5)
      )

      const metrics = computed(() => [
        {
          label: 'Products',
          value: products.value.length,
          icon: 'mdi-package-variant-closed',
          color: 'teal-darken-1'
        },
        {
          label: 'Total stock',
          value: products.value.reduce((total, product) => total + Number(product.stock || 0), 0),
          icon: 'mdi-archive-outline',
          color: 'primary'
        },
        {
          label: 'PIN',
          value: 'Unlocked',
          icon: 'mdi-lock-check-outline',
          color: 'success'
        },
        {
          label: 'Reviews',
          value: reviews.value.length,
          icon: 'mdi-message-star-outline',
          color: 'info'
        }
      ])

      const showMessage = (message, color = 'success') => {
        snackbarText.value = message
        snackbarColor.value = color
        snackbar.value = true
      }

      const resolveItem = (item) => item?.raw || item || {}

      const syncPrimaryProductImage = () => {
        productForm.value.image_url = productForm.value.image_urls[0] || ''
      }

      const splitProductImageInput = (value) =>
        String(value || '')
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean)

      const updateProductImageUrls = (value) => {
        productImageInputValue.value = String(value || '')
        const urls = splitProductImageInput(productImageInputValue.value)
        const existingDataImages = productForm.value.image_urls.filter((imageUrl) => imageUrl.startsWith('data:image/'))
        productForm.value.image_urls = safeDisplayImageUrls([...existingDataImages, ...urls]).slice(0, MAX_PRODUCT_IMAGE_COUNT)
        syncPrimaryProductImage()
      }

      const resolveSelectedImageFiles = (value) => {
        if (Array.isArray(value)) {
          return value.filter(Boolean)
        }
        if (typeof FileList !== 'undefined' && value instanceof FileList) {
          return Array.from(value)
        }
        if (typeof File !== 'undefined' && value instanceof File) {
          return [value]
        }
        if (typeof File !== 'undefined') {
          const wrappedFile = value?.file || value?.raw || value?.rawFile
          if (wrappedFile instanceof File) {
            return [wrappedFile]
          }
        }
        return value?.target?.files ? Array.from(value.target.files) : []
      }

      const clearProductImageFiles = () => {
        productImageFiles.value = []
      }

      const removeProductImage = (index) => {
        productForm.value.image_urls = productForm.value.image_urls.filter((_, imageIndex) => imageIndex !== index)
        syncPrimaryProductImage()
        productImageInputValue.value = productForm.value.image_urls
          .filter((imageUrl) => imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
          .join('\n')
      }

      const readImageFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.addEventListener('load', () => resolve(String(reader.result || '')))
          reader.addEventListener('error', () => reject(new Error('Unable to read image file')))
          reader.readAsDataURL(file)
        })

      const onProductImagesSelected = async (value) => {
        const files = resolveSelectedImageFiles(value)
        if (files.length === 0) {
          clearProductImageFiles()
          return
        }

        const availableSlots = MAX_PRODUCT_IMAGE_COUNT - productForm.value.image_urls.length
        if (availableSlots <= 0) {
          clearProductImageFiles()
          showMessage(`Maximum ${MAX_PRODUCT_IMAGE_COUNT} images allowed`, 'warning')
          return
        }

        const selectedFiles = files.slice(0, availableSlots)
        if (files.length > availableSlots) {
          showMessage(`Only ${availableSlots} more image${availableSlots === 1 ? '' : 's'} can be added`, 'warning')
        }

        const validFiles = selectedFiles.filter((file) => {
          if (!file.type?.startsWith('image/')) {
            showMessage('Please choose image files only', 'warning')
            return false
          }
          if (file.size > MAX_PRODUCT_IMAGE_FILE_BYTES) {
            showMessage('Each image must be 512KB or smaller.', 'warning')
            return false
          }
          return true
        })

        if (validFiles.length === 0) {
          clearProductImageFiles()
          return
        }

        try {
          const results = await Promise.all(validFiles.map((file) => readImageFileAsDataUrl(file)))
          const safeImages = results.filter((result) => (
            result.startsWith('data:image/') &&
            result.length <= MAX_PRODUCT_IMAGE_DATA_URL_LENGTH &&
            Boolean(safeDisplayImageUrl(result))
          ))
          if (safeImages.length !== results.length) {
            showMessage('One or more selected images are unsupported or too large', 'warning')
          }
          productForm.value.image_urls = safeDisplayImageUrls([...productForm.value.image_urls, ...safeImages]).slice(0, MAX_PRODUCT_IMAGE_COUNT)
          syncPrimaryProductImage()
          productImageFiles.value = []
        } catch {
          clearProductImageFiles()
          showMessage('Unable to read one or more image files', 'error')
        }
      }

      const addDescriptionBullet = (symbol) => {
        const bullet = DESCRIPTION_BULLET_OPTIONS.some((option) => option.symbol === symbol) ? symbol : '-'
        const currentDescription = String(productForm.value.description || '').trimEnd()
        productForm.value.description = currentDescription ? `${currentDescription}\n${bullet} ` : `${bullet} `
      }

      const openCatalogOptionDialog = (type) => {
        if (type === 'subcategory' && !normalizeCategoryName(productForm.value.category)) {
          showMessage('Select a category first', 'warning')
          return
        }
        catalogOptionType.value = type === 'subcategory' ? 'subcategory' : 'category'
        catalogOptionInput.value = ''
        catalogOptionDialog.value = true
      }

      const saveCatalogOption = () => {
        const value = normalizeCategoryName(catalogOptionInput.value)
        if (!value) {
          showMessage(`${catalogOptionInputLabel.value} is required`, 'warning')
          return
        }

        if (catalogOptionType.value === 'subcategory') {
          const category = normalizeCategoryName(productForm.value.category)
          if (!category) {
            showMessage('Category is required', 'warning')
            return
          }
          productForm.value.subcategory = normalizeSubcategoryName(category, value)
        } else {
          productForm.value.category = value
          productForm.value.subcategory = ''
        }
        catalogOptionDialog.value = false
        showMessage(catalogOptionType.value === 'subcategory' ? 'Subcategory added' : 'Category added')
      }

      const resetForm = () => {
        productImageFiles.value = []
        productImageInputValue.value = ''
        productForm.value = { ...EMPTY_FORM, image_urls: [] }
        editProductId.value = ''
      }

      const openAddDialog = () => {
        resetForm()
        productDialog.value = true
      }

      const loadConsole = async () => {
        if (appStore.loading) {
          return
        }
        if (!appStore.isAuthenticated) {
          await router.push('/login')
          return
        }

        loading.value = true
        reviewsLoading.value = true
        try {
          profile.value = await fetchUserAdminProfile()
          if (profile.value?.has_pin_access) {
            const [nextProducts, nextReviews] = await Promise.all([
              fetchUserAdminProducts(),
              fetchUserAdminReviews()
            ])
            products.value = nextProducts
            reviews.value = nextReviews
          } else {
            products.value = []
            reviews.value = []
          }
        } catch (error) {
          if (error?.response?.status === 401) {
            await router.push('/login')
            return
          }
          if (error?.response?.status === 403) {
            products.value = []
            reviews.value = []
            showMessage('User Admin PIN required from Profile.', 'warning')
            return
          }
          console.error('Failed to load user admin:', error)
          showMessage(error?.response?.data?.message || 'Failed to load user admin', 'error')
        } finally {
          loading.value = false
          reviewsLoading.value = false
        }
      }

      const buildProductDraftPayload = () => {
        const priceCurrency = normalizeProductCurrency(productForm.value.price_currency)
        const priceAmount = Number(productForm.value.price)
        const stock = Math.max(0, Math.trunc(Number(productForm.value.stock)))
        const manualImageUrls = splitProductImageInput(productImageInputValue.value)
        const safeManualImageUrls = safeDisplayImageUrls(manualImageUrls)
        const imageUrls = safeDisplayImageUrls(productForm.value.image_urls, productForm.value.image_url).slice(0, MAX_PRODUCT_IMAGE_COUNT)
        const payload = {
          name: normalizeText(productForm.value.name, 120),
          company: normalizeText(productForm.value.company, 80),
          description: normalizeText(productForm.value.description, 5000),
          category: normalizeCategoryName(productForm.value.category),
          subcategory: normalizeSubcategoryName(productForm.value.category, productForm.value.subcategory),
          image_url: imageUrls[0] || '',
          image_urls: imageUrls,
          price: priceAmount,
          price_amount: priceAmount,
          price_currency: priceCurrency,
          currency: priceCurrency,
          stock
        }

        if (!payload.name) return { error: 'Product name is required' }
        if (!payload.category) return { error: 'Category is required' }
        if (!Number.isFinite(payload.price) || payload.price < 0) return { error: 'Price must be valid' }
        if (!Number.isFinite(payload.stock) || payload.stock < 0) return { error: 'Stock must be valid' }
        if (manualImageUrls.length > MAX_PRODUCT_IMAGE_COUNT) return { error: `Maximum ${MAX_PRODUCT_IMAGE_COUNT} images allowed` }
        if (manualImageUrls.length !== safeManualImageUrls.length) return { error: 'Every image URL must be valid' }
        if (payload.image_urls.length === 0) return { error: 'At least one product image is required' }

        return { payload }
      }

      const saveProductDraft = async () => {
        const { payload, error } = buildProductDraftPayload()
        if (error) {
          showMessage(error, 'warning')
          return
        }

        saving.value = true
        try {
          if (editProductId.value) {
            await updateUserAdminProduct(editProductId.value, payload)
            showMessage('Product draft updated')
          } else {
            await createUserAdminProduct(payload)
            showMessage('Product draft added')
          }
          resetForm()
          productDialog.value = false
          products.value = await fetchUserAdminProducts()
        } catch (error) {
          console.error('Failed to save product draft:', error)
          showMessage(error?.response?.data?.message || 'Failed to save product draft', 'error')
        } finally {
          saving.value = false
        }
      }

      const editProduct = (product) => {
        if (!product?.product_id) {
          showMessage('Product id not found.', 'error')
          return
        }
        editProductId.value = product.product_id
        productImageFiles.value = []
        const productImages = safeDisplayImageUrls(product.image_urls, product.image_url)
        productImageInputValue.value = productImages
          .filter((imageUrl) => !imageUrl.startsWith('data:image/'))
          .join('\n')
        productForm.value = {
          name: product.name || '',
          company: product.company || '',
          category: normalizeCategoryName(product.category),
          subcategory: normalizeSubcategoryName(product.category, product.subcategory),
          description: product.description || '',
          image_url: productImages[0] || '',
          image_urls: productImages,
          price: Number(product.price || product.price_amount || 0),
          price_currency: product.price_currency || product.currency || 'USD',
          stock: Number(product.stock || 0)
        }
        productDialog.value = true
      }

      const cancelEdit = () => {
        resetForm()
        productDialog.value = false
      }

      const removeProduct = async (product) => {
        if (!product?.product_id) {
          return
        }
        saving.value = true
        try {
          await deleteUserAdminProduct(product.product_id)
          products.value = products.value.filter((item) => item.product_id !== product.product_id)
          if (editProductId.value === product.product_id) {
            resetForm()
          }
          showMessage('Product draft removed')
        } catch (error) {
          console.error('Failed to remove product draft:', error)
          showMessage(error?.response?.data?.message || 'Failed to remove product draft', 'error')
        } finally {
          saving.value = false
        }
      }

      const formatDraftPrice = (product) => {
        const currency = product.price_currency || product.currency || 'USD'
        const price = Number(product.price_amount || product.price || 0)
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency
        }).format(price)
      }

      const draftImageUrl = (product) => safeDisplayImageUrls(product?.image_urls, product?.image_url)[0] || ''

      const formatMoney = (value, currency = DEFAULT_PRICE_CURRENCY) => new Intl.NumberFormat('en-US', {
        currency,
        style: 'currency'
      }).format(Number(value || 0))

      const formatReviewDate = (value) => {
        if (!value) {
          return 'Just now'
        }
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          return 'Recently'
        }
        return new Intl.DateTimeFormat('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).format(date)
      }

      const formatDraftCategory = (product) => {
        const category = normalizeCategoryName(product?.category) || 'Other'
        const subcategory = normalizeSubcategoryName(category, product?.subcategory)
        return subcategory ? `${category} / ${subcategory}` : category
      }

      watch(
        () => [appStore.loading, appStore.isAuthenticated],
        () => {
          void loadConsole()
        },
        { immediate: true }
      )

      watch(
        () => productForm.value.category,
        (category) => {
          const normalizedCategory = normalizeCategoryName(category)
          if (normalizedCategory !== category) {
            productForm.value.category = normalizedCategory
          }
          if (!normalizedCategory) {
            productForm.value.subcategory = ''
          }
        }
      )

      onMounted(() => {
        void loadConsole()
      })

      return {
        appStore,
        loading,
        saving,
        activePanel,
        profile,
        products,
        reviews,
        productSearch,
        productForm,
        productImageFiles,
        productImageInputValue,
        productImageGallery,
        productDialog,
        editProductId,
        catalogOptionDialog,
        catalogOptionDialogTitle,
        catalogOptionInput,
        catalogOptionInputLabel,
        catalogOptionSaving,
        reviewsLoading,
        snackbar,
        snackbarText,
        snackbarColor,
        priceCurrencyOptions,
        descriptionBulletOptions,
        userAdminNavItems,
        productHeaders,
        selectedPriceCurrency,
        categoryOptions,
        availableSubcategories,
        hasPinAccess,
        filteredProducts,
        lowStockCount,
        productsWithImagesCount,
        totalInventoryValue,
        categoryStats,
        topValueProducts,
        metrics,
        loadConsole,
        openAddDialog,
        saveProductDraft,
        editProduct,
        cancelEdit,
        removeProduct,
        clearProductImageFiles,
        onProductImagesSelected,
        updateProductImageUrls,
        removeProductImage,
        addDescriptionBullet,
        normalizeCategoryName,
        openCatalogOptionDialog,
        saveCatalogOption,
        resolveItem,
        formatDraftPrice,
        formatMoney,
        formatReviewDate,
        draftImageUrl,
        formatDraftCategory
      }
    }
  }
</script>

<style scoped>
.user-admin-page {
  min-height: 100vh;
  background: #f5f7fa;
}
</style>
