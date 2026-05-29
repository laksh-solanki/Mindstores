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
            Terms <span class="highlight-serif">of Service</span>
          </h1>
          <p class="page-subtitle ml-2 mt-2 d-flex align-center gap-2">
            <v-icon size="16">mdi-clock-outline</v-icon>
            Last updated: February 22, 2026
            <span
              class="d-none d-sm-inline ml-2 pl-2"
              style="border-left: 1px solid #cbd5e1"
              >8 min read</span
            >
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

            <hr class="flat-divider my-10" />

            <footer
              class="d-flex flex-column flex-sm-row justify-space-between align-center gap-4"
            >
              <div class="text-center text-sm-left">
                <p class="footer-label mb-1">
                  Have questions about these terms?
                </p>
                <router-link class="text-link" to="/privacy"
                  >View our Privacy Policy</router-link
                >
              </div>
              <button class="btn-flat-solid" @click="downloadPdf" :disabled="isDownloading">
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
      "By accessing, browsing, or using the Mindstore website and related services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. We reserve the right, at our sole discretion, to modify, add, or remove portions of these terms at any time. Your continued use of the website following the posting of changes means that you accept and agree to the changes.",
  },
  {
    id: "accounts",
    num: "02",
    title: "User Accounts & Security",
    content:
      "To access certain features of our platform, including fast checkout and order history, you may be required to register for an account. You are solely responsible for maintaining the confidentiality of your account credentials, including your password, and for restricting access to your computer or device. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.",
  },
  {
    id: "orders",
    num: "03",
    title: "Orders, Pricing & Payments",
    content:
      "All prices displayed on Mindstore are subject to change without notice. We make every effort to display accurate product descriptions and pricing, however, errors may occur. In the event a product is listed at an incorrect price, we reserve the right to refuse or cancel any orders placed for that product. Payment must be received by us before our acceptance of an order. We accept major credit cards and other designated payment methods. By submitting your payment information, you grant us the right to provide such information to third parties for purposes of facilitating the transaction.",
  },
  {
    id: "shipping",
    num: "04",
    title: "Shipping, Delivery & Returns",
    content:
      "Delivery times are estimates only and are not guaranteed. Risk of loss and title for items purchased from Mindstore pass to you upon delivery of the items to the carrier. If you are not completely satisfied with your purchase, you may return it within our designated return period in accordance with our Return Policy. Items must be returned in their original condition, unworn, unwashed, and with all tags attached. Refunds will be issued to the original method of payment.",
  },
  {
    id: "ip",
    num: "05",
    title: "Intellectual Property Rights",
    content:
      "All content included on the Mindstore website, such as text, graphics, logos, images, audio clips, digital downloads, and data compilations, is the property of Mindstore or its content suppliers and is protected by international copyright, trademark, and other intellectual property laws. The compilation of all content on this site is the exclusive property of Mindstore. You may not extract or re-utilize parts of the contents without our express written consent.",
  },
  {
    id: "conduct",
    num: "06",
    title: "Prohibited User Conduct",
    content:
      "You agree not to use the Mindstore website for any unlawful purpose or in any way that might harm, damage, or disparage any other party. You may not attempt to gain unauthorized access to any portion of the site, other accounts, computer systems, or networks connected to the site. Prohibited activities include, but are not limited to: transmitting harmful code, engaging in data mining, attempting to interfere with the proper working of the site, or using the site to harass or harm others.",
  },
  {
    id: "privacy",
    num: "07",
    title: "Data Privacy & User Information",
    content:
      "Your privacy is critical to us. We collect, store, and use your personal information in accordance with our Privacy Policy. By using Mindstore, you consent to such processing and you warrant that all data provided by you is accurate. Please review our Privacy Policy to understand our practices regarding your data, including how we handle cookies, analytics, and third-party integrations.",
  },
  {
    id: "liability",
    num: "08",
    title: "Limitation of Liability & Disclaimers",
    content:
      'The Mindstore website and all information, content, materials, products, and services included on or otherwise made available to you through this site are provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, as to the operation of the site or the information, content, materials, or products included on it. In no event shall Mindstore, its directors, officers, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the site.',
  },
  {
    id: "governing",
    num: "09",
    title: "Governing Law & Dispute Resolution",
    content:
      "These Terms of Service and any separate agreements whereby we provide you services shall be governed by and construed in accordance with the laws of the jurisdiction in which Mindstore operates, without regard to its conflict of law provisions. Any dispute arising from or relating to the subject matter of these terms shall be finally settled by arbitration in accordance with the applicable rules, except that either party may seek equitable relief in a court of competent jurisdiction.",
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
