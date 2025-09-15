// src/consumer.js
/**
 * Simple consumer that reads from the RPUSH queue (xeno:customers:queue)
 * - prefers blocking BLPOP if available
 * - falls back to polling with LPOP if not
 *
 * This file expects:
 * - config/db.js connects Mongoose and exports connectMongo (server does that)
 * - config/redis.js exports getRedis() that returns a connected redis client instance
 * - models/Customer.js is your Mongoose model
 *
 * Run this file as part of your server startup (or run separately with node src/consumer.js)
 */

import { getRedis } from './config/redis.js';
import Customer from './models/Customer.js';

const QUEUE_KEY = 'xeno:customers:queue';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function processPayloadString(payloadStr) {
  try {
    const payload = JSON.parse(payloadStr);
    // create in DB
    const c = await Customer.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      total_spend: payload.total_spend || 0,
      visits: payload.visits || 0,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    });
    console.log('Consumer: inserted customer', c._id?.toString?.() || '[no-id]');
  } catch (err) {
    console.error('Consumer: failed to process payload:', err?.message || err, 'payload:', payloadStr);
    // NOTE: in production you'd move this payload to a dead-letter queue or log for manual retry
  }
}

async function startConsumerLoop() {
  const redis = getRedis();
  if (!redis) {
    console.warn('Consumer: redis client not available, exiting consumer.');
    return;
  }

  console.log('Consumer: starting queue consumer for', QUEUE_KEY);

  // If blocking BLPOP is supported, use it.
  const hasBlpop = typeof redis.blPop === 'function' || typeof redis.sendCommand === 'function';
  const hasLpop = typeof redis.lPop === 'function' || typeof redis.lpop === 'function' || typeof redis.rpop === 'function';

  // Use blocking BLPOP if possible (node-redis v4 supports blPop)
  if (typeof redis.blPop === 'function') {
    console.log('Consumer: using redis.blPop (blocking)');
    while (true) {
      try {
        // node-redis v4 returns { key, element } when using blPop(key, timeout)
        const result = await redis.blPop(QUEUE_KEY, 0);
        // possible shapes:
        // - result = { key, element }   (node-redis v4)
        // - result = ['key', 'value']    (older clients)
        let payloadStr = null;
        if (!result) {
          await sleep(1000);
          continue;
        }
        if (Array.isArray(result)) {
          payloadStr = result[1];
        } else if (result.element) {
          payloadStr = result.element;
        } else if (result[1]) {
          payloadStr = result[1];
        } else if (result.element) {
          payloadStr = result.element;
        } else {
          // fallback stringify whole result
          payloadStr = JSON.stringify(result);
        }
        if (payloadStr) await processPayloadString(payloadStr);
      } catch (err) {
        console.error('Consumer blPop error', err?.message || err);
        await sleep(1000);
      }
    }
  }

  // If sendCommand exists, try BLPOP via sendCommand (some clients)
  if (typeof redis.sendCommand === 'function') {
    console.log('Consumer: using redis.sendCommand(BLPOP) (blocking)');
    while (true) {
      try {
        const res = await redis.sendCommand(['BLPOP', QUEUE_KEY, '0']); // returns array or null
        if (!res) {
          await sleep(1000);
          continue;
        }
        // res might be array ['key', 'value']
        const payloadStr = Array.isArray(res) ? res[1] : (res.element || (res[1] ?? JSON.stringify(res)));
        await processPayloadString(payloadStr);
      } catch (err) {
        console.error('Consumer sendCommand(BLPOP) error', err?.message || err);
        await sleep(1000);
      }
    }
  }

  // Last fallback: polling lPop
  if (hasLpop) {
    console.log('Consumer: using polling with lPop (non-blocking)');
    const lPopFn = typeof redis.lPop === 'function' ? redis.lPop.bind(redis) : (typeof redis.lpop === 'function' ? redis.lpop.bind(redis) : null);
    if (!lPopFn) {
      console.warn('Consumer: no lPop found on redis client, consumer cannot start.');
      return;
    }
    while (true) {
      try {
        const payloadStr = await lPopFn(QUEUE_KEY);
        if (!payloadStr) {
          await sleep(1000);
          continue;
        }
        await processPayloadString(payloadStr);
      } catch (err) {
        console.error('Consumer lPop error', err?.message || err);
        await sleep(1000);
      }
    }
  }

  console.warn('Consumer: no suitable redis list methods found (blPop / lPop), consumer not started.');
}

startConsumerLoop().catch((e) => {
  console.error('Consumer fatal error', e?.message || e);
  process.exit(1);
});
