<template>
  <div class="atelier-product-page">
    <div class="texture-layer" />

    <v-container class="atelier-shell">
      <v-row v-if="loading" class="main-row">
        <v-col cols="12" md="7">
          <v-skeleton-loader class="skeleton-frame" type="image" />
          <v-row class="mt-4">
            <v-col cols="12" sm="4">
              <v-skeleton-loader class="skeleton-mini" type="text" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-skeleton-loader class="skeleton-mini" type="text" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-skeleton-loader class="skeleton-mini" type="text" />
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="12" md="5">
          <v-skeleton-loader class="skeleton-panel" type="article, actions" />
        </v-col>
      </v-row>

      <template v-else-if="product">
        <header class="hero-intro reveal-fade">
          <v-btn
            class="back-nav-btn"
            prepend-icon="mdi-arrow-left"
            rounded="pill"
            variant="tonal"
            @click="goBack"
          >
            Back
          </v-btn>
          <p class="intro-kicker">Atelier Signature</p>
          <h1 class="intro-title">Premium details built for modern, intentional spaces.</h1>
        </header>

        <v-row class="main-row">
          <v-col cols="12" md="7">
            <section class="gallery-board reveal-up">
              <div class="hero-frame">
                <img
                  :alt="product.name"
                  class="hero-image"
                  decoding="async"
                  fetchpriority="high"
                  loading="eager"
                  :src="product.image_url"
                >

                <div class="edition-badge">
                  <p>Limited Atelier Drop</p>
                  <h3>Curated for mindful living</h3>
                </div>
              </div>

              <div class="gallery-foot">
                <article v-for="panel in visualPanels" :key="panel.title" class="mini-panel">
                  <p class="mini-label">{{ panel.title }}</p>
                  <h4 class="mini-value">{{ panel.value }}</h4>
                </article>
              </div>
            </section>
          </v-col>

          <v-col cols="12" md="5">
            <aside class="purchase-panel reveal-up delay-1">
              <p class="category-chip">{{ categoryLabel }}</p>
              <h2 class="product-title">{{ product.name }}</h2>

              <div class="price-strip">
                <p class="price">{{ formattedPrice }}</p>
                <span class="tax-note">Inclusive of all taxes</span>
              </div>

              <div class="rating-strip">
                <div class="stars">
                  <v-icon
                    v-for="(filled, index) in ratingStars"
                    :key="index"
                    :class="{ filled }"
                    size="17"
                  >
                    {{ filled ? 'mdi-star' : 'mdi-star-outline' }}
                  </v-icon>
                </div>
                <span class="rating-label">{{ ratingLabel }} / 5</span>
                <span class="reviews-count">{{ reviewCount }} verified reviews</span>
              </div>

              <p class="description">{{ product.description || fallbackDescription }}</p>

              <div class="trust-grid">
                <div v-for="chip in trustChips" :key="chip.label" class="trust-chip">
                  <v-icon size="16">{{ chip.icon }}</v-icon>
                  <span>{{ chip.label }}</span>
                </div>
              </div>

              <div class="cart-panel">
                <div class="stock-row">
                  <v-icon :color="stockReady ? 'success' : 'error'" size="small">mdi-circle</v-icon>
                  <span :class="stockReady ? 'text-success' : 'text-error'">{{ stockText }}</span>
                </div>

                <div class="quantity-row">
                  <span class="quantity-label">Quantity</span>
                  <div class="quantity-control">
                    <v-btn
                      :disabled="quantity <= 1"
                      icon
                      size="small"
                      variant="outlined"
                      @click="decreaseQuantity"
                    >
                      <v-icon>mdi-minus</v-icon>
                    </v-btn>

                    <span class="quantity-value">{{ quantity }}</span>

                    <v-btn
                      :disabled="!stockReady || quantity >= product.stock"
                      icon
                      size="small"
                      variant="outlined"
                      @click="increaseQuantity"
                    >
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </div>
                </div>

                <v-btn
                  block
                  class="action-add-to-cart"
                  :disabled="!stockReady"
                  rounded="pill"
                  size="large"
                  @click="addToCart"
                >
                  <v-icon start>mdi-cart</v-icon>
                  {{ stockReady ? 'Add to Cart' : 'Sold Out' }}
                </v-btn>

                <v-btn
                  block
                  class="action-buy-now mt-3"
                  :disabled="!stockReady"
                  rounded="pill"
                  variant="flat"
                  @click="buyNow"
                >
                  <v-icon start>mdi-lightning-bolt</v-icon>
                  Buy Now
                </v-btn>
              </div>
            </aside>
          </v-col>
        </v-row>

        <section class="detail-belt reveal-up delay-2">
          <article v-for="detail in atelierDetails" :key="detail.title" class="detail-card">
            <p class="detail-title">{{ detail.title }}</p>
            <p class="detail-copy">{{ detail.copy }}</p>
          </article>
        </section>
      </template>

      <section v-else class="empty-state">
        <h2>Product not found</h2>
        <p>This product may have been moved or is temporarily unavailable.</p>
        <v-btn color="primary" rounded="pill" @click="router.push('/')">Back to Home</v-btn>
      </section>
    </v-container>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="2200"
      :type="snackbarColor"
    />
  </div>
