import mongoose from 'mongoose';

const SizeSchema = new mongoose.Schema(
  {
    id:    { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const WeightSchema = new mongoose.Schema(
  {
    id:    { type: String, required: true },
    from:  { type: String, required: true },
    to:    { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    id:          { type: String, required: true, unique: true },
    name:        { type: String, required: true },
    tagline:     { type: String, default: '' },
    price:       { type: Number, required: true },
    compareAt:   { type: Number, default: null },
    collection:  { type: String, required: true },
    category:    { type: String, required: true },
    badge:       { type: String, default: '' },
    weight:      { type: String, default: '' },
    willow:      { type: String, default: '' },
    madeIn:      { type: String, default: 'Tamil Nadu, India' },
    topSelling:  { type: Boolean, default: false },
    mostLoved:   { type: Boolean, default: false },
    inStock:     { type: Boolean, default: true },
    sizes:       { type: [SizeSchema], default: [] },
    weights:     { type: [WeightSchema], default: [] },
    features:    { type: [String], default: [] },
    images:      { type: [String], default: [] },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Product', ProductSchema);
