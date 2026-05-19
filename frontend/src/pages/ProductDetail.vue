<template>
  <v-container class="py-4 py-md-6" fluid>
    <v-row v-if="loading" dense>
      <v-col cols="12" md="5">
        <v-skeleton-loader class="rounded-xl" height="460" type="image" />
      </v-col>
      <v-col cols="12" md="7">
        <v-skeleton-loader class="rounded-xl" type="article, list-item-three-line, actions" />
      </v-col>
    </v-row>

    <template v-else-if="product">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
        <div class="d-flex align-center flex-wrap justify-end ga-2">
          <v-chip color="teal-darken-1" size="small" variant="tonal">
            {{ categoryLabel }}
          </v-chip>
          <v-chip
            :color="stockReady ? 'success' : 'error'"
            prepend-icon="mdi-circle"
            size="small"
            variant="tonal"
          >
            {{ stockText }}
          </v-chip>
        </div>
      </div>

      <v-row dense>
        <v-col cols="12" lg="5">
          <v-card border rounded="xl" variant="flat">
            <v-sheet class="pa-3 pa-md-4" color="grey-lighten-5" rounded="xl">
              <v-carousel
                v-if="productImageUrls.length > 0"
                height="auto"
                :hide-delimiters="productImageUrls.length <= 1"
                :show-arrows="productImageUrls.length > 1 ? 'hover' : false"
              >
                <v-carousel-item
                  v-for="(imageUrl, index) in productImageUrls"
                  :key="`${imageUrl}-${index}`"
                >
                  <v-img
                    :alt="`${product.name} image ${index + 1}`"
                    aspect-ratio="1"
                    cover
                    decoding="async"
                    :fetchpriority="index === 0 ? 'high' : 'auto'"
                    :loading="index === 0 ? 'eager' : 'lazy'"
                    max-height="440"
                    sizes="(max-width: 768px) 100vw, 42vw"
                    :src="imageUrl"
                    @click="openImageDialog(index)"
                  />
                </v-carousel-item>
              </v-carousel>
              <v-sheet
                v-else
                class="d-flex align-center justify-center"
                color="grey-lighten-4"
                height="380"
                rounded="lg"
              >
                <v-icon color="primary" size="56">mdi-image-off-outline</v-icon>
              </v-sheet>
            </v-sheet>
          </v-card>

          <v-row class="mt-3" dense>
            <v-col
              v-for="panel in visualPanels"
              :key="panel.title"
              cols="12"
              md="4"
            >
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-text class="pa-3">
                  <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">
                    {{ panel.title }}
                  </p>
                  <p class="text-body-2 font-weight-medium mb-0">{{ panel.value }}</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>

        <v-col cols="12" lg="7">
          <v-card border rounded="xl" variant="flat">
            <v-card-text class="pa-4 pa-md-6">
              <div class="d-flex align-center flex-wrap ga-2">
                <span class="text-caption text-medium-emphasis">Inclusive of all taxes</span>
                <v-divider vertical />
                <span class="text-caption text-medium-emphasis">Curated by Mindstores</span>
              </div>

              <h1 class="text-h5 text-md-h4 font-weight-bold mt-3 mb-3 text-break">
                {{ product.name }}
              </h1>

              <div class="d-flex align-center flex-wrap ga-3">
                <p class="text-h5 text-md-h4 font-weight-bold mb-0">{{ formattedPrice }}</p>

                <v-chip color="amber-lighten-5" size="small" variant="flat">
                  <v-icon color="amber-darken-2" start>mdi-star</v-icon>
                  {{ ratingLabel }}
                </v-chip>

                <span class="text-body-2 text-medium-emphasis">
                  {{ reviewCount }} reviews
                </span>
              </div>

              <div class="d-flex align-center ga-1 mt-3">
                <v-icon
                  v-for="(filled, index) in ratingStars"
                  :key="index"
                  :color="filled ? 'amber-darken-2' : 'grey-lighten-1'"
                  size="18"
                >
                  {{ filled ? 'mdi-star' : 'mdi-star-outline' }}
                </v-icon>
              </div>

              <v-divider class="my-5" />

              <div class="d-flex flex-wrap ga-2 mb-5">
                <v-chip
                  v-for="chip in trustChips"
                  :key="chip.label"
                  :prepend-icon="chip.icon"
                  size="small"
                  variant="outlined"
                >
                  {{ chip.label }}
                </v-chip>
              </div>

              <v-card color="grey-lighten-5" rounded="lg" variant="flat">
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                    <div>
                      <p class="text-body-2 font-weight-medium mb-1">Quantity</p>
                      <p class="text-caption text-medium-emphasis mb-0">{{ stockText }}</p>
                    </div>

                    <div class="d-flex align-center ga-2">
                      <v-btn
                        density="comfortable"
                        :disabled="quantity <= 1"
                        icon="mdi-minus"
                        size="small"
                        variant="outlined"
                        @click="decreaseQuantity"
                      />
                      <v-chip class="px-5" variant="outlined">Qty {{ quantity }}</v-chip>
                      <v-btn
                        density="comfortable"
                        :disabled="!stockReady || quantity >= product.stock"
                        icon="mdi-plus"
                        size="small"
                        variant="outlined"
                        @click="increaseQuantity"
                      />
                    </div>
                  </div>

                  <div class="d-flex flex-column flex-sm-row ga-3 mt-4">
                    <v-btn
                      class="flex-grow-1"
                      color="teal-darken-1"
                      :disabled="!stockReady"
                      prepend-icon="mdi-cart"
                      rounded="lg"
                      size="large"
                      variant="flat"
                      @click="addToCart"
                    >
                      {{ stockReady ? 'Add to Cart' : 'Sold Out' }}
                    </v-btn>

                    <v-btn
                      class="flex-grow-1"
                      color="primary"
                      :disabled="!stockReady"
                      prepend-icon="mdi-lightning-bolt"
                      rounded="lg"
                      size="large"
                      variant="tonal"
                      @click="buyNow"
                    >
                      Buy Now
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="8">
          <v-card border rounded="xl" variant="flat">
            <v-card-title class="text-subtitle-1 font-weight-bold">Product Details</v-card-title>
            <v-divider />
            <v-card-text>
              <div class="d-flex flex-column ga-2">
                <p
                  v-for="(line, index) in visibleDescriptionLines"
                  :key="`${line}-${index}`"
                  class="text-body-2 text-medium-emphasis mb-0"
                >
                  {{ line }}
                </p>
              </div>
              <v-btn
                v-if="showSeeMore"
                class="px-0 mt-2"
                color="teal-darken-1"
                size="small"
                variant="plain"
                @click="toggleDescription"
              >
                {{ isTruncated ? 'See more' : 'See less' }}
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card border class="h-100" rounded="xl" variant="flat">
            <v-card-title class="text-subtitle-1 font-weight-bold">Service Promise</v-card-title>
            <v-divider />
            <v-list lines="three">
              <template
                v-for="(detail, index) in atelierDetails"
                :key="detail.title"
              >
                <v-list-item :title="detail.title">
                  <template #subtitle>
                    <span class="text-body-2 text-medium-emphasis">{{ detail.copy }}</span>
                  </template>
                </v-list-item>
                <v-divider v-if="index < atelierDetails.length - 1" />
              </template>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-row v-else justify="center">
      <v-col cols="12" md="7">
        <v-card class="pa-8 text-center" rounded="xl" variant="outlined">
          <v-icon color="primary" size="48">mdi-package-variant-remove</v-icon>
          <h2 class="text-h5 mt-3">Product not found</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">
            This product may have been moved or is temporarily unavailable.
          </p>
          <v-btn class="mt-4" color="teal-darken-1" rounded="lg" @click="router.push('/')">
            Back to Home
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <BaseAlert
    v-model="snackbar"
    floating
    :message="snackbarText"
    :timeout="2200"
    :type="snackbarColor"
  />

  <ProductImageDialog
    v-model="imageDialog"
    :alt="selectedImageName"
    :content-height="760"
    content-mode="custom"
    :content-width="980"
    :dialog-title="selectedImageName"
    hide-trigger
  >
    <v-carousel
      v-model="selectedImageIndex"
      class="h-100"
      height="100%"
      :hide-delimiters="productImageUrls.length <= 1"
      :show-arrows="productImageUrls.length > 1 ? 'hover' : false"
    >
      <v-carousel-item
        v-for="(imageUrl, index) in productImageUrls"
        :key="`${imageUrl}-${index}`"
      >
        <v-img
          :alt="`${product.name} image ${index + 1}`"
          class="h-100"
          contain
          :src="imageUrl"
        />
      </v-carousel-item>
    </v-carousel>
  </ProductImageDialog>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import ProductImageDialog from '@/components/ProductImageDialog.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { useCurrency } from '@/utils/currency'
  import { safeDisplayImageUrls } from '@/utils/images'
  import { PRODUCTS_CACHE_INVALIDATED_EVENT } from '@/utils/productCache'
  import { fetchProductDetail } from '@/utils/products'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const cartStore = useCartStore()
  const { formatAmount } = useCurrency()

  const loading = ref(false)
  const product = ref(null)
  const quantity = ref(1)
  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')
  const imageDialog = ref(false)
  const selectedImageIndex = ref(0)

  const fallbackDescription = 'A design-first piece crafted to blend visual calm with daily utility.'
  const productImageUrls = computed(() => safeDisplayImageUrls(product.value?.image_urls, product.value?.image_url))

  // Description truncation logic
  const isTruncated = ref(true)
  const LINES_THRESHOLD = 4
  const CHARS_PER_LINE = 120

  const fullDescription = computed(() => {
    return product.value?.description || fallbackDescription
  })

  const truncatedDescription = computed(() => {
    const text = fullDescription.value
    const maxChars = LINES_THRESHOLD * CHARS_PER_LINE
    if (text.length <= maxChars) return text
    return text.slice(0, maxChars).trim() + '...'
  })

  const showSeeMore = computed(() => {
    return fullDescription.value.length > (LINES_THRESHOLD * CHARS_PER_LINE)
  })

  const visibleDescriptionLines = computed(() => {
    const description = isTruncated.value ? truncatedDescription.value : fullDescription.value
    return description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  })

  function toggleDescription() {
    isTruncated.value = !isTruncated.value
  }

  function getImageName(imageUrl, index) {
    try {
      const pathName = new URL(imageUrl).pathname
      const fileName = pathName.split('/').findLast((segment) => segment.length > 0)
      if (fileName) {
        return decodeURIComponent(fileName)
      }
    } catch {
      const fallbackName = String(imageUrl || '').split('/').findLast((segment) => segment.length > 0)
      if (fallbackName) {
        return fallbackName.split('?')[0]
      }
    }

    return `${product.value?.name || 'Product'} image ${index + 1}`
  }

  const selectedImageName = computed(() => {
    const imageUrl = productImageUrls.value[selectedImageIndex.value]
    if (!imageUrl) {
      return product.value?.name || 'Product image'
    }

    return getImageName(imageUrl, selectedImageIndex.value)
  })

  function openImageDialog(index) {
    selectedImageIndex.value = index
    imageDialog.value = true
  }

  const formattedPrice = computed(() => {
    const price = Number(product.value?.price || 0)
    return formatAmount(price)
  })

  const categoryLabel = computed(() => {
    const value = String(product.value?.category || 'Curated Collection').trim()
    return value.length > 0 ? value.toUpperCase() : 'CURATED COLLECTION'
  })

  function stableProductSeed(value) {
    const text = String(value || '')
    let hash = 0
    for (const character of text) {
      hash = ((hash * 31) + character.codePointAt(0)) >>> 0
    }
    return hash
  }

  const ratingScore = computed(() => {
    const seed = stableProductSeed(product.value?.product_id || route.params.id || '')
    const score = 4.1 + ((seed % 7) / 10)
    return Math.min(score, 4.9)
  })

  const ratingLabel = computed(() => ratingScore.value.toFixed(1))

  const ratingStars = computed(() => {
    const filledCount = Math.round(ratingScore.value)
    return Array.from({ length: 5 }, (_, index) => index < filledCount)
  })

  const reviewCount = computed(() => {
    const seed = stableProductSeed(product.value?.product_id || route.params.id || '')
    return 148 + (seed % 91)
  })

  const stockReady = computed(() => Number(product.value?.stock || 0) > 0)

  const stockText = computed(() => {
    const stock = Number(product.value?.stock || 0)
    if (stock <= 0) return 'Currently unavailable'
    if (stock <= 5) return `Only ${stock} pieces left`
    return `${stock} pieces ready to ship`
  })

  const materialLabel = computed(() => {
    const category = String(product.value?.category || '').toLowerCase()
    if (category.includes('furniture')) return 'Premium engineered wood'
    if (category.includes('electronics')) return 'Precision electronic finish'
    if (category.includes('clothing')) return 'Soft premium fabric blend'
    return 'Handpicked premium materials'
  })

  const visualPanels = computed(() => {
    return [
      { title: 'Material', value: materialLabel.value },
      { title: 'Dispatch', value: stockReady.value ? 'Within 24 hours' : 'Restock in progress' },
      { title: 'Returns', value: '30-day easy return' },
    ]
  })

  const trustChips = computed(() => {
    const chips = [
      { icon: 'mdi-shield-check', label: 'Quality checked' },
      { icon: 'mdi-truck-fast-outline', label: 'Tracked shipping' },
      { icon: 'mdi-credit-card-check-outline', label: 'Secure checkout' },
      { icon: 'mdi-refresh-circle', label: 'Easy returns' },
    ]

    if (stockReady.value) {
      chips.unshift({ icon: 'mdi-clock-fast', label: 'Priority dispatch' })
    }

    return chips.slice(0, 4)
  })

  const atelierDetails = computed(() => {
    const category = String(product.value?.category || 'Collection').trim()

    return [
      {
        title: 'Curated Build',
        copy: `Each ${category.toLowerCase()} item is selected for long-term everyday use and visual harmony.`
      },
      {
        title: 'Refined Experience',
        copy: 'Protective packaging, quality checks, and smooth post-purchase support are standard with every order.'
      },
      {
        title: 'Mindstore Promise',
        copy: 'Transparent details, fast fulfillment, and reliable after-sales service with no hidden surprises.'
      },
    ]
  })

  async function fetchProduct(productId = route.params.id) {
    loading.value = true
    try {
      const response = await fetchProductDetail(productId)
      product.value = response.data
      quantity.value = 1
      imageDialog.value = false
      selectedImageIndex.value = 0
    } catch (error) {
      console.error('Failed to fetch product:', error)
      product.value = null
    } finally {
      loading.value = false
    }
  }

  function increaseQuantity() {
    const stock = Number(product.value?.stock || 0)
    if (stock > 0 && quantity.value < stock) {
      quantity.value += 1
    }
  }

  function decreaseQuantity() {
    if (quantity.value > 1) {
      quantity.value -= 1
    }
  }

  function goBack() {
    const historyState = window.history.state
    const hasInAppBack = typeof historyState?.back === 'string' && historyState.back.length > 0
    if (hasInAppBack) {
      router.go(-1)
      return
    }
    router.push('/')
  }

  async function addToCart() {
    if (!appStore.isAuthenticated) {
      router.push('/login')
      return
    }

    if (!product.value || !stockReady.value) {
      snackbarText.value = 'This product is currently unavailable.'
      snackbarColor.value = 'error'
      snackbar.value = true
      return
    }

    try {
      await cartStore.addToCart(product.value.product_id, quantity.value)
      snackbarText.value = 'Added to cart successfully'
      snackbarColor.value = 'success'
      snackbar.value = true
    } catch {
      snackbarText.value = 'Failed to add to cart'
      snackbarColor.value = 'error'
      snackbar.value = true
    }
  }

  async function buyNow() {
    if (!appStore.isAuthenticated) {
      router.push('/login')
      return
    }

    if (!product.value || !stockReady.value) {
      snackbarText.value = 'This product is currently unavailable.'
      snackbarColor.value = 'error'
      snackbar.value = true
      return
    }

    try {
      await cartStore.addToCart(product.value.product_id, quantity.value)
      router.push('/cart')
    } catch {
      snackbarText.value = 'Unable to start checkout right now'
      snackbarColor.value = 'error'
      snackbar.value = true
    }
  }

  watch(
    () => route.params.id,
    (nextId, previousId) => {
      if (nextId && nextId !== previousId) {
        fetchProduct(nextId)
      }
    }
  )

  function handleProductsInvalidated() {
    if (route.params.id) {
      fetchProduct(route.params.id)
    }
  }

  onMounted(() => {
    window.addEventListener(PRODUCTS_CACHE_INVALIDATED_EVENT, handleProductsInvalidated)
    fetchProduct()
  })

  onUnmounted(() => {
    window.removeEventListener(PRODUCTS_CACHE_INVALIDATED_EVENT, handleProductsInvalidated)
  })
</script>
