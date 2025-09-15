// src/routes/ingest.js
import { Router } from 'express';
import Customer from '../models/Customer.js'; // ensure path/casing correct
import { getRedis } from '../config/redis.js';

const router = Router();

/**
 * POST /api/customers
 * Accepts: { name, email, phone?, total_spend?, visits? }
 * Response: { ok: true, customer: { ... } }
 */
router.post('/customers', async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const phone = body.phone ? body.phone.toString().trim() : '';
    const total_spend = Number(body.total_spend || 0);
    const visits = Number(body.visits || 0);

    // Basic validation
    if (!name) return res.status(400).json({ error: 'name_required' });
    if (!email) return res.status(400).json({ error: 'email_required' });

    // Create customer in DB
    const doc = await Customer.create({
      name,
      email,
      phone,
      total_spend,
      visits,
      createdAt: new Date()
    });

    // Optionally push to Redis stream/queue if available (non-fatal)
    try {
      const redis = getRedis?.();
      if (redis && typeof redis.xadd === 'function') {
        // push a compact payload to stream 'customers'
        await redis.xadd('customers', '*', 'id', doc._id.toString(), 'payload', JSON.stringify({
          id: doc._id.toString(),
          name, email, phone, total_spend, visits
        }));
      } else if (redis && typeof redis.sendCommand === 'function') {
        // ioredis or other clients might use sendCommand
        // This block attempts a generic xadd
        await redis.sendCommand(['XADD', 'customers', '*', 'id', doc._id.toString(), 'payload', JSON.stringify({
          id: doc._id.toString(),
          name, email, phone, total_spend, visits
        })]);
      }
    } catch (ePush) {
      // Redis push failing should not block response - log and continue
      console.warn('[INGEST] Warning: redis publish failed:', ePush?.message || ePush);
    }

    // Return created record (safe)
    return res.json({ ok: true, customer: {
      id: doc._id.toString(),
      name: doc.name, email: doc.email, phone: doc.phone,
      total_spend: doc.total_spend, visits: doc.visits
    }});
  } catch (e) {
    // Log server-side full error (useful for Render / local logs)
    console.error('[INGEST] create customer failed:', e && e.stack ? e.stack : e);

    // Return safe error message. In development, include stack to help debug.
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: 'server_error',
      message: e?.message || String(e),
      ...(isProd ? {} : { stack: e?.stack?.toString?.() })
    });
  }
});

export default router;