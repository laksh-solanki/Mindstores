import axios from "axios";
// Firebase imports
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { defineStore } from "pinia";

// Import initialized firebase app
import { app as firebaseApp } from "@/plugins/firebase";

const auth = getAuth(firebaseApp);
const AUTH_REQUEST_TIMEOUT_MS = 20_000;
const AUTH_REQUEST_RETRIES = 1;
let backendSessionPromise = null;
let backendSessionUid = null;
axios.defaults.withCredentials = true;

// REFIX: Define API_URL to connect to Fastify Backend (Port 8000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
                { idToken },
                { timeout: AUTH_REQUEST_TIMEOUT_MS },
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

      void getRedirectResult(auth).catch((error) => {
        console.error("Google redirect result failed:", error);
      });

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

    async loginWithGoogle() {
      this.loading = true;
      const provider = new GoogleAuthProvider();
      let redirectTriggered = false;
      try {
        const credential = await signInWithPopup(auth, provider);
        const isReady = await this.ensureBackendSession(credential.user);
        if (!isReady) {
          await signOut(auth);
        }
      } catch (error) {
        const errorCode = String(error?.code || "");
        const shouldFallbackToRedirect =
          errorCode === "auth/popup-blocked" ||
          errorCode === "auth/cancelled-popup-request" ||
          errorCode === "auth/operation-not-supported-in-this-environment";

        if (shouldFallbackToRedirect) {
          redirectTriggered = true;
          await signInWithRedirect(auth, provider);
          return;
        }

        console.error("Google login failed:", error);
      } finally {
        if (!redirectTriggered) {
          this.loading = false;
        }
      }
    },

    async logout() {
      this.loading = true;
      try {
        await axios
          .post(`${API_URL}/api/auth/logout`, {})
          .catch((error) => {
            console.warn("Backend logout failed, proceeding with Firebase logout.", error);
          });
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
        this.loading = false;
      }
    },
  },
});
