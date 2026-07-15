import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema(
  {
    id:    { type: String, required: true, unique: true },
    name:  { type: String, required: true },
    slug:  { type: String, required: true, unique: true },
    blurb: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Collection', CollectionSchema);
