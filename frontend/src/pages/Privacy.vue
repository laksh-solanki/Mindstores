<template>
  <v-container class="py-16" max-width="1100">

    <!-- Premium Glass Card -->
    <v-card class="pa-10 pa-md-14 rounded-3xl premium-wrapper border" elevation="0">

      <!-- Title Block -->
      <div class="text-center mb-10">
        <v-chip
          append-icon="mdi-circle-small"
          class="mb-4"
          color="#7f53ff"
          prepend-icon="mdi-circle-small"
          text="LEGAL"
          variant="flat"
        />
        <h1 class="text-h3 font-weight-bold gradient-text mb-3">
          Privacy Policy
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis mx-auto" style="max-width:600px">
          We respect your privacy and are committed to protecting your personal data with transparency and security.
        </p>
      </div>

      <v-divider class="mb-10" />

      <!-- Sections -->
      <div v-for="(section, i) in sections" :key="i" class="section">
        <div class="section-icon">
          <v-icon size="22">mdi-shield-check</v-icon>
        </div>

        <div class="section-content">
          <h2 class="text-h6 font-weight-bold mb-2">{{ section.title }}</h2>
          <p class="text-body-1 text-medium-emphasis">
            {{ section.text }}
          </p>
        </div>
      </div>

      <!-- Contact Box -->
      <v-sheet class="contact-box mt-12 pa-6 rounded-xl">
        <div class="d-flex align-center justify-between gap-3">
          <v-icon color="primary">mdi-email-arrow-right-outline</v-icon>
          <div class="ms-4">
            <div class="font-weight-bold">Privacy Requests</div>
            <div class="text-medium-emphasis text-body-2">
              Contact us anytime at <strong>lakshsolanki848@gmail.com</strong>
            </div>
          </div>
        </div>
      </v-sheet>

    </v-card>
  </v-container>
</template>

<script setup>
  const sections = [
    {
      title: 'Information We Collect',
      text:
        'We collect limited personal information such as contact details, device data, and usage analytics to improve performance and security.',
    },
    {
      title: 'How We Use Data',
      text:
        'Your data helps us personalize the experience, maintain system stability, prevent abuse, and provide customer support.',
    },
    {
      title: 'Cookies & Tracking',
      text:
        'We use cookies to remember preferences, analyze behavior, and optimize our platform functionality.',
    },
    {
      title: 'Data Protection',
      text:
        'We follow industry best practices including encryption, access controls, and secure infrastructure to protect your data.',
    },
    {
      title: 'Third‑Party Integrations',
      text:
        'We may use trusted partners such as analytics, hosting, and payment providers. They process data only under strict agreements.',
    },
    {
      title: 'Your Rights',
      text:
        'You may request access, correction, export, or deletion of your data at any time.',
    },
    {
      title: 'Policy Updates',
      text:
        'We may revise this policy occasionally to reflect legal or product changes. Updates will appear on this page.',
    },
  ];
</script>

<style scoped>
/* ===== Premium Wrapper ===== */
.premium-wrapper {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 255, 0.9));
  backdrop-filter: blur(14px);
  box-shadow: 0 30px 80px rgba(30, 40, 120, 0.12);
}

/* ===== Gradient Heading ===== */
.gradient-text {
  background: linear-gradient(90deg, #5b7cfa, #7f53ff, #9c6bff);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ===== Section Layout ===== */
.section {
  display: flex;
  gap: 18px;
  padding: 20px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.section:last-child {
  border-bottom: none;
}

.section-icon {
  min-width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef1ff, #f6f4ff);
  color: #6a6cff;
  box-shadow: inset 0 0 0 1px rgba(120, 120, 255, 0.15);
}

.section-content p {
  line-height: 1.85;
}

/* ===== Contact Box ===== */
.contact-box {
  background: linear-gradient(135deg, #f6f8ff, #fbfaff);
  border: 1px solid rgba(120, 120, 255, 0.15);
}
</style>
