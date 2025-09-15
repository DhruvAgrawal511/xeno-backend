import { Router } from 'express';
import cfg from '../config/env.js';

const router = Router();

/** POST /vendor/send
 * Simulates a third-party vendor.
 * ~90% SENT, ~10% FAILED, then calls back your Delivery Receipt API.
 * Payload: { campaignId, customerId, message }
 */
router.post('/vendor/send', async (req, res) => {
  const { campaignId, customerId, message } = req.body || {};
  if (!campaignId || !customerId || !message) {
    return res.status(400).json({ error: 'campaignId, customerId, message required' });
  }

  // simulate async network/processing delay
  const delayMs = Math.floor(Math.random() * 800) + 100; // 100–900ms
  const isSent = true; //
  const vendorMessageId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  res.json({ accepted: true, vendorMessageId });

  setTimeout(async () => {
    try {
      // Call Delivery Receipt API
      await fetch(`http://localhost:${cfg.port}/api/delivery-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          customerId,
          vendorMessageId,
          status: isSent ? 'SENT' : 'FAILED'
        })
      });
    } catch (e) {
      console.error('Vendor callback error:', e.message);
    }
  }, delayMs);
});

export default router;
