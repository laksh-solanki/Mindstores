<template>
  <div class="tos-page">
    <v-container class="bespoke-page-container" fluid>
      <section class="page-topbar mb-8">
        <div>
          <div class="brand-tagline ml-2">
            <span class="tag-label">LEGAL</span>
            <span class="tag-dot">•</span>
            <span class="tag-label">TERMS OF SERVICE</span>
          </div>
          <h1 class="page-title ml-2">
            Terms <span class="highlight-serif">of Demo Use</span>
          </h1>
          <p class="page-subtitle ml-2 mt-2 d-flex align-center gap-2">
            <v-icon size="16">mdi-clock-outline</v-icon>
            Last updated: June 2, 2026
            <span
              class="d-none d-sm-inline ml-2 pl-2"
              style="border-left: 1px solid #cbd5e1"
            >5 min read</span>
          </p>
        </div>
      </section>

      <v-row class="align-start">
        <v-col class="d-none d-md-block" cols="12" lg="3" md="4">
          <aside class="flat-sidebar-card sticky-tabs">
            <div class="sidebar-header">
              <span class="sidebar-title">Contents</span>
            </div>
            <v-tabs
              v-model="activeSection"
              align-tabs="start"
              bg-color="transparent"
              color="teal-darken-1"
              direction="vertical"
              mandatory
            >
              <v-tab
                v-for="item in menuItems"
                :key="item.id"
                class="flat-tab justify-start"
                :value="item.id"
                @click="scrollTo(item.id)"
              >
                {{ item.title }}
              </v-tab>
            </v-tabs>
          </aside>
        </v-col>

        <v-col cols="12" lg="9" md="8">
          <div class="flat-card-container pa-6 pa-md-10">
            <div ref="pdfContent" class="pdf-content-wrapper">
              <section
                v-for="section in sections"
                :id="section.id"
                :key="section.id"
                class="content-section mb-12"
              >
                <h2 class="section-title d-flex align-center">
                  <span class="section-number mr-4">{{ section.num }}</span>
                  {{ section.title }}
                </h2>
                <p class="section-text">{{ section.content }}</p>
              </section>
            </div>

            <hr class="flat-divider my-10">

            <footer
              class="d-flex flex-column flex-sm-row justify-space-between align-center gap-4"
            >
              <div class="text-center text-sm-left">
                <p class="footer-label mb-1">
                  Have questions about these terms?
                </p>
                <router-link
                  class="text-link"
                  to="/privacy"
                >View our Privacy Policy</router-link>
              </div>
              <button class="btn-flat-solid" :disabled="isDownloading" @click="downloadPdf">
                <v-icon size="18" start>mdi-download</v-icon>
                {{ isDownloading ? 'Generating...' : 'Download PDF' }}
              </button>
            </footer>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
  import html2pdf from "html2pdf.js";
  import { onMounted, onUnmounted, ref } from "vue";

  const scrollProgress = ref(0);
  const activeSection = ref("acceptance");
  const pdfContent = ref(null);
  const isDownloading = ref(false);

  const menuItems = [
    { id: "acceptance", title: "Acceptance of Terms" },
    { id: "accounts", title: "User Accounts" },
    { id: "orders", title: "Orders & Payments" },
    { id: "shipping", title: "Shipping & Returns" },
    { id: "ip", title: "Intellectual Property" },
    { id: "conduct", title: "User Conduct" },
    { id: "privacy", title: "Data Privacy" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "governing", title: "Governing Law" },
  ];

  const sections = [
    {
      id: "acceptance",
      num: "01",
      title: "Acceptance of Terms",
      content:
        "By accessing or using Mindstore, you acknowledge that this website is a portfolio demonstration. Products, prices, promotions, checkout options, shipping estimates, and order updates are sample content. If you do not agree with these terms, do not use the website. These terms may be updated when project behavior changes.",
    },
    {
      id: "accounts",
      num: "02",
      title: "User Accounts & Security",
      content:
        "Some demonstration features, including cart actions, reviews, profile settings, and order history, require an account. Keep your account credentials private and use only information you are comfortable providing to a portfolio project. Do not share passwords or reuse sensitive credentials created for other services.",
    },
    {
      id: "orders",
      num: "03",
      title: "Orders, Pricing & Payments",
      content:
        "Mindstore does not sell products or process real payments. Catalog prices, stock counts, promotion codes, payment methods, and totals are demonstration values used to show interface behavior. Never enter a real card number, CVV, UPI identifier, or other sensitive payment information. A confirmed demo order may appear in your account history for testing purposes only.",
    },
    {
      id: "shipping",
      num: "04",
      title: "Shipping, Delivery & Returns",
      content:
        "Mindstore does not arrange shipments, deliveries, returns, refunds, or exchanges. Any shipping cost, delivery estimate, tracking state, cancellation action, or return-related text shown in the interface is sample content designed to demonstrate a storefront workflow.",
    },
    {
      id: "ip",
      num: "05",
      title: "Intellectual Property Rights",
      content:
        "Website source code, branding, layout, and original project content remain subject to their applicable ownership and license terms. Product images, names, and third-party materials remain the property of their respective owners where applicable. Do not reuse protected content without permission.",
    },
    {
      id: "conduct",
      num: "06",
      title: "Prohibited User Conduct",
      content:
        "Do not use the website for unlawful activity, attempt unauthorized access, interfere with application availability, submit harmful content, scrape data at disruptive rates, or access another person's account. Use the project only for legitimate evaluation and demonstration purposes.",
    },
    {
      id: "privacy",
      num: "07",
      title: "Data Privacy & User Information",
      content:
        "Account details, preferences, cart actions, reviews, and generated demo-order history may be used to support the workflows you explore. Read the Privacy Policy for more detail. Use sample information wherever practical and never submit sensitive payment data.",
    },
    {
      id: "liability",
      num: "08",
      title: "Limitation of Liability & Disclaimers",
      content:
        'Mindstore is provided on an "as is" and "as available" basis as a portfolio demonstration. No representation is made that catalog items are available for sale or that sample checkout, payment, shipment, return, or support workflows are commercial services. Use the project at your own discretion.',
    },
    {
      id: "governing",
      num: "09",
      title: "Governing Law & Dispute Resolution",
      content:
        "Questions about these demonstration terms should be directed to the project contact listed on the website. Any legal rights or obligations that apply independently of this page remain governed by the applicable law in the relevant jurisdiction.",
    },
  ];

  function scrollTo(id) {
    const el = document.querySelector(`#${id}`);
    if (!el) return;
    activeSection.value = id;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleScroll() {
    const winScroll = window.scrollY || document.documentElement.scrollTop;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    scrollProgress.value = (winScroll / height) * 100;

    for (const section of sections) {
      const el = document.querySelector(`#${section.id}`);
      if (el && winScroll >= el.offsetTop - 100) {
        activeSection.value = section.id;
      }
    }
  }

  async function downloadPdf() {
    if (!pdfContent.value) return;
    isDownloading.value = true;
  
    try {
      const contentWidth = pdfContent.value.scrollWidth || 800;
      const contentHeight = pdfContent.value.scrollHeight + 40;
    
      const opt = {
        margin: 20,
        filename: "Terms_of_Service.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        // By setting the jsPDF height to match the element's scrollHeight, the output is exactly 1 page
        jsPDF: { unit: "px", format: [contentWidth + 40, contentHeight], orientation: "portrait" }
      };
    
      await html2pdf().set(opt).from(pdfContent.value).save();
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      isDownloading.value = false;
    }
  }

  onMounted(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll);
  });

  onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
  });
