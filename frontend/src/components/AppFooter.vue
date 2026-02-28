<template>
  <v-footer class="app-footer">
    <v-container class="footer-shell">
      <div class="footer-grid">
        <section class="footer-brand">
          <p class="brand-kicker">Mindstore House</p>
          <h2>MINDSTORE</h2>
          <p class="brand-copy">
            Premium commerce for curated spaces. Timeless products selected for function, clarity, and lasting style.
          </p>
          <div class="brand-signals">
            <span>Curated premium</span>
            <span>Secure checkout</span>
          </div>
        </section>

        <nav aria-label="Primary" class="footer-column">
          <p class="column-title">Navigate</p>
          <router-link class="footer-link" to="/">Home</router-link>
          <router-link class="footer-link" to="/cart">Cart</router-link>
          <router-link class="footer-link" to="/create-account">Create Account</router-link>
          <router-link class="footer-link" to="/profile">Profile</router-link>
        </nav>

        <nav aria-label="Legal" class="footer-column">
          <p class="column-title">Policy</p>
          <router-link class="footer-link" to="/privacy">Privacy</router-link>
          <router-link class="footer-link" to="/terms">Terms</router-link>
          <router-link class="footer-link" to="/payment">Payment</router-link>
        </nav>

        <section class="footer-column footer-column--action">
          <p class="column-title">Concierge Support</p>
          <p class="support-copy">
            Get fast help for product selection, dispatch updates, and order flow in one place.
          </p>
          <div class="footer-actions">
            <v-btn class="support-btn support-btn--primary" rounded="pill" size="small" to="/cart">
              Review Cart
            </v-btn>
            <v-btn
              class="support-btn support-btn--ghost"
              rounded="pill"
              size="small"
              to="/create-account"
              variant="outlined"
            >
              Member Access
            </v-btn>
          </div>
        </section>
      </div>

      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} Mindstore. Crafted for deliberate living.</p>
        <div class="footer-status">
          <span>Tracked delivery</span>
          <span>Priority support</span>
          <span>Protected payments</span>
        </div>
      </div>
    </v-container>
  </v-footer>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Sora:wght@300;400;500;600;700&display=swap');

.app-footer {
  background:
    radial-gradient(circle at 0% 0%, rgba(216, 170, 112, 0.18) 0%, rgba(216, 170, 112, 0) 34%),
    linear-gradient(145deg, #0b1119, #141d2a 58%, #121a26 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  color: #ecf0f5;
  position: relative;
  overflow: hidden;
}

.app-footer::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 80px 80px;
}

.footer-shell {
  width: 100%;
  position: relative;
  z-index: 1;
  padding: 48px 16px 26px;
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(2, minmax(140px, 0.8fr)) minmax(220px, 1.4fr);
  gap: 18px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.footer-brand h2 {
  margin-top: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem;
  letter-spacing: 2px;
  color: #f7efe2;
}

.brand-kicker {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #dfbb8f;
  font-family: 'Sora', sans-serif;
}

.brand-copy {
  margin-top: 10px;
  max-width: 300px;
  line-height: 1.7;
  color: #bbc4d3;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
}

.brand-signals {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.brand-signals span {
  border-radius: 999px;
  border: 1px solid rgba(243, 225, 199, 0.3);
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 10px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #dbc4a4;
  font-family: 'Sora', sans-serif;
}

.footer-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.column-title {
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  font-size: 0.66rem;
  font-weight: 600;
  color: #d6b58d;
  font-family: 'Sora', sans-serif;
}

.footer-link {
  text-decoration: none;
  color: #d4dce8;
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  transition: color 0.2s ease, transform 0.2s ease;
  width: fit-content;
}

.footer-link:hover {
  color: #f3d3a9;
  transform: translateX(2px);
}

.footer-link.router-link-active {
  color: #f0c890;
}

.footer-column--action {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.04));
  padding: 16px;
}

.support-copy {
  color: #c2cbd9;
  line-height: 1.65;
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
}

.footer-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.support-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.15px;
  font-family: 'Sora', sans-serif;
}

.support-btn--primary {
  background: linear-gradient(125deg, #dfb581, #c79158);
  color: #16120d;
}

.support-btn--ghost {
  color: #f0e1cb;
  border-color: rgba(242, 228, 205, 0.42);
}

.footer-bottom {
  padding-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.footer-bottom p {
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: #aab5c6;
}

.footer-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.footer-status span {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  color: #cad3e1;
}

@media (max-width: 980px) {
  .footer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .footer-shell {
    padding-top: 34px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  .footer-column--action {
    padding: 14px;
  }

  .footer-actions {
    width: 100%;
  }

  .support-btn {
    flex: 1 1 100%;
  }
}
</style>