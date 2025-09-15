import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';      
import cfg from './config/env.js';
import { connectMongo } from './config/db.js';
import { getRedis } from './config/redis.js';

import healthRoutes from './routes/health.js';
import ingestRoutes from './routes/ingest.js';
import segmentRoutes from './routes/segments.js';
import campaignRoutes from './routes/campaigns.js';
import receiptsRoutes from './routes/receipts.js';
import vendorRoutes from './routes/vendor.js';
import authRoutes from './routes/auth.js';      
import requireAuth from './middleware/auth.js'; 

const app = express();

app.use(cors(
//   {
//   origin: cfg.clientOrigin || 'http://localhost:5173',
//   credentials: true                             
// }
));
app.use(express.json());
app.use(cookieParser());                         

app.use('/api', healthRoutes);
app.use('/api', ingestRoutes);
app.use('/api', authRoutes);                      

app.use('/api', requireAuth, segmentRoutes);
app.use('/api', requireAuth, campaignRoutes);
app.use('/api', requireAuth, receiptsRoutes);

app.use('/', vendorRoutes);

app.get('/', (_, res) => res.send('Mini CRM backend (auth enabled).'));

async function start() {
  await connectMongo();
  getRedis();
  app.listen(cfg.port, () => console.log(`Server on http://localhost:${cfg.port}`));
}
start().catch(e => { console.error('Fatal:', e); process.exit(1); });
