import Redis from 'ioredis';
import cfg from './env.js';

let redis;

export function getRedis() {
  if (redis) return redis;
  if (!cfg.redisUrl) throw new Error('REDIS_URL missing');
  redis = new Redis(cfg.redisUrl, { maxRetriesPerRequest: null });
  redis.on('connect', () => console.log('Redis connected'));
  redis.on('error', (e) => console.error('Redis error:', e.message));
  return redis;
}   
