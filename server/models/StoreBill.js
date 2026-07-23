import mongoose from 'mongoose';

/** Physical shop (walk-in) sales bills */
const StoreBillSchema = new mongoose.Schema(
  {
    billId: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },
    productId: { type: String, default: '', trim: true },
    itemName: { type: String, required: true, trim: true },
    sizeId: { type: String, default: '', trim: true },
    sizeLabel: { type: String, default: '', trim: true },
    weightId: { type: String, default: '', trim: true },
    weightLabel: { type: String, default: '', trim: true },
    qty: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card'],
      default: 'cash',
    },
    soldAt: { type: Date, default: Date.now },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

StoreBillSchema.index({ soldAt: -1 });
StoreBillSchema.index({ paymentMethod: 1 });

export default mongoose.model('StoreBill', StoreBillSchema);
