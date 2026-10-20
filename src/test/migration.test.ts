import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase } from '../../server/db/database';
import { saveDeposit, getAllDeposits, getAllEvents } from '../../server/services/depositService';
import { processBulkImport, exportBackup, restoreBackup } from '../../server/services/importExportService';

describe('Integridad y Migración de Datos Backend', () => {
  let db: ReturnType<typeof initDatabase>;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  it('debe migrar/guardar plazos fijos e historial e ignorar duplicados idempotentemente', () => {
    const demoDeposit = {
      id: 'pf_mig_01',
      bank: 'Banco Santander',
      description: 'Plazo Fijo Migrado',
      type: 'TRADICIONAL_TF',
      capital: 100000,
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      days: 31,
      tna: 38,
      estimatedInterest: 3230.14,
      estimatedTotalAmount: 103230.14,
      autoRenewal: false,
      status: 'VIGENTE',
      isDemo: false,
    };

    saveDeposit(db, demoDeposit, 'Migración inicial');
    let deposits = getAllDeposits(db, true);
    expect(deposits).toHaveLength(1);
    expect(deposits[0].id).toBe('pf_mig_01');

    // Re-ejecutar guardado idempotente
    saveDeposit(db, demoDeposit, 'Migración re-ejecutada');
    deposits = getAllDeposits(db, true);
    expect(deposits).toHaveLength(1); // No duplica registro
  });

  it('debe procesar importación masiva y generar registro en registro_importaciones', () => {
    const imported = [
      {
        id: 'pf_imp_1',
        bank: 'Banco Galicia',
        capital: 50000,
        startDate: '2025-03-01',
        endDate: '2025-04-01',
        days: 31,
        tna: 35,
      },
      {
        id: 'pf_imp_2',
        bank: 'BBVA',
        capital: 75000,
        startDate: '2025-03-01',
        endDate: '2025-04-01',
        days: 31,
        tna: 36,
      },
    ];

    const res = processBulkImport(db, imported, 'planilla_marzo.csv');
    expect(res.importedCount).toBe(2);
    expect(res.errorsCount).toBe(0);

    const log = db.prepare('SELECT * FROM registro_importaciones WHERE nombre_archivo = ?').get('planilla_marzo.csv') as any;
    expect(log).toBeDefined();
    expect(log.filas_importadas).toBe(2);
  });

  it('debe exportar respaldo JSON y restaurarlo preservando integridad referencial', () => {
    saveDeposit(db, {
      id: 'pf_bck_1',
      bank: 'Banco Nación',
      capital: 200000,
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      days: 31,
      tna: 37,
    });

    const backup = exportBackup(db);
    expect(backup.deposits).toHaveLength(1);
    expect(backup.events.length).toBeGreaterThan(0);

    // Restaurar sobre base vacía
    const db2 = initDatabase(':memory:');
    restoreBackup(db2, backup);

    const restoredDeposits = getAllDeposits(db2, true);
    expect(restoredDeposits).toHaveLength(1);
    expect(restoredDeposits[0].id).toBe('pf_bck_1');
  });
});
