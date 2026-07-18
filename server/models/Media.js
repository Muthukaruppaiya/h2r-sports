import mongoose from 'mongoose';

const MediaSchema = new mongoose.Schema(
  {
    filename: { type: String, default: '' },
    contentType: { type: String, required: true },
    size: { type: Number, default: 0 },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Media', MediaSchema);
