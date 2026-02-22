<template>
  <v-app class="premium-tos">
    <div class="bg-gradient" />

    <v-main>
      <v-container class="py-12 px-6">
        <v-row justify="center">
          <v-col class="d-none d-md-block" cols="12" lg="2" md="3">
            <nav class="sticky-nav">
              <div class="text-overline mb-6 text-primary font-weight-bold">Contents</div>
              <div
                v-for="item in menuItems"
                :key="item.id"
                :class="['nav-item', { active: activeSection === item.id }]"
                @click="scrollTo(item.id)"
              >
                {{ item.title }}
              </div>
            </nav>
          </v-col>

          <v-col cols="12" lg="7" md="8">
            <v-card class="glass-card pa-6 pa-sm-12 border" variant="flat">
              <header class="mb-12">
                <v-avatar class="mb-6" color="primary" size="56" variant="tonal">
                  <v-icon icon="mdi-shield-check" size="32" />
                </v-avatar>
                <h1 class="display-serif mb-2">Terms of Service</h1>
                <div class="d-flex align-center text-caption text-medium-emphasis">
                  <v-icon class="mr-1" icon="mdi-clock-outline" size="14" />
                  Last updated: February 22, 2026
                  <v-spacer />
                  <span class="d-none d-sm-inline">8 min read</span>
                </div>
              </header>

              <section v-for="section in sections" :id="section.id" :key="section.id" class="content-section mb-12">
                <h2 class="text-h5 font-weight-bold mb-6 d-flex align-center">
                  <span class="section-number mr-4">{{ section.num }}</span>
                  {{ section.title }}
                </h2>
                <div class="text-body-1 text-secondary-dark lh-lg" v-html="section.content" />
              </section>

              <v-divider class="my-10" />

              <footer class="d-flex flex-column flex-sm-row justify-space-between align-center gap-4">
                <div class="text-center text-sm-left">
                  <p class="text-subtitle-2 mb-0">Have questions about these terms?</p>
                  <a class="text-primary text-decoration-none" href="https://mindstores.onrender.com/privacy">https://mindstores.onrender.com/</a>
                </div>
                <v-btn
                  class="rounded-pill px-8"
                  color="black"
                  prepend-icon="mdi-printer-outline"
                  size="large"
                  variant="flat"
                >
                  Print Terms
                </v-btn>
              </footer>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
  import { onMounted, onUnmounted, ref } from 'vue';

  const scrollProgress = ref(0);
  const activeSection = ref('acceptance');

  const menuItems = [
    { id: 'acceptance', title: 'Acceptance' },
    { id: 'accounts', title: 'User Accounts' },
    { id: 'privacy', title: 'Data Privacy' },
    { id: 'liability', title: 'Liability' }
  ];

  const sections = [
    {
      id: 'acceptance',
      num: '01',
      title: 'Acceptance of Terms',
      content: 'By accessing <strong>PremiumApp</strong>, you agree to be bound by these terms. If you disagree with any part of the terms, you may not access the service. We reserve the right to modify these terms at any time.'
    },
    {
      id: 'accounts',
      num: '02',
      title: 'User Accounts',
      content: 'Users are responsible for maintaining the confidentiality of their account and password. You agree to accept responsibility for all activities that occur under your account.'
    },
    {
      id: 'privacy',
      num: '03',
      title: 'Data Privacy',
      content: 'Your privacy is critical to us. We only collect data necessary for the performance of our services. Please refer to our Privacy Policy for more details.'
    },
    {
      id: 'liability',
      num: '04',
      title: 'Limitation of Liability',
      content: 'In no event shall Company be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits or data.'
    }
  ];

  function scrollTo (id) {
    const el = document.querySelector(`#${id}`);
    window.scrollTo({ top: el.offsetTop - 40, behavior: 'smooth' });
  }

  function handleScroll () {
    // Update progress bar
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    scrollProgress.value = (winScroll / height) * 100;

    // Update active section
    for (const section of sections) {
      const el = document.querySelector(`#${section.id}`);
      if (el && winScroll >= el.offsetTop - 100) {
        activeSection.value = section.id;
      }
    }
  }

  onMounted(() => window.addEventListener('scroll', handleScroll));
  onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>

<style scoped>
/* Premium Background */
.bg-gradient {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at top right, #f0f4ff, #ffffff);
  z-index: -1;
}

/* Glassmorphism Card */
.glass-card {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.04) !important;
  border-radius: 24px !important;
}

/* Typography Customization */
.display-serif {
  font-family: "Inter", sans-serif; /* Use a premium serif font if available */
  letter-spacing: -0.04em;
  font-weight: 800;
  color: #111827;
}

.lh-lg { line-height: 1.8; }
.text-secondary-dark { color: #374151; }

.section-number {
  font-size: 0.7rem;
  background: #000;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  vertical-align: middle;
}

/* Sticky Nav */
.sticky-nav {
  position: sticky;
  top: 60px;
}

.nav-item {
  font-size: 0.9rem;
  padding: 10px 0;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 2px solid transparent;
  padding-left: 16px;
}

.nav-item:hover { color: #111827; }

.nav-item.active {
  color: #111827;
  font-weight: 600;
  border-left: 2px solid #1867C0; /* Primary color */
}

/* Spacing Helpers */
.gap-4 { gap: 1rem; }
</style>
