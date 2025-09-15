// src/server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cfg from './config/env.js';
import { connectMongo } from './config/db.js';
import { getRedis } from './config/redis.js';

// regular routes (these should exist in your repo)
import healthRoutes from './routes/health.js';
import ingestRoutes from './routes/ingest.js';
import segmentRoutes from './routes/segments.js';
import campaignRoutes from './routes/campaigns.js';
import vendorRoutes from './routes/vendor.js';
import receiptRoutes from './routes/receipts.js';
import authRoutes from './routes/auth.js';

const app = express();

// trust proxy (important for secure cookies behind proxies)
app.set('trust proxy', 1);

// Relax COOP so Google Identity postMessage works
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// CORS: exact origin + credentials
const CLIENT_ORIGIN = cfg.clientOrigin;
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));
app.options('*', cors({ origin: CLIENT_ORIGIN, credentials: true }));

// body parsing & cookies
app.use(express.json());
app.use(cookieParser());

// mount primary routes
app.use('/api', healthRoutes);
app.use('/api', ingestRoutes);
app.use('/api', authRoutes);
app.use('/api', segmentRoutes);
app.use('/api', campaignRoutes);
app.use('/api', vendorRoutes);
app.use('/api', receiptRoutes);

// Try to import optional debug routes (won't crash if missing)
(async () => {
  try {
    const mod = await import('./routes/debug.js');
    if (mod && mod.default) {
      app.use('/api', mod.default);
      console.log('[INFO] debug routes mounted');
    } else {
      console.log('[INFO] debug routes module loaded but no default export');
    }
  } catch (e) {
    console.log('[INFO] debug routes not found - skipping (this is OK in production)');
  }
})();

// root
app.get('/', (req, res) => res.send('Backend application is running.'));

async function start() {
  try {
    await connectMongo();
    getRedis();
    app.listen(cfg.port, () => {
      console.log(`Server on http://localhost:${cfg.port} (CLIENT_ORIGIN=${CLIENT_ORIGIN})`);
    });
  } catch (e) {
    console.error('Fatal:', e);
    process.exit(1);
  }
}

start();
