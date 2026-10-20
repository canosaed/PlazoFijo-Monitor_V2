import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let poolInstance: pg.Pool | any = null;

export function getPool() {
  if (!poolInstance) {
    if (process.env.DATABASE_URL) {
      poolInstance = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
    } else {
      poolInstance = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'plazofijodb',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
    }

    poolInstance.on('error', (error: Error) => {
      console.error('Error inesperado en el pool de PostgreSQL:', error);
    });
  }
  return poolInstance;
}

export function setPool(customPool: any) {
  poolInstance = customPool;
}

export async function initDatabase(dbClientOrPool?: any): Promise<any> {
  const activePool = dbClientOrPool || getPool();

  // Execute schema initialization
  const schemaPath = path.join(__dirname, 'schema.postgres.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await activePool.query(schemaSql);
  }

  const result = await activePool.query('SELECT NOW() AS fecha');
  console.log('Conexión con PostgreSQL establecida:', result.rows[0]?.fecha || new Date());
  return activePool;
}

export async function getDb() {
  return getPool();
}

export { poolInstance as pool };
