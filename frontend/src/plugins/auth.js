import axios from "axios";
// Firebase imports
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
// frontend/src/stores/auth.js
import { defineStore } from "pinia";

// REFIX: Importing 'app' as 'firebaseApp' from your specific plugin location
import { app as firebaseApp } from "@/plugins/firebase";

const auth = getAuth(firebaseApp);

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: true, // Start with loading: true for initial auth check
  }),

  actions: {
    /**
     * Initializes the authentication listener.
     * This should be called once when the app starts (e.g., in App.vue on mount).
     * It listens for Firebase auth state changes and syncs with the backend.
     */
    initAuthListener() {
      // Create the listener
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();

            // Exchange Firebase ID token for a session with your backend.
            // Ensure your backend (Fastify) has this route: POST /api/auth/firebase-login
            const response = await axios.post(
              "/api/auth/firebase-login",
              { idToken },
              // Ensure your backend CORS configuration allows credentials if needed
              { withCredentials: true },
            );

            this.user = response.data;
            this.isAuthenticated = true;
          } catch (error) {
            console.error("Backend authentication failed:", error);
            // If backend login fails, sign out from Firebase to avoid inconsistent state.
            await signOut(auth);
            this.user = null;
            this.isAuthenticated = false;
          }
        } else {
          // User is signed out.
          this.user = null;
          this.isAuthenticated = false;
        }
        this.loading = false;
      });
    },

    /**
     * Initiates the Google login flow using a Firebase popup.
     */
    async loginWithGoogle() {
      this.loading = true;
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the rest
      } catch (error) {
        console.error("Google login failed:", error);
        this.loading = false;
      }
    },

    /**
     * Logs the user out from Firebase and the backend.
     */
    async logout() {
      this.loading = true;
      try {
        // Attempt to log out from the backend.
        await axios
          .post("/api/auth/logout", {}, { withCredentials: true })
          .catch((error) => {
            console.warn(
              "Backend logout failed, proceeding with Firebase logout.",
              error,
            );
          });

        // Sign out from Firebase.
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout failed:", error);
        this.loading = false;
      }
    },
  },
});
