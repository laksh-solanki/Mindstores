<template>
  <div class="privacy-page">
    <v-container class="bespoke-page-container" fluid>
      <!-- Topbar -->
      <section class="page-topbar mb-8">
        <div>
          <div class="brand-tagline ml-2">
            <span class="tag-label">LEGAL</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">PRIVACY POLICY</span>
          </div>
          <h1 class="page-title ml-2">Privacy <span class="highlight-serif">Policy</span></h1>
          <p class="page-subtitle ml-2 mt-2">
            We respect your privacy and are committed to protecting your personal data with transparency and security.
          </p>
        </div>
      </section>

      <div class="flat-card-container pa-6 pa-md-10">
        <!-- Sections -->
        <div v-for="(section, i) in sections" :key="i" class="flat-section">
          <div class="section-icon-flat">
            <v-icon color="teal-darken-1" size="24">mdi-shield-check-outline</v-icon>
          </div>
          <div class="section-content">
            <h2 class="section-title">{{ section.title }}</h2>
            <p class="section-text">
              {{ section.text }}
            </p>
          </div>
        </div>

        <!-- Contact Box -->
        <div class="flat-contact-box mt-8 pa-6">
          <div class="d-flex align-center gap-4">
            <v-icon color="teal-darken-1" size="32">mdi-email-arrow-right-outline</v-icon>
            <div class="ms-4">
              <div class="contact-title">Privacy Requests</div>
              <div class="contact-subtitle">
                Contact us anytime at <strong>lakshsolanki848@gmail.com</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </div>
</template>

<script setup>
  const sections = [
    {
      title: 'Information We Collect',
      text: 'We collect limited personal information such as contact details, device data, and usage analytics to improve performance and security.',
    },
    {
      title: 'How We Use Data',
      text: 'Your data helps us personalize the experience, maintain system stability, prevent abuse, and provide customer support.',
    },
    {
      title: 'Cookies & Tracking',
      text: 'We use cookies to remember preferences, analyze behavior, and optimize our platform functionality.',
    },
    {
      title: 'Data Protection',
      text: 'We follow industry best practices including encryption, access controls, and secure infrastructure to protect your data.',
    },
    {
      title: 'Third-Party Integrations',
      text: 'We may use trusted partners such as analytics, hosting, and payment providers. They process data only under strict agreements.',
    },
    {
      title: 'Your Rights',
      text: 'You may request access, correction, export, or deletion of your data at any time.',
    },
    {
      title: 'Policy Updates',
      text: 'We may revise this policy occasionally to reflect legal or product changes. Updates will appear on this page.',
    },
  ];
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 40px 0 80px;
}

.bespoke-page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: max(16px, 4vw) !important;
}

.brand-tagline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #64748b;
}

.tag-dot {
  color: #cbd5e1;
}

.page-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-transform: uppercase;
  margin: 0;
}

.highlight-serif {
  font-family: Georgia, serif;
  font-style: italic;
  font-weight: normal;
  color: #0d9488;
  text-transform: none;
}

.page-subtitle {
  font-size: 15px;
  color: #475569;
  max-width: 600px;
  line-height: 1.6;
}

.flat-card-container {
  background: #ffffff;
  border: 1px solid #0f172a;
  border-radius: 0;
}

.flat-section {
  display: flex;
  gap: 24px;
  padding: 32px 0;
  border-bottom: 1px solid #e2e8f0;
}

.flat-section:first-child {
  padding-top: 0;
}

.flat-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-icon-flat {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 1px solid #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.section-text {
  font-size: 15px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

.flat-contact-box {
  background: #f8fafc;
  border: 1px solid #0f172a;
}

.contact-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}

.contact-subtitle {
  font-size: 14px;
  color: #475569;
}

@media (max-width: 599px) {
  .flat-section {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
