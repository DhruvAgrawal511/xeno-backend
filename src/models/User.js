import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { type: String, index: true },
  email: { type: String, index: true },
  name: String,
  picture: String
}, { timestamps: true });

export default mongoose.model('User', userSchema);
