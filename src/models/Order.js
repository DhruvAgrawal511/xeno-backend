import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  amount: Number,
  currency: { type: String, default: 'INR' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
