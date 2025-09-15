import mongoose from 'mongoose';

const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rules: { type: Object, required: true }, 
  audienceSize: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Segment', segmentSchema);