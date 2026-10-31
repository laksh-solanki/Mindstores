<template>
  <div class="help-page">
    <v-container class="content-container" fluid>
      <section class="page-hero">
        <div class="brand-tagline">
          <span class="tag-label">MINDSTORE</span>
          <span class="tag-dot">/</span>
          <span class="tag-label">HELP CENTER</span>
        </div>
        <h1 class="page-title">Find the next <span class="highlight-serif">step</span>.</h1>
        <p class="page-subtitle">
          Use this guide to explore the storefront demonstration, understand account features, and avoid entering real
          payment information during the sample checkout flow.
        </p>
      </section>

      <section class="demo-notice">
        <v-icon color="teal-darken-1" size="22">mdi-alert-circle-outline</v-icon>
        <div>
          <h2>Before you begin</h2>
          <p>
            Mindstore is a portfolio project. You can test the interface with sample details, but no real payment,
            purchase, shipment, or return is created.
          </p>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <p class="section-label">QUICK LINKS</p>
          <h2>Go directly to the right area</h2>
        </div>
        <div class="quick-grid">
          <router-link v-for="link in quickLinks" :key="link.title" class="quick-card" :to="link.to">
            <v-icon color="teal-darken-1" :icon="link.icon" size="22" />
            <div>
              <h3>{{ link.title }}</h3>
              <p>{{ link.copy }}</p>
            </div>
            <v-icon class="quick-arrow" icon="mdi-arrow-right" size="18" />
          </router-link>
        </div>
      </section>

      <section class="faq-layout">
        <div class="section-heading">
          <p class="section-label">COMMON QUESTIONS</p>
          <h2>Storefront guide</h2>
          <p>Clear answers for the main customer-facing workflows included in this demonstration.</p>
        </div>
        <v-expansion-panels class="faq-panels" elevation="0" rounded="0" variant="accordion">
          <v-expansion-panel v-for="item in faqItems" :key="item.question" class="faq-panel">
            <v-expansion-panel-title class="faq-title">
              {{ item.question }}
            </v-expansion-panel-title>
            <v-expansion-panel-text class="faq-copy">
              {{ item.answer }}
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </section>

      <section class="contact-block">
        <div>
          <p class="section-label">PROJECT CONTACT</p>
          <h2>Need implementation help?</h2>
          <p>For questions about this portfolio demonstration, contact the developer directly.</p>
        </div>
        <a class="contact-link" href="mailto:lakshsolanki848@gmail.com">
          <v-icon size="18">mdi-email-outline</v-icon>
          lakshsolanki848@gmail.com
        </a>
      </section>
    </v-container>
  </div>
</template>

<script setup>
  const quickLinks = [
    {
      icon: 'mdi-view-grid-outline',
      title: 'Browse catalog',
      copy: 'Search categories, inspect product details, and review stock indicators.',
      to: '/products',
    },
    {
      icon: 'mdi-cart-outline',
      title: 'Review cart',
      copy: 'Adjust quantities, choose available items, and try sample promotion codes.',
      to: '/cart',
    },
    {
      icon: 'mdi-account-outline',
      title: 'Manage profile',
      copy: 'Review account preferences and the delivery details used by the demo flow.',
      to: '/profile',
    },
    {
      icon: 'mdi-receipt-text-outline',
      title: 'View orders',
      copy: 'Check the order history generated while exploring this demonstration.',
      to: '/orders',
    },
  ]

  const faqItems = [
    {
      question: 'Can I buy products from this website?',
      answer: 'No. Mindstore is a portfolio demonstration. Products, prices, promotions, payment options, and delivery statuses are sample content for exploring the interface.',
    },
    {
      question: 'Should I use real card or UPI details at checkout?',
      answer: 'No. Use sample details only. The checkout page demonstrates the interface and records a demo order without processing a real payment.',
    },
    {
      question: 'Why do I need to sign in before adding items to my cart?',
      answer: 'The cart, profile, reviews, and order history are account-based features. Signing in lets the demonstration connect those protected actions to your session.',
    },
    {
      question: 'Where can I update my profile and delivery details?',
      answer: 'Open Profile from the account menu. The checkout review reads your saved profile location so you can explore a consistent account workflow.',
    },
    {
      question: 'Are stock counts and promotions real?',
      answer: 'They are catalog and demonstration values. They help show filtering, quantity checks, and pricing behavior, but they are not commercial offers.',
    },
    {
      question: 'How can I learn more about the project?',
      answer: 'Visit the About page for an overview of the storefront areas and the working layers demonstrated by the project.',
    },
  ]
</script>

<style scoped>
.help-page {
  min-height: 100vh;
  padding: 64px 0 96px;
  background: #f8fafc;
}

.content-container {
  max-width: 1280px;
  margin: 0 auto;
  padding-inline: clamp(16px, 3.5vw, 32px) !important;
}

.page-hero {
  max-width: 820px;
}

.brand-tagline,
.section-label {
  color: #64748b;
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.brand-tagline {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 20px;
}

.tag-dot {
  color: #cbd5e1;
}

.page-title {
  margin: 0;
  color: #0f172a;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1.02;
}

.highlight-serif {
  color: #0d9488;
  font-family: Georgia, serif;
  font-style: italic;
  font-weight: 400;
}

.page-subtitle,
.section-heading p,
.contact-block p {
  color: #475569;
  font-size: 16px;
  line-height: 1.75;
}

.page-subtitle {
  max-width: 760px;
  margin: 24px 0 0;
}

.demo-notice {
  display: flex;
  gap: 16px;
  padding: 20px;
  margin-top: 56px;
  background: #ffffff;
  border: 1px solid #0f172a;
}

.demo-notice h2 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.demo-notice p,
.quick-card p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.65;
}

.section-block {
  padding-top: 80px;
}

.section-heading {
  max-width: 640px;
}

.section-heading h2,
.contact-block h2 {
  margin: 8px 0 12px;
  color: #0f172a;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.08;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 32px;
  background: #0f172a;
  gap: 1px;
  border: 1px solid #0f172a;
}

.quick-card {
  display: grid;
  grid-template-columns: 32px 1fr 18px;
  gap: 12px;
  align-items: start;
  padding: 22px;
  background: #ffffff;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.quick-card:hover {
  background: #f0fdfa;
}

.quick-card h3 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
}

.quick-arrow {
  color: #0f172a;
}

.faq-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 48px;
  padding-top: 96px;
}

.faq-panels {
  border-top: 1px solid #0f172a;
}

.faq-panel {
  background: #ffffff !important;
  border-bottom: 1px solid #0f172a !important;
}

.faq-title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
}

.faq-copy {
  color: #475569;
  font-size: 14px;
  line-height: 1.7;
}

.contact-block {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding-top: 32px;
  margin-top: 96px;
  border-top: 1px solid #0f172a;
}

.contact-block p {
  margin: 0;
}

.contact-link {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding: 14px 18px;
  color: #ffffff;
  background: #0f172a;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 959px) {
  .faq-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 599px) {
  .help-page {
    padding-top: 40px;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }

  .contact-block {
    flex-direction: column;
    align-items: flex-start;
  }

  .contact-link {
    width: 100%;
    overflow-wrap: anywhere;
  }
}
</style>
