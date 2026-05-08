<template>
  <v-layout>
    <v-app-bar border="b" color="teal-darken-3" flat>
      <div class="d-flex align-center ga-3 px-3 px-md-6 w-100">
        <v-btn v-if="isMobile && canShowAdmin" aria-label="Toggle admin navigation" icon="mdi-menu" rounded="lg"
          variant="text" @click="drawer = !drawer" />

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
          <v-chip color="teal-lighten-1" size="small" variant="elevated" border>
            {{ formatNumber(products.length) }} products
          </v-chip>
          <v-chip :color="lowStockCount > 0 ? 'yellow-darken-3' : 'success'" size="small" border variant="elevated">
            {{ formatNumber(lowStockCount) }} low stock
          </v-chip>
          <v-chip color="blue-darken-1" size="small" variant="elevated" border>
            {{ lastSyncedLabel }}
          </v-chip>
        </div>

        <v-spacer />

        <v-menu v-if="canShowAdmin" v-model="isQuickActionMenuOpen" location="bottom end">

          <v-list density="comfortable" min-width="240">
            <v-list-item v-for="item in navItems" :key="item.id" :prepend-icon="item.icon" :title="item.label"
              @click="selectPanel(item.id)" />
            <v-divider />
            <v-list-item prepend-icon="mdi-refresh" title="Refresh data" @click="refreshAdminData" />
            <v-list-item prepend-icon="mdi-plus" title="Add product" @click="openAddDialog" />
          </v-list>
        </v-menu>

        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon rounded="xl" variant="tonal">
              <v-avatar color="teal-accent-4" size="38">
                <span class="text-white font-weight-light">{{ userInitials }}</span>
              </v-avatar>
              <span class="d-none d-xl-inline text-truncate">{{ userName }}</span>
              <v-tooltip activator="parent" location="bottom">{{ userName }}</v-tooltip>
            </v-btn>
          </template>

          <v-list density="compact" class="pa-2" nav>
            <v-list-item :subtitle="currentUserEmail" :title="userName" to="/profile" rounded="lg" class="mb-2">
              <template #prepend>
                <v-avatar color="teal-accent-4" size="32">
                  <span class="text-white font-weight-light">{{ userInitials }}</span>
                </v-avatar>
              </template>
            </v-list-item>
            <v-divider />
            <v-list-item to="/" rounded="lg">
              <template #prepend>
                <v-icon>mdi-store-outline</v-icon>
              </template>
              <v-list-item-title>Storefront</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="isAuthenticated" @click="logout" rounded="lg">
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

    <v-navigation-drawer v-if="canShowAdmin" v-model="drawer" border="e" color="yellow-lighten-5" elevation="0" expand-on-hover
      :rail="!isMobile" rail-width="66" :temporary="isMobile" width="220">
      <v-list class="pa-3" density="comfortable" nav>
        <v-list-item v-for="item in navItems" :key="item.id" :active="activePanel === item.id" color="teal-darken-3"
          rounded="lg" @click="selectPanel(item.id)">
          <template #prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
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
            <v-col cols="12" md="7">
              <div class="text-h5 text-md-h4 font-weight-bold">{{ activePanelLabel }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ lastSyncedLabel }}</div>
            </v-col>
            <v-col cols="12" md="5">
              <div class="d-flex flex-column flex-sm-row justify-md-end ga-2">
                <v-btn color="teal-darken-3" :loading="isRefreshing" rounded="lg" prepend-icon="mdi-refresh"
                  variant="flat" text="Refresh" @click="refreshAdminData" />
              </div>
            </v-col>
          </v-row>

          <div v-if="activePanel === 'dashboard'">
            <v-row dense>
              <v-col v-for="metric in metricCards" :key="metric.label" cols="12" lg="3" sm="7">
                <v-card variant="outlined" rounded="lg">
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
              <v-col cols="12" lg="8">
                <v-card class="h-100" variant="outlined" rounded="lg">
                  <v-card-title class="d-flex align-center justify-space-between ga-3 my-2">
                    <span>Recent Inventory</span>
                    <v-chip color="primary" size="small" variant="tonal">{{ filteredProducts.length }}</v-chip>
                  </v-card-title>
                  <v-card-text>
                    <v-text-field v-model="productSearch" density="comfortable" hide-details label="Search products"
                      prepend-inner-icon="mdi-magnify" variant="outlined" />
                    <v-data-table class="mt-4" density="comfortable" :headers="recentProductHeaders"
                      :items="recentProducts" :items-per-page="5" :loading="productLoading">
                      <template #item.name="{ item }">
                        <div class="d-flex align-center ga-3 py-2">
                          <v-avatar color="surface" rounded="lg" size="44">
                            <v-img v-if="productImageUrl(resolveTableItem(item))" :alt="resolveTableItem(item)?.name"
                              cover :src="productImageUrl(resolveTableItem(item))" />
                            <v-icon v-else color="primary">mdi-image-off-outline</v-icon>
                          </v-avatar>
                          <div class="overflow-hidden">
                            <div class="font-weight-medium text-truncate">{{ resolveTableItem(item)?.name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ resolveTableItem(item)?.company ||
                              "Mindstores" }}</div>
                          </div>
                        </div>
                      </template>
                      <template #item.price="{ item }">
                        {{ formatCurrency(resolveTableItem(item)?.price) }}
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
                <v-card class="h-100" variant="outlined" rounded="lg">
                  <v-card-title class="my-2">Operations</v-card-title>
                  <v-list lines="two" density="comfortable" class="ma-2 rounded-lg pa-1">
                    <v-list-item v-for="item in operationsSummary" :key="item.title" :subtitle="item.subtitle"
                      :title="item.title" rounded="lg">
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
              <v-col cols="12" md="6">
                <v-card class="h-100" variant="outlined" rounded="lg">
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

              <v-col cols="12" md="6">
                <v-card class="h-100" variant="outlined" rounded="lg">
                  <v-card-title class="my-2">Access Snapshot</v-card-title>
                  <v-list density="comfortable" lines="two" class="ma-2 rounded-lg pa-1">
                    <v-list-item v-for="entry in adminAccessEntries.slice(0, 5)" :key="entry.email"
                      :subtitle="accessEntrySubtitle(entry)" :title="entry.email">
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

          <v-card v-else-if="activePanel === 'users'" variant="outlined" rounded="lg">
            <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
              <span>User Management</span>
              <v-btn color="teal-darken-3" rounded="lg" :loading="userLoading" prepend-icon="mdi-refresh" text="Users"
                variant="flat" @click="fetchUsers" />
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" md="8">
                  <v-text-field v-model="userSearch" density="comfortable" hide-details label="Search users"
                    prepend-inner-icon="mdi-magnify" variant="outlined" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="userRoleFilter" density="comfortable" hide-details item-title="title"
                    item-value="value" :items="userRoleOptions" label="Role" variant="outlined" />
                </v-col>
              </v-row>

              <v-data-table class="mt-4" density="comfortable" :headers="userHeaders" :items="filteredUsers"
                :items-per-page="8" :loading="userLoading">
                <template #item.name="{ item }">
                  <div class="d-flex align-center ga-3 py-2">
                    <v-avatar color="primary" size="38" variant="tonal">
                      <span class="font-weight-bold">{{ initialsFor(resolveTableItem(item)?.name ||
                        resolveTableItem(item)?.email) }}</span>
                    </v-avatar>
                    <div class="overflow-hidden">
                      <div class="font-weight-medium text-truncate">{{ resolveTableItem(item)?.name || "User" }}</div>
                      <div class="text-caption text-medium-emphasis text-truncate">{{ resolveTableItem(item)?.email }}
                      </div>
                    </div>
                  </div>
                </template>
                <template #item.is_admin="{ item }">
                  <v-chip :color="resolveTableItem(item)?.is_admin ? 'success' : 'default'" size="small"
                    variant="tonal">
                    {{ resolveTableItem(item)?.is_admin ? "Admin" : "Customer" }}
                  </v-chip>
                </template>
                <template #item.updated_at="{ item }">
                  {{ formatDate(resolveTableItem(item)?.updated_at) }}
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>

          <v-card v-else-if="activePanel === 'products'" variant="outlined" rounded="lg">
            <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
              <span>Product Management</span>
              <v-btn color="teal-darken-3" variant="flat" rounded="lg" prepend-icon="mdi-plus" text="Add Product"
                @click="openAddDialog" />
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-text-field v-model="productSearch" density="comfortable" hide-details label="Search products"
                    prepend-inner-icon="mdi-magnify" variant="outlined" />
                </v-col>
                <v-col cols="12" md="3" sm="6">
                  <v-select v-model="categoryFilter" density="comfortable" hide-details item-title="title"
                    item-value="value" :items="categoryFilterOptions" label="Category" variant="outlined" />
                </v-col>
                <v-col cols="12" md="3" sm="6">
                  <v-select v-model="stockFilter" density="comfortable" hide-details item-title="title"
                    item-value="value" :items="stockFilterOptions" label="Stock" variant="outlined" />
                </v-col>
              </v-row>

              <v-data-table class="mt-4" density="comfortable" :headers="productHeaders" :items="filteredProducts"
                :items-per-page="8" :loading="productLoading">
                <template #item.name="{ item }">
                  <div class="d-flex align-center ga-3 py-2">
                    <v-avatar color="surface" rounded="lg" size="44">
                      <v-img v-if="productImageUrl(resolveTableItem(item))" :alt="resolveTableItem(item)?.name" cover
                        :src="productImageUrl(resolveTableItem(item))" />
                      <v-icon v-else color="primary">mdi-image-off-outline</v-icon>
                    </v-avatar>
                    <div class="overflow-hidden">
                      <div class="font-weight-medium text-truncate">{{ resolveTableItem(item)?.name }}</div>
                      <div class="text-caption text-medium-emphasis">{{ resolveTableItem(item)?.product_id }}</div>
                    </div>
                  </div>
                </template>
                <template #item.category_display="{ item }">
                  {{ formatCategory(resolveTableItem(item)) }}
                </template>
                <template #item.price="{ item }">
                  {{ formatCurrency(resolveTableItem(item)?.price) }}
                </template>
                <template #item.stock="{ item }">
                  <v-chip :color="stockStatus(resolveTableItem(item)).color" size="small" variant="tonal">
                    {{ resolveTableItem(item)?.stock || 0 }}
                  </v-chip>
                </template>
                <template #item.actions="{ item }">
                  <div class="d-flex align-center">
                    <v-btn icon size="small" variant="text" @click="editProduct(resolveTableItem(item))">
                      <v-icon>mdi-pencil-outline</v-icon>
                      <v-tooltip activator="parent" location="top">Edit</v-tooltip>
                    </v-btn>
                    <v-btn color="error" icon size="small" variant="text"
                      @click="deleteProduct(resolveTableItem(item))">
                      <v-icon>mdi-delete-outline</v-icon>
                      <v-tooltip activator="parent" location="top">Delete</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>

          <v-card v-else-if="activePanel === 'logs'" variant="outlined" rounded="lg">
            <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
              <span>Notifications</span>
              <v-select v-model="logTypeFilter" density="compact" hide-details item-title="title" item-value="value"
                :items="logTypeOptions" max-width="220" variant="outlined" />
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col v-for="log in filteredActivityLogs" :key="log.id" cols="12" md="6">
                  <v-card class="h-100" variant="outlined" rounded="lg">
                    <v-card-text class="d-flex ga-4">
                      <v-avatar :color="log.color" size="44" variant="tonal">
                        <v-icon :color="log.color">{{ log.icon }}</v-icon>
                      </v-avatar>
                      <div>
                        <div class="font-weight-medium">{{ log.title }}</div>
                        <div class="text-body-2 text-medium-emphasis">{{ log.message }}</div>
                        <div class="text-caption text-medium-emphasis mt-1">{{ log.time }}</div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-row v-else dense>
            <v-col cols="12" lg="4">
              <v-card class="h-100" variant="outlined" rounded="lg">
                <v-card-title class="my-2">Add Admin Email</v-card-title>
                <v-card-text>
                  <v-form @submit.prevent="addAdminAccess">
                    <v-text-field v-model="accessEmailInput" autocomplete="email" density="comfortable"
                      :error-messages="accessEmailError ? [accessEmailError] : []" label="Email"
                      prepend-inner-icon="mdi-email-outline" variant="outlined" />
                    <v-btn block color="teal-darken-3" :disabled="Boolean(accessEmailError) || !accessEmailInput"
                      :loading="accessSaving" type="submit" rounded="lg" variant="flat" prepend-icon="mdi-shield-plus-outline"
                      text="Add Access" />
                  </v-form>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" lg="8">
              <v-card variant="outlined" rounded="lg">
                <v-card-title class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3 my-2">
                  <span>Admin Access Control</span>
                  <v-text-field v-model="accessSearch" density="compact" hide-details label="Search emails"
                    max-width="320" prepend-inner-icon="mdi-magnify" variant="outlined" />
                </v-card-title>
                <v-card-text>
                  <v-data-table density="comfortable" :headers="accessHeaders" :items="filteredAdminAccess"
                    :items-per-page="6" :loading="accessLoading">
                    <template #item.email="{ item }">
                      <div class="py-2">
                        <div class="font-weight-medium text-break">{{ resolveTableItem(item)?.email }}</div>
                        <div class="d-flex flex-wrap ga-2 mt-1">
                          <v-chip v-if="resolveTableItem(item)?.is_default" color="success" size="x-small"
                            variant="tonal">Default</v-chip>
                          <v-chip v-if="resolveTableItem(item)?.is_current_user" color="info" size="x-small"
                            variant="tonal">You</v-chip>
                        </div>
                      </div>
                    </template>
                    <template #item.updated_at="{ item }">
                      {{ formatDate(resolveTableItem(item)?.updated_at || resolveTableItem(item)?.created_at) }}
                    </template>
                    <template #item.actions="{ item }">
                      <div class="d-flex align-center">
                        <v-btn icon size="small" variant="text" :disabled="!resolveTableItem(item)?.can_edit"
                          @click="openEditAdminAccess(resolveTableItem(item))">
                          <v-icon>mdi-pencil-outline</v-icon>
                          <v-tooltip activator="parent" location="top">Edit</v-tooltip>
                        </v-btn>
                        <v-btn color="error" :disabled="!resolveTableItem(item)?.can_delete" icon size="small"
                          variant="text" @click="deleteAdminAccess(resolveTableItem(item))">
                          <v-icon>mdi-delete-outline</v-icon>
                          <v-tooltip activator="parent" location="top">Delete</v-tooltip>
                        </v-btn>
                      </div>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12">
              <v-card variant="outlined" rounded="lg">
                <v-card-title class="my-2">Security Rules</v-card-title>
                <v-card-text>
                  <v-row dense>
                    <v-col v-for="rule in securityRules" :key="rule.title" cols="12" md="3" sm="6">
                      <v-card class="h-100" variant="outlined" rounded="lg">
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

    <v-dialog v-model="productDialog" max-width="760">
      <v-card>
        <v-card-title>{{ editMode ? "Edit Product" : "Add Product" }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveProduct">
            <v-row dense>
              <v-col cols="12" md="8">
                <v-text-field v-model="formData.name" density="comfortable" label="Product name" required
                  variant="outlined" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="formData.company" density="comfortable" label="Brand" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="formData.description" density="comfortable" label="Description" rows="3"
                  variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model.number="formData.price" density="comfortable" label="Price" prefix="$" required
                  type="number" variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model.number="formData.stock" density="comfortable" label="Stock" required type="number"
                  variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox v-model="formData.category" density="comfortable" :items="categoryOptions" label="Category"
                  required variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox v-model="formData.subcategory" density="comfortable" :items="availableSubcategories"
                  label="Subcategory (optional)" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="formData.image_url" density="comfortable" label="Image URL" required
                  variant="outlined" />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="productDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="productSaving" variant="flat" @click="saveProduct">
            {{ editMode ? "Update" : "Add" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="accessEditDialog" max-width="520">
      <v-card>
        <v-card-title>Edit Admin Email</v-card-title>
        <v-card-text>
          <v-text-field v-model="accessEditEmail" autocomplete="email" density="comfortable"
            :error-messages="accessEditEmailError ? [accessEditEmailError] : []" label="Email"
            prepend-inner-icon="mdi-email-outline" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="accessEditDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="Boolean(accessEditEmailError)" :loading="accessSaving" variant="flat"
            @click="saveAdminAccessEdit">
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="top" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-layout>
</template>

<script setup>
import axios from "axios";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useAppStore } from "@/stores/app";
import { API_URL } from "@/utils/api";
import { safeDisplayImageUrl } from "@/utils/images";
import { clearProductsCache } from "@/utils/productCache";
import Profile from "./Profile.vue";

const DEFAULT_ADMIN_EMAIL = "lakshsolanki848@gmail.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = useRouter();
const appStore = useAppStore();
const { smAndDown } = useDisplay();

const drawer = ref(!smAndDown.value);
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
const accessEditDialog = ref(false);
const editMode = ref(false);
const currentProductId = ref(null);
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
const lastSyncedAt = ref(null);
const adminQuickSearch = ref("");
const isQuickActionMenuOpen = ref(false);
const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

const formData = ref({
  name: "",
  company: "",
  description: "",
  price: 0,
  category: "",
  subcategory: "",
  stock: 0,
  image_url: "",
});

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "mdi-view-dashboard-outline" },
  { id: "users", label: "Users", icon: "mdi-account-group-outline" },
  { id: "products", label: "Products", icon: "mdi-package-variant-closed" },
  { id: "logs", label: "Logs", icon: "mdi-bell-outline" },
  { id: "settings", label: "Settings", icon: "mdi-cog-outline" },
];

