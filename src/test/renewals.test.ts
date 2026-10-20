import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { saveDeposit, getEventsByDepositId, getAllDeposits, clearAllData } from '../services/db';
import { FixedDeposit } from '../types';

describe('Expirations, Confirmations and Renewal Traceability Logic', () => {
  beforeEach(async () => {
    await clearAllData(true);
  });

  const parentDeposit: FixedDeposit = {
    id: 'pf_parent_1',
    bank: 'Banco Galicia',
    description: 'Plazo Fijo Original',
    type: 'TRADICIONAL_TF',
    capital: 1000000,
    startDate: '2024-09-01',
    endDate: '2024-10-01',
    days: 30,
    tna: 38,
    estimatedInterest: 31232.88,
    estimatedTotalAmount: 1031232.88,
    autoRenewal: false,
    status: 'VIGENTE',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should mark parent deposit as RENOVADO and create linked child deposit without duplicating capital', async () => {
    // 1. Save original deposit
    await saveDeposit(parentDeposit, 'Alta inicial');

    // 2. Perform renewal
    const updatedParent: FixedDeposit = {
      ...parentDeposit,
      status: 'RENOVADO',
      nextId: 'pf_child_1',
      updatedAt: new Date().toISOString(),
    };
    await saveDeposit(updatedParent, 'Renovación de colocación anterior');

    const childDeposit: FixedDeposit = {
      id: 'pf_child_1',
      bank: parentDeposit.bank,
      description: 'Renovación Plazo Fijo Galicia',
      type: 'TRADICIONAL_TF',
      capital: parentDeposit.estimatedTotalAmount, // Capital + interest
      startDate: parentDeposit.endDate,
      endDate: '2024-11-01',
      days: 31,
      tna: 39,
      estimatedInterest: 34125.00,
      estimatedTotalAmount: 1065357.88,
      autoRenewal: false,
      status: 'VIGENTE',
      previousId: parentDeposit.id,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDeposit(childDeposit, `Renovación vinculada al plazo fijo ID ${parentDeposit.id}`);

    const allDeposits = await getAllDeposits(true);
    expect(allDeposits).toHaveLength(2);

    const activeDeposits = allDeposits.filter(d => d.status === 'VIGENTE');
    expect(activeDeposits).toHaveLength(1);
    expect(activeDeposits[0].id).toBe('pf_child_1');

    // Events history trace
    const parentEvents = await getEventsByDepositId(parentDeposit.id);
    const childEvents = await getEventsByDepositId(childDeposit.id);

    expect(parentEvents.some(e => e.type === 'MODIFICACION')).toBe(true);
    expect(childEvents.some(e => e.type === 'ALTA')).toBe(true);
  });
});
