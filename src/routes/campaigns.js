import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import Segment from '../models/Segment.js';
import Customer from '../models/Customer.js';
import CommunicationLog from '../models/CommunicationLog.js';
import { matchesRule } from '../utils/ruleEngine.js';
import { getRedis } from '../config/redis.js';

const router = Router();
const redis = getRedis();

/** POST /api/campaigns */
router.post('/campaigns', async (req, res) => {
  const { segmentId, message } = req.body;
  if (!segmentId || !message) return res.status(400).json({ error: 'segmentId and message required' });

  const seg = await Segment.findById(segmentId);
  if (!seg) return res.status(404).json({ error: 'Segment not found' });

  const campaign = await Campaign.create({ segmentId, message });
  res.json({ ok: true, campaign });
});

/** GET /api/campaigns */
router.get('/campaigns', async (req, res) => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).populate('segmentId');
  res.json(campaigns);
});

router.post('/campaigns/:id/send', async (req, res) => {
  const { id } = req.params;
  const campaign = await Campaign.findById(id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const seg = await Segment.findById(campaign.segmentId);
  if (!seg) return res.status(404).json({ error: 'Segment not found' });

  // Build audience (simple in-memory rule match; fine for demo scale)
  const customers = await Customer.find();
  const audience = customers.filter(c => matchesRule(c, seg.rules));

  if (!audience.length) {
    return res.json({ ok: true, message: 'No matching customers', audienceSize: 0 });
  }

  // Mark campaign as SENDING
  campaign.status = 'SENDING';
  await campaign.save();

  // Create logs & enqueue deliveries
  const bulkLogs = audience.map(c => ({
    insertOne: {
      document: {
        campaignId: campaign._id,
        customerId: c._id,
        status: 'QUEUED',
        message: campaign.message
      }
    }
  }));
  await CommunicationLog.bulkWrite(bulkLogs);

  // Enqueue each to delivery stream
  for (const c of audience) {
    await redis.xadd(
      'stream:deliveries',
      '*',
      'event', 'deliver.send',
      'payload', JSON.stringify({
        campaignId: campaign._id.toString(),
        customerId: c._id.toString(),
        // include message and a simple personalization example
        message: `Hi ${c.name?.split(' ')[0] || 'there'}, ${campaign.message}`
      })
    );
  }

  res.json({
    ok: true,
    campaignId: campaign._id,
    enqueued: audience.length
  });
});

router.get('/campaigns/history', async (req, res) => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();

  const results = await Promise.all(campaigns.map(async (c) => {
    const [audience, sent, failed] = await Promise.all([
      CommunicationLog.countDocuments({ campaignId: c._id }),
      CommunicationLog.countDocuments({ campaignId: c._id, status: 'SENT' }),
      CommunicationLog.countDocuments({ campaignId: c._id, status: 'FAILED' })
    ]);

    return {
      ...c,
      stats: { audience, sent, failed }
    };
  }));

  res.json(results);
});

export default router;
