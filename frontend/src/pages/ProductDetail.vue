<template>
  <v-container class="bespoke-detail-container" fluid>
    <!-- LOADING STATE -->
    <v-row v-if="loading" dense>
      <v-col cols="12" md="5">
        <v-skeleton-loader class="rounded-0 border" height="460" type="image" />
      </v-col>
      <v-col cols="12" md="7">
        <v-skeleton-loader class="rounded-0 border" type="article, list-item-three-line, actions" />
      </v-col>
    </v-row>

    <!-- PRODUCT DISPLAY -->
    <template v-else-if="product">
      <!-- Minimalist navigation / category / status strip -->
      <div class="detail-header-bar">
        <button class="back-btn" @click="goBack">
          <v-icon class="mr-1" size="14">mdi-arrow-left</v-icon>
          <span>Back to Catalog</span>
          <span class="underline-hover" />
        </button>
        <div class="header-badges">
          <span class="badge-category">{{ categoryLabel }}</span>
          <span class="badge-stock" :class="{ 'badge-stock--out': !stockReady }">
            <span class="status-dot" />
            {{ stockText }}
          </span>
        </div>
      </div>

      <!-- Main Columns Grid -->
      <div class="bespoke-detail-grid">
        <!-- LEFT COLUMN: Image Gallery mock macOS Frame & specs -->
        <div class="detail-left-col">
          <div class="gallery-frame">
            <div class="frame-header">
              <div class="frame-dots">
                <span class="dot-red" />
                <span class="dot-yellow" />
                <span class="dot-green" />
              </div>
              <div class="frame-title-display">product_stage.json</div>
            </div>

            <div class="gallery-carousel-wrap">
              <v-carousel
                v-if="productImageUrls.length > 0"
                class="custom-carousel"
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
                    aspect-ratio="1.2"
                    class="gallery-image"
                    cover
                    decoding="async"
                    :fetchpriority="index === 0 ? 'high' : 'auto'"
                    :loading="index === 0 ? 'eager' : 'lazy'"
                    sizes="(max-width: 768px) 100vw, 42vw"
                    :src="imageUrl"
                    @click="openImageDialog(index)"
                  />
                </v-carousel-item>
              </v-carousel>
              <div
                v-else
                class="no-image-placeholder"
              >
                <v-icon color="grey-lighten-1" size="56">mdi-image-off-outline</v-icon>
                <span>No preview available</span>
              </div>
            </div>
          </div>

          <!-- Specs details panels -->
          <div class="specs-grid">
            <div
              v-for="panel in visualPanels"
              :key="panel.title"
              class="spec-card"
            >
              <span class="spec-label">{{ panel.title }}</span>
              <span class="spec-value">{{ panel.value }}</span>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Purchase & configuration stage -->
        <div class="detail-right-col">
          <div class="product-purchase-panel">
            <div class="panel-meta">
              <span class="meta-item">Inclusive of all taxes</span>
              <span class="meta-dot">•</span>
              <span class="meta-item">Curated by Mindstores</span>
            </div>

            <h1 class="product-title">{{ product.name }}</h1>

            <div class="pricing-rating-row">
              <div class="price-display">{{ formattedPrice }}</div>
              <div class="rating-summary">
                <span class="rating-badge">
                  <v-icon color="amber-darken-2" size="14" start>mdi-star</v-icon>
                  {{ ratingLabel }}
                </span>
                <span class="reviews-count-label">
                  {{ reviewCountLabel }}
                </span>
              </div>
            </div>

            <div class="star-rating-stars">
              <v-icon
                v-for="(filled, index) in ratingStars"
                :key="index"
                :color="filled ? 'amber-darken-2' : 'grey-lighten-2'"
                size="16"
              >
                {{ filled ? 'mdi-star' : 'mdi-star-outline' }}
              </v-icon>
            </div>

            <hr class="section-divider">

            <div class="trust-grid">
              <div
                v-for="chip in trustChips"
                :key="chip.label"
                class="trust-item"
              >
                <v-icon class="trust-item-icon" size="14">{{ chip.icon }}</v-icon>
                <span class="trust-item-text">{{ chip.label }}</span>
              </div>
            </div>

            <div class="action-box">
              <div class="qty-section">
                <div class="qty-info">
                  <span class="qty-label">Quantity</span>
                  <span class="qty-stock-status">{{ stockText }}</span>
                </div>
                <div class="qty-picker">
                  <button
                    aria-label="Decrease quantity"
                    class="qty-picker-btn"
                    :disabled="quantity <= 1"
                    @click="decreaseQuantity"
                  >
                    <v-icon size="12">mdi-minus</v-icon>
                  </button>
                  <span class="qty-picker-value">{{ quantity }}</span>
                  <button
                    aria-label="Increase quantity"
                    class="qty-picker-btn"
                    :disabled="!stockReady || quantity >= product.stock"
                    @click="increaseQuantity"
                  >
                    <v-icon size="12">mdi-plus</v-icon>
                  </button>
                </div>
              </div>

              <div class="action-buttons-group">
                <v-btn
                  class="action-btn-cart"
                  :disabled="!stockReady"
                  rounded="0"
                  size="large"
                  variant="flat"
                  @click="addToCart"
                >
                  <v-icon size="16" start>mdi-cart</v-icon>
                  {{ stockReady ? 'Add to Cart' : 'Sold Out' }}
                </v-btn>

                <v-btn
                  class="action-btn-buy"
                  :disabled="!stockReady"
                  rounded="0"
                  size="large"
                  variant="outlined"
                  @click="buyNow"
                >
                  <v-icon size="16" start>mdi-lightning-bolt</v-icon>
                  Buy Now
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECONDARY INFO GRID: Description & Service -->
      <div class="editorial-details-row">
        <div class="details-main-card">
          <h2 class="details-section-title">Product Details</h2>
          <div class="details-content-wrapper">
            <div class="description-lines">
              <p
                v-for="(line, index) in visibleDescriptionLines"
                :key="`${line}-${index}`"
                class="desc-line"
              >
                {{ line }}
              </p>
            </div>
            <button
              v-if="showSeeMore"
              class="see-more-toggle"
              @click="toggleDescription"
            >
              {{ isTruncated ? 'See more' : 'See less' }}
            </button>
          </div>
        </div>

        <div class="promise-sidebar-card">
          <h2 class="details-section-title">Service Promise</h2>
          <div class="promise-list">
            <div
              v-for="(detail, index) in atelierDetails"
              :key="detail.title"
              class="promise-list-item"
            >
              <h3 class="promise-item-title">{{ detail.title }}</h3>
              <p class="promise-item-copy">{{ detail.copy }}</p>
              <hr v-if="index < atelierDetails.length - 1" class="promise-item-divider">
            </div>
          </div>
        </div>
      </div>

      <!-- REVIEWS SECTION -->
      <div class="reviews-section-card">
        <div class="reviews-section-header">
          <div class="header-text-wrap">
            <h2 class="details-section-title">Customer Reviews</h2>
            <p class="section-subtitle-text">Shared by verified Mindstores customers.</p>
          </div>
          <span class="reviews-score-badge">
            <v-icon color="amber-darken-2" size="14" start>mdi-star</v-icon>
            <span>{{ ratingLabel }} · {{ reviewCountLabel }}</span>
          </span>
        </div>

        <hr class="section-divider">

        <div class="reviews-split-grid">
          <!-- LEFT SIDE: Rating Summary & Form -->
          <div class="reviews-form-panel">
            <div class="rating-hero-box">
              <div class="rating-hero-avatar">
                <v-icon color="amber-darken-2" icon="mdi-star" size="24" />
              </div>
              <div class="rating-hero-values">
                <span class="rating-hero-number">{{ ratingLabel }}</span>
                <span class="rating-hero-count">{{ reviewCountLabel }}</span>
              </div>
            </div>

            <div v-if="!appStore.isAuthenticated" class="login-prompt-box">
              <p class="login-prompt-text">Log in to share your experience with this item.</p>
              <v-btn
                class="login-redirect-btn"
                rounded="0"
                to="/login"
                variant="flat"
              >
                Log In
              </v-btn>
            </div>

            <v-form v-else class="review-submission-form" @submit.prevent="submitReview">
              <div class="form-rating-row">
                <span class="form-rating-label">Your Rating:</span>
                <v-rating
                  v-model="reviewForm.rating"
                  active-color="amber-darken-2"
                  color="grey-lighten-2"
                  density="comfortable"
                  hover
                  length="5"
                  size="28"
                />
              </div>

              <v-textarea
                v-model="reviewForm.comment"
                auto-grow
                bg-color="#ffffff"
                class="review-textarea-custom"
                counter
                density="comfortable"
                label="Write a review..."
                :maxlength="reviewCommentMaxLength"
                rows="3"
                variant="outlined"
              />

              <v-btn
                block
                class="save-review-btn"
                :disabled="!canSubmitReview"
                :loading="reviewSaving"
                rounded="0"
                type="submit"
                variant="flat"
              >
                <v-icon size="14" start>mdi-message-draw</v-icon>
                Submit Review
              </v-btn>
            </v-form>
          </div>

          <!-- RIGHT SIDE: Reviews Feed -->
          <div class="reviews-feed-panel">
            <v-progress-linear v-if="reviewsLoading" class="mb-4" color="teal-darken-2" indeterminate />

            <div v-else-if="reviews.length === 0" class="empty-reviews-state">
              <v-icon class="mb-2" color="grey-lighten-1" size="32">mdi-message-outline</v-icon>
              <p>No reviews written for this product yet.</p>
            </div>

            <div v-else class="reviews-list-wrapper">
              <div
                v-for="(review, index) in reviews"
                :key="review.review_id || `${review.created_at}-${index}`"
                class="review-feed-card"
              >
                <div class="review-card-header">
                  <div class="reviewer-avatar">
                    <span>{{ reviewerInitial(review) }}</span>
                  </div>
                  <div class="reviewer-meta-info">
                    <span class="reviewer-name">{{ review.reviewer_name || 'Mindstores User' }}</span>
                    <v-rating
                      active-color="amber-darken-2"
                      color="grey-lighten-2"
                      density="compact"
                      :model-value="Number(review.rating || 0)"
                      readonly
                      size="14"
                    />
                  </div>
                  <span class="review-date-badge">{{ formatReviewDate(review.created_at) }}</span>
                </div>
                <p class="review-card-comment">{{ review.comment }}</p>
                <hr v-if="index < reviews.length - 1" class="review-card-divider">
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="product-not-found-card">
      <v-icon color="grey-lighten-1" size="64">mdi-package-variant-remove</v-icon>
      <h2 class="not-found-title">Product not found</h2>
      <p class="not-found-text">This product may have been moved or is temporarily unavailable.</p>
      <v-btn
        class="not-found-btn"
        color="teal-darken-2"
        rounded="0"
        variant="flat"
        @click="router.push('/')"
      >
        Back to Home
      </v-btn>
    </div>
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
  import { createProductReview, fetchProductDetail, fetchProductReviews } from '@/utils/products'

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
  const reviews = ref([])
  const reviewsLoading = ref(false)
  const reviewSaving = ref(false)
  const reviewForm = ref({
    rating: 5,
    comment: ''
  })

  const fallbackDescription = 'A design-first piece crafted to blend visual calm with daily utility.'
  const reviewCommentMaxLength = 1000
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

  const ratingScore = computed(() => {
    if (reviews.value.length === 0) {
      return 0
    }
    const total = reviews.value.reduce((sum, review) => sum + Number(review.rating || 0), 0)
    return total / reviews.value.length
  })

  const ratingLabel = computed(() => ratingScore.value > 0 ? ratingScore.value.toFixed(1) : 'New')

  const ratingStars = computed(() => {
    const filledCount = Math.round(ratingScore.value)
    return Array.from({ length: 5 }, (_, index) => index < filledCount)
  })

  const reviewCount = computed(() => reviews.value.length)

  const reviewCountLabel = computed(() =>
    `${reviewCount.value} ${reviewCount.value === 1 ? 'review' : 'reviews'}`
  )

  const canSubmitReview = computed(() => {
    const rating = Number(reviewForm.value.rating || 0)
    const comment = String(reviewForm.value.comment || '').trim()
    return !reviewSaving.value && rating >= 1 && rating <= 5 && comment.length > 0
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
      await fetchReviews(product.value?.product_id || productId)
    } catch (error) {
      console.error('Failed to fetch product:', error)
      product.value = null
      reviews.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchReviews(productId = route.params.id) {
    const normalizedProductId = String(productId || '').trim()
    if (!normalizedProductId) {
      reviews.value = []
      return
    }

    reviewsLoading.value = true
    try {
      const response = await fetchProductReviews(normalizedProductId)
      reviews.value = Array.isArray(response.data?.items) ? response.data.items : []
    } catch (error) {
      console.error('Failed to fetch product reviews:', error)
      reviews.value = []
    } finally {
      reviewsLoading.value = false
    }
  }

  function reviewerInitial(review) {
    const name = String(review?.reviewer_name || 'M').trim()
    return (name[0] || 'M').toUpperCase()
  }

  function formatReviewDate(value) {
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

  async function submitReview() {
    if (!appStore.isAuthenticated) {
      await router.push('/login')
      return
    }

    const productId = product.value?.product_id || route.params.id
    const rating = Math.trunc(Number(reviewForm.value.rating || 0))
    const comment = String(reviewForm.value.comment || '').trim()
    if (!productId) {
      snackbarText.value = 'Product not found.'
      snackbarColor.value = 'error'
      snackbar.value = true
      return
    }
    if (rating < 1 || rating > 5) {
      snackbarText.value = 'Select a rating between 1 and 5.'
      snackbarColor.value = 'warning'
      snackbar.value = true
      return
    }
    if (!comment) {
      snackbarText.value = 'Write a review before saving.'
      snackbarColor.value = 'warning'
      snackbar.value = true
      return
    }

    reviewSaving.value = true
    try {
      const response = await createProductReview(productId, { rating, comment })
      const savedReview = response.data
      reviews.value = [savedReview, ...reviews.value].filter(Boolean)
      reviewForm.value = {
        rating: 5,
        comment: ''
      }
      snackbarText.value = 'Review saved'
      snackbarColor.value = 'success'
      snackbar.value = true
    } catch (error) {
      if (error?.response?.status === 401) {
        await router.push('/login')
        return
      }
      snackbarText.value = error?.response?.data?.message || 'Failed to save review'
      snackbarColor.value = 'error'
      snackbar.value = true
    } finally {
      reviewSaving.value = false
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

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.bespoke-detail-container {
  min-height: 100vh;
  background: #f8fafc;
  padding: 40px max(16px, 4vw) 80px !important;
}

/* ════════════════════════════════ HEADER BAR ══ */
.detail-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.back-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: color 0.2s ease;
}
.back-btn:hover {
  color: #0d9488;
}
.underline-hover {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transition: transform 0.25s ease;
  transform-origin: right;
  transform: scaleX(0);
}
.back-btn:hover .underline-hover {
  transform: scaleX(1);
  transform-origin: left;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 10px;
}
.badge-category {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0f766e;
  background: rgba(13, 148, 136, 0.08);
  padding: 4px 10px;
  border: 1px solid rgba(13, 148, 136, 0.15);
}
.badge-stock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #166534;
  background: rgba(22, 163, 74, 0.08);
  padding: 4px 10px;
  border: 1px solid rgba(22, 163, 74, 0.15);
}
.badge-stock--out {
  color: #991b1b;
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.15);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

/* ════════════════════════════════ CORE GRID ═══ */
.bespoke-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  align-items: start;
  margin-bottom: 48px;
}

/* ── LEFT COLUMN: Gallery Frame ── */
.detail-left-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gallery-frame {
  width: 100%;
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 6px 6px 0px #0f172a;
}
.frame-header {
  height: 36px;
  background: #f8fafc;
  border-bottom: 1px solid #0f172a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  position: relative;
}
.frame-dots {
  display: flex;
  gap: 6px;
}
.frame-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #0f172a;
  display: inline-block;
}
.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }

