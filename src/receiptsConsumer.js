import mongoose from 'mongoose';
import cfg from './config/env.js';
import { getRedis } from './config/redis.js';
import CommunicationLog from './models/CommunicationLog.js';
import Campaign from './models/Campaign.js';

const redis = getRedis();

async function startReceipts() {
  await mongoose.connect(cfg.mongoUri);
  console.log('Receipts consumer connected to Mongo');

  try { await redis.xgroup('CREATE', 'stream:receipts', 'cgRec', '0', 'MKSTREAM'); } catch {}

  const STREAM = 'stream:receipts';

  while (true) {
    try {
      const res = await redis.xreadgroup(
        'GROUP', 'cgRec', 'receiver-1',
        'COUNT', 50,               // batch up to 50
        'BLOCK', 5000,
        'STREAMS', STREAM, '>'
      );

      if (!res) continue;

      // collect updates
      const updates = [];
      const campaignTouched = new Set();

      for (const [stream, messages] of res) {
        for (const [id, fields] of messages) {
          try {
            const obj = {};
            for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
            const payload = JSON.parse(obj.payload || '{}');

            updates.push({
              updateOne: {
                filter: { campaignId: payload.campaignId, customerId: payload.customerId },
                update: {
                  $set: {
                    status: payload.status,
                    vendorMessageId: payload.vendorMessageId || null,
                    vendorMeta: payload.vendorMeta || null
                  }
                }
              }
            });

            campaignTouched.add(payload.campaignId);

            await redis.xack(stream, 'cgRec', id);
          } catch (e) {
            console.error('Receipt handler error:', e.message);
          }
        }
      }

      if (updates.length) {
        await CommunicationLog.bulkWrite(updates, { ordered: false });

        for (const campId of campaignTouched) {
          const pending = await CommunicationLog.countDocuments({ campaignId: campId, status: 'QUEUED' });
          if (pending === 0) {
            await Campaign.findByIdAndUpdate(campId, { status: 'DONE' });
          }
        }
      }
    } catch (e) {
      console.error('Receipts consumer error:', e.message);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

startReceipts();
