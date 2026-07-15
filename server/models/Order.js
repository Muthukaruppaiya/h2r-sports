import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    name:      { type: String, required: true },
    sizeId:    { type: String, required: true },
    sizeLabel: { type: String, required: true },
    price:     { type: Number, required: true },
    qty:       { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['pending_cod', 'paid', 'refunded'],
      default: 'pending_cod',
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'upi', 'card'],
      required: true,
    },
    paymentMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    customer: {
      name:  { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    shipping: {
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city:         { type: String, required: true },
      state:        { type: String, required: true },
      pincode:      { type: String, required: true },
    },
    items:       { type: [LineItemSchema], required: true },
    currency:    { type: String, default: 'INR' },
    subtotal:    { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    total:       { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Order', OrderSchema);