const productHeaders = [
  { title: "Product", key: "name" },
  { title: "Brand", key: "company" },
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

const isMobile = computed(() => smAndDown.value);
const authLoading = computed(() => Boolean(appStore.loading));
const isAuthenticated = computed(() => Boolean(appStore.isAuthenticated));
const isAdmin = computed(() => Boolean(appStore.user?.is_admin));
const canShowAdmin = computed(() => !authLoading.value && isAuthenticated.value && isAdmin.value);
const userName = computed(() => appStore.user?.name || appStore.user?.email || "Guest");
const currentUserEmail = computed(() => normalizeEmail(appStore.user?.email));
const defaultAdminEmail = computed(() => DEFAULT_ADMIN_EMAIL);
const activePanelLabel = computed(() => navItems.find((item) => item.id === activePanel.value)?.label || "Admin");
const isRefreshing = computed(() => productLoading.value || userLoading.value || accessLoading.value);
const lastSyncedLabel = computed(() => (lastSyncedAt.value ? `Synced ${formatDate(lastSyncedAt.value)}` : "Ready"));
const userInitials = computed(() => initialsFor(userName.value));

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

const categoryOptions = computed(() => {
  const currentCategory = normalizeCategoryName(formData.value.category);
  const categories = new Set(
    products.value
      .map((product) => normalizeCategoryName(product.category))
      .filter(Boolean),
  );
  if (currentCategory) {
    categories.add(currentCategory);
  }
  return [...categories].toSorted((left, right) => left.localeCompare(right));
});

const categoryFilterOptions = computed(() => {
  const categories = new Set(products.value.map((product) => normalizeCategoryName(product.category)).filter(Boolean));
  return [
    { title: "All categories", value: "all" },
    ...[...categories].toSorted((left, right) => left.localeCompare(right)).map((category) => ({ title: category, value: category })),
  ];
});

const availableSubcategories = computed(() => {
  const selectedCategory = normalizeCategoryName(formData.value.category);
  const matchedSubcategories = selectedCategory
    ? products.value
      .filter((product) => normalizeCategoryName(product.category) === selectedCategory)
      .map((product) => normalizeSubcategoryName(product.category, product.subcategory))
      .filter(Boolean)
    : products.value
      .map((product) => normalizeSubcategoryName(product.category, product.subcategory))
      .filter(Boolean);
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
    const matchesSearch =
      !query ||
      [product.name, product.company, product.category, product.subcategory, product.product_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

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
    const matchesSearch =
      !query ||
      [user.name, user.email, user.user_id, user.country_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
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
  return adminAccessEntries.value.filter((entry) => entry.email.toLowerCase().includes(query));
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
  if (logTypeFilter.value === "all") {
    return activityLogs.value;
  }
  return activityLogs.value.filter((log) => log.type === logTypeFilter.value);
});

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
  activePanel.value = panel;
  isQuickActionMenuOpen.value = false;
  if (isMobile.value) {
    drawer.value = false;
  }
}

function runAdminSearch() {
  const query = normalizeText(adminQuickSearch.value);
  if (!query) {
    return;
  }

  if (activePanel.value === "users") {
    userSearch.value = query;
    return;
  }

  if (activePanel.value === "settings") {
    accessSearch.value = query;
    return;
  }

  productSearch.value = query;
  activePanel.value = "products";
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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

function productImageUrl(product) {
  return safeDisplayImageUrl(product?.image_url);
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

async function refreshAdminData() {
  if (!canShowAdmin.value) {
    return;
  }

  await Promise.allSettled([fetchProducts(), fetchUsers(), fetchAdminAccess()]);
  lastSyncedAt.value = new Date();
}

async function fetchProducts() {
  productLoading.value = true;
  try {
    const response = await axios.get(`${API_URL}/products`, {
      params: {
        limit: 250,
        sort: "newest",
      },
    });
    products.value = Array.isArray(response.data) ? response.data : response.data?.items || [];
  } catch (error) {
    console.error("Failed to fetch products:", error);
    notify(error.response?.data?.message || "Failed to fetch products", "error");
  } finally {
    productLoading.value = false;
  }
}

async function fetchUsers() {
  if (!canShowAdmin.value) {
    return;
  }

  userLoading.value = true;
  try {
    const response = await axios.get(`${API_URL}/admin/users`, {
      params: { page_size: 100 },
      withCredentials: true,
    });
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
    const response = await axios.get(`${API_URL}/admin/access`, {
      withCredentials: true,
    });
    adminAccessEntries.value = Array.isArray(response.data) ? response.data : response.data?.items || [];
  } catch (error) {
    console.error("Failed to fetch admin access:", error);
    notify(error.response?.data?.message || "Failed to fetch admin access", "error");
  } finally {
    accessLoading.value = false;
  }
}

function resetProductForm() {
  formData.value = {
    name: "",
    company: "",
    description: "",
    price: 0,
    category: "",
    subcategory: "",
    stock: 0,
    image_url: "",
  };
}

function openAddDialog() {
  isQuickActionMenuOpen.value = false;
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
  formData.value = {
    name: selectedProduct.name || "",
    company: selectedProduct.company || "",
    description: selectedProduct.description || "",
    price: Number(selectedProduct.price || 0),
    category: normalizeCategoryName(selectedProduct.category),
    subcategory: normalizeSubcategoryName(selectedProduct.category, selectedProduct.subcategory),
    stock: Number(selectedProduct.stock || 0),
    image_url: selectedProduct.image_url || "",
  };
  productDialog.value = true;
}

function buildProductPayload() {
  const payload = {
    name: normalizeText(formData.value.name),
    company: normalizeText(formData.value.company),
    description: normalizeText(formData.value.description),
    category: normalizeCategoryName(formData.value.category),
    subcategory: normalizeSubcategoryName(formData.value.category, formData.value.subcategory),
    image_url: normalizeText(formData.value.image_url),
    price: Number(formData.value.price),
    stock: Math.max(0, Math.trunc(Number(formData.value.stock))),
  };

  if (!payload.name) return { error: "Product name is required" };
  if (!payload.category) return { error: "Category is required" };
  if (!Number.isFinite(payload.price) || payload.price < 0) return { error: "Price must be valid" };
  if (!Number.isFinite(payload.stock) || payload.stock < 0) return { error: "Stock must be valid" };
  if (!payload.image_url) return { error: "Image URL is required" };

  try {
    const imageUrl = new URL(payload.image_url);
    if (!["http:", "https:"].includes(imageUrl.protocol)) {
      return { error: "Image URL must use http or https" };
    }
  } catch {
    return { error: "Image URL must be valid" };
  }

  return { payload };
}

async function saveProduct() {
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
      await axios.put(`${API_URL}/products/${encodeURIComponent(currentProductId.value)}`, payload, {
        withCredentials: true,
      });
      notify("Product updated");
    } else {
      await axios.post(`${API_URL}/products`, payload, {
        withCredentials: true,
      });
      notify("Product added");
    }

    productDialog.value = false;
    clearProductsCache();
    await fetchProducts();
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
    await axios.delete(`${API_URL}/products/${encodeURIComponent(selectedProduct.product_id)}`, {
      withCredentials: true,
    });
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
    await axios.post(
      `${API_URL}/admin/access`,
      { email },
      {
        withCredentials: true,
      },
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
    await axios.put(
      `${API_URL}/admin/access/${encodeURIComponent(accessEditOriginalEmail.value)}`,
      { email: nextEmail },
      {
        withCredentials: true,
      },
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
    await axios.delete(`${API_URL}/admin/access/${encodeURIComponent(entry.email)}`, {
      withCredentials: true,
    });
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