</script>

<style scoped>
.tos-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 40px 0 80px;
}

.bespoke-page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding-inline: clamp(16px, 3.5vw, 32px) !important;
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
}

.flat-sidebar-card {
  background: #ffffff;
  border: 1px solid #0f172a;
  padding: 24px;
}

.sidebar-header {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sticky-tabs {
  position: sticky;
  top: 90px;
}

.flat-tab {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  min-height: 40px !important;
}

.flat-tab.v-tab--selected {
  color: #0f172a !important;
  font-weight: 800 !important;
}

.flat-card-container {
  background: #ffffff;
  border: 1px solid #0f172a;
  border-radius: 0;
}

.content-section {
  scroll-margin-top: 90px;
}

.section-number {
  font-size: 12px;
  font-weight: 800;
  color: #ffffff;
  background: #0f172a;
  padding: 4px 8px;
  letter-spacing: 0.05em;
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.section-text {
  font-size: 15px;
  color: #475569;
  line-height: 1.8;
  margin: 0;
}

.flat-divider {
  border: none;
  border-top: 1px solid #e2e8f0;
}

.footer-label {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.text-link {
  font-size: 14px;
  font-weight: 700;
  color: #0d9488;
  text-decoration: none;
}

.text-link:hover {
  text-decoration: underline;
}

.btn-flat-solid {
  background: #0f172a;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 24px;
  border: 1px solid #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

  .btn-flat-solid:hover {
    background: #0d9488;
    border-color: #0d9488;
  }
</style>
