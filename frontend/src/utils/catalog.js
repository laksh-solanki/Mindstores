const CATEGORY_ICONS = {
  clothing: 'mdi-tshirt-crew',
  clothes: 'mdi-tshirt-crew',
  electronics: 'mdi-laptop',
  furniture: 'mdi-sofa',
}

export function normalizeCatalogLabel(value) {
  return String(value || '').trim()
}

export function slugifyCatalogValue(value) {
  return normalizeCatalogLabel(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getCategoryIcon(categoryLabel) {
  return CATEGORY_ICONS[slugifyCatalogValue(categoryLabel)] || 'mdi-shape-outline'
}

export function buildCatalogEntries(products = []) {
  const categoriesBySlug = new Map()

  for (const product of products) {
    const categoryLabel = normalizeCatalogLabel(product?.category)
    const subcategoryLabel = normalizeCatalogLabel(product?.subcategory)

    if (!categoryLabel || !subcategoryLabel) {
      continue
    }

    const categoryKey = slugifyCatalogValue(categoryLabel)
    const itemKey = slugifyCatalogValue(subcategoryLabel)

    if (!categoryKey || !itemKey) {
      continue
    }

    if (!categoriesBySlug.has(categoryKey)) {
      categoriesBySlug.set(categoryKey, {
        key: categoryKey,
        label: categoryLabel,
        apiCategory: categoryLabel,
        icon: getCategoryIcon(categoryLabel),
        itemsBySlug: new Map(),
      })
    }

    const category = categoriesBySlug.get(categoryKey)
    if (!category.itemsBySlug.has(itemKey)) {
      category.itemsBySlug.set(itemKey, {
        key: itemKey,
        name: subcategoryLabel,
        apiSubcategory: subcategoryLabel,
      })
    }
  }

  return Array.from(categoriesBySlug.values())
    .map((category) => ({
      ...category,
      items: Array.from(category.itemsBySlug.values()).toSorted((a, b) =>
        a.name.localeCompare(b.name),
      ),
      itemsBySlug: undefined,
    }))
    .toSorted((a, b) => a.label.localeCompare(b.label))
}

export function resolveCatalogEntryFromProducts(products, categorySlug, subcategorySlug) {
  const normalizedCategorySlug = slugifyCatalogValue(categorySlug)
  const normalizedSubcategorySlug = slugifyCatalogValue(subcategorySlug)

  if (!normalizedCategorySlug || !normalizedSubcategorySlug) {
    return null
  }

  const category = buildCatalogEntries(products).find(
    (entry) => entry.key === normalizedCategorySlug,
  )
  const item = category?.items.find((entry) => entry.key === normalizedSubcategorySlug)

  if (!category || !item) {
    return null
  }

  return {
    category,
    item,
    canonicalPath: `/${category.key}/${item.key}`,
  }
}
