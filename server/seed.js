/**
 * seed.js — Populates MongoDB with the H2R Sports catalogue on first run.
 * Run with: node seed.js  (or npm run seed)
 * Safe to run multiple times — skips if data already exists.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Collection from './models/Collection.js';
import Product from './models/Product.js';
import Review from './models/Review.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';

const COLLECTIONS = [
  {
    id: 'karrupu-edition',
    name: 'H2R Karrupu Edition',
    slug: 'karrupu-edition',
    blurb: 'Premium black edition bats — powerful pickup, sharp finish, built for hard-hitting cricket.',
  },
  {
    id: 'killer-edition',
    name: 'Killer Edition',
    slug: 'killer-edition',
    blurb: 'Aggressive profile bats engineered for big hitting and match-day dominance.',
  },
  {
    id: 'stumper-edition',
    name: 'Stumper Edition',
    slug: 'stumper-edition',
    blurb: 'Balanced bats for control, timing, and clean middle — trusted all-round performance.',
  },
  {
    id: 'soft-tennis-kerala-scoop',
    name: 'Soft Tennis Bat [ Kerala Scoop ]',
    slug: 'soft-tennis-kerala-scoop',
    blurb: 'Kerala scoop soft tennis bats — light hands, wide sweet spot, precision stroke play.',
  },
];

const PRODUCTS = [
  {
    id: 'thala-hard',
    name: 'Thala Edition Hard Tennis Bat',
    tagline: 'Most loved hard tennis',
    price: 2799, compareAt: 3499,
    collection: 'hard-tennis', category: 'Hard Tennis', badge: 'Sale',
    weight: '850–950 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: true, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2799 },
      { id: 'lh', label: 'Long Handle (LH)', price: 2899 },
    ],
    description: 'Hard tennis power bat with aggressive profile — bestseller balance for gully and club tennis-ball cricket.',
    features: ['All India free shipping', 'COD available', '6 months bat warranty', 'Free cover on prepaid*'],
    images: ['/batimages/bat1.webp', '/batimages/bat2.webp', '/batimages/bat3.jpg', '/batimages/bat4.jpg']
  },
  {
    id: 'rhino-advance',
    name: 'Rhino Advance Hard Tennis Bat',
    tagline: 'Bottom punch specialist',
    price: 3499, compareAt: 5500,
    collection: 'hard-tennis', category: 'Hard Tennis', badge: 'Sale',
    weight: '880–980 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: true, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 3499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3599 },
    ],
    description: 'Advance scoop profile with serious sweet-spot punch — a customer favourite for hard tennis ball.',
    features: ['All India free shipping', 'COD available', '6 months bat warranty', 'Pre-oiled & pressed'],
    images: ['/batimages/bat2.webp']
  },
  {
    id: 'viper-hard',
    name: 'Viper Edition Hard Tennis Bat',
    tagline: 'Premium hard tennis',
    price: 5999, compareAt: 7000,
    collection: 'hard-tennis', category: 'Hard Tennis', badge: 'Sale',
    weight: '900–1000 g', willow: 'Top Grade Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: true, mostLoved: false, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 5999 },
      { id: 'lh', label: 'Long Handle (LH)', price: 6199 },
    ],
    description: 'Premium hard tennis edition with elite finish and pick-up for power hitters.',
    features: ['Free engraving on prepaid*', '6 months warranty', 'COD available', 'Pan-India delivery'],
    images: ['/batimages/bat3.jpg']
  },
  {
    id: 'wolverine-hard',
    name: 'Wolverine Hard Tennis Bat',
    tagline: 'Value hard tennis',
    price: 2299, compareAt: 2500,
    collection: 'hard-tennis', category: 'Hard Tennis', badge: 'Sale',
    weight: '850–940 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2299 },
      { id: 'lh', label: 'Long Handle (LH)', price: 2399 },
    ],
    description: 'Sharp pickup hard tennis bat — everyday net and match companion.',
    features: ['COD available', 'All India shipping', '6 months warranty'],
    images: ['/batimages/bat4.jpg']
  },
  {
    id: 'wolverine-gold',
    name: 'Wolverine Hard Tennis Bat Gold Edition',
    tagline: 'Gold finish edition',
    price: 2799, compareAt: 3299,
    collection: 'hard-tennis', category: 'Hard Tennis', badge: 'Sale',
    weight: '860–950 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2799 },
      { id: 'lh', label: 'Long Handle (LH)', price: 2899 },
    ],
    description: 'Gold edition styling with Wolverine balance and punch.',
    features: ['COD available', 'Free cover on prepaid*', '6 months warranty'],
    images: ['/batimages/bat5.jpg']
  },
  {
    id: 'ghost-hard',
    name: 'Ghost Edition Hard Tennis Bat',
    tagline: 'Scary for bowlers',
    price: 4499, compareAt: 5499,
    collection: 'hard-tennis', category: 'Hard Tennis', badge: 'Sale',
    weight: '870–970 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: false, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 4499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 4599 },
    ],
    description: 'Aggressive hard tennis profile built for big hitting.',
    features: ['6 months warranty', 'COD available', 'Pan-India delivery'],
    images: ['/batimages/bat6.webp']
  },
  {
    id: 'ghost-soft',
    name: 'Ghost Edition Soft Tennis Bat',
    tagline: 'Soft tennis control',
    price: 3299, compareAt: 3999,
    collection: 'soft-tennis', category: 'Soft Tennis', badge: 'Sale',
    weight: '820–920 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 3299 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3399 },
    ],
    description: 'Soft tennis edition tuned for timing and soft-ball bounce.',
    features: ['COD available', '6 months warranty', 'All India shipping'],
    images: ['/batimages/bat7.jpg']
  },
  {
    id: 'thala-rhino-soft',
    name: 'Thala & Rhino Soft Tennis Bat',
    tagline: 'Dual-edition soft tennis',
    price: 2999, compareAt: 3799,
    collection: 'soft-tennis', category: 'Soft Tennis', badge: 'Sale',
    weight: '830–930 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2999 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3099 },
    ],
    description: 'Precision soft tennis bat — light hands, clean middle.',
    features: ['Free gloves offer*', 'COD available', '6 months warranty'],
    images: ['/batimages/bat8.jpg']
  },
  {
    id: 'players-english',
    name: "Player's Edition English Willow Bat",
    tagline: 'Season English willow',
    price: 4499, compareAt: 5500,
    collection: 'season', category: 'Season', badge: 'Sale',
    weight: '1140–1200 g', willow: 'English Willow', madeIn: 'Tamil Nadu, India',
    topSelling: true, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 4499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 4699 },
      { id: 'full', label: 'Full Size (Adult)', price: 4499 },
    ],
    description: 'Match-ready English willow season bat — pressed, oiled, and sized for Indian leather-ball cricket.',
    features: ['All India free shipping', '6 months warranty', 'COD available', 'GST included'],
    images: ['/batimages/bat9.jpg']
  },
  {
    id: 'beast-english',
    name: 'English Willow Bat — Beast Edition',
    tagline: 'Elite season bat',
    price: 9500, compareAt: 14999,
    collection: 'season', category: 'Season', badge: 'Sale',
    weight: '1160–1220 g', willow: 'Grade English Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 9500 },
      { id: 'lh', label: 'Long Handle (LH)', price: 9800 },
    ],
    description: 'Beast profile English willow for serious season cricket.',
    features: ['Free engraving on prepaid*', '6 months warranty', 'Pan-India delivery'],
    images: ['/batimages/bat10.jpg']
  },
  {
    id: 'kashmir-players',
    name: "Kashmir Willow Player's Edition",
    tagline: 'Season Kashmir willow',
    price: 3499, compareAt: 4000,
    collection: 'season', category: 'Season', badge: 'Sale',
    weight: '1100–1180 g', willow: 'Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 3499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3599 },
      { id: 'size-6', label: 'Size 6', price: 3299 },
    ],
    description: 'Top-grade Kashmir willow player edition for leather-ball season cricket.',
    features: ['COD available', '6 months warranty', 'GST included'],
    images: ['/batimages/bat1.webp']
  },
  {
    id: 'kids-season',
    name: 'Kids Season Bat (Top Grade Kashmir Willow)',
    tagline: 'Junior season bat',
    price: 2499, compareAt: 3200,
    collection: 'season', category: 'Season', badge: 'Sale',
    weight: '900–1050 g', willow: 'Top Grade Kashmir Willow', madeIn: 'Tamil Nadu, India',
    topSelling: false, mostLoved: true, inStock: true,
    sizes: [
      { id: 'size-4', label: 'Size 4', price: 2299 },
      { id: 'size-5', label: 'Size 5', price: 2399 },
      { id: 'size-6', label: 'Size 6', price: 2499 },
      { id: 'harrow', label: 'Harrow', price: 2699 },
    ],
    description: 'Junior season bat sized for school and academy leather-ball cricket.',
    features: ['COD available', 'School kit ready', '6 months warranty'],
    images: ['/batimages/bat2.webp']
  },
];

const REVIEWS = [
  { name: 'Balvant Jogi',       text: 'Bat is so good and perfect balancing. Thank you!', rating: 5 },
  { name: 'Jayesh Nawab',       text: 'Best quality and perfect delivery time. Thank you so much bhai.', rating: 5 },
  { name: 'Meetrajsinh Jadeja', text: 'Superb bat quality & super service by H2R Sports. Thank you!', rating: 5 },
  { name: 'Akshit Shetty',      text: 'Amazing bats… balance and weight distribution are excellent.', rating: 5 },
  { name: 'Ashutosh Jha',       text: 'Ordered from Delhi NCR. Huge difference vs local market bats.', rating: 5 },
  { name: 'Sandeep Sandy',      text: 'Great punch and good finishing — value for money.', rating: 5 },
  { name: 'Priyanshu Barik',    text: 'Craftsmanship stands out — perfect balance and premium finish.', rating: 5 },
  { name: 'Anu',                text: 'Excellent customer service and a very trustable brand.', rating: 5 },
  { name: 'Ganesh Borkar',      text: 'Smashed 5 sixes with it today. Absolutely loved it!', rating: 5 },
  { name: 'Vasu Naik',          text: 'Super quality bat and packaging. Will order again.', rating: 5 },
  { name: 'Syed Khaled',        text: 'Awesome bat, super quality and service. Love H2R Sports.', rating: 5 },
  { name: 'Karan More',         text: 'Rhino style punch is excellent. Highly recommended.', rating: 5 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected for seeding…');

  // Collections — replace with current H2R edition types
  await Collection.deleteMany({});
  await Collection.insertMany(COLLECTIONS);
  console.log(`✓ Synced ${COLLECTIONS.length} collections`);

  // Products — only seed when empty (use npm run clear-catalog to wipe)
  const prodCount = await Product.countDocuments();
  if (prodCount === 0) {
    await Product.insertMany(PRODUCTS);
    console.log(`✓ Seeded ${PRODUCTS.length} products`);
  } else {
    console.log(`  Products already exist (${prodCount} found) — skipping`);
  }

  // Reviews
  const revCount = await Review.countDocuments();
  if (revCount === 0) {
    await Review.insertMany(REVIEWS);
    console.log(`✓ Seeded ${REVIEWS.length} reviews`);
  } else {
    console.log(`  Reviews already seeded (${revCount} found) — skipping`);
  }

  await mongoose.disconnect();
  console.log('Done. MongoDB disconnected.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
