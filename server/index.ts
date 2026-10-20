// @ts-ignore -- Express type declarations are not installed.
import express from 'express';
// @ts-ignore
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './db/database.js';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Database
initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API v1 Router
app.use('/api/v1', apiRouter);

// Healthcheck Endpoint
app.get('/health', (_req: any, res: { json: (arg0: { status: string; version: string; service: string; }) => void; }) => {
  res.json({ status: 'OK', version: '2.0.0', service: 'Lista Plazo Fijo API' });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req: any, res: { sendFile: (arg0: string) => void; }) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Lista Plazo Fijo v2.0] Servidor Backend corriendo en puerto ${PORT}`);
  });
}

export default app;
