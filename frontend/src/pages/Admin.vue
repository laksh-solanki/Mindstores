<template>
  <div class="admin-page">
    <v-container class="admin-shell">
      <section class="admin-hero">
        <p class="admin-kicker">Management</p>
        <div class="admin-head-row">
          <div>
            <h1 class="page-title">Admin Dashboard</h1>
            <p class="admin-subtitle">Manage product catalog, pricing, inventory, and storefront content.</p>
          </div>
          <v-btn
            class="add-btn"
            color="primary"
            :disabled="!isAdmin"
            rounded="pill"
            size="large"
            @click="openAddDialog"
          >
            <v-icon start>mdi-plus</v-icon>
            Add Product
          </v-btn>
        </div>
      </section>

      <v-alert
        v-if="!isAdmin"
        class="admin-warning"
        density="comfortable"
        type="warning"
        variant="tonal"
      >
        Admin access is required to add, update, or delete products.
      </v-alert>

      <v-card class="admin-surface" variant="flat">
        <v-card-text class="surface-content">
          <v-data-table
            v-if="!isMobile"
            class="admin-table elevation-0"
            :headers="headers"
            :items="products"
            :loading="loading"
          >
            <template #item.image_url="{ item }">
              <img
                alt="Product"
                class="product-thumb"
                :src="item.image_url"
              >
            </template>

            <template #item.price="{ item }">
              <span>${{ Number((resolveProductRecord(item) || {}).price || 0).toFixed(2) }}</span>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                :disabled="!isAdmin"
                icon
                size="small"
                variant="text"
                @click="editProduct(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                color="error"
                :disabled="!isAdmin"
                icon
                size="small"
                variant="text"
                @click="deleteProduct(item)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>

          <div v-else class="mobile-list">
            <v-card
              v-for="product in products"
              :key="product.product_id"
              class="mobile-product-card"
              variant="flat"
            >
              <div class="mobile-item-top">
                <img
                  alt="Product"
                  class="mobile-product-image"
                  :src="product.image_url"
                >
                <div class="mobile-item-copy">
                  <h3>{{ product.name }}</h3>
                  <p>{{ product.category }}</p>
                  <div class="mobile-meta">
                    <span class="mobile-price">${{ Number(product.price || 0).toFixed(2) }}</span>
                    <v-chip size="small" variant="tonal">Stock: {{ product.stock }}</v-chip>
                  </div>
                </div>
              </div>

              <div class="mobile-actions">
                <v-btn
                  class="mobile-action-btn"
                  :disabled="!isAdmin"
                  size="small"
                  variant="text"
                  @click="editProduct(product)"
                >
                  <v-icon size="18" start>mdi-pencil</v-icon>
                  Edit
                </v-btn>
                <v-btn
                  class="mobile-action-btn"
                  color="error"
                  :disabled="!isAdmin"
                  size="small"
                  variant="text"
                  @click="deleteProduct(product)"
                >
                  <v-icon size="18" start>mdi-delete</v-icon>
                  Delete
                </v-btn>
              </div>
            </v-card>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <v-dialog v-model="dialog" max-width="640">
      <v-card class="admin-dialog-card">
        <v-card-title class="dialog-title">
          {{ editMode ? 'Edit Product' : 'Add Product' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" class="dialog-form">
            <v-text-field v-model="formData.name" label="Product Name" required variant="outlined" />

            <v-textarea
              v-model="formData.description"
              label="Description"
              rows="3"
              variant="outlined"
            />

            <v-text-field
              v-model.number="formData.price"
              label="Price"
              prefix="$"
              required
              step="0"
              type="number"
              variant="outlined"
            />

            <v-text-field v-model="formData.category" label="Category" required variant="outlined" />

            <v-text-field
              v-model.number="formData.stock"
              label="Stock"
              required
              type="number"
              variant="outlined"
            />

            <v-text-field
              v-model="formData.image_url"
              label="Image URL"
              required
              variant="outlined"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn rounded="pill" variant="text" @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!isAdmin"
            :loading="saving"
            rounded="pill"
            @click="saveProduct"
          >
            {{ editMode ? 'Update' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
  import axios from 'axios'
  import { computed, onMounted, ref } from 'vue'
  import { useDisplay } from 'vuetify'
  import { useAppStore } from '@/stores/app'

  export default {
    name: 'Admin',
    setup() {
      const appStore = useAppStore()
      const { smAndDown } = useDisplay()
      const products = ref([])
      const loading = ref(false)
      const dialog = ref(false)
      const editMode = ref(false)
      const saving = ref(false)
      const snackbar = ref(false)
      const snackbarText = ref('')
      const snackbarColor = ref('success')

      const formData = ref({
        name: '',
        description: '',
        price: 0,
        category: '',
        stock: 0,
        image_url: ''
      })

      const currentProductId = ref(null)
      const isAdmin = computed(() => Boolean(appStore.user?.is_admin))
      const isMobile = computed(() => smAndDown.value)
      const resolveProductRecord = (item) => item?.raw || item?.item?.raw || item?.item || item || null

      const headers = [
        { title: 'Image', key: 'image_url', sortable: false },
        { title: 'Name', key: 'name' },
        { title: 'Category', key: 'category' },
        { title: 'Price', key: 'price' },
        { title: 'Stock', key: 'stock' },
        { title: 'Actions', key: 'actions', sortable: false }
      ]

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const fetchProducts = async () => {
        loading.value = true
        try {
          const response = await axios.get(`${API_URL}/api/products`)
          products.value = response.data
        } catch (error) {
          console.error('Failed to fetch products:', error)
        } finally {
          loading.value = false
        }
      }

      const openAddDialog = () => {
        if (!isAdmin.value) {
          snackbarText.value = 'Admin access required'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        editMode.value = false
        currentProductId.value = null
        formData.value = {
          name: '',
          description: '',
          price: 0,
          category: '',
          stock: 0,
          image_url: ''
        }
        dialog.value = true
      }

      const editProduct = (product) => {
        if (!isAdmin.value) {
          snackbarText.value = 'Admin access required'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        const selectedProduct = resolveProductRecord(product)
        if (!selectedProduct?.product_id) {
          snackbarText.value = 'Unable to update: product id not found'
          snackbarColor.value = 'error'
          snackbar.value = true
          return
        }

        editMode.value = true
        currentProductId.value = selectedProduct.product_id
        formData.value = {
          name: selectedProduct.name,
          description: selectedProduct.description,
          price: selectedProduct.price,
          category: selectedProduct.category,
          stock: selectedProduct.stock,
          image_url: selectedProduct.image_url
        }
        dialog.value = true
      }

      const normalizeText = (value) => (value == null ? '' : String(value).trim())

      const buildProductPayload = () => {
        const payload = {
          name: normalizeText(formData.value.name),
          description: normalizeText(formData.value.description),
          category: normalizeText(formData.value.category),
          image_url: normalizeText(formData.value.image_url),
          price: Number(formData.value.price),
          stock: Math.max(0, Math.trunc(Number(formData.value.stock)))
        }

        if (!payload.name) return { error: 'Product name is required' }
        if (!Number.isFinite(payload.price) || payload.price < 0) return { error: 'Price must be a valid number' }
        if (!payload.category) return { error: 'Category is required' }
        if (!payload.image_url) return { error: 'Image URL is required' }

        return { payload }
      }

      const saveProduct = async () => {
        if (!isAdmin.value) {
          snackbarText.value = 'Admin access required'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        const { payload, error: validationError } = buildProductPayload()
        if (validationError) {
          snackbarText.value = validationError
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        if (editMode.value && !currentProductId.value) {
          snackbarText.value = 'Unable to update: missing product id'
          snackbarColor.value = 'error'
          snackbar.value = true
          return
        }

        saving.value = true
        try {
          if (editMode.value) {
            await axios.put(
              `${API_URL}/api/products/${encodeURIComponent(currentProductId.value)}`,
              payload,
              { withCredentials: true }
            )
            snackbarText.value = 'Product updated successfully'
          } else {
            await axios.post(
              `${API_URL}/api/products`,
              payload,
              { withCredentials: true }
            )
            snackbarText.value = 'Product added successfully'
          }

          snackbarColor.value = 'success'
          snackbar.value = true
          dialog.value = false
          await fetchProducts()
        } catch (error) {
          console.error('Failed to save product:', error)
          snackbarText.value = error.response?.data?.message || 'Failed to save product'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          saving.value = false
        }
      }

      const deleteProduct = async (product) => {
        if (!isAdmin.value) {
          snackbarText.value = 'Admin access required'
          snackbarColor.value = 'warning'
          snackbar.value = true
          return
        }

        const selectedProduct = resolveProductRecord(product)
        if (!selectedProduct?.product_id) {
          snackbarText.value = 'Unable to delete: product id not found'
          snackbarColor.value = 'error'
          snackbar.value = true
          return
        }

        if (!confirm(`Are you sure you want to delete ${selectedProduct.name}?`)) {
          return
        }

        try {
          await axios.delete(
            `${API_URL}/api/products/${encodeURIComponent(selectedProduct.product_id)}`,
            { withCredentials: true }
          )
          snackbarText.value = 'Product deleted successfully'
          snackbarColor.value = 'success'
          snackbar.value = true
          await fetchProducts()
        } catch (error) {
          console.error('Failed to delete product:', error)
          snackbarText.value = error.response?.data?.message || 'Failed to delete product'
          snackbarColor.value = 'error'
          snackbar.value = true
        }
      }

      onMounted(() => {
        fetchProducts()
      })

      return {
        products,
        loading,
        dialog,
        editMode,
        saving,
        snackbar,
        snackbarText,
        snackbarColor,
        isAdmin,
        isMobile,
        formData,
        headers,
        resolveProductRecord,
        openAddDialog,
        editProduct,
        saveProduct,
        deleteProduct
      }
    }
  }
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 14%, rgba(206, 124, 43, 0.2) 0%, rgba(206, 124, 43, 0) 36%),
    radial-gradient(circle at 88% 78%, rgba(35, 62, 60, 0.14) 0%, rgba(35, 62, 60, 0) 40%),
    linear-gradient(160deg, #f2f6f3 0%, #ecf2ee 45%, #eef3f0 100%);
}

.admin-shell {
  padding-top: 52px;
  padding-bottom: 64px;
}

.admin-kicker {
  font-size: 0.78rem;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #b46a22;
  font-weight: 700;
}

.admin-head-row {
  margin-top: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3.1rem);
  color: #1c2d30;
}

.admin-subtitle {
  margin-top: 10px;
  max-width: 620px;
  color: #5e7076;
  line-height: 1.7;
}

.add-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.1px;
  box-shadow: 0 12px 24px rgba(198, 115, 42, 0.25);
}

.admin-warning {
  margin-top: 24px;
  border-radius: 14px;
}

.admin-surface {
  margin-top: 24px;
  border: 1px solid #d8e2dd;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 40px rgba(20, 35, 33, 0.08);
}

.surface-content {
  padding: 12px;
}

.admin-table {
  border-radius: 14px;
  overflow: hidden;
}

.product-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #d8e2dd;
}

.mobile-list {
  display: grid;
  gap: 12px;
}

.mobile-product-card {
  border: 1px solid #d8e2dd;
  border-radius: 16px;
  padding: 12px;
  background: #ffffff;
}

.mobile-item-top {
  display: flex;
  gap: 12px;
}

.mobile-product-image {
  width: 92px;
  height: 92px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #d8e2dd;
}

.mobile-item-copy {
  flex: 1;
  min-width: 0;
}

.mobile-item-copy h3 {
  font-size: 1rem;
  color: #1e2d31;
  line-height: 1.35;
}

.mobile-item-copy p {
  margin-top: 4px;
  color: #6b7d84;
  font-size: 0.88rem;
}

.mobile-meta {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.mobile-price {
  color: #b15f1e;
  font-weight: 800;
}

.mobile-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.mobile-action-btn {
  text-transform: none;
  font-weight: 700;
}

.admin-dialog-card {
  border-radius: 18px;
}

.dialog-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.55rem;
  font-weight: 700;
  color: #1f2f33;
}

.dialog-form {
  display: grid;
  gap: 10px;
}

.dialog-actions {
  padding: 8px 18px 18px;
}

@media (max-width: 960px) {
  .admin-shell {
    padding-top: 40px;
  }

  .surface-content {
    padding: 8px;
  }
}

@media (max-width: 600px) {
  .admin-shell {
    padding-top: 32px;
    padding-bottom: 44px;
  }

  .mobile-product-image {
    width: 84px;
    height: 84px;
  }
}
</style>
