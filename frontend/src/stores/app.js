import axios from "axios";
// Firebase imports
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { defineStore } from "pinia";
// Import initialized firebase app
import { app as firebaseApp } from "@/plugins/firebase";

import { API_URL } from "@/utils/api";
import {
  getCurrencyForCountry,
  loadUserSettings,
  saveUserSettings,
} from "@/utils/userSettings";

const auth = getAuth(firebaseApp);
const AUTH_REQUEST_TIMEOUT_MS = 20_000;
const AUTH_REQUEST_RETRIES = 1;
let backendSessionPromise = null;
let backendSessionUid = null;

function extractCountryCodeFromLocale(locale = "") {
  if (typeof locale !== "string") {
    return "";
  }

  const match = locale.trim().match(/^[a-z]{2,3}[-_]([a-z]{2})(?:[-_].*)?$/i);
  return match ? match[1].toUpperCase() : "";
}

function getClientLocale() {
  if (typeof window === "undefined") {
    return "";
  }

  const primaryLocale = window.navigator?.language;
  if (typeof primaryLocale === "string" && primaryLocale.trim()) {
    return primaryLocale.trim();
  }

  if (Array.isArray(window.navigator?.languages)) {
    const firstLocale = window.navigator.languages.find(
      (locale) => typeof locale === "string" && locale.trim(),
    );
    return firstLocale ? firstLocale.trim() : "";
  }

  return "";
}

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
  if (!firebaseUser) {return null;}
  return {
    uid: firebaseUser.uid || null,
    name: firebaseUser.displayName || null,
    email: firebaseUser.email || null,
    picture: firebaseUser.photoURL || null,
    photoURL: firebaseUser.photoURL || null,
  };
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

  const countryCandidate =
    user.country_code ||
    user.countryCode ||
    user.country ||
    user.locale ||
    user.language ||
    "";
  const resolvedCurrency = getCurrencyForCountry(countryCandidate, "");
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
      this.user = { ...this.user, ...firebaseProfile };
      this.isAuthenticated = true;

      if (backendSessionPromise && backendSessionUid === firebaseUser.uid) {
        return await backendSessionPromise;
      }

      backendSessionUid = firebaseUser.uid;
      const sessionRequest = (async () => {
        try {
          const idToken = await firebaseUser.getIdToken();
          let response = null;

          for (let attempt = 0; attempt <= AUTH_REQUEST_RETRIES; attempt++) {
            try {
              response = await axios.post(
                `${API_URL}/api/auth/firebase-login`,
                {
                  idToken,
                  locale: getClientLocale(),
                  country_code: extractCountryCodeFromLocale(getClientLocale()),
                },
                { timeout: AUTH_REQUEST_TIMEOUT_MS, withCredentials: true },
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
          this.user = {
            ...firebaseProfile,
            ...backendUser,
            picture:
              backendUser.picture ||
              backendUser.photo_url ||
              backendUser.photoURL ||
              firebaseProfile.picture ||
              null,
          };
          syncCurrencyPreferenceFromUser(this.user);
          this.isAuthenticated = true;
          return true;
        } catch (error) {
          console.error("Backend authentication failed:", error);
          this.user = null;
          this.isAuthenticated = false;
          return false;
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
      if (this.authListenerInitialized) {return;}
      this.authListenerInitialized = true;

      onAuthStateChanged(auth, async (firebaseUser) => {
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
      });
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
      try {
        await axios
          .post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true })
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

    async refreshCurrentUser() {
      if (!this.isAuthenticated) {
        return null;
      }

      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          withCredentials: true,
          timeout: AUTH_REQUEST_TIMEOUT_MS,
        });
        const backendUser = response.data || {};
        this.user = {
          ...this.user,
          ...backendUser,
          picture:
            backendUser.picture ||
            backendUser.photo_url ||
            backendUser.photoURL ||
            this.user?.picture ||
            null,
        };
        syncCurrencyPreferenceFromUser(this.user);
        this.isAuthenticated = true;
        return this.user;
      } catch (error) {
        console.error("Failed to refresh user profile:", error);
        throw error;
      }
    },

    async updateAccountProfile({ name, picture, countryCode }) {
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

        const response = await axios.put(`${API_URL}/api/auth/profile`, payload, {
          withCredentials: true,
          timeout: AUTH_REQUEST_TIMEOUT_MS,
        });

        const backendUser = response.data?.user || response.data || {};
        this.user = {
          ...this.user,
          ...backendUser,
          picture:
            backendUser.picture ||
            backendUser.photo_url ||
            backendUser.photoURL ||
            normalizedPicture ||
            null,
        };
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
  },
});
