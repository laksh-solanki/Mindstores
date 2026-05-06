<template>
  <v-snackbar
    v-model="isBannerVisible"
    location="bottom"
    max-width="760"
    :timeout="-1"
  >
    <v-card rounded="lg" variant="flat">
      <v-card-text>
        <div class="d-flex flex-column flex-md-row align-md-center ga-4">
          <div class="flex-grow-1">
            <p class="text-subtitle-1 font-weight-bold mb-1">Cookie preferences</p>
            <p class="text-body-2 text-medium-emphasis">
              Essential cookies keep login and cart secure. Optional cookies help improve the shopping experience.
            </p>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-btn rounded="lg" variant="outlined" @click="openPreferences">
              Manage
            </v-btn>
            <v-btn color="primary" rounded="lg" variant="flat" @click="acceptEssential">
              Essential only
            </v-btn>
            <v-btn color="primary" rounded="lg" variant="flat" @click="acceptAll">
              Accept all
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-snackbar>

  <v-dialog v-model="isDialogOpen" max-width="520">
    <v-card rounded="lg">
      <v-card-title>Cookie settings</v-card-title>
      <v-card-text>
        <v-list density="comfortable">
          <v-list-item
            prepend-icon="mdi-shield-lock-outline"
            subtitle="Required for authentication, cart, checkout, and security."
            title="Essential cookies"
          >
            <template #append>
              <v-switch color="primary" disabled hide-details :model-value="true" />
            </template>
          </v-list-item>
          <v-list-item
            prepend-icon="mdi-chart-line"
            subtitle="Helps measure page quality and catalog performance."
            title="Analytics cookies"
          >
            <template #append>
              <v-switch v-model="draft.analytics" color="primary" hide-details />
            </template>
          </v-list-item>
          <v-list-item
            prepend-icon="mdi-tag-heart-outline"
            subtitle="Supports personalized offers and campaign preferences."
            title="Marketing cookies"
          >
            <template #append>
              <v-switch v-model="draft.marketing" color="primary" hide-details />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn rounded="lg" variant="text" @click="acceptEssential">Essential only</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat" @click="savePreferences">Save preferences</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { onMounted, reactive, ref } from 'vue'
  import {
    DEFAULT_COOKIE_PREFERENCES,
    readCookieConsent,
    writeCookieConsent,
  } from '@/utils/cookieConsent'

  const isBannerVisible = ref(false)
  const isDialogOpen = ref(false)
  const draft = reactive({ ...DEFAULT_COOKIE_PREFERENCES })

  function hideAll() {
    isBannerVisible.value = false
    isDialogOpen.value = false
  }

  function persist(preferences) {
    const saved = writeCookieConsent(preferences)
    if (saved) {
      Object.assign(draft, saved)
    }
    hideAll()
  }

  function acceptEssential() {
    persist(DEFAULT_COOKIE_PREFERENCES)
  }

  function acceptAll() {
    persist({
      essential: true,
      analytics: true,
      marketing: true,
    })
  }

  function openPreferences() {
    isDialogOpen.value = true
  }

  function savePreferences() {
    persist(draft)
  }

  onMounted(() => {
    const savedPreferences = readCookieConsent()
    if (savedPreferences) {
      Object.assign(draft, savedPreferences)
      return
    }
    isBannerVisible.value = true
  })
</script>
