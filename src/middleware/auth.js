import jwt from 'jsonwebtoken';
import cfg from '../config/env.js';

export default function requireAuth(req, res, next) {
  const token =
    req.cookies?.[cfg.cookieName] ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, cfg.jwtSecret); 
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
