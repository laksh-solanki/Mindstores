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
          <h1 class="page-title ml-2">
            Your <span class="highlight-serif">Profile</span>
          </h1>
        </div>

        <div v-if="appStore.isAuthenticated" class="topbar-actions">
          <button
            v-if="!appStore.user?.user_admin_hidden"
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
            <v-icon :class="{ 'mdi-spin': refreshing }" size="18" start
              >mdi-refresh</v-icon
            >
            Refresh
          </button>
          <button
            v-if="isReadonly"
            class="btn-flat-outline btn-with-icon"
            @click="isEditing = true"
          >
            <v-icon size="18" start>mdi-pencil</v-icon>
            Edit Profile
          </button>
          <button
            v-else
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
            <p>
              Your orders, cart, and saved checkout details are connected to
              your account.
            </p>
          </div>
          <v-btn class="btn-flat-solid mt-2 mt-sm-0" to="/login" variant="flat"
            >Login</v-btn
          >
        </div>
      </v-alert>

      <!-- Profile Workspace -->
      <template v-else>
        <!-- First Time Alert -->
        <v-alert
          v-if="profileCompletion < 100"
          class="custom-flat-alert error-alert mb-4"
          type="error"
          variant="tonal"
        >
          <div class="guest-alert">
            <div>
              <strong>Please complete your profile.</strong>
              <p>
                Fill up the missing details below to unlock all features.
              </p>
            </div>
          </div>
        </v-alert>
        <div class="flat-card-container px-4 py-6 px-md-8 py-md-8">
          <v-row class="align-start">
            <!-- Sidebar -->
            <v-col cols="12" lg="4" xl="3">
              <aside class="profile-sidebar">
                <v-row>
                  <!-- Profile Identity Card -->
                  <v-col cols="12" lg="12" md="6">
                    <div class="mb-6">
                      <div class="avatar-wrap">
                        <v-avatar
                          v-if="profilePreviewImage"
                          class="profile-avatar"
                          :image="profilePreviewImage"
                          size="104"
                        />
                        <v-avatar
                          v-else
                          class="profile-avatar initials-avatar"
                          color="teal-darken-1"
                          size="104"
                        >
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
                      />

                      <h2 class="profile-name">{{ displayName }}</h2>
                      <p class="profile-email">
                        {{ appStore.user?.email || "No email available" }}
                      </p>
                      <p v-if="selectedPhotoName" class="photo-name">
                        {{ selectedPhotoName }}
                      </p>

                      <div class="profile-chip-row">
                        <span class="custom-badge badge-teal">{{
                          countryDisplayName
                        }}</span>
                        <span
                          class="custom-badge"
                          :class="isAdmin ? 'badge-success' : 'badge-slate'"
                        >
                          {{ isAdmin ? "Admin" : "Customer" }}
                        </span>
                      </div>

                      <!-- Sidebar Stats Grid -->
                      <div class="stats-flat-grid mt-4">
                        <div class="stat-flat-box">
                          <v-icon color="teal-darken-1" size="20"
                            >mdi-package-variant-closed</v-icon
                          >
                          <span class="stat-value">{{ orders.length }}</span>
                          <span class="stat-label">Orders</span>
                        </div>
                        <div class="stat-flat-box">
                          <v-icon color="teal-darken-1" size="20"
                            >mdi-cart-outline</v-icon
                          >
                          <span class="stat-value">{{
                            cartStore.itemCount
                          }}</span>
                          <span class="stat-label">Cart</span>
                        </div>
                        <div class="stat-flat-box">
                          <v-icon color="teal-darken-1" size="20"
                            >mdi-cash-multiple</v-icon
                          >
                          <span class="stat-value">{{ totalSpentDisplay }}</span>
                          <span class="stat-label">Spent</span>
                        </div>
                        <div class="stat-flat-box">
                          <v-icon color="teal-darken-1" size="20"
                            >mdi-currency-usd</v-icon
                          >
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
                    <div class="mb-6">
                      <div class="readiness-head">
                        <v-progress-circular
                          color="teal-darken-1"
                          :model-value="profileCompletion"
                          size="68"
                          width="6"
                        >
                          {{ profileCompletion }}%
                        </v-progress-circular>
                        <div>
                          <h3 class="readiness-title">Account Readiness</h3>
                          <p class="readiness-subtitle">
                            {{ completedProfileItems }} of
                            {{ profileChecklist.length }} complete
                          </p>
                        </div>
                      </div>

                      <div class="check-list mt-4">
                        <div
                          v-for="item in profileChecklist"
                          :key="item.label"
                          :class="['check-row', { complete: item.complete }]"
                        >
                          <v-icon size="16">{{
                            item.complete
                              ? "mdi-check-circle"
                              : "mdi-circle-outline"
                          }}</v-icon>
                          <span>{{ item.label }}</span>
                        </div>
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </aside>
            </v-col>

            <!-- Main Panel -->
            <v-col cols="12" lg="8" xl="9">
              <main class="profile-main">
                <div class="tab-contents-flat">
                  <v-row>
                    <!-- Personal Details Form -->
                    <v-col cols="12" md="6">
                      <div class="mb-8 h-100">
                        <div class="panel-head">
                          <div>
                            <h2 class="panel-title">Personal Details</h2>
                            <p class="panel-subtitle">
                              Saved to your Mindstore account.
                            </p>
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
                              :error="!profileForm.name"
                              :readonly="isReadonly"
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
                              :error="!profileForm.countryCode"
                              :readonly="isReadonly"
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-select
                              v-model="settings.currency"
                              class="flat-text-field"
                              density="comfortable"
                              :items="ALLOWED_CURRENCIES"
                              label="Currency"
                              variant="outlined"
                              :error="!settings.currency"
                              :readonly="isReadonly"
                            />
                          </v-col>
                        </v-row>
                      </div>
                    </v-col>

                    <!-- Delivery Profile Form -->
                    <v-col cols="12" md="6">
                      <div class="mb-8">
                        <div
                          class="panel-head d-flex justify-space-between align-center"
                        >
                          <div>
                            <h2 class="panel-title">Delivery Profile</h2>
                            <p class="panel-subtitle">
                              Used to prefill checkout.
                            </p>
                          </div>
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
                              :error="!settings.deliveryProfile.phone"
                              :readonly="isReadonly"
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
                              :error="!settings.deliveryProfile.postalCode"
                              :readonly="isReadonly"
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
                              :error="!settings.deliveryProfile.address"
                              :readonly="isReadonly"
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
                              :error="!settings.deliveryProfile.city"
                              :readonly="isReadonly"
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
                              :error="!settings.deliveryProfile.state"
                              :readonly="isReadonly"
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
                              :readonly="isReadonly"
                            />
                          </v-col>
                        </v-row>
                      </div>
                    </v-col>

                    <!-- Preferences Panel -->
                    <v-col cols="12">
                      <div class="mb-8">
                        <div class="panel-head">
                          <div>
                            <h2 class="panel-title">System Preferences</h2>
                            <p class="panel-subtitle">
                              Stored locally for this browser.
                            </p>
                          </div>
                        </div>

                        <v-row class="mt-2" dense>
                          <v-col cols="12" md="6">
                            <div class="preference-flat-card">
                              <div class="pref-details">
                                <strong>Order updates</strong>
                                <span class="pref-desc"
                                  >Email order status changes</span
                                >
                              </div>
                              <v-switch
                                v-model="settings.orderUpdates"
                                class="flat-switch"
                                color="teal-darken-1"
                                hide-details
                                inset
                                :readonly="isReadonly"
                              />
                            </div>
                          </v-col>
                          <v-col cols="12" md="6">
                            <div class="preference-flat-card">
                              <div class="pref-details">
                                <strong>Quick checkout</strong>
                                <span class="pref-desc"
                                  >Select cart items automatically</span
                                >
                              </div>
                              <v-switch
                                v-model="settings.quickCheckout"
                                class="flat-switch"
                                color="teal-darken-1"
                                hide-details
                                inset
                                :readonly="isReadonly"
                              />
                            </div>
                          </v-col>
                          <v-col cols="12" md="6">
                            <div class="preference-flat-card">
                              <div class="pref-details">
                                <strong>Promotional emails</strong>
                                <span class="pref-desc"
                                  >Receive offers and marketing emails</span
                                >
                              </div>
                              <v-switch
                                v-model="settings.promotionalEmails"
                                class="flat-switch"
                                color="teal-darken-1"
                                hide-details
                                inset
                                :readonly="isReadonly"
                              />
                            </div>
                          </v-col>
                          <v-col cols="12" md="6">
                            <div class="preference-flat-card">
                              <div class="pref-details">
                                <strong>Low stock alerts</strong>
                                <span class="pref-desc"
                                  >Notify when cart items are low in stock</span
                                >
                              </div>
                              <v-switch
                                v-model="settings.lowStockAlerts"
                                class="flat-switch"
                                color="teal-darken-1"
                                hide-details
                                inset
                                :readonly="isReadonly"
                              />
                            </div>
                          </v-col>
                          <v-col cols="12" md="6">
                            <div class="preference-flat-card">
                              <div class="pref-details">
                                <strong>Save delivery details</strong>
                                <span class="pref-desc"
                                  >Remember for future demo checkouts</span
                                >
                              </div>
                              <v-switch
                                v-model="settings.saveDeliveryDetails"
                                class="flat-switch"
                                color="teal-darken-1"
                                hide-details
                                inset
                                :readonly="isReadonly"
                              />
                            </div>
                          </v-col>
                        </v-row>

                        <!-- Save strip flat -->
                        <div class="save-strip-flat mt-6">
                          <button
                            class="btn-flat-solid w-100"
                            style="background-color: #ef4444; color: white; border-color: #ef4444;"
                            :disabled="deletingAccount"
                            @click="deleteAccount"
                          >
                            <v-icon size="16" start>mdi-delete</v-icon>
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </v-col>
                  </v-row>
                </div>
              </main>
            </v-col>
          </v-row>
        </div>
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
        <button aria-label="Close dialog" class="dialog-close-btn" @click="userAdminDialog = false">
          <v-icon>mdi-close</v-icon>
        </button>

        <div class="dialog-card-body d-flex flex-column pa-6">
          <div class="brand-tagline">
            <span class="tag-label">CONSOLE GATE</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">PIN CONTROL</span>
          </div>

          <h2 class="dialog-title text-wrap">
            User Admin <span class="highlight-serif">Access</span>
          </h2>

          <div class="custom-flat-alert info-alert mt-4">
            <v-icon class="alert-icon" size="18">{{ userAdminPinIcon }}</v-icon>
            <div class="alert-content">
              {{ userAdminPinHelpText }}
            </div>
          </div>

          <!-- Local User Admin Alerts -->
          <div
            v-if="userAdminAlert"
            :class="[
              'custom-flat-alert',
              `${userAdminAlert.type}-alert`,
              'mt-4',
            ]"
          >
            <v-icon class="alert-icon" size="18">
              {{
                userAdminAlert.type === "success"
                  ? "mdi-check-circle"
                  : userAdminAlert.type === "warning"
                    ? "mdi-alert"
                    : "mdi-alert-circle"
              }}
            </v-icon>
            <div class="alert-content">
              {{ userAdminAlert.message }}
            </div>
            <button
              aria-label="Dismiss alert"
              class="alert-close-btn ml-2"
              @click="userAdminAlert = null"
            >
              <v-icon size="16">mdi-close</v-icon>
            </button>
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
            <button class="btn-flat-outline" @click="userAdminDialog = false">
              Cancel
            </button>
            <button
              class="btn-flat-solid"
              :disabled="userAdminPinSaving"
              @click="submitUserAdminPin"
            >
              {{
                userAdminPinSaving ? "Verifying..." : userAdminPinActionLabel
              }}
            </button>
          </div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script>
