const normalizeSlug = (value) => (value == null ? '' : String(value).trim().toLowerCase())

export const CATALOG_MENU = [
  {
    key: 'electronics',
    aliases: ['electronices', 'electronic'],
    label: 'Electronics',
    apiCategory: 'Electronics',
    items: [
      {
        key: 'mobiles',
        aliases: ['mobile'],
        name: 'Mobiles',
        apiSubcategory: 'Mobiles',
        short: '5G phones and flagship picks',
        description: 'Smartphones designed for productivity, clear photography, and long battery life.',
        icon: 'mdi-cellphone',
        highlight: 'Popular now: all-day battery models'
      },
      {
        key: 'cameras',
        aliases: ['camera', 'cemera', 'cemeras'],
        name: 'Cameras',
        apiSubcategory: 'Cameras',
        short: 'Mirrorless and creator-ready kits',
        description: 'Capture travel, studio, and daily moments with sharp optics and lightweight builds.',
        icon: 'mdi-camera-outline',
        highlight: 'Top choice: compact mirrorless setups'
      },
      {
        key: 'headphones',
        aliases: ['headphone'],
        name: 'Headphones',
        apiSubcategory: 'Headphones',
        short: 'Noise-cancelling audio gear',
        description: 'Immersive listening with balanced sound, comfort fit, and strong call quality.',
        icon: 'mdi-headphones',
        highlight: 'Best seller: wireless ANC pairs'
      }
    ]
  },
  {
    key: 'furniture',
    aliases: ['furnitures'],
    label: 'Furniture',
    apiCategory: 'Furniture',
    items: [
      {
        key: 'sofas',
        aliases: ['sofa'],
        name: 'Sofas',
        apiSubcategory: 'Sofas',
        short: 'Modern lounge and sectional options',
        description: 'Comfort-focused sofas with durable upholstery and clean silhouettes.',
        icon: 'mdi-sofa-outline',
        highlight: 'Trend: modular seating designs'
      },
      {
        key: 'tables',
        aliases: ['table'],
        name: 'Tables',
        apiSubcategory: 'Tables',
        short: 'Coffee, dining, and work tables',
        description: 'Functional table pieces in wood, metal, and mixed-material finishes.',
        icon: 'mdi-table-furniture',
        highlight: 'Editor pick: compact dining tables'
      },
      {
        key: 'chairs',
        aliases: ['chair'],
        name: 'Chairs',
        apiSubcategory: 'Chairs',
        short: 'Accent, dining, and task chairs',
        description: 'Supportive seating crafted for homes, study corners, and office setups.',
        icon: 'mdi-chair-rolling',
        highlight: 'Top-rated: ergonomic chair series'
      }
    ]
  },
  {
    key: 'clothes',
    aliases: ['clothese', 'clothing', 'clothe'],
    label: 'Clothes',
    apiCategory: 'Clothing',
    items: [
      {
        key: 'shirts',
        aliases: ['shirt'],
        name: 'Shirts',
        apiSubcategory: 'Shirts',
        short: 'Casual, formal, and everyday wear',
        description: 'Breathable fabrics with tailored fits for versatile day-to-night styling.',
        icon: 'mdi-tshirt-crew-outline',
        highlight: 'Customer favorite: wrinkle-resistant shirts'
      },
      {
        key: 'jeans',
        aliases: ['jean'],
        name: 'Jeans',
        apiSubcategory: 'Jeans',
        short: 'Slim, straight, and relaxed styles',
        description: 'Comfort stretch denim in timeless washes built for daily use.',
        icon: 'mdi-human-male-board',
        highlight: 'Most ordered: mid-rise tapered jeans'
      },
      {
        key: 'jackets',
        aliases: ['jacket'],
        name: 'Jackets',
        apiSubcategory: 'Jackets',
        short: 'Layering staples for every season',
        description: 'Lightweight to insulated outerwear with practical pockets and clean finishes.',
        icon: 'mdi-hanger',
        highlight: 'Recommended: utility bomber jackets'
      }
    ]
  }
]

export function resolveCatalogCategory(categorySlug) {
  const normalizedCategorySlug = normalizeSlug(categorySlug)
  if (!normalizedCategorySlug) return null

  return (
    CATALOG_MENU.find(
      (category) =>
        category.key === normalizedCategorySlug ||
        (Array.isArray(category.aliases) && category.aliases.includes(normalizedCategorySlug)),
    ) || null
  )
}

export function resolveCatalogItem(categoryConfig, itemSlug) {
  if (!categoryConfig) return null
  const normalizedItemSlug = normalizeSlug(itemSlug)
  if (!normalizedItemSlug) return null

  return (
    categoryConfig.items.find(
      (item) => item.key === normalizedItemSlug || (Array.isArray(item.aliases) && item.aliases.includes(normalizedItemSlug)),
    ) || null
  )
}

export function resolveCatalogRoute(categorySlug, itemSlug) {
  const category = resolveCatalogCategory(categorySlug)
  if (!category) return null
  const item = resolveCatalogItem(category, itemSlug)
  if (!item) return null
  return {
    category,
    item,
    canonicalPath: `/${category.key}/${item.key}`,
  }
}

