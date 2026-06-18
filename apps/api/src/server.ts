import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { rateLimit } from 'express-rate-limit';

import authRouter      from './routes/auth';
import complaintsRouter from './routes/complaints';
import dashboardRouter  from './routes/dashboard';
// import gisRouter        from './routes/gis';
import tasksRouter      from './routes/tasks';
// import treesRouter      from './routes/trees';
// import waterRouter      from './routes/water';
// import drainsRouter     from './routes/drains';
import aiRouter         from './routes/ai';
import usersRouter      from './routes/users';

import { errorHandler }        from './middleware/error';

// import { initSensorBroadcast } from './websocket/sensor.broadcast';

const app        = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: {
    origin:  process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ── Global middleware ──────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting — 500 req / 15 min per IP
app.use('/api', rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             500,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests. Please try again later.' },
}));

// Stricter limit on auth endpoints
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { error: 'Too many login attempts. Try again in 15 minutes.' },
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/dashboard',  dashboardRouter);
// app.use('/api/gis',        gisRouter);
app.use('/api/tasks',      tasksRouter);
// app.use('/api/trees',      treesRouter);
// app.use('/api/water',      waterRouter);
// app.use('/api/drains',     drainsRouter);
app.use('/api/ai',         aiRouter);
app.use('/api/users',      usersRouter);

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Jalpaiguri Platform API Running',
  });
});

// Health check


app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'jalpaiguri-platform-api',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// ── WebSocket ─────────────────────────────────────────────────
// initSensorBroadcast(io);

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');
httpServer.listen(PORT, () => {
  console.log(`\n🚀  Jalpaiguri Platform API`);
  console.log(`    Port:    ${PORT}`);
  console.log(`    Env:     ${process.env.NODE_ENV}`);
  console.log(`    DB:      ${process.env.DATABASE_URL?.split('@')[1] ?? 'localhost'}`);
  console.log(`    WS:      enabled (30s sensor broadcast)\n`);
});

export default app;
