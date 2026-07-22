import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    blurb: { type: String, default: '' },
    family: { type: String, default: 'hard-tennis' }, // soft-tennis | hard-tennis
    familyLabel: { type: String, default: 'Hard Tennis' },
    variant: { type: String, default: '' },
    badge: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export default mongoose.model('Collection', CollectionSchema);
