import { createRouter, createWebHistory } from 'vue-router'

import Admin from '@/pages/Admin.vue'
import Cart from '@/pages/Cart.vue'
// Import all pages manually
import Home from '@/pages/Home.vue'
import Login from '@/pages/Login.vue'
import OrderSuccess from '@/pages/OrderSuccess.vue'
import ProductDetail from '@/pages/ProductDetail.vue'
import Profile from '@/pages/Profile.vue'

const routes = [
  { path: '/', component: Home, name: 'Home' },
  { path: '/login', component: Login, name: 'Login' },
  { path: '/product/:id', component: ProductDetail, name: 'ProductDetail' },
  { path: '/cart', component: Cart, name: 'Cart' },
  { path: '/order-success', component: OrderSuccess, name: 'OrderSuccess' },
  { path: '/profile', component: Profile, name: 'Profile' },
  { path: '/admin', component: Admin, name: 'Admin' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
