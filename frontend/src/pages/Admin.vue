<template>
  <div class="admin-page">
    <v-container class="py-12">
      <div class="d-flex justify-space-between align-center mb-8">
        <h1 class="page-title">Admin Dashboard</h1>
        <v-btn color="primary" @click="openAddDialog">
          <v-icon left>mdi-plus</v-icon>
          Add Product
        </v-btn>
      </div>

      <v-card class="admin-card">
        <v-card-text>
          <v-data-table
            class="elevation-0"
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
              <span>${{ item.price.toFixed(2) }}</span>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                icon
                size="small"
                variant="text"
                @click="editProduct(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                color="error"
                icon
                size="small"
                variant="text"
                @click="deleteProduct(item)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-container>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="dialog-title">
          {{ editMode ? 'Edit Product' : 'Add Product' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field v-model="formData.name" label="Product Name" required />

            <v-textarea
              v-model="formData.description"
              label="Description"
              rows="3"
            />

            <v-text-field
              v-model.number="formData.price"
              label="Price"
              prefix="$"
              required
              step="0.01"
              type="number"
            />

            <v-text-field v-model="formData.category" label="Category" required />

            <v-text-field
              v-model.number="formData.stock"
              label="Stock"
              required
              type="number"
            />

            <v-text-field
              v-model="formData.image_url"
              label="Image URL"
              required
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="saveProduct">
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
  import { onMounted, ref } from 'vue'

  export default {
    name: 'Admin',
    setup() {
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

      const headers = [
        { title: 'Image', key: 'image_url', sortable: false },
        { title: 'Name', key: 'name' },
        { title: 'Category', key: 'category' },
        { title: 'Price', key: 'price' },
        { title: 'Stock', key: 'stock' },
        { title: 'Actions', key: 'actions', sortable: false }
      ]

      // REFIX: Vite compatible env var
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
        editMode.value = true
        currentProductId.value = product.product_id
        formData.value = {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
          image_url: product.image_url
        }
        dialog.value = true
      }

      const saveProduct = async () => {
        saving.value = true
        try {
          if (editMode.value) {
            await axios.put(
              `${API_URL}/api/products/${currentProductId.value}`,
              formData.value,
              { withCredentials: true }
            )
            snackbarText.value = 'Product updated successfully'
          } else {
            await axios.post(
              `${API_URL}/api/products`,
              formData.value,
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
          snackbarText.value = 'Failed to save product'
          snackbarColor.value = 'error'
          snackbar.value = true
        } finally {
          saving.value = false
        }
      }

      const deleteProduct = async (product) => {
        if (!confirm(`Are you sure you want to delete ${product.name}?`)) {
          return
        }

        try {
          await axios.delete(
            `${API_URL}/api/products/${product.product_id}`,
            { withCredentials: true }
          )
          snackbarText.value = 'Product deleted successfully'
          snackbarColor.value = 'success'
          snackbar.value = true
          await fetchProducts()
        } catch (error) {
          console.error('Failed to delete product:', error)
          snackbarText.value = 'Failed to delete product'
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
        formData,
        headers,
        openAddDialog,
        editProduct,
        saveProduct,
        deleteProduct
      }
    }
  }
</script>

<style scoped>
.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #2F4F4F;
}

.admin-card {
  border-radius: 12px;
}

.product-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.dialog-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2F4F4F;
}
</style>
