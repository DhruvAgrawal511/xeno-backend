// src/config/env.js
import dotenv from 'dotenv';
dotenv.config();

const cfg = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5050,

  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,

  // uth-related envs
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  jwtSecret: process.env.JWT_SECRET,
  cookieName: process.env.COOKIE_NAME || 'xeno_jwt',

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

if (!cfg.mongoUri) console.warn('[CFG] MONGO_URI is missing');
if (!cfg.redisUrl) console.warn('[CFG] REDIS_URL is missing');
if (!cfg.googleClientId) console.warn('[CFG] GOOGLE_CLIENT_ID is missing');
if (!cfg.jwtSecret) console.warn('[CFG] JWT_SECRET is missing');

export default cfg;
