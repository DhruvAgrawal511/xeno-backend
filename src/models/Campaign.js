import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  segmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment', index: true },
  message: String,
  status: { type: String, enum: ['CREATED', 'SENDING', 'DONE'], default: 'CREATED' }
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);