.frame-title-display {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.gallery-carousel-wrap {
  position: relative;
  background: #fafafa;
  padding: 16px;
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gallery-image {
  cursor: zoom-in;
  transition: transform 0.2s ease;
}
.gallery-image:hover {
  transform: scale(1.01);
}

.no-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
}

/* Custom indicators & arrows override */
.custom-carousel :deep(.v-window__container) {
  background: #fafafa;
}
.custom-carousel :deep(.v-carousel__controls) {
  background: transparent !important;
  color: #0f172a !important;
}
.custom-carousel :deep(.v-btn--icon.v-btn--density-default) {
  width: 32px;
  height: 32px;
  color: #0f172a;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.spec-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.spec-label {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.spec-value {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

/* ── RIGHT COLUMN: Purchase Panel ── */
.product-purchase-panel {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 6px 6px 0px #0f172a;
  padding: 32px;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.meta-item {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.meta-dot {
  font-size: 10px;
  color: #cbd5e1;
}

.product-title {
  font-size: clamp(20px, 3vw, 30px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin-bottom: 16px;
}

.pricing-rating-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
}
.price-display {
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.rating-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rating-badge {
  display: inline-flex;
  align-items: center;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  color: #d97706;
  font-size: 12px;
  font-weight: 800;
  padding: 2px 8px;
  gap: 4px;
}
.reviews-count-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.star-rating-stars {
  display: flex;
  gap: 2px;
  margin-bottom: 24px;
}

.section-divider {
  border: 0;
  height: 1px;
  background: #f1f5f9;
  margin: 0 0 20px;
}

.trust-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
}
.trust-item-icon {
  color: #0d9488;
}
.trust-item-text {
  font-size: 12px;
  font-weight: 600;
}

.action-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 20px;
}

.qty-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.qty-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qty-label {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.qty-stock-status {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
.qty-picker {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 4px;
}
.qty-picker-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #0f172a;
  outline: none;
}
.qty-picker-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}
.qty-picker-value {
  width: 32px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.action-btn-cart {
  width: 100%;
  height: 50px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  background: #0f172a !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  transition: background-color 0.2s ease !important;
}
.action-btn-cart:hover:not(:disabled) {
  background: #1e293b !important;
}
.action-btn-buy {
  width: 100%;
  height: 50px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  border: 1px solid #0f172a !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  background: transparent !important;
  transition: background-color 0.2s ease, color 0.2s ease !important;
}
.action-btn-buy:hover:not(:disabled) {
  background: #0f172a !important;
  color: #ffffff !important;
}

/* ════════════════════════════════ DETAILS SECTION ════ */
.editorial-details-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 32px;
  margin-bottom: 48px;
}

.details-main-card,
.promise-sidebar-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 32px;
}

.details-section-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0f172a;
  margin: 0 0 20px;
}

.description-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.desc-line {
  font-size: 14px;
  line-height: 1.65;
  color: #475569;
  margin: 0;
}
.see-more-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0d9488;
  margin-top: 16px;
  outline: none;
}
.see-more-toggle:hover {
  text-decoration: underline;
}

