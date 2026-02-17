<template>
  <v-app>
    <AppHeader />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
  import AppHeader from './components/AppHeader.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.v-main {
  background-color: #F8F9FA;
}
</style>
