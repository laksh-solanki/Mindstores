<template>
  <v-footer class="app-footer">
    <v-container class="footer-shell">
      <div class="footer-brand">
        <h2>MINDSTORE</h2>
        <p>Curated essentials for a deliberate everyday life.</p>
      </div>
      <div class="footer-meta">
        <span>Secure checkout</span>
        <span>Fast support</span>
        <span>&copy; {{ new Date().getFullYear() }} Mindstore</span>
      </div>
    </v-container>
  </v-footer>
</template>

<style scoped>
.app-footer {
  background: #0f181a;
  color: #e8efec;
  border-top: 1px solid #1f2a2d;
}

.footer-shell {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 16px;
  flex-wrap: wrap;
}

.footer-brand h2 {
  font-family: 'Playfair Display', serif;
  letter-spacing: 1.2px;
  font-size: 1.05rem;
}

.footer-brand p {
  margin-top: 6px;
  color: #a6b4af;
  font-size: 0.92rem;
}

.footer-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  color: #c6d2cd;
  font-size: 0.86rem;
  flex-wrap: wrap;
}
</style>
