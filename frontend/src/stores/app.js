import axios from "axios";
// Firebase imports
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import { defineStore } from "pinia";
// Import initialized firebase app
import { app as firebaseApp } from "@/plugins/firebase";
import { API_URL, buildAuthenticatedRequestConfig } from "@/utils/api";
import { safeDisplayImageUrl } from "@/utils/images";
import {
  getCurrencyForCountry,
  loadUserSettings,
  saveUserSettings,
} from "@/utils/userSettings";
import { useCartStore } from "./cart";

const auth = getAuth(firebaseApp);
const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});
const AUTH_REQUEST_TIMEOUT_MS = 20_000;
const AUTH_REQUEST_RETRIES = 1;
const AUTH_BOOT_TIMEOUT_MS = 6000;
const PROFILE_IMAGE_CACHE_PREFIX = "mindstores.profile-image.";
let backendSessionPromise = null;
let backendSessionUid = null;



function normalizeCountryCode(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function canSyncPictureToFirebase(picture) {
  if (typeof picture !== "string") {
    return false;
  }
  const normalized = picture.trim();
  if (!normalized) {
    return true;
  }

  // Firebase Auth photoURL is intended for regular URLs and rejects long data URLs.
  if (normalized.startsWith("data:image/")) {
    return false;
  }

  if (normalized.length > 2000) {
    return false;
  }

  try {
    const parsedUrl = new URL(normalized);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function mapFirebaseUser (firebaseUser) {
  if (!firebaseUser) {
    return null;
  }
  return {
    uid: firebaseUser.uid || null,
    name: firebaseUser.displayName || null,
    email: firebaseUser.email || null,
    picture: firebaseUser.photoURL || null,
    photoURL: firebaseUser.photoURL || null,
  };
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableAuthError(error) {
  const status = error?.response?.status;
  if (status && status < 500 && status !== 429) {
    return false;
  }
  return error?.code === "ECONNABORTED" || !error?.response || status >= 500 || status === 429;
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

function mergeBackendUser(firebaseProfile, backendUser = {}) {
  const backendPictureKey = ["picture", "photo_url", "photoURL"].find((key) =>
    Object.prototype.hasOwnProperty.call(backendUser, key),
  );
  const picture = backendPictureKey
    ? backendUser[backendPictureKey] || null
    : firebaseProfile.picture || firebaseProfile.photoURL || null;

  return {
    ...firebaseProfile,
    ...backendUser,
    picture,
  };
}

export const useAppStore = defineStore("app", {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: true,
    authListenerInitialized: false,
  }),

  actions: {
    async ensureBackendSession(firebaseUser = auth.currentUser) {
      if (!firebaseUser) {
        this.user = null;
        this.isAuthenticated = false;
        backendSessionPromise = null;
        backendSessionUid = null;
        return false;
      }

      // Show user/avatar immediately while backend session is being validated.
      const firebaseProfile = mapFirebaseUser(firebaseUser);
      const cachedPicture = loadCachedProfilePicture(firebaseUser.uid);
      this.user = {
        ...firebaseProfile,
        picture: firebaseProfile.picture || cachedPicture || null,
        is_admin: false,
      };
      this.isAuthenticated = true;

      if (backendSessionPromise && backendSessionUid === firebaseUser.uid) {
        return await backendSessionPromise;
      }

      backendSessionUid = firebaseUser.uid;
      const sessionRequest = (async () => {
        const applyBackendUser = (backendUser = {}) => {
          this.user = mergeBackendUser(
            {
              ...firebaseProfile,
              picture: firebaseProfile.picture || cachedPicture || null,
            },
            backendUser,
          );
          saveCachedProfilePicture(firebaseUser.uid, this.user.picture);
          syncCurrencyPreferenceFromUser(this.user);
          this.isAuthenticated = true;
          return true;
        };

        try {
          const idToken = await firebaseUser.getIdToken();
          let response = null;

          for (let attempt = 0; attempt <= AUTH_REQUEST_RETRIES; attempt++) {
            try {
              response = await axios.post(
                `${API_URL}/auth/firebase-login`,
                {
                  idToken,
                },
                {
                  headers: {
                    Authorization: `Bearer ${idToken}`,
                  },
                  timeout: AUTH_REQUEST_TIMEOUT_MS,
                  withCredentials: true,
                },
              );
              break;
            } catch (error) {
              const shouldRetry =
                attempt < AUTH_REQUEST_RETRIES && isRetryableAuthError(error);
              if (!shouldRetry) {
                throw error;
              }
              await wait((attempt + 1) * 600);
            }
          }

          const backendUser = response.data?.user || response.data || {};
          return applyBackendUser(backendUser);
        } catch (error) {
          console.error("Backend session cookie authentication failed:", error);

          try {
            const response = await axios.get(
              `${API_URL}/auth/me`,
              await buildAuthenticatedRequestConfig(
                { timeout: AUTH_REQUEST_TIMEOUT_MS },
                { forceRefresh: true },
              ),
            );
            const backendUser = response.data?.user || response.data || {};
            console.warn("Using Firebase Bearer authentication for backend session.");
            return applyBackendUser(backendUser);
          } catch (fallbackError) {
            console.error("Backend Bearer authentication failed:", fallbackError);
            this.user = null;
            this.isAuthenticated = false;
            return false;
          }
        }
      })();

      backendSessionPromise = sessionRequest;

      return await sessionRequest.finally(() => {
        if (backendSessionPromise === sessionRequest) {
          backendSessionPromise = null;
          backendSessionUid = null;
        }
      });
    },

    initAuthListener() {
      if (this.authListenerInitialized) {
        return;
      }
      this.authListenerInitialized = true;

      const authBootTimer = setTimeout(() => {
        if (this.loading) {
          this.loading = false;
        }
      }, AUTH_BOOT_TIMEOUT_MS);

      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          clearTimeout(authBootTimer);
          if (firebaseUser) {
            const isReady = await this.ensureBackendSession(firebaseUser);
            if (!isReady) {
              await signOut(auth);
            }
          } else {
            this.user = null;
            this.isAuthenticated = false;
          }
          this.loading = false;
        },
        (error) => {
          clearTimeout(authBootTimer);
          console.error("Firebase auth listener failed:", error);
          this.user = null;
          this.isAuthenticated = false;
          this.loading = false;
        },
      );
    },

    async loginWithEmail(email, password) {
      this.loading = true;
      try {
        const normalizedEmail = String(email || "").trim();
        const normalizedPassword = String(password || "");
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
        const isReady = await this.ensureBackendSession(credential.user);
        if (!isReady) {
          await signOut(auth);
          throw new Error("Unable to establish backend session");
        }
      } catch (error) {
        console.error("Email login failed:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loginWithGooglePopup() {
      this.loading = true;
      try {
        const credential = await signInWithPopup(auth, googleAuthProvider);
        const isReady = await this.ensureBackendSession(credential.user);
        if (!isReady) {
          await signOut(auth);
          throw new Error("Unable to establish backend session");
        }
      } catch (error) {
        console.error("Google popup login failed:", error);
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

        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          normalizedPassword,
        );

        if (normalizedName) {
          await updateProfile(credential.user, { displayName: normalizedName });
          await credential.user.reload();
        }

        await credential.user.getIdToken(true);
        const activeUser = auth.currentUser || credential.user;
        const isReady = await this.ensureBackendSession(activeUser);
        if (!isReady) {
          await signOut(auth);
          throw new Error("Unable to establish backend session");
        }

        if (normalizedName) {
          this.user = {
            ...this.user,
            name: normalizedName,
          };
        }
      } catch (error) {
        console.error("Email signup failed:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      const cartStore = useCartStore();
      cartStore.clearCart();

      try {
        await axios
          .post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
          .catch((error) => {
            console.warn("Backend logout failed, proceeding with Firebase logout.", error);
          });
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
      } finally {
        this.loading = false;
      }
    },

    async deleteAccount() {
      this.loading = true;
      const cartStore = useCartStore();
      cartStore.clearCart();

      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem('mindstore_profile_settings');
          if (auth.currentUser?.uid) {
            window.localStorage.removeItem(`mindstores.profile-image.${auth.currentUser.uid}`);
          }
        } catch (e) {
          console.warn("Failed to clear local storage", e);
        }
      }

      try {
        await axios.delete(`${API_URL}/auth/account`, await buildAuthenticatedRequestConfig());
      } catch (error) {
        console.warn("Backend account deletion failed or not found, proceeding.", error);
      }

      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
        }
      } catch (error) {
        console.error("Firebase user deletion failed:", error);
      } finally {
        this.loading = false;
        this.user = null;
        this.isAuthenticated = false;
      }
    },

    async refreshCurrentUser() {
      if (!this.isAuthenticated) {
        return null;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          timeout: AUTH_REQUEST_TIMEOUT_MS,
          ...(await buildAuthenticatedRequestConfig()),
        });
        const backendUser = response.data || {};
        this.user = mergeBackendUser(this.user || {}, backendUser);
        saveCachedProfilePicture(this.user?.uid || auth.currentUser?.uid, this.user?.picture);
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return this.user;
      } catch (error) {
        console.error("Failed to refresh user profile:", error);
        throw error;
      }
    },

    async updateAccountProfile({
      name,
      picture,
      countryCode,
      deliveryProfile,
      currency,
      orderUpdates,
      promotionalEmails,
      quickCheckout,
      lowStockAlerts,
      saveDeliveryDetails
    }) {
      const payload = {};
      const normalizedName = typeof name === "string" ? name.trim() : "";
      const normalizedCountryCode = normalizeCountryCode(countryCode);
      const normalizedPicture = typeof picture === "string" ? picture.trim() : "";

      if (normalizedName) {
        payload.name = normalizedName;
      }

      if (typeof picture === "string") {
        payload.picture = normalizedPicture || null;
      }

      if (typeof countryCode === "string") {
        payload.country_code = normalizedCountryCode || null;
      }

      if (deliveryProfile && typeof deliveryProfile === "object") {
        payload.delivery_profile = {
          phone: typeof deliveryProfile.phone === "string" ? deliveryProfile.phone.trim() : "",
          address: typeof deliveryProfile.address === "string" ? deliveryProfile.address.trim() : "",
          city: typeof deliveryProfile.city === "string" ? deliveryProfile.city.trim() : "",
          state: typeof deliveryProfile.state === "string" ? deliveryProfile.state.trim() : "",
          postal_code: typeof (deliveryProfile.postalCode || deliveryProfile.postal_code) === "string"
            ? (deliveryProfile.postalCode || deliveryProfile.postal_code).trim()
            : "",
          instructions: typeof deliveryProfile.instructions === "string" ? deliveryProfile.instructions.trim() : ""
        };
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

      this.loading = true;
      try {
        if (auth.currentUser) {
          const firebaseUpdates = {};
          if (normalizedName) {
            firebaseUpdates.displayName = normalizedName;
          }
          if (typeof picture === "string" && canSyncPictureToFirebase(normalizedPicture)) {
            firebaseUpdates.photoURL = normalizedPicture || null;
          }

          if (Object.keys(firebaseUpdates).length > 0) {
            await updateProfile(auth.currentUser, firebaseUpdates);
            await auth.currentUser.getIdToken(true);
          }
        }

        const response = await axios.put(
          `${API_URL}/auth/profile`,
          payload,
          await buildAuthenticatedRequestConfig(
            { timeout: AUTH_REQUEST_TIMEOUT_MS },
            { forceRefresh: Boolean(auth.currentUser) },
          ),
        );

        const backendUser = response.data?.user || response.data || {};
        this.user = mergeBackendUser(
          {
            ...this.user,
            picture:
              typeof picture === "string"
                ? normalizedPicture || null
                : this.user?.picture || null,
          },
          backendUser,
        );
        saveCachedProfilePicture(this.user?.uid || auth.currentUser?.uid, this.user?.picture);
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
          await buildAuthenticatedRequestConfig(
            { timeout: AUTH_REQUEST_TIMEOUT_MS },
            { forceRefresh: Boolean(auth.currentUser) },
          ),
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
          await buildAuthenticatedRequestConfig(
            { timeout: AUTH_REQUEST_TIMEOUT_MS },
            { forceRefresh: Boolean(auth.currentUser) },
          ),
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
