// src/routes/auth.js
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cfg from '../config/env.js';
import User from '../models/User.js'; // keep your User model

const router = Router();
const googleClient = new OAuth2Client(cfg.googleClientId || process.env.GOOGLE_CLIENT_ID);

const COOKIE_NAME = cfg.cookieName || process.env.COOKIE_NAME || 'xeno_session';
const JWT_SECRET = cfg.jwtSecret || process.env.JWT_SECRET || 'dev-secret';
const isProd = cfg.isProd;

/** helper to set cookie */
function issueCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/** helper to clear cookie */
function clearCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
}

/**
 * POST /api/auth/google
 * Body: { idToken }
 */
router.post('/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    // debug preview (harmless)
    try {
      const preview = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));
      console.log('[AUTH] ID token aud:', preview.aud, 'expected:', cfg.googleClientId);
      console.log('[AUTH] ID token iss:', preview.iss, 'email:', preview.email);
    } catch (e) {
      // ignore preview errors
    }

    // verify with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: cfg.googleClientId || process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(401).json({ error: 'invalid_google_payload' });
    }

    // upsert user (simple)
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });
    } else {
      const changed = (user.name !== payload.name) || (user.picture !== payload.picture);
      if (changed) {
        user.name = payload.name;
        user.picture = payload.picture;
        await user.save();
      }
    }

    // issue cookie
    issueCookie(res, { id: user._id.toString(), email: user.email, name: user.name });

    return res.json({
      ok: true,
      user: { id: user._id, email: user.email, name: user.name, picture: user.picture }
    });

  } catch (e) {
    console.error('[AUTH] Google verification failed:', e?.message || e);
    return res.status(401).json({ error: 'google_verification_failed', detail: e?.message || 'verifyIdToken error' });
  }
});

/** GET /api/auth/me - return user from cookie */
router.get('/auth/me', (req, res) => {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return res.json({ user: null });
  try {
    const u = jwt.verify(raw, JWT_SECRET);
    return res.json({ user: { id: u.id, email: u.email, name: u.name } });
  } catch (e) {
    return res.json({ user: null });
  }
});

/** POST /api/auth/logout */
router.post('/auth/logout', (req, res) => {
  clearCookie(res);
  return res.json({ ok: true });
});

export default router;
