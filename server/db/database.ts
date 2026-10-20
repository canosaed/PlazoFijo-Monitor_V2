
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'plazofijodb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true }
    : false,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error);
});

export async function initDatabase(): Promise<void> {
  const result = await pool.query('SELECT NOW() AS fecha');

  console.log(
    'Conexión con PostgreSQL establecida:',
    result.rows[0].fecha
  );
}

export async function getDb() {
  return pool;
}
