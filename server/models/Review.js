import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true },
    text:   { type: String, required: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
  },
  { timestamps: true }
);

export default mongoose.model('Review', ReviewSchema);
