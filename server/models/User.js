import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, default: '', index: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: { type: [AddressSchema], default: [] },
  },
  { timestamps: true }
);

UserSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: 'string', $gt: '' } },
  }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);
