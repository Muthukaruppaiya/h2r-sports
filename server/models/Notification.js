import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['order', 'review', 'system'],
      default: 'order',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    orderId: { type: String, default: '', index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ read: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);
