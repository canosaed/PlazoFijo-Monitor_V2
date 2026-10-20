import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase } from '../../server/db/database';
import { restoreBackup, exportBackup } from '../../server/services/importExportService';
import { getAllDeposits, getAllEvents } from '../../server/services/depositService';

describe('Verificación de Estructura de Respaldo JSON', () => {
  let db: ReturnType<typeof initDatabase>;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  it('debe validar y restaurar un respaldo JSON completo con UUIDs, tasas TEA y eventos', () => {
    const userBackupSample = {
      version: 1,
      exportedAt: '2026-10-19T17:48:39.697Z',
      deposits: [
        {
          id: '00a78b8a-a0fd-4063-bd94-064f33c3ff7b',
          bank: 'Banco Nación (BNA)',
          description: '53770',
          type: 'TRADICIONAL_TF',
          capital: 500000,
          startDate: '2026-09-30',
          endDate: '2026-10-30',
          days: 30,
          tna: 18.75,
          tea: 20.45,
          estimatedInterest: 7705.48,
          reportedInterest: null,
          collectedInterest: null,
          estimatedTotalAmount: 507705.48,
          reportedTotalAmount: null,
          collectedCapital: null,
          autoRenewal: false,
          status: 'VIGENTE',
          previousId: null,
          nextId: null,
          notes: '',
          isDemo: false,
          createdAt: '2026-10-10T18:36:49.510Z',
          updatedAt: '2026-10-19T17:46:17.455Z'
        },
        {
          id: '9e4c3951-800c-461a-9e4c-8ae5339b4188',
          bank: 'Banco Nación (BNA)',
          description: '53883 - UVA',
          type: 'UVA',
          capital: 500000,
          startDate: '2026-10-13',
          endDate: '2027-01-11',
          days: 90,
          tna: 2.15,
          tea: 2.17,
          estimatedInterest: 2650.68,
          reportedInterest: null,
          collectedInterest: null,
          estimatedTotalAmount: 502650.68,
          reportedTotalAmount: null,
          collectedCapital: null,
          autoRenewal: false,
          status: 'VIGENTE',
          previousId: null,
          nextId: null,
          notes: 'Cantidad de UVAs : 232,50\nCotización UVA: 2150,53',
          isDemo: false,
          createdAt: '2026-10-10T18:49:14.343Z',
          updatedAt: '2026-10-19T17:47:36.973Z'
        }
      ],
      events: [
        {
          id: 'evt_1792431977455_c8wr5',
          depositId: '00a78b8a-a0fd-4063-bd94-064f33c3ff7b',
          timestamp: '2026-10-19T17:46:17.455Z',
          type: 'MODIFICACION',
          description: 'Edición de datos del plazo fijo en Banco Nación (BNA)',
          amounts: {
            capital: 500000,
            interest: 7705.48,
            total: 507705.48
          }
        }
      ]
    };

    const res = restoreBackup(db, userBackupSample);
    expect(res.importedDeposits).toBe(2);
    expect(res.importedEvents).toBe(1);

    const deposits = getAllDeposits(db, true);
    expect(deposits).toHaveLength(2);

    const uvaDeposit = deposits.find(d => d.type === 'UVA');
    expect(uvaDeposit).toBeDefined();
    expect(uvaDeposit?.tna).toBe(2.15);
    expect(uvaDeposit?.tea).toBe(2.17);
    expect(uvaDeposit?.notes).toContain('Cantidad de UVAs');

    const events = getAllEvents(db, '00a78b8a-a0fd-4063-bd94-064f33c3ff7b');
    expect(events.length).toBeGreaterThan(0);
    const modEvent = events.find(e => e.id === 'evt_1792431977455_c8wr5');
    expect(modEvent).toBeDefined();
    expect(modEvent?.type).toBe('MODIFICACION');
  });
});