</template>

<script setup>
  import axios from 'axios'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { useCurrency } from '@/utils/currency'

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

  const fallbackDescription = 'A design-first piece crafted to blend visual calm with daily utility.'

  const formattedPrice = computed(() => {
    const price = Number(product.value?.price || 0)
    return formatAmount(price)
  })

  const categoryLabel = computed(() => {
    const value = String(product.value?.category || 'Curated Collection').trim()
    return value.length > 0 ? value.toUpperCase() : 'CURATED COLLECTION'
  })

  const ratingScore = computed(() => {
    const seed = Number(product.value?.product_id || route.params.id || 0)
    const score = 4.1 + ((seed % 7) / 10)
    return Math.min(score, 4.9)
  })

  const ratingLabel = computed(() => ratingScore.value.toFixed(1))

  const ratingStars = computed(() => {
    const filledCount = Math.round(ratingScore.value)
    return Array.from({ length: 5 }, (_, index) => index < filledCount)
  })

  const reviewCount = computed(() => {
    const seed = Number(product.value?.product_id || route.params.id || 1)
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

  async function fetchProduct (productId = route.params.id) {
    loading.value = true
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}`)
      product.value = response.data
      quantity.value = 1
    } catch (error) {
      console.error('Failed to fetch product:', error)
      product.value = null
    } finally {
      loading.value = false
    }
  }

  function increaseQuantity () {
    const stock = Number(product.value?.stock || 0)
    if (stock > 0 && quantity.value < stock) {
      quantity.value += 1
    }
  }

  function decreaseQuantity () {
    if (quantity.value > 1) {
      quantity.value -= 1
    }
  }

  function goBack () {
    const historyState = window.history.state
    const hasInAppBack = typeof historyState?.back === 'string' && historyState.back.length > 0
    if (hasInAppBack) {
      router.go(-1)
      return
    }
    router.push('/')
  }

  async function addToCart () {
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

  async function buyNow () {
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

  onMounted(() => {
    fetchProduct()
  })
</script>

<style scoped>
.atelier-product-page {
  --lux-ink: #13262b;
  --lux-muted: #5b6970;
  --lux-accent: #af6427;
  --lux-accent-strong: #8a4a17;
  --lux-border: rgba(19, 38, 43, 0.15);
  --lux-panel: rgba(255, 255, 255, 0.82);
  min-height: 100vh;
  padding: 24px 0 72px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 8%, rgba(225, 177, 138, 0.32), transparent 34%),
    radial-gradient(circle at 84% 2%, rgba(123, 154, 164, 0.2), transparent 30%),
    linear-gradient(150deg, #f7f1e8 0%, #f5f7f2 48%, #eaf0f3 100%);
}

.texture-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background:
    repeating-linear-gradient(118deg, rgba(255, 255, 255, 0.2) 0 2px, transparent 2px 20px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent 36%);
}

.atelier-shell {
  position: relative;
  z-index: 1;
}

.hero-intro {
  margin-bottom: 18px;
}

.back-nav-btn {
  margin-bottom: 12px;
  text-transform: none;
  font-weight: 700;
  color: #2b4952;
  border: 1px solid rgba(43, 73, 82, 0.15);
  background: rgba(255, 255, 255, 0.68);
}

.intro-kicker {
  text-transform: uppercase;
  letter-spacing: 1.7px;
  color: #8b551e;
  font-size: 0.72rem;
  font-weight: 700;
}

.intro-title {
  margin-top: 8px;
  max-width: 680px;
  color: #15282d;
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.7rem, 3.5vw, 2.7rem);
  line-height: 1.16;
}

.main-row {
  row-gap: 24px;
}

.gallery-board {
  border: 1px solid var(--lux-border);
  border-radius: 30px;
  padding: 16px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.68), rgba(234, 242, 247, 0.62));
  box-shadow: 0 28px 58px rgba(19, 38, 43, 0.14);
}

.hero-frame {
  height: 640px;
  border-radius: 22px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(120deg, #dfe7eb, #cfdbe1);
}

.hero-frame::after {
  content: '';
  position: absolute;
  inset: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
  transition: transform 0.5s ease;
}

.gallery-board:hover .hero-image {
  transform: scale(1.06);
}

.edition-badge {
  position: absolute;
  left: 24px;
  bottom: 24px;
  background: rgba(14, 27, 32, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: #f3f7f8;
  border-radius: 14px;
  padding: 12px 14px;
  max-width: 260px;
  backdrop-filter: blur(5px);
}

.edition-badge p {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.68rem;
  color: #d5a778;
}

.edition-badge h3 {
  margin-top: 4px;
  font-size: 0.98rem;
  line-height: 1.3;
}

.gallery-foot {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mini-panel {
  border: 1px solid var(--lux-border);
  border-radius: 14px;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.76);
  transition: transform 0.28s ease, box-shadow 0.28s ease;
}

.mini-panel:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(20, 40, 45, 0.12);
}

.mini-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #728188;
  font-weight: 700;
}

.mini-value {
  margin-top: 5px;
  color: #21363d;
  font-size: 0.9rem;
  line-height: 1.35;
}

.purchase-panel {
  border: 1px solid var(--lux-border);
  border-radius: 30px;
  padding: clamp(22px, 4vw, 34px);
  background: var(--lux-panel);
  backdrop-filter: blur(10px);
  box-shadow: 0 24px 48px rgba(19, 38, 43, 0.14);
  position: sticky;
  top: 98px;
}

.category-chip {
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: 0.72rem;
  color: #7a868c;
  font-weight: 800;
}

.product-title {
  margin-top: 10px;
  color: var(--lux-ink);
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 3.5vw, 2.8rem);
  line-height: 1.06;
}

.price-strip {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.price {
  color: var(--lux-accent);
  font-size: clamp(1.8rem, 3.3vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
}

.tax-note {
  border: 1px solid rgba(175, 100, 39, 0.28);
  background: rgba(175, 100, 39, 0.08);
  border-radius: 999px;
  padding: 6px 10px;
  color: #825123;
  font-size: 0.72rem;
  font-weight: 700;
}

.rating-strip {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stars {
  display: flex;
  align-items: center;
  gap: 2px;
}

.stars :deep(.v-icon) {
  color: #a4b0b7;
}

.stars :deep(.filled) {
  color: #cc7d30;
}

.rating-label {
  color: #3c525a;
  font-size: 0.86rem;
  font-weight: 700;
}

.reviews-count {
  color: #73858d;
  font-size: 0.8rem;
}

.description {
  margin-top: 16px;
  color: var(--lux-muted);
  line-height: 1.76;
}

.trust-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.trust-chip {
  border: 1px solid var(--lux-border);
  border-radius: 12px;
  padding: 9px 10px;
  font-size: 0.81rem;
  font-weight: 700;
  color: #39505a;
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.72);
}

.cart-panel {
  margin-top: 20px;
  border: 1px solid rgba(19, 38, 43, 0.16);
  border-radius: 18px;
  padding: 17px;
  background: rgba(255, 255, 255, 0.8);
}

.stock-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 700;
}

.quantity-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quantity-label {
  color: #40545d;
  font-size: 0.88rem;
  font-weight: 700;
}

.quantity-control {
  display: flex;
  align-items: center;
}

.quantity-value {
  min-width: 42px;
  text-align: center;
  color: #1e3138;
  font-size: 1.04rem;
  font-weight: 800;
}

.action-add-to-cart {
  margin-top: 18px;
  min-height: 50px;
  text-transform: none;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #eff8fb;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 35%),
    linear-gradient(118deg, #10333c 0%, #1d5160 55%, #2d7286 100%);
  box-shadow:
    0 14px 28px rgba(17, 50, 59, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 -1px 0 rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(160, 215, 229, 0.26);
}

.action-add-to-cart:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.action-buy-now {
  min-height: 50px;
  text-transform: none;
  font-weight: 800;
  letter-spacing: 0.45px;
  color: #fffdf8;
  border: 1px solid rgba(145, 91, 33, 0.28);
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 220, 165, 0.35), rgba(255, 220, 165, 0) 30%),
    linear-gradient(110deg, #9a5318 0%, #bf702d 52%, #df9c4d 100%);
  box-shadow:
    0 14px 26px rgba(159, 93, 33, 0.26),
    inset 0 1px 0 rgba(255, 244, 224, 0.35);
}

.action-buy-now:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.detail-belt {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.detail-card {
  border: 1px solid var(--lux-border);
  border-radius: 18px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 8px 20px rgba(24, 39, 44, 0.08);
}

.detail-title {
  font-family: 'Playfair Display', serif;
  color: #243941;
  font-size: 1.2rem;
}

.detail-copy {
  margin-top: 8px;
  color: #5e6f76;
  line-height: 1.62;
  font-size: 0.92rem;
}

.empty-state {
  text-align: center;
  padding: 92px 0;
}

.empty-state h2 {
  color: #1b2e34;
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
}

.empty-state p {
  margin-top: 10px;
  color: #60737b;
}

.skeleton-frame {
  min-height: 640px;
  border-radius: 26px;
}

.skeleton-panel {
  min-height: 520px;
  border-radius: 26px;
}

.skeleton-mini {
  border-radius: 12px;
}

.reveal-up {
  opacity: 0;
  transform: translateY(24px);
  animation: revealUp 0.72s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

.reveal-fade {
  opacity: 0;
  animation: revealFade 0.64s ease forwards;
}

.delay-1 {
  animation-delay: 0.14s;
}

.delay-2 {
  animation-delay: 0.26s;
}

@keyframes revealUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes revealFade {
  to {
    opacity: 1;
  }
}

@media (max-width: 1264px) {
  .hero-frame {
    height: 560px;
  }

  .purchase-panel {
    position: static;
  }
}

@media (max-width: 960px) {
  .atelier-product-page {
    padding-top: 18px;
  }

  .hero-frame {
    height: 460px;
  }

  .detail-belt {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .gallery-foot {
    grid-template-columns: 1fr;
  }

  .trust-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .atelier-product-page {
    padding-top: 72px;
    padding-bottom: 52px;
  }

  .hero-frame {
    height: 340px;
  }

  .edition-badge {
    left: 14px;
    right: 14px;
    max-width: none;
  }

  .quantity-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
