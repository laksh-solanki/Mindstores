<template>
  <v-footer class="app-footer mt-4">
    <v-container class="footer-container" fluid>
      <!-- Main Footer Grid -->
      <div class="footer-grid">
        <!-- Column 1: Brand & Socials -->
        <div class="footer-column brand-col">
          <div class="brand-header d-flex align-center ga-2 mb-4">
            <v-avatar color="white" rounded="0" size="33">
              <v-img alt="Mindstore logo" src="../assets/logo.svg" width="20" />
            </v-avatar>
            <span class="brand-name text-subtitle-1 font-weight-black"
              >MINDSTORE</span
            >
          </div>
          <p class="footer-desc mb-6">
            A meticulously curated gallery of everyday essentials. Hand-selected
            for exceptional craft, clean lines, and absolute utility.
          </p>
          <div class="social-links d-flex ga-2">
            <a
              aria-label="Instagram"
              class="social-btn"
              href="https://instagram.com"
              target="_blank"
            >
              <v-icon size="18">mdi-instagram</v-icon>
            </a>
            <a
              aria-label="Twitter"
              class="social-btn"
              href="https://twitter.com"
              target="_blank"
            >
              <v-icon size="18">mdi-twitter</v-icon>
            </a>
            <a
              aria-label="Pinterest"
              class="social-btn"
              href="https://pinterest.com"
              target="_blank"
            >
              <v-icon size="18">mdi-pinterest</v-icon>
            </a>
            <a
              aria-label="GitHub"
              class="social-btn"
              href="https://github.com"
              target="_blank"
            >
              <v-icon size="18">mdi-github</v-icon>
            </a>
          </div>
        </div>

        <!-- Column 2: Shop Links -->
        <div class="footer-column links-col">
          <h4 class="footer-title">SHOP CATALOG</h4>
          <ul class="footer-links-list">
            <li>
              <router-link class="footer-link" to="/electronics"
                >Electronics</router-link
              >
            </li>
            <li>
              <router-link class="footer-link" to="/clothing"
                >Clothing</router-link
              >
            </li>
            <li>
              <router-link class="footer-link" to="/footwear"
                >Footwear</router-link
              >
            </li>
            <li>
              <router-link class="footer-link" to="/books">Books</router-link>
            </li>
          </ul>
        </div>

        <!-- Column 3: Help & Info -->
        <div class="footer-column links-col">
          <h4 class="footer-title">CUSTOMER SERVICES</h4>
          <ul class="footer-links-list">
            <li>
              <router-link class="footer-link" to="/profile"
                >My Account</router-link
              >
            </li>
            <li>
              <router-link class="footer-link" to="/cart"
                >Shopping Cart</router-link
              >
            </li>
            <li>
              <router-link class="footer-link" to="/privacy"
                >Privacy Policy</router-link
              >
            </li>
            <li>
              <router-link class="footer-link" to="/terms"
                >Terms & Conditions</router-link
              >
            </li>
          </ul>
        </div>

        <!-- Column 4: Newsletter Signup -->
        <div class="footer-column newsletter-col">
          <h4 class="footer-title">STAY CONNECTED</h4>
          <p class="newsletter-desc mb-4">
            Subscribe to our weekly dispatch for new releases, restocks, and
            exclusive collection details.
          </p>
          <form class="newsletter-form" @submit.prevent="handleSubscribe">
            <div class="newsletter-input-group">
              <input
                v-model="email"
                aria-label="Email Address for newsletter"
                class="newsletter-input"
                placeholder="Enter email address"
                required
                type="email"
              />
              <button
                aria-label="Subscribe"
                class="newsletter-btn"
                type="submit"
              >
                <v-icon size="18">mdi-arrow-right</v-icon>
              </button>
            </div>
            <p v-if="subscribed" class="subscribed-feedback mt-2">
              <v-icon class="mr-1" size="14">mdi-check-circle</v-icon> You have
              subscribed.
            </p>
          </form>
          <div class="mt-6">
            <a
              class="footer-link d-inline-flex align-center justify-center text-center font-weight-bold border pa-2"
              href="https://lakshsolanki.onrender.com"
              target="_blank"
            >
              <v-icon class="mr-1" size="16">mdi-code-tags</v-icon> Meet
              Developer
            </a>
          </div>
        </div>
      </div>

      <hr class="footer-divider" />

      <!-- Bottom Bar -->
      <div class="footer-bottom-row">
        <div class="copyright-info">
          &copy; {{ new Date().getFullYear() }} MINDSTORE Inc. Crafted by
          developers, for utility.
        </div>
        <div class="payment-methods d-flex ga-2 align-center">
          <span class="payment-methods-title d-none d-sm-inline"
            >ACCEPTED PAYMENTS:</span
          >
          <div class="payment-badge">VISA</div>
          <div class="payment-badge">MC</div>
          <div class="payment-badge">UPI</div>
          <div class="payment-badge">AMEX</div>
          <div class="payment-badge">APPLE PAY</div>
        </div>
      </div>
    </v-container>
  </v-footer>
</template>

<script setup>
import { ref } from "vue";

const email = ref("");
const subscribed = ref(false);

function handleSubscribe() {
  if (email.value.trim()) {
    subscribed.value = true;
    email.value = "";
    setTimeout(() => {
      subscribed.value = false;
    }, 4000);
  }
}
</script>

<style scoped>
.app-footer {
  background: #ffffff !important;
  border-top: 2px solid #0f172a !important;
  color: #0f172a !important;
  padding: 60px 0 30px !important;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: 24px !important;
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

.footer-desc,
.newsletter-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  font-weight: 500;
  margin: 0;
}

.social-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0f172a;
  background: #ffffff;
  color: #0f172a !important;
  text-decoration: none;
  transition: all 0.2s ease;
}

.social-btn:hover {
  background: #0f172a;
  color: #ffffff !important;
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

.newsletter-form {
  width: 100%;
}

.newsletter-input-group {
  display: flex;
  border: 2px solid #0f172a;
}

.newsletter-input {
  flex-grow: 1;
  padding: 10px 14px;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
  border: none;
  outline: none;
  font-weight: 600;
}

.newsletter-input::placeholder {
  color: #94a3b8;
}

.newsletter-btn {
  width: 44px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.newsletter-btn:hover {
  background: #0d9488;
}

.subscribed-feedback {
  font-size: 12px;
  font-weight: 700;
  color: #0d9488;
  display: flex;
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

  .footer-bottom-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
