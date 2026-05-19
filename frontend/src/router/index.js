import { createRouter, createWebHistory } from 'vue-router'

import Home from '@/pages/Home.vue'

const routes = [
  { path: '/', component: Home, name: 'Home' },
  { path: '/login', component: () => import('@/pages/Login.vue'), name: 'Login' },
  { path: '/create-account', component: () => import('@/pages/CreateAccount.vue'), name: 'CreateAccount' },
  { path: '/product/:id', component: () => import('@/pages/ProductDetail.vue'), name: 'ProductDetail' },
  { path: '/cart', component: () => import('@/pages/Cart.vue'), name: 'Cart' },
  { path: '/payment', component: () => import('@/pages/Payment.vue'), name: 'Payment' },
  { path: '/order-success', component: () => import('@/pages/OrderSuccess.vue'), name: 'OrderSuccess' },
  { path: '/profile', component: () => import('@/pages/Profile.vue'), name: 'Profile' },
  { path: '/privacy', component: () => import('@/pages/Privacy.vue'), name: 'Privacy'},
  { path: '/terms', component: () => import('@/pages/Terms-or-Service.vue'), name: 'Terms-or-Service'},
  { path: '/admin', component: () => import('@/pages/Admin.vue'), name: 'Admin' },
  { path: '/user-admin', component: () => import('@/pages/UserAdmin.vue'), name: 'UserAdmin' },
  { path: '/products', component: () => import('@/pages/Catalog.vue'), name: 'CatalogAll' },
  { path: '/:category', component: () => import('@/pages/Catalog.vue'), name: 'CatalogCategory' },
  { path: '/:category/:subcategory', component: () => import('@/pages/Catalog.vue'), name: 'Catalog' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
