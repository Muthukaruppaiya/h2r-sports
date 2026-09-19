import mongoose from 'mongoose';

const GrnLineSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    itemName: { type: String, default: '' },
    sizeId: { type: String, default: '' },
    sizeLabel: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const GrnSchema = new mongoose.Schema(
  {
    grnId: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, default: '' },
    invoiceDate: { type: Date, default: null },
    supplierName: { type: String, default: '' },
    supplierPhone: { type: String, default: '' },
    notes: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now },
    items: { type: [GrnLineSchema], default: [] },
    totalQty: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    stockInwarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Grn', GrnSchema);
