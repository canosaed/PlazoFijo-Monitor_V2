import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'plazo_fijo.db');

let db: Database.Database | null = null;

export function initDatabase(dbFilePath: string = DB_PATH): Database.Database {
  if (db && dbFilePath === DB_PATH) {
    return db;
  }

  const instance = new Database(dbFilePath);

  // Enable Foreign Keys and WAL Mode for better concurrency/performance
  instance.pragma('foreign_keys = ON');
  if (dbFilePath !== ':memory:') {
    instance.pragma('journal_mode = WAL');
  }

  // Load and execute schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    instance.exec(schemaSql);
  }

  if (dbFilePath === DB_PATH) {
    db = instance;
  }

  return instance;
}

export function getDb(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}
