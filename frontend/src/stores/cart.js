import axios from 'axios'
import { defineStore } from 'pinia'
import { useAppStore } from './app'

// REFIX: Vite compatible env var (Port 8000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const pendingProductRequests = new Map()

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
      const likelyAuthenticated = appStore.isAuthenticated

      if (!likelyAuthenticated) {
        const hasSession = await appStore.ensureBackendSession()
        if (!hasSession) {
          throw new Error('User not authenticated')
        }
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

        const missingProductIds = [...new Set(
          this.items
            .map((item) => item.product_id)
            .filter((productId) => !this.products[productId]),
        )]

        if (missingProductIds.length > 0) {
          await this.fetchMissingProducts(missingProductIds)
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error)
      }
    },

    async fetchMissingProducts(productIds) {
      const missingProductIds = [...new Set(
        productIds.filter((productId) => !this.products[productId])
      )]

      if (missingProductIds.length === 0) {
        return
      }

      // For multiple items, a single products request is usually faster than N detail requests.
      if (missingProductIds.length > 1) {
        try {
          const response = await axios.get(`${API_URL}/api/products`, { timeout: 8000 })
          const allProducts = Array.isArray(response.data) ? response.data : []
          const productsById = new Map(allProducts.map((product) => [product.product_id, product]))

          for (const productId of missingProductIds) {
            if (productsById.has(productId)) {
              this.products[productId] = productsById.get(productId)
            }
          }
        } catch (error) {
          console.warn('Bulk products fetch failed, falling back to per-product fetch.', error)
        }
      }

      const stillMissingIds = missingProductIds.filter((productId) => !this.products[productId])
      if (stillMissingIds.length > 0) {
        await Promise.all(stillMissingIds.map((productId) => this.fetchProductDetails(productId)))
      }
    },

    async fetchProductDetails(productId) {
      if (this.products[productId]) {
        return this.products[productId]
      }

      if (pendingProductRequests.has(productId)) {
        return pendingProductRequests.get(productId)
      }

      const request = axios
        .get(`${API_URL}/api/products/${productId}`)
        .then((response) => {
          this.products[productId] = response.data
          return response.data
        })
        .catch((error) => {
          console.error(`Failed to fetch product ${productId}`, error)
          return null
        })
        .finally(() => {
          pendingProductRequests.delete(productId)
        })

      pendingProductRequests.set(productId, request)

      try {
        return await request
      } catch {
        return null
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
    },

    async updateCartQuantity(productId, quantity) {
      try {
        await this.withAuthRetry(() =>
          axios.post(
            `${API_URL}/api/cart/update`,
            { product_id: productId, quantity },
            { withCredentials: true }
          )
        )

        const item = this.items.find((cartItem) => cartItem.product_id === productId)
        if (item) {
          item.quantity = quantity
        }
      } catch (error) {
        console.error('Failed to update cart quantity:', error)
        throw error
      }
    }
  }
})
