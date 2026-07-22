/**
 * sync-reviews.js — Ensure customer reviews exist for the home marquee.
 * Run: node sync-reviews.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Review from './models/Review.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';

const REVIEWS = [
  { name: 'Balvant Jogi', text: 'Bat is so good and perfect balancing. Thank you!', rating: 5 },
  { name: 'Jayesh Nawab', text: 'Best quality and perfect delivery time. Thank you so much bhai.', rating: 5 },
  { name: 'Meetrajsinh Jadeja', text: 'Superb bat quality & super service by H2R Sports. Thank you!', rating: 5 },
  { name: 'Akshit Shetty', text: 'Amazing bats… balance and weight distribution are excellent.', rating: 5 },
  { name: 'Ashutosh Jha', text: 'Ordered from Delhi NCR. Huge difference vs local market bats.', rating: 5 },
  { name: 'Sandeep Sandy', text: 'Great punch and good finishing — value for money.', rating: 5 },
  { name: 'Priyanshu Barik', text: 'Craftsmanship stands out — perfect balance and premium finish.', rating: 5 },
  { name: 'Anu', text: 'Excellent customer service and a very trustable brand.', rating: 5 },
  { name: 'Ganesh Borkar', text: 'Smashed 5 sixes with it today. Absolutely loved it!', rating: 5 },
  { name: 'Vasu Naik', text: 'Super quality bat and packaging. Will order again.', rating: 5 },
  { name: 'Syed Khaled', text: 'Awesome bat, super quality and service. Love H2R Sports.', rating: 5 },
  { name: 'Karan More', text: 'Rhino style punch is excellent. Highly recommended.', rating: 5 },
];

async function sync() {
  await mongoose.connect(MONGO_URI);
  const before = await Review.countDocuments();
  if (before === 0) {
    await Review.insertMany(REVIEWS);
    console.log(`✓ Seeded ${REVIEWS.length} reviews`);
  } else {
    console.log(`✓ Reviews already present (${before}) — no change`);
  }
  await mongoose.disconnect();
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
