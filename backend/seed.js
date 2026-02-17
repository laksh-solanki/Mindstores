// backend/seed.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const products = [
  {
    product_id: "prod_1",
    name: "Minimalist Leather Watch",
    description: "Elegant timepiece with genuine leather strap.",
    price: 129.99,
    category: "Accessories",
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80",
    created_at: new Date()
  },
  {
    product_id: "prod_2",
    name: "Ceramic Coffee Set",
    description: "Handcrafted ceramic mug and saucer set.",
    price: 45.00,
    category: "Home",
    stock: 20,
    image_url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80",
    created_at: new Date()
  },
  {
    product_id: "prod_3",
    name: "Wireless Noise-Canceling Headphones",
    description: "Premium sound quality with 30-hour battery life.",
    price: 249.99,
    category: "Electronics",
    stock: 8,
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    created_at: new Date()
  },
  {
    product_id: "prod_4",
    name: "Organic Cotton T-Shirt",
    description: "Soft, breathable, and sustainably made.",
    price: 29.50,
    category: "Clothing",
    stock: 50,
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
    created_at: new Date()
  },
  {
    product_id: "prod_5",
    name: "Smart Home Speaker",
    description: "Voice-controlled assistant with high-fidelity audio.",
    price: 99.00,
    category: "Electronics",
    stock: 12,
    image_url: "https://images.unsplash.com/photo-1589492477829-5e65395b66cc?auto=format&fit=crop&w=600&q=80",
    created_at: new Date()
  }
];

async function seed() {
  const client = new MongoClient(process.env.MONGO_URL);
  try {
    await client.connect();
    console.log("Connected to MongoDB...");
    
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection('products');

    // Clear existing products (optional)
    await collection.deleteMany({});
    console.log("Cleared existing products.");

    // Insert new products
    await collection.insertMany(products);
    console.log(`Successfully added ${products.length} products!`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

seed();