import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { 
  getDB, 
  getAllDeposits, 
  saveDeposit, 
  getEventsByDepositId, 
  exportBackupJSON, 
  restoreBackupJSON,
  clearAllData 
} from '../services/db';
import { FixedDeposit } from '../types';

describe('IndexedDB Persistence & Isolation Service', () => {
  beforeEach(async () => {
    await clearAllData(true);
  });

  const testDeposit: FixedDeposit = {
    id: 'test_pf_100',
    bank: 'Banco Macro',
    description: 'PF Pruebas',
    type: 'TRADICIONAL_TF',
    capital: 500000,
    startDate: '2024-10-01',
    endDate: '2024-10-31',
    days: 30,
    tna: 38,
    tea: null,
    estimatedInterest: 15616.44,
    reportedInterest: null,
    collectedInterest: null,
    estimatedTotalAmount: 515616.44,
    reportedTotalAmount: null,
    collectedCapital: null,
    autoRenewal: false,
    status: 'VIGENTE',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should save and retrieve a fixed deposit record', async () => {
    await saveDeposit(testDeposit);
    const deposits = await getAllDeposits(true);
    expect(deposits).toHaveLength(1);
    expect(deposits[0].bank).toBe('Banco Macro');
    expect(deposits[0].capital).toBe(500000);
  });

  it('should generate an event in history when creating a deposit', async () => {
    await saveDeposit(testDeposit);
    const events = await getEventsByDepositId(testDeposit.id);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('ALTA');
    expect(events[0].depositId).toBe(testDeposit.id);
  });

  it('should separate demo data from real user data when filtering', async () => {
    const demoDeposit: FixedDeposit = {
      ...testDeposit,
      id: 'demo_101',
      isDemo: true,
    };
    await saveDeposit(testDeposit);
    await saveDeposit(demoDeposit);

    const allIncludingDemo = await getAllDeposits(true);
    const realOnly = await getAllDeposits(false);

    expect(allIncludingDemo).toHaveLength(2);
    expect(realOnly).toHaveLength(1);
    expect(realOnly[0].id).toBe('test_pf_100');
  });

  it('should export and restore full backup accurately', async () => {
    await saveDeposit(testDeposit);
    const backup = await exportBackupJSON();

    expect(backup.deposits).toHaveLength(1);
    expect(backup.events).toHaveLength(1);

    await clearAllData(true);
    const emptyDeposits = await getAllDeposits(true);
    expect(emptyDeposits).toHaveLength(0);

    await restoreBackupJSON(backup);
    const restoredDeposits = await getAllDeposits(true);
    expect(restoredDeposits).toHaveLength(1);
    expect(restoredDeposits[0].id).toBe('test_pf_100');
  });
});
