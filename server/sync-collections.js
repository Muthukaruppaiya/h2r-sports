/**
 * sync-collections.js — Replace store categories with H2R edition types.
 * Run: npm run sync-collections
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Collection from './models/Collection.js';

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

async function sync() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected…');

  await Collection.deleteMany({});
  await Collection.insertMany(COLLECTIONS);

  console.log(`✓ Synced ${COLLECTIONS.length} collections:`);
  COLLECTIONS.forEach((c) => console.log(`  - ${c.name} (${c.slug})`));

  await mongoose.disconnect();
  console.log('Done.');
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
