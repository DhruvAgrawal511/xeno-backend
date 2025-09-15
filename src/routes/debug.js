// src/routes/debug.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
const router = Router();

const COOKIE_NAME = process.env.COOKIE_NAME || 'xeno_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.get('/debug/whoami', (req, res) => {
  const raw = req.cookies?.[COOKIE_NAME];
  console.log('[DEBUG] cookie present?', !!raw, 'cookieSnippet:', raw ? raw.slice(0, 20) : null);
  if (!raw) return res.status(401).json({ error: 'no_cookie' });
  try {
    const u = jwt.verify(raw, JWT_SECRET);
    console.log('[DEBUG] jwt ok:', u);
    return res.json({ ok: true, user: u });
  } catch (e) {
    console.log('[DEBUG] jwt verify failed:', e.message);
    return res.status(401).json({ error: 'jwt_failed', detail: e.message });
  }
});

export default router;