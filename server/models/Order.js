import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    name:      { type: String, required: true },
    sizeId:    { type: String, required: true },
    sizeLabel: { type: String, required: true },
    weightId:    { type: String, default: '' },
    weightLabel: { type: String, default: '' },
    price:     { type: Number, required: true },
    qty:       { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const CourierSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    trackingId: { type: String, default: '' },
    trackingUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
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
      enum: [
        'ordered',
        'accepted',
        'packed',
        'shipped',
        'delivered',
        'cancelled',
        // legacy
        'confirmed',
        'paid',
      ],
      default: 'ordered',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'pending_cod', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'upi', 'card', 'razorpay'],
      required: true,
    },
    paymentMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    razorpayOrderId: { type: String, default: '', index: true },
    razorpayPaymentId: { type: String, default: '' },
    courier: { type: CourierSchema, default: () => ({}) },
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
    discount:    { type: Number, default: 0 },
    total:       { type: Number, required: true },
    statusTimestamps: {
      orderedAt:   { type: Date },
      acceptedAt:  { type: Date },
      packedAt:    { type: Date },
      shippedAt:   { type: Date },
      deliveredAt: { type: Date },
      cancelledAt: { type: Date },
      // legacy
      confirmedAt: { type: Date },
      paidAt:      { type: Date },
    },
    statusHistory: [{
      from:      { type: String },
      to:        { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: String, default: 'System' },
      note:      { type: String },
    }],
  },
  { timestamps: true }
);

export default mongoose.model('Order', OrderSchema);
