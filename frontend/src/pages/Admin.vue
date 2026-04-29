<template>
  <div class="admin-page">
    <v-container class="admin-shell">
      <section v-if="isAdmin" class="admin-hero">
        <p class="admin-kicker">Management</p>
        <div class="admin-head-row">
          <div>
            <h1 class="page-title">Admin Dashboard</h1>
            <p class="admin-subtitle">
              Manage product catalog, pricing, inventory, and storefront
              content.
            </p>
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

      <BaseAlert
        v-if="!isAdmin"
        class="admin-warning"
        message="Admin access is required to add, update, or delete products."
        type="warning"
      />

      <v-card v-if="isAdmin" class="admin-surface border" variant="flat">
        <v-card-text class="surface-content">
          <v-data-table
            v-if="!isMobile"
            class="admin-table elevation-0 border"
            :headers="headers"
            :items="products"
            :loading="loading"
          >
            <template #item.image_url="{ item }">
              <img alt="Product" class="product-thumb d-flex my-2" :src="item.image_url">
            </template>

            <template #item.price="{ item }">
              <span>${{
                Number((resolveProductRecord(item) || {}).price || 0).toFixed(
                  2,
                )
              }}</span>
            </template>

            <template #item.category_display="{ item }">
              <span>{{ formatCategory(resolveProductRecord(item)) }}</span>
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
                  <p v-if="product.company" class="mobile-company">{{ product.company }}</p>
                  <p>{{ formatCategory(product) }}</p>
                  <div class="mobile-meta">
                    <span class="mobile-price">${{ Number(product.price || 0).toFixed(2) }}</span>
                    <v-chip
                      size="small"
                      variant="tonal"
                    >Stock: {{ product.stock }}</v-chip>
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
          {{ editMode ? "Edit Product" : "Add Product" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" class="dialog-form">
            <v-text-field
              v-model="formData.name"
              label="Product Name"
              required
              variant="outlined"
            />

            <v-textarea
              v-model="formData.description"
              label="Description"
              rows="3"
              variant="outlined"
            />

            <v-text-field
              v-model="formData.company"
              label="Company / Brand"
              placeholder="Example: Sony, Apple, Ikea"
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

            <v-select
              v-model="formData.category"
              :items="categoryOptions"
              label="Category"
              required
              variant="outlined"
            />

            <v-select
              v-model="formData.subcategory"
              :disabled="availableSubcategories.length === 0"
              :hint="
                availableSubcategories.length === 0
                  ? 'No subcategory required for this category'
                  : ''
              "
              :items="availableSubcategories"
              label="Subcategory"
              persistent-hint
              :required="availableSubcategories.length > 0"
              variant="outlined"
            />

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
            {{ editMode ? "Update" : "Add" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseAlert
      v-model="snackbar"
      floating
      :message="snackbarText"
      :timeout="3000"
      :type="snackbarColor"
    />
  </div>
</template>

<script>
  import axios from "axios";
  import { computed, onMounted, ref, watch } from "vue";
  import { useDisplay } from "vuetify";
  import BaseAlert from "@/components/BaseAlert.vue";
  import { useAppStore } from "@/stores/app";
  import { API_URL } from "@/utils/api";

  const CATEGORY_OPTIONS_BASE = ["Electronics", "Furniture", "Clothing"];
  const SUBCATEGORY_OPTIONS_BY_CATEGORY = {
    Electronics: ["Mobiles", "Cameras", "Headphones", "Laptops", "Accessories", "Audio", "Gaming"],
    Furniture: ["Sofas", "Tables", "Chairs", "Living Room", "Bedroom", "Kitchen", "Dining", "Office"],
    Clothing: ["Shirts", "Jeans", "Jackets", "Men", "Women", "Kids", "Unisex"],
  };
  const CATEGORY_NAME_BY_KEY = CATEGORY_OPTIONS_BASE.reduce((acc, category) => {
    acc[category.toLowerCase()] = category;
    return acc;
  }, {});

  export default {
    name: "Admin",
    components: {
      BaseAlert,
    },
    setup() {
      const appStore = useAppStore();
      const { smAndDown } = useDisplay();
      const products = ref([]);
      const loading = ref(false);
      const dialog = ref(false);
      const editMode = ref(false);
      const saving = ref(false);
      const snackbar = ref(false);
      const snackbarText = ref("");
      const snackbarColor = ref("success");

      const formData = ref({
        name: "",
        company: "",
        description: "",
        price: 0,
        category: "",
        subcategory: "",
        stock: 0,
        image_url: "",
      });

      const currentProductId = ref(null);
      const isAdmin = computed(() => Boolean(appStore.user?.is_admin));
      const isMobile = computed(() => smAndDown.value);
      const resolveProductRecord = (item) =>
        item?.raw || item?.item?.raw || item?.item || item || null;

      const headers = [
        { title: "Image", key: "image_url", sortable: false },
        { title: "Name", key: "name" },
        { title: "Company", key: "company" },
        { title: "Category", key: "category_display" },
        { title: "Price", key: "price" },
        { title: "Stock", key: "stock" },
        { title: "Actions", key: "actions", sortable: false },
      ];

      const normalizeText = (value) =>
        value == null ? "" : String(value).trim();
      const normalizeCategoryName = (value) => {
        const normalizedValue = normalizeText(value);
        const lowerCasedValue = normalizedValue.toLowerCase();
        return CATEGORY_NAME_BY_KEY[lowerCasedValue] || normalizedValue;
      };
      const getSubcategoryOptions = (category) => {
        const normalizedCategory = normalizeCategoryName(category);
        return SUBCATEGORY_OPTIONS_BY_CATEGORY[normalizedCategory] || [];
      };
      const normalizeSubcategoryName = (category, subcategory) => {
        const normalizedSubcategory = normalizeText(subcategory);
        if (!normalizedSubcategory) return "";
        const matchingSubcategory = getSubcategoryOptions(category).find(
          (option) =>
            option.toLowerCase() === normalizedSubcategory.toLowerCase(),
        );
        return matchingSubcategory || normalizedSubcategory;
      };
      const categoryOptions = computed(() => {
        const currentCategory = normalizeCategoryName(formData.value.category);
        if (!currentCategory) return CATEGORY_OPTIONS_BASE;
        if (
          CATEGORY_OPTIONS_BASE.some(
            (category) =>
              category.toLowerCase() === currentCategory.toLowerCase(),
          )
        ) {
          return CATEGORY_OPTIONS_BASE;
        }
        return [...CATEGORY_OPTIONS_BASE, currentCategory];
      });
      const availableSubcategories = computed(() => {
        const matchedSubcategories = getSubcategoryOptions(
          formData.value.category,
        );
        const selectedSubcategory = normalizeSubcategoryName(
          formData.value.category,
          formData.value.subcategory,
        );
        if (!selectedSubcategory) return matchedSubcategories;
        if (
          matchedSubcategories.some(
            (subcategory) =>
              subcategory.toLowerCase() === selectedSubcategory.toLowerCase(),
          )
        ) {
          return matchedSubcategories;
        }
        return [...matchedSubcategories, selectedSubcategory];
      });
      const formatCategory = (product) => {
        const mainCategory = normalizeCategoryName(product?.category) || "Other";
        const subcategory = normalizeSubcategoryName(
          mainCategory,
          product?.subcategory,
        );
        return subcategory ? `${mainCategory} / ${subcategory}` : mainCategory;
      };

      watch(
        () => formData.value.category,
        (nextCategory) => {
          const normalizedCategory = normalizeCategoryName(nextCategory);
          if (normalizedCategory !== formData.value.category) {
            formData.value.category = normalizedCategory;
            return;
          }

          const categorySubcategories = getSubcategoryOptions(normalizedCategory);
          if (categorySubcategories.length === 0) {
            formData.value.subcategory = "";
            return;
          }

          const selectedSubcategory = normalizeSubcategoryName(
            normalizedCategory,
            formData.value.subcategory,
          );
          if (!selectedSubcategory) return;
          if (
            categorySubcategories.some(
              (subcategory) =>
                subcategory.toLowerCase() === selectedSubcategory.toLowerCase(),
            )
          ) {
            if (selectedSubcategory !== formData.value.subcategory) {
              formData.value.subcategory = selectedSubcategory;
            }
            return;
          }
          formData.value.subcategory = "";
        },
      );

      const fetchProducts = async () => {
        loading.value = true;
        try {
          const response = await axios.get(`${API_URL}/api/products`);
          products.value = response.data;
        } catch (error) {
          console.error("Failed to fetch products:", error);
        } finally {
          loading.value = false;
        }
      };

      const openAddDialog = () => {
        if (!isAdmin.value) {
          snackbarText.value = "Admin access required";
          snackbarColor.value = "warning";
          snackbar.value = true;
          return;
        }

        editMode.value = false;
        currentProductId.value = null;
        formData.value = {
          name: "",
          company: "",
          description: "",
          price: 0,
          category: "",
          subcategory: "",
          stock: 0,
          image_url: "",
        };
        dialog.value = true;
      };

      const editProduct = (product) => {
        if (!isAdmin.value) {
          snackbarText.value = "Admin access required";
          snackbarColor.value = "warning";
          snackbar.value = true;
          return;
        }

        const selectedProduct = resolveProductRecord(product);
        if (!selectedProduct?.product_id) {
          snackbarText.value = "Unable to update: product id not found";
          snackbarColor.value = "error";
          snackbar.value = true;
          return;
        }

        editMode.value = true;
        currentProductId.value = selectedProduct.product_id;
        formData.value = {
          name: selectedProduct.name,
          company: normalizeText(selectedProduct.company || ""),
          description: selectedProduct.description,
          price: selectedProduct.price,
          category: normalizeCategoryName(selectedProduct.category),
          subcategory: normalizeSubcategoryName(
            selectedProduct.category,
            selectedProduct.subcategory,
          ),
          stock: selectedProduct.stock,
          image_url: selectedProduct.image_url,
        };
        dialog.value = true;
      };

      const buildProductPayload = () => {
        const payload = {
          name: normalizeText(formData.value.name),
          company: normalizeText(formData.value.company),
          description: normalizeText(formData.value.description),
          category: normalizeCategoryName(formData.value.category),
          subcategory: normalizeSubcategoryName(
            formData.value.category,
            formData.value.subcategory,
          ),
          image_url: normalizeText(formData.value.image_url),
          price: Number(formData.value.price),
          stock: Math.max(0, Math.trunc(Number(formData.value.stock))),
        };

        if (!payload.name) return { error: "Product name is required" };
        if (!Number.isFinite(payload.price) || payload.price < 0)
          return { error: "Price must be a valid number" };
        if (!payload.category) return { error: "Category is required" };
        if (
          getSubcategoryOptions(payload.category).length > 0 &&
          !payload.subcategory
        ) {
          return { error: "Subcategory is required for the selected category" };
        }
        if (!payload.image_url) return { error: "Image URL is required" };

        return { payload };
      };

      const saveProduct = async () => {
        if (!isAdmin.value) {
          snackbarText.value = "Admin access required";
          snackbarColor.value = "warning";
          snackbar.value = true;
          return;
        }

        const { payload, error: validationError } = buildProductPayload();
        if (validationError) {
          snackbarText.value = validationError;
          snackbarColor.value = "warning";
          snackbar.value = true;
          return;
        }

        if (editMode.value && !currentProductId.value) {
          snackbarText.value = "Unable to update: missing product id";
          snackbarColor.value = "error";
          snackbar.value = true;
          return;
        }

        saving.value = true;
        try {
          if (editMode.value) {
            await axios.put(
              `${API_URL}/api/products/${encodeURIComponent(currentProductId.value)}`,
              payload,
              { withCredentials: true },
            );
            snackbarText.value = "Product updated successfully";
          } else {
            await axios.post(`${API_URL}/api/products`, payload, {
              withCredentials: true,
            });
            snackbarText.value = "Product added successfully";
          }

          snackbarColor.value = "success";
          snackbar.value = true;
          dialog.value = false;
          await fetchProducts();
        } catch (error) {
          console.error("Failed to save product:", error);
          snackbarText.value =
            error.response?.data?.message || "Failed to save product";
          snackbarColor.value = "error";
          snackbar.value = true;
        } finally {
          saving.value = false;
        }
      };

      const deleteProduct = async (product) => {
        if (!isAdmin.value) {
          snackbarText.value = "Admin access required";
          snackbarColor.value = "warning";
          snackbar.value = true;
          return;
        }

        const selectedProduct = resolveProductRecord(product);
        if (!selectedProduct?.product_id) {
          snackbarText.value = "Unable to delete: product id not found";
          snackbarColor.value = "error";
          snackbar.value = true;
          return;
        }

        if (
          !confirm(`Are you sure you want to delete ${selectedProduct.name}?`)
        ) {
          return;
        }

        try {
          await axios.delete(
            `${API_URL}/api/products/${encodeURIComponent(selectedProduct.product_id)}`,
            { withCredentials: true },
          );
          snackbarText.value = "Product deleted successfully";
          snackbarColor.value = "success";
          snackbar.value = true;
          await fetchProducts();
        } catch (error) {
          console.error("Failed to delete product:", error);
          snackbarText.value =
            error.response?.data?.message || "Failed to delete product";
          snackbarColor.value = "error";
          snackbar.value = true;
        }
      };

      onMounted(() => {
        fetchProducts();
      });

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
        categoryOptions,
        availableSubcategories,
        resolveProductRecord,
        formatCategory,
        openAddDialog,
        editProduct,
        saveProduct,
        deleteProduct,
      };
    },
  };
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 10% 14%,
      rgba(206, 124, 43, 0.2) 0%,
      rgba(206, 124, 43, 0) 36%
    ),
    radial-gradient(
      circle at 88% 78%,
      rgba(35, 62, 60, 0.14) 0%,
      rgba(35, 62, 60, 0) 40%
    ),
    linear-gradient(160deg, #f2f6f3 0%, #ecf2ee 45%, #eef3f0 100%);
}

.admin-shell {
  padding-top: 52px;
  padding-bottom: 64px;
  max-width: 1400px;
  margin: 0 auto;
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
  font-family: "Playfair Display", serif;
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
  overflow: hidden;
}

.surface-content {
  padding: 16px;
}

.admin-table {
  border-radius: 14px;
  overflow: hidden;
  width: 100%;
}

.product-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover !important;
  border-radius: 10px;
  border: 1px solid #d8e2dd;
}

.mobile-list {
  display: grid;
  gap: 12px;
  width: 100%;
}

.mobile-product-card {
  border: 1px solid #d8e2dd;
  border-radius: 16px;
  padding: 14px;
  background: #ffffff;
  width: 100%;
  box-sizing: border-box;
}

.mobile-item-top {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  width: 100%;
}

.mobile-product-image {
  width: 120px;
  height: 120px;
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

.mobile-company {
  color: #244047;
  font-weight: 700;
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
  font-family: "Playfair Display", serif;
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
    padding-left: 16px;
    padding-right: 16px;
  }

  .surface-content {
    padding: 12px;
  }

  .admin-head-row {
    flex-direction: column;
    gap: 12px;
  }

  .add-btn {
    align-self: flex-start;
  }
}

@media (max-width: 600px) {
  .admin-shell {
    padding-top: 24px;
    padding-bottom: 32px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .admin-head-row {
    flex-direction: column;
    gap: 16px;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .admin-subtitle {
    font-size: 0.9rem;
  }

  .mobile-product-image {
    width: 100px;
    height: 100px;
  }

  .mobile-item-top {
    flex-direction: row;
    align-items: flex-start;
  }

  .mobile-item-copy h3 {
    font-size: 0.95rem;
    word-break: break-word;
  }

  .mobile-meta {
    flex-direction: row;
    gap: 8px;
  }

  .mobile-actions {
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
    margin-top: 8px;
  }

  .mobile-product-card {
    padding: 10px;
  }
}
</style>
