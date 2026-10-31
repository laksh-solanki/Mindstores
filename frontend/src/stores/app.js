import axios from "axios";
import { defineStore } from "pinia";
import { API_URL, buildAuthenticatedRequestConfig } from "@/utils/api";
import { safeDisplayImageUrl } from "@/utils/images";
import {
  getCurrencyForCountry,
  loadUserSettings,
  saveUserSettings,
} from "@/utils/userSettings";
import { useCartStore } from "./cart";
const AUTH_REQUEST_TIMEOUT_MS = 20_000;
const PROFILE_IMAGE_CACHE_PREFIX = "mindstores.profile-image.";
function normalizeCountryCode(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}


function getProfileImageCacheKey(uid) {
  return uid ? `${PROFILE_IMAGE_CACHE_PREFIX}${uid}` : "";
}

function loadCachedProfilePicture(uid) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = window.localStorage.getItem(getProfileImageCacheKey(uid));
    return safeDisplayImageUrl(cached) || null;
  } catch {
    return null;
  }
}

function saveCachedProfilePicture(uid, picture) {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  const key = getProfileImageCacheKey(uid);
  const normalized = safeDisplayImageUrl(picture);

  try {
    if (normalized) {
      window.localStorage.setItem(key, normalized);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable or full; the backend path still works.
  }
}


function syncCurrencyPreferenceFromUser(user) {
  if (typeof window === "undefined" || !user) {
    return;
  }

  let resolvedCurrency = "";
  if (user.currency) {
    resolvedCurrency = user.currency.trim().toUpperCase();
  }

  if (!resolvedCurrency) {
    const countryCandidate =
      user.country_code ||
      user.countryCode ||
      user.country ||
      "";
    resolvedCurrency = getCurrencyForCountry(countryCandidate, "");
  }

  if (!resolvedCurrency) {
    return;
  }

  const existingSettings = loadUserSettings();
  if (existingSettings.currency === resolvedCurrency) {
    return;
  }

  saveUserSettings({
    ...existingSettings,
    currency: resolvedCurrency,
  });
}


function mergeBackendUser(baseUser = {}, backendUser = {}) {
  const backendPictureKey = ["picture", "photo_url", "photoURL"].find((key) =>
    Object.prototype.hasOwnProperty.call(backendUser, key),
  );
  const picture = backendPictureKey
    ? backendUser[backendPictureKey] || null
    : baseUser.picture || baseUser.photoURL || null;

  return {
    ...baseUser,
    ...backendUser,
    uid: backendUser.uid || backendUser.user_id || baseUser.uid || baseUser.user_id || null,
    picture,
  };
}

function buildDeliveryProfilePayload(deliveryProfile) {
  if (!deliveryProfile || typeof deliveryProfile !== "object") {
    return null;
  }

  const postalCode = deliveryProfile.postalCode || deliveryProfile.postal_code;
  return {
    phone: typeof deliveryProfile.phone === "string" ? deliveryProfile.phone.trim() : "",
    address: typeof deliveryProfile.address === "string" ? deliveryProfile.address.trim() : "",
    city: typeof deliveryProfile.city === "string" ? deliveryProfile.city.trim() : "",
    state: typeof deliveryProfile.state === "string" ? deliveryProfile.state.trim() : "",
    postal_code: typeof postalCode === "string" ? postalCode.trim() : "",
    instructions:
      typeof deliveryProfile.instructions === "string" ? deliveryProfile.instructions.trim() : "",
  };
}

function buildProfileUpdatePayload({
  name,
  picture,
  countryCode,
  deliveryProfile,
  currency,
  orderUpdates,
  promotionalEmails,
  quickCheckout,
  lowStockAlerts,
  saveDeliveryDetails,
}) {
  const payload = {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedPicture = typeof picture === "string" ? picture.trim() : "";
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedDeliveryProfile = buildDeliveryProfilePayload(deliveryProfile);

  if (normalizedName) {
    payload.name = normalizedName;
  }
  if (typeof picture === "string") {
    payload.picture = normalizedPicture || null;
  }
  if (typeof countryCode === "string") {
    payload.country_code = normalizedCountryCode || null;
  }
  if (normalizedDeliveryProfile) {
    payload.delivery_profile = normalizedDeliveryProfile;
  }
  if (typeof currency === "string") {
    payload.currency = currency.trim().toUpperCase();
  }
  if (typeof orderUpdates === "boolean") {
    payload.order_updates = orderUpdates;
  }
  if (typeof promotionalEmails === "boolean") {
    payload.promotional_emails = promotionalEmails;
  }
  if (typeof quickCheckout === "boolean") {
    payload.quick_checkout = quickCheckout;
  }
  if (typeof lowStockAlerts === "boolean") {
    payload.low_stock_alerts = lowStockAlerts;
  }
  if (typeof saveDeliveryDetails === "boolean") {
    payload.save_delivery_details = saveDeliveryDetails;
  }

  return { payload, normalizedPicture };
}

export const useAppStore = defineStore("app", {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: true,
    authListenerInitialized: false,
  }),

  actions: {
    async ensureBackendSession() {
      if (this.isAuthenticated && this.user) {
        return true;
      }
      return await this.refreshCurrentUser().catch(() => false);
    },

    async initAuthListener() {
      if (this.authListenerInitialized) {
        return;
      }
      this.authListenerInitialized = true;
      this.loading = true;

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          timeout: AUTH_REQUEST_TIMEOUT_MS,
          withCredentials: true,
        });
        const backendUser = response.data?.user || response.data || {};
        if (backendUser && (backendUser.uid || backendUser.user_id || backendUser.email)) {
          this.user = mergeBackendUser({}, backendUser);
          const cachedPic = loadCachedProfilePicture(this.user.uid || this.user.user_id);
          if (!this.user.picture && cachedPic) {
            this.user.picture = cachedPic;
          }
          saveCachedProfilePicture(this.user.uid || this.user.user_id, this.user.picture);
          syncCurrencyPreferenceFromUser(this.user);
          this.isAuthenticated = true;
        } else {
          this.user = null;
          this.isAuthenticated = false;
        }
      } catch {
        this.user = null;
        this.isAuthenticated = false;
      } finally {
        this.loading = false;
      }
    },

    loginWithGoogle(returnTo = '/') {
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
      const target = returnTo.startsWith('http')
        ? returnTo
        : `${origin}${returnTo.startsWith('/') ? returnTo : `/${returnTo}`}`;
      window.location.href = `${API_URL}/auth/google?return_to=${encodeURIComponent(target)}`;
    },

    loginWithGooglePopup() {
      return this.loginWithGoogle('/');
    },

    async loginWithEmail(email, password) {
      this.loading = true;
      try {
        const normalizedEmail = String(email || "").trim();
        const normalizedPassword = String(password || "");
        const response = await axios.post(
          `${API_URL}/auth/login`,
          {
            email: normalizedEmail,
            password: normalizedPassword,
          },
          {
            withCredentials: true,
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          },
        );

        const backendUser = response.data?.user || response.data || {};
        this.user = mergeBackendUser({}, backendUser);
        saveCachedProfilePicture(this.user.uid || this.user.user_id, this.user.picture);
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return this.user;
      } catch (error) {
        console.error("Email login failed:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createAccountWithEmail({ name, email, password }) {
      this.loading = true;
      try {
        const normalizedName = String(name || "").trim();
        const normalizedEmail = String(email || "").trim();
        const normalizedPassword = String(password || "");

        const response = await axios.post(
          `${API_URL}/auth/register`,
          {
            name: normalizedName,
            email: normalizedEmail,
            password: normalizedPassword,
          },
          {
            withCredentials: true,
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          },
        );

        const backendUser = response.data?.user || response.data || {};
        this.user = mergeBackendUser({}, backendUser);
        saveCachedProfilePicture(this.user.uid || this.user.user_id, this.user.picture);
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return this.user;
      } catch (error) {
        console.error("Account creation failed:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      const cartStore = useCartStore();
      cartStore.clearCart();

      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("mindstore_profile_settings");
          if (this.user?.uid || this.user?.user_id) {
            window.localStorage.removeItem(
              `mindstores.profile-image.${this.user.uid || this.user.user_id}`,
            );
          }
        } catch (error) {
          console.warn("Failed to clear local storage", error);
        }
      }

      try {
        await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
      } catch (error) {
        console.warn("Backend logout failed:", error);
      } finally {
        this.user = null;
        this.isAuthenticated = false;
        this.loading = false;
      }
    },

    async deleteAccount() {
      this.loading = true;
      const cartStore = useCartStore();
      cartStore.clearCart();

      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("mindstore_profile_settings");
          if (this.user?.uid || this.user?.user_id) {
            window.localStorage.removeItem(
              `mindstores.profile-image.${this.user.uid || this.user.user_id}`,
            );
          }
        } catch (error) {
          console.warn("Failed to clear local storage", error);
        }
      }

      try {
        await axios.delete(`${API_URL}/auth/account`, await buildAuthenticatedRequestConfig());
      } catch (error) {
        console.warn("Backend account deletion error:", error);
      } finally {
        this.loading = false;
        this.user = null;
        this.isAuthenticated = false;
      }
    },

    async refreshCurrentUser() {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          timeout: AUTH_REQUEST_TIMEOUT_MS,
          ...(await buildAuthenticatedRequestConfig()),
        });
        const backendUser = response.data?.user || response.data || {};
        if (backendUser && (backendUser.uid || backendUser.user_id || backendUser.email)) {
          this.user = mergeBackendUser(this.user || {}, backendUser);
          saveCachedProfilePicture(this.user.uid || this.user.user_id, this.user.picture);
          syncCurrencyPreferenceFromUser(this.user);
          this.isAuthenticated = true;
          return this.user;
        }
        this.user = null;
        this.isAuthenticated = false;
        return null;
      } catch (error) {
        this.user = null;
        this.isAuthenticated = false;
        throw error;
      }
    },

    async updateAccountProfile(profile) {
      const { normalizedPicture, payload } = buildProfileUpdatePayload(profile);
      this.loading = true;
      try {
        const response = await axios.put(
          `${API_URL}/auth/profile`,
          payload,
          await buildAuthenticatedRequestConfig({ timeout: AUTH_REQUEST_TIMEOUT_MS }),
        );

        const backendUser = response.data?.user || response.data || {};
        this.user = mergeBackendUser(
          {
            ...this.user,
            picture:
              typeof profile.picture === "string"
                ? normalizedPicture || null
                : this.user?.picture || null,
          },
          backendUser,
        );
        saveCachedProfilePicture(this.user?.uid || this.user?.user_id, this.user?.picture);
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return this.user;
      } catch (error) {
        console.error("Failed to update profile:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async submitUserAdminPin({ mobileCountryCode, mobileNumber, pin }) {
      this.loading = true;
      try {
        const response = await axios.post(
          `${API_URL}/user-admin/pin`,
          {
            mobile_country_code: mobileCountryCode,
            mobile_number: mobileNumber,
            pin,
          },
          await buildAuthenticatedRequestConfig({ timeout: AUTH_REQUEST_TIMEOUT_MS }),
        );

        const backendUser = response.data?.user || response.data?.profile || {};
        this.user = mergeBackendUser(this.user || {}, backendUser);
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return response.data;
      } catch (error) {
        console.error("Failed to submit user admin PIN:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async resetUserAdminPin({ mobileCountryCode, mobileNumber, pin }) {
      this.loading = true;
      try {
        const response = await axios.post(
          `${API_URL}/user-admin/pin/reset`,
          {
            mobile_country_code: mobileCountryCode,
            mobile_number: mobileNumber,
            pin,
          },
          await buildAuthenticatedRequestConfig({ timeout: AUTH_REQUEST_TIMEOUT_MS }),
        );

        const backendUser = response.data?.user || response.data?.profile || {};
        this.user = mergeBackendUser(this.user || {}, backendUser);
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return response.data;
      } catch (error) {
        console.error("Failed to reset user admin PIN:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
