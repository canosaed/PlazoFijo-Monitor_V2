import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FixedDeposit, InvestmentEvent, BackupData } from '../types';

interface PlazoFijoDB extends DBSchema {
  deposits: {
    key: string;
    value: FixedDeposit;
    indexes: {
      'by-bank': string;
      'by-status': string;
      'by-startDate': string;
      'by-endDate': string;
      'by-isDemo': number; // 0 for false, 1 for true
    };
  };
  events: {
    key: string;
    value: InvestmentEvent;
    indexes: {
      'by-depositId': string;
      'by-timestamp': string;
      'by-type': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'plazo_fijo_pro_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PlazoFijoDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PlazoFijoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PlazoFijoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          // Deposits store
          const depositStore = db.createObjectStore('deposits', { keyPath: 'id' });
          depositStore.createIndex('by-bank', 'bank');
          depositStore.createIndex('by-status', 'status');
          depositStore.createIndex('by-startDate', 'startDate');
          depositStore.createIndex('by-endDate', 'endDate');
          depositStore.createIndex('by-isDemo', 'isDemo');

          // Events store
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('by-depositId', 'depositId');
          eventStore.createIndex('by-timestamp', 'timestamp');
          eventStore.createIndex('by-type', 'type');

          // Settings store
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// Data Service methods
export async function getAllDeposits(includeDemo: boolean = true): Promise<FixedDeposit[]> {
  const db = await getDB();
  const deposits = await db.getAll('deposits');
  if (includeDemo) return deposits;
  return deposits.filter(d => !d.isDemo);
}

export async function getDepositById(id: string): Promise<FixedDeposit | undefined> {
  const db = await getDB();
  return db.get('deposits', id);
}

export async function saveDeposit(deposit: FixedDeposit, eventDescription?: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['deposits', 'events'], 'readwrite');

  const existing = await tx.objectStore('deposits').get(deposit.id);
  const now = new Date().toISOString();

  const updatedDeposit: FixedDeposit = {
    ...deposit,
    updatedAt: now,
  };

  await tx.objectStore('deposits').put(updatedDeposit);

  // Record history event
  const eventType = existing ? 'MODIFICACION' : 'ALTA';
  const desc = eventDescription || (existing ? `Modificación de datos de plazo fijo en ${deposit.bank}` : `Alta de plazo fijo en ${deposit.bank}`);

  const event: InvestmentEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    depositId: deposit.id,
    timestamp: now,
    type: eventType,
    description: desc,
    amounts: {
      capital: deposit.capital,
      interest: deposit.estimatedInterest,
      total: deposit.estimatedTotalAmount,
    },
  };

  await tx.objectStore('events').add(event);
  await tx.done;
}

export async function recordEvent(event: Omit<InvestmentEvent, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDB();
  const fullEvent: InvestmentEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  await db.add('events', fullEvent);
}

export async function getEventsByDepositId(depositId: string): Promise<InvestmentEvent[]> {
  const db = await getDB();
  const events = await db.getAllFromIndex('events', 'by-depositId', depositId);
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAllEvents(): Promise<InvestmentEvent[]> {
  const db = await getDB();
  const events = await db.getAll('events');
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function deleteDeposit(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['deposits', 'events'], 'readwrite');
  await tx.objectStore('deposits').delete(id);

  // Clean up associated events
  const events = await tx.objectStore('events').index('by-depositId').getAllKeys(id);
  for (const key of events) {
    await tx.objectStore('events').delete(key);
  }

  await tx.done;
}

export async function clearAllData(includeReal: boolean = false): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['deposits', 'events'], 'readwrite');
  if (includeReal) {
    await tx.objectStore('deposits').clear();
    await tx.objectStore('events').clear();
  } else {
    // Clear only demo data
    const allDeposits = await tx.objectStore('deposits').getAll();
    for (const dep of allDeposits) {
      if (dep.isDemo) {
        await tx.objectStore('deposits').delete(dep.id);
        const eventKeys = await tx.objectStore('events').index('by-depositId').getAllKeys(dep.id);
        for (const k of eventKeys) {
          await tx.objectStore('events').delete(k);
        }
      }
    }
  }
  await tx.done;
}

export async function exportBackupJSON(): Promise<BackupData> {
  const db = await getDB();
  const deposits = await db.getAll('deposits');
  const events = await db.getAll('events');

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    deposits,
    events,
  };
}

export async function restoreBackupJSON(data: BackupData): Promise<{ importedDeposits: number; importedEvents: number }> {
  if (!data || !Array.isArray(data.deposits) || !Array.isArray(data.events)) {
    throw new Error('El archivo de respaldo JSON no tiene una estructura válida.');
  }

  const db = await getDB();
  const tx = db.transaction(['deposits', 'events'], 'readwrite');

  await tx.objectStore('deposits').clear();
  await tx.objectStore('events').clear();

  for (const dep of data.deposits) {
    await tx.objectStore('deposits').put(dep);
  }

  for (const evt of data.events) {
    await tx.objectStore('events').put(evt);
  }

  await tx.done;
  return {
    importedDeposits: data.deposits.length,
    importedEvents: data.events.length,
  };
}