import axios from "axios";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import BaseAlert from "@/components/BaseAlert.vue";
import { useAppStore } from "@/stores/app";
import { useCartStore } from "@/stores/cart";
import { API_URL, buildAuthenticatedRequestConfig } from "@/utils/api";
import {
  convertUsdAmount,
  fetchExchangeRates,
  formatCurrencyAmount,
} from "@/utils/currency";
import { safeDisplayImageUrl } from "@/utils/images";
import {
  formatMobileNumber,
  MOBILE_COUNTRY_OPTIONS,
  normalizeMobileCountryCode,
  normalizeMobileNumber,
  parseMobileNumber,
} from "@/utils/userAdmin";
import {
  ALLOWED_CURRENCIES,
  getCurrencyForCountry,
  loadUserSettings,
  normalizeCountryCode,
  normalizeDeliveryProfile,
  resolveCurrencyFromUserCountry,
  saveUserSettings,
  DEFAULT_SETTINGS as USER_SETTINGS_DEFAULTS,
} from "@/utils/userSettings";

const COUNTRY_OPTIONS_BASE = [
  { code: "US", label: "United States" },
  { code: "IN", label: "India" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SG", label: "Singapore" },
  { code: "JP", label: "Japan" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
];

const DEFAULT_COUNTRY_CODE = "IN";
const DEFAULT_MOBILE_COUNTRY_CODE = "+91";
const USER_ADMIN_PIN_LENGTH = 6;
const COUNTRY_TO_MOBILE_CODE = {
  US: "+1",
  CA: "+1",
  IN: "+91",
  GB: "+44",
  AU: "+61",
  AE: "+971",
  SG: "+65",
  DE: "+49",
  FR: "+33",
  IT: "+39",
  ES: "+34",
  NL: "+31",
  JP: "+81",
  BR: "+55",
  MX: "+52",
};
const DEFAULT_CURRENCY = USER_SETTINGS_DEFAULTS.currency;
const MAX_PHOTO_FILE_BYTES = 512 * 1024;
const MAX_PHOTO_DATA_URL_LENGTH = 700_000;
const DEFAULT_SETTINGS = {
  currency: DEFAULT_CURRENCY,
  orderUpdates: USER_SETTINGS_DEFAULTS.orderUpdates,
  promotionalEmails: USER_SETTINGS_DEFAULTS.promotionalEmails,
  quickCheckout: USER_SETTINGS_DEFAULTS.quickCheckout,
  lowStockAlerts: USER_SETTINGS_DEFAULTS.lowStockAlerts,
  saveDeliveryDetails: USER_SETTINGS_DEFAULTS.saveDeliveryDetails,
  deliveryProfile: { ...USER_SETTINGS_DEFAULTS.deliveryProfile },
};

const orderSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Total" },
  { value: "lowest", label: "Lowest Total" },
];

function cloneSettings(settings) {
  return {
    ...settings,
    deliveryProfile: { ...settings.deliveryProfile },
  };
}

function getCountryNameFromCode(code) {
  const normalizedCode = normalizeCountryCode(code || DEFAULT_COUNTRY_CODE);

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(normalizedCode) || normalizedCode;
  } catch {
    return normalizedCode;
  }
}

