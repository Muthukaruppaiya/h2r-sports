import mongoose from 'mongoose';

const MarketingVideoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    instagramUrl: { type: String, default: '' },
    productPath: { type: String, default: '/shop' },
    productName: { type: String, default: 'Shop now' },
    productId: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const WhatsappStatusSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: '' },
    text: { type: String, default: '' },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    durationDays: { type: Number, default: 1, min: 1, max: 7 },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ctaText: { type: String, default: 'Message us' },
    prefillMessage: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const MarketingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    floatingVideos: { type: [MarketingVideoSchema], default: [] },
    whatsappStatuses: { type: [WhatsappStatusSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('MarketingSettings', MarketingSettingsSchema);
