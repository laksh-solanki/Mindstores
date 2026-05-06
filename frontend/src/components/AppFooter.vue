<template>
  <v-footer border class="app-footer">
    <v-container class="footer-container">
      <div class="footer-row">
        <div>
          <p class="text-subtitle-2 font-weight-medium">Mindstore</p>
          <p class="text-body-2 text-medium-emphasis">Curated everyday products.</p>
        </div>

        <div class="footer-links">
          <router-link class="footer-link" to="/">Home</router-link>
          <router-link class="footer-link" to="/cart">Cart</router-link>
          <router-link class="footer-link" to="/profile">Profile</router-link>
          <router-link class="footer-link" to="/privacy">Privacy</router-link>
          <router-link class="footer-link" to="/terms">Terms</router-link>
        </div>
      </div>

      <v-divider class="my-3" />

      <p class="text-caption text-medium-emphasis">
        &copy; {{ new Date().getFullYear() }} Mindstore
      </p>
    </v-container>
  </v-footer>
</template>

<style scoped>
.footer-container {
  width: 100%;
  padding-top: 16px;
  padding-bottom: 12px;
}

.app-footer {
  background: var(--ms-surface) !important;
  border-top: 1px solid var(--ms-border) !important;
  color: var(--ms-ink);
}

.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-link {
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--ms-muted);
}

.footer-link.router-link-active {
  color: var(--ms-green);
  font-weight: 700;
}
</style>
