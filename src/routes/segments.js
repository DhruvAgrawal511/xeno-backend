import { Router } from 'express';
import Segment from '../models/Segment.js';
import Customer from '../models/Customer.js';
import { matchesRule } from '../utils/ruleEngine.js';

const router = Router();

/** POST /api/segments */
router.post('/segments', async (req, res) => {
  const { name, rules } = req.body;
  if (!name || !rules) return res.status(400).json({ error: 'name and rules required' });

  // Preview audience size before saving
  const allCustomers = await Customer.find();
  const matching = allCustomers.filter(c => matchesRule(c, rules));

  const segment = await Segment.create({
    name,
    rules,
    audienceSize: matching.length
  });

  res.json({ ok: true, segment });
});

/** GET /api/segments */
router.get('/segments', async (req, res) => {
  const segments = await Segment.find().sort({ createdAt: -1 });
  res.json(segments);
});

/** POST /api/segments/preview */
router.post('/segments/preview', async (req, res) => {
  const { rules } = req.body;
  if (!rules) return res.status(400).json({ error: 'rules required' });

  const allCustomers = await Customer.find();
  const matching = allCustomers.filter(c => matchesRule(c, rules));
  res.json({ audienceSize: matching.length });
});

export default router;
