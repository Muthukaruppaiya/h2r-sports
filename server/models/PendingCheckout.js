import mongoose from 'mongoose';

/**
 * Temporary checkout draft — NOT a real shop order.
 * A fulfillment Order is created only after Razorpay payment is verified.
 */
const PendingCheckoutSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    shipping: {
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    items: { type: Array, required: true },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PendingCheckout', PendingCheckoutSchema);
