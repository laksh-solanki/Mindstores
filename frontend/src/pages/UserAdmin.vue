<template>
  <div class="user-admin-page bespoke-admin-container">
    <v-container class="py-5 py-md-7 px-0" fluid>
      <!-- Topbar Header -->
      <div class="admin-topbar mb-6">
        <div>
          <div class="brand-tagline">
            <span class="tag-label">MINDSTORES</span>
            <span class="tag-dot">✦</span>
            <span class="tag-label text-uppercase">ADMIN CONSOLE</span>
          </div>
          <h1 class="page-title">
            User <span class="highlight-serif">Admin</span>
          </h1>
          <p class="page-subtitle">
            Manage your product drafts from your PIN-protected account.
          </p>
        </div>
        <div class="topbar-actions">
          <button
            class="btn-flat-outline btn-with-icon"
            @click="loadConsole"
          >
            <v-icon class="mr-1" icon="mdi-refresh" size="18" />
            Refresh
          </button>
          <router-link
            class="btn-flat-solid btn-with-icon text-decoration-none"
            to="/profile"
          >
            <v-icon class="mr-1" icon="mdi-account-outline" size="18" />
            Profile
          </router-link>
        </div>
      </div>

      <!-- Blocked status warning screen -->
      <div v-if="isBlocked" class="flat-card-container pa-6 text-center my-6">
        <div class="d-flex flex-column align-center justify-center py-10">
          <v-avatar class="mb-4" color="red-lighten-5" size="80">
            <v-icon color="error" icon="mdi-shield-lock-outline" size="48" />
          </v-avatar>
          <h2 class="text-h4 font-weight-bold text-red-darken-2 mb-3">your user admin page block</h2>
          <p class="text-body-1 text-slate-600 mb-6" style="max-width: 500px; margin: 0 auto 24px;">
            Access to your User Admin console has been restricted by the system administrator. You cannot view or manage product drafts.
          </p>
          <div class="d-flex justify-center ga-3">
            <button class="btn-flat-outline btn-with-icon" @click="loadConsole">
              <v-icon class="mr-1" icon="mdi-refresh" size="18" />
              Try Again
            </button>
            <router-link class="btn-flat-solid btn-with-icon text-decoration-none" to="/">
              <v-icon class="mr-1" icon="mdi-store-outline" size="18" />
              Go to Storefront
            </router-link>
          </div>
        </div>
      </div>

      <v-alert
        v-else-if="!appStore.loading && !appStore.isAuthenticated"
        class="mb-4 custom-flat-alert error-alert"
        type="error"
        variant="tonal"
      >
        <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3 w-100">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-alert-circle-outline" />
            <span>Login before opening your user admin controls.</span>
          </div>
          <router-link class="btn-flat-solid text-decoration-none py-1 px-4 text-center" to="/login">Login</router-link>
        </div>
      </v-alert>

      <v-alert
        v-else-if="!loading && !hasPinAccess"
        class="mb-4 custom-flat-alert warning-alert"
        type="warning"
        variant="tonal"
      >
        <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3 w-100">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-lock-outline" />
            <span>Create or enter your User Admin PIN from Profile before using User Admin.</span>
          </div>
          <router-link class="btn-flat-solid text-decoration-none py-1 px-4 text-center" to="/profile">Open Profile</router-link>
        </div>
      </v-alert>

      <template v-if="appStore.isAuthenticated && hasPinAccess && !isBlocked">
        <v-row align="start" dense>
          <!-- Navigation Sidebar -->
          <v-col cols="12" lg="2" md="3">
            <div class="flat-card-container pa-0 mb-4">
              <div class="panel-window-header">
                <div class="window-dots">
                  <span class="dot dot-red" />
                  <span class="dot dot-yellow" />
                  <span class="dot dot-green" />
                </div>
                <div class="window-title-display">NAVIGATION</div>
              </div>
              <v-list class="custom-admin-nav bg-transparent" density="compact" nav>
                <v-list-item
                  v-for="item in userAdminNavItems"
                  :key="item.id"
                  :active="activePanel === item.id"
                  active-class="active-nav-item"
                  class="custom-nav-item"
                  @click="activePanel = item.id"
                >
                  <template #prepend>
                    <v-icon class="mr-2" :icon="item.icon" size="18" />
                  </template>
                  <v-list-item-title class="font-weight-bold">{{ item.label }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </v-col>

          <!-- Main Console Panel -->
          <v-col cols="12" lg="10" md="9">
            <!-- Dashboard View -->
            <template v-if="activePanel === 'dashboard'">
              <v-row class="mb-4" dense>
                <v-col
                  v-for="metric in metrics"
                  :key="metric.label"
                  cols="12"
                  md="3"
                  sm="6"
                >
                  <div class="metric-card-flat">
                    <div class="d-flex align-center justify-space-between ga-3">
                      <div>
                        <div class="metric-label">{{ metric.label }}</div>
                        <div class="metric-value font-mono">{{ metric.value }}</div>
                      </div>
                      <v-avatar class="metric-avatar-flat" :color="metric.color" size="44">
                        <v-icon :color="metric.color">{{ metric.icon }}</v-icon>
                      </v-avatar>
                    </div>
                  </div>
                </v-col>
              </v-row>

              <v-row class="mt-2" dense>
                <!-- Product Analysis -->
                <v-col class="mb-4" cols="12" lg="4">
                  <div class="flat-card-container pa-0 h-100">
                    <div class="panel-window-header-mini">
                      <div class="window-dots">
                        <span class="dot dot-red" />
                        <span class="dot dot-yellow" />
                        <span class="dot dot-green" />
                      </div>
                      <div class="window-title-mini">Product Analysis</div>
                    </div>
                    <div class="pa-4">
                      <div
                        v-for="segment in categoryStats"
                        :key="segment.name"
                        class="mb-4"
                      >
                        <div class="d-flex justify-space-between text-body-2 mb-1">
                          <span class="font-weight-bold text-slate-800">{{ segment.name }}</span>
                          <span class="font-mono text-medium-emphasis font-weight-bold">{{ segment.count }}</span>
                        </div>
                        <div class="custom-progress-container">
                          <div class="custom-progress-bar" :style="{ width: segment.percent + '%' }" />
                        </div>
                      </div>
                      <v-alert v-if="categoryStats.length === 0" class="custom-flat-alert info-alert" type="info" variant="tonal">
                        No product categories yet.
                      </v-alert>
                    </div>
                  </div>
                </v-col>

                <!-- Inventory Stats -->
                <v-col class="mb-4" cols="12" lg="4">
                  <div class="flat-card-container pa-0 h-100">
                    <div class="panel-window-header-mini">
                      <div class="window-dots">
                        <span class="dot dot-red" />
                        <span class="dot dot-yellow" />
                        <span class="dot dot-green" />
                      </div>
                      <div class="window-title-mini">Inventory</div>
                    </div>
                    <div class="pa-4">
                      <v-list class="bg-transparent custom-stat-list py-0" density="compact">
                        <v-list-item class="px-0 py-2 border-bottom-dashed">
                          <template #prepend>
                            <v-icon class="mr-2" color="warning" icon="mdi-alert-outline" />
                          </template>
                          <v-list-item-title class="font-weight-bold text-slate-800">Low stock</v-list-item-title>
                          <v-list-item-subtitle class="font-weight-medium text-slate-600">{{ lowStockCount }} products below 5 units</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item class="px-0 py-2 border-bottom-dashed">
                          <template #prepend>
                            <v-icon class="mr-2" color="teal-darken-1" icon="mdi-image-multiple-outline" />
                          </template>
                          <v-list-item-title class="font-weight-bold text-slate-800">Images</v-list-item-title>
                          <v-list-item-subtitle class="font-weight-medium text-slate-600">{{ productsWithImagesCount }} products with images</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item class="px-0 py-2">
                          <template #prepend>
                            <v-icon class="mr-2" color="success" icon="mdi-cash-multiple" />
                          </template>
                          <v-list-item-title class="font-weight-bold text-slate-800">Shelf value</v-list-item-title>
                          <v-list-item-subtitle class="font-weight-bold font-mono text-teal-darken-1">{{ formatMoney(totalInventoryValue) }}</v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </div>
                  </div>
                </v-col>

                <!-- Top Value Products -->
                <v-col class="mb-4" cols="12" lg="4">
                  <div class="flat-card-container pa-0 h-100">
                    <div class="panel-window-header-mini">
                      <div class="window-dots">
                        <span class="dot dot-red" />
                        <span class="dot dot-yellow" />
                        <span class="dot dot-green" />
                      </div>
                      <div class="window-title-mini">Top Value Products</div>
                    </div>
                    <div class="pa-4">
                      <v-list v-if="topValueProducts.length > 0" class="bg-transparent py-0 custom-top-products-list" density="compact">
                        <v-list-item
                          v-for="product in topValueProducts"
                          :key="product.product_id || product.name"
                          class="px-0 py-2 border-bottom-dashed"
                        >
                          <template #prepend>
                            <div class="avatar-flat-mini mr-3">
                              <img v-if="draftImageUrl(product)" class="img-cover" :src="draftImageUrl(product)">
                              <v-icon v-else icon="mdi-image-off-outline" size="18" />
                            </div>
                          </template>
                          <div class="d-flex flex-column min-width-0">
                            <span class="font-weight-bold text-truncate text-slate-800 text-body-2">{{ product.name }}</span>
                            <span class="text-caption text-medium-emphasis">{{ formatDraftCategory(product) }}</span>
                          </div>
                          <template #append>
                            <div class="font-weight-bold font-mono text-body-2 text-slate-800">{{ formatMoney(product.shelf_value) }}</div>
                          </template>
                        </v-list-item>
                      </v-list>
                      <v-alert v-else class="custom-flat-alert info-alert" type="info" variant="tonal">
                        No product value data.
                      </v-alert>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </template>

            <!-- Products Table View -->
            <div v-else-if="activePanel === 'products'" class="flat-card-container pa-0">
              <div class="panel-window-header">
                <div class="window-dots">
                  <span class="dot dot-red" />
                  <span class="dot dot-yellow" />
                  <span class="dot dot-green" />
                </div>
                <div class="window-title-display">Console / Products</div>
              </div>
              <div class="pa-4">
                <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 mb-4">
                  <div>
                    <h2 class="section-title">Products</h2>
                    <div class="section-subtitle">{{ products.length }} saved in your user admin area.</div>
                  </div>
                  <div class="d-flex flex-column flex-sm-row ga-2 align-sm-center">
                    <v-text-field
                      v-model="productSearch"
                      class="flat-text-field search-text-field"
                      density="compact"
                      hide-details
                      label="Search products"
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                    />
                    
                    <v-menu content-class="flat-menu-content" location="bottom end">
                      <template #activator="{ props }">
                        <button
                          v-bind="props"
                          class="btn-flat-outline btn-with-icon"
                        >
                          <v-icon class="mr-1" icon="mdi-download" size="18" />
                          Export
                          <v-icon class="ml-1" icon="mdi-chevron-down" size="14" />
                        </button>
                      </template>
                      <v-list density="comfortable">
                        <v-list-item
                          prepend-icon="mdi-file-delimited-outline"
                          title="Export to CSV"
                          @click="exportToCSV"
                        />
                        <v-list-item
                          prepend-icon="mdi-code-json"
                          title="Export to JSON"
                          @click="exportToJSON"
                        />
                      </v-list>
                    </v-menu>

                    <button
                      class="btn-flat-solid btn-with-icon"
                      @click="openAddDialog"
                    >
                      <v-icon class="mr-1" icon="mdi-plus" size="18" />
                      Add Product
                    </button>
                  </div>
                </div>

                <v-progress-linear v-if="loading" class="mb-4" color="teal-darken-1" indeterminate />
                <v-alert v-else-if="filteredProducts.length === 0" class="custom-flat-alert info-alert" type="info" variant="tonal">
                  {{ products.length === 0 ? 'Add your first product.' : 'No matching products found.' }}
                </v-alert>
                <v-data-table
                  v-else
                  class="custom-admin-table"
                  density="comfortable"
                  :headers="productHeaders"
                  :items="filteredProducts"
                  :items-per-page="8"
                >
                  <template #item.name="{ item }">
                    <div class="d-flex align-center ga-3 py-2">
                      <div class="table-avatar-flat">
                        <img v-if="draftImageUrl(resolveItem(item))" class="img-cover" :src="draftImageUrl(resolveItem(item))">
                        <v-icon v-else color="grey" icon="mdi-image-off-outline" size="18" />
                      </div>
                      <div>
                        <div class="font-weight-bold text-slate-800 text-body-2">{{ resolveItem(item).name }}</div>
                        <div class="table-category-tag mt-1">{{ formatDraftCategory(resolveItem(item)) }}</div>
                      </div>
                    </div>
                  </template>
                  <template #item.price="{ item }">
                    <span class="font-mono font-weight-bold">{{ formatDraftPrice(resolveItem(item)) }}</span>
                  </template>
                  <template #item.stock="{ item }">
                    <div class="d-inline-flex align-center ga-1 inline-stock-adjuster">
                      <button
                        aria-label="Decrease stock"
                        class="stock-btn-flat minus"
                        :disabled="adjustingStockId === resolveItem(item).product_id || resolveItem(item).stock <= 0"
                        @click="adjustStock(resolveItem(item), -1)"
                      >
                        <v-icon icon="mdi-minus" size="12" />
                      </button>
                      <span class="custom-badge badge-teal font-mono px-2 py-1 text-caption">{{ resolveItem(item).stock }}</span>
                      <button
                        aria-label="Increase stock"
                        class="stock-btn-flat plus"
                        :disabled="adjustingStockId === resolveItem(item).product_id"
                        @click="adjustStock(resolveItem(item), 1)"
                      >
                        <v-icon icon="mdi-plus" size="12" />
                      </button>
                    </div>
                  </template>
                  <template #item.actions="{ item }">
                    <div class="d-flex align-center ga-1">
                      <button
                        aria-label="Edit product"
                        class="action-icon-btn edit-btn"
                        @click="editProduct(resolveItem(item))"
                      >
                        <v-icon icon="mdi-pencil-outline" size="18" />
                      </button>
                      <button
                        aria-label="Duplicate product"
                        class="action-icon-btn edit-btn"
                        :disabled="saving"
                        @click="duplicateProduct(resolveItem(item))"
                      >
                        <v-icon icon="mdi-content-copy" size="18" />
                      </button>
                      <button
                        aria-label="Remove product"
                        class="action-icon-btn delete-btn"
                        @click="removeProduct(resolveItem(item))"
                      >
                        <v-icon icon="mdi-delete-outline" size="18" />
                      </button>
                    </div>
                  </template>
                </v-data-table>
              </div>
            </div>

            <!-- Reviews List View -->
            <div v-else-if="activePanel === 'reviews'" class="flat-card-container pa-0">
              <div class="panel-window-header">
                <div class="window-dots">
                  <span class="dot dot-red" />
                  <span class="dot dot-yellow" />
                  <span class="dot dot-green" />
                </div>
                <div class="window-title-display">Console / Reviews</div>
              </div>
              <div class="pa-4">
                <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 mb-4">
                  <div>
                    <h2 class="section-title">Reviews</h2>
                    <div class="section-subtitle">{{ reviews.length }} public reviews on your products.</div>
                  </div>
                  <button
                    class="btn-flat-outline btn-with-icon"
                    @click="loadConsole"
                  >
                    <v-icon class="mr-1" icon="mdi-refresh" size="18" />
                    Refresh
                  </button>
                </div>

                <v-progress-linear v-if="reviewsLoading" class="mb-4" color="teal-darken-1" indeterminate />
                <v-alert v-else-if="reviews.length === 0" class="custom-flat-alert info-alert" type="info" variant="tonal">
                  No product reviews yet.
                </v-alert>
                <div v-else class="reviews-list-flat">
                  <div
                    v-for="(review, index) in reviews"
                    :key="review.review_id || `${review.product_id}-${index}`"
                    class="review-item-flat"
                  >
                    <div class="review-avatar-flat">
                      <img v-if="review.product_image_url" class="img-cover" :src="review.product_image_url">
                      <v-icon v-else color="grey" icon="mdi-image-off-outline" size="18" />
                    </div>
                    <div class="review-details-flat">
                      <div class="d-flex align-center flex-wrap ga-2">
                        <span class="review-product-name">{{ review.product_name || review.product_id }}</span>
                        <v-rating
                          active-color="amber-darken-2"
                          color="grey-lighten-1"
                          density="compact"
                          :model-value="Number(review.rating || 0)"
                          readonly
                          size="30"
                        />
                      </div>
                      <div class="review-comment mt-1 text-slate-700">{{ review.comment }}</div>
                      <div class="review-meta mt-2">
                        <span class="font-weight-bold">{{ review.reviewer_name || 'Mindstores user' }}</span>
                        <span v-if="review.reviewer_email" class="meta-dot">•</span>
                        <span v-if="review.reviewer_email" class="text-medium-emphasis">{{ review.reviewer_email }}</span>
                        <span class="meta-dot">•</span>
                        <span>{{ formatReviewDate(review.created_at) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

    <!-- Add/Edit Product Dialog -->
    <v-dialog v-model="productDialog" max-width="1180" scrollable>
      <div class="flat-card-container dialog-frame-flat pa-0 w-100 d-flex flex-column">
        <!-- Dialog Header -->
        <div class="panel-window-header">
          <div class="window-dots">
            <span class="dot dot-red" @click="productDialog = false" />
            <span class="dot dot-yellow" />
            <span class="dot dot-green" />
          </div>
          <div class="window-title-display">{{ editProductId ? 'Edit Product Draft' : 'Add New Product Draft' }}</div>
          <button aria-label="Close dialog" class="dialog-close-btn" @click="productDialog = false">
            <v-icon icon="mdi-close" size="18" />
          </button>
        </div>

        <!-- Dialog Scroll Body -->
        <div class="dialog-scroll-body pa-6 flex-grow-1 overflow-y-auto">
          <v-form @submit.prevent="saveProductDraft">
            <v-row dense>
              <v-col cols="12" md="8">
                <v-row class="ga-4" dense>
                  <v-col cols="12">
                    <v-file-input
                      v-model="productImageFiles"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      chips
                      class="flat-text-field"
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
                      class="flat-text-field"
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
              <v-col class="d-flex align-stretch" cols="12" md="4">
                <div class="image-preview-frame pa-3 w-100 d-flex align-center justify-center">
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
                        class="carousel-img-flat"
                        cover
                        height="180"
                        :src="imageUrl"
                      />
                    </v-carousel-item>
                  </v-carousel>
                  <div
                    v-else
                    class="no-preview-placeholder d-flex flex-column align-center justify-center py-4"
                  >
                    <v-icon color="grey" icon="mdi-image-off-outline" size="48" />
                    <span class="text-caption mt-2 text-medium-emphasis">No image selected</span>
                  </div>
                </div>
              </v-col>
              <v-col v-if="productImageGallery.length > 0" class="mt-2" cols="12">
                <div class="d-flex flex-wrap ga-2">
                  <span
                    v-for="(imageUrl, index) in productImageGallery"
                    :key="`${imageUrl}-${index}`"
                    class="custom-badge badge-slate d-flex align-center ga-1"
                  >
                    {{ index === 0 ? 'Primary image' : `Image ${index + 1}` }}
                    <button
                      aria-label="Remove image"
                      class="chip-close-btn ml-1"
                      type="button"
                      @click="removeProductImage(index)"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </v-col>
              <v-col class="mt-4" cols="12" md="8">
                <v-text-field
                  v-model="productForm.name"
                  class="flat-text-field"
                  density="comfortable"
                  label="Product name"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col class="mt-4" cols="12" md="4">
                <v-text-field
                  v-model="productForm.company"
                  class="flat-text-field"
                  density="comfortable"
                  label="Brand"
                  variant="outlined"
                />
              </v-col>
              <v-col class="d-flex flex-row flex-md-column ga-1 mt-2" cols="12" md="1">
                <button
                  v-for="option in descriptionBulletOptions"
                  :key="option.symbol"
                  :aria-label="option.label"
                  class="btn-flat-outline bullet-btn-flat"
                  type="button"
                  @click="addDescriptionBullet(option.symbol)"
                >
                  {{ option.symbol }}
                </button>
              </v-col>
              <v-col class="mt-2" cols="12" md="11">
                <v-textarea
                  v-model="productForm.description"
                  auto-grow
                  class="flat-text-field"
                  density="comfortable"
                  label="Description"
                  rows="7"
                  variant="outlined"
                />
              </v-col>
              <v-col class="mt-2" cols="12" md="4">
                <v-select
                  v-model="productForm.price_currency"
                  class="flat-text-field"
                  density="comfortable"
                  item-title="title"
                  item-value="value"
                  :items="priceCurrencyOptions"
                  label="Country currency"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col class="mt-2" cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.price"
                  class="flat-text-field"
                  density="comfortable"
                  label="Price"
                  min="0"
                  :prefix="selectedPriceCurrency"
                  required
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col class="mt-2" cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.stock"
                  class="flat-text-field"
                  density="comfortable"
                  label="Stock"
                  min="0"
                  required
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col class="mt-2" cols="12" md="6">
                <v-combobox
                  v-model="productForm.category"
                  class="flat-text-field"
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
              <v-col class="mt-2" cols="12" md="6">
                <v-combobox
                  v-model="productForm.subcategory"
                  class="flat-text-field"
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
        </div>

        <!-- Dialog Actions -->
        <div class="dialog-actions-flat border-top pa-4 bg-light d-flex justify-end ga-3">
          <button class="btn-flat-outline" type="button" @click="productDialog = false">Cancel</button>
          <button
            class="btn-flat-solid"
            :disabled="saving"
            type="button"
            @click="saveProductDraft"
          >
            <span v-if="saving">Saving...</span>
            <span v-else>{{ editProductId ? 'Update' : 'Add' }}</span>
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Catalog Option Dialog -->
    <v-dialog v-model="catalogOptionDialog" max-width="460">
      <div class="flat-card-container dialog-frame-flat pa-0 w-100">
        <div class="panel-window-header">
          <div class="window-dots">
            <span class="dot dot-red" @click="catalogOptionDialog = false" />
            <span class="dot dot-yellow" />
            <span class="dot dot-green" />
          </div>
          <div class="window-title-display">{{ catalogOptionDialogTitle }}</div>
        </div>
        <div class="pa-6">
          <v-text-field
            v-model="catalogOptionInput"
            autofocus
            class="flat-text-field"
            density="comfortable"
            :label="catalogOptionInputLabel"
            variant="outlined"
            @keyup.enter="saveCatalogOption"
          />
        </div>
        <div class="dialog-actions-flat border-top pa-4 bg-light d-flex justify-end ga-3">
          <button class="btn-flat-outline" type="button" @click="catalogOptionDialog = false">Cancel</button>
          <button
            class="btn-flat-solid"
            :disabled="catalogOptionSaving"
            type="button"
            @click="saveCatalogOption"
          >
            <span v-if="catalogOptionSaving">Saving...</span>
            <span v-else>Save</span>
          </button>
        </div>
      </div>
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
      const isBlocked = ref(false)
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
        if (typeof message === 'string' && message.includes('your user admin page block')) {
          isBlocked.value = true
        }
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
          if (profile.value?.user_admin_blocked) {
            isBlocked.value = true
            products.value = []
            reviews.value = []
            return
          } else {
            isBlocked.value = false
          }

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
            const errorMsg = error?.response?.data?.message || ''
            if (errorMsg.includes('your user admin page block')) {
              isBlocked.value = true
              products.value = []
              reviews.value = []
              return
            }
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

      const adjustingStockId = ref('')

      const adjustStock = async (product, change) => {
        if (!product?.product_id) return
        const newStock = Math.max(0, Number(product.stock || 0) + change)
        
        adjustingStockId.value = product.product_id
        try {
          const payload = {
            stock: newStock
          }
          await updateUserAdminProduct(product.product_id, payload)
          product.stock = newStock
          products.value = [...products.value]
          showMessage('Stock adjusted successfully')
        } catch (error) {
          console.error('Failed to adjust stock:', error)
          showMessage(error?.response?.data?.message || 'Failed to adjust stock', 'error')
        } finally {
          adjustingStockId.value = ''
        }
      }

      const duplicateProduct = async (product) => {
        if (!product) return
        saving.value = true
        try {
          const priceAmount = Number(product.price || product.price_amount || 0)
          const priceCurrency = product.price_currency || product.currency || 'USD'
          const payload = {
            name: `${product.name || ''} (Copy)`.slice(0, 120),
            company: product.company || '',
            description: product.description || '',
            category: normalizeCategoryName(product.category),
            subcategory: normalizeSubcategoryName(product.category, product.subcategory),
            image_url: product.image_url || '',
            image_urls: Array.isArray(product.image_urls) ? [...product.image_urls] : (product.image_url ? [product.image_url] : []),
            price: priceAmount,
            price_amount: priceAmount,
            price_currency: priceCurrency,
            currency: priceCurrency,
            stock: Number(product.stock || 0)
          }
          await createUserAdminProduct(payload)
          showMessage('Product draft duplicated')
          products.value = await fetchUserAdminProducts()
        } catch (error) {
          console.error('Failed to duplicate product:', error)
          showMessage(error?.response?.data?.message || 'Failed to duplicate product', 'error')
        } finally {
          saving.value = false
        }
      }

      const escapeCSVCell = (val) => {
        const str = String(val === null || val === undefined ? '' : val)
        if (/[",\r\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const exportToCSV = () => {
        if (!products.value || products.value.length === 0) {
          showMessage('No products to export', 'warning')
          return
        }
        try {
          const headers = [
            'Product ID',
            'Name',
            'Brand',
            'Category',
            'Subcategory',
            'Description',
            'Price',
            'Currency',
            'Stock',
            'Primary Image URL',
            'All Image URLs'
          ]
          const rows = products.value.map(p => {
            const allUrls = Array.isArray(p.image_urls) ? p.image_urls.join(';') : (p.image_url || '')
            return [
              p.product_id || '',
              p.name || '',
              p.company || '',
              p.category || '',
              p.subcategory || '',
              p.description || '',
              p.price || p.price_amount || 0,
              p.price_currency || p.currency || 'USD',
              p.stock || 0,
              p.image_url || '',
              allUrls
            ].map(escapeCSVCell).join(',')
          })

          const csvContent = [headers.join(','), ...rows].join('\r\n')
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`
          document.body.append(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(url)
          showMessage('Products exported to CSV')
        } catch (error) {
          console.error('Failed to export CSV:', error)
          showMessage('Failed to export CSV', 'error')
        }
      }

      const exportToJSON = () => {
        if (!products.value || products.value.length === 0) {
          showMessage('No products to export', 'warning')
          return
        }
        try {
          const dataStr = JSON.stringify(products.value, null, 2)
          const blob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `products_export_${new Date().toISOString().slice(0, 10)}.json`
          document.body.append(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(url)
          showMessage('Products exported to JSON')
        } catch (error) {
          console.error('Failed to export JSON:', error)
          showMessage('Failed to export JSON', 'error')
        }
      }

      return {
        appStore,
        loading,
        isBlocked,
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
        formatDraftCategory,
        adjustingStockId,
        adjustStock,
        duplicateProduct,
        exportToCSV,
        exportToJSON
      }
    }
  }
</script>

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.user-admin-page {
  min-height: 100vh;
  background: #f8fafc;
}

.bespoke-admin-container {
  padding: 40px max(16px, 4vw) 80px !important;
}

/* ════════════════════════════════ TOPBAR ══════ */
.admin-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 24px;
}

.brand-tagline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tag-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #0f766e;
}
.tag-dot {
  font-size: 10px;
  color: #cbd5e1;
}

.page-title {
  font-size: clamp(24px, 3.5vw, 36px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin-top: 4px;
}
.highlight-serif {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}
.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.topbar-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ════════════════════════════════ FLAT CARDS ══ */
.flat-card-container {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 4px 4px 0px #0f172a;
  padding: 24px;
  margin-bottom: 24px;
}

/* ════════════════════════════════ WINDOW HEADERS ════ */
.panel-window-header {
  height: 36px;
  background: #f8fafc;
  border-bottom: 1px solid #0f172a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  position: relative;
}
.panel-window-header-mini {
  height: 30px;
  background: #f8fafc;
  border-bottom: 1px solid #0f172a;
  display: flex;
  align-items: center;
  padding: 0 12px;
  position: relative;
}

.window-dots {
  display: flex;
  gap: 6px;
  z-index: 2;
}
.window-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #0f172a;
  display: inline-block;
}
.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }

.window-title-display {
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  letter-spacing: 0.05em;
}
.window-title-mini {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

/* ════════════════════════════════ SIDEBAR NAV ══ */
.custom-admin-nav {
  padding: 8px !important;
}
.custom-nav-item {
  border-radius: 0 !important;
  border: 1px solid transparent;
  margin-bottom: 4px !important;
  transition: all 0.2s ease;
}
.custom-nav-item:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.active-nav-item {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
}

/* ════════════════════════════════ METRICS ══════ */
.metric-card-flat {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 4px 4px 0px #0f172a;
  padding: 18px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.metric-card-flat:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px #0f172a;
}
.metric-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.metric-value {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin-top: 4px;
}
.metric-avatar-flat {
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  background: #f8fafc !important;
}

/* Progress bar flat */
.custom-progress-container {
  height: 8px;
  background: #e2e8f0;
  border: 1px solid #0f172a;
  overflow: hidden;
}
.custom-progress-bar {
  height: 100%;
  background: #0d9488;
  border-right: 1px solid #0f172a;
}

.border-bottom-dashed {
  border-bottom: 1px dashed #cbd5e1;
}
.border-bottom-dashed:last-child {
  border-bottom: none;
}

.avatar-flat-mini {
  width: 36px;
  height: 36px;
  border: 1px solid #0f172a;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.img-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ════════════════════════════════ TABLES ═══════ */
.section-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}
.section-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.custom-admin-table :deep(table) {
  border-collapse: collapse;
}
.custom-admin-table :deep(thead th) {
  border-bottom: 2px solid #0f172a !important;
  font-family: monospace;
  font-weight: 800 !important;
  text-transform: uppercase;
  color: #0f172a !important;
  background: #f8fafc !important;
}
.custom-admin-table :deep(tbody td) {
  border-bottom: 1px solid #cbd5e1 !important;
  font-size: 13px !important;
  color: #334155 !important;
}
.custom-admin-table :deep(.v-data-table-footer) {
  border-top: 1px solid #cbd5e1 !important;
  font-family: monospace;
  font-size: 12px;
}
.custom-admin-table :deep(.v-pagination__item) {
  border-radius: 0 !important;
  border: 1px solid #cbd5e1 !important;
}
.custom-admin-table :deep(.v-pagination__item--is-active) {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
}
.custom-admin-table :deep(.v-field) {
  border-radius: 0 !important;
}

.table-avatar-flat {
  width: 44px;
  height: 44px;
  border: 1px solid #0f172a;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.table-category-tag {
  font-size: 10px;
  font-weight: 700;
  color: #0d9488;
  text-transform: uppercase;
}

.action-icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
}
.action-icon-btn:hover {
  border-color: #0f172a;
  color: #0f172a;
  background: #f1f5f9;
}
.action-icon-btn.delete-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

/* ════════════════════════════════ REVIEWS ══════ */
.reviews-list-flat {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-item-flat {
  display: flex;
  gap: 16px;
  border-bottom: 1px dashed #cbd5e1;
  padding-bottom: 16px;
}
.review-item-flat:last-child {
  border-bottom: none;
}
.review-avatar-flat {
  width: 48px;
  height: 48px;
  border: 1px solid #0f172a;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.review-details-flat {
  flex-grow: 1;
  min-width: 0;
}
.review-product-name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}
.review-comment {
  font-size: 13px;
  line-height: 1.5;
}
.review-meta {
  font-size: 11px;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.meta-dot {
  color: #cbd5e1;
}

/* ════════════════════════════════ DIALOGS ══════ */
.dialog-frame-flat {
  background: #ffffff;
  border: 1px solid #0f172a;
  box-shadow: 8px 8px 0px #0f172a;
  border-radius: 0 !important;
  max-height: 90vh;
}
.dialog-scroll-body {
  max-height: 70vh;
  overflow-y: auto;
}
.dialog-close-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-close-btn:hover {
  color: #ef4444;
}

.image-preview-frame {
  border: 1px solid #0f172a;
  background: #f8fafc;
}
.carousel-img-flat {
  border: none;
}

.chip-close-btn {
  background: transparent;
  border: none;
  font-weight: bold;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  color: #94a3b8;
  padding: 0 2px;
}
.chip-close-btn:hover {
  color: #ef4444;
}

.bullet-btn-flat {
  height: 36px;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.bullet-btn-flat:hover {
  border-color: #0f172a;
  background: #f8fafc;
}

/* ════════════════════════════════ ALERTS ═══════ */
.custom-flat-alert {
  border-radius: 0 !important;
  font-size: 13px !important;
  border: 1px solid currentColor !important;
}
.error-alert {
  color: #dc2626 !important;
  background: #fef2f2 !important;
}
.warning-alert {
  color: #d97706 !important;
  background: #fffbeb !important;
}
.info-alert {
  color: #0f766e !important;
  background: #f0fdfa !important;
}

/* Input Fields overrides */
.flat-text-field :deep(.v-field) {
  border-radius: 0 !important;
  border: 1px solid #cbd5e1 !important;
  background: #ffffff !important;
  box-shadow: none !important;
}
.flat-text-field :deep(.v-field--focused) {
  border-color: #0f172a !important;
}
.flat-text-field :deep(.v-field__outline) {
  display: none !important;
}
.search-text-field {
  max-width: 320px;
}

/* ════════════════════════════════ BUTTONS ══════ */
.btn-flat-solid {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.btn-flat-solid:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}
.btn-flat-solid:disabled {
  background: #cbd5e1;
  border-color: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-flat-outline {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.btn-flat-outline:hover:not(:disabled) {
  border-color: #0f172a;
  background: #f8fafc;
}
.btn-flat-outline:disabled {
  border-color: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-with-icon {
  gap: 6px;
}

/* Custom Badges */
.custom-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border: 1px solid currentColor;
  display: inline-flex;
  align-items: center;
}
.badge-teal {
  color: #0f766e;
  background: #f0fdfa;
}
.badge-slate {
  color: #64748b;
  background: #f8fafc;
}

/* ════════════════════════════════ RESPONSIVE ═════ */
@media (max-width: 959px) {
  .admin-topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  .topbar-actions {
    width: 100%;
  }
  .topbar-actions button,
  .topbar-actions a {
    flex: 1;
    min-width: 120px;
    text-align: center;
  }
  .search-text-field {
    max-width: 100%;
    width: 100%;
  }
}

@media (max-width: 599px) {
  .bespoke-admin-container {
    padding: 24px 16px 60px !important;
  }
  .dialog-actions-flat {
    flex-direction: column;
    align-items: stretch;
  }
  .dialog-actions-flat button {
    width: 100%;
  }
}
</style>
