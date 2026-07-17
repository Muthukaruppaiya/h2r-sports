/**
 * clear-catalog.js — Remove seeded products, reviews, and collections from MongoDB.
 * Run with: npm run clear-catalog
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import Review from './models/Review.js';
import Collection from './models/Collection.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';

async function clearCatalog() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected…');

  const products = await Product.deleteMany({});
  const reviews = await Review.deleteMany({});
  const collections = await Collection.deleteMany({});

  console.log(`✓ Removed ${products.deletedCount} products`);
  console.log(`✓ Removed ${reviews.deletedCount} reviews`);
  console.log(`✓ Removed ${collections.deletedCount} collections`);

  await mongoose.disconnect();
  console.log('Done. Catalog cleared — store will only show data you add via Admin.');
}

clearCatalog().catch((err) => {
  console.error('Clear error:', err);
  process.exit(1);
});
