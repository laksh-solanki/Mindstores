import axios from 'axios'
import { defineStore } from 'pinia'
import { useAppStore } from './app'

// REFIX: Vite compatible env var (Port 8000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    products: {}, // Cache product details to avoid constant refetching
  }),

  getters: {
    totalAmount: (state) => {
      return state.items.reduce((total, item) => {
        const product = state.products[item.product_id]
        return total + (product ? product.price * item.quantity : 0)
      }, 0)
    },
    itemCount: (state) => state.items.reduce((total, item) => total + item.quantity, 0)
  },

  actions: {
    async withAuthRetry(requestFn) {
      const appStore = useAppStore()
      const hasSession = await appStore.ensureBackendSession()
      if (!hasSession) {
        throw new Error('User not authenticated')
      }

      try {
        return await requestFn()
      } catch (error) {
        if (error?.response?.status === 401) {
          const refreshed = await appStore.ensureBackendSession()
          if (refreshed) {
            return await requestFn()
          }
        }
        throw error
      }
    },

    async fetchCart() {
      try {
        const response = await this.withAuthRetry(() =>
          axios.get(`${API_URL}/api/cart`, { withCredentials: true })
        )
        this.items = response.data.items || []

        // Fetch product details for items in cart if we don't have them
        for (const item of this.items) {
          if (!this.products[item.product_id]) {
            await this.fetchProductDetails(item.product_id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error)
      }
    },

    async fetchProductDetails(productId) {
      try {
        const response = await axios.get(`${API_URL}/api/products/${productId}`)
        this.products[productId] = response.data
      } catch (error) {
        console.error(`Failed to fetch product ${productId}`, error)
      }
    },

    async addToCart(productId, quantity = 1) {
      try {
        await this.withAuthRetry(() =>
          axios.post(
            `${API_URL}/api/cart/add`,
            { product_id: productId, quantity },
            { withCredentials: true }
          )
        )
        await this.fetchCart() // Refresh cart
      } catch (error) {
        console.error('Failed to add to cart:', error)
        throw error
      }
    },

    async removeFromCart(productId) {
      try {
        await this.withAuthRetry(() =>
          axios.post(
            `${API_URL}/api/cart/remove`,
            { product_id: productId },
            { withCredentials: true }
          )
        )
        await this.fetchCart()
      } catch (error) {
        console.error('Failed to remove item:', error)
        throw error
      }
    }
  }
})
