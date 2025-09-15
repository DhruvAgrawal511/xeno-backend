import mongoose from 'mongoose';
import cfg from './env.js';

export async function connectMongo() {
  if (!cfg.mongoUri) throw new Error('MONGO_URI missing');
  mongoose.set('strictQuery', true);
  await mongoose.connect(cfg.mongoUri);
  console.log('Mongo connected');
}
