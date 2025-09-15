// src/routes/ingest.js  (replace your POST /customers handler)
import { Router } from 'express';
import mongoose from 'mongoose';
import cfg from '../config/env.js';
import { getRedis } from '../config/redis.js';
// import validators if you want

const router = Router();
const redis = getRedis(); // your helper to get the redis client
const STREAM = 'ingest:customers'; // use your stream name, adjust if different

router.post('/customers', async (req, res) => {
  try {
    const { name, email, phone, total_spend = 0, visits = 0 } = req.body || {};

    // basic validation (expand as needed)
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' });
    }

    // Generate a Mongo ObjectId on API side so we can return it immediately
    const newId = new mongoose.Types.ObjectId();

    // Build payload that consumer will eventually persist
    const payload = {
      _id: newId.toString(),   // string form
      name,
      email,
      phone: phone || '',
      total_spend: Number(total_spend) || 0,
      visits: Number(visits) || 0,
      createdAt: new Date().toISOString()
    };

    // push to redis stream (xadd). Use '*' or timestamp depending on your implementation
    // This assumes redis client supports xAdd / XADD via .xAdd or .xAdd alias.
    // If you use node-redis v4: use redis.sendCommand or use client.xAdd if available.
    await redis.xAdd(STREAM, '*', { payload: JSON.stringify(payload) });

    // return id to client immediately — indicates queued
    return res.json({ ok: true, id: payload._id, queued: true });
  } catch (err) {
    console.error('POST /customers error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// src/routes/ingest.js  (or customers.js) - add this route
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    // sanitize / allow only certain fields
    const allowed = ['name','email','phone','total_spend','visits'];
    const safe = {};
    for (const k of allowed) if (typeof updates[k] !== 'undefined') safe[k] = updates[k];

    const updated = await Customer.findByIdAndUpdate(id, safe, { new: true });
    if (!updated) return res.status(404).json({ error: 'not_found' });

    return res.json({ ok: true, customer: updated });
  } catch (err) {
    console.error('PUT /customers/:id error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
