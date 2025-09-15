import mongoose from 'mongoose';
import cfg from './config/env.js';
import { getRedis } from './config/redis.js';
import Customer from './models/Customer.js';
import Order from './models/Order.js';

const redis = getRedis();

async function startConsumer() {
  await mongoose.connect(cfg.mongoUri);
  console.log('Consumer connected to Mongo');

  // Ensure consumer groups exist (create streams if missing)
  try { await redis.xgroup('CREATE', 'stream:customers', 'cg1', '0', 'MKSTREAM'); } catch {}
  try { await redis.xgroup('CREATE', 'stream:orders', 'cg1', '0', 'MKSTREAM'); } catch {}

  const STREAMS = ['stream:customers', 'stream:orders'];
  const IDS_NEW = ['>', '>']; // one ID per stream

  while (true) {
    try {
      // Read new messages for both streams
      const res = await redis.xreadgroup(
        'GROUP', 'cg1', 'c1',
        'COUNT', 10,
        'BLOCK', 5000,
        'STREAMS',
        ...STREAMS,
        ...IDS_NEW
      );

      if (!res) continue;

      for (const [stream, messages] of res) {
        for (const [id, fields] of messages) {
          try {
            // fields is [k1, v1, k2, v2, ...]
            const obj = {};
            for (let i = 0; i < fields.length; i += 2) {
              obj[fields[i]] = fields[i + 1];
            }
            const event = obj.event;
            const payload = JSON.parse(obj.payload || '{}');

            if (stream === 'stream:customers' && event === 'customer.created') {
              await Customer.create(payload);
              console.log('Inserted customer', payload.email, 'with id', payload._id);
            } else if (stream === 'stream:orders' && event === 'order.created') {
              await Order.create({
                ...payload,
                customerId: new mongoose.Types.ObjectId(payload.customerId)
              });
              console.log('Inserted order for', payload.customerId);
            } else {
              console.warn('Unknown event/stream', { stream, event });
            }

            await redis.xack(stream, 'cg1', id);
          } catch (inner) {
            console.error('Handler error:', inner.message);
          }
        }
      }
    } catch (e) {
      console.error('Consumer error:', e.message);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

startConsumer();
