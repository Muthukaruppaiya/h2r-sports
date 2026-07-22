/**
 * sync-collections.js — Soft Tennis + Hard Tennis editions (Killer featured).
 * Run: npm run sync-collections
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Collection from './models/Collection.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';

const COLLECTIONS = [
  {
    id: 'killer-edition',
    name: 'Killer Edition',
    slug: 'killer-edition',
    family: 'hard-tennis',
    familyLabel: 'Hard Tennis',
    variant: 'Killer',
    blurb: 'Fast-selling hard tennis power bat — aggressive profile for big hitting.',
    badge: 'Fast selling',
    featured: true,
    sortOrder: 1,
  },
  {
    id: 'karrupu-edition',
    name: 'Karrupu Edition',
    slug: 'karrupu-edition',
    family: 'hard-tennis',
    familyLabel: 'Hard Tennis',
    variant: 'Karrupu',
    blurb: 'Premium black hard tennis edition — powerful pickup and sharp finish.',
    badge: '',
    featured: false,
    sortOrder: 2,
  },
  {
    id: 'beast-edition',
    name: 'Beast Edition',
    slug: 'beast-edition',
    family: 'hard-tennis',
    familyLabel: 'Hard Tennis',
    variant: 'Beast',
    blurb: 'Heavy-hitting hard tennis beast — built for punch and presence.',
    badge: '',
    featured: false,
    sortOrder: 3,
  },
  {
    id: 'stumper-edition',
    name: 'Stumper Edition',
    slug: 'stumper-edition',
    family: 'hard-tennis',
    familyLabel: 'Hard Tennis',
    variant: 'Stumper',
    blurb: 'Balanced hard tennis control — timing, middle, and all-round play.',
    badge: '',
    featured: false,
    sortOrder: 4,
  },
  {
    id: 'soft-tennis-kerala-scoop',
    name: 'Kerala Scoop',
    slug: 'soft-tennis-kerala-scoop',
    family: 'soft-tennis',
    familyLabel: 'Soft Tennis',
    variant: 'Kerala Scoop',
    blurb: 'Soft tennis Kerala scoop — light hands, wide sweet spot, clean strokes.',
    badge: '',
    featured: false,
    sortOrder: 5,
  },
];

async function sync() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected…');

  await Collection.deleteMany({});
  await Collection.insertMany(COLLECTIONS);

  console.log(`✓ Synced ${COLLECTIONS.length} collections:`);
  COLLECTIONS.forEach((c) =>
    console.log(`  - [${c.familyLabel}] ${c.variant} (${c.slug})${c.featured ? ' ★' : ''}`)
  );

  await mongoose.disconnect();
  console.log('Done.');
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
