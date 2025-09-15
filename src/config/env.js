// src/config/env.js
import dotenv from 'dotenv';
dotenv.config(); // loads .env in dev — safe to keep but DO NOT commit .env

const isProd = process.env.NODE_ENV === 'production';

export default {
  port: process.env.PORT || 5050,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret', // rotate in prod
  cookieName: process.env.COOKIE_NAME || 'xeno_session',
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL,
  isProd,
};
