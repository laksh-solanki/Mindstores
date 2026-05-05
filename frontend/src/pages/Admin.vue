<template>
  <v-layout class="admin-page">
    <v-app-bar :color="adminColors.green" density="comfortable" flat>
      <template #prepend>
        <v-avatar :color="adminColors.cream" icon="mdi-storefront-outline" />
      </template>
      <v-app-bar-title class="text-h6 font-weight-bold">
        Admin
      </v-app-bar-title>
      <v-spacer />
      <div class="d-flex align-center gap-2">
        <v-avatar :color="adminColors.avatar" size="33" class="text-white">
          <span class="font-weight-bold">{{ userInitials }}</span>
        </v-avatar>
        <span class="text-white d-none d-sm-inline">{{ userName }}</span>
      </div>
    </v-app-bar>

    <v-navigation-drawer :color="adminColors.creamLight" rail expand-on-hover width="312" elevation="1">
      <v-list density="comfortable">
        <v-list-item v-for="item in navItems" :key="item.id" :active="activePanel === item.id" density="comfortable"
          @click="activePanel = item.id">
          <template #prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-list density="comfortable">
        <v-list-item :active="activePanel === 'settings'" density="comfortable" @click="activePanel = 'settings'">
          <template #prepend>
            <v-icon>mdi-cog-outline</v-icon>
          </template>
          <v-list-item-title>Settings</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <v-alert v-if="!isAdmin" class="admin-warning" type="warning" title="Admin Required"
          text="Admin access is required to add, update, or delete products." closable />

        <section v-if="activePanel === 'dashboard'" class="dashboard-panel">
          <v-row align="stretch">
            <v-col v-for="metric in metricCards" :key="metric.label">
              <v-sheet class="pa-5 d-flex align-center justify-space-between" :color="adminColors.creamSoft" rounded="lg">
                <div>
                  <p class="mb-1">{{ metric.label }}</p>
                  <h3 class="mb-0">{{ metric.value }}</h3>
                </div>
                <v-icon :class="metric.className" size="34">{{ metric.icon }}</v-icon>
              </v-sheet>
            </v-col>
          </v-row>

          <section class="admin-section recent-section">
            <div class="section-heading">
              <div>
                <h2>Recent Inventory</h2>
                <p>Search and review storefront products before editing.</p>
              </div>
              <v-btn class="admin-primary-btn" :disabled="!isAdmin" @click="openAddDialog">
                <v-icon start>mdi-plus</v-icon>
                Add Product
              </v-btn>
            </div>

            <v-text-field v-model="productSearch" class="admin-search" density="comfortable" hide-details label="Search"
              prepend-inner-icon="mdi-magnify" rounded="xl" variant="outlined" />

            <div class="recent-table">
              <div class="recent-head">
                <span>Name</span>
                <span>Amount</span>
                <span>Vendor</span>
                <span>Status</span>
                <span>Stock</span>
              </div>

              <div v-for="product in recentProducts" :key="product.product_id" class="recent-row">
                <div class="product-cell">
                  <img :alt="product.name" :src="product.image_url">
                  <span>{{ product.name }}</span>
                </div>
                <span>{{ formatCurrency(product.price) }}</span>
                <span>{{ product.company || "Mindstores" }}</span>
                <span>
                  <v-chip class="status-chip" :class="stockStatus(product).className" size="small" variant="outlined">
                    {{ stockStatus(product).label }}
                  </v-chip>
                </span>
                <span>{{ formatNumber(product.stock || 0) }}</span>
              </div>

              <div v-if="recentProducts.length === 0" class="empty-row">
                No products match your search.
              </div>
            </div>
          </section>

          <div class="lower-grid">
            <section class="admin-section">
              <h2>Transactions</h2>
              <div class="summary-list">
                <div v-for="category in categoryStats" :key="category.name" class="summary-item">
                  <v-avatar class="summary-avatar" size="42">
                    {{ category.name.slice(0, 1) }}
                  </v-avatar>
                  <div>
                    <h3>{{ category.name }}</h3>
                    <p>{{ category.count }} products</p>
                  </div>
                  <strong>{{ formatCurrency(category.value) }}</strong>
                </div>
              </div>
            </section>

            <section class="admin-section">
              <h2>Summary</h2>
              <div class="summary-list">
                <div class="summary-item">
                  <v-avatar class="summary-avatar revenue" size="42">R</v-avatar>
                  <div>
                    <h3>Catalog Value</h3>
                    <p>Price multiplied by stock</p>
                  </div>
                  <strong>{{ formatCurrency(totalCatalogValue) }}</strong>
                </div>
                <div class="summary-item">
                  <v-avatar class="summary-avatar stock" size="42">S</v-avatar>
                  <div>
                    <h3>Low Stock</h3>
                    <p>Products below 5 units</p>
                  </div>
                  <strong>{{ lowStockCount }}</strong>
                </div>
                <div class="summary-item">
                  <v-avatar class="summary-avatar category" size="42">C</v-avatar>
                  <div>
                    <h3>Top Category</h3>
                    <p>{{ topCategory.name }}</p>
                  </div>
                  <strong>{{ topCategory.count }}</strong>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section v-else-if="activePanel === 'products'" class="products-panel">
          <section class="admin-section">
            <div class="section-heading">
              <div>
                <h2>Product Catalog</h2>
                <p>Add, edit, delete, and audit storefront inventory.</p>
              </div>
              <v-btn class="admin-primary-btn" :disabled="!isAdmin" :loading="loading" @click="openAddDialog">
                <v-icon start>mdi-plus</v-icon>
                Add Product
              </v-btn>
            </div>

            <v-text-field v-model="productSearch" class="admin-search" density="comfortable" hide-details
              label="Search products" prepend-inner-icon="mdi-magnify" rounded="xl" variant="outlined" />

            <v-data-table v-if="!isMobile" class="admin-data-table" :headers="headers" :items="filteredProducts"
              :loading="loading" :items-per-page="8">
              <template #item.image_url="{ item }">
                <img alt="Product" class="product-thumb" :src="resolveProductRecord(item)?.image_url">
              </template>

              <template #item.name="{ item }">
                <div class="table-name">
                  <strong>{{ resolveProductRecord(item)?.name }}</strong>
                  <span>{{ resolveProductRecord(item)?.product_id }}</span>
                </div>
              </template>

              <template #item.price="{ item }">
                <span>{{ formatCurrency(resolveProductRecord(item)?.price || 0) }}</span>
              </template>

              <template #item.category_display="{ item }">
                <span>{{ formatCategory(resolveProductRecord(item)) }}</span>
              </template>

              <template #item.stock="{ item }">
                <v-chip class="status-chip" :class="stockStatus(resolveProductRecord(item)).className" size="small"
                  variant="outlined">
                  {{ resolveProductRecord(item)?.stock || 0 }}
                </v-chip>
              </template>

              <template #item.actions="{ item }">
                <div class="table-actions">
                  <v-btn :disabled="!isAdmin" icon size="small" variant="text" @click="editProduct(item)">
                    <v-icon>mdi-pencil-outline</v-icon>
                    <v-tooltip activator="parent" location="top">Edit product</v-tooltip>
                  </v-btn>
                  <v-btn color="error" :disabled="!isAdmin" icon size="small" variant="text"
                    @click="deleteProduct(item)">
                    <v-icon>mdi-delete-outline</v-icon>
                    <v-tooltip activator="parent" location="top">Delete product</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </v-data-table>

            <div v-else class="mobile-list">
              <article v-for="product in filteredProducts" :key="product.product_id" class="mobile-product-card">
                <div class="mobile-item-top">
                  <img alt="Product" class="mobile-product-image" :src="product.image_url">
                  <div class="mobile-item-copy">
                    <h3>{{ product.name }}</h3>
                    <p v-if="product.company" class="mobile-company">{{ product.company }}</p>
                    <p>{{ formatCategory(product) }}</p>
                    <div class="mobile-meta">
                      <span class="mobile-price">{{ formatCurrency(product.price) }}</span>
                      <v-chip class="status-chip" :class="stockStatus(product).className" size="small"
                        variant="outlined">
                        Stock: {{ product.stock }}
                      </v-chip>
                    </div>
                  </div>
                </div>

                <div class="mobile-actions">
                  <v-btn class="mobile-action-btn" :disabled="!isAdmin" size="small" variant="text"
                    @click="editProduct(product)">
                    <v-icon size="18" start>mdi-pencil-outline</v-icon>
                    Edit
                  </v-btn>
                  <v-btn class="mobile-action-btn" color="error" :disabled="!isAdmin" size="small" variant="text"
                    @click="deleteProduct(product)">
                    <v-icon size="18" start>mdi-delete-outline</v-icon>
                    Delete
                  </v-btn>
                </div>
              </article>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'analytics'" class="analytics-panel">
          <div class="lower-grid">
            <section class="admin-section">
              <h2>Category Analytics</h2>
              <div class="category-bars">
                <div v-for="category in categoryStats" :key="category.name" class="category-bar">
                  <div>
                    <strong>{{ category.name }}</strong>
                    <span>{{ category.count }} products</span>
                  </div>
                  <div class="bar-track">
                    <span :style="{ width: `${category.percent}%` }" />
                  </div>
                </div>
              </div>
            </section>

            <section class="admin-section">
              <h2>Stock Watch</h2>
              <div class="summary-list">
                <div v-for="product in lowStockProducts" :key="product.product_id" class="summary-item">
                  <v-avatar class="summary-avatar stock" size="42">
                    <v-icon size="20">mdi-alert-outline</v-icon>
                  </v-avatar>
                  <div>
                    <h3>{{ product.name }}</h3>
                    <p>{{ product.company || "Mindstores" }}</p>
                  </div>
                  <strong>{{ product.stock }}</strong>
                </div>
                <div v-if="lowStockProducts.length === 0" class="empty-row">
                  No low-stock products right now.
                </div>
              </div>
            </section>
          </div>
        </section>

        <section v-else class="settings-panel">
          <section class="admin-section">
            <div class="section-heading">
              <div>
                <h2>Settings</h2>
                <p>Current admin session and data connection status.</p>
              </div>
              <v-btn class="admin-secondary-btn" :loading="loading" @click="fetchProducts">
                <v-icon start>mdi-refresh</v-icon>
                Refresh
              </v-btn>
            </div>

            <div class="settings-grid">
              <div class="settings-tile">
                <span>Admin access</span>
                <strong>{{ isAdmin ? "Enabled" : "Locked" }}</strong>
              </div>
              <div class="settings-tile">
                <span>Products loaded</span>
                <strong>{{ formatNumber(products.length) }}</strong>
              </div>
              <div class="settings-tile wide">
                <span>API base</span>
                <strong>{{ apiBaseLabel }}</strong>
              </div>
            </div>
          </section>
        </section>
      </v-container>
    </v-main>

    <v-dialog v-model="dialog" max-width="720">
      <v-card class="admin-dialog-card">
        <v-card-title class="dialog-title">
          {{ editMode ? "Edit Product" : "Add Product" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" class="dialog-form">
            <v-text-field v-model="formData.name" label="Product Name" required variant="outlined" />

            <v-textarea v-model="formData.description" label="Description" rows="3" variant="outlined" />

            <v-text-field v-model="formData.company" label="Company / Brand" placeholder="Example: Sony, Apple, Ikea"
              variant="outlined" />

            <div class="form-grid">
              <v-text-field v-model.number="formData.price" label="Price" prefix="$" required step="0" type="number"
                variant="outlined" />

              <v-text-field v-model.number="formData.stock" label="Stock" required type="number" variant="outlined" />
            </div>

            <div class="form-grid">
              <v-select v-model="formData.category" :items="categoryOptions" label="Category" required
                variant="outlined" />

              <v-select v-model="formData.subcategory" :disabled="availableSubcategories.length === 0" :hint="availableSubcategories.length === 0
                ? 'No subcategory required for this category'
                : ''
                " :items="availableSubcategories" label="Subcategory" persistent-hint
                :required="availableSubcategories.length > 0" variant="outlined" />
            </div>

            <v-text-field v-model="formData.image_url" label="Image URL" required variant="outlined" />
          </v-form>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn class="admin-primary-btn" :disabled="!isAdmin" :loading="saving" @click="saveProduct">
            {{ editMode ? "Update" : "Add" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top">
      {{ snackbarText }}
    </v-snackbar>
  </v-layout>
</template>

<script>
import axios from "axios";
import { computed, onMounted, ref, watch } from "vue";
import { useDisplay } from "vuetify";
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
  setup() {
    const appStore = useAppStore();
    const { smAndDown } = useDisplay();
    const adminColors = {
      green: '#356b5a',
      greenDark: '#2f604f',
      cream: '#fbf5df',
      creamLight: '#fff9e8',
      creamSoft: '#fff9e8',
      avatar: '#bb8053',
      border: 'rgba(51, 75, 65, 0.24)',
      text: '#111712',
      muted: '#6d6b5d',
    };
    const products = ref([]);
    const loading = ref(false);
    const dialog = ref(false);
    const editMode = ref(false);
    const saving = ref(false);
    const snackbar = ref(false);
    const snackbarText = ref("");
    const snackbarColor = ref("success");
    const productSearch = ref("");
    const activePanel = ref("dashboard");

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

    const navItems = [
      { id: "dashboard", label: "Dashboard", icon: "mdi-view-dashboard-outline" },
      { id: "products", label: "Products", icon: "mdi-chart-line" },
      { id: "analytics", label: "Analytics", icon: "mdi-finance" },
    ];

    const currentProductId = ref(null);
    const isAdmin = computed(() => Boolean(appStore.user?.is_admin));
    const isMobile = computed(() => smAndDown.value);
    const userName = computed(() => appStore.user?.name || appStore.user?.email || "Admin User");
    const userInitials = computed(() => {
      const source = userName.value || "Admin";
      return source
        .split(/\s|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.slice(0, 1).toUpperCase())
        .join("") || "A";
    });
    const apiBaseLabel = computed(() => API_URL);
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
    const formatCurrency = (value) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(Number(value || 0));
    const formatNumber = (value) =>
      new Intl.NumberFormat("en-US").format(Number(value || 0));
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
    const stockStatus = (product) => {
      const stock = Number(product?.stock || 0);
      if (stock <= 0) {
        return { label: "Out", className: "is-cancelled" };
      }
      if (stock < 5) {
        return { label: "Low", className: "is-pending" };
      }
      return { label: "Active", className: "is-completed" };
    };

    const matchesProductSearch = (product) => {
      const query = productSearch.value.trim().toLowerCase();
      if (!query) return true;
      return [
        product.name,
        product.company,
        product.category,
        product.subcategory,
        product.product_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    };
    const filteredProducts = computed(() => products.value.filter(matchesProductSearch));
    const recentProducts = computed(() =>
      [...filteredProducts.value]
        .sort((left, right) => new Date(right.updated_at || 0) - new Date(left.updated_at || 0))
        .slice(0, 5),
    );
    const totalInventoryUnits = computed(() =>
      products.value.reduce((total, product) => total + Number(product.stock || 0), 0),
    );
    const totalCatalogValue = computed(() =>
      products.value.reduce(
        (total, product) => total + Number(product.price || 0) * Number(product.stock || 0),
        0,
      ),
    );
    const averagePrice = computed(() => {
      if (products.value.length === 0) return 0;
      return products.value.reduce((total, product) => total + Number(product.price || 0), 0) / products.value.length;
    });
    const lowStockCount = computed(() =>
      products.value.filter((product) => Number(product.stock || 0) < 5).length,
    );
    const categoryStats = computed(() => {
      const stats = new Map();
      for (const product of products.value) {
        const category = normalizeCategoryName(product.category) || "Other";
        const existing = stats.get(category) || { name: category, count: 0, units: 0, value: 0, percent: 0 };
        existing.count += 1;
        existing.units += Number(product.stock || 0);
        existing.value += Number(product.price || 0) * Number(product.stock || 0);
        stats.set(category, existing);
      }

      const maxCount = Math.max(1, ...Array.from(stats.values()).map((item) => item.count));
      return Array.from(stats.values())
        .map((item) => ({
          ...item,
          percent: Math.max(8, Math.round((item.count / maxCount) * 100)),
        }))
        .sort((left, right) => right.count - left.count);
    });
    const topCategory = computed(() => categoryStats.value[0] || { name: "None", count: 0 });
    const lowStockProducts = computed(() =>
      products.value
        .filter((product) => Number(product.stock || 0) < 5)
        .sort((left, right) => Number(left.stock || 0) - Number(right.stock || 0))
        .slice(0, 5),
    );
    const metricCards = computed(() => [
      {
        label: "Total products",
        value: formatNumber(products.value.length),
        icon: "mdi-shape-outline",
        className: "metric-red",
      },
      {
        label: "Inventory units",
        value: formatNumber(totalInventoryUnits.value),
        icon: "mdi-account-group-outline",
        className: "metric-blue",
      },
      {
        label: "Catalog value",
        value: formatCurrency(totalCatalogValue.value),
        icon: "mdi-star-outline",
        className: "metric-green",
      },
      {
        label: "Average price",
        value: formatCurrency(averagePrice.value),
        icon: "mdi-cart-outline",
        className: "metric-orange",
      },
    ]);

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
        const response = await axios.get(`${API_URL}/products`);
        products.value = Array.isArray(response.data) ? response.data : response.data?.items || [];
      } catch (error) {
        console.error("Failed to fetch products:", error);
        snackbarText.value = "Failed to fetch products";
        snackbarColor.value = "error";
        snackbar.value = true;
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
            `${API_URL}/products/${encodeURIComponent(currentProductId.value)}`,
            payload,
            { withCredentials: true },
          );
          snackbarText.value = "Product updated successfully";
        } else {
          await axios.post(`${API_URL}/products`, payload, {
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
          `${API_URL}/products/${encodeURIComponent(selectedProduct.product_id)}`,
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
      productSearch,
      filteredProducts,
      recentProducts,
      metricCards,
      categoryStats,
      lowStockProducts,
      lowStockCount,
      totalCatalogValue,
      topCategory,
      navItems,
      activePanel,
      userName,
      userInitials,
      apiBaseLabel,
      adminColors,
      resolveProductRecord,
      formatCategory,
      formatCurrency,
      formatNumber,
      stockStatus,
      fetchProducts,
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
  background: #fbf5df;
  color: #111712;
}

.admin-main {
  padding: 20px;
  background: #fbf5df;
}

.admin-warning {
  margin-bottom: 16px;
}

.gap-2 {
  gap: 8px;
}

:deep(.v-app-bar__content) {
  padding: 0 16px !important;
}

:deep(.v-navigation-drawer) {
  border-right: 1px solid rgba(51, 75, 65, 0.24);
}

:deep(.v-list-item--active) {
  background: rgba(68, 101, 76, 0.25);
}

:deep(.v-list-item--active .v-list-item__overlay) {
  opacity: 0;
}

.dashboard-panel,
.products-panel,
.analytics-panel,
.settings-panel {
  display: grid;
  gap: 24px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.metric-card,
.admin-section {
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: rgba(255, 249, 232, 0.82);
}

.metric-card {
  min-height: 98px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.metric-card p {
  max-width: 120px;
  margin: 0 0 6px;
  color: #171914;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-card h2 {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.2;
  font-weight: 500;
}

.metric-blue {
  color: #399bec;
}

.metric-green {
  color: #58af62;
}

.metric-orange {
  color: #ff9814;
}

.metric-red {
  color: #ff5a52;
}

.admin-section {
  padding: 20px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-heading h2,
.admin-section>h2 {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1.2;
  font-weight: 500;
}

.section-heading p {
  margin: 6px 0 0;
  color: var(--admin-muted);
}

.admin-primary-btn {
  background: var(--admin-green) !important;
  color: #ffffff !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}

.admin-secondary-btn {
  color: var(--admin-green) !important;
  border: 1px solid var(--admin-border);
  border-radius: 4px !important;
}

.admin-search {
  margin-bottom: 14px;
}

.admin-search :deep(.v-field) {
  background: transparent;
  border-radius: 999px;
}

.recent-table {
  overflow-x: auto;
}

.recent-head,
.recent-row {
  min-width: 760px;
  display: grid;
  grid-template-columns: minmax(260px, 2fr) 140px 130px 130px 80px;
  gap: 10px;
  align-items: center;
  padding: 10px 20px;
}

.recent-head {
  font-weight: 700;
  border-bottom: 1px solid var(--admin-border);
}

.recent-row {
  min-height: 55px;
  border-bottom: 1px solid rgba(51, 75, 65, 0.18);
  font-size: 1.02rem;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.product-cell img,
.product-thumb {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid rgba(51, 75, 65, 0.18);
  background: #ffffff;
}

.product-cell span,
.table-name strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  min-width: 86px;
  justify-content: center;
  font-weight: 700;
}

.status-chip.is-completed {
  color: #45ad9a;
  border-color: #5bc8ad;
  background: rgba(91, 200, 173, 0.14);
}

.status-chip.is-pending {
  color: #e6a431;
  border-color: #ffbe58;
  background: rgba(255, 190, 88, 0.14);
}

.status-chip.is-cancelled {
  color: #d46c42;
  border-color: #f19c7e;
  background: rgba(241, 156, 126, 0.14);
}

.lower-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.summary-list {
  margin-top: 20px;
  display: grid;
  gap: 14px;
}

.summary-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.summary-avatar {
  background: #c9deca;
  color: var(--admin-green);
  font-weight: 700;
}

.summary-avatar.revenue {
  background: #bcd5c7;
}

.summary-avatar.stock {
  background: #f8d59f;
  color: #9d5e00;
}

.summary-avatar.category {
  background: #d7d2b2;
  color: #56512f;
}

.summary-item h3 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 500;
}

.summary-item p {
  margin: 4px 0 0;
  color: var(--admin-muted);
  font-size: 0.9rem;
}

.summary-item strong {
  font-size: 1.05rem;
  font-weight: 500;
  white-space: nowrap;
}

.admin-data-table {
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  overflow: hidden;
  background: transparent !important;
}

.admin-data-table :deep(.v-table__wrapper),
.admin-data-table :deep(table),
.admin-data-table :deep(tbody),
.admin-data-table :deep(thead) {
  background: transparent !important;
}

.table-name {
  display: grid;
  gap: 3px;
}

.table-name span {
  color: var(--admin-muted);
  font-size: 0.82rem;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mobile-list {
  display: grid;
  gap: 12px;
}

.mobile-product-card {
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  padding: 14px;
  background: rgba(255, 249, 232, 0.9);
}

.mobile-item-top {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.mobile-product-image {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--admin-border);
}

.mobile-item-copy {
  min-width: 0;
}

.mobile-item-copy h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
}

.mobile-item-copy p {
  margin: 4px 0 0;
  color: var(--admin-muted);
}

.mobile-company {
  color: var(--admin-green) !important;
  font-weight: 700;
}

.mobile-meta,
.mobile-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mobile-meta {
  margin-top: 10px;
}

.mobile-price {
  color: #1b1d16;
  font-weight: 700;
}

.mobile-actions {
  justify-content: flex-end;
  margin-top: 10px;
}

.mobile-action-btn {
  font-weight: 700;
}

.category-bars {
  margin-top: 22px;
  display: grid;
  gap: 18px;
}

.category-bar {
  display: grid;
  gap: 8px;
}

.category-bar>div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.category-bar span {
  color: var(--admin-muted);
}

.bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(48, 93, 77, 0.14);
  overflow: hidden;
}

.bar-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--admin-green);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.settings-tile {
  min-height: 96px;
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.28);
}

.settings-tile.wide {
  grid-column: 1 / -1;
}

.settings-tile span {
  color: var(--admin-muted);
}

.settings-tile strong {
  word-break: break-word;
}

.empty-row {
  padding: 18px;
  color: var(--admin-muted);
}

.admin-dialog-card {
  border-radius: 8px;
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.dialog-form {
  display: grid;
  gap: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dialog-actions {
  padding: 8px 22px 22px;
}

@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .lower-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .admin-main {
    padding: 12px;
  }

  .admin-warning {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }

  .metric-grid,
  .settings-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    display: grid;
  }

  .admin-primary-btn,
  .admin-secondary-btn {
    width: 100%;
  }

  .mobile-item-top {
    display: grid;
  }

  .mobile-product-image {
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 3;
  }
}
</style>
