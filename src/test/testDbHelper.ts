import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';

export function createTestDb() {
  const mem = newDb();
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server/db/schema.postgres.sql'), 'utf-8');
  mem.public.none(schemaSql);
  const pgAdapter = mem.adapters.createPg();
  return new pgAdapter.Pool();
}
