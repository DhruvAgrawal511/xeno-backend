import { Router } from 'express';
import mongoose from 'mongoose';
import { customerSchema, orderSchema } from '../utils/validators.js';
import { getRedis } from '../config/redis.js';
import Customer from '../models/Customer.js';

const router = Router();
const redis = getRedis();

/** Joi validate helper (throws 400-friendly error) */
function validate(schema, body) {
  const { error, value } = schema.validate(body, { stripUnknown: true });
  if (error) {
    const msg = error.details.map(d => d.message).join(', ');
    const err = new Error(msg);
    err.status = 400;
    throw err;
  }
  return value;
}


/** POST /api/customers */
router.post('/customers', async (req, res) => {
  try {
    const data = validate(customerSchema, req.body);

    // generate ObjectId now
    const newId = new mongoose.Types.ObjectId();
    const payload = { _id: newId.toString(), ...data };

    // enqueue with the pre-generated id
    const id = await redis.xadd(
      'stream:customers',
      '*',
      'event', 'customer.created',
      'payload', JSON.stringify(payload)
    );

    // return id immediately
    res.json({ ok: true, queuedId: id, customerId: newId.toString() });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

/** GET /api/customers */
router.get('/customers', async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Customer.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Customer.countDocuments()
  ]);

  res.json({
    page, limit, total, items
  });
});

/** GET /api/customers/:id */
router.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid customer id' });
  }
  const c = await Customer.findById(id);
  if (!c) return res.status(404).json({ error: 'Customer not found' });
  res.json(c);
});


/** POST /api/orders */
router.post('/orders', async (req, res) => {
  try {
    const data = validate(orderSchema, req.body);

    if (!mongoose.isValidObjectId(data.customerId)) {
      return res.status(400).json({ error: 'Invalid customerId (ObjectId expected)' });
    }

    const id = await redis.xadd(
      'stream:orders',
      '*',
      'event', 'order.created',
      'payload', JSON.stringify(data)
    );

    res.json({ ok: true, queuedId: id });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

/** POST /api/orders/by-email */
router.post('/orders/by-email', async (req, res) => {
  try {
    const { email, amount, currency = 'INR' } = req.body || {};
    if (!email || !amount) {
      return res.status(400).json({ error: 'email and amount are required' });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const payload = {
      customerId: customer._id.toString(),
      amount,
      currency
    };

    const id = await redis.xadd(
      'stream:orders',
      '*',
      'event', 'order.created',
      'payload', JSON.stringify(payload)
    );

    res.json({ ok: true, queuedId: id, resolvedCustomerId: payload.customerId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
