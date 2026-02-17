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

// REFIX: Define API_URL to connect to Fastify Backend (Port 8000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useAppStore = defineStore("app", {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: true,
  }),

  actions: {
    async ensureBackendSession(firebaseUser = auth.currentUser) {
      if (!firebaseUser) {
        this.user = null;
        this.isAuthenticated = false;
        return false;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await axios.post(
          `${API_URL}/api/auth/firebase-login`,
          { idToken },
          { withCredentials: true },
        );

        // Validate that cookie-based backend session is active.
        await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });

        this.user = response.data;
        this.isAuthenticated = true;
        return true;
      } catch (error) {
        console.error("Backend authentication failed:", error);
        this.user = null;
        this.isAuthenticated = false;
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
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
        this.loading = false;
      }
    },
  },
});
