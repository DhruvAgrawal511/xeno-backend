import mongoose from 'mongoose';

const commSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  status: { type: String, enum: ['QUEUED','SENT','FAILED'], default: 'QUEUED' },
  vendorMessageId: String,
  vendorMeta: Object,
  message: String
}, { timestamps: true });

export default mongoose.model('CommunicationLog', commSchema);
