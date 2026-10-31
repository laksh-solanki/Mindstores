<template>
  <v-footer class="app-footer mt-4">
    <v-container class="footer-container" fluid>
      <div class="footer-grid">
        <div class="footer-column brand-col">
          <div class="brand-header d-flex align-center mb-4">
            <router-link aria-label="Mindstores home" class="footer-brand-logo d-flex align-center ga-2" to="/">
              <img
                alt="Mindstores icon"
                class="footer-brand-icon"
                src="../assets/icon.svg"
              >
              <span class="footer-brand-text">MINDSTORE</span>
            </router-link>
          </div>
          <p class="footer-desc mb-6">
            A portfolio storefront for exploring a modern catalog, account-based
            cart, demo checkout flow, and order-management experience.
          </p>
          <router-link class="footer-utility-link" to="/about">
            Learn about this project
            <v-icon size="15">mdi-arrow-right</v-icon>
          </router-link>
        </div>

        <div class="footer-column links-col">
          <h4 class="footer-title">SHOP CATALOG</h4>
          <ul class="footer-links-list">
            <li>
              <router-link class="footer-link" to="/products">All Products</router-link>
            </li>
            <li>
              <router-link
                class="footer-link"
                to="/electronics"
              >Electronics</router-link>
            </li>
            <li>
              <router-link
                class="footer-link"
                to="/clothing"
              >Clothing</router-link>
            </li>
            <li>
              <router-link
                class="footer-link"
                to="/footwear"
              >Footwear</router-link>
            </li>
            <li>
              <router-link class="footer-link" to="/books">Books</router-link>
            </li>
          </ul>
        </div>

        <div class="footer-column links-col">
          <h4 class="footer-title">HELP & INFORMATION</h4>
          <ul class="footer-links-list">
            <li>
              <router-link class="footer-link" to="/help">Help Center</router-link>
            </li>
            <li>
              <router-link class="footer-link" to="/orders">Order History</router-link>
            </li>
            <li>
              <router-link class="footer-link" to="/privacy">Privacy Policy</router-link>
            </li>
            <li>
              <router-link class="footer-link" to="/terms">Terms of Service</router-link>
            </li>
          </ul>
        </div>

        <div class="footer-column contact-col">
          <h4 class="footer-title">PROJECT CONTACT</h4>
          <p class="footer-desc mb-4">
            Questions about this demonstration or the implementation? Use the
            project contact below.
          </p>
          <a class="footer-utility-link" href="mailto:lakshsolanki848@gmail.com">
            <v-icon size="16">mdi-email-outline</v-icon>
            lakshsolanki848@gmail.com
          </a>
          <a
            class="footer-link developer-link mt-4"
            href="https://lakshsolanki.onrender.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <v-icon class="mr-1" size="16">mdi-code-tags</v-icon>
            Developer portfolio
          </a>
        </div>
      </div>

      <hr class="footer-divider">

      <div class="footer-bottom-row">
        <div class="copyright-info">
          &copy; {{ new Date().getFullYear() }} MINDSTORE. Portfolio demonstration only.
        </div>
        <div class="payment-methods d-flex ga-2 align-center">
          <span class="payment-methods-title d-none d-sm-inline">DEMO CHECKOUT OPTIONS:</span>
          <div class="payment-badge">UPI</div>
          <div class="payment-badge">CARD</div>
          <div class="payment-badge">COD</div>
        </div>
      </div>
    </v-container>
  </v-footer>
</template>

<style scoped>
.app-footer {
  background: #ffffff !important;
  border-top: 2px solid #0f172a !important;
  color: #0f172a !important;
  padding: 60px 0 30px !important;
}

.footer-container {
  max-width: 1280px;
  margin: 0 auto;
  padding-inline: clamp(16px, 3.5vw, 32px) !important;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr 1.2fr;
  gap: 40px;
}

.footer-column {
  display: flex;
  flex-direction: column;
}

.footer-brand-logo {
  text-decoration: none;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
}

.footer-brand-icon {
  width: 36px;
  height: 36px;
  display: block;
}

.footer-brand-text {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #0f172a;
}

.footer-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  font-weight: 500;
  margin: 0;
}

.footer-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0f172a;
  margin-bottom: 20px;
  text-transform: uppercase;
}

.footer-links-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-link {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer-link:hover {
  color: #0d9488;
}

.footer-link.router-link-active {
  color: #0d9488;
  font-weight: 700;
}

.footer-utility-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer-utility-link:hover {
  color: #0d9488;
}

.developer-link {
  display: inline-flex;
  align-items: center;
}

.footer-divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 40px 0 24px;
}

.footer-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.copyright-info {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.payment-methods-title {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.payment-badge {
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #64748b;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}

/* Responsive Footer */
@media (max-width: 959px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
}

@media (max-width: 599px) {
  .app-footer {
    padding: 40px 0 20px !important;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .footer-brand-logo {
    max-width: 100%;
  }

  .footer-bottom-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
