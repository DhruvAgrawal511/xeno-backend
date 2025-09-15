import { Router } from 'express';
import { getRedis } from '../config/redis.js';

const router = Router();
const redis = getRedis();

/** POST /api/delivery-receipt
 * Accepts individual vendor callbacks but enqueues to stream:receipts
 * for batch DB updates by a consumer.
 */
router.post('/delivery-receipt', async (req, res) => {
  const { campaignId, customerId, vendorMessageId, status } = req.body || {};
  if (!campaignId || !customerId || !status) {
    return res.status(400).json({ error: 'campaignId, customerId, status required' });
  }

  const id = await redis.xadd(
    'stream:receipts',
    '*',
    'event', 'delivery.receipt',
    'payload', JSON.stringify({ campaignId, customerId, vendorMessageId, status })
  );

  res.json({ ok: true, queuedId: id });
});

export default router;