.promise-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.promise-list-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.promise-item-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.promise-item-copy {
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
  margin: 0;
}
.promise-item-divider {
  border: 0;
  height: 1px;
  background: #f1f5f9;
  margin: 12px 0 0;
}

/* ════════════════════════════════ REVIEWS SECTION ════ */
.reviews-section-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 32px;
  margin-bottom: 32px;
}

.reviews-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}
.header-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.header-text-wrap .details-section-title {
  margin: 0;
}
.section-subtitle-text {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}
.reviews-score-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: #d97706;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  padding: 4px 12px;
}

.reviews-split-grid {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 48px;
  align-items: start;
}

/* ── Left form panel ── */
.reviews-form-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.rating-hero-box {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fafafa;
  border: 1px solid #e2e8f0;
  padding: 16px;
}
.rating-hero-box .v-icon {
  margin-right: 0 !important;
}
.rating-hero-avatar {
  width: 44px;
  height: 44px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rating-hero-values {
  display: flex;
  flex-direction: column;
}
.rating-hero-number {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}
.rating-hero-count {
  font-size: 12px;
  color: #64748b;
}

.login-prompt-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-prompt-text {
  font-size: 13px;
  color: #166534;
  margin: 0;
  font-weight: 600;
}
.login-redirect-btn {
  height: 36px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  background: #166534 !important;
  color: #ffffff !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
}

.review-submission-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 20px;
}
.form-rating-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.form-rating-label {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.review-textarea-custom :deep(.v-field) {
  border-radius: 0 !important;
}
.save-review-btn {
  height: 42px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  background: #0f172a !important;
  color: #ffffff !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  transition: background-color 0.15s ease !important;
}
.save-review-btn:hover:not(:disabled) {
  background: #1e293b !important;
}

/* ── Right feed panel ── */
.reviews-feed-panel {
  display: flex;
  flex-direction: column;
}
.empty-reviews-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: #fafafa;
  border: 1px dashed #cbd5e1;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.reviews-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-feed-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.review-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}
.reviewer-avatar {
  width: 36px;
  height: 36px;
  background: #0f766e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reviewer-meta-info {
  display: flex;
  flex-direction: column;
}
.reviewer-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.review-date-badge {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}
.review-card-comment {
  font-size: 13px;
  line-height: 1.5;
  color: #475569;
  margin: 0 0 4px;
}
.review-card-divider {
  border: 0;
  height: 1px;
  background: #f1f5f9;
  margin: 8px 0 0;
}

/* ════════════════════════════════ NOT FOUND CARD ═════ */
.product-not-found-card {
  max-width: 500px;
  margin: 80px auto;
  text-align: center;
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 6px 6px 0px #0f172a;
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.not-found-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}
.not-found-text {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 8px;
}
.not-found-btn {
  height: 44px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
}

/* ════════════════════════════════ RESPONSIVE ═════════ */
@media (max-width: 959px) {
  .bespoke-detail-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .editorial-details-row {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .reviews-split-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 599px) {
  .bespoke-detail-container {
    padding: 24px 16px 60px !important;
  }
  .specs-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .product-purchase-panel {
    padding: 24px 16px;
  }
  .details-main-card,
  .promise-sidebar-card,
  .reviews-section-card {
    padding: 24px 16px;
  }
  .review-card-header {
    align-items: flex-start;
  }
  .review-date-badge {
    position: static;
    transform: none;
    margin-top: 4px;
  }
}
</style>
