// src/routes/ingest.js
import { Router } from 'express';
import Customer from '../models/Customer.js';
import { getRedis } from '../config/redis.js';

const router = Router();

/**
 * Helper: push payload to queue using whatever Redis API we have.
 * Returns { queued: true } if queued, or { queued: false, createdCustomer } if fallback to DB.
 */
async function pushToQueue(payload) {
  const redis = getRedis();
  const key = 'xeno:customers:queue';
  if (!redis) throw new Error('redis-not-initialized');

  // node-redis v4: rPush available
  if (typeof redis.rPush === 'function') {
    await redis.rPush(key, JSON.stringify(payload));
    return { queued: true };
  }

  // ioredis: rpush (lowercase) or call('rpush'...)
  if (typeof redis.rpush === 'function') {
    await redis.rpush(key, JSON.stringify(payload));
    return { queued: true };
  }

  // node-redis v4 / generic: sendCommand
  if (typeof redis.sendCommand === 'function') {
    await redis.sendCommand(['RPUSH', key, JSON.stringify(payload)]);
    return { queued: true };
  }

  // fallback: if nothing supports push, persist directly to DB to avoid data loss.
  const created = await Customer.create(payload);
  return { queued: false, createdCustomer: created };
}

/**
 * POST /api/customers
 * Body: { name, email, phone, total_spend, visits }
 * Queues the customer payload for processing (consumer will create the DB record).
 */
router.post('/customers', async (req, res) => {
  try {
    const body = req.body || {};
    // basic validation (you can extend)
    if (!body.name || !body.email) {
      return res.status(400).json({ error: 'name_and_email_required' });
    }

    const payload = {
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      phone: body.phone ? String(body.phone).trim() : '',
      total_spend: Number(body.total_spend) || 0,
      visits: Number(body.visits) || 0,
      createdAt: new Date().toISOString(),
    };

    const result = await pushToQueue(payload);

    if (result.queued) {
      return res.status(200).json({ ok: true, queued: true });
    } else {
      // created directly in DB
      return res.status(201).json({ ok: true, queued: false, customer: result.createdCustomer });
    }
  } catch (err) {
    console.error('POST /customers error', err);
    return res.status(500).json({ error: 'internal', detail: err.message || 'unknown' });
  }
});

/**
 * GET /api/customers?page=1&limit=50
 * Simple listing for frontend (reads from Mongo).
 */
router.get('/customers', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Customer.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments({}),
    ]);

    return res.json({ data: items, meta: { page, limit, total } });
  } catch (err) {
    console.error('GET /customers error', err);
    return res.status(500).json({ error: 'internal', detail: err.message || 'unknown' });
  }
});

export default router;