function normalizeOrder(order = {}) {
  return {
    ...order,
    order_id: order.order_id || order.id || "pending",
    status: String(order.status || "processing").trim() || "processing",
    subtotal_amount: Number(
      order.subtotal_amount ||
        order.subtotal ||
        order.total_amount ||
        order.total ||
        0,
    ),
    discount_amount: Number(order.discount_amount || order.discount || 0),
    total_amount: Number(order.total_amount || order.total || 0),
    created_at: order.created_at || order.createdAt || null,
    items: Array.isArray(order.items) ? order.items : [],
    billing_profile: normalizeInvoiceProfile(
      order.billing_profile || order.billingProfile || {},
    ),
  };
}

function normalizeInvoiceProfile(profile = {}) {
  return {
    name: String(profile.name || profile.full_name || "").trim(),
    email: String(profile.email || "").trim(),
    phone: String(profile.phone || "").trim(),
    address: String(profile.address || "").trim(),
    city: String(profile.city || "").trim(),
    state: String(profile.state || "").trim(),
    postalCode: String(
      profile.postal_code || profile.postalCode || profile.zip || "",
    ).trim(),
  };
}

function createSettingsSnapshot(settings) {
  return JSON.stringify({
    currency: settings.currency,
    orderUpdates: settings.orderUpdates,
    promotionalEmails: settings.promotionalEmails,
    quickCheckout: settings.quickCheckout,
    lowStockAlerts: settings.lowStockAlerts,
    saveDeliveryDetails: settings.saveDeliveryDetails,
    deliveryProfile: normalizeDeliveryProfile(settings.deliveryProfile),
  });
}

