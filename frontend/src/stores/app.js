import axios from "axios";
// Firebase imports
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { defineStore } from "pinia";

// Import initialized firebase app
import { app as firebaseApp } from "@/plugins/firebase";

const auth = getAuth(firebaseApp);
const SESSION_TOKEN_KEY = "mindstore_session_token";
const savedSessionToken =
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(SESSION_TOKEN_KEY);
if (savedSessionToken) {
  axios.defaults.headers.common["X-Session-Token"] = savedSessionToken;
}

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

export const useAppStore = defineStore("app", {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: true,
    sessionToken: savedSessionToken,
  }),

  actions: {
    setSessionToken(token) {
      this.sessionToken = token || null;
      if (token) {
        axios.defaults.headers.common["X-Session-Token"] = token;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SESSION_TOKEN_KEY, token);
        }
      } else {
        delete axios.defaults.headers.common["X-Session-Token"];
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
    },

    async ensureBackendSession(firebaseUser = auth.currentUser) {
      if (!firebaseUser) {
        this.user = null;
        this.isAuthenticated = false;
        this.setSessionToken(null);
        return false;
      }

      // Show user/avatar immediately while backend session is being validated.
      const firebaseProfile = mapFirebaseUser(firebaseUser);
      this.user = { ...this.user, ...firebaseProfile };
      this.isAuthenticated = true;

      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await axios.post(
          `${API_URL}/api/auth/firebase-login`,
          { idToken },
          { withCredentials: true },
        );
        this.setSessionToken(response.data?.session_token || null);

        // Validate that cookie-based backend session is active.
        await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });

        const backendUser = response.data?.user || response.data || {};
        this.user = {
          ...firebaseProfile,
          ...backendUser,
          picture: backendUser.picture || backendUser.photo_url || backendUser.photoURL || firebaseProfile.picture || null,
        };
        this.isAuthenticated = true;
        return true;
      } catch (error) {
        console.error("Backend authentication failed:", error);
        this.user = null;
        this.isAuthenticated = false;
        this.setSessionToken(null);
        return false;
      }
    },

    initAuthListener() {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const isReady = await this.ensureBackendSession(firebaseUser);
          if (!isReady) {
            await signOut(auth);
          }
        } else {
          this.user = null;
          this.isAuthenticated = false;
          this.setSessionToken(null);
        }
        this.loading = false;
      });
    },

    async loginWithGoogle() {
      this.loading = true;
      const provider = new GoogleAuthProvider();
      try {
        const credential = await signInWithPopup(auth, provider);
        await this.ensureBackendSession(credential.user);
      } catch (error) {
        console.error("Google login failed:", error);
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        // REFIX: Use full API_URL
        await axios
          .post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true })
          .catch((error) => {
            console.warn("Backend logout failed, proceeding with Firebase logout.", error);
          });
        this.setSessionToken(null);
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
        this.loading = false;
      }
    },
  },
});
