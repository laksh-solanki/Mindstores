import axios from 'axios'
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    products: {}
  }),

  getters: {
    totalItems: (state) => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0)
    },

    totalAmount: (state) => {
      return state.items.reduce((sum, item) => {
        const product = state.products[item.product_id]
        if (product) {
          return sum + (product.price * item.quantity)
        }
        return sum
      }, 0)
    }
  },

  actions: {
    async fetchCart() {
      try {
        const response = await axios.get('/api/cart', {
          withCredentials: true
        })
        this.items = response.data.items || []
        await this.loadProductDetails()
      } catch (error) {
        console.error('Failed to fetch cart:', error)
      }
    },

    async loadProductDetails() {
      for (const item of this.items) {
        if (!this.products[item.product_id]) {
          try {
            const response = await axios.get(`/api/products/${item.product_id}`)
            this.products[item.product_id] = response.data
          } catch (error) {
            console.error(`Failed to load product ${item.product_id}:`, error)
          }
        }
      }
    },

    async addToCart(productId, quantity = 1) {
      try {
        await axios.post(
          '/api/cart/add',
          { product_id: productId, quantity },
          { withCredentials: true }
        )
        await this.fetchCart()
      } catch (error) {
        console.error('Failed to add to cart:', error)
        throw error
      }
    },

    async removeFromCart(productId) {
      try {
        await axios.post(
          `/api/cart/remove?product_id=${productId}`,
          {},
          { withCredentials: true }
        )
        await this.fetchCart()
      } catch (error) {
        console.error('Failed to remove from cart:', error)
      }
    },

    async clearCart() {
      try {
        await axios.post('/api/cart/clear', {}, {
          withCredentials: true
        })
        this.items = []
        this.products = {}
      } catch (error) {
        console.error('Failed to clear cart:', error)
      }
    }
  }
})