export default {
  name: "Profile",
  components: {
    BaseAlert,
  },
  setup() {
    const router = useRouter();
    const { smAndDown, xs } = useDisplay();
    const appStore = useAppStore();
    const cartStore = useCartStore();
    const orders = ref([]);
    const loading = ref(false);
    const refreshing = ref(false);
    const profileLoaded = ref(false);
    const savingAll = ref(false);
    const invoiceLoadingOrderId = ref("");
    const snackbar = ref(false);
    const snackbarText = ref("");
    const snackbarColor = ref("success");
    const fileInput = ref(null);
    const selectedPhotoName = ref("");
    const pictureChanged = ref(false);
    const activeTab = ref("profile");
    const orderSearch = ref("");
    const orderStatusFilter = ref("all");
    const orderSort = ref("newest");
    const deletingAccount = ref(false);
    const userAdminDialog = ref(false);
    const userAdminPinMode = ref("verify");
    const userAdminPinSaving = ref(false);
    const userAdminAlert = ref(null);
    const userAdminPinForm = ref({
      mobileCountryCode: DEFAULT_MOBILE_COUNTRY_CODE,
      mobileNumber: "",
      pin: "",
    });

    const settings = ref(cloneSettings(DEFAULT_SETTINGS));
    const settingsBaseline = ref(cloneSettings(DEFAULT_SETTINGS));

    const profileForm = ref({
      name: "",
      email: "",
      countryCode: "",
      picture: "",
    });

    const displayName = computed(() => {
      return profileForm.value.name || appStore.user?.name || "Mindstore User";
    });

    const profileInitials = computed(() => {
      const source = displayName.value || appStore.user?.email || "MS";
      return (
        String(source)
          .split(/\s+|@/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("") || "MS"
      );
    });

    const profileImage = computed(() =>
      safeDisplayImageUrl(
        appStore.user?.picture ||
          appStore.user?.photoURL ||
          appStore.user?.photo_url,
      ),
    );

    const profilePreviewImage = computed(() => {
      if (pictureChanged.value) {
        return safeDisplayImageUrl(profileForm.value.picture);
      }
      return profileImage.value;
    });

    const isAdmin = computed(() => Boolean(appStore.user?.is_admin));
    const userAdminDialogMaxWidth = computed(() =>
      xs.value ? undefined : 680,
    );
    const hasUserAdminPin = computed(() =>
      Boolean(
        appStore.user?.has_user_admin_pin ||
        appStore.user?.user_admin_pin_created_at,
      ),
    );
    const userAdminRequiresMobile = computed(
      () => !hasUserAdminPin.value || userAdminPinMode.value === "reset",
    );
    const canResetUserAdminPin = computed(
      () => hasUserAdminPin.value && userAdminPinMode.value !== "reset",
    );
    const canRecoverUserAdminMobile = computed(
      () => userAdminPinMode.value === "reset",
    );
    const userAdminPinActionLabel = computed(() => {
      if (userAdminPinMode.value === "reset") {
        return "Create New PIN";
      }
      return hasUserAdminPin.value ? "Open User Admin" : "Create PIN";
    });
    const userAdminPinHelpText = computed(() => {
      if (userAdminPinMode.value === "reset") {
        return "Enter the same mobile number used for User Admin and create a new 6 digit PIN.";
      }
      return hasUserAdminPin.value
        ? "Enter your User Admin PIN to open your product controls."
        : "Add your mobile number and create a 6 digit User Admin PIN. You will create this PIN only once.";
    });
    const userAdminPinIcon = computed(() => {
      if (userAdminPinMode.value === "reset") {
        return "mdi-lock-reset";
      }
      return hasUserAdminPin.value
        ? "mdi-lock-check-outline"
        : "mdi-lock-plus-outline";
    });

    const countryDisplayName = computed(() => {
      const countryCode =
        normalizeCountryCode(profileForm.value.countryCode) ||
        normalizeCountryCode(appStore.user?.country_code) ||
        DEFAULT_COUNTRY_CODE;
      return getCountryNameFromCode(countryCode);
    });

    const countryOptions = computed(() => {
      const selectedCountryCode = normalizeCountryCode(
        profileForm.value.countryCode,
      );
      if (
        !selectedCountryCode ||
        COUNTRY_OPTIONS_BASE.some((item) => item.code === selectedCountryCode)
      ) {
        return COUNTRY_OPTIONS_BASE;
      }

      return [
        ...COUNTRY_OPTIONS_BASE,
        {
          code: selectedCountryCode,
          label: getCountryNameFromCode(selectedCountryCode),
        },
      ];
    });

    const mobileCountryOptions = computed(() => {
      const selectedMobileCode = normalizeMobileCountryCode(
        userAdminPinForm.value.mobileCountryCode,
      );
      if (
        !selectedMobileCode ||
        MOBILE_COUNTRY_OPTIONS.some((item) => item.code === selectedMobileCode)
      ) {
        return MOBILE_COUNTRY_OPTIONS;
      }

      return [
        ...MOBILE_COUNTRY_OPTIONS,
        { code: selectedMobileCode, label: selectedMobileCode },
      ];
    });

    const isProfileDirty = computed(() => {
      const formName = String(profileForm.value.name || "").trim();
      const userName = String(appStore.user?.name || "").trim();
      const formCountry = normalizeCountryCode(
        profileForm.value.countryCode || "",
      );
      const userCountry = normalizeCountryCode(
        appStore.user?.country_code || DEFAULT_COUNTRY_CODE,
      );
      return (
        formName !== userName ||
        formCountry !== userCountry ||
        pictureChanged.value
      );
    });

    const isSettingsDirty = computed(
      () =>
        createSettingsSnapshot(settings.value) !==
        createSettingsSnapshot(settingsBaseline.value),
    );
    const isFormDirty = computed(
      () => isProfileDirty.value || isSettingsDirty.value,
    );

    const totalSpent = computed(() =>
      orders.value.reduce(
        (total, order) => total + Number(order.total_amount || 0),
        0,
      ),
    );
    const totalSpentDisplay = computed(() => formatAmount(totalSpent.value));
    const completedOrderCount = computed(
      () =>
        orders.value.filter(
          (order) => String(order.status || "").toLowerCase() === "completed",
        ).length,
    );

    const deliveryIsComplete = computed(() => {
      const delivery = settings.value.deliveryProfile || {};
      return Boolean(
        delivery.phone &&
        delivery.address &&
        delivery.city &&
        delivery.postalCode,
      );
    });

    const profileChecklist = computed(() => [
      {
        label: "Name",
        complete: Boolean(String(profileForm.value.name || "").trim()),
      },
      { label: "Email", complete: Boolean(appStore.user?.email) },
      {
        label: "Country",
        complete: Boolean(normalizeCountryCode(profileForm.value.countryCode)),
      },
      { label: "Photo", complete: Boolean(profilePreviewImage.value) },
      { label: "Delivery", complete: deliveryIsComplete.value },
    ]);

    const completedProfileItems = computed(
      () => profileChecklist.value.filter((item) => item.complete).length,
    );

    const profileCompletion = computed(() =>
      Math.round(
        (completedProfileItems.value / profileChecklist.value.length) * 100,
      ),
    );

    const orderStatusOptions = computed(() => {
      const statuses = [
        ...new Set(
          orders.value
            .map((order) => String(order.status || "").toLowerCase())
            .filter(Boolean),
        ),
      ];
      return [
        { value: "all", label: "All Status" },
        ...statuses.map((status) => ({
          value: status,
          label: status.replace(/(^|\s|-)\S/g, (match) => match.toUpperCase()),
        })),
      ];
    });

    const filteredOrders = computed(() => {
      const query = String(orderSearch.value || "")
        .trim()
        .toLowerCase();
      const status = String(orderStatusFilter.value || "all").toLowerCase();

      const filtered = orders.value.filter((order) => {
        const orderStatus = String(order.status || "").toLowerCase();
        const matchesStatus = status === "all" || orderStatus === status;
        const searchable = [
          order.order_id,
          order.status,
          order.total_amount,
          ...order.items.map((item) => item.name || item.product_id || ""),
        ]
          .join(" ")
          .toLowerCase();
        return matchesStatus && (!query || searchable.includes(query));
      });

      return filtered.toSorted((left, right) => {
        if (orderSort.value === "highest") {
          return (
            Number(right.total_amount || 0) - Number(left.total_amount || 0)
          );
        }
        if (orderSort.value === "lowest") {
          return (
            Number(left.total_amount || 0) - Number(right.total_amount || 0)
          );
        }

        const leftDate = new Date(left.created_at || 0).getTime();
        const rightDate = new Date(right.created_at || 0).getTime();
        return orderSort.value === "oldest"
          ? leftDate - rightDate
          : rightDate - leftDate;
      });
    });



    const resolveDefaultMobileCountryCode = () => {
      const storedMobileCountryCode = normalizeMobileCountryCode(
        appStore.user?.mobile_country_code,
      );
      if (storedMobileCountryCode) {
        return storedMobileCountryCode;
      }
      const profileCountryCode = normalizeCountryCode(
        profileForm.value.countryCode || appStore.user?.country_code,
      );
      return (
        COUNTRY_TO_MOBILE_CODE[profileCountryCode] ||
        DEFAULT_MOBILE_COUNTRY_CODE
      );
    };

    const resolveStoredMobileNumber = () => {
      return normalizeMobileNumber(appStore.user?.mobile_number);
    };

    const resolveStoredMobileDisplay = () => {
      return (
        formatMobileNumber(
          appStore.user?.mobile_country_code,
          appStore.user?.mobile_number,
        ) || String(appStore.user?.mobile_full_number || "").trim()
      );
    };

    const loadProfileForm = () => {
      profileForm.value = {
        name: appStore.user?.name || "",
        email: appStore.user?.email || "",
        countryCode: normalizeCountryCode(
          appStore.user?.country_code ||
            appStore.user?.country ||
            DEFAULT_COUNTRY_CODE,
        ),
        picture: profileImage.value || "",
      };
      selectedPhotoName.value = "";
      pictureChanged.value = false;
    };

    const loadSettings = () => {
      const loaded = loadUserSettings();
      const userDelivery = appStore.user?.delivery_profile || {};
      const deliveryProfile = normalizeDeliveryProfile({
        phone: userDelivery.phone || loaded.deliveryProfile?.phone || "",
        address: userDelivery.address || loaded.deliveryProfile?.address || "",
        city: userDelivery.city || loaded.deliveryProfile?.city || "",
        state: userDelivery.state || loaded.deliveryProfile?.state || "",
        postalCode:
          userDelivery.postal_code ||
          userDelivery.postalCode ||
          loaded.deliveryProfile?.postalCode ||
          "",
        instructions:
          userDelivery.instructions ||
          loaded.deliveryProfile?.instructions ||
          "",
      });
      const storedMobileDisplay = resolveStoredMobileDisplay();
      if (storedMobileDisplay && !deliveryProfile.phone) {
        deliveryProfile.phone = storedMobileDisplay;
      }
      settings.value = cloneSettings({
        ...DEFAULT_SETTINGS,
        currency:
          appStore.user?.currency || loaded.currency || DEFAULT_CURRENCY,
        orderUpdates:
          appStore.user?.order_updates === undefined
            ? loaded.orderUpdates
            : appStore.user.order_updates,
        promotionalEmails:
          appStore.user?.promotional_emails === undefined
            ? loaded.promotionalEmails
            : appStore.user.promotional_emails,
        quickCheckout:
          appStore.user?.quick_checkout === undefined
            ? loaded.quickCheckout
            : appStore.user.quick_checkout,
        lowStockAlerts:
          appStore.user?.low_stock_alerts === undefined
            ? loaded.lowStockAlerts
            : appStore.user.low_stock_alerts,
        saveDeliveryDetails:
          appStore.user?.save_delivery_details === undefined
            ? loaded.saveDeliveryDetails
            : appStore.user.save_delivery_details,
        deliveryProfile,
      });
      settingsBaseline.value = cloneSettings(settings.value);
    };

    const openPhotoPicker = () => {
      fileInput.value?.click();
    };

    const showMessage = (message, color = "success") => {
      snackbarText.value = message;
      snackbarColor.value = color;
      snackbar.value = true;
    };

    const normalizeUserAdminPin = () =>
      String(userAdminPinForm.value.pin || "")
        .replace(/\D+/g, "")
        .slice(0, USER_ADMIN_PIN_LENGTH);

    const getUserAdminMobilePayload = () => {
      const mobileCountryCode = normalizeMobileCountryCode(
        userAdminPinForm.value.mobileCountryCode,
      );
      const mobileNumber = normalizeMobileNumber(
        userAdminPinForm.value.mobileNumber,
      );
      return { mobileCountryCode, mobileNumber };
    };

    const syncUserAdminMobileToDeliveryProfile = (
      profile = {},
      fallbackCountryCode = "",
      fallbackMobileNumber = "",
    ) => {
      const savedMobile = formatMobileNumber(
        profile.mobile_country_code || fallbackCountryCode,
        profile.mobile_number || fallbackMobileNumber,
      );
      if (!savedMobile) {
        return;
      }
      const existingSettings = loadUserSettings();
      const deliveryProfile = {
        ...normalizeDeliveryProfile(existingSettings.deliveryProfile),
        phone: savedMobile,
      };
      saveUserSettings({
        ...existingSettings,
        deliveryProfile,
      });
      settings.value.deliveryProfile.phone = savedMobile;
      settingsBaseline.value = cloneSettings(settings.value);
    };

    const resetUserAdminAccessFlow = (
      mode = hasUserAdminPin.value ? "verify" : "create",
    ) => {
      userAdminPinMode.value = mode;
      userAdminPinSaving.value = false;
      userAdminAlert.value = null;
      userAdminPinForm.value = {
        mobileCountryCode: resolveDefaultMobileCountryCode(),
        mobileNumber: mode === "reset" ? "" : resolveStoredMobileNumber(),
        pin: "",
      };
    };

    const openUserAdminDialog = () => {
      if (!appStore.isAuthenticated) {
        showMessage("Please login before opening user admin.", "warning");
        return;
      }

      resetUserAdminAccessFlow();
      userAdminDialog.value = true;
    };

    const startUserAdminPinReset = () => {
      resetUserAdminAccessFlow("reset");
    };

    const recoverUserAdminMobile = () => {
      let mobileNumber = resolveStoredMobileNumber();
      let mobileCountryCode = resolveDefaultMobileCountryCode();

      if (mobileNumber) {
        // Parse the stored mobile number in case it contains country code or needs splitting
        const parsed = parseMobileNumber(
          formatMobileNumber(appStore.user?.mobile_country_code, mobileNumber),
        );
        if (parsed.mobileNumber) {
          mobileNumber = parsed.mobileNumber;
          mobileCountryCode = parsed.countryCode || mobileCountryCode;
        }
      } else {
        // Fall back to delivery profile phone number
        const deliveryPhone = settings.value.deliveryProfile?.phone;
        if (deliveryPhone) {
          const parsed = parseMobileNumber(deliveryPhone);
          if (parsed.mobileNumber) {
            mobileNumber = parsed.mobileNumber;
            mobileCountryCode = parsed.countryCode || mobileCountryCode;
          }
        }
      }

      if (!mobileNumber) {
        userAdminAlert.value = {
          message: "No saved User Admin mobile number found.",
          type: "warning",
        };
        return;
      }

      userAdminPinForm.value = {
        ...userAdminPinForm.value,
        mobileCountryCode,
        mobileNumber,
      };
      userAdminAlert.value = {
        message: `Saved mobile added. Ends with ${mobileNumber.slice(-4)}.`,
        type: "success",
      };
    };

    const submitUserAdminPin = async () => {
      if (userAdminPinSaving.value) {
        return;
      }

      userAdminAlert.value = null;
      const pin = normalizeUserAdminPin();
      userAdminPinForm.value.pin = pin;
      const requiresMobile = userAdminRequiresMobile.value;
      const { mobileCountryCode, mobileNumber } = getUserAdminMobilePayload();

      if (requiresMobile && !mobileCountryCode) {
        userAdminAlert.value = {
          message: "Select a valid country code.",
          type: "warning",
        };
        return;
      }
      if (requiresMobile && !mobileNumber) {
        userAdminAlert.value = {
          message: "Enter the mobile number used for User Admin.",
          type: "warning",
        };
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        userAdminAlert.value = {
          message: "Enter a 6 digit User Admin PIN.",
          type: "warning",
        };
        return;
      }

      userAdminPinSaving.value = true;
      try {
        const response =
          userAdminPinMode.value === "reset"
            ? await appStore.resetUserAdminPin({
                mobileCountryCode,
                mobileNumber,
                pin,
              })
            : await appStore.submitUserAdminPin({
                mobileCountryCode: requiresMobile
                  ? mobileCountryCode
                  : undefined,
                mobileNumber: requiresMobile ? mobileNumber : undefined,
                pin,
              });
        if (requiresMobile) {
          syncUserAdminMobileToDeliveryProfile(
            response?.profile,
            mobileCountryCode,
            mobileNumber,
          );
        }
        userAdminAlert.value = {
          message:
            response?.message ||
            (hasUserAdminPin.value
              ? "PIN verified. Redirecting..."
              : "PIN created. Redirecting..."),
          type: "success",
        };
        setTimeout(async () => {
          userAdminDialog.value = false;
          resetUserAdminAccessFlow();
          await router.push("/user-admin");
        }, 1500);
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit User Admin PIN";
        userAdminAlert.value = { message: errorMessage, type: "error" };
      } finally {
        // If successful, we keep loading state active until dialog closes/routes
        if (!userAdminAlert.value || userAdminAlert.value.type !== "success") {
          userAdminPinSaving.value = false;
        }
      }
    };

    const onPhotoSelected = (event) => {
      const file = event?.target?.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }

      if (!file.type?.startsWith("image/")) {
        showMessage("Please choose an image file.", "warning");
        return;
      }

      if (file.size > MAX_PHOTO_FILE_BYTES) {
        showMessage("Image too large. Maximum size is 512KB.", "warning");
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const result = String(reader.result || "");
        if (
          result.length > MAX_PHOTO_DATA_URL_LENGTH ||
          !result.startsWith("data:image/")
        ) {
          showMessage("Unsupported image format or size.", "warning");
          return;
        }
        profileForm.value.picture = result;
        selectedPhotoName.value = file.name;
        pictureChanged.value = true;
      });
      reader.addEventListener("error", () => {
        showMessage("Unable to read image file.", "error");
      });
      reader.readAsDataURL(file);
    };

    const removePhoto = () => {
      profileForm.value.picture = "";
      selectedPhotoName.value = "";
      pictureChanged.value = true;
    };

    const saveAll = async () => {
      if (!appStore.isAuthenticated) {
        showMessage("Please login before saving profile details.", "warning");
        return;
      }

      const name = String(profileForm.value.name || "").trim();
      if (!name) {
        showMessage("Full name is required.", "warning");
        return;
      }

      savingAll.value = true;
      try {
        if (isFormDirty.value) {
          await appStore.updateAccountProfile({
            name,
            countryCode: profileForm.value.countryCode,
            picture: pictureChanged.value
              ? profileForm.value.picture
              : undefined,
            deliveryProfile: settings.value.deliveryProfile,
            currency: settings.value.currency,
            orderUpdates: settings.value.orderUpdates,
            promotionalEmails: settings.value.promotionalEmails,
            quickCheckout: settings.value.quickCheckout,
            lowStockAlerts: settings.value.lowStockAlerts,
            saveDeliveryDetails: settings.value.saveDeliveryDetails,
          });
        }

        const existingSettings = loadUserSettings();
        saveUserSettings({
          ...existingSettings,
          displayName: name,
          currency: settings.value.currency,
          orderUpdates: settings.value.orderUpdates,
          promotionalEmails: settings.value.promotionalEmails,
          quickCheckout: settings.value.quickCheckout,
          lowStockAlerts: settings.value.lowStockAlerts,
          saveDeliveryDetails: settings.value.saveDeliveryDetails,
          deliveryProfile: settings.value.deliveryProfile,
        });

        loadProfileForm();
        loadSettings();
        isEditing.value = false;
        showMessage("Profile saved");
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message || error?.message || "";
        const isNotAuthenticated =
          error?.response?.status === 401 ||
          errorMessage === "Not authenticated";
        showMessage(
          isNotAuthenticated
            ? "Not authenticated"
            : errorMessage || "Failed to save profile",
          "error",
        );
      } finally {
        savingAll.value = false;
      }
    };

    const fetchOrders = async () => {
      if (!appStore.isAuthenticated) {
        orders.value = [];
        return;
      }

      loading.value = true;
      try {
        const response = await axios.get(
          `${API_URL}/orders`,
          await buildAuthenticatedRequestConfig(),
        );
        const payload = Array.isArray(response.data)
          ? response.data
          : response.data?.orders || [];
        orders.value = Array.isArray(payload)
          ? payload.map((order) => normalizeOrder(order))
          : [];
      } catch (error) {
        const isNotAuthenticated = error?.response?.status === 401;
        if (isNotAuthenticated) {
          orders.value = [];
          return;
        }
        console.error("Failed to fetch orders:", error);
        showMessage("Failed to load orders.", "error");
      } finally {
        loading.value = false;
      }
    };

    const refreshProfile = async ({ silent = false } = {}) => {
      if (!appStore.isAuthenticated) {
        return;
      }

      refreshing.value = true;
      try {
        await Promise.allSettled([
          appStore.refreshCurrentUser(),
          cartStore.fetchCart(),
        ]);
        await fetchOrders();
        profileLoaded.value = true;
        if (!silent) {
          showMessage("Profile refreshed");
        }
      } finally {
        refreshing.value = false;
      }
    };

    const deleteAccount = async () => {
      if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone and will delete all your products and data.")) {
        return;
      }
      deletingAccount.value = true;
      try {
        await appStore.deleteAccount();
        router.push("/");
      } catch (error) {
        showMessage(error?.message || "Failed to delete account", "error");
      } finally {
        deletingAccount.value = false;
      }
    };

    const logout = async () => {
      orders.value = [];
      cartStore.clearCart();
      await appStore.logout();
      router.push("/");
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString || 0);
      if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
        return "Not available";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    const formatAmount = (amount) => {
      return formatCurrencyAmount(amount, settings.value.currency || "USD");
    };

    const formatPdfAmount = (amount) => {
      const currency = settings.value.currency || DEFAULT_CURRENCY;
      const converted = convertUsdAmount(amount, currency);
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
      return `${currency} ${formatted}`;
    };

    const formatInvoiceDate = (dateString) => {
      const date = new Date(dateString || 0);
      if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
        return "Date unavailable";
      }
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date);
    };

    const resolveInvoiceProfile = (order) => {
      const savedProfile = normalizeInvoiceProfile(order.billing_profile);
      const deliveryProfile = normalizeDeliveryProfile(
        settings.value.deliveryProfile,
      );
      return {
        name:
          savedProfile.name ||
          displayName.value ||
          appStore.user?.name ||
          "Customer",
        email: savedProfile.email || appStore.user?.email || "",
        phone: savedProfile.phone || deliveryProfile.phone || "",
        address: savedProfile.address || deliveryProfile.address || "",
        city: savedProfile.city || deliveryProfile.city || "",
        state: savedProfile.state || deliveryProfile.state || "",
        postalCode: savedProfile.postalCode || deliveryProfile.postalCode || "",
      };
    };

    const downloadInvoice = async (order) => {
      if (!order?.order_id) {
        showMessage("Order id not found.", "warning");
        return;
      }

      invoiceLoadingOrderId.value = order.order_id;
      try {
        await fetchExchangeRates();
        const profile = resolveInvoiceProfile(order);
        const { createInvoicePdfBlob } = await import("@/utils/invoice");
        const blob = await createInvoicePdfBlob({
          order,
          profile,
          formatAmount: formatPdfAmount,
          formatDate: formatInvoiceDate,
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `demo-order-summary-${order.order_id}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showMessage("Demo order summary downloaded");
      } catch (error) {
        console.error("Failed to generate demo order summary:", error);
        showMessage("Failed to generate demo order summary.", "error");
      } finally {
        invoiceLoadingOrderId.value = "";
      }
    };

    const statusColor = (status) => {
      const normalizedStatus = String(status || "").toLowerCase();
      if (normalizedStatus === "completed") return "success";
      if (normalizedStatus === "cancelled" || normalizedStatus === "failed")
        return "error";
      if (normalizedStatus === "shipped") return "info";
      return "warning";
    };

    watch(
      () => appStore.user,
      () => {
        loadProfileForm();
        loadSettings();
      },
      { immediate: true },
    );

    const isEditing = ref(false);

    const isReadonly = computed(
      () => profileCompletion.value === 100 && !isFormDirty.value && !isEditing.value,
    );



    watch(
      () => [appStore.isAuthenticated, appStore.loading],
      ([isAuthenticated, isLoading]) => {
        if (isLoading) {
          return;
        }

        if (!isAuthenticated) {
          orders.value = [];
          profileLoaded.value = false;
          return;
        }

        if (!profileLoaded.value) {
          void refreshProfile({ silent: true });
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      void fetchExchangeRates();
    });

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
      userAdminAlert,
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
      deleteAccount,
      deletingAccount,
      downloadInvoice,
      logout,
      formatDate,
      formatAmount,
      statusColor,
      isReadonly,
      isEditing,
      ALLOWED_CURRENCIES,
    };
  },
};
</script>

<style scoped>
/* ════════════════════════════════ PAGE ROOT ═══ */
.profile-page {
  min-height: 100vh;
  background: #f8fafc;
  transition: background-color 0.3s ease;
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
  border-bottom: 2px solid #0f172a;
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
  border: 2px solid #0f172a;

  padding: 28px;
  margin-bottom: 24px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15);
  border-radius: 0 !important;
}

:deep(.v-theme--dark) .flat-card-container {
  background-color: #121824 !important;
  border: 2px solid #f8fafc !important;

  color: #f8fafc !important;
  border-radius: 0 !important;
}

.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  position: relative;
}

.profile-avatar {
  border: 3px double #0f172a !important;
  padding: 4px;
  background: #ffffff;

  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.profile-avatar:hover {
  transform: rotate(3deg) scale(1.05);
}

:deep(.v-theme--dark) .profile-avatar {
  border: 3px double #f8fafc !important;
  background: #121824;
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
  width: 36px;
  height: 36px;
  background: #ffffff;
  border: 2px solid #0f172a;

  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #0f172a;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.15);
  border-radius: 0 !important;
}

.avatar-action-btn:hover {
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

:deep(.v-theme--dark) .avatar-action-btn {
  background: #121824 !important;
  border: 2px solid #f8fafc !important;
  color: #f8fafc !important;
  border-radius: 0 !important;
}

:deep(.v-theme--dark) .avatar-action-btn:hover {
  background: #1e293b !important;
}

:deep(.v-theme--dark) .avatar-action-btn.delete-photo:hover:not(:disabled) {
  border-color: #fca5a5 !important;
  color: #fca5a5 !important;
  background: #7f1d1d !important;
}

.profile-name {
  margin-top: 16px;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  word-break: break-all;
}

.profile-email {
  margin-top: 4px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
  word-break: break-all;
}

.photo-name {
  font-size: 11px;
  color: #0d9488;
  text-align: center;
  margin-top: 4px;
  font-weight: 700;
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
  font-weight: 800;
  padding: 6px 12px;
  border: 2px solid currentColor;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 0 !important;
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

:deep(.v-theme--dark) .badge-teal {
  color: #2dd4bf;
  background: #115e59;
}

:deep(.v-theme--dark) .badge-success {
  color: #4ade80;
  background: #14532d;
}

:deep(.v-theme--dark) .badge-slate {
  color: #cbd5e1;
  background: #1e293b;
}

/* Sidebar Stats Grid */
.stats-flat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.stat-flat-box {
  border: 2px solid #0f172a;

  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15);
  border-radius: 0 !important;
}

.stat-flat-box:hover {
  background: #f0fdfa;
}

.stat-value {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.v-theme--dark) .stat-flat-box {
  border: 2px solid #f8fafc !important;

  background-color: #121824 !important;
  border-radius: 0 !important;
  border-color: #f8fafc !important;
}

:deep(.v-theme--dark) .stat-flat-box:hover {
  background-color: #0f766e !important;
}

/* Sidebar Logout button */
.logout-btn-flat {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
}

.logout-btn-flat:hover {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
}

/* Readiness Tracker */
.readiness-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.readiness-head :deep(.v-progress-circular) {
  color: #0d9488 !important;
  font-weight: 800;
  font-size: 14px;
}

.readiness-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.readiness-subtitle {
  font-size: 12px;
  color: #64748b;
  font-weight: 700;
  margin-top: 2px;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
  border: 2px solid #cbd5e1;
  background: #f8fafc;
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15);
}

.check-row.complete {
  color: #0f766e;
  border-color: #0d9488;
  background: #f0fdfa;
}

:deep(.v-theme--dark) .check-row {
  border: 2px solid #475569 !important;
  background: #0f172a !important;
  color: #94a3b8 !important;
}

:deep(.v-theme--dark) .check-row.complete {
  color: #2dd4bf !important;
  border-color: #0d9488 !important;
  background: #115e59 !important;
}

/* ════════════════════════════════ MAIN CONTAINER ═ */
.profile-sidebar {
  position: sticky;
  top: 40px;
}

/* Custom Tabs style overrides */
.tabs-header-flat {
  border-bottom: 2px solid #0f172a;
  margin-bottom: 24px;
}

.custom-editorial-tabs :deep(.v-slide-group__content) {
  gap: 8px;
}

.custom-editorial-tabs :deep(.v-tab) {
  border-radius: 0 !important;
  border: 2px solid #cbd5e1 !important;
  border-bottom: none !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  color: #64748b !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
}

.custom-editorial-tabs :deep(.v-tab:hover) {
  background: #f1f5f9 !important;
}

.custom-editorial-tabs :deep(.v-tab--selected) {
  color: #ffffff !important;
  background: #0d9488 !important;
  border-color: #0f172a !important;
}

:deep(.v-theme--dark) .tabs-header-flat {
  border-bottom: 2px solid #f8fafc !important;
}

:deep(.v-theme--dark) .custom-editorial-tabs :deep(.v-tab) {
  border: 2px solid #f8fafc !important;
  border-bottom: none !important;
  color: #f8fafc !important;
  background: #121824 !important;
}

:deep(.v-theme--dark) .custom-editorial-tabs :deep(.v-tab:hover) {
  background: #1e293b !important;
}

:deep(.v-theme--dark) .custom-editorial-tabs :deep(.v-tab--selected) {
  color: #090d16 !important;
  background: #f8fafc !important;
}

/* Tab Panels */
.panel-head {
  border-bottom: 2px solid #0f172a;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.panel-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.panel-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
  font-weight: 600;
}

:deep(.v-theme--dark) .panel-head {
  border-bottom-color: #f8fafc !important;
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
  border: 2px solid #cbd5e1 !important;
  background-color: #ffffff !important;
  transition: all 0.2s ease !important;
  border-radius: 0 !important;
}

.flat-text-field :deep(.v-field--focused) {
  border-color: #0f172a !important;
}

:deep(.v-theme--dark) .flat-text-field :deep(.v-field) {
  border: 2px solid #f8fafc !important;
  background-color: #121824 !important;
  border-radius: 0 !important;
}

/* Preference Box */
.preference-flat-card {
  border: 2px solid #cbd5e1;
  padding: 18px;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  transition: all 0.25s ease;
  border-radius: 0 !important;
  box-shadow: 2px 2px 0px 0px #0f172a;
}

.preference-flat-card:hover {
  border-color: #0f172a;

  background: #ffffff;
}

.pref-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pref-details strong {
  font-size: 14px;
  color: #0f172a;
  font-weight: 800;
}

.pref-desc {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

:deep(.v-theme--dark) .preference-flat-card {
  border: 2px solid #f8fafc !important;

  background-color: #121824 !important;
  border-radius: 0 !important;
  box-shadow: 2px 2px 0px 0px #0f172a;
  box-shadow: 2px 2px 0px 0px #2dd4bf !important;
}

:deep(.v-theme--dark) .preference-flat-card:hover {
  background-color: #1e293b !important;
}

/* Save Strip */
.save-strip-flat {
  border-top: 2px solid #cbd5e1;
  padding-top: 20px;
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.dirty-state-text {
  font-size: 12px;
  font-weight: 800;
  color: #d97706;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clean-state-text {
  font-size: 12px;
  font-weight: 800;
  color: #16a34a;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Guest Alert */
.custom-flat-alert {
  border-radius: 0 !important;
  font-size: 13px !important;
  border: 2px solid currentColor !important;
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
  border: 2px dashed #0f172a;
  padding: 32px;
  background: #ffffff;
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
  border: 2px solid #0f172a !important;
  margin-bottom: 16px !important;

  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  background: #ffffff !important;
}

.flat-expansion-panels :deep(.v-expansion-panel--active) {
  border-color: #0f172a !important;
}

.flat-expansion-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 24px !important;
}

:deep(.v-theme--dark) .flat-expansion-panels :deep(.v-expansion-panel) {
  border: 2px solid #f8fafc !important;

  background: #121824 !important;
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
  font-weight: 700;
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
  font-weight: 800;
  padding: 3px 10px;
  border: 2px solid currentColor;
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
  border: 2px solid #cbd5e1;
  padding: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.order-detail-minibox:hover {
  border-color: #0f172a;
  background: #ffffff;
}

:deep(.v-theme--dark) .order-detail-minibox {
  border: 2px solid #475569 !important;
  background: #1e293b !important;
}

:deep(.v-theme--dark) .order-detail-minibox:hover {
  border-color: #f8fafc !important;
}

.minibox-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  gap: 10px;
  border-top: 2px solid #cbd5e1;
  padding-top: 16px;
}

.order-product-row-flat {
  display: flex;
  justify-content: space-between;
  align-items: start;
  font-size: 13px;
  padding-bottom: 10px;
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
  font-weight: 800;
  color: #0f172a;
}

.prod-qty {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
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
  border: 2px solid #cbd5e1;
  padding: 12px 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-val {
  font-size: 13px;
  color: #0f172a;
  font-weight: 800;
  margin-top: 2px;
  word-break: break-all;
}

:deep(.v-theme--dark) .session-field {
  border: 2px solid #475569 !important;
  background: #1e293b !important;
}

.quick-links-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-links-group :deep(.v-btn) {
  border-radius: 0 !important;
}

/* ════════════════════════════════ DIALOG GATE ════ */
.dialog-frame-flat {
  background: #ffffff;
  border: 2px solid #0f172a;

  color: #0f172a;
  position: relative;
  transition: all 0.3s ease;
}

.dialog-close-btn {
  position: absolute;
  right: 12px;
  top: 12px;
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

.dialog-title {
  font-size: 26px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
}

.dialog-title .highlight-serif {
  font-family: "Playfair Display", Georgia, serif;
  font-style: italic;
  font-weight: 400;
  color: #0d9488;
}

/* Custom flat alert styling for the terminal gate */
.custom-flat-alert.info-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f0fdfa !important;
  border: 2px solid #0d9488 !important;
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

/* Warning, Error and Success alert card styling */
.custom-flat-alert.warning-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fffbeb !important;
  border: 2px solid #d97706 !important;
  color: #b45309 !important;
  padding: 14px;
  border-radius: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.custom-flat-alert.warning-alert .alert-icon {
  color: #d97706 !important;
  margin-top: 2px;
}

.custom-flat-alert.error-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef2f2 !important;
  border: 2px solid #ef4444 !important;
  color: #dc2626 !important;
  padding: 14px;
  border-radius: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.custom-flat-alert.error-alert .alert-icon {
  color: #ef4444 !important;
  margin-top: 2px;
}

.custom-flat-alert.success-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f0fdf4 !important;
  border: 2px solid #22c55e !important;
  color: #15803d !important;
  padding: 14px;
  border-radius: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.custom-flat-alert.success-alert .alert-icon {
  color: #22c55e !important;
  margin-top: 2px;
}

.custom-flat-alert .alert-content {
  flex-grow: 1;
}

.alert-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.alert-close-btn:hover {
  opacity: 1;
}

/* Dark mode variations for local alerts */
:deep(.v-theme--dark) .custom-flat-alert.warning-alert {
  background: #78350f !important;
  border-color: #eab308 !important;
  color: #fde047 !important;
}

:deep(.v-theme--dark) .custom-flat-alert.warning-alert .alert-icon {
  color: #fde047 !important;
}

:deep(.v-theme--dark) .custom-flat-alert.error-alert {
  background: #7f1d1d !important;
  border-color: #ef4444 !important;
  color: #fca5a5 !important;
}

:deep(.v-theme--dark) .custom-flat-alert.error-alert .alert-icon {
  color: #fca5a5 !important;
}

:deep(.v-theme--dark) .custom-flat-alert.success-alert {
  background: #14532d !important;
  border-color: #22c55e !important;
  color: #86efac !important;
}

:deep(.v-theme--dark) .custom-flat-alert.success-alert .alert-icon {
  color: #86efac !important;
}

/* Forgot Links */
.text-link-btn {
  font-size: 12px;
  font-weight: 800;
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
  border: 2px solid #cbd5e1;
  padding: 24px 16px;
}

.flat-otp-input :deep(.v-otp-input__field) {
  border-radius: 0 !important;
  border: 2px solid #0f172a !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-weight: 800;
  font-family: "JetBrains Mono", "Fira Code", "Courier New", Courier, monospace;
  font-size: 1.8rem;
  transition: all 0.2s ease;
  height: 54px !important;
}

.flat-otp-input :deep(.v-otp-input__field:focus) {
  border-color: #0d9488 !important;
}

/* Form Controls Inside Dialog */
.dialog-card-body :deep(.flat-text-field .v-field) {
  background: #ffffff !important;
  border-radius: 0 !important;
  border: 2px solid #cbd5e1 !important;
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
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dialog-actions-flat .btn-flat-outline {
  color: #0f172a;
  border: 2px solid #0f172a;
  background: transparent;
  transition: all 0.25s ease;
  border-radius: 0 !important;
}

.dialog-actions-flat .btn-flat-outline:hover {
  background: #f1f5f9;
}

.dialog-actions-flat .btn-flat-solid {
  background: #0f172a;
  border: 2px solid #0f172a;
  color: #ffffff;

  transition: all 0.25s ease;
  border-radius: 0 !important;
}

.dialog-actions-flat .btn-flat-solid:hover {
  background: #1e293b;
  border-color: #1e293b;
}

/* ════════════════════════════════ BUTTON GENERAL ═ */
.btn-flat-solid {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  background: #0f172a;
  border: 2px solid #0f172a;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.15);
  border-radius: 0 !important;
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
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  background: transparent;
  border: 2px solid #cbd5e1;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.15);
  border-radius: 0 !important;
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
