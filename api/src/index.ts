import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { config } from './config.js';
import { handleConnection } from './signaling/handler.js';
import { makeTurnCreds } from './turn/credentials.js';

const log = pino({ level: config.logLevel });
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const turnRateLimit = rateLimit({ windowMs: 60_000, limit: 30 });

app.get('/turn-credentials', turnRateLimit, (_req, res) => {
  if (!config.turnSecret) {
    res.status(503).json({ error: 'TURN not configured' });
    return;
  }
  res.json(makeTurnCreds(config.turnSecret, config.turnHost));
});

const server = createServer(app);

const allowedOrigins = config.allowedOrigins
  ? new Set(config.allowedOrigins.split(',').map((o) => o.trim()))
  : null; // null = allow all (local dev)

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }: { origin: string }) => {
    if (!allowedOrigins) return true;
    return allowedOrigins.has(origin);
  },
});

wss.on('connection', (ws) => handleConnection(ws, log));

server.listen(config.port, () => log.info({ port: config.port }, 'server started'));
