<template>
  <div class="profile-page">
    <v-container class="bespoke-profile-container" fluid>
      <!-- Topbar -->
      <section class="profile-topbar">
        <div>
          <div class="brand-tagline ml-2">
            <span class="tag-label">ACCOUNT PANEL</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">USER PROFILE</span>
          </div>
          <h1 class="page-title ml-2">Your <span class="highlight-serif">Profile</span></h1>
        </div>

        <div v-if="appStore.isAuthenticated" class="topbar-actions">
          <button
            class="btn-flat-outline btn-with-icon"
            @click="openUserAdminDialog"
          >
            <v-icon size="18" start>mdi-account-key-outline</v-icon>
            Admin Console
          </button>
          <button
            aria-label="Refresh profile"
            class="btn-flat-outline btn-with-icon"
            :disabled="refreshing"
            @click="refreshProfile"
          >
            <v-icon :class="{ 'mdi-spin': refreshing }" size="18" start>mdi-refresh</v-icon>
            Refresh
          </button>
          <button
            class="btn-flat-solid btn-with-icon"
            :disabled="!isFormDirty || savingAll"
            @click="saveAll"
          >
            <v-icon size="18" start>mdi-content-save-outline</v-icon>
            Save Changes
          </button>
        </div>
      </section>

      <!-- Guest Alert -->
      <v-alert
        v-if="!appStore.loading && !appStore.isAuthenticated"
        class="custom-flat-alert error-alert mb-4"
        type="info"
        variant="tonal"
      >
        <div class="guest-alert">
          <div>
            <strong>Sign in to view your profile.</strong>
            <p>Your orders, cart, and saved checkout details are connected to your account.</p>
          </div>
          <v-btn class="btn-flat-solid mt-2 mt-sm-0" to="/login" variant="flat">Login</v-btn>
        </div>
      </v-alert>

      <!-- Profile Workspace -->
      <template v-else>
        <v-row class="align-start">
          <!-- Sidebar -->
          <v-col cols="12" lg="4" xl="3">
            <aside class="profile-sidebar">
              <v-row>
                <!-- Profile Identity Card -->
                <v-col cols="12" lg="12" md="6">
                  <div class="flat-card-container">
                    <div class="avatar-wrap">
                      <v-avatar v-if="profilePreviewImage" class="profile-avatar" :image="profilePreviewImage" size="104" />
                      <v-avatar v-else class="profile-avatar initials-avatar" color="teal-darken-1" size="104">
                        {{ profileInitials }}
                      </v-avatar>

                      <div class="avatar-actions">
                        <button
                          aria-label="Upload photo"
                          class="avatar-action-btn"
                          @click="openPhotoPicker"
                        >
                          <v-icon size="16">mdi-camera-outline</v-icon>
                        </button>
                        <button
                          aria-label="Remove photo"
                          class="avatar-action-btn delete-photo"
                          :disabled="!profilePreviewImage"
                          @click="removePhoto"
                        >
                          <v-icon size="16">mdi-delete-outline</v-icon>
                        </button>
                      </div>
                    </div>

                    <input
                      ref="fileInput"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      class="sr-only"
                      type="file"
                      @change="onPhotoSelected"
                    >

                    <h2 class="profile-name">{{ displayName }}</h2>
                    <p class="profile-email">{{ appStore.user?.email || 'No email available' }}</p>
                    <p v-if="selectedPhotoName" class="photo-name">{{ selectedPhotoName }}</p>

                    <div class="profile-chip-row">
                      <span class="custom-badge badge-teal">{{ countryDisplayName }}</span>
                      <span class="custom-badge" :class="isAdmin ? 'badge-success' : 'badge-slate'">
                        {{ isAdmin ? 'Admin' : 'Customer' }}
                      </span>
                    </div>

                    <!-- Sidebar Stats Grid -->
                    <div class="stats-flat-grid mt-4">
                      <div class="stat-flat-box">
                        <v-icon color="teal-darken-1" size="20">mdi-package-variant-closed</v-icon>
                        <span class="stat-value">{{ orders.length }}</span>
                        <span class="stat-label">Orders</span>
                      </div>
                      <div class="stat-flat-box">
                        <v-icon color="teal-darken-1" size="20">mdi-cart-outline</v-icon>
                        <span class="stat-value">{{ cartStore.itemCount }}</span>
                        <span class="stat-label">Cart</span>
                      </div>
                      <div class="stat-flat-box">
                        <v-icon color="teal-darken-1" size="20">mdi-cash-multiple</v-icon>
                        <span class="stat-value">{{ totalSpentDisplay }}</span>
                        <span class="stat-label">Spent</span>
                      </div>
                      <div class="stat-flat-box">
                        <v-icon color="teal-darken-1" size="20">mdi-currency-usd</v-icon>
                        <span class="stat-value">{{ settings.currency }}</span>
                        <span class="stat-label">Currency</span>
                      </div>
                    </div>

                    <button
                      class="btn-flat-solid logout-btn-flat w-100 mt-4"
                      @click="logout"
                    >
                      <v-icon size="16" start>mdi-logout</v-icon>
                      Logout Session
                    </button>
                  </div>
                </v-col>

                <!-- Readiness Tracker Card -->
                <v-col cols="12" lg="12" md="6">
                  <div class="flat-card-container">
                    <div class="readiness-head">
                      <v-progress-circular color="teal-darken-1" :model-value="profileCompletion" size="68" width="6">
                        {{ profileCompletion }}%
                      </v-progress-circular>
                      <div>
                        <h3 class="readiness-title">Account Readiness</h3>
                        <p class="readiness-subtitle">{{ completedProfileItems }} of {{ profileChecklist.length }} complete</p>
                      </div>
                    </div>

                    <div class="check-list mt-4">
                      <div
                        v-for="item in profileChecklist"
                        :key="item.label"
                        :class="['check-row', { complete: item.complete }]"
                      >
                        <v-icon size="16">{{ item.complete ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                        <span>{{ item.label }}</span>
                      </div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </aside>
          </v-col>

          <!-- Main Panel tabs -->
          <v-col cols="12" lg="8" xl="9">
            <main class="profile-main">
              <div class="tabs-header-flat">
                <v-tabs
                  v-model="activeTab"
                  align-tabs="start"
                  class="custom-editorial-tabs"
                  color="teal-darken-1"
                  density="comfortable"
                  grow
                >
                  <v-tab value="profile">
                    <v-icon size="18" start>mdi-account-edit-outline</v-icon>
                    Profile Details
                  </v-tab>
                  <v-tab value="orders">
                    <v-icon size="18" start>mdi-receipt-text-outline</v-icon>
                    Order History
                  </v-tab>
                  <v-tab value="security">
                    <v-icon size="18" start>mdi-shield-account-outline</v-icon>
                    Account Access
                  </v-tab>
                </v-tabs>
              </div>

              <div class="tab-contents-flat mt-4">
                <v-tabs-window v-model="activeTab">
                  <!-- Profile details -->
                  <v-tabs-window-item value="profile">
                    <v-row>
                      <!-- Personal Details Form -->
                      <v-col cols="12" md="6">
                        <div class="flat-card-container h-100">
                          <div class="panel-head">
                            <div>
                              <h2 class="panel-title">Personal Details</h2>
                              <p class="panel-subtitle">Saved to your Mindstore account.</p>
                            </div>
                          </div>

                          <v-row class="mt-2" dense>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="profileForm.name"
                                class="flat-text-field"
                                density="comfortable"
                                label="Full Name"
                                maxlength="120"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="profileForm.email"
                                class="flat-text-field"
                                density="comfortable"
                                label="Email"
                                readonly
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-select
                                v-model="profileForm.countryCode"
                                class="flat-text-field"
                                density="comfortable"
                                item-title="label"
                                item-value="code"
                                :items="countryOptions"
                                label="Country"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                class="flat-text-field"
                                density="comfortable"
                                label="Currency"
                                :model-value="`${settings.currency} (Auto)`"
                                readonly
                                variant="outlined"
                              />
                            </v-col>
                          </v-row>
                        </div>
                      </v-col>

                      <!-- Delivery Profile Form -->
                      <v-col cols="12" md="6">
                        <div class="flat-card-container">
                          <div class="panel-head d-flex justify-space-between align-center">
                            <div>
                              <h2 class="panel-title">Delivery Profile</h2>
                              <p class="panel-subtitle">Used to prefill checkout.</p>
                            </div>
                            <v-switch
                              v-model="settings.saveDeliveryDetails"
                              class="flat-switch"
                              color="teal-darken-1"
                              density="compact"
                              hide-details
                              inset
                            />
                          </div>

                          <v-row class="mt-2" dense>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.phone"
                                class="flat-text-field"
                                density="comfortable"
                                label="Phone Number"
                                maxlength="32"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.postalCode"
                                class="flat-text-field"
                                density="comfortable"
                                label="Postal Code"
                                maxlength="32"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12">
                              <v-text-field
                                v-model="settings.deliveryProfile.address"
                                class="flat-text-field"
                                density="comfortable"
                                label="Street Address"
                                maxlength="220"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.city"
                                class="flat-text-field"
                                density="comfortable"
                                label="City"
                                maxlength="96"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.state"
                                class="flat-text-field"
                                density="comfortable"
                                label="State"
                                maxlength="96"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12">
                              <v-textarea
                                v-model="settings.deliveryProfile.instructions"
                                auto-grow
                                class="flat-text-field"
                                density="comfortable"
                                label="Delivery Notes"
                                maxlength="240"
                                rows="2"
                                variant="outlined"
                              />
                            </v-col>
                          </v-row>
                        </div>
                      </v-col>

                      <!-- Preferences Panel -->
                      <v-col cols="12">
                        <div class="flat-card-container">
                          <div class="panel-head">
                            <div>
                              <h2 class="panel-title">System Preferences</h2>
                              <p class="panel-subtitle">Stored locally for this browser.</p>
                            </div>
                          </div>

                          <v-row class="mt-2" dense>
                            <v-col cols="12" md="6">
                              <div class="preference-flat-card">
                                <div class="pref-details">
                                  <strong>Order updates</strong>
                                  <span class="pref-desc">Email order status changes</span>
                                </div>
                                <v-switch
                                  v-model="settings.orderUpdates"
                                  class="flat-switch"
                                  color="teal-darken-1"
                                  hide-details
                                  inset
                                />
                              </div>
                            </v-col>
                            <v-col cols="12" md="6">
                              <div class="preference-flat-card">
                                <div class="pref-details">
                                  <strong>Promotional emails</strong>
                                  <span class="pref-desc">Offers and seasonal drops</span>
                                </div>
                                <v-switch
                                  v-model="settings.promotionalEmails"
                                  class="flat-switch"
                                  color="teal-darken-1"
                                  hide-details
                                  inset
                                />
                              </div>
                            </v-col>
                            <v-col cols="12" md="6">
                              <div class="preference-flat-card">
                                <div class="pref-details">
                                  <strong>Quick checkout</strong>
                                  <span class="pref-desc">Select cart items automatically</span>
                                </div>
                                <v-switch
                                  v-model="settings.quickCheckout"
                                  class="flat-switch"
                                  color="teal-darken-1"
                                  hide-details
                                  inset
                                />
                              </div>
                            </v-col>
                            <v-col cols="12" md="6">
                              <div class="preference-flat-card">
                                <div class="pref-details">
                                  <strong>Low stock alerts</strong>
                                  <span class="pref-desc">Show inventory reminders</span>
                                </div>
                                <v-switch
                                  v-model="settings.lowStockAlerts"
                                  class="flat-switch"
                                  color="teal-darken-1"
                                  hide-details
                                  inset
                                />
                              </div>
                            </v-col>
                          </v-row>

                          <!-- Save strip flat -->
                          <div class="save-strip-flat">
                            <span v-if="isFormDirty" class="dirty-state-text">
                              <v-icon color="warning" size="16">mdi-alert-circle-outline</v-icon>
                              Unsaved changes pending
                            </span>
                            <span v-else class="clean-state-text">
                              <v-icon color="success" size="16">mdi-check-circle-outline</v-icon>
                              Profile is up to date
                            </span>
                            <button
                              class="btn-flat-solid save-btn"
                              :disabled="!isFormDirty || savingAll"
                              @click="saveAll"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-tabs-window-item>

                  <!-- Orders Tab -->
                  <v-tabs-window-item value="orders">
                    <div class="flat-card-container">
                      <div class="panel-head orders-head d-flex justify-space-between align-center">
                        <div>
                          <h2 class="panel-title">Orders Archive</h2>
                          <p class="panel-subtitle">{{ orders.length }} total, {{ completedOrderCount }} completed.</p>
                        </div>
                        <button
                          aria-label="Refresh orders"
                          class="btn-flat-outline btn-with-icon"
                          :disabled="loading"
                          @click="fetchOrders"
                        >
                          <v-icon :class="{ 'mdi-spin': loading }" size="16" start>mdi-refresh</v-icon>
                          Refresh
                        </button>
                      </div>

                      <v-row class="mt-2" dense>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="orderSearch"
                            class="flat-text-field"
                            density="comfortable"
                            hide-details
                            label="Search Orders"
                            prepend-inner-icon="mdi-magnify"
                            variant="outlined"
                          />
                        </v-col>
                        <v-col cols="12" md="3" sm="6">
                          <v-select
                            v-model="orderStatusFilter"
                            class="flat-text-field"
                            density="comfortable"
                            hide-details
                            item-title="label"
                            item-value="value"
                            :items="orderStatusOptions"
                            label="Status Filter"
                            variant="outlined"
                          />
                        </v-col>
                        <v-col cols="12" md="3" sm="6">
                          <v-select
                            v-model="orderSort"
                            class="flat-text-field"
                            density="comfortable"
                            hide-details
                            item-title="label"
                            item-value="value"
                            :items="orderSortOptions"
                            label="Sort By"
                            variant="outlined"
                          />
                        </v-col>
                      </v-row>

                      <v-progress-linear v-if="loading" class="mt-4" color="teal-darken-1" indeterminate />

                      <!-- Empty Orders state -->
                      <div v-else-if="filteredOrders.length === 0" class="empty-orders-flat mt-6">
                        <v-icon color="teal-darken-1" size="48">mdi-package-variant</v-icon>
                        <h3 class="empty-title mt-2">{{ orders.length === 0 ? 'No orders yet' : 'No matching orders' }}</h3>
                        <p class="empty-subtitle mt-1">
                          {{ orders.length === 0 ? 'Orders placed from your cart will appear here.'
                            : 'Adjust search or status filters.' }}
                        </p>
                        <v-btn class="btn-flat-solid mt-4" to="/">Shop Products</v-btn>
                      </div>

                      <!-- Orders List Expansion -->
                      <div v-else class="orders-expansion-container mt-4">
                        <v-expansion-panels class="flat-expansion-panels" variant="accordion">
                          <v-expansion-panel
                            v-for="order in filteredOrders"
                            :key="order.order_id"
                            class="flat-expansion-panel"
                          >
                            <v-expansion-panel-title class="flat-panel-title">
                              <div class="order-title-row-flat">
                                <div class="order-info-left">
                                  <span class="order-id">Order #{{ order.order_id }}</span>
                                  <span class="order-date">{{ formatDate(order.created_at) }}</span>
                                </div>
                                <div class="order-summary-right">
                                  <strong class="order-amount-display">{{ formatAmount(order.total_amount) }}</strong>
                                  <span class="order-status-badge" :class="'status-' + statusColor(order.status)">
                                    {{ order.status }}
                                  </span>
                                </div>
                              </div>
                            </v-expansion-panel-title>
                            
                            <v-expansion-panel-text class="flat-panel-content">
                              <v-row dense>
                                <v-col cols="12" sm="4">
                                  <div class="order-detail-minibox">
                                    <span class="minibox-label">Items Count</span>
                                    <strong class="minibox-value">{{ order.items.length }}</strong>
                                  </div>
                                </v-col>
                                <v-col cols="12" sm="4">
                                  <div class="order-detail-minibox">
                                    <span class="minibox-label">Purchase Date</span>
                                    <strong class="minibox-value">{{ formatDate(order.created_at) }}</strong>
                                  </div>
                                </v-col>
                                <v-col cols="12" sm="4">
                                  <div class="order-detail-minibox">
                                    <span class="minibox-label">Current Status</span>
                                    <strong class="minibox-value">{{ order.status }}</strong>
                                  </div>
                                </v-col>
                              </v-row>

                              <!-- Product List Inside Order -->
                              <div class="order-product-list-flat mt-4">
                                <div
                                  v-for="item in order.items"
                                  :key="`${order.order_id}-${item.product_id}`"
                                  class="order-product-row-flat"
                                >
                                  <div class="prod-info">
                                    <strong class="prod-name">{{ item.name || 'Product' }}</strong>
                                    <span class="prod-qty">Quantity: {{ item.quantity || 1 }}</span>
                                  </div>
                                  <span class="prod-id">{{ item.product_id }}</span>
                                </div>
                              </div>

                              <div class="d-flex justify-end mt-4">
                                <button
                                  class="btn-flat-solid btn-with-icon"
                                  :disabled="invoiceLoadingOrderId === order.order_id"
                                  @click.stop="downloadInvoice(order)"
                                >
                                  <v-icon :class="{ 'mdi-spin': invoiceLoadingOrderId === order.order_id }" size="16" start>
                                    {{ invoiceLoadingOrderId === order.order_id ? 'mdi-loading' : 'mdi-file-download-outline' }}
                                  </v-icon>
                                  {{ invoiceLoadingOrderId === order.order_id ? 'Generating...' : 'Invoice Download' }}
                                </button>
                              </div>
                            </v-expansion-panel-text>
                          </v-expansion-panel>
                        </v-expansion-panels>
                      </div>
                    </div>
                  </v-tabs-window-item>

                  <!-- Security Tab -->
                  <v-tabs-window-item value="security">
                    <v-row>
                      <!-- Session Card -->
                      <v-col cols="12" md="6">
                        <div class="flat-card-container h-100">
                          <div class="panel-head d-flex justify-space-between align-center">
                            <div>
                              <h2 class="panel-title">Session Connection</h2>
                              <p class="panel-subtitle">Current account connection details.</p>
                            </div>
                            <span class="order-status-badge status-success">Authenticated</span>
                          </div>

                          <div class="session-info-list mt-4">
                            <div class="session-field">
                              <span class="field-label">Email Address</span>
                              <strong class="field-val">{{ appStore.user?.email || 'Not available' }}</strong>
                            </div>
                            <div class="session-field">
                              <span class="field-label">User ID Identifier</span>
                              <strong class="field-val">{{ appStore.user?.user_id || appStore.user?.uid || 'Not available' }}</strong>
                            </div>
                            <div class="session-field">
                              <span class="field-label">Account Created</span>
                              <strong class="field-val">{{ formatDate(appStore.user?.created_at) }}</strong>
                            </div>
                            <div class="session-field">
                              <span class="field-label">Profile Updated</span>
                              <strong class="field-val">{{ formatDate(appStore.user?.updated_at) }}</strong>
                            </div>
                          </div>
                        </div>
                      </v-col>

                      <!-- Quick Links -->
                      <v-col cols="12" md="6">
                        <div class="flat-card-container h-100">
                          <div class="panel-head">
                            <div>
                              <h2 class="panel-title">Account Actions</h2>
                              <p class="panel-subtitle">Quick navigation links for your convenience.</p>
                            </div>
                          </div>

                          <div class="quick-links-group mt-4">
                            <v-btn block class="btn-flat-solid mt-2 w-100" size="large" to="/cart">
                              <v-icon start>mdi-cart-outline</v-icon>
                              Open Cart
                            </v-btn>
                            <v-btn block class="btn-flat-outline mt-2 w-100" size="large" to="/">
                              <v-icon start>mdi-storefront-outline</v-icon>
                              Continue Shopping
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              block
                              class="btn-flat-outline mt-2 w-100 admin-btn-action"
                              size="large"
                              to="/admin"
                            >
                              <v-icon start>mdi-shield-star-outline</v-icon>
                              System Admin Console
                            </v-btn>
                            <v-btn block class="btn-flat-solid logout-btn-flat mt-4 w-100" size="large" @click="logout">
                              <v-icon start>mdi-logout</v-icon>
                              Logout Session
                            </v-btn>
                          </div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-tabs-window-item>
                </v-tabs-window>
              </div>
            </main>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <!-- Custom SnackBar Alert -->
    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="3000"
      :type="snackbarColor"
    />

    <!-- User Admin PIN Verification Dialog -->
    <v-dialog
      v-model="userAdminDialog"
      class="flat-dialog"
      :fullscreen="xs"
      :max-width="userAdminDialogMaxWidth"
      scrollable
      width="100%"
    >
      <div class="gallery-frame dialog-frame-flat h-100">
        <!-- macOS-style frame header -->
        <div class="frame-header">
          <div class="frame-dots">
            <span class="dot-red" @click="userAdminDialog = false" />
            <span class="dot-yellow" />
            <span class="dot-green" />
          </div>
          <div class="frame-title-display">admin_gatekeeper.json</div>
          <button class="dialog-close-btn" @click="userAdminDialog = false">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-card-body d-flex flex-column pa-6">
          <div class="brand-tagline">
            <span class="tag-label">CONSOLE GATE</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">PIN CONTROL</span>
          </div>
          
          <h2 class="dialog-title text-wrap">User Admin <span class="highlight-serif">Access</span></h2>

          <div class="custom-flat-alert info-alert mt-4">
            <v-icon class="alert-icon" size="18">{{ userAdminPinIcon }}</v-icon>
            <div class="alert-content">
              {{ userAdminPinHelpText }}
            </div>
          </div>



          <!-- Mobile Inputs (If required) -->
          <v-row v-if="userAdminRequiresMobile" class="mt-4" dense>
            <v-col cols="12" sm="5">
              <v-select
                v-model="userAdminPinForm.mobileCountryCode"
                class="flat-text-field"
                density="comfortable"
                item-title="label"
                item-value="code"
                :items="mobileCountryOptions"
                label="Country Code"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="userAdminPinForm.mobileNumber"
                class="flat-text-field"
                density="comfortable"
                label="Mobile Number"
                maxlength="15"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <div v-if="canRecoverUserAdminMobile" class="d-flex justify-end mt-1">
            <button
              class="text-link-btn"
              :disabled="userAdminPinSaving"
              @click="recoverUserAdminMobile"
            >
              Forgot mobile number?
            </button>
          </div>

          <!-- OTP PIN INPUT -->
          <div class="otp-wrap-flat mt-4">
            <v-otp-input
              v-model="userAdminPinForm.pin"
              class="flat-otp-input"
              density="comfortable"
              :disabled="userAdminPinSaving"
              :length="userAdminPinLength"
              type="number"
              variant="outlined"
              @finish="submitUserAdminPin"
            />
          </div>

          <div v-if="canResetUserAdminPin" class="d-flex justify-end mt-2">
            <button
              class="text-link-btn"
              :disabled="userAdminPinSaving"
              @click="startUserAdminPinReset"
            >
              Forgot PIN?
            </button>
          </div>

          <!-- Action buttons inside Dialog -->
          <div class="dialog-actions-flat mt-6">
            <button
              class="btn-flat-outline"
              @click="userAdminDialog = false"
            >
              Cancel
            </button>
            <button
              class="btn-flat-solid"
              :disabled="userAdminPinSaving"
              @click="submitUserAdminPin"
            >
              {{ userAdminPinSaving ? 'Verifying...' : userAdminPinActionLabel }}
            </button>
          </div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script>
  import axios from 'axios'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import BaseAlert from '@/components/BaseAlert.vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { API_URL, buildAuthenticatedRequestConfig } from '@/utils/api'
  import { convertUsdAmount, fetchExchangeRates, formatCurrencyAmount } from '@/utils/currency'
  import { safeDisplayImageUrl } from '@/utils/images'
  import {
    formatMobileNumber,
    MOBILE_COUNTRY_OPTIONS,
    normalizeMobileCountryCode,
    normalizeMobileNumber,
    parseMobileNumber
  } from '@/utils/userAdmin'
  import {
    getCurrencyForCountry,
    loadUserSettings,
    normalizeCountryCode,
    normalizeDeliveryProfile,
    resolveCurrencyFromUserCountry,
    saveUserSettings,
    DEFAULT_SETTINGS as USER_SETTINGS_DEFAULTS
  } from '@/utils/userSettings'

  const COUNTRY_OPTIONS_BASE = [
    { code: 'US', label: 'United States' },
    { code: 'IN', label: 'India' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'CA', label: 'Canada' },
    { code: 'AU', label: 'Australia' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
    { code: 'IT', label: 'Italy' },
    { code: 'ES', label: 'Spain' },
    { code: 'NL', label: 'Netherlands' },
    { code: 'AE', label: 'United Arab Emirates' },
    { code: 'SG', label: 'Singapore' },
    { code: 'JP', label: 'Japan' },
    { code: 'BR', label: 'Brazil' },
    { code: 'MX', label: 'Mexico' }
  ]

  const DEFAULT_COUNTRY_CODE = 'US'
  const DEFAULT_MOBILE_COUNTRY_CODE = '+1'
  const USER_ADMIN_PIN_LENGTH = 6
  const COUNTRY_TO_MOBILE_CODE = {
    US: '+1',
    CA: '+1',
    IN: '+91',
    GB: '+44',
    AU: '+61',
    AE: '+971',
    SG: '+65',
    DE: '+49',
    FR: '+33',
    IT: '+39',
    ES: '+34',
    NL: '+31',
    JP: '+81',
    BR: '+55',
    MX: '+52'
  }
  const DEFAULT_CURRENCY = USER_SETTINGS_DEFAULTS.currency
  const MAX_PHOTO_FILE_BYTES = 512 * 1024
  const MAX_PHOTO_DATA_URL_LENGTH = 700_000
  const DEFAULT_SETTINGS = {
    currency: DEFAULT_CURRENCY,
    orderUpdates: USER_SETTINGS_DEFAULTS.orderUpdates,
    promotionalEmails: USER_SETTINGS_DEFAULTS.promotionalEmails,
    quickCheckout: USER_SETTINGS_DEFAULTS.quickCheckout,
    lowStockAlerts: USER_SETTINGS_DEFAULTS.lowStockAlerts,
    saveDeliveryDetails: USER_SETTINGS_DEFAULTS.saveDeliveryDetails,
    deliveryProfile: { ...USER_SETTINGS_DEFAULTS.deliveryProfile }
  }

  const orderSortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'highest', label: 'Highest Total' },
    { value: 'lowest', label: 'Lowest Total' }
  ]

  function cloneSettings(settings) {
    return {
      ...settings,
      deliveryProfile: { ...settings.deliveryProfile }
    }
  }

  function getCountryNameFromCode(code) {
    const normalizedCode = normalizeCountryCode(code || DEFAULT_COUNTRY_CODE)

    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
      return displayNames.of(normalizedCode) || normalizedCode
    } catch {
      return normalizedCode
    }
  }

  function normalizeOrder(order = {}) {
    return {
      ...order,
      order_id: order.order_id || order.id || 'pending',
      status: String(order.status || 'processing').trim() || 'processing',
      subtotal_amount: Number(order.subtotal_amount || order.subtotal || order.total_amount || order.total || 0),
      discount_amount: Number(order.discount_amount || order.discount || 0),
      total_amount: Number(order.total_amount || order.total || 0),
      created_at: order.created_at || order.createdAt || null,
      items: Array.isArray(order.items) ? order.items : [],
      billing_profile: normalizeInvoiceProfile(order.billing_profile || order.billingProfile || {})
    }
  }

  function normalizeInvoiceProfile(profile = {}) {
    return {
      name: String(profile.name || profile.full_name || '').trim(),
      email: String(profile.email || '').trim(),
      phone: String(profile.phone || '').trim(),
      address: String(profile.address || '').trim(),
      city: String(profile.city || '').trim(),
      state: String(profile.state || '').trim(),
      postalCode: String(profile.postal_code || profile.postalCode || profile.zip || '').trim()
    }
  }

  function createSettingsSnapshot(settings) {
    return JSON.stringify({
      currency: settings.currency,
      orderUpdates: settings.orderUpdates,
      promotionalEmails: settings.promotionalEmails,
      quickCheckout: settings.quickCheckout,
      lowStockAlerts: settings.lowStockAlerts,
      saveDeliveryDetails: settings.saveDeliveryDetails,
      deliveryProfile: normalizeDeliveryProfile(settings.deliveryProfile)
    })
  }

  export default {
    name: 'Profile',
    components: {
      BaseAlert
    },
    setup() {
      const router = useRouter()
      const { smAndDown, xs } = useDisplay()
      const appStore = useAppStore()
      const cartStore = useCartStore()
      const orders = ref([])
      const loading = ref(false)
      const refreshing = ref(false)
      const profileLoaded = ref(false)
      const savingAll = ref(false)
      const invoiceLoadingOrderId = ref('')
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')
      const fileInput = ref(null)
      const selectedPhotoName = ref('')
      const pictureChanged = ref(false)
      const activeTab = ref('profile')
      const orderSearch = ref('')
      const orderStatusFilter = ref('all')
      const orderSort = ref('newest')
      const userAdminDialog = ref(false)
      const userAdminPinMode = ref('verify')
      const userAdminPinSaving = ref(false)
      const userAdminPinForm = ref({
        mobileCountryCode: DEFAULT_MOBILE_COUNTRY_CODE,
        mobileNumber: '',
        pin: ''
      })

      const settings = ref(cloneSettings(DEFAULT_SETTINGS))
      const settingsBaseline = ref(cloneSettings(DEFAULT_SETTINGS))

      const profileForm = ref({
        name: '',
        email: '',
        countryCode: '',
        picture: ''
      })

      const displayName = computed(() => {
        return profileForm.value.name || appStore.user?.name || 'Mindstore User'
      })

      const profileInitials = computed(() => {
        const source = displayName.value || appStore.user?.email || 'MS'
        return String(source)
          .split(/\s+|@/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('') || 'MS'
      })

      const profileImage = computed(() =>
        safeDisplayImageUrl(appStore.user?.picture || appStore.user?.photoURL || appStore.user?.photo_url)
      )

      const profilePreviewImage = computed(() => {
        if (pictureChanged.value) {
          return safeDisplayImageUrl(profileForm.value.picture)
        }
        return profileImage.value
      })

      const isAdmin = computed(() => Boolean(appStore.user?.is_admin))
      const userAdminDialogMaxWidth = computed(() => (xs.value ? undefined : 680))
      const hasUserAdminPin = computed(() =>
        Boolean(appStore.user?.has_user_admin_pin || appStore.user?.user_admin_pin_created_at)
      )
      const userAdminRequiresMobile = computed(() =>
        !hasUserAdminPin.value || userAdminPinMode.value === 'reset'
      )
      const canResetUserAdminPin = computed(() =>
        hasUserAdminPin.value && userAdminPinMode.value !== 'reset'
      )
      const canRecoverUserAdminMobile = computed(() =>
        userAdminPinMode.value === 'reset'
      )
      const userAdminPinActionLabel = computed(() => {
        if (userAdminPinMode.value === 'reset') {
          return 'Create New PIN'
        }
        return hasUserAdminPin.value ? 'Open User Admin' : 'Create PIN'
      })
      const userAdminPinHelpText = computed(() => {
        if (userAdminPinMode.value === 'reset') {
          return 'Enter the same mobile number used for User Admin and create a new 6 digit PIN.'
        }
        return hasUserAdminPin.value
          ? 'Enter your User Admin PIN to open your product controls.'
          : 'Add your mobile number and create a 6 digit User Admin PIN. You will create this PIN only once.'
      })
      const userAdminPinIcon = computed(() => {
        if (userAdminPinMode.value === 'reset') {
          return 'mdi-lock-reset'
        }
        return hasUserAdminPin.value ? 'mdi-lock-check-outline' : 'mdi-lock-plus-outline'
      })

      const countryDisplayName = computed(() => {
        const countryCode =
          normalizeCountryCode(profileForm.value.countryCode) ||
          normalizeCountryCode(appStore.user?.country_code) ||
          DEFAULT_COUNTRY_CODE
        return getCountryNameFromCode(countryCode)
      })

      const countryOptions = computed(() => {
        const selectedCountryCode = normalizeCountryCode(profileForm.value.countryCode)
        if (!selectedCountryCode || COUNTRY_OPTIONS_BASE.some((item) => item.code === selectedCountryCode)) {
          return COUNTRY_OPTIONS_BASE
        }

        return [...COUNTRY_OPTIONS_BASE, { code: selectedCountryCode, label: getCountryNameFromCode(selectedCountryCode) }]
      })

      const mobileCountryOptions = computed(() => {
        const selectedMobileCode = normalizeMobileCountryCode(userAdminPinForm.value.mobileCountryCode)
        if (!selectedMobileCode || MOBILE_COUNTRY_OPTIONS.some((item) => item.code === selectedMobileCode)) {
          return MOBILE_COUNTRY_OPTIONS
        }

        return [...MOBILE_COUNTRY_OPTIONS, { code: selectedMobileCode, label: selectedMobileCode }]
      })

      const isProfileDirty = computed(() => {
        const formName = String(profileForm.value.name || '').trim()
        const userName = String(appStore.user?.name || '').trim()
        const formCountry = normalizeCountryCode(profileForm.value.countryCode || '')
        const userCountry = normalizeCountryCode(appStore.user?.country_code || DEFAULT_COUNTRY_CODE)
        return formName !== userName || formCountry !== userCountry || pictureChanged.value
      })

      const isSettingsDirty = computed(() => createSettingsSnapshot(settings.value) !== createSettingsSnapshot(settingsBaseline.value))
      const isFormDirty = computed(() => isProfileDirty.value || isSettingsDirty.value)

      const totalSpent = computed(() => orders.value.reduce((total, order) => total + Number(order.total_amount || 0), 0))
      const totalSpentDisplay = computed(() => formatAmount(totalSpent.value))
      const completedOrderCount = computed(() =>
        orders.value.filter((order) => String(order.status || '').toLowerCase() === 'completed').length
      )

      const deliveryIsComplete = computed(() => {
        const delivery = settings.value.deliveryProfile || {}
        return Boolean(delivery.phone && delivery.address && delivery.city && delivery.postalCode)
      })

      const profileChecklist = computed(() => [
        { label: 'Name', complete: Boolean(String(profileForm.value.name || '').trim()) },
        { label: 'Email', complete: Boolean(appStore.user?.email) },
        { label: 'Country', complete: Boolean(normalizeCountryCode(profileForm.value.countryCode)) },
        { label: 'Photo', complete: Boolean(profilePreviewImage.value) },
        { label: 'Delivery', complete: deliveryIsComplete.value }
      ])

      const completedProfileItems = computed(() =>
        profileChecklist.value.filter((item) => item.complete).length
      )

      const profileCompletion = computed(() =>
        Math.round((completedProfileItems.value / profileChecklist.value.length) * 100)
      )

      const orderStatusOptions = computed(() => {
        const statuses = [...new Set(orders.value.map((order) => String(order.status || '').toLowerCase()).filter(Boolean))]
        return [
          { value: 'all', label: 'All Status' },
          ...statuses.map((status) => ({
            value: status,
            label: status.replace(/(^|\s|-)\S/g, (match) => match.toUpperCase())
          }))
        ]
      })

      const filteredOrders = computed(() => {
        const query = String(orderSearch.value || '').trim().toLowerCase()
        const status = String(orderStatusFilter.value || 'all').toLowerCase()

        const filtered = orders.value.filter((order) => {
          const orderStatus = String(order.status || '').toLowerCase()
          const matchesStatus = status === 'all' || orderStatus === status
          const searchable = [
            order.order_id,
            order.status,
            order.total_amount,
            ...order.items.map((item) => item.name || item.product_id || '')
          ].join(' ').toLowerCase()
          return matchesStatus && (!query || searchable.includes(query))
        })

        return filtered.toSorted((left, right) => {
          if (orderSort.value === 'highest') {
            return Number(right.total_amount || 0) - Number(left.total_amount || 0)
          }
          if (orderSort.value === 'lowest') {
            return Number(left.total_amount || 0) - Number(right.total_amount || 0)
          }

          const leftDate = new Date(left.created_at || 0).getTime()
          const rightDate = new Date(right.created_at || 0).getTime()
          return orderSort.value === 'oldest' ? leftDate - rightDate : rightDate - leftDate
        })
      })

      const deriveCurrencyForSelectedCountry = () => {
        const fallbackCurrency = resolveCurrencyFromUserCountry(
          appStore.user,
          settings.value.currency || DEFAULT_CURRENCY
        )
        const countryCode = profileForm.value.countryCode || DEFAULT_COUNTRY_CODE
        return getCurrencyForCountry(countryCode, fallbackCurrency)
      }

      const syncCurrencyWithCountry = () => {
        const derivedCurrency = deriveCurrencyForSelectedCountry()
        settings.value.currency = derivedCurrency || DEFAULT_CURRENCY
      }

      const resolveDefaultMobileCountryCode = () => {
        const storedMobileCountryCode = normalizeMobileCountryCode(appStore.user?.mobile_country_code)
        if (storedMobileCountryCode) {
          return storedMobileCountryCode
        }
        const profileCountryCode = normalizeCountryCode(profileForm.value.countryCode || appStore.user?.country_code)
        return COUNTRY_TO_MOBILE_CODE[profileCountryCode] || DEFAULT_MOBILE_COUNTRY_CODE
      }

      const resolveStoredMobileNumber = () => {
        return normalizeMobileNumber(appStore.user?.mobile_number)
      }

      const resolveStoredMobileDisplay = () => {
        return (
          formatMobileNumber(appStore.user?.mobile_country_code, appStore.user?.mobile_number) ||
          String(appStore.user?.mobile_full_number || '').trim()
        )
      }

      const loadProfileForm = () => {
        profileForm.value = {
          name: appStore.user?.name || '',
          email: appStore.user?.email || '',
          countryCode: normalizeCountryCode(
            appStore.user?.country_code || appStore.user?.country || DEFAULT_COUNTRY_CODE
          ),
          picture: profileImage.value || ''
        }
        selectedPhotoName.value = ''
        pictureChanged.value = false
      }

      const loadSettings = () => {
        const loaded = loadUserSettings()
        const deliveryProfile = normalizeDeliveryProfile(loaded.deliveryProfile)
        const storedMobileDisplay = resolveStoredMobileDisplay()
        if (storedMobileDisplay) {
          deliveryProfile.phone = storedMobileDisplay
        }
        settings.value = cloneSettings({
          ...DEFAULT_SETTINGS,
          currency: loaded.currency || DEFAULT_CURRENCY,
          orderUpdates: loaded.orderUpdates,
          promotionalEmails: loaded.promotionalEmails,
          quickCheckout: loaded.quickCheckout,
          lowStockAlerts: loaded.lowStockAlerts,
          saveDeliveryDetails: loaded.saveDeliveryDetails,
          deliveryProfile
        })
        syncCurrencyWithCountry()
        settingsBaseline.value = cloneSettings(settings.value)
      }

      const openPhotoPicker = () => {
        fileInput.value?.click()
      }

      const showMessage = (message, color = 'success') => {
        snackbarText.value = message
        snackbarColor.value = color
        snackbar.value = true
      }

      const normalizeUserAdminPin = () => String(userAdminPinForm.value.pin || '').replace(/\D+/g, '').slice(0, USER_ADMIN_PIN_LENGTH)

      const getUserAdminMobilePayload = () => {
        const mobileCountryCode = normalizeMobileCountryCode(userAdminPinForm.value.mobileCountryCode)
        const mobileNumber = normalizeMobileNumber(userAdminPinForm.value.mobileNumber)
        return { mobileCountryCode, mobileNumber }
      }

      const syncUserAdminMobileToDeliveryProfile = (profile = {}, fallbackCountryCode = '', fallbackMobileNumber = '') => {
        const savedMobile = formatMobileNumber(
          profile.mobile_country_code || fallbackCountryCode,
          profile.mobile_number || fallbackMobileNumber
        )
        if (!savedMobile) {
          return
        }
        const existingSettings = loadUserSettings()
        const deliveryProfile = {
          ...normalizeDeliveryProfile(existingSettings.deliveryProfile),
          phone: savedMobile
        }
        saveUserSettings({
          ...existingSettings,
          deliveryProfile
        })
        settings.value.deliveryProfile.phone = savedMobile
        settingsBaseline.value = cloneSettings(settings.value)
      }

      const resetUserAdminAccessFlow = (mode = hasUserAdminPin.value ? 'verify' : 'create') => {
        userAdminPinMode.value = mode
        userAdminPinSaving.value = false
        userAdminPinForm.value = {
          mobileCountryCode: resolveDefaultMobileCountryCode(),
          mobileNumber: mode === 'reset' ? '' : resolveStoredMobileNumber(),
          pin: ''
        }
      }

      const openUserAdminDialog = () => {
        if (!appStore.isAuthenticated) {
          showMessage('Please login before opening user admin.', 'warning')
          return
        }

        resetUserAdminAccessFlow()
        userAdminDialog.value = true
      }

      const startUserAdminPinReset = () => {
        resetUserAdminAccessFlow('reset')
      }

      const recoverUserAdminMobile = () => {
        let mobileNumber = resolveStoredMobileNumber()
        let mobileCountryCode = resolveDefaultMobileCountryCode()

        if (mobileNumber) {
          // Parse the stored mobile number in case it contains country code or needs splitting
          const parsed = parseMobileNumber(formatMobileNumber(appStore.user?.mobile_country_code, mobileNumber))
          if (parsed.mobileNumber) {
            mobileNumber = parsed.mobileNumber
            mobileCountryCode = parsed.countryCode || mobileCountryCode
          }
        } else {
          // Fall back to delivery profile phone number
          const deliveryPhone = settings.value.deliveryProfile?.phone
          if (deliveryPhone) {
            const parsed = parseMobileNumber(deliveryPhone)
            if (parsed.mobileNumber) {
              mobileNumber = parsed.mobileNumber
              mobileCountryCode = parsed.countryCode || mobileCountryCode
            }
          }
        }

        if (!mobileNumber) {
          showMessage('No saved User Admin mobile number found.', 'warning')
          return
        }

        userAdminPinForm.value = {
          ...userAdminPinForm.value,
          mobileCountryCode,
          mobileNumber
        }
        showMessage(`Saved mobile added. Ends with ${mobileNumber.slice(-4)}.`)
      }

      const submitUserAdminPin = async () => {
        if (userAdminPinSaving.value) {
          return
        }

        const pin = normalizeUserAdminPin()
        userAdminPinForm.value.pin = pin
        const requiresMobile = userAdminRequiresMobile.value
        const { mobileCountryCode, mobileNumber } = getUserAdminMobilePayload()

        if (requiresMobile && !mobileCountryCode) {
          showMessage('Select a valid country code.', 'warning')
          return
        }
        if (requiresMobile && !mobileNumber) {
          showMessage('Enter the mobile number used for User Admin.', 'warning')
          return
        }
        if (!/^\d{6}$/.test(pin)) {
          showMessage('Enter a 6 digit User Admin PIN.', 'warning')
          return
        }

        userAdminPinSaving.value = true
        try {
          const response = userAdminPinMode.value === 'reset'
            ? await appStore.resetUserAdminPin({ mobileCountryCode, mobileNumber, pin })
            : await appStore.submitUserAdminPin({
              mobileCountryCode: requiresMobile ? mobileCountryCode : undefined,
              mobileNumber: requiresMobile ? mobileNumber : undefined,
              pin
            })
          if (requiresMobile) {
            syncUserAdminMobileToDeliveryProfile(response?.profile, mobileCountryCode, mobileNumber)
          }
          userAdminDialog.value = false
          resetUserAdminAccessFlow()
          showMessage(response?.message || (hasUserAdminPin.value ? 'PIN verified' : 'PIN created'))
          await router.push('/user-admin')
        } catch (error) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit User Admin PIN'
          showMessage(errorMessage, 'error')
        } finally {
          userAdminPinSaving.value = false
        }
      }

      const onPhotoSelected = (event) => {
        const file = event?.target?.files?.[0]
        event.target.value = ''
        if (!file) {
          return
        }

        if (!file.type?.startsWith('image/')) {
          showMessage('Please choose an image file.', 'warning')
          return
        }

        if (file.size > MAX_PHOTO_FILE_BYTES) {
          showMessage('Image too large. Maximum size is 512KB.', 'warning')
          return
        }

        const reader = new FileReader()
        reader.addEventListener('load', () => {
          const result = String(reader.result || '')
          if (result.length > MAX_PHOTO_DATA_URL_LENGTH || !result.startsWith('data:image/')) {
            showMessage('Unsupported image format or size.', 'warning')
            return
          }
          profileForm.value.picture = result
          selectedPhotoName.value = file.name
          pictureChanged.value = true
        })
        reader.addEventListener('error', () => {
          showMessage('Unable to read image file.', 'error')
        })
        reader.readAsDataURL(file)
      }

      const removePhoto = () => {
        profileForm.value.picture = ''
        selectedPhotoName.value = ''
        pictureChanged.value = true
      }

      const saveAll = async () => {
        if (!appStore.isAuthenticated) {
          showMessage('Please login before saving profile details.', 'warning')
          return
        }

        const name = String(profileForm.value.name || '').trim()
        if (!name) {
          showMessage('Full name is required.', 'warning')
          return
        }

        savingAll.value = true
        try {
          if (isProfileDirty.value) {
            await appStore.updateAccountProfile({
              name,
              countryCode: profileForm.value.countryCode,
              picture: pictureChanged.value ? profileForm.value.picture : undefined
            })
          }

          const existingSettings = loadUserSettings()
          saveUserSettings({
            ...existingSettings,
            displayName: name,
            currency: settings.value.currency,
            orderUpdates: settings.value.orderUpdates,
            promotionalEmails: settings.value.promotionalEmails,
            quickCheckout: settings.value.quickCheckout,
            lowStockAlerts: settings.value.lowStockAlerts,
            saveDeliveryDetails: settings.value.saveDeliveryDetails,
            deliveryProfile: settings.value.deliveryProfile
          })

          loadProfileForm()
          loadSettings()
          showMessage('Profile saved')
        } catch (error) {
          const errorMessage = error?.response?.data?.message || error?.message || ''
          const isNotAuthenticated = error?.response?.status === 401 || errorMessage === 'Not authenticated'
          showMessage(isNotAuthenticated ? 'Not authenticated' : errorMessage || 'Failed to save profile', 'error')
        } finally {
          savingAll.value = false
        }
      }

      const fetchOrders = async () => {
        if (!appStore.isAuthenticated) {
          orders.value = []
          return
        }

        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/orders`, await buildAuthenticatedRequestConfig())
          const payload = Array.isArray(response.data) ? response.data : response.data?.orders || []
          orders.value = Array.isArray(payload) ? payload.map((order) => normalizeOrder(order)) : []
        } catch (error) {
          const isNotAuthenticated = error?.response?.status === 401
          if (isNotAuthenticated) {
            orders.value = []
            return
          }
          console.error('Failed to fetch orders:', error)
          showMessage('Failed to load orders.', 'error')
        } finally {
          loading.value = false
        }
      }

      const refreshProfile = async ({ silent = false } = {}) => {
        if (!appStore.isAuthenticated) {
          return
        }

        refreshing.value = true
        try {
          await Promise.allSettled([
            appStore.refreshCurrentUser(),
            cartStore.fetchCart()
          ])
          await fetchOrders()
          profileLoaded.value = true
          if (!silent) {
            showMessage('Profile refreshed')
          }
        } finally {
          refreshing.value = false
        }
      }

      const logout = async () => {
        orders.value = []
        cartStore.clearCart()
        await appStore.logout()
        router.push('/')
      }

      const formatDate = (dateString) => {
        const date = new Date(dateString || 0)
        if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
          return 'Not available'
        }
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }

      const formatAmount = (amount) => {
        return formatCurrencyAmount(amount, settings.value.currency || 'USD')
      }

      const formatPdfAmount = (amount) => {
        const currency = settings.value.currency || DEFAULT_CURRENCY
        const converted = convertUsdAmount(amount, currency)
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(converted)
        return `${currency} ${formatted}`
      }

      const formatInvoiceDate = (dateString) => {
        const date = new Date(dateString || 0)
        if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
          return 'Date unavailable'
        }
        return new Intl.DateTimeFormat('en-US', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }).format(date)
      }

      const resolveInvoiceProfile = (order) => {
        const savedProfile = normalizeInvoiceProfile(order.billing_profile)
        const deliveryProfile = normalizeDeliveryProfile(settings.value.deliveryProfile)
        return {
          name: savedProfile.name || displayName.value || appStore.user?.name || 'Customer',
          email: savedProfile.email || appStore.user?.email || '',
          phone: savedProfile.phone || deliveryProfile.phone || '',
          address: savedProfile.address || deliveryProfile.address || '',
          city: savedProfile.city || deliveryProfile.city || '',
          state: savedProfile.state || deliveryProfile.state || '',
          postalCode: savedProfile.postalCode || deliveryProfile.postalCode || ''
        }
      }

      const downloadInvoice = async (order) => {
        if (!order?.order_id) {
          showMessage('Order id not found.', 'warning')
          return
        }

        invoiceLoadingOrderId.value = order.order_id
        try {
          await fetchExchangeRates()
          const profile = resolveInvoiceProfile(order)
          const { createInvoicePdfBlob } = await import('@/utils/invoice')
          const blob = await createInvoicePdfBlob({
            order,
            profile,
            formatAmount: formatPdfAmount,
            formatDate: formatInvoiceDate
          })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `invoice-${order.order_id}.pdf`
          document.body.append(link)
          link.click()
          link.remove()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          showMessage('Invoice downloaded')
        } catch (error) {
          console.error('Failed to generate invoice:', error)
          showMessage('Failed to generate invoice.', 'error')
        } finally {
          invoiceLoadingOrderId.value = ''
        }
      }

      const statusColor = (status) => {
        const normalizedStatus = String(status || '').toLowerCase()
        if (normalizedStatus === 'completed') return 'success'
        if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') return 'error'
        if (normalizedStatus === 'shipped') return 'info'
        return 'warning'
      }

      watch(
        () => appStore.user,
        () => {
          loadProfileForm()
          loadSettings()
        },
        { immediate: true }
      )

      watch(
        () => profileForm.value.countryCode,
        () => {
          syncCurrencyWithCountry()
        }
      )

      watch(
        () => [appStore.isAuthenticated, appStore.loading],
        ([isAuthenticated, isLoading]) => {
          if (isLoading) {
            return
          }

          if (!isAuthenticated) {
            orders.value = []
            profileLoaded.value = false
            return
          }

          if (!profileLoaded.value) {
            void refreshProfile({ silent: true })
          }
        },
        { immediate: true }
      )

      onMounted(() => {
        void fetchExchangeRates()
      })

      return {
        appStore,
        cartStore,
        orders,
        filteredOrders,
        loading,
        refreshing,
        savingAll,
        invoiceLoadingOrderId,
        snackbar,
        snackbarText,
        snackbarColor,
        userAdminDialog,
        userAdminPinMode,
        userAdminPinForm,
        userAdminPinLength: USER_ADMIN_PIN_LENGTH,
        userAdminPinSaving,
        userAdminPinActionLabel,
        userAdminPinHelpText,
        userAdminPinIcon,
        userAdminRequiresMobile,
        canResetUserAdminPin,
        canRecoverUserAdminMobile,
        hasUserAdminPin,
        smAndDown,
        xs,
        userAdminDialogMaxWidth,
        fileInput,
        selectedPhotoName,
        settings,
        profileForm,
        displayName,
        profileInitials,
        profilePreviewImage,
        isAdmin,
        countryDisplayName,
        countryOptions,
        mobileCountryOptions,
        isFormDirty,
        activeTab,
        profileChecklist,
        completedProfileItems,
        profileCompletion,
        totalSpentDisplay,
        completedOrderCount,
        orderSearch,
        orderStatusFilter,
        orderStatusOptions,
        orderSort,
        orderSortOptions,
        openPhotoPicker,
        onPhotoSelected,
        removePhoto,
        openUserAdminDialog,
        startUserAdminPinReset,
        recoverUserAdminMobile,
        submitUserAdminPin,
        saveAll,
        fetchOrders,
        refreshProfile,
        downloadInvoice,
        logout,
        formatDate,
        formatAmount,
        statusColor
      }
    }
  }
</script>

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.profile-page {
  min-height: 100vh;
  background: #f8fafc;
}

.bespoke-profile-container {
  padding: 40px max(16px, 4vw) 80px !important;
}

/* ════════════════════════════════ TOPBAR ══════ */
.profile-topbar {
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

.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
}

.profile-avatar {
  border: 2px solid #0f172a;
}
.initials-avatar {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff !important;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.avatar-action-btn {
  width: 32px;
  height: 32px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #0f172a;
  transition: all 0.2s ease;
}
.avatar-action-btn:hover {
  border-color: #0f172a;
  background: #f1f5f9;
}
.avatar-action-btn.delete-photo:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}
.avatar-action-btn:disabled {
  color: #cbd5e1;
  border-color: #cbd5e1;
  cursor: not-allowed;
}

.profile-name {
  margin-top: 16px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  word-break: break-all;
}

.profile-email {
  margin-top: 4px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  word-break: break-all;
}

.photo-name {
  font-size: 11px;
  color: #0d9488;
  text-align: center;
  margin-top: 4px;
  font-weight: 600;
}

.profile-chip-row {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Custom Badges */
.custom-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border: 1px solid currentColor;
}
.badge-teal {
  color: #0f766e;
  background: #f0fdfa;
}
.badge-success {
  color: #16a34a;
  background: #f0fdf4;
}
.badge-slate {
  color: #64748b;
  background: #f8fafc;
}

/* Sidebar Stats Grid */
.stats-flat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-flat-box {
  border: 1px solid #cbd5e1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #f8fafc;
}
.stat-value {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

/* Sidebar Logout button */
.logout-btn-flat {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
}
.logout-btn-flat:hover {
  background: #dc2626 !important;
}

/* Readiness Tracker */
.readiness-head {
  display: flex;
  align-items: center;
  gap: 16px;
}
.readiness-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}
.readiness-subtitle {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  margin-top: 2px;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}
.check-row.complete {
  color: #0f766e;
}

/* ════════════════════════════════ MAIN CONTAINER ═ */
.profile-sidebar {
  position: sticky;
  top: 40px;
}

/* Custom Tabs style overrides */
.tabs-header-flat {
  border-bottom: 2px solid #0f172a;
}

.custom-editorial-tabs :deep(.v-slide-group__content) {
  gap: 8px;
}

.custom-editorial-tabs :deep(.v-tab) {
  border-radius: 0 !important;
  border: 1px solid #cbd5e1;
  border-bottom: none;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0px !important;
  color: #64748b !important;
  background: #ffffff;
  transition: all 0.2s ease;
}

.custom-editorial-tabs :deep(.v-tab--selected) {
  color: #ffffff !important;
  background: #0f172a !important;
  border-color: #0f172a !important;
}

/* Tab Panels */
.panel-head {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.panel-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.panel-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  font-weight: 500;
}

/* Custom Switch Overrides */
.flat-switch :deep(.v-switch__track) {
  border-radius: 0 !important;
}
.flat-switch :deep(.v-switch__thumb) {
  border-radius: 0 !important;
}

/* Input Fields overrides */
.flat-text-field :deep(.v-field) {
  border-radius: 0 !important;
  border-color: #cbd5e1 !important;
}
.flat-text-field :deep(.v-field--focused) {
  border-color: #0f172a !important;
}

/* Preference Box */
.preference-flat-card {
  border: 1px solid #cbd5e1;
  padding: 16px;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.pref-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pref-details strong {
  font-size: 13px;
  color: #0f172a;
  font-weight: 700;
}
.pref-desc {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

/* Save Strip */
.save-strip-flat {
  border-top: 1px solid #cbd5e1;
  padding-top: 20px;
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.dirty-state-text {
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.clean-state-text {
  font-size: 12px;
  font-weight: 700;
  color: #16a34a;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Guest Alert */
.custom-flat-alert {
  border-radius: 0 !important;
  font-size: 13px !important;
  border: 1px solid currentColor !important;
}
.error-alert {
  color: #dc2626 !important;
  background: #fef2f2 !important;
}
.guest-alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}
.guest-alert p {
  margin-top: 4px;
  font-size: 12px;
}

/* ════════════════════════════════ ORDERS TAB ═════ */
.empty-orders-flat {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px dashed #cbd5e1;
  padding: 32px;
  background: #f8fafc;
}
.empty-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}
.empty-subtitle {
  font-size: 13px;
  color: #64748b;
  max-width: 320px;
}

/* Expansion Panels */
.orders-expansion-container {
  display: flex;
  flex-direction: column;
}
.flat-expansion-panels :deep(.v-expansion-panel) {
  border-radius: 0 !important;
  border: 1px solid #cbd5e1 !important;
  margin-bottom: 12px !important;
  box-shadow: none !important;
}
.flat-expansion-panels :deep(.v-expansion-panel--active) {
  border-color: #0f172a !important;
  box-shadow: 4px 4px 0px #0f172a !important;
}
.flat-expansion-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 20px !important;
}

.order-title-row-flat {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 16px;
}
.order-info-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.order-id {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}
.order-date {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}
.order-summary-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.order-amount-display {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}
.order-status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border: 1px solid currentColor;
  text-transform: uppercase;
}
.status-success {
  color: #16a34a;
  background: #f0fdf4;
}
.status-shipped {
  color: #0284c7;
  background: #f0f9ff;
}
.status-warning {
  color: #d97706;
  background: #fffbeb;
}
.status-error {
  color: #dc2626;
  background: #fef2f2;
}

.order-detail-minibox {
  border: 1px solid #cbd5e1;
  padding: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}
.minibox-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
}
.minibox-value {
  font-size: 13px;
  color: #0f172a;
  font-weight: 800;
  margin-top: 2px;
}

.order-product-list-flat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}
.order-product-row-flat {
  display: flex;
  justify-content: space-between;
  align-items: start;
  font-size: 13px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #cbd5e1;
}
.order-product-row-flat:last-child {
  border-bottom: none;
}
.prod-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.prod-name {
  font-weight: 700;
  color: #0f172a;
}
.prod-qty {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}
.prod-id {
  font-family: monospace;
  font-size: 11px;
  color: #94a3b8;
}

/* ════════════════════════════════ SECURITY TAB ═══ */
.session-info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.session-field {
  border: 1px solid #cbd5e1;
  padding: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}
.field-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
}
.field-val {
  font-size: 13px;
  color: #0f172a;
  font-weight: 800;
  margin-top: 2px;
  word-break: break-all;
}

.quick-links-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick-links-group :deep(.v-btn) {
  border-radius: 0 !important;
}

/* ════════════════════════════════ DIALOG GATE ════ */
.dialog-frame-flat {
  background: #ffffff; /* Clean light background */
  border: 1px solid #0f172a;
  box-shadow: 8px 8px 0px #0f172a; /* Handcrafted developer offset shadow */
  color: #0f172a;
  transition: all 0.3s ease;
}

/* macOS-style frame header in light theme */
.dialog-frame-flat .frame-header {
  background: #f8fafc;
  border-bottom: 1px solid #0f172a;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  position: relative;
  height: 38px;
}

.dialog-frame-flat .frame-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dialog-frame-flat .frame-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  cursor: pointer;
  border: 1px solid #0f172a;
}

.dialog-frame-flat .dot-red { background: #ff5f56; }
.dialog-frame-flat .dot-yellow { background: #ffbd2e; }
.dialog-frame-flat .dot-green { background: #27c93f; }

.dialog-frame-flat .frame-title-display {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #64748b;
  letter-spacing: 0.5px;
  margin-left: 12px;
  flex-grow: 1;
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
  transition: color 0.2s ease;
}
.dialog-close-btn:hover {
  color: #ef4444;
}

.dialog-card-body {
  flex-grow: 1;
}

.brand-tagline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.brand-tagline .tag-label {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #0d9488; /* Teal accent */
}

.brand-tagline .tag-dot {
  color: #cbd5e1;
}

.dialog-title {
  font-size: 26px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
}

.dialog-title .highlight-serif {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488; /* Teal */
}

/* Custom flat alert styling for the terminal gate */
.custom-flat-alert.info-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f0fdfa !important;
  border: 1px solid #0d9488 !important;
  color: #0f766e !important;
  padding: 14px;
  border-radius: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.custom-flat-alert.info-alert .alert-icon {
  color: #0d9488 !important;
  margin-top: 2px;
}

.custom-flat-alert.info-alert .alert-content {
  flex-grow: 1;
}

/* Forgot Links */
.text-link-btn {
  font-size: 12px;
  font-weight: 700;
  color: #0d9488;
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s ease;
}
.text-link-btn:hover {
  color: #0f766e;
}

/* OTP Verification Styles */
.otp-wrap-flat {
  display: flex;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 24px 16px;
}

.flat-otp-input :deep(.v-otp-input__field) {
  border-radius: 0 !important;
  border: 1px solid #cbd5e1 !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 1.8rem;
  transition: all 0.2s ease;
  height: 54px !important;
}

.flat-otp-input :deep(.v-otp-input__field:focus) {
  border-color: #0f172a !important;
}

/* Form Controls Inside Dialog */
.dialog-card-body :deep(.flat-text-field .v-field) {
  background: #ffffff !important;
  border-radius: 0 !important;
  border: 1px solid #cbd5e1 !important;
  color: #0f172a !important;
}

.dialog-card-body :deep(.flat-text-field .v-field--focused) {
  border-color: #0f172a !important;
}

.dialog-card-body :deep(.flat-text-field .v-label) {
  color: #64748b !important;
}

.dialog-card-body :deep(.flat-text-field .v-field__input) {
  color: #0f172a !important;
}

/* Action Buttons inside Dialog */
.dialog-actions-flat {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.dialog-actions-flat button {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dialog-actions-flat .btn-flat-outline {
  color: #0f172a;
  border: 1px solid #0f172a;
  background: transparent;
  transition: all 0.25s ease;
}

.dialog-actions-flat .btn-flat-outline:hover {
  background: #f1f5f9;
}

.dialog-actions-flat .btn-flat-solid {
  background: #0f172a;
  border: 1px solid #0f172a;
  color: #ffffff;
  box-shadow: 4px 4px 0px rgba(15, 23, 42, 0.15);
  transition: all 0.25s ease;
}

.dialog-actions-flat .btn-flat-solid:hover {
  background: #1e293b;
  border-color: #1e293b;
  box-shadow: 4px 4px 0px rgba(15, 23, 42, 0.25);
  transform: translate(-1px, -1px);
}

.dialog-actions-flat .btn-flat-solid:active {
  transform: translate(1px, 1px);
  box-shadow: none;
}

/* ════════════════════════════════ BUTTON GENERAL ═ */
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

.admin-btn-action :deep(.v-btn__content) {
  color: #0f766e !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ════════════════════════════════ RESPONSIVE ═════ */
@media (max-width: 1279px) {
  .profile-sidebar {
    position: static;
  }
}

@media (max-width: 959px) {
  .profile-topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  .topbar-actions {
    width: 100%;
  }
  .topbar-actions button {
    flex: 1;
    min-width: 120px;
  }
  .save-strip-flat {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .save-strip-flat button {
    width: 100%;
  }
}

@media (max-width: 599px) {
  .bespoke-profile-container {
    padding: 24px 16px 60px !important;
  }
  .order-title-row-flat {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .order-summary-right {
    width: 100%;
    justify-content: space-between;
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
