<template>
  <v-app>
    <AppHeader />

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
  import { onMounted } from 'vue'
  import AppHeader from '@/components/AppHeader.vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()

  // Initialize the Auth Listener when the app starts
  onMounted(() => {
    appStore.initAuthListener()
  })
</script>

<style>
/* Global Resets */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.v-main {
  background-color: #F8F9FA;
}
</style>
