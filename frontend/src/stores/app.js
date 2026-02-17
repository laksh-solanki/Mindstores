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
    initAuthListener() {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();

            // REFIX: Use full API_URL
            const response = await axios.post(
              `${API_URL}/api/auth/firebase-login`,
              { idToken },
              { withCredentials: true },
            );

            // Verify that the backend session cookie is actually set and usable.
            await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });

            this.user = response.data;
            this.isAuthenticated = true;
          } catch (error) {
            console.error("Backend authentication failed:", error);
            await signOut(auth);
            this.user = null;
            this.isAuthenticated = false;
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
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Google login failed:", error);
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
