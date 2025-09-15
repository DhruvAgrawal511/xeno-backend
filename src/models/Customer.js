import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, index: true },
  phone: String,
  total_spend: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
  last_order_at: Date,
  last_active_at: Date,
  tags: [String]
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
