import axios from "axios";
// Firebase imports
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
// frontend/src/stores/app.js
import { defineStore } from "pinia";

// Import initialized firebase app
import { app as firebaseApp } from "@/plugins/firebase";

const auth = getAuth(firebaseApp);

export const useAppStore = defineStore("app", {
  state: () => ({
    // Auth State
    user: null,
    isAuthenticated: false,
    loading: true, // Global loading state for the app

    // You can add other global app state here later (e.g., theme, snackbars)
    // theme: 'light',
  }),

  actions: {
    /**
     * Initializes the authentication listener.
     * This should be called once when the app starts (e.g., in App.vue).
     */
    initAuthListener() {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();

            // Send token to your backend
            const response = await axios.post(
              "/api/auth/firebase-login",
              { idToken },
              { withCredentials: true },
            );

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

    /**
     * Google Login
     */
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

    /**
     * Logout
     */
    async logout() {
      this.loading = true;
      try {
        await axios
          .post("/api/auth/logout", {}, { withCredentials: true })
          .catch((error) => {
            console.warn(
              "Backend logout failed, proceeding with Firebase logout.",
              error,
            );
          });
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
        this.loading = false;
      }
    },
  },
});
