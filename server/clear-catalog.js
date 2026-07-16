/**
 * clear-catalog.js — Remove seeded products and reviews from MongoDB.
 * Run with: npm run clear-catalog
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import Review from './models/Review.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';

async function clearCatalog() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected…');

  const products = await Product.deleteMany({});
  const reviews = await Review.deleteMany({});

  console.log(`✓ Removed ${products.deletedCount} products`);
  console.log(`✓ Removed ${reviews.deletedCount} reviews`);

  await mongoose.disconnect();
  console.log('Done. Catalog cleared.');
}

clearCatalog().catch((err) => {
  console.error('Clear error:', err);
  process.exit(1);
});
