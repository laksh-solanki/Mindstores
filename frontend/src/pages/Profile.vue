<template>
  <div class="profile-page">
    <v-container class="profile-shell" fluid>
      <section class="profile-topbar">
        <div>
          <p class="profile-kicker ml-2">Account</p>
          <h1 class="page-title ml-2">Profile</h1>
        </div>

        <div v-if="appStore.isAuthenticated" class="topbar-actions">
          <v-btn
            color="teal-darken-1"
            rounded="lg"
            variant="tonal"
            @click="openUserAdminDialog"
          >
            <v-icon start>mdi-account-key-outline</v-icon>
            Admin Console
          </v-btn>
          <v-btn
            aria-label="Refresh profile"
            :loading="refreshing"
            rounded="lg"
            variant="tonal"
            @click="refreshProfile"
          >
            <v-icon start>mdi-refresh</v-icon>
            Refresh
          </v-btn>
          <v-btn
            color="teal-darken-1"
            :disabled="!isFormDirty"
            :loading="savingAll"
            rounded="lg"
            @click="saveAll"
          >
            <v-icon start>mdi-content-save-outline</v-icon>
            Save
          </v-btn>
        </div>
      </section>

      <v-alert
        v-if="!appStore.loading && !appStore.isAuthenticated"
        class="profile-alert"
        rounded="lg"
        type="info"
        variant="tonal"
      >
        <div class="guest-alert">
          <div>
            <strong>Sign in to view your profile.</strong>
            <p>Your orders, cart, and saved checkout details are connected to your account.</p>
          </div>
          <v-btn color="teal-darken-1" rounded="lg" to="/login" variant="flat">Login</v-btn>
        </div>
      </v-alert>

      <template v-else>
        <v-row class="align-start">
          <v-col cols="12" lg="4" xl="3">
            <aside class="profile-sidebar">
              <v-row>
                <v-col cols="12" lg="12" md="6">
                  <v-card border rounded="lg" variant="flat">
                    <v-card-text class="pa-4 pa-sm-5">
                      <div class="avatar-wrap">
                        <v-avatar v-if="profilePreviewImage" class="profile-avatar" :image="profilePreviewImage" size="104" />
                        <v-avatar v-else class="profile-avatar initials-avatar" color="teal-darken-1" size="104">
                          {{ profileInitials }}
                        </v-avatar>

                        <div class="avatar-actions">
                          <v-btn
                            aria-label="Upload photo"
                            icon
                            rounded="lg"
                            size="small"
                            variant="tonal"
                            @click="openPhotoPicker"
                          >
                            <v-icon>mdi-camera-outline</v-icon>
                            <v-tooltip activator="parent" location="bottom">Upload photo</v-tooltip>
                          </v-btn>
                          <v-btn
                            aria-label="Remove photo"
                            :disabled="!profilePreviewImage"
                            icon
                            rounded="lg"
                            size="small"
                            variant="tonal"
                            @click="removePhoto"
                          >
                            <v-icon>mdi-delete-outline</v-icon>
                            <v-tooltip activator="parent" location="bottom">Remove photo</v-tooltip>
                          </v-btn>
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
                        <v-chip color="teal-darken-1" size="small" variant="tonal">{{ countryDisplayName }}</v-chip>
                        <v-chip :color="isAdmin ? 'success' : undefined" size="small" variant="tonal">
                          {{ isAdmin ? 'Admin' : 'Customer' }}
                        </v-chip>
                      </div>

                      <v-row class="mt-3">
                        <v-col cols="12" sm="6">
                          <v-card
                            border
                            elevation="1"
                            min-height="90"
                            rounded="lg"
                            variant="flat"
                          >
                            <v-card-text class="d-flex flex-column justify-center ga-1 pa-3">
                              <v-icon color="primary">mdi-package-variant-closed</v-icon>
                              <strong class="text-body-1 font-weight-bold">{{ orders.length }}</strong>
                              <span class="text-caption text-medium-emphasis">Orders</span>
                            </v-card-text>
                          </v-card>
                        </v-col>
                        <v-col cols="12" sm="6">
                          <v-card
                            border
                            elevation="1"
                            min-height="90"
                            rounded="lg"
                            variant="flat"
                          >
                            <v-card-text class="d-flex flex-column justify-center ga-1 pa-3">
                              <v-icon color="primary">mdi-cart-outline</v-icon>
                              <strong class="text-body-1 font-weight-bold">{{ cartStore.itemCount }}</strong>
                              <span class="text-caption text-medium-emphasis">Cart</span>
                            </v-card-text>
                          </v-card>
                        </v-col>
                        <v-col cols="12" sm="6">
                          <v-card
                            border
                            elevation="1"
                            min-height="90"
                            rounded="lg"
                            variant="flat"
                          >
                            <v-card-text class="d-flex flex-column justify-center ga-1 pa-3">
                              <v-icon color="primary">mdi-cash-multiple</v-icon>
                              <strong class="text-body-1 font-weight-bold">{{ totalSpentDisplay }}</strong>
                              <span class="text-caption text-medium-emphasis">Spent</span>
                            </v-card-text>
                          </v-card>
                        </v-col>
                        <v-col cols="12" sm="6">
                          <v-card
                            border
                            elevation="1"
                            min-height="90"
                            rounded="lg"
                            variant="flat"
                          >
                            <v-card-text class="d-flex flex-column justify-center ga-1 pa-3">
                              <v-icon color="primary">mdi-currency-usd</v-icon>
                              <strong class="text-body-1 font-weight-bold">{{ settings.currency }}</strong>
                              <span class="text-caption text-medium-emphasis">Currency</span>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </v-row>

                      <v-btn
                        block
                        class="logout-btn"
                        color="error"
                        rounded="lg"
                        variant="tonal"
                        @click="logout"
                      >
                        <v-icon start>mdi-logout</v-icon>
                        Logout
                      </v-btn>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" lg="12" md="6">
                  <v-card border rounded="lg" variant="flat">
                    <v-card-text class="pa-4 pa-sm-5">
                      <div class="readiness-head">
                        <v-progress-circular color="teal-darken-1" :model-value="profileCompletion" size="74" width="8">
                          {{ profileCompletion }}%
                        </v-progress-circular>
                        <div>
                          <h3>Account Readiness</h3>
                          <p>{{ completedProfileItems }} of {{ profileChecklist.length }} complete</p>
                        </div>
                      </div>

                      <div class="check-list">
                        <div
                          v-for="item in profileChecklist"
                          :key="item.label"
                          :class="['check-row', { complete: item.complete }]"
                        >
                          <v-icon size="18">{{ item.complete ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                          <span>{{ item.label }}</span>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </aside>
          </v-col>

          <v-col cols="12" lg="8" xl="9">
            <main class="profile-main">
              <div class="mb-3">
                <v-tabs
                  v-model="activeTab"
                  bg-color="white"
                  density="comfortable"
                  grow
                  inset
                  inset-padding="6"
                  inset-radius="5"
                  slider-color="teal-darken-1"
                >
                  <v-tab value="profile">
                    <v-icon start>mdi-account-edit-outline</v-icon>
                    Profile
                  </v-tab>
                  <v-tab value="orders">
                    <v-icon start>mdi-receipt-text-outline</v-icon>
                    Orders
                  </v-tab>
                  <v-tab value="security">
                    <v-icon start>mdi-shield-account-outline</v-icon>
                    Security
                  </v-tab>
                </v-tabs>
              </div>

              <v-tabs-window v-model="activeTab">
                <v-tabs-window-item value="profile">
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-card border class="h-100" rounded="lg" variant="flat">
                        <v-card-text class="pa-4 pa-sm-5">
                          <div class="panel-head">
                            <div>
                              <h2>Personal Details</h2>
                              <p>Saved to your Mindstore account.</p>
                            </div>
                          </div>

                          <v-row>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="profileForm.name"
                                density="comfortable"
                                label="Full Name"
                                maxlength="120"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="profileForm.email"
                                density="comfortable"
                                label="Email"
                                readonly
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-select
                                v-model="profileForm.countryCode"
                                density="comfortable"
                                item-title="label"
                                item-value="code"
                                :items="countryOptions"
                                label="Country"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                density="comfortable"
                                label="Currency"
                                :model-value="`${settings.currency} (Auto)`"
                                readonly
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-card border rounded="lg" variant="flat">
                        <v-card-text class="pa-4 pa-sm-5">
                          <div class="panel-head">
                            <div>
                              <h2>Delivery Profile</h2>
                              <p>Used to prefill checkout.</p>
                            </div>
                            <v-switch
                              v-model="settings.saveDeliveryDetails"
                              color="teal-darken-1"
                              density="compact"
                              hide-details
                              inset
                            />
                          </div>

                          <v-row>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.phone"
                                density="comfortable"
                                label="Phone Number"
                                maxlength="32"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.postalCode"
                                density="comfortable"
                                label="Postal Code"
                                maxlength="32"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12">
                              <v-text-field
                                v-model="settings.deliveryProfile.address"
                                density="comfortable"
                                label="Street Address"
                                maxlength="220"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.city"
                                density="comfortable"
                                label="City"
                                maxlength="96"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="settings.deliveryProfile.state"
                                density="comfortable"
                                label="State"
                                maxlength="96"
                                rounded="lg"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12">
                              <v-textarea
                                v-model="settings.deliveryProfile.instructions"
                                auto-grow
                                density="comfortable"
                                label="Delivery Notes"
                                maxlength="240"
                                rounded="lg"
                                rows="2"
                                variant="outlined"
                              />
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>

                    <v-col cols="12">
                      <v-card border rounded="lg" variant="flat">
                        <v-card-text class="pa-4 pa-sm-5">
                          <div class="panel-head">
                            <div>
                              <h2>Preferences</h2>
                              <p>Stored locally for this browser.</p>
                            </div>
                          </div>

                          <v-row>
                            <v-col cols="12" md="6">
                              <v-card border min-height="82" rounded="lg" variant="flat">
                                <v-card-text class="d-flex align-center justify-space-between ga-3 pa-3">
                                  <span class="d-flex flex-column ga-1">
                                    <strong>Order updates</strong>
                                    <small class="text-medium-emphasis">Email order status changes</small>
                                  </span>
                                  <v-switch v-model="settings.orderUpdates" color="teal-darken-1" hide-details inset />
                                </v-card-text>
                              </v-card>
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-card border min-height="82" rounded="lg" variant="flat">
                                <v-card-text class="d-flex align-center justify-space-between ga-3 pa-3">
                                  <span class="d-flex flex-column ga-1">
                                    <strong>Promotional emails</strong>
                                    <small class="text-medium-emphasis">Offers and seasonal drops</small>
                                  </span>
                                  <v-switch v-model="settings.promotionalEmails" color="teal-darken-1" hide-details inset />
                                </v-card-text>
                              </v-card>
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-card border min-height="82" rounded="lg" variant="flat">
                                <v-card-text class="d-flex align-center justify-space-between ga-3 pa-3">
                                  <span class="d-flex flex-column ga-1">
                                    <strong>Quick checkout</strong>
                                    <small class="text-medium-emphasis">Select cart items automatically</small>
                                  </span>
                                  <v-switch v-model="settings.quickCheckout" color="teal-darken-1" hide-details inset />
                                </v-card-text>
                              </v-card>
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-card border min-height="82" rounded="lg" variant="flat">
                                <v-card-text class="d-flex align-center justify-space-between ga-3 pa-3">
                                  <span class="d-flex flex-column ga-1">
                                    <strong>Low stock alerts</strong>
                                    <small class="text-medium-emphasis">Show inventory reminders</small>
                                  </span>
                                  <v-switch v-model="settings.lowStockAlerts" color="teal-darken-1" hide-details inset />
                                </v-card-text>
                              </v-card>
                            </v-col>
                          </v-row>

                          <div class="save-strip">
                            <span v-if="isFormDirty">Unsaved changes</span>
                            <span v-else>Profile is up to date</span>
                            <v-btn
                              color="teal-darken-1"
                              :disabled="!isFormDirty"
                              :loading="savingAll"
                              rounded="lg"
                              @click="saveAll"
                            >
                              Save Changes
                            </v-btn>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-tabs-window-item>

                <v-tabs-window-item value="orders">
                  <v-card border rounded="lg" variant="flat">
                    <v-card-text class="pa-4 pa-sm-5">
                      <div class="panel-head orders-head">
                        <div>
                          <h2>Orders</h2>
                          <p>{{ orders.length }} total, {{ completedOrderCount }} completed.</p>
                        </div>
                        <v-btn
                          aria-label="Refresh orders"
                          :loading="loading"
                          rounded="lg"
                          variant="tonal"
                          @click="fetchOrders"
                        >
                          <v-icon start>mdi-refresh</v-icon>
                          Refresh
                        </v-btn>
                      </div>

                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="orderSearch"
                            density="comfortable"
                            hide-details
                            label="Search Orders"
                            prepend-inner-icon="mdi-magnify"
                            rounded="lg"
                            variant="outlined"
                          />
                        </v-col>
                        <v-col cols="12" md="3" sm="6">
                          <v-select
                            v-model="orderStatusFilter"
                            density="comfortable"
                            hide-details
                            item-title="label"
                            item-value="value"
                            :items="orderStatusOptions"
                            label="Status"
                            rounded="lg"
                            variant="outlined"
                          />
                        </v-col>
                        <v-col cols="12" md="3" sm="6">
                          <v-select
                            v-model="orderSort"
                            density="comfortable"
                            hide-details
                            item-title="label"
                            item-value="value"
                            :items="orderSortOptions"
                            label="Sort"
                            rounded="lg"
                            variant="outlined"
                          />
                        </v-col>
                      </v-row>

                      <v-progress-linear v-if="loading" class="mt-4" color="teal-darken-1" indeterminate />

                      <div v-else-if="filteredOrders.length === 0" class="empty-orders">
                        <v-icon size="48">mdi-package-variant</v-icon>
                        <h3>{{ orders.length === 0 ? 'No orders yet' : 'No matching orders' }}</h3>
                        <p>
                          {{ orders.length === 0 ? 'Orders placed from your cart will appear here.'
                            : 'Adjust search or status filters.' }}
                        </p>
                        <v-btn color="teal-darken-1" rounded="lg" to="/" variant="flat">Shop Products</v-btn>
                      </div>

                      <v-expansion-panels v-else class="orders-list w-100" variant="accordion">
                        <v-expansion-panel v-for="order in filteredOrders" :key="order.order_id" class="order-item">
                          <v-expansion-panel-title>
                            <div class="order-title-row">
                              <div>
                                <p class="order-id">Order #{{ order.order_id }}</p>
                                <p class="order-date">{{ formatDate(order.created_at) }}</p>
                              </div>
                              <div class="order-summary">
                                <strong>{{ formatAmount(order.total_amount) }}</strong>
                                <v-chip :color="statusColor(order.status)" size="small" variant="tonal">
                                  {{ order.status }}
                                </v-chip>
                              </div>
                            </div>
                          </v-expansion-panel-title>
                          <v-expansion-panel-text>
                            <v-row>
                              <v-col cols="12" sm="4">
                                <v-card border rounded="lg" variant="flat">
                                  <v-card-text class="pa-3">
                                    <span class="d-block text-caption text-medium-emphasis">Items</span>
                                    <strong class="d-block mt-1">{{ order.items.length }}</strong>
                                  </v-card-text>
                                </v-card>
                              </v-col>
                              <v-col cols="12" sm="4">
                                <v-card border rounded="lg" variant="flat">
                                  <v-card-text class="pa-3">
                                    <span class="d-block text-caption text-medium-emphasis">Created</span>
                                    <strong class="d-block mt-1">{{ formatDate(order.created_at) }}</strong>
                                  </v-card-text>
                                </v-card>
                              </v-col>
                              <v-col cols="12" sm="4">
                                <v-card rounded="lg" variant="outlined">
                                  <v-card-text class="pa-3">
                                    <span class="d-block text-caption text-medium-emphasis">Status</span>
                                    <strong class="d-block mt-1">{{ order.status }}</strong>
                                  </v-card-text>
                                </v-card>
                              </v-col>
                            </v-row>

                            <div class="order-product-list">
                              <div
                                v-for="item in order.items"
                                :key="`${order.order_id}-${item.product_id}`"
                                class="order-product-row"
                              >
                                <div>
                                  <strong>{{ item.name || 'Product' }}</strong>
                                  <span>Qty {{ item.quantity || 1 }}</span>
                                </div>
                                <span>{{ item.product_id }}</span>
                              </div>
                            </div>

                            <div class="d-flex justify-end mt-4">
                              <v-btn
                                color="teal-darken-1"
                                :loading="invoiceLoadingOrderId === order.order_id"
                                prepend-icon="mdi-file-pdf-box"
                                rounded="lg"
                                variant="flat"
                                @click.stop="downloadInvoice(order)"
                              >
                                Invoice Download
                              </v-btn>
                            </div>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
                      </v-expansion-panels>
                    </v-card-text>
                  </v-card>
                </v-tabs-window-item>

                <v-tabs-window-item value="security">
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-card border rounded="lg" variant="flat">
                        <v-card-text class="pa-4 pa-sm-5">
                          <div class="panel-head">
                            <div>
                              <h2>Session</h2>
                              <p>Current account connection.</p>
                            </div>
                            <v-chip color="success" size="small" variant="tonal">Authenticated</v-chip>
                          </div>

                          <v-row>
                            <v-col cols="12">
                              <v-card border rounded="lg" variant="flat">
                                <v-card-text class="pa-3">
                                  <span class="d-block text-caption text-medium-emphasis">Email</span>
                                  <strong>{{ appStore.user?.email || 'Not available' }}</strong>
                                </v-card-text>
                              </v-card>
                            </v-col>
                            <v-col cols="12">
                              <v-card border rounded="lg" variant="flat">
                                <v-card-text class="pa-3">
                                  <span class="d-block text-caption text-medium-emphasis">User ID</span>
                                  <strong>{{ appStore.user?.user_id || appStore.user?.uid || 'Not available' }}</strong>
                                </v-card-text>
                              </v-card>
                            </v-col>
                            <v-col cols="12">
                              <v-card border rounded="lg" variant="flat">
                                <v-card-text class="pa-3">
                                  <span class="d-block text-caption text-medium-emphasis">Created</span>
                                  <strong>{{ formatDate(appStore.user?.created_at) }}</strong>
                                </v-card-text>
                              </v-card>
                            </v-col>
                            <v-col cols="12">
                              <v-card border rounded="lg" variant="flat">
                                <v-card-text class="pa-3">
                                  <span class="d-block text-caption text-medium-emphasis">Updated</span>
                                  <strong>{{ formatDate(appStore.user?.updated_at) }}</strong>
                                </v-card-text>
                              </v-card>
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-card border rounded="lg" variant="flat">
                        <v-card-text class="pa-4 pa-sm-5">
                          <div class="panel-head">
                            <div>
                              <h2>Account Actions</h2>
                              <p>Quick links for your account.</p>
                            </div>
                          </div>

                          <v-row>
                            <v-col cols="12">
                              <v-btn
                                block
                                color="teal-darken-1"
                                rounded="lg"
                                to="/cart"
                                variant="flat"
                              >
                                <v-icon start>mdi-cart-outline</v-icon>
                                Open Cart
                              </v-btn>
                            </v-col>
                            <v-col cols="12">
                              <v-btn
                                block
                                color="teal-darken-1"
                                rounded="lg"
                                to="/"
                                variant="tonal"
                              >
                                <v-icon start>mdi-storefront-outline</v-icon>
                                Continue Shopping
                              </v-btn>
                            </v-col>
                            <v-col v-if="isAdmin" cols="12">
                              <v-btn
                                block
                                color="success"
                                rounded="lg"
                                to="/admin"
                                variant="tonal"
                              >
                                <v-icon start>mdi-shield-star-outline</v-icon>
                                Admin
                              </v-btn>
                            </v-col>
                            <v-col cols="12">
                              <v-btn
                                block
                                color="error"
                                rounded="lg"
                                variant="tonal"
                                @click="logout"
                              >
                                <v-icon start>mdi-logout</v-icon>
                                Logout
                              </v-btn>
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-tabs-window-item>
              </v-tabs-window>
            </main>
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

    <v-dialog
      v-model="userAdminDialog"
      :fullscreen="xs"
      :max-width="userAdminDialogMaxWidth"
      scrollable
      width="100%"
    >
      <v-card
        class="d-flex flex-column"
        :class="{ 'h-100': xs }"
        :rounded="xs ? 0 : 'lg'"
      >
        <v-card-title class="d-flex align-start align-sm-center justify-space-between ga-3 px-4 px-sm-6 py-3 py-sm-4">
          <span class="text-subtitle-1 text-sm-h6 font-weight-bold text-wrap">User Admin Access</span>
          <v-btn
            aria-label="Close user admin dialog"
            icon
            rounded="lg"
            variant="text"
            @click="userAdminDialog = false"
          >
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-card-title>
        <v-card-text class="flex-grow-1 overflow-y-auto px-4 px-sm-6 py-3 py-sm-4">
          <v-alert
            color="teal-darken-1"
            :density="smAndDown ? 'compact' : 'default'"
            :icon="userAdminPinIcon"
            variant="tonal"
          >
            {{ userAdminPinHelpText }}
          </v-alert>

          <v-row v-if="userAdminRequiresMobile" class="mt-4" dense>
            <v-col cols="12" sm="5">
              <v-select
                v-model="userAdminPinForm.mobileCountryCode"
                :density="smAndDown ? 'compact' : 'comfortable'"
                item-title="label"
                item-value="code"
                :items="mobileCountryOptions"
                label="Country Code"
                rounded="lg"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="userAdminPinForm.mobileNumber"
                :density="smAndDown ? 'compact' : 'comfortable'"
                label="Mobile Number"
                maxlength="15"
                rounded="lg"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <div v-if="canRecoverUserAdminMobile" class="d-flex justify-center justify-sm-end mt-1">
            <v-btn
              color="teal-darken-1"
              :disabled="userAdminPinSaving"
              rounded="lg"
              variant="text"
              @click="recoverUserAdminMobile"
            >
              Forgot mobile?
            </v-btn>
          </div>

          <v-otp-input
            v-model="userAdminPinForm.pin"
            class="mt-4"
            :density="smAndDown ? 'compact' : 'comfortable'"
            :disabled="userAdminPinSaving"
            :length="userAdminPinLength"
            type="number"
            variant="outlined"
            @finish="submitUserAdminPin"
          />
          <div v-if="canResetUserAdminPin" class="d-flex justify-center justify-sm-end mt-2">
            <v-btn
              color="teal-darken-1"
              :disabled="userAdminPinSaving"
              rounded="lg"
              variant="text"
              @click="startUserAdminPinReset"
            >
              Forgot PIN?
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 px-sm-6 pb-4 pb-sm-5 d-flex flex-column flex-md-row align-stretch align-md-center ga-2">
          <v-btn
            :block="smAndDown"
            rounded="lg"
            variant="text"
            @click="userAdminDialog = false"
          >
            Cancel
          </v-btn>
          <v-spacer class="d-none d-md-flex" />
          <v-btn
            :block="smAndDown"
            color="teal-darken-1"
            :loading="userAdminPinSaving"
            rounded="lg"
            variant="flat"
            @click="submitUserAdminPin"
          >
            {{ userAdminPinActionLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
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
    normalizeMobileNumber
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
        const mobileNumber = resolveStoredMobileNumber()
        const mobileCountryCode = resolveDefaultMobileCountryCode()
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
          if (!result.startsWith('data:image/') || result.length > MAX_PHOTO_DATA_URL_LENGTH) {
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
.profile-page {
  min-height: 100vh;
  background: #e3e3e3;
}

.profile-shell {
  padding-top: 24px;
  padding-bottom: 32px;
}

.profile-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.profile-kicker {
  margin-bottom: 4px;
  font-size: 0.78rem;
  color: #616161;
  font-weight: 700;
  text-transform: uppercase;
}

.page-title {
  font-size: clamp(1.55rem, 2.6vw, 2.2rem);
  line-height: 1.25;
  font-weight: 600;
  color: #1f1f1f;
}

.profile-subtitle {
  margin-top: 6px;
  color: #616161;
  line-height: 1.55;
}

.topbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.profile-alert {
  margin-top: 16px;
}

.guest-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.guest-alert p {
  margin-top: 4px;
}

.profile-sidebar {
  position: sticky;
  top: 88px;
}

.profile-main {
  min-width: 0;
}

.avatar-wrap {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.profile-avatar {
  border: 1px solid #e0e0e0;
}

.initials-avatar {
  font-size: 1.75rem;
  font-weight: 700;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.profile-name {
  margin-top: 12px;
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: #212121;
  overflow-wrap: anywhere;
}

.profile-email,
.photo-name {
  margin-top: 4px;
  text-align: center;
  color: #616161;
  overflow-wrap: anywhere;
}

.photo-name {
  font-size: 0.82rem;
}

.profile-chip-row {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.logout-btn {
  margin-top: 16px;
}

.readiness-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.readiness-head h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #212121;
}

.readiness-head p {
  margin-top: 3px;
  color: #616161;
  font-size: 0.9rem;
}

.check-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #757575;
}

.check-row.complete {
  color: #00897B;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  font-size: 1.12rem;
  color: #212121;
  font-weight: 700;
}

.panel-head p {
  margin-top: 3px;
  color: #616161;
  font-size: 0.9rem;
}

.save-strip {
  margin-top: 16px;
  border-top: 1px solid #eeeeee;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #616161;
}

.orders-head {
  align-items: center;
}

.empty-orders {
  min-height: 300px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  color: #616161;
}

.empty-orders h3 {
  color: #212121;
  font-size: 1.15rem;
}

.orders-list {
  margin-top: 14px;
  gap: 10px;
}

.order-item {
  border: 1px solid #eeeeee;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: none !important;
}

.order-title-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.order-id {
  color: #212121;
  font-weight: 700;
}

.order-date {
  margin-top: 3px;
  color: #616161;
  font-size: 0.88rem;
}

.order-summary {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 7px;
  text-align: right;
}

.order-summary strong {
  color: #1976d2;
}

.order-product-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.order-product-row {
  border-top: 1px solid #eeeeee;
  padding-top: 8px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.order-product-row div {
  display: grid;
  gap: 3px;
}

.order-product-row strong {
  color: #212121;
}

.order-product-row span {
  color: #616161;
  font-size: 0.84rem;
  overflow-wrap: anywhere;
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

@media (max-width: 1279px) {
  .profile-sidebar {
    position: static;
  }
}

@media (max-width: 800px) {

  .profile-topbar,
  .guest-alert,
  .save-strip,
  .order-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .topbar-actions {
    justify-content: stretch;
  }

  .topbar-actions .v-btn,
  .save-strip .v-btn {
    width: 100%;
  }

  .order-summary {
    align-items: flex-start;
    text-align: left;
  }
}

@media (max-width: 600px) {
  .profile-shell {
    padding-top: 18px;
    padding-bottom: 24px;
  }

}
</style>
