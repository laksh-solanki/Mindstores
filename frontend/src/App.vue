<template>
  <v-app>
    <v-main>
      <v-container v-if="appStore.loading" class="fill-height justify-center">
        <v-progress-circular color="primary" indeterminate />
      </v-container>

      <router-view v-else />
    </v-main>
    <AppFooter />
  </v-app>
</template>

<script setup>
  import { onMounted } from 'vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()

  onMounted(() => {
    appStore.initAuthListener()
  })
</script>
