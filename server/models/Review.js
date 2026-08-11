import mongoose from 'mongoose';

/**
 * Storefront testimonials — managed in Admin → Reviews.
 * Public home page shows only status: "approved".
 */
const ReviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    location: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    media: {
      type: [
        {
          _id: false,
          url: { type: String, required: true, trim: true },
          type: { type: String, enum: ['image', 'video'], default: 'image' },
        },
      ],
      default: [],
    },
    productId: { type: String, default: '', trim: true },
    productName: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'hidden'],
      default: 'approved',
      index: true,
    },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['admin', 'seed', 'customer'],
      default: 'admin',
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ status: 1, featured: -1, sortOrder: 1, createdAt: -1 });

export default mongoose.model('Review', ReviewSchema);
