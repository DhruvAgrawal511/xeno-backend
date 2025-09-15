// src/server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cfg from './config/env.js';
import { connectMongo } from './config/db.js';   // keep your existing
import { getRedis } from './config/redis.js';    // keep your existing

// import your existing route modules
import healthRoutes from './routes/health.js';
import ingestRoutes from './routes/ingest.js';
import segmentRoutes from './routes/segments.js';
import campaignRoutes from './routes/campaigns.js';
import vendorRoutes from './routes/vendor.js';
import receiptRoutes from './routes/receipts.js';
import authRoutes from './routes/auth.js';
import debugRoutes from './routes/debug.js'; // temporary - remove after debugging

const app = express();

// trust proxy (Render/Vercel) so secure cookies work
app.set('trust proxy', 1);

// --- COOP/COEP: relax so Google Identity postMessage works ---
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // do not set Cross-Origin-Embedder-Policy globally in this app
  next();
});

// --- CORS: exact origin and credentials true (very important) ---
const CLIENT_ORIGIN = cfg.clientOrigin;
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));

// support preflight across the board
app.options('*', cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));

// body parsing & cookies
app.use(express.json());
app.use(cookieParser());

// routes (order matters: auth before protected if you have middleware)
app.use('/api', healthRoutes);
app.use('/api', ingestRoutes);
app.use('/api', authRoutes);        // auth endpoints
app.use('/api', segmentRoutes);
app.use('/api', campaignRoutes);
app.use('/api', vendorRoutes);
app.use('/api', receiptRoutes);
app.use('/api', debugRoutes);       // temporary debugging route

app.get('/', (req, res) => res.send('Backend application is running.'));

async function start() {
  try {
    await connectMongo();    // must exist in your repo
    getRedis();              // must exist in your repo
    app.listen(cfg.port, () => {
      console.log(`Server on http://localhost:${cfg.port} (CLIENT_ORIGIN=${CLIENT_ORIGIN})`);
    });
  } catch (e) {
    console.error('Fatal:', e);
    process.exit(1);
  }
}

start();
