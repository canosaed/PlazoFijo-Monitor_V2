import { openDB } from 'idb';
import { migrateIndexedDbDataApi } from './api';

export async function checkAndMigrateIndexedDB(): Promise<boolean> {
  try {
    const dbNames = await indexedDB.databases?.();
    const hasDb = dbNames?.some(d => d.name === 'plazofijodb');
    if (!hasDb) return false;

    const db = await openDB('plazofijodb', 1);
    if (!db.objectStoreNames.contains('deposits')) return false;

    const deposits = await db.getAll('deposits');
    const events = db.objectStoreNames.contains('events') ? await db.getAll('events') : [];

    if (deposits && deposits.length > 0) {
      console.log(`[Migración] Transfiriendo ${deposits.length} plazos fijos de IndexedDB al backend API...`);
      await migrateIndexedDbDataApi(deposits, events);
      console.log('[Migración] Migración completada con éxito.');
      return true;
    }
  } catch (err) {
    console.warn('[Migración] No se pudo leer IndexedDB para migración automática:', err);
  }
  return false;
}
