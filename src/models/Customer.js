// src/models/Customer.js
import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  phone: { type: String },
  total_spend: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'customers' });

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
