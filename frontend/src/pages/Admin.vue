<template>
  <v-app-bar
    border="b"
    :color="isDarkTheme ? '#121824' : 'teal-darken-2'"
    flat
    height="64"
    location="top"
  >
    <div class="d-flex align-center ga-3 px-3 px-md-6 w-100">
      <v-btn
        v-if="canShowAdmin"
        :aria-label="navigationToggleLabel"
        icon="mdi-menu"
        rounded="lg"
        variant="text"
        @click="toggleNavigation"
      />

      <div class="d-inline-flex align-center ga-3 flex-shrink-0">
        <v-avatar color="surface" rounded="lg" size="42" variant="flat">
          <v-img alt="Mindstore logo" class="brand-logo" src="../assets/logo.svg" width="32" />
        </v-avatar>
        <div>
          <p class="text-subtitle-1 font-weight-bold mb-0">Mindstores Admin</p>
        </div>
      </div>

      <v-spacer />

      <div v-if="canShowAdmin" class="ml-4 align-center ga-2 d-none d-lg-flex">
        <v-chip color="blue-lighten-4" variant="outlined">
          {{ formatNumber(products.length) }} products
        </v-chip>
        <v-chip :color="lowStockCount > 0 ? 'yellow-darken-3' : 'teal-lighten-5'" variant="outlined">
          {{ formatNumber(lowStockCount) }} low stock
        </v-chip>
        <v-chip border color="light-blue-lighten-4" variant="outlined">
          {{ lastSyncedLabel }}
        </v-chip>
      </div>

      <v-spacer />

      <v-menu v-model="isUserMenuOpen" :color="isDarkTheme ? 'teal-accent-2' : 'teal-darken-2'" location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-tooltip location="bottom">
            <template #activator="{ props: tooltipProps }">
              <v-btn v-bind="mergeProps(menuProps, tooltipProps)" icon rounded="xl" variant="tonal">
                <v-avatar v-if="currentUserImage" size="38">
                  <v-img :alt="userName" cover :src="currentUserImage" />
                </v-avatar>
                <v-avatar v-else color="teal-accent-4" size="38">
                  <span class="text-white font-weight-light">{{ userInitials }}</span>
                </v-avatar>
                <span class="d-none d-xl-inline text-truncate">{{ userName }}</span>
              </v-btn>
            </template>
            {{ userName }}
          </v-tooltip>
        </template>

        <v-list class="pa-2" density="compact" nav rounded="lg">
          <v-list-item class="mb-2" rounded="lg" :subtitle="currentUserEmail" :title="userName">
            <template #prepend>
              <v-avatar v-if="currentUserImage" size="32">
                <v-img :alt="userName" cover :src="currentUserImage" />
              </v-avatar>
              <v-avatar v-else color="teal-accent-4" size="32">
                <span class="text-white font-weight-light">{{ userInitials }}</span>
              </v-avatar>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item rounded="lg" to="/">
            <template #prepend>
              <v-icon>mdi-store-outline</v-icon>
            </template>
            <v-list-item-title>Storefront</v-list-item-title>
          </v-list-item>
          <v-list-item rounded="lg" @click="toggleTheme">
            <template #prepend>
              <v-icon>mdi-theme-light-dark</v-icon>
            </template>
            <v-list-item-title>Theme</v-list-item-title>
            <template #append>
              <span class="text-caption font-weight-bold ml-2">{{ isDarkTheme ? 'Dark' : 'Light' }}</span>
              <v-icon end size="16" class="ml-1">{{ isDarkTheme ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
            </template>
          </v-list-item>
          <v-list-item v-if="isAuthenticated" rounded="lg" @click="logout">
            <template #prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
          <v-list-item v-else to="/login">
            <template #prepend>
              <v-icon>mdi-login</v-icon>
            </template>
            <v-list-item-title>Login</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </v-app-bar>
  <v-navigation-drawer
    v-if="canShowAdmin"
    v-model="drawer"
    border="e"
    elevation="0"
    :permanent="!isMobile"
    :rail="!isMobile && desktopDrawerRail"
    rail-width="61"
    :style="{ backgroundColor: isDarkTheme ? '#121824' : '#FFFFFF' }"
    :temporary="isMobile"
    width="220"
  >
    <v-list density="compact" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.id"
        :active="activePanel === item.id"
        :color="isDarkTheme ? 'teal-accent-2' : 'teal-darken-3'"
        rounded="lg"
        @click="selectPanel(item.id)"
      >
        <template #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
  <v-main class="admin-page" :style="{ backgroundColor: isDarkTheme ? '#090d16' : '#F5F7FA' }">
    <v-container class="pa-4 pa-md-5" fluid>
      <v-row v-if="authLoading" align="center" justify="center">
        <v-col cols="12" lg="5" md="7">
          <v-card variant="outlined">
            <v-card-text class="py-10 text-center">
              <v-progress-circular color="teal-darken-3" indeterminate size="42" />
              <div class="text-h6 font-weight-bold mt-4">Checking admin session</div>
              <div class="text-body-2 text-medium-emphasis">Please wait while access is verified.</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-else-if="isAuthenticated && !isAdmin" align="center" justify="center">
        <v-col cols="12" lg="6" md="8">
          <v-card variant="outlined">
            <v-card-text class="pa-6">
              <v-alert title="Admin access denied" type="error" variant="tonal">
                {{ currentUserEmail || "This account" }} is not on the admin access list.
              </v-alert>

              <v-row class="mt-4" dense>
                <v-col cols="12" sm="6">
                  <v-card color="surface" variant="outlined">
                    <v-card-text>
                      <div class="text-caption text-medium-emphasis">Default admin</div>
                      <div class="text-body-1 font-weight-medium text-break">{{ defaultAdminEmail }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-card color="surface" variant="outlined">
                    <v-card-text>
                      <div class="text-caption text-medium-emphasis">Current session</div>
                      <div class="text-body-1 font-weight-medium">Signed in</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <v-card-actions class="px-0 pb-0 pt-5">
                <v-btn to="/" variant="text">
                  <v-icon start>mdi-store-outline</v-icon>
                  Storefront
                </v-btn>
              </v-card-actions>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <template v-else-if="canShowAdmin">
        <v-row align="center" class="mb-5" dense>
          <v-col cols="12" lg="5" md="6">
            <div class="d-flex align-center flex-wrap ga-2">
              <div class="text-h5 text-md-h4 font-weight-bold">{{ activePanelLabel }}</div>
              <v-chip v-if="adminSearchResult" color="teal-darken-1" size="small" variant="tonal">
                {{ adminSearchResult }}
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis">{{ lastSyncedLabel }}</div>
          </v-col>
          <v-col cols="12" lg="7" md="6">
            <v-form class="d-flex flex-column flex-lg-row justify-md-end ga-2" @submit.prevent="runAdminSearch">
              <v-text-field
                v-model="adminQuickSearch"
                clearable
                density="comfortable"
                hide-details
                label="Search admin"
                max-width="360"
                prepend-inner-icon="mdi-magnify"
                rounded="lg"
                variant="outlined"
                @click:clear="clearAdminQuickSearch"
                @keydown.enter.prevent="runAdminSearch"
              />
              <div class="d-flex ga-2 justify-end">
                <v-btn
                  aria-label="Run admin search"
                  color="teal-darken-1"
                  height="48"
                  min-width="48"
                  rounded="lg"
                  type="submit"
                  variant="tonal"
                >
                  <v-icon icon="mdi-magnify" />
                  <v-tooltip activator="parent" location="bottom">Search</v-tooltip>
                </v-btn>
                <v-btn
                  color="teal-darken-1"
                  height="48"
                  :loading="isRefreshing"
                  prepend-icon="mdi-refresh"
                  rounded="lg"
                  text="Refresh"
                  variant="flat"
                  @click="refreshAdminData"
                />
              </div>
            </v-form>
          </v-col>
        </v-row>

        <div v-if="activePanel === 'dashboard'">
          <v-row dense>
            <v-col
              v-for="metric in metricCards"
              :key="metric.label"
              cols="12"
              lg="3"
              md="6"
              sm="6"
            >
              <v-card border rounded="lg" variant="flat">
                <v-card-text class="d-flex align-center justify-space-between ga-4">
                  <div class="overflow-hidden">
                    <div class="text-caption text-medium-emphasis">{{ metric.label }}</div>
                    <div class="text-h6 font-weight-bold text-truncate">{{ metric.value }}</div>
                  </div>
                  <v-avatar :color="metric.color" size="48" variant="tonal">
                    <v-icon :color="metric.color">{{ metric.icon }}</v-icon>
                  </v-avatar>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row class="mt-2" dense>
            <v-col cols="12" lg="4" md="6">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Inventory Health</v-card-title>
                <v-card-text class="d-flex flex-column ga-4">
                  <div v-for="segment in inventoryHealthSegments" :key="segment.key">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="d-flex align-center ga-2">
                        <v-icon :color="segment.color" size="18">{{ segment.icon }}</v-icon>
                        <span class="font-weight-medium">{{ segment.label }}</span>
                      </div>
                      <span class="text-medium-emphasis">{{ formatNumber(segment.count) }}</span>
                    </div>
                    <v-progress-linear :color="segment.color" height="10" :model-value="segment.percent" rounded />
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" lg="4" md="6">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Price Spread</v-card-title>
                <v-card-text class="d-flex flex-column ga-4">
                  <div v-for="band in priceBandStats" :key="band.key">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="font-weight-medium">{{ band.label }}</span>
                      <span class="text-medium-emphasis">{{ formatNumber(band.count) }}</span>
                    </div>
                    <v-progress-linear :color="band.color" height="10" :model-value="band.percent" rounded />
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" lg="4" md="12">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Catalog Readiness</v-card-title>
                <v-card-text>
                  <div class="d-flex align-center ga-5 flex-wrap">
                    <v-progress-circular color="teal-darken-1" :model-value="productImageCoverage" size="92" width="10">
                      {{ productImageCoverage }}%
                    </v-progress-circular>
                    <div class="flex-grow-1">
                      <div class="text-body-1 font-weight-medium">Image coverage</div>
                      <div class="text-body-2 text-medium-emphasis">
                        {{ formatNumber(productsWithImagesCount) }} of {{ formatNumber(products.length) }} products
                      </div>
                    </div>
                  </div>
                  <v-row class="mt-4" dense>
                    <v-col v-for="stat in catalogReadinessStats" :key="stat.label" cols="12" sm="4">
                      <v-sheet border class="pa-3 h-100" rounded="lg">
                        <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
                        <div class="text-body-1 font-weight-bold">{{ stat.value }}</div>
                      </v-sheet>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row class="mt-2" dense>
            <v-col cols="12" lg="8">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="d-flex align-center justify-space-between ga-3 my-2">
                  <span>Recent Inventory</span>
                  <v-chip color="teal-darken-1" size="small" variant="tonal">{{ filteredProducts.length }}</v-chip>
                </v-card-title>
                <v-card-text>
                  <v-text-field
                    v-model="productSearch"
                    density="comfortable"
                    hide-details
                    label="Search products"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                  />
                  <v-data-table
                    class="mt-4"
                    density="comfortable"
                    :headers="recentProductHeaders"
                    :items="recentProducts"
                    :items-per-page="5"
                    :loading="productLoading"
                  >
                    <template #item.name="{ item }">
                      <div class="d-flex align-center ga-3 py-2">
                        <ProductImageDialog
                          v-if="productImageUrl(resolveTableItem(item))"
                          :alt="`${resolveTableItem(item)?.name || 'Product'} image`"
                          avatar-class="rounded-lg"
                          :dialog-title="resolveTableItem(item)?.name || 'Product image'"
                          :size="44"
                          :src="productImageUrl(resolveTableItem(item))"
                        />
                        <v-avatar v-else color="surface" rounded="lg" size="44">
                          <v-icon color="primary">mdi-image-off-outline</v-icon>
                        </v-avatar>
                        <div class="overflow-hidden">
                          <div class="font-weight-medium text-truncate">{{ resolveTableItem(item)?.name }}</div>
                          <div class="text-caption text-medium-emphasis">{{ resolveTableItem(item)?.company ||
                            "Mindstores" }}</div>
                        </div>
                      </div>
                    </template>
                    <template #item.price="{ item }">
                      {{ formatProductPrice(resolveTableItem(item)) }}
                    </template>
                    <template #item.stock="{ item }">
                      <v-chip :color="stockStatus(resolveTableItem(item)).color" size="small" variant="tonal">
                        {{ stockStatus(resolveTableItem(item)).label }}
                      </v-chip>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" lg="4">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Operations</v-card-title>
                <v-list class=" ma-2 rounded-lg pa-1" density="comfortable" lines="two">
                  <v-list-item
                    v-for="item in operationsSummary"
                    :key="item.title"
                    rounded="lg"
                    :subtitle="item.subtitle"
                    :title="item.title"
                  >
                    <template #prepend>
                      <v-avatar :color="item.color" size="42" variant="tonal">
                        <v-icon :color="item.color">{{ item.icon }}</v-icon>
                      </v-avatar>
                    </template>
                    <template #append>
                      <span class="font-weight-bold">{{ item.value }}</span>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-row class="mt-2" dense>
            <v-col cols="12" lg="4" md="6">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Category Mix</v-card-title>
                <v-card-text class="d-flex flex-column ga-4">
                  <div v-for="category in categoryStats" :key="category.name">
                    <div class="d-flex justify-space-between mb-2">
                      <span class="font-weight-medium">{{ category.name }}</span>
                      <span class="text-medium-emphasis">{{ category.count }}</span>
                    </div>
                    <v-progress-linear color="primary" height="10" :model-value="category.percent" rounded />
                  </div>
                  <v-alert v-if="categoryStats.length === 0" type="info" variant="tonal">
                    No category data
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" lg="4" md="6">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Top Shelf Value</v-card-title>
                <v-list class="ma-2 rounded-lg pa-1" density="comfortable" lines="two">
                  <v-list-item
                    v-for="product in topCatalogValueProducts"
                    :key="product.product_id || product.name"
                    rounded="lg"
                    :subtitle="product.category_display"
                    :title="product.name"
                  >
                    <template #prepend>
                      <ProductImageDialog
                        v-if="productImageUrl(product)"
                        :alt="`${product.name || 'Product'} image`"
                        avatar-class="rounded-lg"
                        :dialog-title="product.name || 'Product image'"
                        :size="42"
                        :src="productImageUrl(product)"
                      />
                      <v-avatar v-else color="surface" rounded="lg" size="42">
                        <v-icon color="primary">mdi-image-off-outline</v-icon>
                      </v-avatar>
                    </template>
                    <template #append>
                      <div class="text-right">
                        <div class="font-weight-bold">{{ formatCurrency(product.shelf_value) }}</div>
                        <div class="text-caption text-medium-emphasis">{{ formatNumber(product.stock) }} units</div>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
                <v-card-text v-if="topCatalogValueProducts.length === 0">
                  <v-alert type="info" variant="tonal">No product value data</v-alert>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" lg="4" md="12">
              <v-card border class="h-100" rounded="lg" variant="flat">
                <v-card-title class="my-2">Access Snapshot</v-card-title>
                <v-list class=" ma-2 rounded-lg pa-1" density="comfortable" lines="two">
                  <v-list-item
                    v-for="entry in adminAccessEntries.slice(0, 5)"
                    :key="entry.email"
                    :subtitle="accessEntrySubtitle(entry)"
                    :title="entry.email"
                  >
                    <template #prepend>
                      <v-avatar :color="entry.is_default ? 'success' : 'primary'" size="42" variant="tonal">
                        <v-icon :color="entry.is_default ? 'success' : 'primary'">
                          {{ entry.is_default ? "mdi-shield-star-outline" : "mdi-shield-account-outline" }}
                        </v-icon>
                      </v-avatar>
                    </template>
                    <template #append>
                      <v-chip v-if="entry.is_current_user" color="info" size="small" variant="tonal">You</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-card v-else-if="activePanel === 'search'" border rounded="lg" variant="flat">
          <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
            <div>
              <div>Search Results</div>
              <div class="text-body-2 text-medium-emphasis">
                <HighlightText :query="globalSearchQuery" :text="globalSearchQuery" />
              </div>
            </div>
            <v-chip color="teal-darken-1" variant="tonal">
              {{ formatNumber(globalSearchResultCount) }} matches
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-alert v-if="globalSearchGroups.length === 0" type="info" variant="tonal">
              No matching admin records found.
            </v-alert>
            <v-row v-else dense>
              <v-col v-for="group in globalSearchGroups" :key="group.id" cols="12" lg="6">
                <v-card border class="h-100" rounded="lg" variant="flat">
                  <v-card-title class="d-flex align-center justify-space-between ga-3 my-2">
                    <span>{{ group.label }}</span>
                    <v-chip size="small" variant="tonal">{{ formatNumber(group.items.length) }}</v-chip>
                  </v-card-title>
                  <v-list class="pa-2" density="comfortable" lines="two">
                    <v-list-item
                      v-for="result in group.items"
                      :key="result.id"
                      rounded="lg"
                      @click="openGlobalSearchResult(result)"
                    >
                      <template #prepend>
                        <v-avatar :color="result.color" size="40" variant="tonal">
                          <v-icon :color="result.color">{{ result.icon }}</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title>
                        <HighlightText :query="globalSearchQuery" :text="result.title" />
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        <HighlightText :query="globalSearchQuery" :text="result.subtitle" />
                      </v-list-item-subtitle>
                      <template #append>
                        <v-chip size="x-small" variant="tonal">{{ result.meta }}</v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-else-if="activePanel === 'users'" border rounded="lg" variant="flat">
          <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
            <span>User Management</span>
            <v-btn
              color="teal-darken-1"
              :loading="userLoading"
              prepend-icon="mdi-refresh"
              rounded="lg"
              text="Users"
              variant="flat"
              @click="fetchUsers"
            />
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="userSearch"
                  density="comfortable"
                  hide-details
                  label="Search users"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="userRoleFilter"
                  density="comfortable"
                  hide-details
                  item-title="title"
                  item-value="value"
                  :items="userRoleOptions"
                  label="Role"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-data-table
              class="mt-4"
              density="comfortable"
              :headers="userHeaders"
              :items="filteredUsers"
              :items-per-page="8"
              :loading="userLoading"
            >
              <template #item.name="{ item }">
                <div class="d-flex align-center ga-3 py-2">
                  <v-avatar color="teal-darken-1" size="38" variant="tonal">
                    <v-img
                      v-if="userImageUrl(resolveTableItem(item))"
                      :alt="resolveTableItem(item)?.name || resolveTableItem(item)?.email || 'User profile'"
                      cover
                      :src="userImageUrl(resolveTableItem(item))"
                    />
                    <span v-else class="font-weight-bold">{{ initialsFor(resolveTableItem(item)?.name ||
                      resolveTableItem(item)?.email) }}</span>
                  </v-avatar>
                  <div class="overflow-hidden">
                    <div class="font-weight-medium text-truncate">
                      <HighlightText :query="activeHighlightQuery" :text="resolveTableItem(item)?.name || 'User'" />
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                      <HighlightText :query="activeHighlightQuery" :text="resolveTableItem(item)?.email" />
                    </div>
                  </div>
                </div>
              </template>
              <template #item.is_admin="{ item }">
                <v-chip :color="resolveTableItem(item)?.is_admin ? 'success' : 'default'" size="small" variant="tonal">
                  {{ resolveTableItem(item)?.is_admin ? "Admin" : "Customer" }}
                </v-chip>
              </template>
              <template #item.updated_at="{ item }">
                {{ formatDate(resolveTableItem(item)?.updated_at) }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <v-card v-else-if="activePanel === 'products'" border rounded="lg" variant="flat">
          <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
            <span>Product Management</span>
            <div class="d-flex flex-column flex-sm-row ga-2">
              <v-btn
                color="teal-darken-1"
                prepend-icon="mdi-download-outline"
                rounded="lg"
                text="Export CSV"
                variant="outlined"
                @click="downloadFilteredProducts"
              />
              <v-btn
                color="teal-darken-1"
                prepend-icon="mdi-plus"
                rounded="lg"
                text="Add Product"
                variant="flat"
                @click="openAddDialog"
              />
            </div>
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="productSearch"
                  density="comfortable"
                  hide-details
                  label="Search products"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <v-select
                  v-model="categoryFilter"
                  density="comfortable"
                  hide-details
                  item-title="title"
                  item-value="value"
                  :items="categoryFilterOptions"
                  label="Category"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <v-select
                  v-model="stockFilter"
                  density="comfortable"
                  hide-details
                  item-title="title"
                  item-value="value"
                  :items="stockFilterOptions"
                  label="Stock"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-data-table
              class=" mt-4"
              density="comfortable"
              :headers="productHeaders"
              :items="filteredProducts"
              :items-per-page="8"
              :loading="productLoading"
            >
              <template #item.name="{ item }">
                <div class="d-flex align-center ga-3 py-2">
                  <ProductImageDialog
                    v-if="productImageUrl(resolveTableItem(item))"
                    :alt="`${resolveTableItem(item)?.name || 'Product'} image`"
                    avatar-class="rounded-lg"
                    :dialog-title="resolveTableItem(item)?.name || 'Product image'"
                    :size="44"
                    :src="productImageUrl(resolveTableItem(item))"
                  />
                  <v-avatar v-else color="surface" rounded="lg" size="44">
                    <v-icon color="primary">mdi-image-off-outline</v-icon>
                  </v-avatar>
                  <div class="overflow-hidden">
                    <div class="font-weight-medium text-truncate">
                      <HighlightText :query="activeHighlightQuery" :text="resolveTableItem(item)?.name" />
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      <HighlightText :query="activeHighlightQuery" :text="resolveTableItem(item)?.product_id" />
                    </div>
                  </div>
                </div>
              </template>
              <template #item.category_display="{ item }">
                <HighlightText :query="activeHighlightQuery" :text="formatCategory(resolveTableItem(item))" />
              </template>
              <template #item.owner_email="{ item }">
                <div class="text-body-2">
                  <HighlightText :query="activeHighlightQuery" :text="formatProductOwner(resolveTableItem(item))" />
                </div>
                <v-chip
                  v-if="resolveTableItem(item)?.catalog_source === 'user_admin'"
                  color="info"
                  size="x-small"
                  variant="tonal"
                >
                  User Admin
                </v-chip>
              </template>
              <template #item.price="{ item }">
                {{ formatProductPrice(resolveTableItem(item)) }}
              </template>
              <template #item.stock="{ item }">
                <v-chip :color="stockStatus(resolveTableItem(item)).color" size="small" variant="tonal">
                  {{ resolveTableItem(item)?.stock || 0 }}
                </v-chip>
              </template>
              <template #item.actions="{ item }">
                <div class="d-flex align-center">
                  <v-btn
                    aria-label="Edit product"
                    icon
                    size="small"
                    variant="text"
                    @click="editProduct(resolveTableItem(item))"
                  >
                    <v-icon icon="mdi-pencil-outline" />
                    <v-tooltip activator="parent" location="top">Edit</v-tooltip>
                  </v-btn>
                  <v-btn
                    aria-label="Delete product"
                    color="error"
                    icon
                    size="small"
                    variant="text"
                    @click="deleteProduct(resolveTableItem(item))"
                  >
                    <v-icon icon="mdi-delete-outline" />
                    <v-tooltip activator="parent" location="top">Delete</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <v-card v-else-if="activePanel === 'planner'" border rounded="lg" variant="flat">
          <v-card-title class="d-flex flex-column flex-lg-row align-lg-center justify-space-between ga-3 my-2">
            <div>
              <div>Inventory Planner</div>
              <div class="text-body-2 text-medium-emphasis">
                Build a reorder plan from live stock, not guesswork.
              </div>
            </div>
            <div class="d-flex flex-column flex-sm-row ga-2">
              <v-btn
                color="teal-darken-1"
                prepend-icon="mdi-content-copy"
                rounded="lg"
                text="Copy brief"
                variant="outlined"
                @click="copyRestockBrief"
              />
              <v-btn
                color="teal-darken-1"
                prepend-icon="mdi-download-outline"
                rounded="lg"
                text="Export CSV"
                variant="flat"
                @click="downloadRestockPlan"
              />
            </div>
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" lg="4">
                <v-card class="h-100" rounded="lg" variant="outlined">
                  <v-card-title class="my-2">Planning controls</v-card-title>
                  <v-card-text class="d-flex flex-column ga-4">
                    <div>
                      <div class="d-flex align-center justify-space-between mb-2">
                        <span class="font-weight-medium">Target stock per SKU</span>
                        <v-chip color="teal-darken-1" size="small" variant="tonal">
                          {{ formatNumber(restockTargetStock) }}
                        </v-chip>
                      </div>
                      <v-slider
                        v-model="restockTargetStock"
                        color="teal-darken-1"
                        hide-details
                        max="50"
                        min="5"
                        step="1"
                        thumb-label
                      />
                    </div>
                    <v-text-field
                      v-model="restockSearch"
                      density="comfortable"
                      hide-details
                      label="Search products"
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                    />
                    <v-select
                      v-model="restockUrgencyFilter"
                      density="comfortable"
                      hide-details
                      item-title="title"
                      item-value="value"
                      :items="restockUrgencyOptions"
                      label="Urgency"
                      variant="outlined"
                    />
                    <v-alert color="teal-darken-1" icon="mdi-lightbulb-on-outline" variant="tonal">
                      The planner uses retail shelf value, because supplier cost is not stored yet.
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="8">
                <v-row dense>
                  <v-col v-for="metric in restockMetricCards" :key="metric.label" cols="12" md="6">
                    <v-card class="h-100" rounded="lg" variant="outlined">
                      <v-card-text class="d-flex align-center justify-space-between ga-4">
                        <div>
                          <div class="text-caption text-medium-emphasis">{{ metric.label }}</div>
                          <div class="text-h6 font-weight-bold">{{ metric.value }}</div>
                          <div class="text-caption text-medium-emphasis">{{ metric.caption }}</div>
                        </div>
                        <v-avatar :color="metric.color" size="48" variant="tonal">
                          <v-icon :color="metric.color">{{ metric.icon }}</v-icon>
                        </v-avatar>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>

            <v-row class="mt-2" dense>
              <v-col cols="12" lg="8">
                <v-card class="h-100" rounded="lg" variant="outlined">
                  <v-card-title class="d-flex align-center justify-space-between ga-3 my-2">
                    <span>Recommended reorder queue</span>
                    <v-chip color="teal-darken-1" size="small" variant="tonal">
                      {{ formatNumber(filteredRestockPlan.length) }} SKUs
                    </v-chip>
                  </v-card-title>
                  <v-card-text>
                    <v-alert v-if="filteredRestockPlan.length === 0" type="success" variant="tonal">
                      No matching products need restocking at the current target.
                    </v-alert>
                    <v-data-table
                      v-else
                      density="comfortable"
                      :headers="restockHeaders"
                      :items="filteredRestockPlan"
                      :items-per-page="6"
                    >
                      <template #item.name="{ item }">
                        <div class="d-flex align-center ga-3 py-2">
                          <ProductImageDialog
                            v-if="productImageUrl(resolveTableItem(item))"
                            :alt="`${resolveTableItem(item)?.name || 'Product'} image`"
                            avatar-class="rounded-lg"
                            :dialog-title="resolveTableItem(item)?.name || 'Product image'"
                            :size="42"
                            :src="productImageUrl(resolveTableItem(item))"
                          />
                          <v-avatar v-else color="surface" rounded="lg" size="42">
                            <v-icon color="primary">mdi-image-off-outline</v-icon>
                          </v-avatar>
                          <div>
                            <div class="font-weight-medium">
                              <HighlightText :query="activeHighlightQuery" :text="resolveTableItem(item)?.name" />
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              <HighlightText
                                :query="activeHighlightQuery"
                                :text="resolveTableItem(item)?.category_display"
                              />
                            </div>
                          </div>
                        </div>
                      </template>
                      <template #item.urgency_label="{ item }">
                        <v-chip :color="resolveTableItem(item)?.urgency_color" size="small" variant="tonal">
                          {{ resolveTableItem(item)?.urgency_label }}
                        </v-chip>
                      </template>
                      <template #item.reorder_quantity="{ item }">
                        {{ formatNumber(resolveTableItem(item)?.reorder_quantity) }}
                      </template>
                      <template #item.reorder_value="{ item }">
                        {{ formatCurrency(resolveTableItem(item)?.reorder_value) }}
                      </template>
                      <template #item.actions="{ item }">
                        <v-btn
                          aria-label="Edit restock product"
                          icon
                          size="small"
                          variant="text"
                          @click="editProduct(resolveTableItem(item))"
                        >
                          <v-icon icon="mdi-pencil-outline" />
                          <v-tooltip activator="parent" location="top">Edit product</v-tooltip>
                        </v-btn>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="4">
                <v-card class="mb-2" rounded="lg" variant="outlined">
                  <v-card-title class="my-2">Category pressure</v-card-title>
                  <v-card-text class="d-flex flex-column ga-4">
                    <div v-for="category in restockCategorySummary" :key="category.name">
                      <div class="d-flex justify-space-between mb-2">
                        <span class="font-weight-medium">{{ category.name }}</span>
                        <span class="text-medium-emphasis">{{ formatNumber(category.units) }} units</span>
                      </div>
                      <v-progress-linear color="warning" height="10" :model-value="category.percent" rounded />
                      <div class="text-caption text-medium-emphasis mt-1">
                        {{ formatCurrency(category.value) }} shelf value
                      </div>
                    </div>
                    <v-alert v-if="restockCategorySummary.length === 0" type="success" variant="tonal">
                      No pressure by category.
                    </v-alert>
                  </v-card-text>
                </v-card>

                <v-card rounded="lg" variant="outlined">
                  <v-card-title class="my-2">Next best action</v-card-title>
                  <v-card-text>
                    <template v-if="topRestockRecommendation">
                      <div class="d-flex align-center ga-3 mb-4">
                        <v-avatar :color="topRestockRecommendation.urgency_color" size="44" variant="tonal">
                          <v-icon :color="topRestockRecommendation.urgency_color">mdi-clipboard-alert-outline</v-icon>
                        </v-avatar>
                        <div>
                          <div class="font-weight-medium">{{ topRestockRecommendation.name }}</div>
                          <div class="text-body-2 text-medium-emphasis">
                            Add {{ formatNumber(topRestockRecommendation.reorder_quantity) }} units now
                          </div>
                        </div>
                      </div>
                      <v-list density="compact">
                        <v-list-item :subtitle="formatNumber(topRestockRecommendation.stock)" title="Current stock" />
                        <v-list-item :subtitle="topRestockRecommendation.urgency_label" title="Urgency" />
                        <v-list-item
                          :subtitle="formatCurrency(topRestockRecommendation.reorder_value)"
                          title="Shelf value to recover"
                        />
                      </v-list>
                    </template>
                    <v-alert v-else type="success" variant="tonal">
                      Inventory is already at the selected target.
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-else-if="activePanel === 'logs'" border rounded="lg" variant="flat">
          <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
            <span>Notifications</span>
            <v-select
              v-model="logTypeFilter"
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              :items="logTypeOptions"
              max-width="220"
              variant="outlined"
            />
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col v-for="log in filteredActivityLogs" :key="log.id" cols="12" md="6">
                <v-card border class="h-100" rounded="lg" variant="flat">
                  <v-card-text class="d-flex ga-4">
                    <v-avatar :color="log.color" size="44" variant="tonal">
                      <v-icon :color="log.color">{{ log.icon }}</v-icon>
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium">
                        <HighlightText :query="activeHighlightQuery" :text="log.title" />
                      </div>
                      <div class="text-body-2 text-medium-emphasis">
                        <HighlightText :query="activeHighlightQuery" :text="log.message" />
                      </div>
                      <div class="text-caption text-medium-emphasis mt-1">
                        <HighlightText :query="activeHighlightQuery" :text="log.time" />
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-row v-else dense>
          <v-col cols="12" lg="4">
            <v-card border class="h-100" rounded="lg" variant="flat">
              <v-card-title class="my-2">Add Admin Email</v-card-title>
              <v-card-text>
                <v-form @submit.prevent="addAdminAccess">
                  <v-text-field
                    v-model="accessEmailInput"
                    autocomplete="email"
                    density="comfortable"
                    :error-messages="accessEmailError ? [accessEmailError] : []"
                    label="Email"
                    prepend-inner-icon="mdi-email-outline"
                    variant="outlined"
                  />
                  <v-btn
                    block
                    color="teal-darken-1"
                    :disabled="Boolean(accessEmailError) || !accessEmailInput"
                    :loading="accessSaving"
                    prepend-icon="mdi-shield-plus-outline"
                    rounded="lg"
                    text="Add Access"
                    type="submit"
                    variant="flat"
                  />
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="8">
            <v-card border rounded="lg" variant="flat">
              <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
                <span>Admin Access Control</span>
                <v-text-field
                  v-model="accessSearch"
                  density="compact"
                  hide-details
                  label="Search emails"
                  max-width="320"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />
              </v-card-title>
              <v-card-text>
                <v-data-table
                  density="comfortable"
                  :headers="accessHeaders"
                  :items="filteredAdminAccess"
                  :items-per-page="6"
                  :loading="accessLoading"
                >
                  <template #item.email="{ item }">
                    <div class="py-2">
                      <div class="font-weight-medium text-break">
                        <HighlightText :query="activeHighlightQuery" :text="resolveTableItem(item)?.email" />
                      </div>
                      <div class="d-flex flex-wrap ga-2 mt-1">
                        <v-chip
                          v-if="resolveTableItem(item)?.is_default"
                          color="success"
                          size="x-small"
                          variant="tonal"
                        >Default</v-chip>
                        <v-chip
                          v-if="resolveTableItem(item)?.is_current_user"
                          color="info"
                          size="x-small"
                          variant="tonal"
                        >You</v-chip>
                      </div>
                    </div>
                  </template>
                  <template #item.updated_at="{ item }">
                    {{ formatDate(resolveTableItem(item)?.updated_at || resolveTableItem(item)?.created_at) }}
                  </template>
                  <template #item.actions="{ item }">
                    <div class="d-flex align-center">
                      <v-btn
                        aria-label="Edit admin access"
                        :disabled="!resolveTableItem(item)?.can_edit"
                        icon
                        size="small"
                        variant="text"
                        @click="openEditAdminAccess(resolveTableItem(item))"
                      >
                        <v-icon icon="mdi-pencil-outline" />
                        <v-tooltip activator="parent" location="top">Edit</v-tooltip>
                      </v-btn>
                      <v-btn
                        aria-label="Delete admin access"
                        color="error"
                        :disabled="!resolveTableItem(item)?.can_delete"
                        icon
                        size="small"
                        variant="text"
                        @click="deleteAdminAccess(resolveTableItem(item))"
                      >
                        <v-icon icon="mdi-delete-outline" />
                        <v-tooltip activator="parent" location="top">Delete</v-tooltip>
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card border rounded="lg" variant="flat">
              <v-card-title class="my-2">Security Rules</v-card-title>
              <v-card-text>
                <v-row dense>
                  <v-col
                    v-for="rule in securityRules"
                    :key="rule.title"
                    cols="12"
                    md="3"
                    sm="6"
                  >
                    <v-card class="h-100" rounded="lg" variant="outlined">
                      <v-card-text>
                        <v-avatar class="mb-3" :color="rule.color" size="42" variant="tonal">
                          <v-icon :color="rule.color">{{ rule.icon }}</v-icon>
                        </v-avatar>
                        <div class="font-weight-medium">{{ rule.title }}</div>
                        <div class="text-body-2 text-medium-emphasis">{{ rule.value }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <v-row v-else align="center" justify="center">
        <v-col cols="12" lg="5" md="7">
          <v-card variant="outlined">
            <v-card-text class="py-10 text-center">
              <v-progress-circular color="teal-darken-3" indeterminate size="42" />
              <div class="text-h6 font-weight-bold mt-4">Redirecting to login</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>

  <v-dialog v-model="productDialog" max-width="1180" scrollable>
    <v-card>
      <v-card-title>{{ editMode ? "Edit Product" : "Add Product" }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="saveProduct">
          <v-row dense>
            <v-col cols="12" md="8">
              <v-row class="ga-4" dense>
                <v-col cols="12" md="12">
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
                <v-col cols="12" md="12">
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
                  <v-carousel-item v-for="(imageUrl, index) in productImageGallery" :key="`${imageUrl}-${index}`">
                    <v-img :alt="`Product preview ${index + 1}`" cover height="180" :src="imageUrl" />
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
                  {{ index === 0 ? "Primary image" : `Image ${index + 1}` }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                density="comfortable"
                label="Product name"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.company" density="comfortable" label="Brand" variant="outlined" />
            </v-col>
            <v-col class="d-flex flex-column ga-1" cols="12" md="1">
              <v-btn
                v-for="option in DESCRIPTION_BULLET_OPTIONS"
                :key="option.symbol"
                :aria-label="option.label"
                class="text-headline-large"
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
                v-model="formData.description"
                auto-grow
                density="comfortable"
                label="Description"
                rows="7"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="formData.price_currency"
                density="comfortable"
                :items="PRICE_CURRENCY_OPTIONS"
                label="Country currency"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.price"
                density="comfortable"
                label="Price"
                :prefix="selectedPriceCurrency"
                required
                type="number"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.stock"
                density="comfortable"
                label="Stock"
                required
                type="number"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-combobox
                v-model="formData.category"
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
                v-model="formData.subcategory"
                density="comfortable"
                :disabled="!normalizeCategoryName(formData.category)"
                :items="availableSubcategories"
                label="Subcategory (optional)"
                variant="outlined"
              >
                <template #append-item>
                  <v-divider class="mt-2" />
                  <v-list-item
                    :disabled="!normalizeCategoryName(formData.category)"
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
        <v-btn variant="text" @click="productDialog = false">Cancel</v-btn>
        <v-btn color="teal-darken-1" :loading="productSaving" variant="flat" @click="saveProduct">
          {{ editMode ? "Update" : "Add" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="catalogOptionDialog" max-width="460">
    <v-card>
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
        <v-btn variant="text" @click="catalogOptionDialog = false">Cancel</v-btn>
        <v-btn color="primary" :loading="catalogOptionSaving" variant="flat" @click="saveCatalogOption">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="accessEditDialog" max-width="520">
    <v-card>
      <v-card-title>Edit Admin Email</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="accessEditEmail"
          autocomplete="email"
          density="comfortable"
          :error-messages="accessEditEmailError ? [accessEditEmailError] : []"
          label="Email"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="accessEditDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="Boolean(accessEditEmailError)"
          :loading="accessSaving"
          variant="flat"
          @click="saveAdminAccessEdit"
        >
          Update
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" location="top" timeout="3000">
    {{ snackbarText }}
  </v-snackbar>
</template>

<script setup>
  import axios from "axios";
  import { computed, h, mergeProps, ref, watch } from "vue";
  import { useRouter } from "vue-router";
  import { useDisplay, useTheme } from "vuetify";
  import ProductImageDialog from "@/components/ProductImageDialog.vue";
  import { useAppStore } from "@/stores/app";
  import { API_URL, buildAuthenticatedRequestConfig } from "@/utils/api";
  import { convertAmountToUsd, fetchExchangeRates } from "@/utils/currency";
  import { safeDisplayImageUrl, safeDisplayImageUrls } from "@/utils/images";
  import { clearProductsCache } from "@/utils/productCache";
  import {
    extractProductItems,
    requestProductApi,
  } from "@/utils/products";

  const HighlightText = {
    props: {
      query: {
        type: String,
        default: "",
      },
      text: {
        type: [String, Number],
        default: "",
      },
    },
    setup(props) {
      return () =>
        h(
          "span",
          highlightTextSegments(props.text, props.query).map((segment, index) =>
            h(
              "span",
              {
                key: `${index}-${segment.text}`,
                class: segment.match ? "bg-yellow-lighten-3 text-teal-darken-4 font-weight-bold rounded px-1" : undefined,
              },
              segment.text,
            ),
          ),
        );
    },
  };


  const DEFAULT_ADMIN_EMAIL = "lakshsolanki848@gmail.com";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DEFAULT_PRICE_CURRENCY = "USD";
  const MAX_PRODUCT_IMAGE_FILE_BYTES = 512 * 1024;
  const MAX_PRODUCT_IMAGE_DATA_URL_LENGTH = 700_000;
  const MAX_PRODUCT_IMAGE_COUNT = 6;
  const DEFAULT_RESTOCK_TARGET = 12;
  const DESCRIPTION_BULLET_OPTIONS = [
    { symbol: "-", label: "Add dash bullet" },
    { symbol: "•", label: "Add dot bullet" },
    { symbol: "‣", label: "Add triangle bullet" },
  ];
  const PRICE_CURRENCY_OPTIONS = [
    { title: "United States (USD)", value: "USD" },
    { title: "India (INR)", value: "INR" },
    { title: "United Kingdom (GBP)", value: "GBP" },
    { title: "Europe (EUR)", value: "EUR" },
  ];

  const router = useRouter();
  const appStore = useAppStore();
  const { smAndDown } = useDisplay();

  const theme = useTheme();
  const isDarkTheme = computed(() => theme.global.name.value === "dark");
  const toggleTheme = () => {
    const nextTheme = theme.global.name.value === "dark" ? "light" : "dark";
    theme.global.name.value = nextTheme;
    localStorage.setItem("mindstore_theme", nextTheme);
  };

  const drawer = ref(!smAndDown.value);
  const desktopDrawerRail = ref(true);
  const activePanel = ref("dashboard");
  const products = ref([]);
  const users = ref([]);
  const adminAccessEntries = ref([]);
  const productLoading = ref(false);
  const userLoading = ref(false);
  const accessLoading = ref(false);
  const productSaving = ref(false);
  const accessSaving = ref(false);
  const productDialog = ref(false);
  const catalogOptionDialog = ref(false);
  const accessEditDialog = ref(false);
  const editMode = ref(false);
  const currentProductId = ref(null);
  const categoryRecords = ref([]);
  const productSearch = ref("");
  const categoryFilter = ref("all");
  const stockFilter = ref("all");
  const userSearch = ref("");
  const userRoleFilter = ref("all");
  const accessSearch = ref("");
  const accessEmailInput = ref("");
  const accessEditOriginalEmail = ref("");
  const accessEditEmail = ref("");
  const logTypeFilter = ref("all");
  const activitySearch = ref("");
  const restockTargetStock = ref(DEFAULT_RESTOCK_TARGET);
  const restockSearch = ref("");
  const restockUrgencyFilter = ref("all");
  const lastSyncedAt = ref(null);
  const adminQuickSearch = ref("");
  const adminSearchResult = ref("");
  const globalSearchQuery = ref("");
  const isUserMenuOpen = ref(false);
  const productImageFiles = ref([]);
  const productImageInputValue = ref("");
  const catalogOptionType = ref("category");
  const catalogOptionInput = ref("");
  const catalogOptionSaving = ref(false);
  const snackbar = ref(false);
  const snackbarText = ref("");
  const snackbarColor = ref("success");

  const formData = ref({
    name: "",
    company: "",
    description: "",
    price: 0,
    price_currency: DEFAULT_PRICE_CURRENCY,
    category: "",
    subcategory: "",
    stock: 0,
    image_url: "",
    image_urls: [],
  });

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "mdi-view-dashboard-outline" },
    { id: "users", label: "Users", icon: "mdi-account-group-outline" },
    { id: "products", label: "Products", icon: "mdi-package-variant-closed" },
    { id: "planner", label: "Planner", icon: "mdi-clipboard-list-outline" },
    { id: "logs", label: "Notifications", icon: "mdi-bell-outline" },
    { id: "settings", label: "Settings", icon: "mdi-cog-outline" },
  ];

  const productHeaders = [
    { title: "Product", key: "name" },
    { title: "Brand", key: "company" },
    { title: "Added By", key: "owner_email" },
    { title: "Category", key: "category_display" },
    { title: "Price", key: "price" },
    { title: "Stock", key: "stock" },
    { title: "Actions", key: "actions", sortable: false },
  ];
  const recentProductHeaders = [
    { title: "Product", key: "name" },
    { title: "Price", key: "price" },
    { title: "Stock", key: "stock" },
  ];
  const userHeaders = [
    { title: "User", key: "name" },
    { title: "Role", key: "is_admin" },
    { title: "Country", key: "country_code" },
    { title: "Updated", key: "updated_at" },
  ];
  const accessHeaders = [
    { title: "Email", key: "email" },
    { title: "Updated", key: "updated_at" },
    { title: "Actions", key: "actions", sortable: false },
  ];
  const restockHeaders = [
    { title: "Product", key: "name" },
    { title: "Urgency", key: "urgency_label" },
    { title: "Stock", key: "stock" },
    { title: "Target", key: "target_stock" },
    { title: "Add", key: "reorder_quantity" },
    { title: "Shelf value", key: "reorder_value" },
    { title: "Actions", key: "actions", sortable: false },
  ];
  const stockFilterOptions = [
    { title: "All stock", value: "all" },
    { title: "Active", value: "active" },
    { title: "Low", value: "low" },
    { title: "Out", value: "out" },
  ];
  const userRoleOptions = [
    { title: "All roles", value: "all" },
    { title: "Admins", value: "admin" },
    { title: "Customers", value: "customer" },
  ];
  const logTypeOptions = [
    { title: "All notifications", value: "all" },
    { title: "Warnings", value: "warning" },
    { title: "Access", value: "access" },
    { title: "System", value: "system" },
  ];
  const restockUrgencyOptions = [
    { title: "All urgency", value: "all" },
    { title: "Critical", value: "critical" },
    { title: "High", value: "high" },
    { title: "Planned", value: "planned" },
  ];
  const adminSearchTargets = [
    {
      panel: "dashboard",
      label: "Dashboard",
      keywords: ["dashboard", "overview", "home"],
    },
    {
      panel: "users",
      label: "Users",
      keywords: ["users", "user", "customers", "customer", "accounts", "roles"],
    },
    {
      panel: "products",
      label: "Products",
      keywords: ["products", "product", "productes", "catalog", "stock", "price", "category"],
    },
    {
      panel: "planner",
      label: "Planner",
      keywords: ["planner", "plan", "restock", "reorder", "inventory planner"],
    },
    {
      panel: "logs",
      label: "Notifications",
      keywords: ["notifications", "notification", "logs", "activity", "warnings", "warning", "system", "api"],
    },
    {
      panel: "settings",
      label: "Settings",
      keywords: ["settings", "admin access", "access control", "email access", "security"],
    },
  ];

  const isMobile = computed(() => smAndDown.value);
  const navigationToggleLabel = computed(() => {
    if (isMobile.value) {
      return drawer.value ? "Close admin navigation" : "Open admin navigation";
    }
    return desktopDrawerRail.value ? "Expand admin navigation" : "Collapse admin navigation";
  });
  const authLoading = computed(() => Boolean(appStore.loading));
  const isAuthenticated = computed(() => Boolean(appStore.isAuthenticated));
  const isAdmin = computed(() => Boolean(appStore.user?.is_admin));
  const canShowAdmin = computed(() => !authLoading.value && isAuthenticated.value && isAdmin.value);
  const userName = computed(() => appStore.user?.name || appStore.user?.email || "Guest");
  const currentUserEmail = computed(() => normalizeEmail(appStore.user?.email));
  const currentUserImage = computed(() =>
    safeDisplayImageUrl(appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url),
  );
  const defaultAdminEmail = computed(() => DEFAULT_ADMIN_EMAIL);
  const activePanelLabel = computed(() => {
    if (activePanel.value === "search") {
      return "Search Results";
    }
    return navItems.find((item) => item.id === activePanel.value)?.label || "Admin";
  });
  const activeHighlightQuery = computed(() => {
    if (activePanel.value === "search") {
      return globalSearchQuery.value;
    }
    if (activePanel.value === "products") {
      return productSearch.value;
    }
    if (activePanel.value === "users") {
      return userSearch.value;
    }
    if (activePanel.value === "settings") {
      return accessSearch.value;
    }
    if (activePanel.value === "planner") {
      return restockSearch.value;
    }
    if (activePanel.value === "logs") {
      return activitySearch.value;
    }
    return "";
  });
  const isRefreshing = computed(() => productLoading.value || userLoading.value || accessLoading.value);
  const lastSyncedLabel = computed(() => (lastSyncedAt.value ? `Synced ${formatDate(lastSyncedAt.value)}` : "Ready"));
  const userInitials = computed(() => initialsFor(userName.value));
  const selectedPriceCurrency = computed(() => normalizeProductCurrency(formData.value.price_currency));
  const productImageGallery = computed(() => safeDisplayImageUrls(formData.value.image_urls, formData.value.image_url));
  const catalogOptionDialogTitle = computed(() =>
    catalogOptionType.value === "subcategory" ? "Add Subcategory" : "Add Category",
  );
  const catalogOptionInputLabel = computed(() =>
    catalogOptionType.value === "subcategory" ? "Subcategory name" : "Category name",
  );

  const metricCards = computed(() => [
    {
      label: "Products",
      value: formatNumber(products.value.length),
      icon: "mdi-package-variant-closed",
      color: "primary",
    },
    {
      label: "Inventory units",
      value: formatNumber(totalInventoryUnits.value),
      icon: "mdi-counter",
      color: "info",
    },
    {
      label: "Catalog value",
      value: formatCurrency(totalCatalogValue.value),
      icon: "mdi-cash-multiple",
      color: "success",
    },
    {
      label: "Admins",
      value: formatNumber(adminAccessEntries.value.length),
      icon: "mdi-shield-account-outline",
      color: "warning",
    },
  ]);

  const operationsSummary = computed(() => [
    {
      title: "Low stock",
      subtitle: "Products below 5 units",
      value: formatNumber(lowStockCount.value),
      icon: "mdi-alert-outline",
      color: lowStockCount.value > 0 ? "warning" : "success",
    },
    {
      title: "Users",
      subtitle: "Backend user profiles",
      value: formatNumber(users.value.length),
      icon: "mdi-account-group-outline",
      color: "info",
    },
    {
      title: "Average price",
      subtitle: "Current catalog",
      value: formatCurrency(averagePrice.value),
      icon: "mdi-tag-outline",
      color: "primary",
    },
    {
      title: "Restock queue",
      subtitle: `Target ${formatNumber(restockTargetStock.value)} units`,
      value: formatNumber(restockPlan.value.length),
      icon: "mdi-clipboard-list-outline",
      color: restockPlan.value.length > 0 ? "warning" : "success",
    },
  ]);

  const securityRules = computed(() => [
    {
      title: "Protected default",
      value: DEFAULT_ADMIN_EMAIL,
      icon: "mdi-shield-star-outline",
      color: "success",
    },
    {
      title: "Self protection",
      value: currentUserEmail.value || "Active session",
      icon: "mdi-account-lock-outline",
      color: "info",
    },
    {
      title: "Database source",
      value: "admin_access",
      icon: "mdi-database-check-outline",
      color: "primary",
    },
    {
      title: "API base",
      value: API_URL,
      icon: "mdi-api",
      color: "warning",
    },
  ]);

  const catalogCategoryRecords = computed(() => {
    const records = new Map();
    for (const record of categoryRecords.value) {
      mergeCatalogRecord(records, record.category);
      for (const subcategory of record.subcategories || []) {
        mergeCatalogRecord(records, record.category, subcategory);
      }
    }
    for (const product of products.value) {
      mergeCatalogRecord(records, product.category, product.subcategory);
    }
    return serializeCatalogRecords(records);
  });

  const categoryOptions = computed(() => {
    const currentCategory = normalizeCategoryName(formData.value.category);
    const categories = new Set(
      catalogCategoryRecords.value
        .map((record) => normalizeCategoryName(record.category))
        .filter(Boolean),
    );
    if (currentCategory) {
      categories.add(currentCategory);
    }
    return [...categories].toSorted((left, right) => left.localeCompare(right));
  });

  const categoryFilterOptions = computed(() => {
    const categories = new Set(catalogCategoryRecords.value.map((record) => normalizeCategoryName(record.category)).filter(Boolean));
    return [
      { title: "All categories", value: "all" },
      ...[...categories].toSorted((left, right) => left.localeCompare(right)).map((category) => ({ title: category, value: category })),
    ];
  });

  const availableSubcategories = computed(() => {
    const selectedCategory = normalizeCategoryName(formData.value.category);
    const matchedSubcategories = selectedCategory
      ? catalogCategoryRecords.value
        .find((record) => normalizeCategoryName(record.category) === selectedCategory)
        ?.subcategories || []
      : catalogCategoryRecords.value.flatMap((record) => record.subcategories || []);
    const selectedSubcategory = normalizeSubcategoryName(formData.value.category, formData.value.subcategory);
    const subcategories = new Set(matchedSubcategories);
    if (selectedSubcategory) {
      subcategories.add(selectedSubcategory);
    }
    return [...subcategories].toSorted((left, right) => left.localeCompare(right));
  });

  const filteredProducts = computed(() =>
    products.value.filter((product) => {
      const query = normalizeText(productSearch.value).toLowerCase();
      const matchesSearch = !query || productMatchesQuery(product, query);

      const matchesCategory = categoryFilter.value === "all" || normalizeCategoryName(product.category) === categoryFilter.value;
      const status = stockStatus(product).key;
      const matchesStock = stockFilter.value === "all" || status === stockFilter.value;

      return matchesSearch && matchesCategory && matchesStock;
    }),
  );

  const recentProducts = computed(() =>
    filteredProducts.value
      .toSorted((left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0))
      .slice(0, 8),
  );

  const filteredUsers = computed(() =>
    users.value.filter((user) => {
      const query = normalizeText(userSearch.value).toLowerCase();
      const matchesSearch = !query || userMatchesQuery(user, query);
      const matchesRole =
        userRoleFilter.value === "all" ||
        (userRoleFilter.value === "admin" && user.is_admin) ||
        (userRoleFilter.value === "customer" && !user.is_admin);
      return matchesSearch && matchesRole;
    }),
  );

  const filteredAdminAccess = computed(() => {
    const query = normalizeText(accessSearch.value).toLowerCase();
    if (!query) {
      return adminAccessEntries.value;
    }
    return adminAccessEntries.value.filter((entry) => adminAccessMatchesQuery(entry, query));
  });

  const totalInventoryUnits = computed(() => products.value.reduce((total, product) => total + Number(product.stock || 0), 0));
  const totalCatalogValue = computed(() =>
    products.value.reduce((total, product) => total + Number(product.price || 0) * Number(product.stock || 0), 0),
  );
  const averagePrice = computed(() => {
    if (products.value.length === 0) {
      return 0;
    }
    return products.value.reduce((total, product) => total + Number(product.price || 0), 0) / products.value.length;
  });
  const lowStockCount = computed(() => products.value.filter((product) => Number(product.stock || 0) < 5).length);
  const lowStockProducts = computed(() =>
    products.value
      .filter((product) => Number(product.stock || 0) < 5)
      .toSorted((left, right) => Number(left.stock || 0) - Number(right.stock || 0))
      .slice(0, 6),
  );
  const inventoryHealthSegments = computed(() => {
    const rows = [
      { key: "active", label: "Active stock", icon: "mdi-check-circle-outline", color: "success" },
      { key: "low", label: "Low stock", icon: "mdi-alert-outline", color: "warning" },
      { key: "out", label: "Out of stock", icon: "mdi-close-octagon-outline", color: "error" },
    ];
    const totalProducts = products.value.length;
    return rows.map((row) => {
      const count = products.value.filter((product) => stockStatus(product).key === row.key).length;
      return {
        ...row,
        count,
        percent: totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0,
      };
    });
  });
  const priceBandStats = computed(() => {
    const bands = [
      { key: "budget", label: "Under $25", color: "success", matches: (price) => price < 25 },
      { key: "core", label: "$25 - $99", color: "primary", matches: (price) => price >= 25 && price < 100 },
      { key: "premium", label: "$100+", color: "warning", matches: (price) => price >= 100 },
    ];
    const totalProducts = products.value.length;
    return bands.map((band) => {
      const count = products.value.filter((product) => band.matches(Number(product.price || 0))).length;
      return {
        key: band.key,
        label: band.label,
        color: band.color,
        count,
        percent: totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0,
      };
    });
  });
  const productsWithImagesCount = computed(() =>
    products.value.filter((product) => safeDisplayImageUrls(product.image_urls, product.image_url).length > 0).length,
  );
  const productImageCoverage = computed(() =>
    products.value.length > 0 ? Math.round((productsWithImagesCount.value / products.value.length) * 100) : 0,
  );
  const catalogReadinessStats = computed(() => [
    {
      label: "Categories",
      value: formatNumber(catalogCategoryRecords.value.length),
    },
    {
      label: "Missing images",
      value: formatNumber(Math.max(0, products.value.length - productsWithImagesCount.value)),
    },
    {
      label: "Low stock",
      value: formatNumber(lowStockCount.value),
    },
  ]);
  const topCatalogValueProducts = computed(() =>
    products.value
      .map((product) => ({
        ...product,
        category_display: formatCategory(product),
        shelf_value: Number(product.price || 0) * Number(product.stock || 0),
        stock: Math.max(0, Math.trunc(Number(product.stock || 0))),
      }))
      .toSorted((left, right) => right.shelf_value - left.shelf_value)
      .slice(0, 5),
  );

  const restockPlan = computed(() =>
    products.value
      .map((product) => buildRestockPlanItem(product))
      .filter((item) => item.reorder_quantity > 0)
      .toSorted((left, right) => {
        if (left.urgency_rank !== right.urgency_rank) {
          return left.urgency_rank - right.urgency_rank;
        }
        if (left.reorder_quantity !== right.reorder_quantity) {
          return right.reorder_quantity - left.reorder_quantity;
        }
        return left.name.localeCompare(right.name);
      }),
  );

  const filteredRestockPlan = computed(() =>
    restockPlan.value.filter((item) => {
      const query = normalizeText(restockSearch.value).toLowerCase();
      const matchesSearch = !query || restockMatchesQuery(item, query);
      const matchesUrgency =
        restockUrgencyFilter.value === "all" || item.urgency_key === restockUrgencyFilter.value;
      return matchesSearch && matchesUrgency;
    }),
  );

  const restockUnitsNeeded = computed(() =>
    filteredRestockPlan.value.reduce((total, item) => total + item.reorder_quantity, 0),
  );
  const restockShelfValue = computed(() =>
    filteredRestockPlan.value.reduce((total, item) => total + item.reorder_value, 0),
  );
  const restockCriticalCount = computed(() =>
    filteredRestockPlan.value.filter((item) => item.urgency_key === "critical").length,
  );
  const topRestockRecommendation = computed(() => filteredRestockPlan.value[0] || null);

  const restockMetricCards = computed(() => [
    {
      label: "SKUs in plan",
      value: formatNumber(filteredRestockPlan.value.length),
      caption: "Products below target",
      icon: "mdi-package-variant-minus",
      color: "primary",
    },
    {
      label: "Units to replenish",
      value: formatNumber(restockUnitsNeeded.value),
      caption: `Target ${formatNumber(restockTargetStock.value)} units each`,
      icon: "mdi-counter",
      color: "info",
    },
    {
      label: "Critical SKUs",
      value: formatNumber(restockCriticalCount.value),
      caption: "Currently out of stock",
      icon: "mdi-alert-octagon-outline",
      color: restockCriticalCount.value > 0 ? "error" : "success",
    },
    {
      label: "Shelf value to recover",
      value: formatCurrency(restockShelfValue.value),
      caption: "Retail value represented by gaps",
      icon: "mdi-cash-sync",
      color: "success",
    },
  ]);

  const restockCategorySummary = computed(() => {
    const categories = new Map();
    for (const item of filteredRestockPlan.value) {
      const category = normalizeCategoryName(item.category) || "Other";
      const existing = categories.get(category) || { name: category, units: 0, value: 0, percent: 0 };
      existing.units += item.reorder_quantity;
      existing.value += item.reorder_value;
      categories.set(category, existing);
    }

    const maxUnits = Math.max(1, ...[...categories.values()].map((item) => item.units));
    return [...categories.values()]
      .map((item) => ({
        ...item,
        percent: Math.max(8, Math.round((item.units / maxUnits) * 100)),
      }))
      .toSorted((left, right) => right.units - left.units)
      .slice(0, 5);
  });

  const categoryStats = computed(() => {
    const stats = new Map();
    for (const product of products.value) {
      const category = normalizeCategoryName(product.category) || "Other";
      const existing = stats.get(category) || { name: category, count: 0, value: 0, percent: 0 };
      existing.count += 1;
      existing.value += Number(product.price || 0) * Number(product.stock || 0);
      stats.set(category, existing);
    }

    const maxCount = Math.max(1, ...[...stats.values()].map((item) => item.count));
    return [...stats.values()]
      .map((item) => ({
        ...item,
        percent: Math.max(8, Math.round((item.count / maxCount) * 100)),
      }))
      .toSorted((left, right) => right.count - left.count);
  });

  const accessEmailError = computed(() => {
    const email = normalizeEmail(accessEmailInput.value);
    if (!email) {
      return "";
    }
    if (!isValidEmail(email)) {
      return "Enter a valid email";
    }
    if (adminAccessEntries.value.some((entry) => entry.email === email)) {
      return "Email already has access";
    }
    return "";
  });

  const accessEditEmailError = computed(() => {
    const email = normalizeEmail(accessEditEmail.value);
    if (!email) {
      return "Email is required";
    }
    if (!isValidEmail(email)) {
      return "Enter a valid email";
    }
    if (email === DEFAULT_ADMIN_EMAIL) {
      return "Default admin email is protected";
    }
    if (
      email !== accessEditOriginalEmail.value &&
      adminAccessEntries.value.some((entry) => entry.email === email)
    ) {
      return "Email already has access";
    }
    return "";
  });

  const activityLogs = computed(() => {
    const logs = [];
    for (const product of lowStockProducts.value) {
      logs.push({
        id: `stock-${product.product_id}`,
        type: "warning",
        color: stockStatus(product).color,
        icon: "mdi-alert-outline",
        title: "Low stock",
        message: `${product.name} has ${formatNumber(product.stock || 0)} units`,
        time: formatDate(product.updated_at || product.created_at),
      });
    }

    for (const entry of adminAccessEntries.value.slice(0, 4)) {
      logs.push({
        id: `access-${entry.email}`,
        type: "access",
        color: entry.is_default ? "success" : "info",
        icon: entry.is_default ? "mdi-shield-star-outline" : "mdi-shield-account-outline",
        title: entry.is_default ? "Default admin active" : "Admin access active",
        message: entry.email,
        time: formatDate(entry.updated_at || entry.created_at),
      });
    }

    logs.push({
      id: "system-api",
      type: "system",
      color: "primary",
      icon: "mdi-api",
      title: "API connection",
      message: API_URL,
      time: lastSyncedLabel.value,
    });

    return logs;
  });

  const filteredActivityLogs = computed(() => {
    const query = normalizeText(activitySearch.value).toLowerCase();
    return activityLogs.value.filter((log) => {
      const matchesType = logTypeFilter.value === "all" || log.type === logTypeFilter.value;
      const matchesSearch = !query || activityLogMatchesQuery(log, query);
      return matchesType && matchesSearch;
    });
  });

  const globalSearchGroups = computed(() => {
    const query = normalizeText(globalSearchQuery.value).toLowerCase();
    if (!query) {
      return [];
    }

    return [
      buildSearchGroup("sections", "Admin sections", adminSectionSearchResults(query)),
      buildSearchGroup("products", "Products", productSearchResults(query)),
      buildSearchGroup("users", "Users", userSearchResults(query)),
      buildSearchGroup("settings", "Settings", settingsSearchResults(query)),
      buildSearchGroup("planner", "Planner", plannerSearchResults(query)),
      buildSearchGroup("logs", "Notifications", notificationSearchResults(query)),
    ].filter((group) => group.items.length > 0);
  });
  const globalSearchResultCount = computed(() =>
    globalSearchGroups.value.reduce((total, group) => total + group.items.length, 0),
  );

  watch(
    smAndDown,
    (mobile) => {
      drawer.value = !mobile;
    },
    { immediate: true },
  );

  watch(
    () => formData.value.category,
    (nextCategory) => {
      const normalizedCategory = normalizeCategoryName(nextCategory);
      if (normalizedCategory !== formData.value.category) {
        formData.value.category = normalizedCategory;
      }
      if (!normalizedCategory) {
        formData.value.subcategory = "";
      }
    },
  );

  watch(
    [authLoading, isAuthenticated],
    ([loading, signedIn]) => {
      if (!loading && !signedIn) {
        router.replace("/login");
      }
    },
    { immediate: true },
  );

  watch(
    canShowAdmin,
    (canAccess) => {
      if (canAccess) {
        refreshAdminData();
      }
    },
    { immediate: true },
  );

  function selectPanel(panel) {
    adminSearchResult.value = "";
    globalSearchQuery.value = "";
    activePanel.value = panel;
    if (isMobile.value) {
      drawer.value = false;
    }
  }

  function toggleNavigation() {
    if (isMobile.value) {
      drawer.value = !drawer.value;
      return;
    }

    drawer.value = true;
    desktopDrawerRail.value = !desktopDrawerRail.value;
  }

  function runAdminSearch() {
    const query = normalizeText(adminQuickSearch.value);
    if (!query) {
      clearAdminQuickSearch();
      return;
    }

    globalSearchQuery.value = query;
    clearSearchFilters();
    openPanelFromSearch("search", `Searching all admin: ${query}`);
  }

  function clearAdminQuickSearch() {
    adminQuickSearch.value = "";
    adminSearchResult.value = "";
    globalSearchQuery.value = "";
    clearSearchFilters();
    if (activePanel.value === "search") {
      activePanel.value = "dashboard";
    }
  }

  function openPanelFromSearch(panel, resultLabel) {
    activePanel.value = panel;
    adminSearchResult.value = resultLabel;
    if (isMobile.value) {
      drawer.value = false;
    }
  }

  function openGlobalSearchResult(result) {
    const query = result.applyQuery ? globalSearchQuery.value : "";
    if (result.panel === "products") {
      openProductsSearch(query);
      return;
    }
    if (result.panel === "users") {
      openUsersSearch(query);
      return;
    }
    if (result.panel === "settings") {
      openSettingsSearch(query);
      return;
    }
    if (result.panel === "planner") {
      openPlannerSearch(query);
      return;
    }
    if (result.panel === "logs") {
      openLogsSearch(query, result.logType || "");
      return;
    }

    clearSearchFilters();
    openPanelFromSearch(result.panel, `Opened ${result.title}`);
  }

  function openProductsSearch(query) {
    productSearch.value = query;
    categoryFilter.value = "all";
    stockFilter.value = "all";
    openPanelFromSearch("products", query ? `Searching products: ${query}` : "Opened Products");
  }

  function openUsersSearch(query) {
    userSearch.value = query;
    userRoleFilter.value = "all";
    openPanelFromSearch("users", query ? `Searching users: ${query}` : "Opened Users");
  }

  function openSettingsSearch(query) {
    accessSearch.value = query;
    openPanelFromSearch("settings", query ? `Searching access: ${query}` : "Opened Settings");
  }

  function openPlannerSearch(query) {
    restockSearch.value = query;
    restockUrgencyFilter.value = "all";
    openPanelFromSearch("planner", query ? `Searching planner: ${query}` : "Opened Planner");
  }

  function openLogsSearch(query, forcedType = "") {
    const resolvedType = forcedType || resolveLogTypeSearch(query);
    logTypeFilter.value = resolvedType || "all";
    activitySearch.value = forcedType ? query : (resolvedType ? "" : query);
    openPanelFromSearch("logs", query ? `Searching notifications: ${query}` : "Opened Notifications");
  }

  function clearSearchFilters() {
    productSearch.value = "";
    userSearch.value = "";
    accessSearch.value = "";
    restockSearch.value = "";
    activitySearch.value = "";
    categoryFilter.value = "all";
    stockFilter.value = "all";
    userRoleFilter.value = "all";
    restockUrgencyFilter.value = "all";
    logTypeFilter.value = "all";
  }

  function buildSearchGroup(id, label, items) {
    return { id, label, items };
  }

  function adminSectionSearchResults(query) {
    return adminSearchTargets
      .filter((target) => searchMatchesValues([target.label, ...target.keywords], query))
      .map((target) => {
        const navItem = navItems.find((item) => item.id === target.panel);
        return {
          id: `section-${target.panel}`,
          panel: target.panel,
          icon: navItem?.icon || "mdi-view-dashboard-outline",
          color: "teal-darken-1",
          title: target.label,
          subtitle: `Open ${target.label} section`,
          meta: "Section",
          applyQuery: false,
        };
      });
  }

  function productSearchResults(query) {
    return products.value
      .filter((product) => productMatchesQuery(product, query))
      .map((product, index) => ({
        id: `product-${product.product_id || index}`,
        panel: "products",
        icon: "mdi-package-variant-closed",
        color: stockStatus(product).color,
        title: product.name || "Product",
        subtitle: [product.company, formatProductOwner(product), formatCategory(product), product.product_id]
          .filter(Boolean)
          .join(" | "),
        meta: "Product",
        applyQuery: true,
      }));
  }

  function userSearchResults(query) {
    return users.value
      .filter((user) => userMatchesQuery(user, query))
      .map((user, index) => ({
        id: `user-${user.user_id || user.email || index}`,
        panel: "users",
        icon: user.is_admin ? "mdi-shield-account-outline" : "mdi-account-outline",
        color: user.is_admin ? "success" : "primary",
        title: user.name || user.email || "User",
        subtitle: [user.email, user.country_code, user.is_admin ? "Admin" : "Customer"].filter(Boolean).join(" | "),
        meta: user.is_admin ? "Admin" : "User",
        applyQuery: true,
      }));
  }

  function settingsSearchResults(query) {
    const staticResults = [
      {
        id: "settings-access-control",
        panel: "settings",
        icon: "mdi-shield-account-outline",
        color: "primary",
        title: "Admin Access Control",
        subtitle: "Settings for admin emails, protected access, default admin, and security rules",
        meta: "Settings",
        applyQuery: false,
      },
      {
        id: "settings-add-email",
        panel: "settings",
        icon: "mdi-email-plus-outline",
        color: "success",
        title: "Add Admin Email",
        subtitle: "Settings form for adding a new admin access email",
        meta: "Settings",
        applyQuery: false,
      },
    ].filter((result) => searchMatchesValues([result.title, result.subtitle, result.meta], query));

    const accessResults = adminAccessEntries.value
      .filter((entry) => adminAccessMatchesQuery(entry, query))
      .map((entry, index) => ({
        id: `access-${entry.email || index}`,
        panel: "settings",
        icon: entry.is_default ? "mdi-shield-star-outline" : "mdi-shield-account-outline",
        color: entry.is_default ? "success" : "primary",
        title: entry.email || "Admin access",
        subtitle: accessEntrySubtitle(entry),
        meta: entry.is_default ? "Default admin" : "Admin access",
        applyQuery: true,
      }));

    return [...staticResults, ...accessResults];
  }

  function plannerSearchResults(query) {
    return restockPlan.value
      .filter((item) => restockMatchesQuery(item, query))
      .map((item, index) => ({
        id: `planner-${item.product_id || index}`,
        panel: "planner",
        icon: "mdi-clipboard-list-outline",
        color: item.urgency_color,
        title: item.name || "Restock item",
        subtitle: `${item.category_display} | ${item.urgency_label} | add ${formatNumber(item.reorder_quantity)}`,
        meta: "Planner",
        applyQuery: true,
      }));
  }

  function notificationSearchResults(query) {
    return activityLogs.value
      .filter((log) => activityLogMatchesQuery(log, query))
      .map((log) => ({
        id: `log-${log.id}`,
        panel: "logs",
        icon: log.icon,
        color: log.color,
        title: log.title,
        subtitle: `${log.message} | ${log.time}`,
        meta: "Notification",
        logType: log.type,
        applyQuery: true,
      }));
  }

  function resolveLogTypeSearch(query) {
    const normalizedQuery = normalizeText(query).toLowerCase();
    const matchedOption = logTypeOptions.find((option) => {
      const title = normalizeText(option.title).toLowerCase();
      return option.value === normalizedQuery || title === normalizedQuery || title.includes(normalizedQuery);
    });
    return matchedOption?.value || "";
  }

  function productMatchesQuery(product, query) {
    return searchMatchesValues([
      product?.name,
      product?.company,
      product?.category,
      product?.subcategory,
      product?.category_display,
      formatCategory(product),
      productPriceCurrency(product),
      productPriceAmount(product),
      formatProductPrice(product),
      product?.stock,
      `${stockStatus(product).label} stock`,
      product?.product_id,
      product?.owner_email,
      product?.source_label,
      product?.catalog_source,
      formatProductOwner(product),
    ], query);
  }

  function userMatchesQuery(user, query) {
    return searchMatchesValues([
      user?.name,
      user?.email,
      user?.user_id,
      user?.country_code,
      user?.is_admin ? "admin" : "customer",
      user?.is_admin ? "admin user" : "customer user",
    ], query);
  }

  function adminAccessMatchesQuery(entry, query) {
    return searchMatchesValues([
      entry?.email,
      entry?.is_default ? "default" : "",
      entry?.is_current_user ? "you current user" : "",
    ], query);
  }

  function restockMatchesQuery(item, query) {
    return searchMatchesValues([
      item?.name,
      item?.company,
      item?.category,
      item?.subcategory,
      item?.category_display,
      item?.product_id,
      item?.urgency_label,
      `${item?.urgency_label || ""} restock`,
    ], query);
  }

  function activityLogMatchesQuery(log, query) {
    return searchMatchesValues([
      log?.title,
      log?.message,
      log?.type,
      log?.time,
    ], query);
  }

  function highlightTextSegments(value, query) {
    const text = normalizeText(value);
    const terms = splitSearchTerms(query);
    if (!text || terms.length === 0) {
      return [{ text, match: false }];
    }

    const lowerText = text.toLowerCase();
    const ranges = [];
    for (const term of terms) {
      let start = lowerText.indexOf(term);
      while (start !== -1) {
        ranges.push({ start, end: start + term.length });
        start = lowerText.indexOf(term, start + term.length);
      }
    }

    if (ranges.length === 0) {
      return [{ text, match: false }];
    }

    const mergedRanges = ranges
      .toSorted((left, right) => left.start - right.start || right.end - left.end)
      .reduce((merged, range) => {
        const previous = merged.at(-1);
        if (!previous || range.start > previous.end) {
          merged.push({ ...range });
          return merged;
        }
        previous.end = Math.max(previous.end, range.end);
        return merged;
      }, []);

    const segments = [];
    let cursor = 0;
    for (const range of mergedRanges) {
      if (range.start > cursor) {
        segments.push({ text: text.slice(cursor, range.start), match: false });
      }
      segments.push({ text: text.slice(range.start, range.end), match: true });
      cursor = range.end;
    }
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), match: false });
    }
    return segments;
  }

  function searchMatchesValues(values, query) {
    const terms = splitSearchTerms(query);
    if (terms.length === 0) {
      return true;
    }

    const text = searchableText(values);
    return terms.every((term) => text.includes(term));
  }

  function splitSearchTerms(query) {
    return [...new Set(normalizeText(query).toLowerCase().split(/\s+/).filter(Boolean))]
      .toSorted((left, right) => right.length - left.length);
  }

  function searchableText(values) {
    return values
      .filter((value) => value != null && value !== "")
      .map((value) => normalizeText(value))
      .join(" ")
      .toLowerCase();
  }

  function normalizeText(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
  }

  function isValidEmail(value) {
    const email = normalizeEmail(value);
    return email.length <= 320 && EMAIL_PATTERN.test(email);
  }

  function normalizeCategoryName(value) {
    return normalizeText(value).slice(0, 80);
  }

  function normalizeSubcategoryName(category, subcategory) {
    return normalizeText(subcategory).slice(0, 80);
  }

  function normalizeProductCurrency(value) {
    const code = normalizeText(value).toUpperCase();
    return PRICE_CURRENCY_OPTIONS.some((option) => option.value === code) ? code : DEFAULT_PRICE_CURRENCY;
  }

  function catalogKey(value) {
    return normalizeCategoryName(value).toLowerCase();
  }

  function mergeCatalogRecord(records, categoryValue, subcategoryValue = "") {
    const category = normalizeCategoryName(categoryValue);
    if (!category) {
      return;
    }

    const key = catalogKey(category);
    if (!records.has(key)) {
      records.set(key, { category, subcategories: new Set() });
    }

    const subcategory = normalizeSubcategoryName(category, subcategoryValue);
    if (subcategory) {
      records.get(key).subcategories.add(subcategory);
    }
  }

  function serializeCatalogRecords(records) {
    return [...records.values()]
      .map((record) => ({
        category: record.category,
        subcategories: [...record.subcategories].toSorted((left, right) => left.localeCompare(right)),
      }))
      .toSorted((left, right) => left.category.localeCompare(right.category));
  }

  function upsertLocalCategoryRecord(nextRecord) {
    const records = new Map();
    for (const record of categoryRecords.value) {
      mergeCatalogRecord(records, record.category);
      for (const subcategory of record.subcategories || []) {
        mergeCatalogRecord(records, record.category, subcategory);
      }
    }
    mergeCatalogRecord(records, nextRecord?.category);
    for (const subcategory of nextRecord?.subcategories || []) {
      mergeCatalogRecord(records, nextRecord.category, subcategory);
    }
    categoryRecords.value = serializeCatalogRecords(records);
  }

  function resolveTableItem(item) {
    return item?.raw || item?.item?.raw || item?.item || item || null;
  }

  function initialsFor(value) {
    const source = normalizeText(value) || "Admin";
    return (
      source
        .split(/\s|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.slice(0, 1).toUpperCase())
        .join("") || "A"
    );
  }

  function formatCurrency(value, currency = DEFAULT_PRICE_CURRENCY) {
    const normalizedCurrency = normalizeProductCurrency(currency);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: normalizedCurrency,
        maximumFractionDigits: 2,
      }).format(Number(value || 0));
    } catch {
      return `${normalizedCurrency} ${Number(value || 0).toFixed(2)}`;
    }
  }

  function productPriceCurrency(product) {
    return normalizeProductCurrency(product?.price_currency || product?.currency);
  }

  function productPriceAmount(product) {
    const amount = Number(product?.price_amount);
    return Number.isFinite(amount) ? amount : Number(product?.price || 0);
  }

  function formatProductPrice(product) {
    return formatCurrency(productPriceAmount(product), productPriceCurrency(product));
  }

  function formatProductOwner(product) {
    return normalizeEmail(product?.owner_email || product?.created_by || product?.updated_by) || "Private admin";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) {
      return "Not recorded";
    }
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return "Not recorded";
    }
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function formatCategory(product) {
    const mainCategory = normalizeCategoryName(product?.category) || "Other";
    const subcategory = normalizeSubcategoryName(mainCategory, product?.subcategory);
    return subcategory ? `${mainCategory} / ${subcategory}` : mainCategory;
  }

  function buildRestockPlanItem(product) {
    const stock = Math.max(0, Math.trunc(Number(product?.stock || 0)));
    const targetStock = Math.max(5, Math.trunc(Number(restockTargetStock.value || DEFAULT_RESTOCK_TARGET)));
    const reorderQuantity = Math.max(0, targetStock - stock);
    const price = Number(product?.price || 0);

    let urgency = {
      key: "planned",
      label: "Planned",
      color: "info",
      rank: 2,
    };
    if (stock <= 0) {
      urgency = {
        key: "critical",
        label: "Critical",
        color: "error",
        rank: 0,
      };
    } else if (stock < 5) {
      urgency = {
        key: "high",
        label: "High",
        color: "warning",
        rank: 1,
      };
    }

    return {
      ...product,
      category_display: formatCategory(product),
      stock,
      target_stock: targetStock,
      reorder_quantity: reorderQuantity,
      reorder_value: reorderQuantity * price,
      urgency_key: urgency.key,
      urgency_label: urgency.label,
      urgency_color: urgency.color,
      urgency_rank: urgency.rank,
    };
  }

  function productImageUrl(product) {
    return safeDisplayImageUrls(product?.image_urls, product?.image_url)[0] || "";
  }

  function userImageUrl(user) {
    return safeDisplayImageUrl(user?.picture || user?.photo_url || user?.photoURL);
  }

  function stockStatus(product) {
    const stock = Number(product?.stock || 0);
    if (stock <= 0) {
      return { key: "out", label: "Out", color: "error" };
    }
    if (stock < 5) {
      return { key: "low", label: "Low", color: "warning" };
    }
    return { key: "active", label: "Active", color: "success" };
  }

  function accessEntrySubtitle(entry) {
    if (entry.is_default) {
      return "Default admin";
    }
    if (entry.is_current_user) {
      return "Current session";
    }
    return entry.updated_by ? `Updated by ${entry.updated_by}` : "Admin";
  }

  function notify(message, color = "success") {
    snackbarText.value = message;
    snackbarColor.value = color;
    snackbar.value = true;
  }

  async function copyRestockBrief() {
    if (filteredRestockPlan.value.length === 0) {
      notify("No matching products need restocking", "info");
      return;
    }

    const lines = [
      `Mindstores reorder brief - target ${formatNumber(restockTargetStock.value)} units per SKU`,
      `SKUs in plan: ${formatNumber(filteredRestockPlan.value.length)}`,
      `Units to replenish: ${formatNumber(restockUnitsNeeded.value)}`,
      `Shelf value to recover: ${formatCurrency(restockShelfValue.value)}`,
      "",
      ...filteredRestockPlan.value.slice(0, 10).map((item) =>
        `- ${item.name}: add ${formatNumber(item.reorder_quantity)} units (${item.urgency_label}, stock ${formatNumber(item.stock)})`,
      ),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      notify("Reorder brief copied");
    } catch (error) {
      console.warn("Unable to copy reorder brief:", error);
      notify("Clipboard unavailable. Use CSV export instead.", "warning");
    }
  }

  function downloadRestockPlan() {
    if (filteredRestockPlan.value.length === 0) {
      notify("No matching products need restocking", "info");
      return;
    }

    const rows = [
      ["Product", "Product ID", "Category", "Urgency", "Current Stock", "Target Stock", "Units To Add", "Shelf Value"],
      ...filteredRestockPlan.value.map((item) => [
        item.name,
        item.product_id || "",
        item.category_display,
        item.urgency_label,
        item.stock,
        item.target_stock,
        item.reorder_quantity,
        item.reorder_value.toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => escapeCsv(value)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mindstores-restock-plan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Restock plan exported");
  }

  function downloadFilteredProducts() {
    if (filteredProducts.value.length === 0) {
      notify("No matching products to export", "info");
      return;
    }

    const rows = [
      [
        "Product",
        "Product ID",
        "Brand",
        "Added By",
        "Source",
        "Category",
        "Subcategory",
        "Price",
        "Currency",
        "Stock",
        "Image Count",
      ],
      ...filteredProducts.value.map((product) => [
        product.name,
        product.product_id || "",
        product.company || "",
        formatProductOwner(product),
        product.source_label || product.catalog_source || "Private Admin",
        normalizeCategoryName(product.category) || "Other",
        normalizeSubcategoryName(product.category, product.subcategory),
        productPriceAmount(product),
        productPriceCurrency(product),
        Math.max(0, Math.trunc(Number(product.stock || 0))),
        safeDisplayImageUrls(product.image_urls, product.image_url).length,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => escapeCsv(value)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mindstores-products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Product CSV exported");
  }

  function escapeCsv(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  async function runAdminRequest(requestFactory) {
    try {
      return await requestFactory(false);
    } catch (error) {
      if (error?.response?.status !== 401) {
        throw error;
      }

      try {
        await appStore.ensureBackendSession();
      } catch (sessionError) {
        console.warn("Backend session refresh failed. Retrying with a fresh Firebase token.", sessionError);
      }

      // Cross-origin product writes rely on the Firebase Bearer token, not the local cookie.
      return await requestFactory(true);
    }
  }

  async function buildAdminRequestConfig(config = {}, forceRefresh = false) {
    return await buildAuthenticatedRequestConfig(config, { forceRefresh });
  }

  async function refreshAdminData() {
    if (!canShowAdmin.value) {
      return;
    }

    await Promise.allSettled([fetchProducts(), fetchProductCategories(), fetchUsers(), fetchAdminAccess()]);
    lastSyncedAt.value = new Date();
  }

  async function fetchProducts() {
    if (!canShowAdmin.value) {
      return;
    }

    productLoading.value = true;
    try {
      const response = await runAdminRequest(async (forceRefresh) =>
        requestProductApi(
          "/products",
          await buildAdminRequestConfig(
            {
              params: {
                include_user_products: true,
                limit: 250,
                sort: "newest",
              },
            },
            forceRefresh,
          ),
        ),
      );
      products.value = extractProductItems(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      notify(error.response?.data?.message || "Failed to fetch products", "error");
    } finally {
      productLoading.value = false;
    }
  }

  async function fetchProductCategories() {
    if (!canShowAdmin.value) {
      return;
    }

    try {
      const response = await runAdminRequest(async (forceRefresh) =>
        requestProductApi(
          "/products/categories",
          await buildAdminRequestConfig({}, forceRefresh),
        ),
      );
      const items = Array.isArray(response.data) ? response.data : response.data?.items || [];
      const records = new Map();
      for (const item of items) {
        mergeCatalogRecord(records, item.category);
        for (const subcategory of item.subcategories || []) {
          mergeCatalogRecord(records, item.category, subcategory);
        }
      }
      categoryRecords.value = serializeCatalogRecords(records);
    } catch (error) {
      console.error("Failed to fetch product categories:", error);
      notify(error.response?.data?.message || "Failed to fetch product categories", "error");
    }
  }

  async function fetchUsers() {
    if (!canShowAdmin.value) {
      return;
    }

    userLoading.value = true;
    try {
      const response = await runAdminRequest(async (forceRefresh) =>
        axios.get(
          `${API_URL}/admin/users`,
          await buildAdminRequestConfig({ params: { page_size: 100 } }, forceRefresh),
        ),
      );
      users.value = Array.isArray(response.data) ? response.data : response.data?.items || [];
    } catch (error) {
      console.error("Failed to fetch users:", error);
      notify(error.response?.data?.message || "Failed to fetch users", "error");
    } finally {
      userLoading.value = false;
    }
  }

  async function fetchAdminAccess() {
    if (!canShowAdmin.value) {
      return;
    }

    accessLoading.value = true;
    try {
      const response = await runAdminRequest(async (forceRefresh) =>
        axios.get(`${API_URL}/admin/access`, await buildAdminRequestConfig({}, forceRefresh)),
      );
      adminAccessEntries.value = Array.isArray(response.data) ? response.data : response.data?.items || [];
    } catch (error) {
      console.error("Failed to fetch admin access:", error);
      notify(error.response?.data?.message || "Failed to fetch admin access", "error");
    } finally {
      accessLoading.value = false;
    }
  }

  function addDescriptionBullet(symbol) {
    const bullet = DESCRIPTION_BULLET_OPTIONS.some((option) => option.symbol === symbol) ? symbol : "-";
    const currentDescription = String(formData.value.description || "").trimEnd();
    formData.value.description = currentDescription ? `${currentDescription}\n${bullet} ` : `${bullet} `;
  }

  function splitProductImageInput(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function syncPrimaryProductImage() {
    formData.value.image_url = formData.value.image_urls[0] || "";
  }

  function updateProductImageUrls(value) {
    productImageInputValue.value = String(value || "");
    const urls = splitProductImageInput(productImageInputValue.value);
    const existingDataImages = formData.value.image_urls.filter((imageUrl) => imageUrl.startsWith("data:image/"));
    formData.value.image_urls = safeDisplayImageUrls([...existingDataImages, ...urls]).slice(0, MAX_PRODUCT_IMAGE_COUNT);
    syncPrimaryProductImage();
  }

  function resolveSelectedImageFiles(value) {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    if (typeof FileList !== "undefined" && value instanceof FileList) {
      return Array.from(value);
    }
    if (typeof File !== "undefined" && value instanceof File) {
      return [value];
    }
    if (typeof File !== "undefined") {
      const wrappedFile = value?.file || value?.raw || value?.rawFile;
      if (wrappedFile instanceof File) {
        return [wrappedFile];
      }
    }
    return value?.target?.files ? Array.from(value.target.files) : [];
  }

  function clearProductImageFiles() {
    productImageFiles.value = [];
  }

  function removeProductImage(index) {
    formData.value.image_urls = formData.value.image_urls.filter((_, imageIndex) => imageIndex !== index);
    syncPrimaryProductImage();
    productImageInputValue.value = formData.value.image_urls
      .filter((imageUrl) => imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
      .join("\n");
  }

  function readImageFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(new Error("Unable to read image file")));
      reader.readAsDataURL(file);
    });
  }

  async function onProductImagesSelected(value) {
    const files = resolveSelectedImageFiles(value);
    if (files.length === 0) {
      clearProductImageFiles();
      return;
    }

    const availableSlots = MAX_PRODUCT_IMAGE_COUNT - formData.value.image_urls.length;
    if (availableSlots <= 0) {
      clearProductImageFiles();
      notify(`Maximum ${MAX_PRODUCT_IMAGE_COUNT} images allowed`, "warning");
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      notify(`Only ${availableSlots} more image${availableSlots === 1 ? "" : "s"} can be added`, "warning");
    }

    const validFiles = selectedFiles.filter((file) => {
      if (!file.type?.startsWith("image/")) {
        notify("Please choose image files only", "warning");
        return false;
      }
      if (file.size > MAX_PRODUCT_IMAGE_FILE_BYTES) {
        notify("Each image must be 512KB or smaller.", "warning");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      clearProductImageFiles();
      return;
    }

    try {
      const results = await Promise.all(validFiles.map((file) => readImageFileAsDataUrl(file)));
      const safeImages = results.filter((result) => (
        result.startsWith("data:image/")
        && result.length <= MAX_PRODUCT_IMAGE_DATA_URL_LENGTH
        && Boolean(safeDisplayImageUrl(result))
      ));
      if (safeImages.length !== results.length) {
        notify("One or more selected images are unsupported or too large", "warning");
      }
      formData.value.image_urls = safeDisplayImageUrls([...formData.value.image_urls, ...safeImages]).slice(0, MAX_PRODUCT_IMAGE_COUNT);
      syncPrimaryProductImage();
      productImageFiles.value = [];
    } catch {
      clearProductImageFiles();
      notify("Unable to read one or more image files", "error");
    }
  }

  function openCatalogOptionDialog(type) {
    if (type === "subcategory" && !normalizeCategoryName(formData.value.category)) {
      notify("Select a category first", "warning");
      return;
    }
    catalogOptionType.value = type === "subcategory" ? "subcategory" : "category";
    catalogOptionInput.value = "";
    catalogOptionDialog.value = true;
  }

  async function saveCatalogOption() {
    const value = normalizeCategoryName(catalogOptionInput.value);
    if (!value) {
      notify(`${catalogOptionInputLabel.value} is required`, "warning");
      return;
    }

    const isSubcategory = catalogOptionType.value === "subcategory";
    const category = isSubcategory ? normalizeCategoryName(formData.value.category) : value;
    const subcategory = isSubcategory ? normalizeSubcategoryName(category, value) : "";
    if (!category) {
      notify("Category is required", "warning");
      return;
    }

    catalogOptionSaving.value = true;
    try {
      const response = await runAdminRequest(async (forceRefresh) =>
        requestProductApi(
          "/products/categories",
          {
            ...(await buildAdminRequestConfig({}, forceRefresh)),
            method: "post",
            data: { category, subcategory },
          },
        ),
      );
      upsertLocalCategoryRecord(response.data || { category, subcategories: subcategory ? [subcategory] : [] });
      formData.value.category = category;
      formData.value.subcategory = isSubcategory ? subcategory : "";
      catalogOptionDialog.value = false;
      notify(isSubcategory ? "Subcategory saved" : "Category saved");
    } catch (error) {
      console.error("Failed to save catalog option:", error);
      notify(error.response?.data?.message || "Failed to save catalog option", "error");
    } finally {
      catalogOptionSaving.value = false;
    }
  }

  function resetProductForm() {
    productImageFiles.value = [];
    productImageInputValue.value = "";
    formData.value = {
      name: "",
      company: "",
      description: "",
      price: 0,
      price_currency: DEFAULT_PRICE_CURRENCY,
      category: "",
      subcategory: "",
      stock: 0,
      image_url: "",
      image_urls: [],
    };
  }

  function openAddDialog() {
    editMode.value = false;
    currentProductId.value = null;
    resetProductForm();
    productDialog.value = true;
  }

  function editProduct(product) {
    const selectedProduct = resolveTableItem(product);
    if (!selectedProduct?.product_id) {
      notify("Product id not found", "error");
      return;
    }

    editMode.value = true;
    currentProductId.value = selectedProduct.product_id;
    productImageFiles.value = [];
    const selectedProductImages = safeDisplayImageUrls(selectedProduct.image_urls, selectedProduct.image_url);
    productImageInputValue.value = selectedProductImages
      .filter((imageUrl) => !imageUrl.startsWith("data:image/"))
      .join("\n");
    formData.value = {
      name: selectedProduct.name || "",
      company: selectedProduct.company || "",
      description: selectedProduct.description || "",
      price: productPriceAmount(selectedProduct),
      price_currency: productPriceCurrency(selectedProduct),
      category: normalizeCategoryName(selectedProduct.category),
      subcategory: normalizeSubcategoryName(selectedProduct.category, selectedProduct.subcategory),
      stock: Number(selectedProduct.stock || 0),
      image_url: selectedProductImages[0] || "",
      image_urls: selectedProductImages,
    };
    productDialog.value = true;
  }

  function buildProductPayload() {
    const priceCurrency = normalizeProductCurrency(formData.value.price_currency);
    const priceAmount = Number(formData.value.price);
    const basePrice = convertAmountToUsd(priceAmount, priceCurrency);
    const manualImageUrls = splitProductImageInput(productImageInputValue.value);
    const safeManualImageUrls = safeDisplayImageUrls(manualImageUrls);
    const imageUrls = safeDisplayImageUrls(formData.value.image_urls, formData.value.image_url).slice(0, MAX_PRODUCT_IMAGE_COUNT);
    const payload = {
      name: normalizeText(formData.value.name),
      company: normalizeText(formData.value.company),
      description: normalizeText(formData.value.description),
      category: normalizeCategoryName(formData.value.category),
      subcategory: normalizeSubcategoryName(formData.value.category, formData.value.subcategory),
      image_url: imageUrls[0] || "",
      image_urls: imageUrls,
      price: Number(basePrice.toFixed(2)),
      price_amount: priceAmount,
      price_currency: priceCurrency,
      currency: priceCurrency,
      stock: Math.max(0, Math.trunc(Number(formData.value.stock))),
    };

    if (!payload.name) return { error: "Product name is required" };
    if (!payload.category) return { error: "Category is required" };
    if (!Number.isFinite(payload.price_amount) || payload.price_amount < 0) return { error: "Price must be valid" };
    if (!Number.isFinite(payload.price) || payload.price < 0) return { error: "Price conversion must be valid" };
    if (!Number.isFinite(payload.stock) || payload.stock < 0) return { error: "Stock must be valid" };
    if (manualImageUrls.length > MAX_PRODUCT_IMAGE_COUNT) return { error: `Maximum ${MAX_PRODUCT_IMAGE_COUNT} images allowed` };
    if (manualImageUrls.length !== safeManualImageUrls.length) return { error: "Every image URL must be valid" };
    if (payload.image_urls.length === 0) return { error: "At least one product image is required" };

    return { payload };
  }

  async function saveProduct() {
    await fetchExchangeRates();
    const { payload, error } = buildProductPayload();
    if (error) {
      notify(error, "warning");
      return;
    }
    if (editMode.value && !currentProductId.value) {
      notify("Product id not found", "error");
      return;
    }

    productSaving.value = true;
    try {
      if (editMode.value) {
        await runAdminRequest(async (forceRefresh) =>
          requestProductApi(
            `/products/${encodeURIComponent(currentProductId.value)}`,
            {
              ...(await buildAdminRequestConfig({}, forceRefresh)),
              method: "put",
              data: payload,
            },
          ),
        );
        notify("Product updated");
      } else {
        await runAdminRequest(async (forceRefresh) =>
          requestProductApi(
            "/products",
            {
              ...(await buildAdminRequestConfig({}, forceRefresh)),
              method: "post",
              data: payload,
            },
          ),
        );
        notify("Product added");
      }

      productDialog.value = false;
      clearProductsCache();
      await Promise.all([fetchProducts(), fetchProductCategories()]);
    } catch (error) {
      console.error("Failed to save product:", error);
      notify(error.response?.data?.message || "Failed to save product", "error");
    } finally {
      productSaving.value = false;
    }
  }

  async function deleteProduct(product) {
    const selectedProduct = resolveTableItem(product);
    if (!selectedProduct?.product_id) {
      notify("Product id not found", "error");
      return;
    }
    if (!confirm(`Delete ${selectedProduct.name}?`)) {
      return;
    }

    productLoading.value = true;
    try {
      await runAdminRequest(async (forceRefresh) =>
        requestProductApi(
          `/products/${encodeURIComponent(selectedProduct.product_id)}`,
          {
            ...(await buildAdminRequestConfig({}, forceRefresh)),
            method: "delete",
          },
        ),
      );
      notify("Product deleted");
      clearProductsCache();
      await fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      notify(error.response?.data?.message || "Failed to delete product", "error");
    } finally {
      productLoading.value = false;
    }
  }

  async function addAdminAccess() {
    const email = normalizeEmail(accessEmailInput.value);
    if (!isValidEmail(email)) {
      notify("Enter a valid email", "warning");
      return;
    }

    accessSaving.value = true;
    try {
      await runAdminRequest(async (forceRefresh) =>
        axios.post(
          `${API_URL}/admin/access`,
          { email },
          await buildAdminRequestConfig({}, forceRefresh),
        ),
      );
      accessEmailInput.value = "";
      notify("Admin access added");
      await Promise.all([fetchAdminAccess(), fetchUsers()]);
    } catch (error) {
      console.error("Failed to add admin access:", error);
      notify(error.response?.data?.message || "Failed to add admin access", "error");
    } finally {
      accessSaving.value = false;
    }
  }

  function openEditAdminAccess(entry) {
    if (!entry?.can_edit) {
      notify(entry?.is_current_user ? "You cannot edit your own access entry" : "This admin email is protected", "warning");
      return;
    }

    accessEditOriginalEmail.value = entry.email;
    accessEditEmail.value = entry.email;
    accessEditDialog.value = true;
  }

  async function saveAdminAccessEdit() {
    const nextEmail = normalizeEmail(accessEditEmail.value);
    if (!isValidEmail(nextEmail) || accessEditEmailError.value) {
      notify(accessEditEmailError.value || "Enter a valid email", "warning");
      return;
    }

    accessSaving.value = true;
    try {
      await runAdminRequest(async (forceRefresh) =>
        axios.put(
          `${API_URL}/admin/access/${encodeURIComponent(accessEditOriginalEmail.value)}`,
          { email: nextEmail },
          await buildAdminRequestConfig({}, forceRefresh),
        ),
      );
      accessEditDialog.value = false;
      notify("Admin access updated");
      await Promise.all([fetchAdminAccess(), fetchUsers()]);
    } catch (error) {
      console.error("Failed to update admin access:", error);
      notify(error.response?.data?.message || "Failed to update admin access", "error");
    } finally {
      accessSaving.value = false;
    }
  }

  async function deleteAdminAccess(entry) {
    if (!entry?.can_delete) {
      notify(entry?.is_current_user ? "You cannot delete your own access entry" : "This admin email is protected", "warning");
      return;
    }
    if (!confirm(`Remove admin access for ${entry.email}?`)) {
      return;
    }

    accessSaving.value = true;
    try {
      await runAdminRequest(async (forceRefresh) =>
        axios.delete(
          `${API_URL}/admin/access/${encodeURIComponent(entry.email)}`,
          await buildAdminRequestConfig({}, forceRefresh),
        ),
      );
      notify("Admin access removed");
      await Promise.all([fetchAdminAccess(), fetchUsers()]);
    } catch (error) {
      console.error("Failed to delete admin access:", error);
      notify(error.response?.data?.message || "Failed to delete admin access", "error");
    } finally {
      accessSaving.value = false;
    }
  }

  async function logout() {
    await appStore.logout();
    router.push("/login");
  }
</script>
