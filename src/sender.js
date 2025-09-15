import mongoose from 'mongoose';
import cfg from './config/env.js';
import { getRedis } from './config/redis.js';

const redis = getRedis();

async function startSender() {
  await mongoose.connect(cfg.mongoUri);
  console.log('Sender connected to Mongo');

  try { await redis.xgroup('CREATE', 'stream:deliveries', 'cgSend', '0', 'MKSTREAM'); } catch {}

  const STREAM = 'stream:deliveries';

  while (true) {
    try {
      const res = await redis.xreadgroup(
        'GROUP', 'cgSend', 'sender-1',
        'COUNT', 20,
        'BLOCK', 5000,
        'STREAMS', STREAM, '>'
      );

      if (!res) continue;

      for (const [stream, messages] of res) {
        for (const [id, fields] of messages) {
          try {
            const obj = {};
            for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
            const payload = JSON.parse(obj.payload || '{}');

            // call vendor
            const resp = await fetch(`http://localhost:${cfg.port}/vendor/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!resp.ok) {
              console.error('Vendor send HTTP error', resp.status);
            }

            await redis.xack(stream, 'cgSend', id);
          } catch (e) {
            console.error('Sender handler error:', e.message);
          }
        }
      }
    } catch (e) {
      console.error('Sender error:', e.message);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

startSender();
