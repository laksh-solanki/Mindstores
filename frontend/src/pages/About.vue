<template>
  <div class="about-page">
    <v-container class="content-container" fluid>
      <section class="page-hero">
        <div class="brand-tagline">
          <span class="tag-label">MINDSTORE</span>
          <span class="tag-dot">/</span>
          <span class="tag-label">PROJECT OVERVIEW</span>
        </div>
        <h1 class="page-title">A storefront built for <span class="highlight-serif">clarity</span>.</h1>
        <p class="page-subtitle">
          Mindstore is a portfolio demonstration of a complete online shopping experience. It brings catalog
          discovery, account access, cart management, checkout review, and order tracking together in one interface.
        </p>
        <div class="hero-actions">
          <v-btn
            class="btn-store-primary"
            elevation="0"
            rounded="0"
            to="/products"
          >
            Explore Catalog
            <v-icon end size="16">mdi-arrow-right</v-icon>
          </v-btn>
          <v-btn
            class="btn-store-outline"
            elevation="0"
            rounded="0"
            to="/help"
          >
            Visit Help Center
          </v-btn>
        </div>
      </section>

      <section class="demo-notice">
        <v-icon color="teal-darken-1" size="22">mdi-information-outline</v-icon>
        <div>
          <h2>Portfolio demonstration</h2>
          <p>
            Products, pricing, promotions, payment options, and delivery updates are sample content. This website does
            not process real payments or arrange deliveries.
          </p>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <p class="section-label">WHAT YOU CAN EXPLORE</p>
          <h2>Connected customer journeys</h2>
          <p>Each area is designed to make the next action easy to understand.</p>
        </div>

        <div class="feature-grid">
          <article v-for="feature in features" :key="feature.title" class="feature-card">
            <v-icon color="teal-darken-1" :icon="feature.icon" size="24" />
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.copy }}</p>
          </article>
        </div>
      </section>

      <section class="architecture-block">
        <div>
          <p class="section-label">HOW IT IS ORGANIZED</p>
          <h2>One interface, multiple working layers</h2>
          <p class="architecture-copy">
            The project demonstrates how a modern storefront can coordinate a Vue interface with authenticated
            account features, catalog data, and administrative workflows.
          </p>
        </div>
        <div class="architecture-list">
          <div v-for="item in architecture" :key="item.title" class="architecture-item">
            <span>{{ item.number }}</span>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.copy }}</p>
            </div>
          </div>
        </div>
      </section>
    </v-container>
  </div>
</template>

<script setup>
  const features = [
    {
      icon: 'mdi-magnify',
      title: 'Catalog discovery',
      copy: 'Browse live catalog categories, search products, compare details, and see current stock indicators.',
    },
    {
      icon: 'mdi-cart-outline',
      title: 'Account-based cart',
      copy: 'Sign in to add items, adjust quantities, apply sample promotions, and select products for checkout.',
    },
    {
      icon: 'mdi-clipboard-check-outline',
      title: 'Checkout review',
      copy: 'Walk through a clearly marked demo checkout and confirm an order without submitting a real payment.',
    },
    {
      icon: 'mdi-account-cog-outline',
      title: 'Account tools',
      copy: 'Review profile settings, order history, saved delivery details, and available management controls.',
    },
  ]

  const architecture = [
    {
      number: '01',
      title: 'Storefront interface',
      copy: 'Vue and Vuetify power the responsive browsing, cart, account, and policy surfaces.',
    },
    {
      number: '02',
      title: 'Authenticated workflows',
      copy: 'Secure sign-in connects customers to protected cart, profile, and order actions.',
    },
    {
      number: '03',
      title: 'Operational views',
      copy: 'Administrative areas demonstrate product, account, inventory, and delivery-management workflows.',
    },
  ]
</script>

<style scoped>
.about-page {
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
  max-width: 760px;
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
.architecture-copy {
  color: #475569;
  font-size: 16px;
  line-height: 1.75;
}

.page-subtitle {
  max-width: 760px;
  margin: 24px 0 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}

.action-btn-primary,
.action-btn-outline {
  font-size: 14px !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.action-btn-primary {
  color: #ffffff !important;
  background: #0f172a !important;
}

.action-btn-outline {
  color: #0f172a !important;
  border: 1px solid #0f172a !important;
}

.demo-notice {
  display: flex;
  gap: 16px;
  padding: 20px;
  margin-top: 56px;
  background: #ffffff;
  border: 1px solid #0f172a;
}

.demo-notice h2,
.feature-card h3,
.architecture-block h2,
.architecture-item h3,
.section-heading h2 {
  color: #0f172a;
}

.demo-notice h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.demo-notice p,
.feature-card p,
.architecture-item p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.65;
}

.section-block {
  padding-top: 88px;
}

.section-heading {
  max-width: 640px;
}

.section-heading h2,
.architecture-block h2 {
  margin: 8px 0 12px;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.08;
}

.section-heading p {
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 36px;
  background: #0f172a;
  gap: 1px;
  border: 1px solid #0f172a;
}

.feature-card {
  min-height: 230px;
  padding: 24px;
  background: #ffffff;
}

.feature-card h3 {
  margin: 24px 0 8px;
  font-size: 16px;
  font-weight: 900;
  text-transform: uppercase;
}

.architecture-block {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 56px;
  padding: 88px 0 0;
  margin-top: 88px;
  border-top: 1px solid #cbd5e1;
}

.architecture-list {
  border-top: 1px solid #0f172a;
}

.architecture-item {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 16px;
  padding: 22px 0;
  border-bottom: 1px solid #cbd5e1;
}

.architecture-item span {
  color: #0d9488;
  font-family: monospace;
  font-size: 13px;
  font-weight: 800;
}

.architecture-item h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
}

@media (max-width: 959px) {
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .architecture-block {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 599px) {
  .about-page {
    padding-top: 40px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .feature-card {
    min-height: auto;
  }
}
</style>
