import mongoose from 'mongoose';

/**
 * Singleton document (always key: 'default') for store-wide toggles that don't belong
 * on any one order/product — currently just the Razorpay Test ⇄ Live payment switch.
 */
const StoreAddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'H2R Sports' },
    phone: { type: String, default: '' },
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    gstin: { type: String, default: '' },
  },
  { _id: false }
);

const AppSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    paymentMode: { type: String, enum: ['test', 'live'], default: 'test' },
    paymentModeChangedAt: { type: Date, default: null },
    paymentModeChangedBy: { type: String, default: '' },
    /** Return / pickup address printed on shipping labels ("Ship From"). */
    storeAddress: { type: StoreAddressSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model('AppSettings', AppSettingsSchema);
